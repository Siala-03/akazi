import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const completedStatuses: Array<'completed' | 'validated' | 'locked'> = ['completed', 'validated', 'locked'];

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
            totalWorkers,
            activeWorkers,
            totalExporters,
            activeExporters,
            totalFacilities,
            workersCheckedInToday,
            activeSessions,
            bagsToday,
            bagsLast7Days,
            bagsLast30Days,
            totalBags,
            sessionsToday,
            allBagsToday,
            totalWeightAgg,
            todayWeightAgg,
        ] = await Promise.all([
            prisma.worker.count(),
            prisma.worker.count({ where: { status: 'active' } }),
            prisma.exporter.count(),
            prisma.exporter.count({ where: { isActive: true } }),
            prisma.facility.count({ where: { isActive: true } }),
            prisma.attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: 'on-site' } }),
            prisma.session.count({ where: { status: 'active' } }),
            prisma.bag.count({
                where: {
                    status: { in: completedStatuses },
                    date: { gte: startOfDay, lte: endOfDay },
                },
            }),
            prisma.bag.count({
                where: {
                    status: { in: completedStatuses },
                    date: { gte: sevenDaysAgo, lte: endOfDay },
                },
            }),
            prisma.bag.count({
                where: {
                    status: { in: completedStatuses },
                    date: { gte: thirtyDaysAgo, lte: endOfDay },
                },
            }),
            prisma.bag.count(),
            prisma.session.findMany({ where: { date: { gte: startOfDay, lte: endOfDay } }, select: { startTime: true, endTime: true, status: true } }),
            prisma.bag.findMany({
                where: {
                    status: { in: completedStatuses },
                    date: { gte: startOfDay, lte: endOfDay },
                },
                select: { exporterId: true, weight: true, exporter: { select: { id: true, companyTradingName: true, exporterCode: true } } },
            }),
            prisma.bag.aggregate({ _sum: { weight: true } }),
            prisma.bag.aggregate({
                _sum: { weight: true },
                where: {
                    status: { in: completedStatuses },
                    date: { gte: startOfDay, lte: endOfDay },
                },
            }),
        ]);

        const { exporterDailyRate: DEFAULT_DAILY_RATE, workerDailyWage: WORKER_DAILY_WAGE } = await getSettings();

        const totalKilograms = totalWeightAgg._sum.weight ?? totalBags * 60;
        const totalKilogramsToday = todayWeightAgg._sum.weight ?? bagsToday * 60;

        let totalHoursWorked = 0;
        for (const session of sessionsToday) {
            if (session.endTime) {
                totalHoursWorked += (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            } else if (session.status === 'active') {
                totalHoursWorked += (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        const avgBagsPerDay = bagsLast7Days / 7;
        const avgBagsPerDayLast30 = bagsLast30Days / 30;

        // ── Session-based cost model (uses snapshotted dailyRate on each session) ──
        // For old sessions without a dailyRate, fall back to the exporter's current rate or global default.
        const [costTodayRows, costWeekRows, costCumulativeRows] = await Promise.all([
            prisma.$queryRaw<{ exporterId: string; cnt: bigint; cost: number }[]>`
                SELECT s."exporterId",
                       COUNT(*)::bigint AS cnt,
                       SUM(COALESCE(s."dailyRate", COALESCE(e."dailyRate", ${DEFAULT_DAILY_RATE})))::float AS cost
                FROM "Session" s
                LEFT JOIN "Exporter" e ON e.id = s."exporterId"
                WHERE s.date >= ${startOfDay} AND s.date <= ${endOfDay}
                GROUP BY s."exporterId"`,
            prisma.$queryRaw<{ exporterId: string; cnt: bigint; cost: number }[]>`
                SELECT s."exporterId",
                       COUNT(*)::bigint AS cnt,
                       SUM(COALESCE(s."dailyRate", COALESCE(e."dailyRate", ${DEFAULT_DAILY_RATE})))::float AS cost
                FROM "Session" s
                LEFT JOIN "Exporter" e ON e.id = s."exporterId"
                WHERE s.date >= ${weekStart} AND s.date <= ${weekEnd}
                GROUP BY s."exporterId"`,
            prisma.$queryRaw<{ exporterId: string; cnt: bigint; cost: number }[]>`
                SELECT s."exporterId",
                       COUNT(*)::bigint AS cnt,
                       SUM(COALESCE(s."dailyRate", COALESCE(e."dailyRate", ${DEFAULT_DAILY_RATE})))::float AS cost
                FROM "Session" s
                LEFT JOIN "Exporter" e ON e.id = s."exporterId"
                GROUP BY s."exporterId"`,
        ]);

        let workerDaysToday = 0;
        let dailyCostToExporters = 0;
        let dailyWorkerWages = 0;
        for (const row of costTodayRows) {
            const days = Number(row.cnt);
            workerDaysToday += days;
            dailyCostToExporters += row.cost;
            dailyWorkerWages += days * WORKER_DAILY_WAGE;
        }
        const dailyCoopMargin = dailyCostToExporters - dailyWorkerWages;

        let workerDaysWeek = 0;
        let weeklyCostToExporters = 0;
        let weeklyWorkerWages = 0;
        for (const row of costWeekRows) {
            const days = Number(row.cnt);
            workerDaysWeek += days;
            weeklyCostToExporters += row.cost;
            weeklyWorkerWages += days * WORKER_DAILY_WAGE;
        }

        let workerDaysCumulative = 0;
        let cumulativeCostToExporters = 0;
        let cumulativeWorkerWages = 0;
        for (const row of costCumulativeRows) {
            const days = Number(row.cnt);
            workerDaysCumulative += days;
            cumulativeCostToExporters += row.cost;
            cumulativeWorkerWages += days * WORKER_DAILY_WAGE;
        }

        // ── Per-exporter breakdown (today) ────────────────────────────────────
        const uniqueExporterIds = [...new Set(allBagsToday.map(b => b.exporterId).filter(Boolean))];
        const exportersServedToday = uniqueExporterIds.length;

        let totalCostsToday = dailyCostToExporters;
        const exporterBreakdown: any[] = [];

        if (uniqueExporterIds.length > 0) {
            const exporterCostMap = new Map(costTodayRows.map(r => [r.exporterId, { days: Number(r.cnt), cost: r.cost }]));

            const exporterDataMap = new Map<string, { name: string; code: string; bags: number; weight: number }>();
            for (const bag of allBagsToday) {
                if (!bag.exporterId) continue;
                if (!exporterDataMap.has(bag.exporterId)) {
                    exporterDataMap.set(bag.exporterId, {
                        name: bag.exporter?.companyTradingName || 'Unknown',
                        code: bag.exporter?.exporterCode || '',
                        bags: 0,
                        weight: 0,
                    });
                }
                const entry = exporterDataMap.get(bag.exporterId)!;
                entry.bags++;
                entry.weight += bag.weight || 60;
            }

            exporterDataMap.forEach((entry, expId) => {
                const costData = exporterCostMap.get(expId) ?? { days: 0, cost: 0 };
                const workerWages = costData.days * WORKER_DAILY_WAGE;
                exporterBreakdown.push({
                    exporterId: expId,
                    name: entry.name,
                    code: entry.code,
                    bagsToday: entry.bags,
                    weightToday: entry.weight,
                    workerDaysToday: costData.days,
                    costToday: costData.cost,
                    workerWagesToday: workerWages,
                    coopMarginToday: costData.cost - workerWages,
                });
            });
            exporterBreakdown.sort((a, b) => b.bagsToday - a.bagsToday);
        }

        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

        const [attTrend, bagsTrend, sessTrendByExporter] = await Promise.all([
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Attendance"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
                GROUP BY day`,
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Bag"
                WHERE status IN ('in_progress', 'completed', 'validated', 'locked')
                    AND date >= ${trendStart}
                    AND date <= ${endOfDay}
                GROUP BY day`,
            prisma.$queryRaw<{ day: string; cnt: bigint; cost: number }[]>`
                SELECT TO_CHAR(s.date, 'YYYY-MM-DD') AS day,
                       COUNT(*)::bigint AS cnt,
                       SUM(COALESCE(s."dailyRate", COALESCE(e."dailyRate", ${DEFAULT_DAILY_RATE})))::float AS cost
                FROM "Session" s
                LEFT JOIN "Exporter" e ON e.id = s."exporterId"
                WHERE s.date >= ${trendStart} AND s.date <= ${endOfDay}
                GROUP BY day`,
        ]);

        const attMap = new Map(attTrend.map(d => [d.day, Number(d.count)]));
        const bagsMap = new Map(bagsTrend.map(d => [d.day, Number(d.count)]));

        const sessDayMap = new Map<string, { sessions: number; cost: number }>();
        for (const row of sessTrendByExporter) {
            sessDayMap.set(row.day, { sessions: Number(row.cnt), cost: row.cost });
        }

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayWorkers = attMap.get(dateStr) || 0;
            const sessDay = sessDayMap.get(dateStr) || { sessions: 0, cost: 0 };
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                workers: dayWorkers,
                bags: bagsMap.get(dateStr) || 0,
                sessions: sessDay.sessions,
                cost: sessDay.cost,
            });
        }

        return NextResponse.json({
            analytics: {
                totalWorkers,
                activeWorkers,
                totalExporters,
                activeExporters,
                totalFacilities,
                totalBags,
                totalKilograms,
                workersCheckedInToday,
                activeSessions,
                bagsToday,
                totalKilogramsToday,
                exportersServedToday,
                totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
                avgBagsPerDay: Math.round(avgBagsPerDay * 10) / 10,
                avgBagsPerDayLast30: Math.round(avgBagsPerDayLast30 * 10) / 10,
                bagsLast7Days,
                bagsLast30Days,
                // Worker-day cost model
                workerDaysToday,
                workerDaysWeek,
                workerDaysCumulative,
                sessionsTodayCount: workerDaysToday,
                sessionsWeekCount: workerDaysWeek,
                sessionsCumulativeCount: workerDaysCumulative,
                dailyCostToExporters,
                dailyWorkerWages,
                dailyCoopMargin,
                weeklyCostToExporters,
                weeklyWorkerWages,
                cumulativeCostToExporters,
                cumulativeWorkerWages,
                // Rate config
                exporterDailyRate: DEFAULT_DAILY_RATE,
                workerDailyWage: WORKER_DAILY_WAGE,
                coopMarginPerDay: DEFAULT_DAILY_RATE - WORKER_DAILY_WAGE,
                // Legacy (kept for compatibility)
                totalCostsToday,
                exporterBreakdown,
                trends: { attendance: trendData, bags: trendData, sessions: trendData },
            },
        });
    } catch (error) {
        console.error('Get admin analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
