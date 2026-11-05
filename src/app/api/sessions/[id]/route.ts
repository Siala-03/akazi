import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';
import { getSettings } from '@/lib/settings';
import { logAudit } from '@/lib/audit';

export async function PUT(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.session.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        if (existing.status !== 'active') {
            return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
        }

        const session = await prisma.session.update({
            where: { id },
            data: { endTime: new Date(), status: 'closed' },
            include: { worker: true, exporter: true, facility: true },
        });

        return NextResponse.json({
            session: toMongo(session, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' }),
        });
    } catch (error) {
        console.error('End session error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Admin correction: move a session to a different exporter (e.g. worker was checked in for the wrong one)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { id } = await params;
        const { exporterId } = await request.json();
        if (!exporterId) {
            return NextResponse.json({ error: 'exporterId is required' }, { status: 400 });
        }

        const existing = await prisma.session.findUnique({
            where: { id },
            include: { _count: { select: { bagWorkers: true } } },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        if (existing.exporterId === exporterId) {
            return NextResponse.json({ error: 'Session is already assigned to this exporter' }, { status: 400 });
        }
        if (existing.status === 'validated') {
            return NextResponse.json({ error: 'Validated sessions cannot be switched' }, { status: 400 });
        }
        if (existing._count.bagWorkers > 0) {
            return NextResponse.json({ error: 'Session is linked to bags for its current exporter — remove it from those bags first' }, { status: 400 });
        }

        const exporter = await prisma.exporter.findUnique({ where: { id: exporterId }, select: { id: true, dailyRate: true } });
        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }
        const { exporterDailyRate: defaultRate } = await getSettings();

        const session = await prisma.session.update({
            where: { id },
            data: { exporterId, dailyRate: exporter.dailyRate ?? defaultRate },
            include: { worker: true, exporter: true, facility: true },
        });
        await logAudit(request, {
            userId: currentUser.userId,
            action: 'switch-exporter',
            entity: 'Session',
            entityId: id,
            changes: {
                workerId: existing.workerId, date: existing.date.toISOString(),
                before: { exporterId: existing.exporterId, dailyRate: existing.dailyRate },
                after: { exporterId, dailyRate: session.dailyRate },
            },
        });

        return NextResponse.json({
            session: toMongo(session, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' }),
        });
    } catch (error) {
        console.error('Switch session exporter error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.session.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Remove linked BagWorker records first, then the session. If that leaves the
        // attendance with no sessions, remove it too so the worker can be checked in again.
        const attendanceDeleted = await prisma.$transaction(async (tx) => {
            await tx.bagWorker.deleteMany({ where: { sessionId: id } });
            await tx.session.delete({ where: { id } });
            const remaining = await tx.session.count({ where: { attendanceId: existing.attendanceId } });
            if (remaining > 0) return false;
            await tx.attendance.delete({ where: { id: existing.attendanceId } });
            return true;
        });

        await logAudit(request, {
            userId: currentUser.userId,
            action: 'delete',
            entity: 'Session',
            entityId: id,
            changes: { before: { ...existing, date: existing.date.toISOString() }, attendanceDeleted },
        });

        return NextResponse.json({ success: true, attendanceDeleted });
    } catch (error) {
        console.error('Delete session error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
