import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { RateCardModel, ExporterModel } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';

// GET - List rate cards
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['admin', 'exporter'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const exporterId = searchParams.get('exporterId');

        let query: any = {};

        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            query.exporterId = currentUser.exporterId;
        } else if (exporterId) {
            query.exporterId = exporterId;
        }

        const rateCards = await RateCardModel.find(query)
            .populate('exporterId', 'companyTradingName exporterCode')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json({ rateCards });
    } catch (error) {
        console.error('Get rate cards error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create rate card (Admin only)
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { exporterId, ratePerBag } = await request.json();

        if (!exporterId || ratePerBag === undefined || ratePerBag === null) {
            return NextResponse.json({ error: 'exporterId and ratePerBag are required' }, { status: 400 });
        }

        if (ratePerBag < 0) {
            return NextResponse.json({ error: 'ratePerBag must be >= 0' }, { status: 400 });
        }

        // Verify exporter exists
        const exporter = await ExporterModel.findById(exporterId);
        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }

        // Deactivate any existing active rate cards for this exporter
        await RateCardModel.updateMany(
            { exporterId, isActive: true },
            { isActive: false, effectiveTo: new Date() }
        );

        // Create new rate card
        const rateCard = await RateCardModel.create({
            exporterId,
            ratePerBag,
            effectiveFrom: new Date(),
            isActive: true,
            createdBy: currentUser.userId,
        });

        const populated = await RateCardModel.findById(rateCard._id)
            .populate('exporterId', 'companyTradingName exporterCode')
            .populate('createdBy', 'name');

        return NextResponse.json({ rateCard: populated }, { status: 201 });
    } catch (error) {
        console.error('Create rate card error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
