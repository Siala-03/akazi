import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!currentUser.exporterId) {
            return NextResponse.json({ onSiteCount: 0, qrCount: 0, manualCount: 0, workers: [] });
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const activeSessions = await prisma.session.findMany({
            where: {
                exporterId: currentUser.exporterId,
                status: 'active',
                date: { gte: startOfDay, lte: endOfDay },
            },
            select: {
                id: true,
                startTime: true,
                worker: {
                    select: {
                        id: true,
                        workerId: true,
                        fullName: true,
                        phone: true,
                        photo: true,
                        gender: true,
                    },
                },
                attendance: {
                    select: {
                        checkInTime: true,
                        checkInMethod: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const now = Date.now();
        const workers = activeSessions.map((session) => {
            const checkInTime = session.attendance.checkInTime;
            const durationMinutes = Math.floor((now - checkInTime.getTime()) / 60000);
            const method = session.attendance.checkInMethod ?? 'manual';

            return {
                sessionId: session.id,
                workerId: session.worker.workerId,
                workerName: session.worker.fullName,
                phone: session.worker.phone,
                photo: session.worker.photo,
                gender: session.worker.gender,
                checkInTime: checkInTime.toISOString(),
                durationMinutes,
                checkInMethod: method,
            };
        });

        const qrCount = workers.filter((w) => w.checkInMethod === 'qr').length;
        const manualCount = workers.filter((w) => w.checkInMethod === 'manual').length;

        return NextResponse.json({
            onSiteCount: workers.length,
            qrCount,
            manualCount,
            workers,
            asOf: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[on-site] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
