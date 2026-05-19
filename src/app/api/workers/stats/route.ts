import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workerDailyWage: SESSION_RATE } = await getSettings();

        const [totalActiveWorkers, totalInactiveWorkers] = await Promise.all([
            prisma.worker.count({ where: { status: 'active' } }),
            prisma.worker.count({ where: { status: { not: 'active' } } }),
        ]);

        const allSessions = await prisma.session.findMany({
            where: { status: { in: ['active', 'closed'] } },
            select: { startTime: true, endTime: true, status: true },
        });

        const totalLaborCosts = allSessions.length * SESSION_RATE;

        let totalHours = 0;
        for (const s of allSessions) {
            if (s.endTime) {
                totalHours += (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
            } else if (s.status === 'active') {
                totalHours += (Date.now() - s.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        const avgHoursPerWorker = totalActiveWorkers > 0 ? totalHours / totalActiveWorkers : 0;

        // Top performer: worker with most bag associations
        const topBagCounts = await prisma.bagWorker.groupBy({
            by: ['workerId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 1,
        });

        let topPerformer = null;
        if (topBagCounts.length > 0) {
            const topWorker = await prisma.worker.findUnique({
                where: { id: topBagCounts[0].workerId },
                select: { fullName: true },
            });
            if (topWorker) {
                topPerformer = { name: topWorker.fullName, bagsProcessed: topBagCounts[0]._count.id };
            }
        }

        return NextResponse.json({
            stats: {
                totalActiveWorkers,
                totalInactiveWorkers,
                totalLaborCosts,
                avgHoursPerWorker: Math.round(avgHoursPerWorker * 10) / 10,
                topPerformer,
            },
        });
    } catch (error) {
        console.error('Get worker stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
