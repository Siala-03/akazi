import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';
import { toMongo } from '@/lib/serialize';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { qrToken } = await request.json();
        if (!qrToken) {
            return NextResponse.json({ error: 'QR token is required' }, { status: 400 });
        }

        const worker = await prisma.worker.findUnique({ where: { qrToken } });
        if (!worker) {
            return NextResponse.json({ error: 'Invalid QR code — worker not found' }, { status: 404 });
        }

        const today = new Date();
        const attendance = await prisma.attendance.findFirst({
            where: {
                workerId: worker.id,
                date: { gte: getStartOfDay(today), lte: getEndOfDay(today) },
            },
            orderBy: { checkInTime: 'desc' },
        });

        if (!attendance) {
            return NextResponse.json({ error: `${worker.fullName} has not checked in today` }, { status: 400 });
        }

        if (attendance.status === 'checked-out') {
            return NextResponse.json({ error: `${worker.fullName} is already checked out` }, { status: 400 });
        }

        const now = new Date();
        const sessionsResult = await prisma.session.updateMany({
            where: { attendanceId: attendance.id, status: 'active' },
            data: { endTime: now, status: 'closed' },
        });

        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: { checkOutTime: now, status: 'checked-out' },
            include: { worker: true, facility: true },
        });

        return NextResponse.json({
            success: true,
            message: `${worker.fullName} checked out via QR`,
            worker: { _id: worker.id, fullName: worker.fullName, workerId: worker.workerId, photo: worker.photo },
            attendance: toMongo(updated, { worker: 'workerId', facility: 'facilityId' }),
            sessionsClosed: sessionsResult.count,
        });
    } catch (error) {
        console.error('QR check-out error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}