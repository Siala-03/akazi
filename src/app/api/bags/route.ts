import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateBagNumber } from '@/lib/utils';

function serializeBag(bag: any) {
    try {
        return {
            _id: bag.id,
            id: bag.id,
            bagNumber: bag.bagNumber,
            exporterId: bag.exporterId,
            facilityId: bag.facilityId,
            date: bag.date,
            startedAt: bag.startedAt,
            completedAt: bag.completedAt,
            weight: bag.weight,
            status: bag.status,
            supervisorId: bag.supervisorId,
            createdAt: bag.createdAt,
            updatedAt: bag.updatedAt,
            exporter: bag.exporter ? { _id: bag.exporter.id, id: bag.exporter.id, ...bag.exporter } : null,
            facility: bag.facility ? { _id: bag.facility.id, id: bag.facility.id, ...bag.facility } : null,
            workers: (bag.workers ?? []).map((bw: any) => ({
                _id: bw.id,
                id: bw.id,
                bagId: bw.bagId,
                workerId: bw.workerId,
                sessionId: bw.sessionId,
                worker: bw.worker ? { _id: bw.worker.id, id: bw.worker.id, ...bw.worker } : null,
            })),
        };
    } catch (e) {
        console.error('serializeBag error for bag:', bag?.id, e);
        throw e;
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { exporterId, workerIds, weight } = await request.json();

        if (!workerIds || workerIds.length < 2 || workerIds.length > 4) {
            return NextResponse.json({ error: 'Each bag must have between 2 and 4 workers' }, { status: 400 });
        }

        const sessions = await prisma.session.findMany({
            where: { workerId: { in: workerIds }, exporterId, status: 'active' },
            select: {
                id: true,
                workerId: true,
                facilityId: true,
            },
        });

        if (sessions.length !== workerIds.length) {
            return NextResponse.json(
                { error: 'All workers must have active sessions with the selected exporter' },
                { status: 400 }
            );
        }

        const facilityId = sessions[0]?.facilityId || null;

        const bag = await prisma.bag.create({
            data: {
                bagNumber: generateBagNumber(),
                exporterId,
                facilityId,
                date: new Date(),
                startedAt: new Date(),
                weight: weight || 60,
                status: 'in_progress',
                supervisorId: currentUser.userId,
                workers: {
                    create: sessions.map((s) => ({ workerId: s.workerId, sessionId: s.id })),
                },
            },
            include: {
                exporter: true,
                facility: true,
                workers: { include: { worker: true } },
            },
        });

        return NextResponse.json({ bag: serializeBag(bag) }, { status: 201 });
    } catch (error) {
        console.error('Create bag error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const exporterIdParam = searchParams.get('exporterId');
        const status = searchParams.get('status');

        const where: any = {};

        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            where.exporterId = currentUser.exporterId;
        } else if (exporterIdParam) {
            where.exporterId = exporterIdParam;
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const bags = await prisma.bag.findMany({
            where,
            include: {
                exporter: true,
                facility: true,
                workers: { include: { worker: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        return NextResponse.json({ bags: bags.map(serializeBag) });
    } catch (error) {
        console.error('Get bags error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
