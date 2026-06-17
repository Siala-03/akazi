import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';
import { getSettings } from '@/lib/settings';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { attendanceId, exporterId } = await request.json();

        const attendance = await prisma.attendance.findUnique({ where: { id: attendanceId } });
        if (!attendance) {
            return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
        }
        if (attendance.status !== 'on-site') {
            return NextResponse.json({ error: 'Worker must be checked in and on-site' }, { status: 400 });
        }

        const activeSession = await prisma.session.findFirst({
            where: { workerId: attendance.workerId, status: 'active' },
        });
        if (activeSession) {
            return NextResponse.json(
                { error: 'Worker already has an active session. Close existing session before reassigning.' },
                { status: 400 }
            );
        }

        const exporter = await prisma.exporter.findUnique({ where: { id: exporterId }, select: { dailyRate: true } });
        const { exporterDailyRate: defaultRate } = await getSettings();
        const snapshotRate = (exporter as any)?.dailyRate ?? defaultRate;

        const session = await prisma.session.create({
            data: {
                attendanceId,
                workerId: attendance.workerId,
                exporterId,
                facilityId: attendance.facilityId || null,
                dailyRate: snapshotRate,
                date: attendance.date,
                startTime: new Date(),
                status: 'active',
                supervisorId: currentUser.userId,
            },
            include: { worker: true, exporter: true, facility: true },
        });

        return NextResponse.json({
            session: toMongo(session, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' }),
        }, { status: 201 });
    } catch (error) {
        console.error('[Session API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const includeAll = searchParams.get('all') === 'true' && currentUser.role === 'admin';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = includeAll ? {} : { status: 'active' };

        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            where.exporterId = currentUser.exporterId;
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                const inclusiveEndDate = new Date(endDate);
                inclusiveEndDate.setHours(23, 59, 59, 999);
                where.date.lte = inclusiveEndDate;
            }
        }

        const sessions = await prisma.session.findMany({
            where,
            include: { worker: true, exporter: true, facility: true },
            orderBy: { startTime: 'desc' },
        });

        return NextResponse.json({
            sessions: sessions.map(s => toMongo(s, { worker: 'workerId', exporter: 'exporterId', facility: 'facilityId' })),
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
