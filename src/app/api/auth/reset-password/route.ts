import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import { hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
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
            return NextResponse.json({ error: 'Reset code has expired' }, { status: 400 });
        }

        // Verify OTP one more time
        const isValid = await verifyPassword(otp, user.resetOtp);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 });
        }

        // Set new password and clear OTP
        user.password = await hashPassword(newPassword);
        user.resetOtp = null;
        user.resetOtpExpiry = null;
        await user.save();

        console.log('[Reset Password] Password reset for:', user.email);

        return NextResponse.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('[Reset Password] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
