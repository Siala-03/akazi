import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';
import { toMongo } from '@/lib/serialize';
import { getSettings } from '@/lib/settings';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { qrToken, exporterId } = await request.json();
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
                return NextResponse.json({ error: `${worker.fullName} is already checked in and on-site` }, { status: 409 });
            }
            return NextResponse.json({ error: `${worker.fullName} has already completed attendance for today` }, { status: 409 });
        }

        const facilityId = worker.facilityId ?? null;

        // If exporterId provided: validate and create attendance + session atomically
        if (exporterId) {
            const exporter = await prisma.exporter.findUnique({
                where: { id: exporterId },
                select: { id: true, dailyRate: true },
            });
            if (!exporter) {
                return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
            }

            const { exporterDailyRate: defaultRate } = await getSettings();
            const snapshotRate = exporter.dailyRate ?? defaultRate;

            const { attendance, session } = await prisma.$transaction(async (tx) => {
                const attendance = await tx.attendance.create({
                    data: {
                        workerId: worker.id,
                        facilityId,
                        date: today,
                        checkInTime: today,
                        status: 'on-site',
                        supervisorId: currentUser.userId,
                    },
                    include: { worker: true },
                });

                const session = await tx.session.create({
                    data: {
                        attendanceId: attendance.id,
                        workerId: worker.id,
                        exporterId,
                        facilityId,
                        dailyRate: snapshotRate,
                        date: today,
                        startTime: today,
                        status: 'active',
                        supervisorId: currentUser.userId,
                    },
                    include: { worker: true, exporter: true, facility: true },
                });

                return { attendance, session };
            });

            return NextResponse.json({
                success: true,
                message: `${worker.fullName} checked in via QR`,
                worker: { _id: worker.id, fullName: worker.fullName, workerId: worker.workerId, photo: worker.photo },
                attendance: toMongo(attendance, { worker: 'workerId' }),
                session: toMongo(session, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' }),
            }, { status: 201 });
        }

        // No exporterId: attendance only
        const attendance = await prisma.attendance.create({
            data: {
                workerId: worker.id,
                facilityId,
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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ error: 'Worker already checked in today' }, { status: 409 });
        }
        console.error('QR check-in error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
