import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateBagNumber } from '@/lib/utils';
import { toMongo } from '@/lib/serialize';

function serializeBag(bag: any) {
    try {
        const { workers: bagWorkers, exporter, facility, supervisor, ...rest } = bag;
        return {
            ...rest,
            _id: rest.id,
            exporterId: exporter ? toMongo(exporter) : (rest.exporterId || null),
            facilityId: facility ? toMongo(facility) : (rest.facilityId || null),
            supervisorId: rest.supervisorId,
            workers: (bagWorkers ?? []).map((bw: any) => ({
                _id: bw.id,
                workerId: bw.worker ? toMongo(bw.worker) : (bw.workerId || null),
                sessionId: bw.sessionId,
            })),
        };
    } catch (e) {
        console.error('serializeBag error:', e);
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
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
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

        // Date filtering - filter directly on bag.date
        if (date) {
            try {
                const targetDate = new Date(date);
                if (isNaN(targetDate.getTime())) {
                    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
                }
                const start = new Date(targetDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(targetDate);
                end.setHours(23, 59, 59, 999);
                where.date = { gte: start, lte: end };
            } catch (e) {
                console.error('Date parse error:', e);
                return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
            }
        } else if (startDate || endDate) {
            try {
                const dateRange: { gte?: Date; lte?: Date } = {};
                if (startDate) {
                    const start = new Date(startDate);
                    if (isNaN(start.getTime())) {
                        return NextResponse.json({ error: 'Invalid startDate format' }, { status: 400 });
                    }
                    start.setHours(0, 0, 0, 0);
                    dateRange.gte = start;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    if (isNaN(end.getTime())) {
                        return NextResponse.json({ error: 'Invalid endDate format' }, { status: 400 });
                    }
                    end.setHours(23, 59, 59, 999);
                    dateRange.lte = end;
                }
                where.date = dateRange;
            } catch (e) {
                console.error('Date range parse error:', e);
                return NextResponse.json({ error: 'Invalid date range format' }, { status: 400 });
            }
        }

        const bags = await prisma.bag.findMany({
            where,
            include: {
                exporter: true,
                facility: true,
                workers: { include: { worker: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
            take: 200,
        });

        return NextResponse.json({ bags: bags.map(serializeBag) });
    } catch (error) {
        console.error('Get bags error:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
