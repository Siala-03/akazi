import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AttendanceModel from '@/models/Attendance';
import WorkerModel from '@/models/Worker';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

// POST - Check in worker
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        const { workerId } = body;

        // Validate worker exists and is active
        const worker = await WorkerModel.findById(workerId);
        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }
        if (worker.status !== 'active') {
            return NextResponse.json(
                { error: 'Worker is not active' },
                { status: 400 }
            );
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        // Check if worker has ANY attendance record today (on-site or checked-out)
        // According to documentation: One check-in per day only
        const existingAttendance = await AttendanceModel.findOne({
            workerId,
            date: { $gte: startOfDay, $lte: endOfDay },
        });

        if (existingAttendance) {
            if (existingAttendance.status === 'on-site') {
                return NextResponse.json(
                    { error: 'Worker is already checked in and currently on-site' },
                    { status: 400 }
                );
            } else {
                // Worker already checked in and out today
                return NextResponse.json(
                    { error: 'Worker has already completed attendance for today (checked in and out)' },
                    { status: 400 }
                );
            }
        }

        // Create attendance record
        const attendance = await AttendanceModel.create({
            workerId,
            date: today,
            checkInTime: new Date(),
            status: 'on-site',
            supervisorId: currentUser.userId,
        });

        const populatedAttendance = await AttendanceModel.findById(attendance._id)
            .populate('workerId');

        return NextResponse.json({ attendance: populatedAttendance }, { status: 201 });
    } catch (error) {
        console.error('[Check-in] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

// GET - Get today's attendance
export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const attendance = await AttendanceModel.find({
            date: { $gte: startOfDay, $lte: endOfDay },
        })
            .populate('workerId')
            .populate('facilityId')
            .sort({ checkInTime: -1 });

        return NextResponse.json({ attendance });
    } catch (error) {
        console.error('Get attendance error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
