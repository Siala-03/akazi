import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export async function GET(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get('weekStart');
    const exporterIdFilter = searchParams.get('exporterId') || null;

    const weekStart = weekStartParam ? getWeekStart(new Date(weekStartParam)) : getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const { workerDailyWage: WORKER_DAILY_WAGE, exporterDailyRate: DEFAULT_DAILY_RATE } = await getSettings();

    const sessionWhere: any = { date: { gte: weekStart, lte: weekEnd } };
    if (exporterIdFilter) sessionWhere.exporterId = exporterIdFilter;

    const sessions = await prisma.session.findMany({
        where: sessionWhere,
        select: {
            date: true,
            exporterId: true,
            dailyRate: true,
            exporter: { select: { companyTradingName: true, dailyRate: true } },
        },
    });

    // Group by (dateKey, exporterId)
    const cellMap = new Map<string, {
        date: string; exporterId: string; exporterName: string; sessionCount: number; totalCost: number;
    }>();

    for (const s of sessions) {
        const dateKey = s.date.toISOString().slice(0, 10);
        const key = `${dateKey}::${s.exporterId}`;
        const rate = s.dailyRate ?? s.exporter.dailyRate ?? DEFAULT_DAILY_RATE;
        if (!cellMap.has(key)) {
            cellMap.set(key, {
                date: dateKey,
                exporterId: s.exporterId,
                exporterName: s.exporter.companyTradingName,
                sessionCount: 0,
                totalCost: 0,
            });
        }
        const entry = cellMap.get(key)!;
        entry.sessionCount += 1;
        entry.totalCost += rate;
    }

    const rows = Array.from(cellMap.values())
        .map(r => ({
            ...r,
            workerCost: r.sessionCount * WORKER_DAILY_WAGE,
            umucyoMargin: r.totalCost - r.sessionCount * WORKER_DAILY_WAGE,
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.exporterName.localeCompare(b.exporterName));

    // Per-exporter weekly totals (invoice-ready)
    const exporterTotalsMap = new Map<string, { exporterId: string; exporterName: string; sessionCount: number; totalCost: number; workerCost: number; umucyoMargin: number }>();
    for (const r of rows) {
        if (!exporterTotalsMap.has(r.exporterId)) {
            exporterTotalsMap.set(r.exporterId, {
                exporterId: r.exporterId, exporterName: r.exporterName,
                sessionCount: 0, totalCost: 0, workerCost: 0, umucyoMargin: 0,
            });
        }
        const t = exporterTotalsMap.get(r.exporterId)!;
        t.sessionCount += r.sessionCount;
        t.totalCost += r.totalCost;
        t.workerCost += r.workerCost;
        t.umucyoMargin += r.umucyoMargin;
    }
    const exporterTotals = Array.from(exporterTotalsMap.values()).sort((a, b) => b.totalCost - a.totalCost);

    const grandTotal = exporterTotals.reduce((acc, t) => ({
        sessionCount: acc.sessionCount + t.sessionCount,
        totalCost: acc.totalCost + t.totalCost,
        workerCost: acc.workerCost + t.workerCost,
        umucyoMargin: acc.umucyoMargin + t.umucyoMargin,
    }), { sessionCount: 0, totalCost: 0, workerCost: 0, umucyoMargin: 0 });

    return NextResponse.json({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        rows,
        exporterTotals,
        grandTotal,
        rates: { workerDailyWage: WORKER_DAILY_WAGE, defaultExporterRate: DEFAULT_DAILY_RATE },
    });
}
