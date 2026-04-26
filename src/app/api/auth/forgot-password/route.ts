import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return NextResponse.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await hashPassword(otp);

        await prisma.user.update({
            where: { id: user.id },
            data: { resetOtp: hashedOtp, resetOtpExpiry: new Date(Date.now() + 10 * 60 * 1000) },
        });

        const emailResult = await sendOtpEmail(user.email, otp, user.name);
        if (!emailResult.success) {
            console.error('[Forgot Password] Email failed:', emailResult.error);
            return NextResponse.json(
                { error: `Failed to send reset code email: ${emailResult.error}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
    } catch (error) {
        console.error('[Forgot Password] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
