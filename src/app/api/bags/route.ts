import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateBagNumber } from '@/lib/utils';

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
        });

        return NextResponse.json({ bag: { ...bag, _id: bag.id } }, { status: 201 });
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

        // Minimal query without includes to avoid serialization issues
        const bags = await prisma.bag.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        return NextResponse.json({ bags: bags.map((b) => ({ ...b, _id: b.id })) });
    } catch (error) {
        console.error('Get bags error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
