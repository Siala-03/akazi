import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';
import { toMongo } from '@/lib/serialize';
import { getSettings } from '@/lib/settings';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workerId, exporterId } = await request.json();

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
                return NextResponse.json({ error: 'Worker is already checked in and on-site' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Worker has already completed attendance for today' }, { status: 409 });
        }

        // If exporterId provided: validate exporter and create attendance + session atomically
        if (exporterId) {
            const exporter = await prisma.exporter.findUnique({
                where: { id: exporterId },
                select: { id: true, dailyRate: true },
            });
            if (!exporter) {
                return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
            }

            const { exporterDailyRate: defaultRate } = await getSettings();
            const snapshotRate = exporter.dailyRate ?? defaultRate;
            const facilityId = worker.facilityId ?? null;

            const { attendance, session } = await prisma.$transaction(async (tx) => {
                const attendance = await tx.attendance.create({
                    data: {
                        workerId,
                        facilityId,
                        date: today,
                        checkInTime: today,
                        status: 'on-site',
                        supervisorId: currentUser.userId,
                    },
                    include: { worker: true },
                });

                const session = await tx.session.create({
                    data: {
                        attendanceId: attendance.id,
                        workerId,
                        exporterId,
                        facilityId,
                        dailyRate: snapshotRate,
                        date: today,
                        startTime: today,
                        status: 'active',
                        supervisorId: currentUser.userId,
                    },
                    include: { worker: true, exporter: true, facility: true },
                });

                return { attendance, session };
            });

            return NextResponse.json({
                attendance: toMongo(attendance, { worker: 'workerId' }),
                session: toMongo(session, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' }),
            }, { status: 201 });
        }

        // No exporterId: create attendance only (assign exporter separately)
        const attendance = await prisma.attendance.create({
            data: {
                workerId,
                facilityId: worker.facilityId ?? null,
                date: today,
                checkInTime: today,
                status: 'on-site',
                supervisorId: currentUser.userId,
            },
            include: { worker: true },
        });

        return NextResponse.json({ attendance: toMongo(attendance, { worker: 'workerId' }) }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Worker already checked in today' }, { status: 409 });
        }
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
