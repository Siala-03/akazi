import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const worker = await prisma.worker.findUnique({
            where: { id },
            include: { cooperative: true },
        });

        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        return NextResponse.json({ worker: toMongo(worker, { cooperative: 'cooperativeId' }) });
    } catch (error) {
        console.error('Get worker error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id } = await params;

        // Strip immutable fields
        const { workerId: _wid, enrollmentDate: _ed, consentTimestamp: _ct, id: _id, ...data } = body;

        const worker = await prisma.worker.update({
            where: { id },
            data,
            include: { cooperative: true },
        });

        return NextResponse.json({ worker: toMongo(worker, { cooperative: 'cooperativeId' }) });
    } catch (error) {
        console.error('Update worker error:', error);
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
        const worker = await prisma.worker.update({
            where: { id },
            data: { status: 'inactive' },
        });

        return NextResponse.json({ message: 'Worker deactivated successfully', worker: { ...worker, _id: worker.id } });
    } catch (error) {
        console.error('Delete worker error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
