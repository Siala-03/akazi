import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkerRequestModel from '@/models/WorkerRequest';
import UserModel from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

// GET - Single worker request
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
        const workerRequest = await WorkerRequestModel.findById(id)
            .populate('exporterId', 'companyTradingName exporterCode phone email contactPerson')
            .populate('reviewedBy', 'name email');

        if (!workerRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Exporters can only see their own requests
        if (currentUser.role === 'exporter') {
            const dbUser = await UserModel.findById(currentUser.userId).lean();
            const exporterId = (dbUser as any)?.exporterId?.toString();
            if (!exporterId || workerRequest.exporterId.toString() !== exporterId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return NextResponse.json({ workerRequest });
    } catch (error) {
        console.error('Get worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Update request status (Admin only) or cancel (Exporter own request)
export async function PATCH(
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
        const workerRequest = await WorkerRequestModel.findById(id);
        if (!workerRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const body = await request.json();

        if (currentUser.role === 'admin') {
            // Admin can approve, reject, or mark as fulfilled
            const { status, adminNotes } = body;

            if (!['approved', 'rejected', 'fulfilled', 'pending'].includes(status)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }

            const updated = await WorkerRequestModel.findByIdAndUpdate(
                id,
                {
                    status,
                    adminNotes: adminNotes || workerRequest.adminNotes,
                    reviewedBy: currentUser.userId,
                    reviewedAt: new Date(),
                },
                { new: true }
            )
                .populate('exporterId', 'companyTradingName exporterCode phone email contactPerson')
                .populate('reviewedBy', 'name email');

            return NextResponse.json({ workerRequest: updated });
        } else if (currentUser.role === 'exporter') {
            // Exporter can only cancel their own pending request
            const dbUser = await UserModel.findById(currentUser.userId).lean();
            const exporterId = (dbUser as any)?.exporterId?.toString();
            if (!exporterId || workerRequest.exporterId.toString() !== exporterId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (workerRequest.status !== 'pending') {
                return NextResponse.json(
                    { error: 'Only pending requests can be cancelled.' },
                    { status: 400 }
                );
            }

            const updated = await WorkerRequestModel.findByIdAndUpdate(
                id,
                { status: 'rejected' },
                { new: true }
            ).populate('exporterId', 'companyTradingName exporterCode');

            return NextResponse.json({ workerRequest: updated });
        }

        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch (error) {
        console.error('Update worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete a pending request (Exporter only, own request)
export async function DELETE(
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
        const workerRequest = await WorkerRequestModel.findById(id);
        if (!workerRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (currentUser.role === 'exporter') {
            const dbUser = await UserModel.findById(currentUser.userId).lean();
            const exporterId = (dbUser as any)?.exporterId?.toString();
            if (!exporterId || workerRequest.exporterId.toString() !== exporterId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (workerRequest.status !== 'pending') {
                return NextResponse.json(
                    { error: 'Only pending requests can be deleted.' },
                    { status: 400 }
                );
            }
        } else if (currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await WorkerRequestModel.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Delete worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
