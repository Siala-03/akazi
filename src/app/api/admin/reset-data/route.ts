import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
        }

        // Delete in dependency order to avoid FK violations
        const [auditLogs, workerRequests, earnings, bagWorkers] = await Promise.all([
            prisma.auditLog.deleteMany({}),
            prisma.workerRequest.deleteMany({}),
            prisma.earnings.deleteMany({}),
            prisma.bagWorker.deleteMany({}),
        ]);

        const [bags, sessions, attendances, workers] = await Promise.all([
            prisma.bag.deleteMany({}),
            prisma.session.deleteMany({}),
            prisma.attendance.deleteMany({}),
            prisma.worker.deleteMany({}),
        ]);

        return NextResponse.json({
            success: true,
            deleted: {
                workers: workers.count,
                attendance: attendances.count,
                sessions: sessions.count,
                bags: bags.count,
                earnings: earnings.count,
                auditLogs: auditLogs.count,
                workerRequests: workerRequests.count,
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
