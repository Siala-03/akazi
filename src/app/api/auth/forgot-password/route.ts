import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await UserModel.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            // Don't reveal if email exists
            return NextResponse.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await hashPassword(otp);

        // Store hashed OTP with 10-minute expiry
        user.resetOtp = hashedOtp;
        user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        // Send OTP email
        const emailResult = await sendOtpEmail(user.email, otp, user.name);

        if (!emailResult.success) {
            console.error('[Forgot Password] Email failed:', emailResult.error);
            return NextResponse.json(
                { error: `Failed to send reset code email: ${emailResult.error}` },
                { status: 500 }
            );
        }

        console.log('[Forgot Password] OTP sent to:', user.email);

        return NextResponse.json({
            success: true,
            message: 'If the email exists, a reset code has been sent.',
        });
    } catch (error) {
        console.error('[Forgot Password] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
