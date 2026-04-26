import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

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

        const uniqueExporterIds = [...new Set(allBagsToday.map(b => b.exporterId).filter(Boolean))];
        const exportersServedToday = uniqueExporterIds.length;

        let totalCostsToday = 0;
        const exporterBreakdown: any[] = [];

        if (uniqueExporterIds.length > 0) {
            const rateCards = await prisma.rateCard.findMany({
                where: { exporterId: { in: uniqueExporterIds }, isActive: true, effectiveFrom: { lte: today } },
            });
            const rateMap = new Map(rateCards.map(rc => [rc.exporterId, rc.ratePerBag]));

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
                const rate = rateMap.get(expId) || 0;
                const cost = entry.bags * rate;
                totalCostsToday += cost;
                exporterBreakdown.push({
                    exporterId: expId,
                    name: entry.name,
                    code: entry.code,
                    bagsToday: entry.bags,
                    weightToday: entry.weight,
                    ratePerBag: rate,
                    costToday: Math.round(cost * 100) / 100,
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
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                workers: attMap.get(dateStr) || 0,
                bags: bagsMap.get(dateStr) || 0,
                sessions: sessMap.get(dateStr) || 0,
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
                totalCostsToday: Math.round(totalCostsToday * 100) / 100,
                avgBagsPerDay: Math.round(avgBagsPerDay * 10) / 10,
                avgBagsPerDayLast30: Math.round(avgBagsPerDayLast30 * 10) / 10,
                bagsLast7Days,
                bagsLast30Days,
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
