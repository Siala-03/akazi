import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkerModel from '@/models/Worker';
import SessionModel from '@/models/Session';
import BagModel from '@/models/Bag';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const DEFAULT_HOURLY_RATE = 50;

        // Get worker counts
        const [totalActiveWorkers, totalInactiveWorkers] = await Promise.all([
            WorkerModel.countDocuments({ status: 'active' }),
            WorkerModel.countDocuments({ status: { $ne: 'active' } })
        ]);

        // Get all sessions to calculate hours and costs
        const allSessions = await SessionModel.find({ status: { $in: ['active', 'completed'] } })
            .select('startTime endTime status');

        let totalHours = 0;
        allSessions.forEach((session: any) => {
            if (session.endTime) {
                const hours = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHours += hours;
            } else if (session.status === 'active') {
                const hours = (Date.now() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHours += hours;
            }
        });

        const totalLaborCosts = totalHours * DEFAULT_HOURLY_RATE;
        const avgHoursPerWorker = totalActiveWorkers > 0 ? totalHours / totalActiveWorkers : 0;

        // Find top performer (most bags processed)
        const topPerformerData = await BagModel.aggregate([
            { $unwind: '$workers' },
            {
                $group: {
                    _id: '$workers',
                    bagsProcessed: { $sum: 1 }
                }
            },
            { $sort: { bagsProcessed: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: 'workers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'workerInfo'
                }
            },
            { $unwind: '$workerInfo' }
        ]);

        const topPerformer = topPerformerData.length > 0 ? {
            name: topPerformerData[0].workerInfo.fullName,
            bagsProcessed: topPerformerData[0].bagsProcessed
        } : null;

        const stats = {
            totalActiveWorkers,
            totalInactiveWorkers,
            totalLaborCosts: Math.round(totalLaborCosts * 100) / 100,
            avgHoursPerWorker: Math.round(avgHoursPerWorker * 10) / 10,
            topPerformer
        };

        return NextResponse.json({ stats });
    } catch (error) {
        console.error('Get worker stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
