import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ExporterModel from '@/models/Exporter';
import UserModel from '@/models/User';
import { getCurrentUser } from '@/lib/auth';

// POST - Link current exporter user to an Exporter document by code
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { exporterCode } = await request.json();
        if (!exporterCode || typeof exporterCode !== 'string') {
            return NextResponse.json({ error: 'Exporter code is required.' }, { status: 400 });
        }

        // Find the exporter by code (case-insensitive)
        const exporter = await ExporterModel.findOne({
            exporterCode: exporterCode.trim().toUpperCase(),
            isActive: true,
        });

        if (!exporter) {
            return NextResponse.json(
                { error: 'No active exporter found with that code. Please double-check and try again.' },
                { status: 404 }
            );
        }

        // Check if this exporter is already linked to another user
        const alreadyLinked = await UserModel.findOne({
            exporterId: exporter._id,
            _id: { $ne: currentUser.userId },
        });

        if (alreadyLinked) {
            return NextResponse.json(
                { error: 'This exporter code is already linked to another account. Contact the administrator.' },
                { status: 409 }
            );
        }

        // Link this user to the exporter
        await UserModel.findByIdAndUpdate(currentUser.userId, { exporterId: exporter._id });

        return NextResponse.json({
            success: true,
            exporter: {
                _id: exporter._id,
                exporterCode: exporter.exporterCode,
                companyTradingName: exporter.companyTradingName,
            },
        });
    } catch (error) {
        console.error('Link exporter error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
