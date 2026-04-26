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

        const [bagsToday, sessionsToday, uniqueExporterIds] = await Promise.all([
            prisma.bag.findMany({
                where: { date: { gte: startOfDay, lte: endOfDay } },
                select: { workers: { select: { id: true } } },
            }),
            prisma.session.findMany({
                where: { date: { gte: startOfDay, lte: endOfDay } },
                select: { startTime: true, endTime: true, status: true },
            }),
            prisma.bag.findMany({
                where: { date: { gte: startOfDay, lte: endOfDay } },
                select: { exporterId: true },
                distinct: ['exporterId'],
            }),
        ]);

        const totalKilogramsToday = bagsToday.length * 60;

        let avgWorkersPerBag = 0;
        if (bagsToday.length > 0) {
            const totalWorkersAcrossBags = bagsToday.reduce((sum, bag) => sum + (bag.workers?.length || 0), 0);
            avgWorkersPerBag = totalWorkersAcrossBags / bagsToday.length;
        }

        let totalHoursToday = 0;
        for (const session of sessionsToday) {
            if (session.endTime) {
                totalHoursToday += (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            } else if (session.status === 'active') {
                totalHoursToday += (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        return NextResponse.json({
            metrics: {
                bagsToday: bagsToday.length,
                totalKilogramsToday,
                avgWorkersPerBag: Math.round(avgWorkersPerBag * 10) / 10,
                totalHoursToday: Math.round(totalHoursToday * 10) / 10,
                exportersServedToday: uniqueExporterIds.length,
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
