import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { exporterDailyRate: EXPORTER_DAILY_RATE, workerDailyWage: WORKER_DAILY_WAGE } = await getSettings();

        if (!currentUser.exporterId) {
            return NextResponse.json({
                analytics: {
                    totalBags: 0, workersEngaged: 0, totalWeight: 0, avgBagsPerDay: 0,
                    bagsToday: 0, totalWeightToday: 0, totalHoursWorked: 0,
                    bagsThisWeek: 0, bagsThisMonth: 0,
                    workerDaysToday: 0, workerDaysWeek: 0, workerDaysCumulative: 0,
                    sessionsTodayCount: 0, sessionsWeekCount: 0, sessionsCumulativeCount: 0,
                    dailyCost: 0, weeklyCost: 0, cumulativeCost: 0,
                    dailyWorkerWages: 0, weeklyWorkerWages: 0, cumulativeWorkerWages: 0,
                    ratePerWorkerDay: EXPORTER_DAILY_RATE,
                    workerDailyWage: WORKER_DAILY_WAGE,
                    trends: { bags: [], weight: [] },
                },
            });
        }

        const exporterId = currentUser.exporterId;
        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        // Current week Mon–Fri
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const [
            bagsToday,
            bagsThisWeek,
            bagsThisMonth,
            totalBags,
            sessionsToday,
            weightAgg,
            workersEngagedRows,
        ] = await Promise.all([
            prisma.bag.count({ where: { exporterId, date: { gte: startOfDay, lte: endOfDay } } }),
            prisma.bag.count({ where: { exporterId, date: { gte: sevenDaysAgo, lte: endOfDay } } }),
            prisma.bag.count({ where: { exporterId, date: { gte: monthStart, lte: endOfDay } } }),
            prisma.bag.count({ where: { exporterId } }),
            prisma.session.findMany({
                where: { exporterId, date: { gte: startOfDay, lte: endOfDay } },
                select: { startTime: true, endTime: true, status: true },
            }),
            prisma.bag.aggregate({ where: { exporterId }, _sum: { weight: true }, _min: { date: true } }),
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT bw."workerId")::bigint AS count
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b."exporterId" = ${exporterId}`,
        ]);

        // ── Worker-day cost model (per-exporter) ──────────────────────────────
                const [workerDaysTodayRows, workerDaysWeekRows, workerDaysCumulativeRows] = await Promise.all([
            prisma.$queryRaw<{ count: bigint }[]>`
                                SELECT COUNT(*)::bigint AS count
                                FROM "Session"
                                WHERE "exporterId" = ${exporterId}
                                    AND date >= ${startOfDay} AND date <= ${endOfDay}`,
            prisma.$queryRaw<{ count: bigint }[]>`
                                SELECT COUNT(*)::bigint AS count
                                FROM "Session"
                                WHERE "exporterId" = ${exporterId}
                                    AND date >= ${weekStart} AND date <= ${weekEnd}`,
            prisma.$queryRaw<{ count: bigint }[]>`
                                SELECT COUNT(*)::bigint AS count
                                FROM "Session"
                                WHERE "exporterId" = ${exporterId}`,
        ]);

        const workerDaysToday = Number(workerDaysTodayRows[0]?.count ?? 0);
        const workerDaysWeek = Number(workerDaysWeekRows[0]?.count ?? 0);
        const workerDaysCumulative = Number(workerDaysCumulativeRows[0]?.count ?? 0);

        const dailyCost = workerDaysToday * EXPORTER_DAILY_RATE;
        const weeklyCost = workerDaysWeek * EXPORTER_DAILY_RATE;
        const cumulativeCost = workerDaysCumulative * EXPORTER_DAILY_RATE;

        const dailyWorkerWages = workerDaysToday * WORKER_DAILY_WAGE;
        const weeklyWorkerWages = workerDaysWeek * WORKER_DAILY_WAGE;
        const cumulativeWorkerWages = workerDaysCumulative * WORKER_DAILY_WAGE;

        const workersEngaged = Number(workersEngagedRows[0]?.count ?? 0);
        const totalWeight = weightAgg._sum.weight ?? 0;
        const totalWeightToday = bagsToday * 60;

        let totalHoursWorked = 0;
        for (const session of sessionsToday) {
            if (session.endTime) {
                totalHoursWorked += (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            } else if (session.status === 'active') {
                totalHoursWorked += (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        const oldestDate = weightAgg._min.date ?? today;
        const daysSinceStart = Math.max(1, Math.ceil((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
        const avgBagsPerDay = totalBags / daysSinceStart;

        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
        const bagsTrendRows = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
            SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
            FROM "Bag"
            WHERE "exporterId" = ${exporterId} AND date >= ${trendStart} AND date <= ${endOfDay}
            GROUP BY day`;

        const bagsTrendMap = new Map(bagsTrendRows.map(d => [d.day, Number(d.count)]));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayBags = bagsTrendMap.get(dateStr) || 0;
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                bags: dayBags,
                weight: dayBags * 60,
            });
        }

        return NextResponse.json({
            analytics: {
                totalBags,
                workersEngaged,
                totalWeight,
                avgBagsPerDay: Math.round(avgBagsPerDay * 10) / 10,
                bagsToday,
                totalWeightToday,
                totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
                bagsThisWeek,
                bagsThisMonth,
                // Worker-day cost model
                workerDaysToday,
                workerDaysWeek,
                workerDaysCumulative,
                sessionsTodayCount: workerDaysToday,
                sessionsWeekCount: workerDaysWeek,
                sessionsCumulativeCount: workerDaysCumulative,
                dailyCost,
                weeklyCost,
                cumulativeCost,
                dailyWorkerWages,
                weeklyWorkerWages,
                cumulativeWorkerWages,
                ratePerWorkerDay: EXPORTER_DAILY_RATE,
                workerDailyWage: WORKER_DAILY_WAGE,
                coopMarginPerDay: EXPORTER_DAILY_RATE - WORKER_DAILY_WAGE,
                trends: { bags: trendData, weight: trendData },
            },
        });
    } catch (error) {
        console.error('Get exporter analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
