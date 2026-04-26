import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkerModel from '@/models/Worker';
import { getCurrentUser } from '@/lib/auth';
import { generateWorkerId } from '@/lib/utils';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { sendQrBadgeEmail } from '@/lib/email';

// GET - List all workers
export async function GET(request: NextRequest) {
    try {
        console.log('[Workers API] GET request received');
        
        const currentUser = await getCurrentUser();
        console.log('[Workers API] Current user:', currentUser?.email || 'none');
        
        if (!currentUser) {
            console.log('[Workers API] No authenticated user');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Workers API] Connecting to database...');
        await dbConnect();
        console.log('[Workers API] Database connected');

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        let query: any = {};

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Search by name, phone, or workerId
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { workerId: { $regex: search, $options: 'i' } },
            ];
        }

        console.log('[Workers API] Query:', JSON.stringify(query));
        const workers = await WorkerModel.find(query)
            .populate('cooperativeId')
            .sort({ createdAt: -1 })
            .limit(100);

        console.log('[Workers API] Found', workers.length, 'workers');
        
        // Get start/end of the current week (Monday–Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ...
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const SESSION_RATE = 2000; // RWF per session

        // Single aggregation replaces N individual queries (one per worker)
        const SessionModel = (await import('@/models/Session')).default;
        const sessionCounts = await SessionModel.aggregate([
            { $match: { workerId: { $in: workers.map(w => w._id) }, date: { $gte: weekStart, $lt: weekEnd } } },
            { $group: { _id: '$workerId', count: { $sum: 1 } } },
        ]);
        const sessionCountMap = new Map(sessionCounts.map((s: any) => [s._id.toString(), s.count]));

        const workersWithEarnings = workers.map(worker => {
            const weekSessions = sessionCountMap.get(worker._id.toString()) || 0;
            return { ...worker.toObject(), weekSessions, earnings: weekSessions * SESSION_RATE };
        });
        
        return NextResponse.json({ workers: workersWithEarnings });
    } catch (error) {
        console.error('[Workers API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST - Create new worker
export async function POST(request: NextRequest) {
    try {
        console.log('[Workers API] POST - Creating new worker');
        
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        console.log('[Workers API] Request body received:', { ...body, photo: body.photo ? '[photo data]' : 'none' });

        // Validate required fields
        if (!body.cooperativeId) {
            return NextResponse.json(
                { error: 'Cooperative ID is required', details: 'Please select a cooperative' },
                { status: 400 }
            );
        }

        if (!body.fullName || !body.phone) {
            return NextResponse.json(
                { error: 'Missing required fields', details: 'Full name and phone are required' },
                { status: 400 }
            );
        }

        // Use provided national ID, or auto-generate one if blank
        let workerId: string;
        if (body.workerId && String(body.workerId).trim()) {
            workerId = String(body.workerId).trim().toUpperCase();
            // Ensure this national ID is not already registered
            const existing = await WorkerModel.findOne({ workerId });
            if (existing) {
                return NextResponse.json(
                    { error: 'A worker with this National ID is already registered' },
                    { status: 409 }
                );
            }
        } else {
            workerId = generateWorkerId();
        }
        console.log('[Workers API] Worker ID:', workerId);

        // Clean up empty string values for optional ObjectId fields
        const cleanedBody = { ...body };
        if (cleanedBody.facilityId === '' || cleanedBody.facilityId === null) {
            delete cleanedBody.facilityId;
        }
        // Remove workerId from body so we use our resolved value
        delete cleanedBody.workerId;

        const worker = await WorkerModel.create({
            ...cleanedBody,
            workerId,
            qrToken: randomUUID(),
            enrollmentDate: new Date(),
            consentTimestamp: new Date(),
        });

        // Send QR badge email if worker has email
        if (worker.email) {
            try {
                const qrDataUrl = await QRCode.toDataURL(`AKAZI:${worker.qrToken}`, {
                    width: 280,
                    margin: 2,
                    color: { dark: '#065f46', light: '#ffffff' },
                    errorCorrectionLevel: 'M',
                });
                await sendQrBadgeEmail(worker.email, worker.fullName, worker.workerId, qrDataUrl);
            } catch (emailErr) {
                console.error('[Workers API] QR email failed (non-blocking):', emailErr);
            }
        }

        console.log('[Workers API] Worker created successfully:', worker._id);
        return NextResponse.json({ worker }, { status: 201 });
    } catch (error) {
        console.error('[Workers API] Create worker error:', error);
        
        // Handle validation errors
        if (error instanceof Error && error.name === 'ValidationError') {
            return NextResponse.json(
                { 
                    error: 'Validation failed', 
                    details: error.message 
                },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
