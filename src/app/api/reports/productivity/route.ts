import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BagModel from '@/models/Bag';
import SessionModel from '@/models/Session';
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

        let query: any = {};

        // Date range filter
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const bags = await BagModel.find(query)
            .populate('exporterId')
            .populate('facilityId')
            .populate('workers.workerId');

        const sessions = await SessionModel.find(query)
            .populate('workerId')
            .populate('exporterId');

        // Calculate productivity metrics
        const workerProductivity: any = {};
        bags.forEach((bag: any) => {
            bag.workers.forEach((worker: any) => {
                const workerId = worker.workerId._id.toString();
                if (!workerProductivity[workerId]) {
                    workerProductivity[workerId] = {
                        worker: worker.workerId,
                        bagsProcessed: 0,
                        totalWeight: 0,
                    };
                }
                workerProductivity[workerId].bagsProcessed++;
                workerProductivity[workerId].totalWeight += bag.weight / bag.workers.length;
            });
        });

        // Calculate session duration stats
        const completedSessions = sessions.filter((s: any) => s.status === 'completed' && s.endTime);
        const avgSessionDuration = completedSessions.length > 0
            ? completedSessions.reduce((sum: number, s: any) => {
                const duration = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
                return sum + duration;
            }, 0) / completedSessions.length
            : 0;

        // Exporter productivity
        const exporterProductivity: any = {};
        bags.forEach((bag: any) => {
            const exporterId = bag.exporterId._id.toString();
            if (!exporterProductivity[exporterId]) {
                exporterProductivity[exporterId] = {
                    exporter: bag.exporterId,
                    bagsProcessed: 0,
                    totalWeight: 0,
                };
            }
            exporterProductivity[exporterId].bagsProcessed++;
            exporterProductivity[exporterId].totalWeight += bag.weight;
        });

        // Facility productivity
        const facilityStats: any = {};
        bags.forEach((bag: any) => {
            const facilityId = bag.facilityId._id.toString();
            if (!facilityStats[facilityId]) {
                facilityStats[facilityId] = {
                    facility: bag.facilityId,
                    bagsProcessed: 0,
                    totalWeight: 0,
                };
            }
            facilityStats[facilityId].bagsProcessed++;
            facilityStats[facilityId].totalWeight += bag.weight;
        });

        return NextResponse.json({
            summary: {
                totalBags: bags.length,
                totalWeight: bags.reduce((sum: number, b: any) => sum + b.weight, 0),
                totalSessions: sessions.length,
                activeSessions: sessions.filter((s: any) => s.status === 'active').length,
                avgSessionDurationMinutes: Math.round(avgSessionDuration / 1000 / 60),
            },
            workerProductivity: Object.values(workerProductivity),
            exporterProductivity: Object.values(exporterProductivity),
            facilityStats: Object.values(facilityStats),
        });
    } catch (error) {
        console.error('Productivity report error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
