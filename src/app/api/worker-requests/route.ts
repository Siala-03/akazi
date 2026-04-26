import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

async function resolveExporterId(userId: string, email: string): Promise<string | null> {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (dbUser?.exporterId) return dbUser.exporterId;

    const matched = await prisma.exporter.findFirst({ where: { email: email.toLowerCase(), isActive: true } });
    if (matched) {
        await prisma.user.update({ where: { id: userId }, data: { exporterId: matched.id } });
        return matched.id;
    }
    return null;
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const where: any = {};

        if (currentUser.role === 'exporter') {
            const exporterId = await resolveExporterId(currentUser.userId, currentUser.email);
            if (!exporterId) return NextResponse.json({ workerRequests: [], notLinked: true });
            where.exporterId = exporterId;
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        if (status && status !== 'all') where.status = status;

        const workerRequests = await prisma.workerRequest.findMany({
            where,
            include: {
                exporter: { select: { id: true, companyTradingName: true, exporterCode: true } },
                reviewer: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            workerRequests: workerRequests.map(wr => toMongo(wr, { exporter: 'exporterId', reviewer: 'reviewedBy' })),
        });
    } catch (error) {
        console.error('Get worker requests error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized. Only exporters can submit requests.' }, { status: 403 });
        }

        const exporterId = await resolveExporterId(currentUser.userId, currentUser.email);
        if (!exporterId) {
            return NextResponse.json(
                { error: 'Your account is not linked to an exporter profile. Ask the administrator to link your account email to an exporter.' },
                { status: 400 }
            );
        }

        const { numberOfContainers, numberOfBags, numberOfWorkersNeeded, startDate, idealCompletionDate, notes } = await request.json();

        if (!numberOfContainers || !numberOfBags || !numberOfWorkersNeeded || !startDate || !idealCompletionDate) {
            return NextResponse.json({ error: 'All required fields must be provided.' }, { status: 400 });
        }
        if (new Date(idealCompletionDate) <= new Date(startDate)) {
            return NextResponse.json({ error: 'Ideal completion date must be after start date.' }, { status: 400 });
        }

        const workerRequest = await prisma.workerRequest.create({
            data: {
                exporterId,
                numberOfContainers,
                numberOfBags,
                numberOfWorkersNeeded,
                startDate: new Date(startDate),
                idealCompletionDate: new Date(idealCompletionDate),
                notes,
                status: 'pending',
            },
            include: {
                exporter: { select: { id: true, companyTradingName: true, exporterCode: true } },
            },
        });

        return NextResponse.json({ workerRequest: toMongo(workerRequest, { exporter: 'exporterId' }) }, { status: 201 });
    } catch (error) {
        console.error('Create worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
