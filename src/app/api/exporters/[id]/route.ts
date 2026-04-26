import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ExporterModel from '@/models/Exporter';
import { getCurrentUser } from '@/lib/auth';

// GET - Get single exporter
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { id } = await params;
        const exporter = await ExporterModel.findById(id);

        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }

        // Exporter users can only see their own data
        if (currentUser.role === 'exporter' && currentUser.exporterId !== id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ exporter });
    } catch (error) {
        console.error('Get exporter error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT - Update exporter
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        const { id } = await params;

        // Don't allow changing exporterCode
        delete body.exporterCode;

        const exporter = await ExporterModel.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }

        return NextResponse.json({ exporter });
    } catch (error) {
        console.error('Update exporter error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Deactivate exporter (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        await dbConnect();

        const { id } = await params;
        const exporter = await ExporterModel.findByIdAndUpdate(
            id,
            { $set: { isActive: false } },
            { new: true }
        );

        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Exporter deactivated successfully', exporter });
    } catch (error) {
        console.error('Delete exporter error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
