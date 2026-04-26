import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const user = await UserModel.findOne({ email: email.toLowerCase().trim() });

        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
        }

        // Check expiry
        if (new Date() > user.resetOtpExpiry) {
            user.resetOtp = null;
            user.resetOtpExpiry = null;
            await user.save();
            return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 });
        }

        // Verify OTP
        const isValid = await verifyPassword(otp, user.resetOtp);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
        console.error('[Verify OTP] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
