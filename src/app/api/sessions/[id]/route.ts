import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SessionModel from '@/models/Session';
import { getCurrentUser } from '@/lib/auth';

// PUT - End session
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const session = await SessionModel.findById((await params).id);

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.status !== 'active') {
            return NextResponse.json(
                { error: 'Session is not active' },
                { status: 400 }
            );
        }

        // End the session
        session.endTime = new Date();
        session.status = 'closed' as const;
        await session.save();

        const populatedSession = await SessionModel.findById(session._id)
            .populate('workerId')
            .populate('exporterId')
            .populate('facilityId');

        return NextResponse.json({ session: populatedSession });
    } catch (error) {
        console.error('End session error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
