import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
// Import all models via barrel to ensure all schemas are registered for populate
import { WorkerModel, AttendanceModel, SessionModel, BagModel, ExporterModel, FacilityModel, RateCardModel } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        // Calculate last 7 days for averages
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Calculate last 30 days for monthly stats
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Parallel queries for better performance
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
            exportersToday,
            allBagsToday,
        ] = await Promise.all([
            // System-wide metrics
            WorkerModel.countDocuments(),
            WorkerModel.countDocuments({ status: 'active' }),
            ExporterModel.countDocuments(),
            ExporterModel.countDocuments({ isActive: true }),
            FacilityModel.countDocuments({ isActive: true }),

            // Today's operations
            AttendanceModel.countDocuments({
                date: { $gte: startOfDay, $lte: endOfDay },
            }),
            SessionModel.countDocuments({ status: 'active' }),
            BagModel.countDocuments({
                date: { $gte: startOfDay, $lte: endOfDay },
            }),

            // Historical data
            BagModel.countDocuments({
                date: { $gte: sevenDaysAgo, $lte: endOfDay },
            }),
            BagModel.countDocuments({
                date: { $gte: thirtyDaysAgo, $lte: endOfDay },
            }),
            BagModel.countDocuments(),

            // Detailed data
            SessionModel.find({
                date: { $gte: startOfDay, $lte: endOfDay },
            }).select('startTime endTime status'),
            BagModel.distinct('exporterId', {
                date: { $gte: startOfDay, $lte: endOfDay },
            }),
            BagModel.find({
                date: { $gte: startOfDay, $lte: endOfDay },
            }).populate('exporterId').select('exporterId weight workers'),
        ]);

        // Calculate metrics
        const totalKilograms = totalBags * 60;
        const totalKilogramsToday = bagsToday * 60;

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

        const avgBagsPerDay = bagsLast7Days / 7;
        const avgBagsPerDayLast30 = bagsLast30Days / 30;
        const exportersServedToday = exportersToday.length;

        // Build per-exporter breakdown and calculate total costs today
        let totalCostsToday = 0;
        const exporterBreakdown: any[] = [];

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

            const rateMap = new Map<string, number>();
            rateCards.forEach((rc: any) => {
                rateMap.set(rc.exporterId.toString(), rc.ratePerBag);
            });

            // Group bags + weight per exporter
            const exporterDataMap = new Map<string, { name: string; code: string; bags: number; weight: number }>();
            allBagsToday.forEach((bag: any) => {
                const expId = bag.exporterId?._id?.toString();
                if (!expId) return;
                if (!exporterDataMap.has(expId)) {
                    exporterDataMap.set(expId, {
                        name: bag.exporterId?.companyTradingName || 'Unknown',
                        code: bag.exporterId?.exporterCode || '',
                        bags: 0,
                        weight: 0,
                    });
                }
                const entry = exporterDataMap.get(expId)!;
                entry.bags += 1;
                entry.weight += bag.weight || 60;
            });

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

            // Sort by bags descending
            exporterBreakdown.sort((a, b) => b.bagsToday - a.bagsToday);
        }

        // Get trend data — 3 aggregations replace 21 sequential queries
        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
        const [attTrend, bagsTrend, sessTrend] = await Promise.all([
            AttendanceModel.aggregate([
                { $match: { date: { $gte: trendStart, $lte: endOfDay } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
            ]),
            BagModel.aggregate([
                { $match: { date: { $gte: trendStart, $lte: endOfDay } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
            ]),
            SessionModel.aggregate([
                { $match: { date: { $gte: trendStart, $lte: endOfDay } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
            ]),
        ]);
        const attMap = new Map(attTrend.map((d: any) => [d._id, d.count]));
        const bagsMap = new Map(bagsTrend.map((d: any) => [d._id, d.count]));
        const sessMap = new Map(sessTrend.map((d: any) => [d._id, d.count]));

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

        const analytics = {
            // System overview
            totalWorkers,
            activeWorkers,
            totalExporters,
            activeExporters,
            totalFacilities,
            totalBags,
            totalKilograms,

            // Today's operations
            workersCheckedInToday,
            activeSessions,
            bagsToday,
            totalKilogramsToday,
            exportersServedToday,
            totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
            totalCostsToday: Math.round(totalCostsToday * 100) / 100,

            // Averages and trends
            avgBagsPerDay: Math.round(avgBagsPerDay * 10) / 10,
            avgBagsPerDayLast30: Math.round(avgBagsPerDayLast30 * 10) / 10,
            bagsLast7Days,
            bagsLast30Days,

            // Per-exporter breakdown for today
            exporterBreakdown,

            // Trend data
            trends: {
                attendance: trendData,
                bags: trendData,
                sessions: trendData,
            },
        };

        return NextResponse.json({ analytics });
    } catch (error) {
        console.error('Get admin analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
