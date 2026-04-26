import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { SessionModel, AttendanceModel } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';

// POST - Create session (assign worker to exporter)
export async function POST(request: NextRequest) {
    try {
        console.log('[Session API] POST - Creating new sorting session');
        
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { attendanceId, exporterId } = await request.json();
        console.log('[Session API] Request:', { attendanceId, exporterId });

        // Get attendance record
        const attendance = await AttendanceModel.findById(attendanceId);
        if (!attendance) {
            console.log('[Session API] Attendance record not found');
            return NextResponse.json(
                { error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        if (attendance.status !== 'on-site') {
            console.log('[Session API] Worker not on-site, status:', attendance.status);
            return NextResponse.json(
                { error: 'Worker must be checked in and on-site' },
                { status: 400 }
            );
        }

        // STEP 2: Check for active session (ONE active session per worker)
        const activeSession = await SessionModel.findOne({
            workerId: attendance.workerId,
            status: 'active',
        });

        if (activeSession) {
            console.log('[Session API] Worker already has active session:', activeSession._id);
            return NextResponse.json(
                { error: 'Worker already has an active session. Close existing session before reassigning.' },
                { status: 400 }
            );
        }

        // Create session — facilityId optional since facility requirement was removed
        const sessionData: any = {
            attendanceId,
            workerId: attendance.workerId,
            exporterId,
            date: attendance.date,
            startTime: new Date(),
            status: 'active',
            supervisorId: currentUser.userId,
        };
        if (attendance.facilityId) sessionData.facilityId = attendance.facilityId;

        const session = await SessionModel.create(sessionData);

        console.log('[Session API] Session created:', session._id);

        const populatedSession = await SessionModel.findById(session._id)
            .populate('workerId')
            .populate('exporterId')
            .populate('facilityId');

        return NextResponse.json({ session: populatedSession }, { status: 201 });
    } catch (error) {
        console.error('[Session API] Error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET - Get active sessions
export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const sessions = await SessionModel.find({ status: 'active' })
            .populate('workerId')
            .populate('exporterId')
            .populate('facilityId')
            .sort({ startTime: -1 });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
