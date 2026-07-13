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

        if (currentUser.role === 'supervisor') {
            const settings = await prisma.settings.findFirst();
            if (settings && settings.supervisorCanEditWorkers === false) {
                return NextResponse.json({ error: 'Worker editing has been disabled by the administrator' }, { status: 403 });
            }
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

        const [attendanceCount, sessionCount, earningsCount, bagWorkerCount] = await Promise.all([
            prisma.attendance.count({ where: { workerId: id } }),
            prisma.session.count({ where: { workerId: id } }),
            prisma.earnings.count({ where: { workerId: id } }),
            prisma.bagWorker.count({ where: { workerId: id } }),
        ]);

        const totalDependencies = attendanceCount + sessionCount + earningsCount + bagWorkerCount;
        if (totalDependencies > 0) {
            return NextResponse.json(
                {
                    error: 'Cannot delete worker with operational records. Deactivate the worker instead.',
                    details: {
                        attendances: attendanceCount,
                        sessions: sessionCount,
                        earnings: earningsCount,
                        bagAssignments: bagWorkerCount,
                    },
                },
                { status: 400 }
            );
        }

        const worker = await prisma.worker.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Worker deleted successfully', worker: { ...worker, _id: worker.id } });
    } catch (error) {
        console.error('Delete worker error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
