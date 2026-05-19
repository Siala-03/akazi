import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

function serializeBag(bag: any) {
    const { workers: bagWorkers, exporter, facility, supervisor, ...rest } = bag;
    return {
        ...rest,
        _id: rest.id,
        exporterId: exporter ? toMongo(exporter) : rest.exporterId,
        facilityId: facility ? toMongo(facility) : rest.facilityId,
        supervisorId: rest.supervisorId,
        workers: (bagWorkers ?? []).map((bw: any) => ({
            _id: bw.id,
            workerId: bw.worker ? toMongo(bw.worker) : bw.workerId,
            sessionId: bw.sessionId,
        })),
    };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { action, workerIds } = await request.json();

        const bag = await prisma.bag.findUnique({ where: { id } });
        if (!bag) {
            return NextResponse.json({ error: 'Bag not found' }, { status: 404 });
        }

        if (action === 'complete') {
            if (bag.status !== 'in_progress') {
                return NextResponse.json({ error: 'Only in-progress bags can be completed' }, { status: 400 });
            }

            const completedBag = await prisma.bag.update({
                where: { id },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
                include: {
                    exporter: true,
                    facility: true,
                    workers: { include: { worker: true } },
                },
            });

            return NextResponse.json({ bag: serializeBag(completedBag) });
        }

        if (action === 'add-workers') {
            if (!Array.isArray(workerIds) || workerIds.length === 0) {
                return NextResponse.json({ error: 'Please select at least one worker' }, { status: 400 });
            }
            if (bag.status !== 'in_progress') {
                return NextResponse.json({ error: 'Workers can only be added to in-progress bags' }, { status: 400 });
            }

            const sessions = await prisma.session.findMany({
                where: {
                    workerId: { in: workerIds },
                    exporterId: bag.exporterId,
                    status: 'active',
                },
                select: {
                    id: true,
                    workerId: true,
                },
            });

            if (sessions.length !== workerIds.length) {
                return NextResponse.json(
                    { error: 'All selected workers must have active sessions with the selected exporter' },
                    { status: 400 }
                );
            }

            const existingAssignments = await prisma.bagWorker.findMany({
                where: { bagId: id },
                select: { sessionId: true },
            });
            const existingSessionIds = new Set(existingAssignments.map((a) => a.sessionId));
            const newSessions = sessions.filter((s) => !existingSessionIds.has(s.id));

            if (newSessions.length === 0) {
                return NextResponse.json({ error: 'Selected workers are already assigned to this bag' }, { status: 400 });
            }

            await prisma.bagWorker.createMany({
                data: newSessions.map((session) => ({
                    bagId: id,
                    workerId: session.workerId,
                    sessionId: session.id,
                })),
            });

            const updatedBag = await prisma.bag.findUnique({
                where: { id },
                include: {
                    exporter: true,
                    facility: true,
                    workers: { include: { worker: true } },
                },
            });

            return NextResponse.json({ bag: serializeBag(updatedBag) });
        }

        return NextResponse.json({ error: 'Invalid action. Use complete or add-workers.' }, { status: 400 });
    } catch (error) {
        console.error('Update bag error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
