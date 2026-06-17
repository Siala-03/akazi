import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

export async function PUT(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.session.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        if (existing.status !== 'active') {
            return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
        }

        const session = await prisma.session.update({
            where: { id },
            data: { endTime: new Date(), status: 'closed' },
            include: { worker: true, exporter: true, facility: true },
        });

        return NextResponse.json({
            session: toMongo(session, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' }),
        });
    } catch (error) {
        console.error('End session error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.session.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Remove linked BagWorker records first, then the session
        await prisma.bagWorker.deleteMany({ where: { sessionId: id } });
        await prisma.session.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete session error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
