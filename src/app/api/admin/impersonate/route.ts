import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, generateToken, setAuthCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// Superadmin starts viewing the app as a given exporter's account, without their password,
// to diagnose problems. The session is view-only: middleware.ts rejects every write request
// while impersonatorId is set.
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }
        // Checked against the database, not the token, so revoking superadmin takes effect immediately
        const admin = await prisma.user.findUnique({ where: { id: currentUser.userId }, select: { isSuperAdmin: true } });
        if (!admin?.isSuperAdmin) {
            return NextResponse.json({ error: 'Only the superadmin can view as an exporter' }, { status: 403 });
        }

        const { exporterId } = await request.json();
        if (!exporterId) {
            return NextResponse.json({ error: 'exporterId is required' }, { status: 400 });
        }

        const exporterUser = await prisma.user.findFirst({
            where: { exporterId, role: 'exporter' },
        });
        if (!exporterUser) {
            return NextResponse.json({ error: 'No login account found for this exporter' }, { status: 404 });
        }
        if (!exporterUser.isActive) {
            return NextResponse.json({ error: 'This exporter account is deactivated' }, { status: 403 });
        }

        const token = generateToken({
            userId: exporterUser.id,
            email: exporterUser.email,
            role: exporterUser.role,
            exporterId: exporterUser.exporterId ?? undefined,
            facilityId: exporterUser.facilityId ?? undefined,
            impersonatorId: currentUser.userId,
        });
        await setAuthCookie(token);

        await logAudit(request, {
            userId: currentUser.userId,
            action: 'impersonate-start',
            entity: 'User',
            entityId: exporterUser.id,
            changes: { viewedAs: exporterUser.email, exporterId, mode: 'view-only' },
        });

        return NextResponse.json({ success: true, redirectUrl: '/exporter/dashboard' });
    } catch (error) {
        console.error('Impersonate error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Return to the original admin session.
export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.impersonatorId) {
            return NextResponse.json({ error: 'Not currently impersonating' }, { status: 400 });
        }

        const admin = await prisma.user.findUnique({ where: { id: currentUser.impersonatorId } });
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ error: 'Original admin account not found' }, { status: 404 });
        }

        const token = generateToken({
            userId: admin.id,
            email: admin.email,
            role: admin.role,
            exporterId: admin.exporterId ?? undefined,
            facilityId: admin.facilityId ?? undefined,
            isSuperAdmin: admin.isSuperAdmin,
        });
        await setAuthCookie(token);

        await logAudit(request, {
            userId: admin.id,
            action: 'impersonate-stop',
            entity: 'User',
            entityId: currentUser.userId,
            changes: { viewedAs: currentUser.email },
        });

        return NextResponse.json({ success: true, redirectUrl: '/admin/exporters' });
    } catch (error) {
        console.error('Stop impersonate error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
