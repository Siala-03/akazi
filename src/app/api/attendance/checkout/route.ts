import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AttendanceModel from '@/models/Attendance';
import SessionModel from '@/models/Session';
import { getCurrentUser } from '@/lib/auth';

// POST - Check out worker
export async function POST(request: NextRequest) {
    try {
        console.log('[Checkout API] POST request received');
        
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            console.log('[Checkout API] Unauthorized user');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { attendanceId } = await request.json();
        console.log('[Checkout API] Attendance ID:', attendanceId);

        // Find attendance record
        const attendance = await AttendanceModel.findById(attendanceId);
        if (!attendance) {
            console.log('[Checkout API] Attendance record not found');
            return NextResponse.json(
                { error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        console.log('[Checkout API] Attendance found, current status:', attendance.status);

        if (attendance.status === 'checked-out') {
            console.log('[Checkout API] Worker already checked out');
            return NextResponse.json(
                { error: 'Worker is already checked out' },
                { status: 400 }
            );
        }

        // Close any active sessions
        const sessionsResult = await SessionModel.updateMany(
            {
                attendanceId: attendanceId,
                status: 'active',
            },
            {
                $set: {
                    endTime: new Date(),
                    status: 'closed',
                },
            }
        );
        console.log('[Checkout API] Closed sessions:', sessionsResult.modifiedCount);

        // Update attendance
        attendance.checkOutTime = new Date();
        attendance.status = 'checked-out';
        await attendance.save();
        console.log('[Checkout API] Attendance updated to checked-out');

        const populatedAttendance = await AttendanceModel.findById(attendance._id)
            .populate('workerId')
            .populate('facilityId');

        console.log('[Checkout API] Check-out successful for worker:', populatedAttendance?.workerId);

        return NextResponse.json({ 
            attendance: populatedAttendance,
            sessionsClosed: sessionsResult.modifiedCount 
        });
    } catch (error) {
        console.error('[Checkout API] Error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
