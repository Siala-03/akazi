import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, email } = await request.json();
        if (!userId && !email) {
            return NextResponse.json({ error: 'userId or email is required' }, { status: 400 });
        }

        const user = userId
            ? await prisma.user.findUnique({ where: { id: userId } })
            : await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const tempPassword = crypto.randomBytes(6).toString('hex');
        await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(tempPassword) } });

        const emailResult = await sendWelcomeEmail(user.email, user.name, tempPassword, user.role);

        if (!emailResult.success) {
            return NextResponse.json({
                message: `Password was reset but email delivery failed: ${emailResult.error}. New temporary password: ${tempPassword}`,
                emailFailed: true,
                tempPassword,
            });
        }

        return NextResponse.json({ message: `New login credentials sent to ${user.email}` });
    } catch (error) {
        console.error('[Admin Resend Credentials] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
