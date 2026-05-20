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
    };
    attendance: {
        checkInTime: Date;
        checkOutTime: Date | null;
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
                date: null,
                workerDailyWage: 0,
                totals: { workers: 0, totalBags: 0, totalEstimatedEarnings: 0 },
                workers: [],
            });
        }

        const rawDate = request.nextUrl.searchParams.get('date');
        const selectedDate = rawDate ? new Date(`${rawDate}T00:00:00`) : new Date();
        if (Number.isNaN(selectedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        const dayStart = getStartOfDay(selectedDate);
        const dayEnd = getEndOfDay(selectedDate);
        const { workerDailyWage } = await getSettings();

        const sessions = await prisma.session.findMany({
            where: {
                exporterId: currentUser.exporterId,
                date: { gte: dayStart, lte: dayEnd },
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
                    },
                },
                attendance: {
                    select: {
                        checkInTime: true,
                        checkOutTime: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        }) as SessionRow[];

        const bagCountRows = await prisma.$queryRaw<Array<{ workerId: string; bagCount: bigint }>>(
            Prisma.sql`
                SELECT bw."workerId", COUNT(DISTINCT bw."bagId")::bigint AS "bagCount"
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b."exporterId" = ${currentUser.exporterId}
                  AND b.date >= ${dayStart}
                  AND b.date <= ${dayEnd}
                GROUP BY bw."workerId"
            `
        );

        const bagCountMap = new Map(bagCountRows.map((row) => [row.workerId, Number(row.bagCount ?? 0)]));

        const workerMap = new Map<
            string,
            {
                workerName: string;
                workerId: string;
                checkInTime: Date;
                assignmentTime: Date;
                checkoutTime: Date | null;
                sessionStatus: string;
                sessionCount: number;
            }
        >();

        for (const session of sessions) {
            const key = session.worker.id;
            const existing = workerMap.get(key);

            if (!existing) {
                workerMap.set(key, {
                    workerName: session.worker.fullName,
                    workerId: session.worker.workerId,
                    checkInTime: session.attendance.checkInTime,
                    assignmentTime: session.startTime,
                    checkoutTime: session.attendance.checkOutTime,
                    sessionStatus: session.status,
                    sessionCount: 1,
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
                const estimatedEarnings = row.sessionCount * workerDailyWage;

                return {
                    workerName: row.workerName,
                    workerId: row.workerId,
                    checkInTime: row.checkInTime.toISOString(),
                    assignmentTime: row.assignmentTime.toISOString(),
                    checkoutTime: row.checkoutTime ? row.checkoutTime.toISOString() : null,
                    sessionStatus: row.sessionStatus,
                    totalBags,
                    estimatedEarnings,
                };
            })
            .sort((a, b) => a.workerName.localeCompare(b.workerName));

        const totals = {
            workers: workers.length,
            totalBags: workers.reduce((sum, worker) => sum + worker.totalBags, 0),
            totalEstimatedEarnings: workers.reduce((sum, worker) => sum + worker.estimatedEarnings, 0),
        };

        return NextResponse.json({
            date: dayStart.toISOString().slice(0, 10),
            workerDailyWage,
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
