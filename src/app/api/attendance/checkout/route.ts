import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const attendanceIds: string[] = Array.isArray(body.attendanceIds)
            ? body.attendanceIds
            : body.attendanceId ? [body.attendanceId] : [];

        if (attendanceIds.length === 0) {
            return NextResponse.json({ error: 'attendanceId or attendanceIds is required' }, { status: 400 });
        }

        const attendances = await prisma.attendance.findMany({ where: { id: { in: attendanceIds } } });
        if (attendances.length === 0) {
            return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
        }

        const alreadyCheckedOut = attendances.filter(a => a.status === 'checked-out');
        const toCheckOut = attendances.filter(a => a.status !== 'checked-out');
        if (toCheckOut.length === 0) {
            return NextResponse.json({ error: 'Worker is already checked out' }, { status: 400 });
        }

        const toCheckOutIds = toCheckOut.map(a => a.id);
        const now = new Date();

        const sessionsResult = await prisma.session.updateMany({
            where: { attendanceId: { in: toCheckOutIds }, status: 'active' },
            data: { endTime: now, status: 'closed' },
        });
        const updateResult = await prisma.attendance.updateMany({
            where: { id: { in: toCheckOutIds } },
            data: { checkOutTime: now, status: 'checked-out' },
        });

        const updatedAttendances = await prisma.attendance.findMany({
            where: { id: { in: toCheckOutIds } },
            include: { worker: true, facility: true },
        });

        return NextResponse.json({
            attendance: toMongo(updatedAttendances[0], { worker: 'workerId', facility: 'facilityId' }),
            attendances: updatedAttendances.map(a => toMongo(a, { worker: 'workerId', facility: 'facilityId' })),
            checkedOutCount: updateResult.count,
            skippedAlreadyCheckedOut: alreadyCheckedOut.length,
            sessionsClosed: sessionsResult.count,
        });
    } catch (error) {
        console.error('[Checkout API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
