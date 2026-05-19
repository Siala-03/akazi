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
        ] = await Promise.all([
            prisma.worker.count(),
            prisma.worker.count({ where: { status: 'active' } }),
            prisma.exporter.count(),
            prisma.exporter.count({ where: { isActive: true } }),
            prisma.facility.count({ where: { isActive: true } }),
            prisma.attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay } } }),
            prisma.session.count({ where: { status: 'active' } }),
            prisma.bag.count({ where: { date: { gte: startOfDay, lte: endOfDay } } }),
            prisma.bag.count({ where: { date: { gte: sevenDaysAgo, lte: endOfDay } } }),
            prisma.bag.count({ where: { date: { gte: thirtyDaysAgo, lte: endOfDay } } }),
            prisma.bag.count(),
            prisma.session.findMany({ where: { date: { gte: startOfDay, lte: endOfDay } }, select: { startTime: true, endTime: true, status: true } }),
            prisma.bag.findMany({
                where: { date: { gte: startOfDay, lte: endOfDay } },
                select: { exporterId: true, weight: true, exporter: { select: { id: true, companyTradingName: true, exporterCode: true } } },
            }),
        ]);

        const { exporterDailyRate: EXPORTER_DAILY_RATE, workerDailyWage: WORKER_DAILY_WAGE } = await getSettings();

        const totalKilograms = totalBags * 60;
        const totalKilogramsToday = bagsToday * 60;

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

        // ── Worker-day cost model ──────────────────────────────────────────────
        // Count distinct (workerId, date) from Session as "worker-days"
        const [workerDaysTodayRows, workerDaysWeekRows, workerDaysCumulativeRows] = await Promise.all([
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint AS count
                FROM "Session"
                WHERE date >= ${startOfDay} AND date <= ${endOfDay}`,
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint AS count
                FROM "Session"
                WHERE date >= ${weekStart} AND date <= ${weekEnd}`,
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint AS count
                FROM "Session"`,
        ]);

        const workerDaysToday = Number(workerDaysTodayRows[0]?.count ?? 0);
        const workerDaysWeek = Number(workerDaysWeekRows[0]?.count ?? 0);
        const workerDaysCumulative = Number(workerDaysCumulativeRows[0]?.count ?? 0);

        const dailyCostToExporters = workerDaysToday * EXPORTER_DAILY_RATE;
        const dailyWorkerWages = workerDaysToday * WORKER_DAILY_WAGE;
        const dailyCoopMargin = workerDaysToday * (EXPORTER_DAILY_RATE - WORKER_DAILY_WAGE);

        const weeklyCostToExporters = workerDaysWeek * EXPORTER_DAILY_RATE;
        const weeklyWorkerWages = workerDaysWeek * WORKER_DAILY_WAGE;

        const cumulativeCostToExporters = workerDaysCumulative * EXPORTER_DAILY_RATE;
        const cumulativeWorkerWages = workerDaysCumulative * WORKER_DAILY_WAGE;

        // ── Per-exporter breakdown (today) ────────────────────────────────────
        const uniqueExporterIds = [...new Set(allBagsToday.map(b => b.exporterId).filter(Boolean))];
        const exportersServedToday = uniqueExporterIds.length;

        let totalCostsToday = dailyCostToExporters;
        const exporterBreakdown: any[] = [];

        if (uniqueExporterIds.length > 0) {
            // Worker-days per exporter today
            const exporterWorkerDaysRows = await prisma.$queryRaw<{ exporterId: string; worker_days: bigint }[]>`
                SELECT "exporterId", COUNT(*)::bigint AS worker_days
                FROM "Session"
                WHERE date >= ${startOfDay} AND date <= ${endOfDay}
                GROUP BY "exporterId"`;

            const exporterWorkerDaysMap = new Map(exporterWorkerDaysRows.map(r => [r.exporterId, Number(r.worker_days)]));

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
                const cost = wDays * EXPORTER_DAILY_RATE;
                const workerWages = wDays * WORKER_DAILY_WAGE;
                exporterBreakdown.push({
                    exporterId: expId,
                    name: entry.name,
                    code: entry.code,
                    bagsToday: entry.bags,
                    weightToday: entry.weight,
                    workerDaysToday: wDays,
                    costToday: cost,
                    workerWagesToday: workerWages,
                    coopMarginToday: cost - workerWages,
                });
            });
            exporterBreakdown.sort((a, b) => b.bagsToday - a.bagsToday);
        }

        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

        const [attTrend, bagsTrend, sessTrend] = await Promise.all([
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Attendance"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
                GROUP BY day`,
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Bag"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
                GROUP BY day`,
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Session"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
                GROUP BY day`,
        ]);

        const attMap = new Map(attTrend.map(d => [d.day, Number(d.count)]));
        const bagsMap = new Map(bagsTrend.map(d => [d.day, Number(d.count)]));
        const sessMap = new Map(sessTrend.map(d => [d.day, Number(d.count)]));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayWorkers = attMap.get(dateStr) || 0;
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                workers: dayWorkers,
                bags: bagsMap.get(dateStr) || 0,
                sessions: sessMap.get(dateStr) || 0,
                cost: dayWorkers * EXPORTER_DAILY_RATE,
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
                exporterDailyRate: EXPORTER_DAILY_RATE,
                workerDailyWage: WORKER_DAILY_WAGE,
                coopMarginPerDay: EXPORTER_DAILY_RATE - WORKER_DAILY_WAGE,
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
