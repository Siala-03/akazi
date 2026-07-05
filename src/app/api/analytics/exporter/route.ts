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

        const { exporterDailyRate: DEFAULT_DAILY_RATE, workerDailyWage: WORKER_DAILY_WAGE } = await getSettings();

        if (!currentUser.exporterId) {
            return NextResponse.json({
                analytics: {
                    workersEngaged: 0,
                    totalHoursWorked: 0,
                    workerDaysToday: 0, workerDaysWeek: 0, workerDaysCumulative: 0,
                    sessionsTodayCount: 0, sessionsWeekCount: 0, sessionsCumulativeCount: 0,
                    dailyCost: 0, weeklyCost: 0, cumulativeCost: 0,
                    dailyWorkerWages: 0, weeklyWorkerWages: 0, cumulativeWorkerWages: 0,
                    periodStart: null,
                    periodEnd: null,
                    periodDays: 0,
                    periodWorkersEngaged: 0,
                    periodSessionsCount: 0,
                    periodCostToExporter: 0,
                    periodWorkerWages: 0,
                    periodCoopMargin: 0,
                    dailyBreakdown: [],
                    ratePerWorkerDay: DEFAULT_DAILY_RATE,
                    workerDailyWage: WORKER_DAILY_WAGE,
                    trends: { sessions: [] },
                },
            });
        }

        const exporterId = currentUser.exporterId;

        const exporterRecord = await prisma.exporter.findUnique({ where: { id: exporterId } });
        const EXPORTER_RATE = (exporterRecord as any)?.dailyRate ?? DEFAULT_DAILY_RATE;
        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const { searchParams } = request.nextUrl;
        const filterStartDate = searchParams.get('startDate');
        const filterEndDate = searchParams.get('endDate');

        let rangeStart: Date;
        let rangeEnd: Date;

        if (filterStartDate && filterEndDate) {
            rangeStart = getStartOfDay(new Date(filterStartDate));
            rangeEnd = getEndOfDay(new Date(filterEndDate));
        } else {
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

        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        let sessionsToday: any[] = [];
        let workersEngagedRows: any[] = [{ count: 0 }];
        let periodWorkersEngagedRows: any[] = [{ count: 0 }];

        try {
            [sessionsToday, workersEngagedRows, periodWorkersEngagedRows] = await Promise.all([
                prisma.session.findMany({
                    where: { exporterId, date: { gte: startOfDay, lte: endOfDay } },
                    select: { startTime: true, endTime: true, status: true },
                }),
                prisma.$queryRaw<{ count: bigint }[]>`
                    SELECT COUNT(DISTINCT "workerId")::bigint AS count
                    FROM "Session"
                    WHERE "exporterId" = ${exporterId}`,
                prisma.$queryRaw<{ count: bigint }[]>`
                    SELECT COUNT(DISTINCT "workerId")::bigint AS count
                    FROM "Session"
                    WHERE "exporterId" = ${exporterId}
                        AND date >= ${rangeStart} AND date <= ${rangeEnd}`,
            ]);
        } catch (queryError) {
            console.error('Exporter analytics query batch error:', queryError);
            sessionsToday = [];
            workersEngagedRows = [{ count: 0 }];
            periodWorkersEngagedRows = [{ count: 0 }];
        }

        // ── Session-based cost model (uses snapshotted dailyRate on each session) ──
        const [costRangeRows, costWeekRows, costCumulativeRows] = await Promise.all([
            prisma.$queryRaw<{ cnt: bigint; cost: number }[]>`
                SELECT COUNT(*)::bigint AS cnt,
                       SUM(COALESCE("dailyRate", ${EXPORTER_RATE}))::float AS cost
                FROM "Session"
                WHERE "exporterId" = ${exporterId}
                    AND date >= ${rangeStart} AND date <= ${rangeEnd}`,
            prisma.$queryRaw<{ cnt: bigint; cost: number }[]>`
                SELECT COUNT(*)::bigint AS cnt,
                       SUM(COALESCE("dailyRate", ${EXPORTER_RATE}))::float AS cost
                FROM "Session"
                WHERE "exporterId" = ${exporterId}
                    AND date >= ${weekStart} AND date <= ${weekEnd}`,
            prisma.$queryRaw<{ cnt: bigint; cost: number }[]>`
                SELECT COUNT(*)::bigint AS cnt,
                       SUM(COALESCE("dailyRate", ${EXPORTER_RATE}))::float AS cost
                FROM "Session"
                WHERE "exporterId" = ${exporterId}`,
        ]);

        const workerDaysToday = Number(costRangeRows[0]?.cnt ?? 0);
        const workerDaysWeek = Number(costWeekRows[0]?.cnt ?? 0);
        const workerDaysCumulative = Number(costCumulativeRows[0]?.cnt ?? 0);

        const dailyCost = costRangeRows[0]?.cost ?? 0;
        const weeklyCost = costWeekRows[0]?.cost ?? 0;
        const cumulativeCost = costCumulativeRows[0]?.cost ?? 0;

        const dailyWorkerWages = workerDaysToday * WORKER_DAILY_WAGE;
        const weeklyWorkerWages = workerDaysWeek * WORKER_DAILY_WAGE;
        const cumulativeWorkerWages = workerDaysCumulative * WORKER_DAILY_WAGE;

        const workersEngaged = Number(workersEngagedRows[0]?.count ?? 0);
        const periodWorkersEngaged = Number(periodWorkersEngagedRows[0]?.count ?? 0);
        const periodDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const periodSessionsCount = workerDaysToday;
        const periodCostToExporter = dailyCost;
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

        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

        const thirtyDaysAgo = getStartOfDay(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

        const [sessionTrendRows, dailySessionRows, workerFrequencyRows] = await Promise.all([
            prisma.$queryRaw<{ day: string; sessions: bigint; cost: number }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day,
                       COUNT(*)::bigint AS sessions,
                       SUM(COALESCE("dailyRate", ${EXPORTER_RATE}))::float AS cost
                FROM "Session"
                WHERE "exporterId" = ${exporterId}
                    AND date >= ${trendStart}
                    AND date <= ${endOfDay}
                GROUP BY day`,
            prisma.$queryRaw<{ day: string; sessions: bigint; cost: number }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day,
                       COUNT(*)::bigint AS sessions,
                       SUM(COALESCE("dailyRate", ${EXPORTER_RATE}))::float AS cost
                FROM "Session"
                WHERE "exporterId" = ${exporterId}
                    AND date >= ${rangeStart} AND date <= ${rangeEnd}
                GROUP BY day`,
            prisma.$queryRaw<{ workerId: string; fullName: string; photo: string; sessionCount: bigint; lastSeen: string }[]>`
                SELECT s."workerId",
                       w."fullName",
                       w.photo,
                       COUNT(*)::bigint AS "sessionCount",
                       TO_CHAR(MAX(s.date), 'YYYY-MM-DD') AS "lastSeen"
                FROM "Session" s
                INNER JOIN "Worker" w ON w.id = s."workerId"
                WHERE s."exporterId" = ${exporterId}
                    AND s.date >= ${thirtyDaysAgo} AND s.date <= ${endOfDay}
                GROUP BY s."workerId", w."fullName", w.photo
                ORDER BY "sessionCount" DESC
                LIMIT 15`,
        ]);

        const sessionTrendMap = new Map(sessionTrendRows.map(d => [d.day, { sessions: Number(d.sessions), cost: Number(d.cost ?? 0) }]));
        const topWorkers = workerFrequencyRows.map((r) => ({
            workerId: r.workerId,
            fullName: r.fullName,
            photo: r.photo,
            sessionCount: Number(r.sessionCount),
            lastSeen: r.lastSeen,
        }));
        const dailySessionsMap = new Map(dailySessionRows.map(row => [row.day, { sessions: Number(row.sessions), cost: row.cost }]));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const day = sessionTrendMap.get(dateStr) || { sessions: 0, cost: 0 };
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                sessions: day.sessions,
                cost: day.cost,
            });
        }

        const dailyBreakdown: Array<{
            date: string;
            sessions: number;
            costToExporter: number;
            workerWages: number;
            coopMargin: number;
        }> = [];

        for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
            const day = cursor.toISOString().split('T')[0];
            const sessData = dailySessionsMap.get(day) ?? { sessions: 0, cost: 0 };
            const sessions = sessData.sessions;
            const costToExporter = sessData.cost;
            const workerWages = sessions * WORKER_DAILY_WAGE;

            dailyBreakdown.push({
                date: day,
                sessions,
                costToExporter,
                workerWages,
                coopMargin: costToExporter - workerWages,
            });
        }

        return NextResponse.json({
            analytics: {
                workersEngaged,
                totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
                periodStart: rangeStart.toISOString(),
                periodEnd: rangeEnd.toISOString(),
                periodDays,
                periodWorkersEngaged,
                periodSessionsCount,
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
                ratePerWorkerDay: EXPORTER_RATE,
                workerDailyWage: WORKER_DAILY_WAGE,
                coopMarginPerDay: EXPORTER_RATE - WORKER_DAILY_WAGE,
                trends: { sessions: trendData },
                topWorkers,
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
