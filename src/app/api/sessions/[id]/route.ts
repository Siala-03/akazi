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

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: Date | null, ms: number) => (d ? new Date(d.getTime() + ms) : d);

// Admin correction: move a session to a different exporter and/or a different day
// (e.g. worker was checked in for the wrong exporter, or recorded on the wrong date).
// Moving the day shifts the session's times by whole days and keeps its attendance in step.
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
        const body = await request.json();
        const exporterId: string | undefined = body.exporterId || undefined;
        const newDay: string | undefined = body.date || undefined;
        if (!exporterId && !newDay) {
            return NextResponse.json({ error: 'exporterId or date is required' }, { status: 400 });
        }
        if (newDay !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(newDay) || Number.isNaN(Date.parse(`${newDay}T00:00:00Z`)))) {
            return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
        }

        const existing = await prisma.session.findUnique({
            where: { id },
            include: { attendance: true, _count: { select: { bagWorkers: true } } },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        const switchExporter = !!exporterId && exporterId !== existing.exporterId;
        const moveDay = !!newDay && newDay !== dayKey(existing.date);
        if (!switchExporter && !moveDay) {
            return NextResponse.json({ error: 'Nothing to change: same exporter and date' }, { status: 400 });
        }
        if (existing.status === 'validated') {
            return NextResponse.json({ error: 'Validated sessions cannot be changed' }, { status: 400 });
        }
        if (existing._count.bagWorkers > 0) {
            return NextResponse.json({ error: 'Session is linked to bags — remove it from those bags first' }, { status: 400 });
        }

        let exporterRate: number | undefined;
        if (switchExporter) {
            const exporter = await prisma.exporter.findUnique({ where: { id: exporterId }, select: { id: true, dailyRate: true } });
            if (!exporter) {
                return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
            }
            const { exporterDailyRate: defaultRate } = await getSettings();
            exporterRate = exporter.dailyRate ?? defaultRate;
        }

        let offset = 0;
        if (moveDay) {
            if (existing.status === 'active') {
                return NextResponse.json({ error: 'Check the worker out before changing the date of this session' }, { status: 400 });
            }
            const kigaliToday = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
            if (newDay! > kigaliToday) {
                return NextResponse.json({ error: 'Sessions cannot be moved to a future date' }, { status: 400 });
            }
            offset = Date.parse(`${newDay}T00:00:00Z`) - Date.parse(`${dayKey(existing.date)}T00:00:00Z`);
            const dayStart = new Date(`${newDay}T00:00:00Z`);
            const clash = await prisma.attendance.findFirst({
                where: { workerId: existing.workerId, date: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) } },
            });
            if (clash) {
                return NextResponse.json({ error: `Worker already has a check-in on ${newDay}` }, { status: 409 });
            }
        }

        const session = await prisma.$transaction(async (tx) => {
            let attendanceId = existing.attendanceId;
            if (moveDay) {
                const att = existing.attendance;
                const shared = await tx.session.count({ where: { attendanceId: att.id, NOT: { id } } });
                const shifted = {
                    date: shift(att.date, offset)!,
                    checkInTime: shift(att.checkInTime, offset)!,
                    checkOutTime: shift(att.checkOutTime, offset),
                };
                if (shared === 0) {
                    await tx.attendance.update({ where: { id: att.id }, data: shifted });
                } else {
                    // Attendance also covers other sessions that stay on the old day
                    const created = await tx.attendance.create({
                        data: {
                            ...shifted, workerId: att.workerId, facilityId: att.facilityId, status: att.status,
                            supervisorId: att.supervisorId, checkInMethod: att.checkInMethod,
                        },
                    });
                    attendanceId = created.id;
                }
            }
            return tx.session.update({
                where: { id },
                data: {
                    ...(switchExporter && { exporterId, dailyRate: exporterRate }),
                    ...(moveDay && {
                        attendanceId,
                        date: shift(existing.date, offset)!,
                        startTime: shift(existing.startTime, offset)!,
                        endTime: shift(existing.endTime, offset),
                    }),
                },
                include: { worker: true, exporter: true, facility: true },
            });
        });

        await logAudit(request, {
            userId: currentUser.userId,
            action: switchExporter && moveDay ? 'switch-exporter-and-date' : switchExporter ? 'switch-exporter' : 'change-date',
            entity: 'Session',
            entityId: id,
            changes: {
                workerId: existing.workerId,
                before: { exporterId: existing.exporterId, dailyRate: existing.dailyRate, date: existing.date.toISOString(), attendanceId: existing.attendanceId },
                after: { exporterId: session.exporterId, dailyRate: session.dailyRate, date: session.date.toISOString(), attendanceId: session.attendanceId },
            },
        });

        return NextResponse.json({
            session: toMongo(session, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' }),
        });
    } catch (error) {
        console.error('Update session error:', error);
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
