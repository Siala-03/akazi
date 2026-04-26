import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = {};
        if (startDate && endDate) {
            where.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        const [bags, sessions] = await Promise.all([
            prisma.bag.findMany({
                where,
                include: { exporter: true, facility: true, workers: { include: { worker: true } } },
            }),
            prisma.session.findMany({
                where,
                include: { worker: true, exporter: true },
            }),
        ]);

        const workerProductivity: Record<string, any> = {};
        for (const bag of bags) {
            for (const bw of bag.workers) {
                const wid = bw.workerId;
                if (!workerProductivity[wid]) {
                    workerProductivity[wid] = { worker: toMongo(bw.worker), bagsProcessed: 0, totalWeight: 0 };
                }
                workerProductivity[wid].bagsProcessed++;
                workerProductivity[wid].totalWeight += bag.weight / bag.workers.length;
            }
        }

        const completedSessions = sessions.filter(s => s.status === 'closed' && s.endTime);
        const avgSessionDuration =
            completedSessions.length > 0
                ? completedSessions.reduce((sum, s) => sum + (s.endTime!.getTime() - s.startTime.getTime()), 0) /
                  completedSessions.length
                : 0;

        const exporterProductivity: Record<string, any> = {};
        for (const bag of bags) {
            const eid = bag.exporterId;
            if (!exporterProductivity[eid]) {
                exporterProductivity[eid] = { exporter: toMongo(bag.exporter), bagsProcessed: 0, totalWeight: 0 };
            }
            exporterProductivity[eid].bagsProcessed++;
            exporterProductivity[eid].totalWeight += bag.weight;
        }

        const facilityStats: Record<string, any> = {};
        for (const bag of bags) {
            if (!bag.facilityId) continue;
            const fid = bag.facilityId;
            if (!facilityStats[fid]) {
                facilityStats[fid] = { facility: toMongo(bag.facility), bagsProcessed: 0, totalWeight: 0 };
            }
            facilityStats[fid].bagsProcessed++;
            facilityStats[fid].totalWeight += bag.weight;
        }

        return NextResponse.json({
            summary: {
                totalBags: bags.length,
                totalWeight: bags.reduce((sum, b) => sum + b.weight, 0),
                totalSessions: sessions.length,
                activeSessions: sessions.filter(s => s.status === 'active').length,
                avgSessionDurationMinutes: Math.round(avgSessionDuration / 1000 / 60),
            },
            workerProductivity: Object.values(workerProductivity),
            exporterProductivity: Object.values(exporterProductivity),
            facilityStats: Object.values(facilityStats),
        });
    } catch (error) {
        console.error('Productivity report error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
