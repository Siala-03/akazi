import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkerModel from '@/models/Worker';
import { getCurrentUser } from '@/lib/auth';

// GET - Get single worker
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { id } = await params;
        const worker = await WorkerModel.findById(id)
            .populate('cooperativeId');

        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        return NextResponse.json({ worker });
    } catch (error) {
        console.error('Get worker error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT - Update worker
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

        const body = await request.json();
        const { id } = await params;

        // Don't allow changing workerId or critical audit fields
        delete body.workerId;
        delete body.enrollmentDate;
        delete body.consentTimestamp;

        const worker = await WorkerModel.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        ).populate('cooperativeId');

        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        return NextResponse.json({ worker });
    } catch (error) {
        console.error('Update worker error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Deactivate worker (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        await dbConnect();

        const { id } = await params;
        const worker = await WorkerModel.findByIdAndUpdate(
            id,
            { $set: { status: 'inactive' } },
            { new: true }
        );

        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Worker deactivated successfully', worker });
    } catch (error) {
        console.error('Delete worker error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
