import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
// Import all models via barrel to ensure schemas are registered for populate
import { BagModel, SessionModel } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { generateBagNumber } from '@/lib/utils';

// POST - Record bag
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { exporterId, workerIds, weight } = await request.json();

        // Validate worker count (2-4 workers per bag)
        if (!workerIds || workerIds.length < 2 || workerIds.length > 4) {
            return NextResponse.json(
                { error: 'Each bag must have between 2 and 4 workers' },
                { status: 400 }
            );
        }

        // Validate all workers have active sessions with the same exporter
        const sessions = await SessionModel.find({
            workerId: { $in: workerIds },
            exporterId,
            status: 'active',
        });

        if (sessions.length !== workerIds.length) {
            return NextResponse.json(
                {
                    error:
                        'All workers must have active sessions with the selected exporter',
                },
                { status: 400 }
            );
        }

        // Generate bag number
        const bagNumber = generateBagNumber();

        // Create bag with worker associations
        const workers = sessions.map((session) => ({
            workerId: session.workerId,
            sessionId: session._id,
        }));

        const bagData: any = {
            bagNumber,
            exporterId,
            date: new Date(),
            weight: weight || 60,
            workers,
            status: 'completed',
            supervisorId: currentUser.userId,
        };

        // Attach facilityId only if available (optional since facility requirement removed)
        const facilityId = sessions[0]?.facilityId;
        if (facilityId) bagData.facilityId = facilityId;

        const bag = await BagModel.create(bagData);

        const populatedBag = await BagModel.findById(bag._id)
            .populate('exporterId')
            .populate('facilityId')
            .populate('workers.workerId');

        return NextResponse.json({ bag: populatedBag }, { status: 201 });
    } catch (error) {
        console.error('Create bag error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET - Get bags
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const exporterId = searchParams.get('exporterId');
        const date = searchParams.get('date');

        let query: any = {};

        if (exporterId) {
            query.exporterId = exporterId;
        }

        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        // Exporter users can only see their bags
        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            query.exporterId = currentUser.exporterId;
        }

        const bags = await BagModel.find(query)
            .populate('exporterId')
            .populate('facilityId')
            .populate('workers.workerId')
            .sort({ date: -1, createdAt: -1 })
            .limit(200);

        return NextResponse.json({ bags });
    } catch (error) {
        console.error('Get bags error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
