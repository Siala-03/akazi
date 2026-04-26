import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
// Import all models via barrel to ensure schemas are registered for populate
import { WorkerModel, BagModel, SessionModel, RateCardModel, EarningsModel } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!currentUser.exporterId) {
            // Return empty analytics instead of error when exporterId is not configured
            return NextResponse.json({
                analytics: {
                    totalBags: 0, workersEngaged: 0, totalWeight: 0, avgBagsPerDay: 0,
                    bagsToday: 0, totalWeightToday: 0, totalHoursWorked: 0, costToday: 0,
                    bagsThisWeek: 0, bagsThisMonth: 0, costThisMonth: 0,
                    ratePerBag: 0, totalCost: 0, projectedMonthlyCost: 0,
                    hasRateCard: false,
                    trends: { bags: [], weight: [] },
                }
            });
        }

        await dbConnect();

        const exporterId = currentUser.exporterId;
        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        // Calculate date ranges
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const expObjId = new mongoose.Types.ObjectId(String(exporterId));

        // Parallel queries — aggregations replace fetching 1000 bags
        const [
            bagsToday,
            bagsThisWeek,
            bagsThisMonth,
            totalBags,
            workersEngagedAgg,
            weightAgg,
            sessionsToday,
            activeRateCard,
        ] = await Promise.all([
            BagModel.countDocuments({ exporterId, date: { $gte: startOfDay, $lte: endOfDay } }),
            BagModel.countDocuments({ exporterId, date: { $gte: sevenDaysAgo, $lte: endOfDay } }),
            BagModel.countDocuments({ exporterId, date: { $gte: monthStart, $lte: endOfDay } }),
            BagModel.countDocuments({ exporterId }),

            // Count unique workers across all bags (no populate needed)
            BagModel.aggregate([
                { $match: { exporterId: expObjId } },
                { $unwind: '$workers' },
                { $group: { _id: '$workers.workerId' } },
                { $count: 'total' },
            ]),

            // Total weight + oldest bag date in one pass
            BagModel.aggregate([
                { $match: { exporterId: expObjId } },
                { $group: { _id: null, totalWeight: { $sum: '$weight' }, oldestDate: { $min: '$date' } } },
            ]),

            SessionModel.find({
                exporterId,
                date: { $gte: startOfDay, $lte: endOfDay },
            }).select('startTime endTime status'),

            RateCardModel.findOne({
                exporterId,
                isActive: true,
                effectiveFrom: { $lte: today },
                $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
            }),
        ]);

        const workersEngaged = workersEngagedAgg[0]?.total || 0;
        const totalWeight = weightAgg[0]?.totalWeight || 0;
        const totalWeightToday = bagsToday * 60;

        // Calculate total hours worked
        let totalHoursWorked = 0;
        sessionsToday.forEach((session: any) => {
            if (session.endTime) {
                const hours = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHoursWorked += hours;
            } else if (session.status === 'active') {
                const hours = (Date.now() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHoursWorked += hours;
            }
        });

        // Calculate average bags per day using oldest bag date from aggregation
        const oldestDate = weightAgg[0]?.oldestDate ? new Date(weightAgg[0].oldestDate) : today;
        const daysSinceStart = Math.max(1, Math.ceil((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
        const avgBagsPerDay = totalBags / daysSinceStart;

        // Calculate costs - use rate card if available, otherwise fall back to earnings data
        const hasRateCard = !!activeRateCard;
        let ratePerBag = activeRateCard?.ratePerBag || 0;
        let totalCost = 0;
        let costToday = 0;
        let costThisMonth = 0;

        if (hasRateCard && ratePerBag > 0) {
            // Use rate card calculation
            totalCost = totalBags * ratePerBag;
            costToday = bagsToday * ratePerBag;
            costThisMonth = bagsThisMonth * ratePerBag;
        } else {
            // Fall back to actual earnings data from Earnings collection
            try {
                const [earningsTodayAgg, earningsMonthAgg, earningsTotalAgg] = await Promise.all([
                    EarningsModel.aggregate([
                        { $match: { exporterId: expObjId, date: { $gte: startOfDay, $lte: endOfDay } } },
                        { $group: { _id: null, total: { $sum: '$totalEarnings' }, bags: { $sum: '$bagsProcessed' }, rate: { $avg: '$ratePerBag' } } },
                    ]),
                    EarningsModel.aggregate([
                        { $match: { exporterId: expObjId, date: { $gte: monthStart, $lte: endOfDay } } },
                        { $group: { _id: null, total: { $sum: '$totalEarnings' } } },
                    ]),
                    EarningsModel.aggregate([
                        { $match: { exporterId: expObjId } },
                        { $group: { _id: null, total: { $sum: '$totalEarnings' }, rate: { $avg: '$ratePerBag' } } },
                    ]),
                ]);

                costToday = earningsTodayAgg[0]?.total || 0;
                costThisMonth = earningsMonthAgg[0]?.total || 0;
                totalCost = earningsTotalAgg[0]?.total || 0;
                // Use average rate from earnings if no rate card
                ratePerBag = earningsTotalAgg[0]?.rate || earningsTodayAgg[0]?.rate || 0;
            } catch (earningsErr) {
                console.error('[Exporter Analytics] Earnings fallback failed:', earningsErr);
            }
        }

        // Get trend data — 1 aggregation replaces 7 sequential queries
        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
        const bagsTrendAgg = await BagModel.aggregate([
            { $match: { exporterId: expObjId, date: { $gte: trendStart, $lte: endOfDay } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
        ]);
        const bagsTrendMap = new Map(bagsTrendAgg.map((d: any) => [d._id, d.count]));

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

        const analytics = {
            // Overview
            totalBags,
            workersEngaged,
            totalWeight,
            avgBagsPerDay: Math.round(avgBagsPerDay * 10) / 10,

            // Today's metrics
            bagsToday,
            totalWeightToday,
            totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
            costToday: Math.round(costToday * 100) / 100,

            // Period metrics
            bagsThisWeek,
            bagsThisMonth,
            costThisMonth: Math.round(costThisMonth * 100) / 100,

            // Financial
            ratePerBag,
            totalCost: Math.round(totalCost * 100) / 100,
            projectedMonthlyCost: ratePerBag > 0 
                ? Math.round((bagsThisMonth / Math.max(new Date().getDate(), 1)) * 30 * ratePerBag * 100) / 100
                : Math.round((costThisMonth / Math.max(new Date().getDate(), 1)) * 30 * 100) / 100,
            hasRateCard,

            // Trends
            trends: {
                bags: trendData,
                weight: trendData,
            },
        };

        return NextResponse.json({ analytics });
    } catch (error) {
        console.error('Get exporter analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
