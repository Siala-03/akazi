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

        const { attendanceId } = await request.json();

        const attendance = await prisma.attendance.findUnique({ where: { id: attendanceId } });
        if (!attendance) {
            return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
        }

        if (attendance.status === 'checked-out') {
            return NextResponse.json({ error: 'Worker is already checked out' }, { status: 400 });
        }

        // Close all active sessions for this attendance
        const sessionsResult = await prisma.session.updateMany({
            where: { attendanceId, status: 'active' },
            data: { endTime: new Date(), status: 'closed' },
        });

        const updated = await prisma.attendance.update({
            where: { id: attendanceId },
            data: { checkOutTime: new Date(), status: 'checked-out' },
            include: { worker: true, facility: true },
        });

        return NextResponse.json({
            attendance: toMongo(updated, { worker: 'workerId', facility: 'facilityId' }),
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
