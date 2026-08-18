import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import crypto from 'crypto';

async function requireSuperAdmin() {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isSuperAdmin) {
        return null;
    }
    return currentUser;
}

export async function GET() {
    const currentUser = await requireSuperAdmin();
    if (!currentUser) {
        return NextResponse.json({ error: 'Superadmin access required' }, { status: 401 });
    }

    const [pendingUsers, settings] = await Promise.all([
        prisma.user.findMany({
            where: { approvedAt: null },
            select: { id: true, name: true, email: true, phone: true, role: true, exporterId: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.settings.findUnique({
            where: { id: 'singleton' },
            select: { loginsLocked: true, sessionsInvalidatedAt: true },
        }),
    ]);

    return NextResponse.json({
        pendingUsers: pendingUsers.map(u => ({ ...u, _id: u.id })),
        loginsLocked: settings?.loginsLocked ?? false,
        sessionsInvalidatedAt: settings?.sessionsInvalidatedAt ?? null,
    });
}

export async function POST(request: NextRequest) {
    const currentUser = await requireSuperAdmin();
    if (!currentUser) {
        return NextResponse.json({ error: 'Superadmin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
        case 'approveUser': {
            const { userId } = body;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
            if (user.approvedAt) return NextResponse.json({ error: 'User is already approved' }, { status: 400 });

            const tempPassword = crypto.randomBytes(6).toString('hex');
            const updated = await prisma.user.update({
                where: { id: userId },
                data: {
                    approvedAt: new Date(),
                    approvedBy: currentUser.userId,
                    password: await hashPassword(tempPassword),
                },
            });

            let emailSent = false;
            try {
                const result = await sendWelcomeEmail(updated.email, updated.name, tempPassword, updated.role);
                emailSent = result.success;
            } catch {
                emailSent = false;
            }

            return NextResponse.json({
                message: emailSent
                    ? `${updated.name} approved. Login credentials sent to ${updated.email}.`
                    : `${updated.name} approved, but the welcome email failed. Temporary password: ${tempPassword}`,
                tempPassword: emailSent ? undefined : tempPassword,
            });
        }

        case 'rejectUser': {
            const { userId } = body;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
            if (user.approvedAt) return NextResponse.json({ error: 'Cannot reject an already-approved user' }, { status: 400 });

            await prisma.user.delete({ where: { id: userId } });
            return NextResponse.json({ message: `${user.name}'s pending account was rejected and removed.` });
        }

        case 'setLoginsLocked': {
            const { locked } = body;
            if (typeof locked !== 'boolean') {
                return NextResponse.json({ error: 'locked (boolean) is required' }, { status: 400 });
            }
            await prisma.settings.upsert({
                where: { id: 'singleton' },
                update: { loginsLocked: locked },
                create: { id: 'singleton', loginsLocked: locked },
            });
            return NextResponse.json({ message: locked ? 'New logins are now blocked.' : 'New logins are now allowed.' });
        }

        case 'triggerHardLock': {
            await prisma.settings.upsert({
                where: { id: 'singleton' },
                update: { sessionsInvalidatedAt: new Date() },
                create: { id: 'singleton', sessionsInvalidatedAt: new Date() },
            });
            return NextResponse.json({ message: 'All active sessions have been force-logged-out.' });
        }

        case 'clearHardLock': {
            await prisma.settings.upsert({
                where: { id: 'singleton' },
                update: { sessionsInvalidatedAt: null },
                create: { id: 'singleton', sessionsInvalidatedAt: null },
            });
            return NextResponse.json({ message: 'Force-logout has been lifted. Users can log in normally again.' });
        }

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
