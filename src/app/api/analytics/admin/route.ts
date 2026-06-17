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

        // Load all exporters to get per-exporter dailyRate
        const allExporters = await prisma.exporter.findMany({
            select: { id: true, dailyRate: true, companyTradingName: true, exporterCode: true },
        });
        const exporterRateMap = new Map(allExporters.map(e => [e.id, e.dailyRate ?? DEFAULT_DAILY_RATE]));

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

        // ── Session-based cost model (per-exporter rates) ─────────────────────
        const [workerDaysTodayRows, workerDaysWeekRows, workerDaysCumulativeRows] = await Promise.all([
            prisma.$queryRaw<{ exporterId: string; count: bigint }[]>`
                SELECT "exporterId", COUNT(*)::bigint AS count
                FROM "Session"
                WHERE date >= ${startOfDay} AND date <= ${endOfDay}
                GROUP BY "exporterId"`,
            prisma.$queryRaw<{ exporterId: string; count: bigint }[]>`
                SELECT "exporterId", COUNT(*)::bigint AS count
                FROM "Session"
                WHERE date >= ${weekStart} AND date <= ${weekEnd}
                GROUP BY "exporterId"`,
            prisma.$queryRaw<{ exporterId: string; count: bigint }[]>`
                SELECT "exporterId", COUNT(*)::bigint AS count
                FROM "Session"
                GROUP BY "exporterId"`,
        ]);

        let workerDaysToday = 0;
        let dailyCostToExporters = 0;
        let dailyWorkerWages = 0;
        for (const row of workerDaysTodayRows) {
            const days = Number(row.count);
            const rate = exporterRateMap.get(row.exporterId) ?? DEFAULT_DAILY_RATE;
            workerDaysToday += days;
            dailyCostToExporters += days * rate;
            dailyWorkerWages += days * WORKER_DAILY_WAGE;
        }
        const dailyCoopMargin = dailyCostToExporters - dailyWorkerWages;

        let workerDaysWeek = 0;
        let weeklyCostToExporters = 0;
        let weeklyWorkerWages = 0;
        for (const row of workerDaysWeekRows) {
            const days = Number(row.count);
            const rate = exporterRateMap.get(row.exporterId) ?? DEFAULT_DAILY_RATE;
            workerDaysWeek += days;
            weeklyCostToExporters += days * rate;
            weeklyWorkerWages += days * WORKER_DAILY_WAGE;
        }

        let workerDaysCumulative = 0;
        let cumulativeCostToExporters = 0;
        let cumulativeWorkerWages = 0;
        for (const row of workerDaysCumulativeRows) {
            const days = Number(row.count);
            const rate = exporterRateMap.get(row.exporterId) ?? DEFAULT_DAILY_RATE;
            workerDaysCumulative += days;
            cumulativeCostToExporters += days * rate;
            cumulativeWorkerWages += days * WORKER_DAILY_WAGE;
        }

        // ── Per-exporter breakdown (today) ────────────────────────────────────
        const uniqueExporterIds = [...new Set(allBagsToday.map(b => b.exporterId).filter(Boolean))];
        const exportersServedToday = uniqueExporterIds.length;

        let totalCostsToday = dailyCostToExporters;
        const exporterBreakdown: any[] = [];

        if (uniqueExporterIds.length > 0) {
            const exporterWorkerDaysMap = new Map(workerDaysTodayRows.map(r => [r.exporterId, Number(r.count)]));

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
                const wDays = exporterWorkerDaysMap.get(expId) ?? 0;
                const rate = exporterRateMap.get(expId) ?? DEFAULT_DAILY_RATE;
                const cost = wDays * rate;
                const workerWages = wDays * WORKER_DAILY_WAGE;
                exporterBreakdown.push({
                    exporterId: expId,
                    name: entry.name,
                    code: entry.code,
                    bagsToday: entry.bags,
                    weightToday: entry.weight,
                    workerDaysToday: wDays,
                    dailyRate: rate,
                    costToday: cost,
                    workerWagesToday: workerWages,
                    coopMarginToday: cost - workerWages,
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
                WHERE status IN ('completed', 'validated', 'locked')
                    AND date >= ${trendStart}
                    AND date <= ${endOfDay}
                GROUP BY day`,
            prisma.$queryRaw<{ day: string; exporterId: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, "exporterId", COUNT(*)::bigint AS count
                FROM "Session"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
                GROUP BY day, "exporterId"`,
        ]);

        const attMap = new Map(attTrend.map(d => [d.day, Number(d.count)]));
        const bagsMap = new Map(bagsTrend.map(d => [d.day, Number(d.count)]));

        // Aggregate session counts and costs per day using per-exporter rates
        const sessDayMap = new Map<string, { sessions: number; cost: number }>();
        for (const row of sessTrendByExporter) {
            const days = Number(row.count);
            const rate = exporterRateMap.get(row.exporterId) ?? DEFAULT_DAILY_RATE;
            const existing = sessDayMap.get(row.day) || { sessions: 0, cost: 0 };
            existing.sessions += days;
            existing.cost += days * rate;
            sessDayMap.set(row.day, existing);
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
