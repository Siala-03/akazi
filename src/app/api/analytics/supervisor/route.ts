import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
            totalWorkers,
            attendanceCheckedInToday,
            workersCheckedOutToday,
            activeSessions,
            bagsToday,
            bagsLast7Days,
            sessionsToday,
            allBagsToday,
        ] = await Promise.all([
            prisma.worker.count(),
            prisma.attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay } } }),
            prisma.attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: 'checked-out' } }),
            prisma.session.count({ where: { status: 'active' } }),
            prisma.bag.count({
                where: {
                    OR: [
                        { date: { gte: startOfDay, lte: endOfDay } },
                        {
                            workers: {
                                some: {
                                    session: {
                                        date: { gte: startOfDay, lte: endOfDay },
                                    },
                                },
                            },
                        },
                    ],
                },
            }),
            prisma.bag.count({
                where: {
                    OR: [
                        { date: { gte: sevenDaysAgo, lte: endOfDay } },
                        {
                            workers: {
                                some: {
                                    session: {
                                        date: { gte: sevenDaysAgo, lte: endOfDay },
                                    },
                                },
                            },
                        },
                    ],
                },
            }),
            prisma.session.findMany({
                where: { date: { gte: startOfDay, lte: endOfDay } },
                select: { startTime: true, endTime: true, status: true, exporterId: true, workerId: true },
            }),
            prisma.bag.findMany({
                where: {
                    OR: [
                        { date: { gte: startOfDay, lte: endOfDay } },
                        {
                            workers: {
                                some: {
                                    session: {
                                        date: { gte: startOfDay, lte: endOfDay },
                                    },
                                },
                            },
                        },
                    ],
                },
                select: {
                    exporterId: true,
                    weight: true,
                    workers: {
                        where: {
                            session: {
                                date: { gte: startOfDay, lte: endOfDay },
                            },
                        },
                        select: { id: true },
                    },
                },
            }),
        ]);

        const totalKilograms = allBagsToday.reduce((sum, bag) => sum + (bag.weight || 60), 0);

        let totalHoursWorked = 0;
        for (const session of sessionsToday) {
            if (session.endTime) {
                totalHoursWorked += (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            } else if (session.status === 'active') {
                totalHoursWorked += (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        let avgWorkersPerBag = 0;
        if (bagsToday > 0) {
            const totalWorkersAcrossBags = allBagsToday.reduce((sum, bag) => sum + (bag.workers?.length || 0), 0);
            avgWorkersPerBag = totalWorkersAcrossBags / bagsToday;
        }

        const uniqueWorkersInSessionsToday = new Set(sessionsToday.map(s => s.workerId).filter(Boolean)).size;
        const workersCheckedInToday = Math.max(attendanceCheckedInToday, uniqueWorkersInSessionsToday);

        const uniqueExporterIds = [...new Set(sessionsToday.map(s => s.exporterId).filter(Boolean))];
        const exportersServedToday = uniqueExporterIds.length;

        let totalCostForExporters = 0;
        if (uniqueExporterIds.length > 0) {
            const rateCards = await prisma.rateCard.findMany({
                where: { exporterId: { in: uniqueExporterIds }, isActive: true, effectiveFrom: { lte: today } },
            });
            const rateMap = new Map(rateCards.map(rc => [rc.exporterId, rc.ratePerBag]));

            const exporterBagCounts = new Map<string, number>();
            for (const bag of allBagsToday) {
                if (bag.exporterId) {
                    exporterBagCounts.set(bag.exporterId, (exporterBagCounts.get(bag.exporterId) || 0) + 1);
                }
            }

            exporterBagCounts.forEach((bagCount, exporterId) => {
                totalCostForExporters += bagCount * (rateMap.get(exporterId) || 0);
            });
        }

        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

        const [attTrend, bagsTrend] = await Promise.all([
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Attendance"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
                GROUP BY day`,
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Bag"
                                WHERE date >= ${trendStart}
                                    AND date <= ${endOfDay}
                GROUP BY day`,
        ]);

        const attMap = new Map(attTrend.map(d => [d.day, Number(d.count)]));
        const bagsMap = new Map(bagsTrend.map(d => [d.day, Number(d.count)]));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                workers: attMap.get(dateStr) || 0,
                bags: bagsMap.get(dateStr) || 0,
            });
        }

        return NextResponse.json({
            analytics: {
                totalWorkers,
                workersCheckedInToday,
                workersCheckedOutToday,
                activeSessions,
                bagsToday,
                totalKilograms,
                totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
                avgWorkersPerBag: Math.round(avgWorkersPerBag * 10) / 10,
                exportersServedToday,
                projectedCosts: Math.round(totalCostForExporters * 100) / 100,
                totalCostForExporters: Math.round(totalCostForExporters * 100) / 100,
                trends: { attendance: trendData, bags: trendData },
            },
        });
    } catch (error) {
        console.error('Get supervisor analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
