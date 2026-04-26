import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        let worker = await prisma.worker.findUnique({
            where: { id },
            select: { id: true, fullName: true, workerId: true, qrToken: true, status: true, photo: true, phone: true },
        });

        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        if (!worker.qrToken) {
            worker = await prisma.worker.update({
                where: { id },
                data: { qrToken: randomUUID() },
                select: { id: true, fullName: true, workerId: true, qrToken: true, status: true, photo: true, phone: true },
            });
        }

        return NextResponse.json({
            qrToken: worker.qrToken,
            workerName: worker.fullName,
            workerId: worker.workerId,
            phone: worker.phone,
            status: worker.status,
            photo: worker.photo,
        });
    } catch (error) {
        console.error('Get QR token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
        }

        const { id } = await params;
        const worker = await prisma.worker.update({
            where: { id },
            data: { qrToken: randomUUID() },
            select: { id: true, fullName: true, workerId: true, qrToken: true },
        });

        return NextResponse.json({ qrToken: worker.qrToken, workerName: worker.fullName, workerId: worker.workerId });
    } catch (error) {
        console.error('Regenerate QR token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
