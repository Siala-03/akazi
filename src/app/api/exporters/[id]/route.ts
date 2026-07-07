import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
        const exporter = await prisma.exporter.findUnique({ where: { id } });
        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }

        if (currentUser.role === 'exporter' && currentUser.exporterId !== id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ exporter: { ...exporter, _id: exporter.id } });
    } catch (error) {
        console.error('Get exporter error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const body = await request.json();
        const { id } = await params;
        const { exporterCode: _ec, id: _id, ...data } = body;

        const exporter = await prisma.exporter.update({ where: { id }, data });

        return NextResponse.json({ exporter: { ...exporter, _id: exporter.id } });
    } catch (error) {
        console.error('Update exporter error:', error);
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

        const hasSessions = await prisma.session.count({ where: { exporterId: id } });
        if (hasSessions > 0) {
            return NextResponse.json(
                { error: 'Cannot delete an exporter with existing session records. Deactivate them instead.' },
                { status: 409 }
            );
        }

        await prisma.$transaction([
            prisma.workerRequest.deleteMany({ where: { exporterId: id } }),
            prisma.rateCard.deleteMany({ where: { exporterId: id } }),
            prisma.user.deleteMany({ where: { exporterId: id, role: 'exporter' } }),
            prisma.exporter.delete({ where: { id } }),
        ]);

        return NextResponse.json({ message: 'Exporter deleted successfully' });
    } catch (error) {
        console.error('Delete exporter error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
