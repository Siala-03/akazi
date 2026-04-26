import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BagModel from '@/models/Bag';
import RateCardModel from '@/models/RateCard';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const workerId = searchParams.get('workerId');
        const exporterId = searchParams.get('exporterId');

        let query: any = {};

        // Date range filter
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Worker filter
        if (workerId) {
            query['workers.workerId'] = workerId;
        }

        // Exporter filter
        if (exporterId) {
            query.exporterId = exporterId;
        }

        const bags = await BagModel.find(query)
            .populate('exporterId')
            .populate('facilityId')
            .populate('workers.workerId')
            .sort({ date: -1 });

        // Get current rate card
        const rateCard = await RateCardModel.findOne({ isActive: true })
            .sort({ effectiveFrom: -1 });

        const ratePerBag = rateCard?.ratePerBag || 1000;

        // Calculate worker earnings
        const workerEarnings: any = {};
        bags.forEach((bag: any) => {
            const workersCount = bag.workers.length;
            const earningPerWorker = ratePerBag / workersCount;

            bag.workers.forEach((worker: any) => {
                const workerId = worker.workerId._id.toString();
                if (!workerEarnings[workerId]) {
                    workerEarnings[workerId] = {
                        worker: worker.workerId,
                        bagsContributed: 0,
                        totalEarnings: 0,
                    };
                }
                workerEarnings[workerId].bagsContributed++;
                workerEarnings[workerId].totalEarnings += earningPerWorker;
            });
        });

        // Calculate exporter stats
        const exporterStats: any = {};
        bags.forEach((bag: any) => {
            const exporterId = bag.exporterId._id.toString();
            if (!exporterStats[exporterId]) {
                exporterStats[exporterId] = {
                    exporter: bag.exporterId,
                    totalBags: 0,
                    totalCost: 0,
                };
            }
            exporterStats[exporterId].totalBags++;
            exporterStats[exporterId].totalCost += ratePerBag;
        });

        const totalEarnings = bags.length * ratePerBag;

        return NextResponse.json({
            bags,
            summary: {
                totalBags: bags.length,
                totalEarnings,
                ratePerBag,
                uniqueWorkers: Object.keys(workerEarnings).length,
                uniqueExporters: Object.keys(exporterStats).length,
            },
            workerEarnings: Object.values(workerEarnings),
            exporterStats: Object.values(exporterStats),
        });
    } catch (error) {
        console.error('Earnings report error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
