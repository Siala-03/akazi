import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkerRequestModel from '@/models/WorkerRequest';
import ExporterModel from '@/models/Exporter';
import UserModel from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

// GET - List worker requests
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        let query: any = {};

        // Exporters can only see their own requests
        if (currentUser.role === 'exporter') {
            // Always fetch fresh exporterId from DB — JWT may be stale
            const dbUser = await UserModel.findById(currentUser.userId);
            let exporterId = dbUser?.exporterId;

            // Auto-link by email if exporterId not set yet
            if (!exporterId) {
                const matchedExporter = await ExporterModel.findOne({
                    email: currentUser.email.toLowerCase(),
                    isActive: true,
                });
                if (matchedExporter) {
                    await UserModel.findByIdAndUpdate(currentUser.userId, { exporterId: matchedExporter._id });
                    exporterId = matchedExporter._id;
                }
            }

            if (!exporterId) {
                return NextResponse.json({ workerRequests: [], notLinked: true });
            }
            query.exporterId = exporterId;
        }

        // Optional status filter from query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        if (status && status !== 'all') {
            query.status = status;
        }

        const workerRequests = await WorkerRequestModel.find(query)
            .populate('exporterId', 'companyTradingName exporterCode')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 });

        return NextResponse.json({ workerRequests });
    } catch (error) {
        console.error('Get worker requests error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new worker request (Exporter only)
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized. Only exporters can submit requests.' }, { status: 403 });
        }

        await dbConnect();

        // Always fetch fresh exporterId from DB — JWT may be stale
        const dbUser = await UserModel.findById(currentUser.userId);
        let exporterId = dbUser?.exporterId;

        // Auto-link by email if exporterId not set yet
        if (!exporterId) {
            const matchedExporter = await ExporterModel.findOne({
                email: currentUser.email.toLowerCase(),
                isActive: true,
            });
            if (matchedExporter) {
                await UserModel.findByIdAndUpdate(currentUser.userId, { exporterId: matchedExporter._id });
                exporterId = matchedExporter._id;
            }
        }

        if (!exporterId) {
            return NextResponse.json(
                { error: 'Your account is not linked to an exporter profile. Ask the administrator to link your account email to an exporter.' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const {
            numberOfContainers,
            numberOfBags,
            numberOfWorkersNeeded,
            startDate,
            idealCompletionDate,
            notes,
        } = body;

        // Validate required fields
        if (!numberOfContainers || !numberOfBags || !numberOfWorkersNeeded || !startDate || !idealCompletionDate) {
            return NextResponse.json({ error: 'All required fields must be provided.' }, { status: 400 });
        }

        if (new Date(idealCompletionDate) <= new Date(startDate)) {
            return NextResponse.json({ error: 'Ideal completion date must be after start date.' }, { status: 400 });
        }

        const workerRequest = await WorkerRequestModel.create({
            exporterId,
            numberOfContainers,
            numberOfBags,
            numberOfWorkersNeeded,
            startDate: new Date(startDate),
            idealCompletionDate: new Date(idealCompletionDate),
            notes,
            status: 'pending',
        });

        const populated = await WorkerRequestModel.findById(workerRequest._id)
            .populate('exporterId', 'companyTradingName exporterCode');

        return NextResponse.json({ workerRequest: populated }, { status: 201 });
    } catch (error) {
        console.error('Create worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
