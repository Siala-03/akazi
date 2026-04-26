import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';
import { toMongo } from '@/lib/serialize';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { qrToken } = await request.json();
        if (!qrToken) {
            return NextResponse.json({ error: 'QR token is required' }, { status: 400 });
        }

        const worker = await prisma.worker.findUnique({ where: { qrToken } });
        if (!worker) {
            return NextResponse.json({ error: 'Invalid QR code — worker not found' }, { status: 404 });
        }
        if (worker.status !== 'active') {
            return NextResponse.json({ error: `Worker "${worker.fullName}" is not active` }, { status: 400 });
        }

        const today = new Date();
        const existing = await prisma.attendance.findFirst({
            where: { workerId: worker.id, date: { gte: getStartOfDay(today), lte: getEndOfDay(today) } },
        });

        if (existing) {
            if (existing.status === 'on-site') {
                return NextResponse.json({ error: `${worker.fullName} is already checked in and on-site` }, { status: 400 });
            }
            return NextResponse.json({ error: `${worker.fullName} has already completed attendance for today` }, { status: 400 });
        }

        const attendance = await prisma.attendance.create({
            data: {
                workerId: worker.id,
                date: today,
                checkInTime: today,
                status: 'on-site',
                supervisorId: currentUser.userId,
            },
            include: { worker: true },
        });

        return NextResponse.json({
            success: true,
            message: `${worker.fullName} checked in via QR`,
            worker: { _id: worker.id, fullName: worker.fullName, workerId: worker.workerId, photo: worker.photo },
            attendance: toMongo(attendance, { worker: 'workerId' }),
        }, { status: 201 });
    } catch (error) {
        console.error('QR check-in error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
