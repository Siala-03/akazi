import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { WorkerModel, AttendanceModel } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { qrToken } = await request.json();

        if (!qrToken) {
            return NextResponse.json({ error: 'QR token is required' }, { status: 400 });
        }

        // Find worker by their unique QR token
        const worker = await WorkerModel.findOne({ qrToken });
        if (!worker) {
            return NextResponse.json({ error: 'Invalid QR code — worker not found' }, { status: 404 });
        }

        if (worker.status !== 'active') {
            return NextResponse.json(
                { error: `Worker "${worker.fullName}" is not active` },
                { status: 400 }
            );
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        // Check if already checked in today
        const existing = await AttendanceModel.findOne({
            workerId: worker._id,
            date: { $gte: startOfDay, $lte: endOfDay },
        });

        if (existing) {
            if (existing.status === 'on-site') {
                return NextResponse.json(
                    { error: `${worker.fullName} is already checked in and on-site` },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: `${worker.fullName} has already completed attendance for today` },
                { status: 400 }
            );
        }

        // Create attendance record
        const attendance = await AttendanceModel.create({
            workerId: worker._id,
            date: today,
            checkInTime: today,
            status: 'on-site',
            supervisorId: currentUser.userId,
        });

        const populated = await AttendanceModel.findById((attendance as any)._id).populate('workerId');

        return NextResponse.json({
            success: true,
            message: `${worker.fullName} checked in via QR`,
            worker: {
                _id: worker._id,
                fullName: worker.fullName,
                workerId: worker.workerId,
                photo: worker.photo,
            },
            attendance: populated,
        }, { status: 201 });
    } catch (error) {
        console.error('QR check-in error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
