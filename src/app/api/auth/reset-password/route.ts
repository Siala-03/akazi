import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user || !user.resetOtp || !user.resetOtpExpiry) {
            return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
        }

        if (new Date() > user.resetOtpExpiry) {
            await prisma.user.update({ where: { id: user.id }, data: { resetOtp: null, resetOtpExpiry: null } });
            return NextResponse.json({ error: 'Reset code has expired' }, { status: 400 });
        }

        const isValid = await verifyPassword(otp, user.resetOtp);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(newPassword), resetOtp: null, resetOtpExpiry: null },
        });

        return NextResponse.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('[Reset Password] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
