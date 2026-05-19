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
                    periodStart: null,
                    periodEnd: null,
                    periodDays: 0,
                    periodBags: 0,
                    periodWeight: 0,
                    periodWorkersEngaged: 0,
                    periodSessionsCount: 0,
                    periodAvgBagsPerDay: 0,
                    periodCostToExporter: 0,
                    periodWorkerWages: 0,
                    periodCoopMargin: 0,
                    dailyBreakdown: [],
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

        // Parse query parameters for date filtering
        const { searchParams } = request.nextUrl;
        const filterStartDate = searchParams.get('startDate');
        const filterEndDate = searchParams.get('endDate');

        // Determine the range to query
        let rangeStart: Date;
        let rangeEnd: Date;

        if (filterStartDate && filterEndDate) {
            // Custom date range provided
            rangeStart = getStartOfDay(new Date(filterStartDate));
            rangeEnd = getEndOfDay(new Date(filterEndDate));
        } else {
            // Default: use today
            rangeStart = startOfDay;
            rangeEnd = endOfDay;
        }

        if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
            return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
        }

        if (rangeStart > rangeEnd) {
            const temp = rangeStart;
            rangeStart = rangeEnd;
            rangeEnd = temp;
        }

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

        const completedStatuses: Array<'completed' | 'validated' | 'locked'> = ['completed', 'validated', 'locked'];

        const [
            bagsToday,
            bagsThisWeek,
            bagsThisMonth,
            totalBags,
            sessionsToday,
            weightAgg,
            todayWeightAgg,
            workersEngagedRows,
            periodBags,
            periodWeightAgg,
            periodWorkersEngagedRows,
        ] = await Promise.all([
            prisma.bag.count({
                where: {
                    exporterId,
                    status: { in: completedStatuses },
                    OR: [
                        { completedAt: { gte: startOfDay, lte: endOfDay } },
                        { completedAt: null, date: { gte: startOfDay, lte: endOfDay } },
                    ],
                },
            }),
            prisma.bag.count({
                where: {
                    exporterId,
                    status: { in: completedStatuses },
                    OR: [
                        { completedAt: { gte: sevenDaysAgo, lte: endOfDay } },
                        { completedAt: null, date: { gte: sevenDaysAgo, lte: endOfDay } },
                    ],
                },
            }),
            prisma.bag.count({
                where: {
                    exporterId,
                    status: { in: completedStatuses },
                    OR: [
                        { completedAt: { gte: monthStart, lte: endOfDay } },
                        { completedAt: null, date: { gte: monthStart, lte: endOfDay } },
                    ],
                },
            }),
            prisma.bag.count({ where: { exporterId, status: { in: completedStatuses } } }),
            prisma.session.findMany({
                where: { exporterId, date: { gte: startOfDay, lte: endOfDay } },
                select: { startTime: true, endTime: true, status: true },
            }),
            prisma.bag.aggregate({ where: { exporterId, status: { in: completedStatuses } }, _sum: { weight: true }, _min: { date: true } }),
            prisma.bag.aggregate({
                where: {
                    exporterId,
                    status: { in: completedStatuses },
                    OR: [
                        { completedAt: { gte: startOfDay, lte: endOfDay } },
                        { completedAt: null, date: { gte: startOfDay, lte: endOfDay } },
                    ],
                },
                _sum: { weight: true },
            }),
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT bw."workerId")::bigint AS count
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b."exporterId" = ${exporterId}`,
            prisma.bag.count({
                where: {
                    exporterId,
                    status: { in: completedStatuses },
                    OR: [
                        { completedAt: { gte: rangeStart, lte: rangeEnd } },
                        { completedAt: null, date: { gte: rangeStart, lte: rangeEnd } },
                    ],
                },
            }),
            prisma.bag.aggregate({
                where: {
                    exporterId,
                    status: { in: completedStatuses },
                    OR: [
                        { completedAt: { gte: rangeStart, lte: rangeEnd } },
                        { completedAt: null, date: { gte: rangeStart, lte: rangeEnd } },
                    ],
                },
                _sum: { weight: true },
            }),
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT bw."workerId")::bigint AS count
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b."exporterId" = ${exporterId}
                    AND (
                        (b."completedAt" IS NOT NULL AND b."completedAt" >= ${rangeStart} AND b."completedAt" <= ${rangeEnd})
                        OR
                        (b."completedAt" IS NULL AND b.date >= ${rangeStart} AND b.date <= ${rangeEnd})
                    )`,
        ]);

        // ── Worker-day cost model (per-exporter) ──────────────────────────────
        // When filtering by date range, calculate costs for that range
        const [workerDaysTodayRows, workerDaysWeekRows, workerDaysCumulativeRows] = await Promise.all([
            prisma.$queryRaw<{ count: bigint }[]>`
                                SELECT COUNT(*)::bigint AS count
                                FROM "Session"
                                WHERE "exporterId" = ${exporterId}
                                    AND date >= ${rangeStart} AND date <= ${rangeEnd}`,
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
        const periodWorkersEngaged = Number(periodWorkersEngagedRows[0]?.count ?? 0);
        const totalWeight = weightAgg._sum.weight ?? 0;
        const periodWeight = periodWeightAgg._sum.weight ?? 0;
        const totalWeightToday = todayWeightAgg._sum.weight ?? bagsToday * 60;
        const periodDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const periodAvgBagsPerDay = periodBags / periodDays;

        const periodSessionsCount = workerDaysToday;
        const periodCostToExporter = periodSessionsCount * EXPORTER_DAILY_RATE;
        const periodWorkerWages = periodSessionsCount * WORKER_DAILY_WAGE;
        const periodCoopMargin = periodCostToExporter - periodWorkerWages;

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
                const bagsTrendRows = await prisma.$queryRaw<{ day: string; count: bigint; weight: number | null }[]>`
                        SELECT TO_CHAR(COALESCE("completedAt", date), 'YYYY-MM-DD') AS day,
                                     COUNT(*)::bigint AS count,
                                     COALESCE(SUM(weight), 0)::float AS weight
            FROM "Bag"
            WHERE "exporterId" = ${exporterId}
              AND status IN ('completed', 'validated', 'locked')
              AND COALESCE("completedAt", date) >= ${trendStart}
              AND COALESCE("completedAt", date) <= ${endOfDay}
            GROUP BY day`;

        const dailyBagsRows = await prisma.$queryRaw<{ day: string; bags: bigint; weight: number | null }[]>`
            SELECT TO_CHAR(COALESCE("completedAt", date), 'YYYY-MM-DD') AS day,
                   COUNT(*)::bigint AS bags,
                   COALESCE(SUM(weight), 0)::float AS weight
            FROM "Bag"
            WHERE "exporterId" = ${exporterId}
                AND status IN ('completed', 'validated', 'locked')
                AND COALESCE("completedAt", date) >= ${rangeStart}
                AND COALESCE("completedAt", date) <= ${rangeEnd}
            GROUP BY day`;

        const dailySessionRows = await prisma.$queryRaw<{ day: string; sessions: bigint }[]>`
            SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day,
                   COUNT(*)::bigint AS sessions
            FROM "Session"
            WHERE "exporterId" = ${exporterId}
                AND date >= ${rangeStart} AND date <= ${rangeEnd}
            GROUP BY day`;

        const bagsTrendMap = new Map(bagsTrendRows.map(d => [d.day, { bags: Number(d.count), weight: Number(d.weight ?? 0) }]));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const day = bagsTrendMap.get(dateStr) || { bags: 0, weight: 0 };
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                bags: day.bags,
                weight: day.weight,
            });
        }

        const dailyBagsMap = new Map(dailyBagsRows.map(row => [row.day, { bags: Number(row.bags), weight: Number(row.weight ?? 0) }]));
        const dailySessionsMap = new Map(dailySessionRows.map(row => [row.day, Number(row.sessions)]));

        const dailyBreakdown: Array<{
            date: string;
            sessions: number;
            bags: number;
            weight: number;
            costToExporter: number;
            workerWages: number;
            coopMargin: number;
        }> = [];

        for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
            const day = cursor.toISOString().split('T')[0];
            const sessions = dailySessionsMap.get(day) ?? 0;
            const bagData = dailyBagsMap.get(day) ?? { bags: 0, weight: 0 };
            const costToExporter = sessions * EXPORTER_DAILY_RATE;
            const workerWages = sessions * WORKER_DAILY_WAGE;

            dailyBreakdown.push({
                date: day,
                sessions,
                bags: bagData.bags,
                weight: bagData.weight,
                costToExporter,
                workerWages,
                coopMargin: costToExporter - workerWages,
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
                periodStart: rangeStart.toISOString(),
                periodEnd: rangeEnd.toISOString(),
                periodDays,
                periodBags,
                periodWeight,
                periodWorkersEngaged,
                periodSessionsCount,
                periodAvgBagsPerDay: Math.round(periodAvgBagsPerDay * 10) / 10,
                periodCostToExporter,
                periodWorkerWages,
                periodCoopMargin,
                dailyBreakdown,
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
