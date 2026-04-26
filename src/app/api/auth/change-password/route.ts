import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isValidPassword = await verifyPassword(currentPassword, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(newPassword) },
        });

        return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('[Change Password] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
