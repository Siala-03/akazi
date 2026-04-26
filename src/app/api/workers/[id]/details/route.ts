import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfMonth, getEndOfMonth } from '@/lib/utils';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: workerId } = await params;
        const DEFAULT_HOURLY_RATE = 50;

        const workerSessions = await prisma.session.findMany({
            where: { workerId },
            select: { startTime: true, endTime: true, status: true },
        });

        let totalHours = 0;
        for (const s of workerSessions) {
            if (s.endTime) {
                totalHours += (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
            } else if (s.status === 'active') {
                totalHours += (Date.now() - s.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        const totalBags = await prisma.bagWorker.count({ where: { workerId } });
        const earnings = totalHours * DEFAULT_HOURLY_RATE;

        const today = new Date();
        const daysWorkedThisMonth = await prisma.attendance.count({
            where: {
                workerId,
                date: { gte: getStartOfMonth(today), lte: getEndOfMonth(today) },
            },
        });

        return NextResponse.json({
            details: {
                totalHours: Math.round(totalHours * 10) / 10,
                totalBags,
                earnings: Math.round(earnings * 100) / 100,
                daysWorkedThisMonth,
            },
        });
    } catch (error) {
        console.error('Get worker details error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
