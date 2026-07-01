import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const sessionsToday = await prisma.session.findMany({
            where: { date: { gte: startOfDay, lte: endOfDay } },
            select: { startTime: true, endTime: true, status: true, exporterId: true },
        });

        let totalHoursToday = 0;
        for (const session of sessionsToday) {
            if (session.endTime) {
                totalHoursToday += (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            } else if (session.status === 'active') {
                totalHoursToday += (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        const exportersServedToday = new Set(sessionsToday.map((s) => s.exporterId).filter(Boolean)).size;

        return NextResponse.json({
            metrics: {
                inProgressBags: 0,
                totalHoursToday: Math.round(totalHoursToday * 10) / 10,
                exportersServedToday,
            },
        });
    } catch (error) {
        console.error('Get operations metrics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
