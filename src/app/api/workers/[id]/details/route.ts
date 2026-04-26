import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SessionModel from '@/models/Session';
import BagModel from '@/models/Bag';
import AttendanceModel from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfMonth, getEndOfMonth } from '@/lib/utils';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { id: workerId } = await params;
        const DEFAULT_HOURLY_RATE = 50;

        // Get all sessions for this worker
        const workerSessions = await SessionModel.find({ workerId })
            .select('startTime endTime status');

        let totalHours = 0;
        workerSessions.forEach((session: any) => {
            if (session.endTime) {
                const hours = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHours += hours;
            } else if (session.status === 'active') {
                const hours = (Date.now() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHours += hours;
            }
        });

        // Get total bags processed by this worker
        const totalBags = await BagModel.countDocuments({ 'workers.workerId': workerId });

        // Calculate earnings (hours × rate)
        const earnings = totalHours * DEFAULT_HOURLY_RATE;

        // Get days worked this month
        const today = new Date();
        const startOfMonth = getStartOfMonth(today);
        const endOfMonth = getEndOfMonth(today);

        const daysWorkedThisMonth = await AttendanceModel.countDocuments({
            workerId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const details = {
            totalHours: Math.round(totalHours * 10) / 10,
            totalBags,
            earnings: Math.round(earnings * 100) / 100,
            daysWorkedThisMonth
        };

        return NextResponse.json({ details });
    } catch (error) {
        console.error('Get worker details error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
