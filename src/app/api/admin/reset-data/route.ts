import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import {
    WorkerModel,
    AttendanceModel,
    SessionModel,
    BagModel,
    EarningsModel,
    AuditLogModel,
    WorkerRequestModel,
} from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/admin/reset-data
 * Deletes all operational data (workers, attendance, sessions, bags, earnings, audit logs, worker requests).
 * Keeps user accounts, cooperatives, facilities, exporters, and rate cards intact.
 * Requires admin role.
 */
export async function POST() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
        }

        await dbConnect();

        const [
            workers,
            attendance,
            sessions,
            bags,
            earnings,
            auditLogs,
            workerRequests,
        ] = await Promise.all([
            WorkerModel.deleteMany({}),
            AttendanceModel.deleteMany({}),
            SessionModel.deleteMany({}),
            BagModel.deleteMany({}),
            EarningsModel.deleteMany({}),
            AuditLogModel.deleteMany({}),
            WorkerRequestModel.deleteMany({}),
        ]);

        return NextResponse.json({
            success: true,
            deleted: {
                workers: workers.deletedCount,
                attendance: attendance.deletedCount,
                sessions: sessions.deletedCount,
                bags: bags.deletedCount,
                earnings: earnings.deletedCount,
                auditLogs: auditLogs.deletedCount,
                workerRequests: workerRequests.deletedCount,
            },
        });
    } catch (error) {
        console.error('Reset data error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
