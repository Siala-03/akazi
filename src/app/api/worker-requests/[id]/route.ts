import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

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
        const workerRequest = await prisma.workerRequest.findUnique({
            where: { id },
            include: {
                exporter: { select: { id: true, companyTradingName: true, exporterCode: true, tinNumber: true, phone: true, email: true, contactPerson: true } },
                reviewer: { select: { id: true, name: true, email: true } },
            },
        });

        if (!workerRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (currentUser.role === 'exporter') {
            const dbUser = await prisma.user.findUnique({ where: { id: currentUser.userId } });
            if (!dbUser?.exporterId || workerRequest.exporterId !== dbUser.exporterId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return NextResponse.json({ workerRequest: toMongo(workerRequest, { exporter: 'exporterId', reviewer: 'reviewedBy' }) });
    } catch (error) {
        console.error('Get worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const workerRequest = await prisma.workerRequest.findUnique({ where: { id } });
        if (!workerRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const body = await request.json();

        if (currentUser.role === 'admin') {
            const { status, adminNotes } = body;
            if (!['approved', 'rejected', 'fulfilled', 'pending'].includes(status)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }

            const updated = await prisma.workerRequest.update({
                where: { id },
                data: { status, adminNotes: adminNotes || workerRequest.adminNotes, reviewedBy: currentUser.userId, reviewedAt: new Date() },
                include: {
                    exporter: { select: { id: true, companyTradingName: true, exporterCode: true, tinNumber: true, phone: true, email: true, contactPerson: true } },
                    reviewer: { select: { id: true, name: true, email: true } },
                },
            });

            return NextResponse.json({ workerRequest: toMongo(updated, { exporter: 'exporterId', reviewer: 'reviewedBy' }) });
        }

        if (currentUser.role === 'exporter') {
            const dbUser = await prisma.user.findUnique({ where: { id: currentUser.userId } });
            if (!dbUser?.exporterId || workerRequest.exporterId !== dbUser.exporterId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (workerRequest.status !== 'pending') {
                return NextResponse.json({ error: 'Only pending requests can be cancelled.' }, { status: 400 });
            }

            const updated = await prisma.workerRequest.update({
                where: { id },
                data: { status: 'rejected' },
                include: { exporter: { select: { id: true, companyTradingName: true, exporterCode: true, tinNumber: true } } },
            });

            return NextResponse.json({ workerRequest: toMongo(updated, { exporter: 'exporterId' }) });
        }

        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch (error) {
        console.error('Update worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const workerRequest = await prisma.workerRequest.findUnique({ where: { id } });
        if (!workerRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (currentUser.role === 'exporter') {
            const dbUser = await prisma.user.findUnique({ where: { id: currentUser.userId } });
            if (!dbUser?.exporterId || workerRequest.exporterId !== dbUser.exporterId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            if (workerRequest.status !== 'pending') {
                return NextResponse.json({ error: 'Only pending requests can be deleted.' }, { status: 400 });
            }
        } else if (currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.workerRequest.delete({ where: { id } });
        return NextResponse.json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Delete worker request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
