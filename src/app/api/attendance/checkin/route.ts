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

        const { workerId } = await request.json();

        const worker = await prisma.worker.findUnique({ where: { id: workerId } });
        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }
        if (worker.status !== 'active') {
            return NextResponse.json({ error: 'Worker is not active' }, { status: 400 });
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const existingAttendance = await prisma.attendance.findFirst({
            where: { workerId, date: { gte: startOfDay, lte: endOfDay } },
        });

        if (existingAttendance) {
            if (existingAttendance.status === 'on-site') {
                return NextResponse.json({ error: 'Worker is already checked in and currently on-site' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Worker has already completed attendance for today (checked in and out)' }, { status: 400 });
        }

        const attendance = await prisma.attendance.create({
            data: {
                workerId,
                date: today,
                checkInTime: new Date(),
                status: 'on-site',
                supervisorId: currentUser.userId,
            },
            include: { worker: true },
        });

        return NextResponse.json({ attendance: toMongo(attendance, { worker: 'workerId' }) }, { status: 201 });
    } catch (error) {
        console.error('[Check-in] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let dateFilter: { gte: Date; lte: Date };
        if (startDate || endDate) {
            const gte = startDate ? new Date(startDate) : new Date('2000-01-01');
            gte.setHours(0, 0, 0, 0);
            const lte = endDate ? new Date(endDate) : new Date();
            lte.setHours(23, 59, 59, 999);
            dateFilter = { gte, lte };
        } else {
            const today = new Date();
            dateFilter = { gte: getStartOfDay(today), lte: getEndOfDay(today) };
        }

        const attendance = await prisma.attendance.findMany({
            where: { date: dateFilter },
            include: { worker: true, facility: true },
            orderBy: { checkInTime: 'desc' },
        });

        return NextResponse.json({ attendance: attendance.map(a => toMongo(a, { worker: 'workerId', facility: 'facilityId' })) });
    } catch (error) {
        console.error('Get attendance error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
