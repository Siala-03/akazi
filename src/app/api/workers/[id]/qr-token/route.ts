import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { WorkerModel } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;

        const worker = await WorkerModel.findById(id).select('fullName workerId qrToken status photo phone');
        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        // Generate a qrToken if the worker doesn't have one yet
        if (!worker.qrToken) {
            worker.qrToken = randomUUID();
            await worker.save();
        }

        return NextResponse.json({
            qrToken: worker.qrToken,
            workerName: worker.fullName,
            workerId: worker.workerId,
            phone: worker.phone,
            status: worker.status,
            photo: worker.photo,
        });
    } catch (error) {
        console.error('Get QR token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Regenerate QR token (revoke old one)
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;

        const worker = await WorkerModel.findByIdAndUpdate(
            id,
            { qrToken: randomUUID() },
            { new: true }
        ).select('fullName workerId qrToken');

        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        return NextResponse.json({
            qrToken: worker.qrToken,
            workerName: worker.fullName,
            workerId: worker.workerId,
        });
    } catch (error) {
        console.error('Regenerate QR token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
