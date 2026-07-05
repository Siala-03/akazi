import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getEndOfDay, getStartOfDay } from '@/lib/utils';
import { Prisma } from '@prisma/client';

type SessionRow = {
    id: string;
    startTime: Date;
    status: string;
    worker: {
        id: string;
        workerId: string;
        fullName: string;
        phone: string;
        photo: string;
    };
    attendance: {
        checkInTime: Date;
        checkOutTime: Date | null;
        checkInMethod: string;
    };
};

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!currentUser.exporterId) {
            return NextResponse.json({
                rangeStart: null,
                rangeEnd: null,
                exporterDailyRate: 0,
                totals: { workers: 0, totalBags: 0, totalPayout: 0 },
                workers: [],
            });
        }

        const rawDate = request.nextUrl.searchParams.get('date');
        const rawStartDate = request.nextUrl.searchParams.get('startDate');
        const rawEndDate = request.nextUrl.searchParams.get('endDate');

        let rangeStart: Date;
        let rangeEnd: Date;

        if (rawStartDate && rawEndDate) {
            rangeStart = getStartOfDay(new Date(`${rawStartDate}T00:00:00`));
            rangeEnd = getEndOfDay(new Date(`${rawEndDate}T00:00:00`));
        } else {
            const selectedDate = rawDate ? new Date(`${rawDate}T00:00:00`) : new Date();
            rangeStart = getStartOfDay(selectedDate);
            rangeEnd = getEndOfDay(selectedDate);
        }

        if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
            return NextResponse.json({ error: 'Invalid date or range' }, { status: 400 });
        }

        if (rangeStart > rangeEnd) {
            const temp = rangeStart;
            rangeStart = rangeEnd;
            rangeEnd = temp;
        }

        const { exporterDailyRate } = await getSettings();

        const sessions = (await prisma.session.findMany({
            where: {
                exporterId: currentUser.exporterId,
                date: { gte: rangeStart, lte: rangeEnd },
            },
            select: {
                id: true,
                startTime: true,
                status: true,
                worker: {
                    select: {
                        id: true,
                        workerId: true,
                        fullName: true,
                        phone: true,
                        photo: true,
                    },
                },
                attendance: {
                    select: {
                        checkInTime: true,
                        checkOutTime: true,
                        checkInMethod: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        })) as SessionRow[];

        const bagCountRows = await prisma.$queryRaw<Array<{ workerId: string; bagCount: bigint }>>(
            Prisma.sql`
                SELECT bw."workerId", COUNT(DISTINCT bw."bagId")::bigint AS "bagCount"
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b."exporterId" = ${currentUser.exporterId}
                  AND b.date >= ${rangeStart}
                  AND b.date <= ${rangeEnd}
                GROUP BY bw."workerId"
            `
        );

        const bagCountMap = new Map(bagCountRows.map((row) => [row.workerId, Number(row.bagCount ?? 0)]));

        const workerMap = new Map<
            string,
            {
                workerName: string;
                workerId: string;
                phone: string;
                photo: string;
                checkInTime: Date;
                assignmentTime: Date;
                checkoutTime: Date | null;
                sessionStatus: string;
                sessionCount: number;
                checkInMethod: string;
            }
        >();

        for (const session of sessions) {
            const key = session.worker.id;
            const existing = workerMap.get(key);

            if (!existing) {
                workerMap.set(key, {
                    workerName: session.worker.fullName,
                    workerId: session.worker.workerId,
                    phone: session.worker.phone,
                    photo: session.worker.photo,
                    checkInTime: session.attendance.checkInTime,
                    assignmentTime: session.startTime,
                    checkoutTime: session.attendance.checkOutTime,
                    sessionStatus: session.status,
                    sessionCount: 1,
                    checkInMethod: session.attendance.checkInMethod ?? 'manual',
                });
                continue;
            }

            existing.assignmentTime = new Date(
                Math.min(existing.assignmentTime.getTime(), session.startTime.getTime())
            );
            existing.checkInTime = new Date(
                Math.min(existing.checkInTime.getTime(), session.attendance.checkInTime.getTime())
            );

            if (session.attendance.checkOutTime) {
                existing.checkoutTime = existing.checkoutTime
                    ? new Date(Math.max(existing.checkoutTime.getTime(), session.attendance.checkOutTime.getTime()))
                    : session.attendance.checkOutTime;
            }

            existing.sessionStatus =
                existing.sessionStatus === 'active' || session.status === 'active' ? 'active' : 'closed';
            existing.sessionCount += 1;
        }

        const workers = Array.from(workerMap.entries())
            .map(([id, row]) => {
                const totalBags = bagCountMap.get(id) ?? 0;
                const totalPayout = row.sessionCount * exporterDailyRate;

                return {
                    workerName: row.workerName,
                    workerId: row.workerId,
                    phone: row.phone,
                    photo: row.photo,
                    checkInTime: row.checkInTime.toISOString(),
                    assignmentTime: row.assignmentTime.toISOString(),
                    checkoutTime: row.checkoutTime ? row.checkoutTime.toISOString() : null,
                    sessionStatus: row.sessionStatus,
                    checkInMethod: row.checkInMethod,
                    totalBags,
                    totalPayout,
                    sessionCount: row.sessionCount,
                };
            })
            .sort((a, b) => a.workerName.localeCompare(b.workerName));

        const totals = {
            workers: workers.length,
            totalBags: workers.reduce((sum, worker) => sum + worker.totalBags, 0),
            totalPayout: workers.reduce((sum, worker) => sum + worker.totalPayout, 0),
        };

        return NextResponse.json({
            rangeStart: rangeStart.toISOString().slice(0, 10),
            rangeEnd: rangeEnd.toISOString().slice(0, 10),
            exporterDailyRate,
            totals,
            workers,
        });
    } catch (error) {
        console.error('Exporter daily workers error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
