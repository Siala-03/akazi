import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const workerIdParam = searchParams.get('workerId');
        const exporterIdParam = searchParams.get('exporterId');

        const where: any = {};
        if (startDate && endDate) {
            where.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }
        if (workerIdParam) where.workers = { some: { workerId: workerIdParam } };
        if (exporterIdParam) where.exporterId = exporterIdParam;

        const bags = await prisma.bag.findMany({
            where,
            include: {
                exporter: true,
                facility: true,
                workers: { include: { worker: true } },
            },
            orderBy: { date: 'desc' },
        });

        const sessionsWhere: any = {};
        if (startDate && endDate) {
            sessionsWhere.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }
        if (workerIdParam) sessionsWhere.workerId = workerIdParam;
        if (exporterIdParam) sessionsWhere.exporterId = exporterIdParam;

        const sessions = await prisma.session.findMany({
            where: sessionsWhere,
            include: { worker: true, exporter: true },
            orderBy: { date: 'desc' },
        });

        const { workerDailyWage } = await getSettings();

        const workerEarnings: Record<string, any> = {};
        const exporterStats: Record<string, any> = {};

        for (const bag of bags) {
            for (const bw of bag.workers) {
                const wid = bw.workerId;
                if (!workerEarnings[wid]) {
                    workerEarnings[wid] = { worker: toMongo(bw.worker), bagsContributed: 0, sessionCount: 0, totalEarnings: 0 };
                }
                workerEarnings[wid].bagsContributed++;
            }
        }

        for (const session of sessions) {
            const wid = session.workerId;
            if (!workerEarnings[wid]) {
                workerEarnings[wid] = { worker: toMongo(session.worker), bagsContributed: 0, sessionCount: 0, totalEarnings: 0 };
            }
            workerEarnings[wid].sessionCount++;
            workerEarnings[wid].totalEarnings += workerDailyWage;

            const eid = session.exporterId;
            if (!exporterStats[eid]) {
                exporterStats[eid] = { exporter: toMongo(session.exporter), totalSessions: 0, totalCost: 0 };
            }
            exporterStats[eid].totalSessions++;
            exporterStats[eid].totalCost += workerDailyWage;
        }

        return NextResponse.json({
            bags: bags.map(b => {
                const { workers: bws, exporter, facility, ...rest } = b;
                return {
                    ...rest,
                    _id: rest.id,
                    exporterId: exporter ? toMongo(exporter) : rest.exporterId,
                    facilityId: facility ? toMongo(facility) : rest.facilityId,
                    workers: bws.map(bw => ({ _id: bw.id, workerId: toMongo(bw.worker), sessionId: bw.sessionId })),
                };
            }),
            summary: {
                totalBags: bags.length,
                totalEarnings: sessions.length * workerDailyWage,
                workerDailyWage,
                uniqueWorkers: Object.keys(workerEarnings).length,
                uniqueExporters: Object.keys(exporterStats).length,
            },
            workerEarnings: Object.values(workerEarnings),
            exporterStats: Object.values(exporterStats),
        });
    } catch (error) {
        console.error('Earnings report error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
