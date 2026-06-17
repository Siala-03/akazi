import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const exporterIdFilter = searchParams.get('exporterId') || null;

        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        let weekStart: Date;
        const weekStartParam = searchParams.get('weekStart');
        if (weekStartParam) {
            weekStart = new Date(weekStartParam);
            weekStart.setHours(0, 0, 0, 0);
        } else {
            weekStart = new Date(today);
            weekStart.setDate(today.getDate() - daysFromMonday);
            weekStart.setHours(0, 0, 0, 0);
        }

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const { workerDailyWage: WORKER_DAILY_WAGE, exporterDailyRate: DEFAULT_DAILY_RATE } = await getSettings();

        // Load all exporters for rate lookup
        const allExporters = await prisma.exporter.findMany({
            select: { id: true, companyTradingName: true, exporterCode: true, dailyRate: true },
        });
        const exporterMap = new Map(allExporters.map(e => [e.id, e]));

        // Session-based: group by worker + exporter for the period
        const sessionWhere: any = {
            date: { gte: weekStart, lte: weekEnd },
        };
        if (exporterIdFilter) {
            sessionWhere.exporterId = exporterIdFilter;
        }

        const sessions = await prisma.session.findMany({
            where: sessionWhere,
            select: {
                workerId: true,
                exporterId: true,
                dailyRate: true,
                date: true,
            },
        });

        if (sessions.length === 0) {
            return NextResponse.json({
                payroll: [],
                summary: {
                    totalWorkers: 0,
                    totalDays: 0,
                    totalWorkerWages: 0,
                    totalCostToExporters: 0,
                    cooperativeMargin: 0,
                    workerDailyWage: WORKER_DAILY_WAGE,
                    weekStart: weekStart.toISOString(),
                    weekEnd: weekEnd.toISOString(),
                },
            });
        }

        // Count distinct days per worker-exporter pair, summing snapshotted rates
        const workerExporterDays = new Map<string, { workerId: string; exporterId: string; dates: Set<string>; totalRate: number }>();
        for (const s of sessions) {
            const key = `${s.workerId}::${s.exporterId}`;
            if (!workerExporterDays.has(key)) {
                workerExporterDays.set(key, { workerId: s.workerId, exporterId: s.exporterId, dates: new Set(), totalRate: 0 });
            }
            const entry = workerExporterDays.get(key)!;
            const dateKey = s.date.toISOString().split('T')[0];
            if (!entry.dates.has(dateKey)) {
                entry.dates.add(dateKey);
                const exporter = exporterMap.get(s.exporterId);
                entry.totalRate += (s as any).dailyRate ?? (exporter as any)?.dailyRate ?? DEFAULT_DAILY_RATE;
            }
        }

        // Bags per worker in the period
        const bagWhere: any = {
            date: { gte: weekStart, lte: weekEnd },
        };
        if (exporterIdFilter) {
            bagWhere.exporterId = exporterIdFilter;
        }
        const bagRows = exporterIdFilter
            ? await prisma.$queryRaw<{ workerId: string; bag_count: bigint }[]>`
                SELECT bw."workerId", COUNT(*)::bigint AS bag_count
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b.date >= ${weekStart} AND b.date <= ${weekEnd}
                  AND b."exporterId" = ${exporterIdFilter}
                GROUP BY bw."workerId"`
            : await prisma.$queryRaw<{ workerId: string; bag_count: bigint }[]>`
                SELECT bw."workerId", COUNT(*)::bigint AS bag_count
                FROM "BagWorker" bw
                INNER JOIN "Bag" b ON b.id = bw."bagId"
                WHERE b.date >= ${weekStart} AND b.date <= ${weekEnd}
                GROUP BY bw."workerId"`;

        const bagsMap = new Map(bagRows.map(r => [r.workerId, Number(r.bag_count)]));

        const workerIds = [...new Set([...workerExporterDays.values()].map(v => v.workerId))];
        const workers = await prisma.worker.findMany({
            where: { id: { in: workerIds } },
            select: { id: true, fullName: true, workerId: true, phone: true },
        });
        const workerMap = new Map(workers.map(w => [w.id, w]));

        const payroll: any[] = [];
        let totalDays = 0;
        let totalWorkerWages = 0;
        let totalCostToExporters = 0;

        for (const [, entry] of workerExporterDays) {
            const worker = workerMap.get(entry.workerId);
            if (!worker) continue;
            const exporter = exporterMap.get(entry.exporterId);
            const days = entry.dates.size;
            const totalWage = days * WORKER_DAILY_WAGE;
            const exporterCharge = entry.totalRate;

            totalDays += days;
            totalWorkerWages += totalWage;
            totalCostToExporters += exporterCharge;

            payroll.push({
                workerId: worker.workerId,
                fullName: worker.fullName,
                phone: worker.phone,
                nationalId: worker.workerId,
                exporterName: exporter?.companyTradingName || 'Unknown',
                exporterCode: exporter?.exporterCode || '',
                numberOfBags: bagsMap.get(entry.workerId) ?? 0,
                numberOfDays: days,
                dailyRate: WORKER_DAILY_WAGE,
                totalWage,
                exporterCharge,
            });
        }

        payroll.sort((a, b) => a.exporterName.localeCompare(b.exporterName) || a.fullName.localeCompare(b.fullName));

        const cooperativeMargin = totalCostToExporters - totalWorkerWages;

        return NextResponse.json({
            payroll,
            summary: {
                totalWorkers: payroll.length,
                totalDays,
                totalWorkerWages,
                totalCostToExporters,
                cooperativeMargin,
                workerDailyWage: WORKER_DAILY_WAGE,
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString(),
            },
        });
    } catch (error) {
        console.error('Get payroll error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
