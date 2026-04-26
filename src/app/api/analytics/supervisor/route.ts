import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import {
    WorkerModel,
    AttendanceModel,
    SessionModel,
    BagModel,
    ExporterModel,
    RateCardModel,
} from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Verify models are registered
        if (!ExporterModel.modelName) {
            throw new Error('Exporter model not registered');
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        // Calculate last 7 days for averages
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Parallel queries for better performance
        const [
            totalWorkers,
            workersCheckedInToday,
            workersCheckedOutToday,
            activeSessions,
            bagsToday,
            bagsLast7Days,
            sessionsToday,
            exportersToday,
            allBagsToday,
        ] = await Promise.all([
            // 1. Total workers
            WorkerModel.countDocuments({ status: 'active' }),

            // 2. Workers checked in today
            AttendanceModel.countDocuments({
                date: { $gte: startOfDay, $lte: endOfDay },
            }),

            // 3. Workers checked out today
            AttendanceModel.countDocuments({
                date: { $gte: startOfDay, $lte: endOfDay },
                status: 'checked-out',
            }),

            // 4. Active sessions count
            SessionModel.countDocuments({ status: 'active' }),

            // 5. Total bags assigned today
            BagModel.countDocuments({
                date: { $gte: startOfDay, $lte: endOfDay },
            }),

            // 5. Bags in last 7 days (for average)
            BagModel.countDocuments({
                date: { $gte: sevenDaysAgo, $lte: endOfDay },
            }),

            // 6. Sessions today (for hours calculation)
            SessionModel.find({
                date: { $gte: startOfDay, $lte: endOfDay },
            }).select('startTime endTime status'),

            // 7. Unique exporters served today
            BagModel.distinct('exporterId', {
                date: { $gte: startOfDay, $lte: endOfDay },
            }),

            // 8. All bags today with details for cost calculation
            BagModel.find({
                date: { $gte: startOfDay, $lte: endOfDay },
            }).populate('exporterId').select('exporterId weight workers'),
        ]);

        // Calculate total kilograms (bags × 60kg)
        const totalKilograms = bagsToday * 60;

        // Calculate total hours worked (aggregate from sessions)
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

        // Calculate average workers per bag
        let avgWorkersPerBag = 0;
        if (bagsToday > 0) {
            const totalWorkersAcrossBags = allBagsToday.reduce((sum: number, bag: any) => {
                return sum + (bag.workers?.length || 0);
            }, 0);
            avgWorkersPerBag = totalWorkersAcrossBags / bagsToday;
        }

        // Number of exporters served today
        const exportersServedToday = exportersToday.length;

        // Labor cost = number of sessions today × 2,000 FRw per session
        const SESSION_RATE = 2000;
        const totalLaborCostsToday = sessionsToday.length * SESSION_RATE;

        // Calculate costs
        let projectedCosts = 0;
        let totalCostForExporters = 0;

        // Get active rate cards for exporters
        const exporterIds = [...new Set(allBagsToday.map((bag: any) => bag.exporterId?._id?.toString()).filter(Boolean))];
        
        if (exporterIds.length > 0) {
            const rateCards = await RateCardModel.find({
                exporterId: { $in: exporterIds },
                isActive: true,
                effectiveFrom: { $lte: today },
                $or: [
                    { effectiveTo: null },
                    { effectiveTo: { $gte: today } }
                ]
            });

            // Create a map of exporter -> rate
            const rateMap = new Map();
            rateCards.forEach((rc: any) => {
                rateMap.set(rc.exporterId.toString(), rc.ratePerBag);
            });

            // Calculate costs per exporter
            const exporterBagCounts = new Map();
            allBagsToday.forEach((bag: any) => {
                const exporterId = bag.exporterId?._id?.toString();
                if (exporterId) {
                    exporterBagCounts.set(exporterId, (exporterBagCounts.get(exporterId) || 0) + 1);
                }
            });

            exporterBagCounts.forEach((bagCount, exporterId) => {
                const rate = rateMap.get(exporterId) || 0;
                const cost = bagCount * rate;
                totalCostForExporters += cost;
            });

            projectedCosts = totalCostForExporters;
        }

        // Get trend data — 2 aggregations replace 14 sequential queries
        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
        const [attTrend, bagsTrend] = await Promise.all([
            AttendanceModel.aggregate([
                { $match: { date: { $gte: trendStart, $lte: endOfDay } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
            ]),
            BagModel.aggregate([
                { $match: { date: { $gte: trendStart, $lte: endOfDay } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
            ]),
        ]);
        const attMap = new Map(attTrend.map((d: any) => [d._id, d.count]));
        const bagsMap = new Map(bagsTrend.map((d: any) => [d._id, d.count]));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                workers: attMap.get(dateStr) || 0,
                bags: bagsMap.get(dateStr) || 0,
            });
        }

        const analytics = {
            totalWorkers,
            workersCheckedInToday,
            workersCheckedOutToday,
            activeSessions,
            bagsToday,
            totalKilograms,
            totalHoursWorked: Math.round(totalHoursWorked * 10) / 10, // Round to 1 decimal
            avgWorkersPerBag: Math.round(avgWorkersPerBag * 10) / 10, // Round to 1 decimal
            exportersServedToday,
            totalLaborCostsToday, // sessions × 2,000 FRw
            projectedCosts: Math.round(projectedCosts * 100) / 100, // Round to 2 decimals
            totalCostForExporters: Math.round(totalCostForExporters * 100) / 100,
            trends: {
                attendance: trendData,
                bags: trendData,
            },
        };

        return NextResponse.json({ analytics });
    } catch (error) {
        console.error('Get supervisor analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
