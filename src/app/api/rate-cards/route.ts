import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['admin', 'exporter'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const exporterIdParam = searchParams.get('exporterId');

        const where: any = {};
        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            where.exporterId = currentUser.exporterId;
        } else if (exporterIdParam) {
            where.exporterId = exporterIdParam;
        }

        const rateCards = await prisma.rateCard.findMany({
            where,
            include: {
                exporter: { select: { id: true, companyTradingName: true, exporterCode: true } },
                creator: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            rateCards: rateCards.map(rc => toMongo(rc, { exporter: 'exporterId', creator: 'createdBy' })),
        });
    } catch (error) {
        console.error('Get rate cards error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { exporterId, ratePerBag } = await request.json();

        if (!exporterId || ratePerBag === undefined || ratePerBag === null) {
            return NextResponse.json({ error: 'exporterId and ratePerBag are required' }, { status: 400 });
        }
        if (ratePerBag < 0) {
            return NextResponse.json({ error: 'ratePerBag must be >= 0' }, { status: 400 });
        }

        const exporter = await prisma.exporter.findUnique({ where: { id: exporterId } });
        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }

        // Deactivate existing active rate cards for this exporter
        await prisma.rateCard.updateMany({
            where: { exporterId, isActive: true },
            data: { isActive: false, effectiveTo: new Date() },
        });

        const rateCard = await prisma.rateCard.create({
            data: { exporterId, ratePerBag, effectiveFrom: new Date(), isActive: true, createdBy: currentUser.userId },
            include: {
                exporter: { select: { id: true, companyTradingName: true, exporterCode: true } },
                creator: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ rateCard: toMongo(rateCard, { exporter: 'exporterId', creator: 'createdBy' }) }, { status: 201 });
    } catch (error) {
        console.error('Create rate card error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
