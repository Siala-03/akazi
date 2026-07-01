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
            sessionsToday,
        ] = await Promise.all([
            prisma.worker.count(),
            prisma.worker.count({ where: { status: 'active' } }),
            prisma.exporter.count(),
            prisma.exporter.count({ where: { isActive: true } }),
            prisma.facility.count({ where: { isActive: true } }),
            prisma.attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: 'on-site' } }),
            prisma.session.count({ where: { status: 'active' } }),
            prisma.session.findMany({ where: { date: { gte: startOfDay, lte: endOfDay } }, select: { startTime: true, endTime: true, status: true } }),
        ]);

        const { exporterDailyRate: DEFAULT_DAILY_RATE, workerDailyWage: WORKER_DAILY_WAGE } = await getSettings();

        let totalHoursWorked = 0;
        for (const session of sessionsToday) {
            if (session.endTime) {
                totalHoursWorked += (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            } else if (session.status === 'active') {
                totalHoursWorked += (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        // ── Session-based cost model (uses snapshotted dailyRate on each session) ──
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

        // ── Per-exporter breakdown (today, session-based) ──
        const exportersServedToday = costTodayRows.length;
        const totalCostsToday = dailyCostToExporters;
        const exporterBreakdown: any[] = [];

        if (costTodayRows.length > 0) {
            const exporterIds = costTodayRows.map(r => r.exporterId).filter(Boolean);
            const exporterRecords = await prisma.exporter.findMany({
                where: { id: { in: exporterIds } },
                select: { id: true, companyTradingName: true, exporterCode: true },
            });
            const exporterNameMap = new Map(exporterRecords.map(e => [e.id, e]));

            for (const row of costTodayRows) {
                if (!row.exporterId) continue;
                const expRecord = exporterNameMap.get(row.exporterId);
                const days = Number(row.cnt);
                const workerWages = days * WORKER_DAILY_WAGE;
                exporterBreakdown.push({
                    exporterId: row.exporterId,
                    name: expRecord?.companyTradingName || 'Unknown',
                    code: expRecord?.exporterCode || '',
                    workerDaysToday: days,
                    costToday: row.cost,
                    workerWagesToday: workerWages,
                    coopMarginToday: row.cost - workerWages,
                });
            }
            exporterBreakdown.sort((a, b) => b.costToday - a.costToday);
        }

        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

        const [attTrend, sessTrendByExporter] = await Promise.all([
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Attendance"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
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
                workersCheckedInToday,
                activeSessions,
                exportersServedToday,
                totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
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
                totalCostsToday,
                exporterBreakdown,
                trends: { attendance: trendData, sessions: trendData },
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
