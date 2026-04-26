import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!currentUser.exporterId) {
            return NextResponse.json({
                analytics: {
                    totalBags: 0, workersEngaged: 0, totalWeight: 0, avgBagsPerDay: 0,
                    bagsToday: 0, totalWeightToday: 0, totalHoursWorked: 0, costToday: 0,
                    bagsThisWeek: 0, bagsThisMonth: 0, costThisMonth: 0,
                    ratePerBag: 0, totalCost: 0, projectedMonthlyCost: 0,
                    hasRateCard: false,
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

        const [
            bagsToday,
            bagsThisWeek,
            bagsThisMonth,
            totalBags,
            sessionsToday,
            activeRateCard,
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
            prisma.rateCard.findFirst({
                where: { exporterId, isActive: true, effectiveFrom: { lte: today } },
                orderBy: { effectiveFrom: 'desc' },
            }),
            prisma.bag.aggregate({ where: { exporterId }, _sum: { weight: true }, _min: { date: true } }),
            // Count unique workers via BagWorker join table
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT bw."workerId")::bigint AS count
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b."exporterId" = ${exporterId}`,
        ]);

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

        const hasRateCard = !!activeRateCard;
        let ratePerBag = activeRateCard?.ratePerBag ?? 0;
        let totalCost = 0;
        let costToday = 0;
        let costThisMonth = 0;

        if (hasRateCard && ratePerBag > 0) {
            totalCost = totalBags * ratePerBag;
            costToday = bagsToday * ratePerBag;
            costThisMonth = bagsThisMonth * ratePerBag;
        } else {
            const [earningsTotal] = await Promise.all([
                prisma.earnings.aggregate({
                    where: { exporterId },
                    _sum: { totalEarnings: true },
                    _avg: { ratePerBag: true },
                }),
            ]);
            totalCost = earningsTotal._sum.totalEarnings ?? 0;
            ratePerBag = earningsTotal._avg.ratePerBag ?? 0;

            const [earningsToday, earningsMonth] = await Promise.all([
                prisma.earnings.aggregate({
                    where: { exporterId, date: { gte: startOfDay, lte: endOfDay } },
                    _sum: { totalEarnings: true },
                }),
                prisma.earnings.aggregate({
                    where: { exporterId, date: { gte: monthStart, lte: endOfDay } },
                    _sum: { totalEarnings: true },
                }),
            ]);
            costToday = earningsToday._sum.totalEarnings ?? 0;
            costThisMonth = earningsMonth._sum.totalEarnings ?? 0;
        }

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
                costToday: Math.round(costToday * 100) / 100,
                bagsThisWeek,
                bagsThisMonth,
                costThisMonth: Math.round(costThisMonth * 100) / 100,
                ratePerBag,
                totalCost: Math.round(totalCost * 100) / 100,
                projectedMonthlyCost: ratePerBag > 0
                    ? Math.round((bagsThisMonth / Math.max(today.getDate(), 1)) * 30 * ratePerBag * 100) / 100
                    : Math.round((costThisMonth / Math.max(today.getDate(), 1)) * 30 * 100) / 100,
                hasRateCard,
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
