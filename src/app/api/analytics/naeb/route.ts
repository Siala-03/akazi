import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const DEFAULT_RATE = 2000;

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['naeb', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [
            totalWorkers,
            totalWomen,
            activeWomen,
            totalExporters,
            allSessions,
            exporterRows,
            womenPerExporterRows,
        ] = await Promise.all([
            // All registered workers
            prisma.worker.count(),

            // Total women
            prisma.worker.count({ where: { gender: 'female' } }),

            // Active women
            prisma.worker.count({ where: { gender: 'female', status: 'active' } }),

            // All exporters
            prisma.exporter.count({ where: { isActive: true } }),

            // All completed/checked-out sessions for cost calc
            prisma.session.findMany({
                select: {
                    dailyRate: true,
                    exporter: { select: { dailyRate: true } },
                },
            }),

            // Per-exporter session stats
            prisma.$queryRaw<Array<{
                exporterId: string;
                exporterName: string;
                sessionCount: bigint;
                daysActive: bigint;
                uniqueWorkers: bigint;
            }>>`
                SELECT
                    s."exporterId",
                    e."companyTradingName" AS "exporterName",
                    COUNT(s.id)::bigint AS "sessionCount",
                    COUNT(DISTINCT DATE(s."startTime"))::bigint AS "daysActive",
                    COUNT(DISTINCT s."workerId")::bigint AS "uniqueWorkers"
                FROM "Session" s
                JOIN "Exporter" e ON s."exporterId" = e.id
                GROUP BY s."exporterId", e."companyTradingName"
                ORDER BY COUNT(s.id) DESC
            `,

            // Women per exporter
            prisma.$queryRaw<Array<{ exporterId: string; womenCount: bigint }>>`
                SELECT s."exporterId", COUNT(DISTINCT w.id)::bigint AS "womenCount"
                FROM "Session" s
                JOIN "Worker" w ON s."workerId" = w.id
                WHERE w.gender = 'female'
                GROUP BY s."exporterId"
            `,
        ]);

        // Total wages paid across all sessions
        const totalWagesPaid = allSessions.reduce((sum, s) => {
            return sum + (s.dailyRate ?? s.exporter?.dailyRate ?? DEFAULT_RATE);
        }, 0);

        // Build women-per-exporter map
        const womenMap = new Map<string, number>(
            womenPerExporterRows.map(r => [r.exporterId, Number(r.womenCount)])
        );

        // Cost per exporter via raw query
        const costRows = await prisma.$queryRaw<Array<{
            exporterId: string;
            totalCost: number;
        }>>`
            SELECT
                s."exporterId",
                SUM(COALESCE(s."dailyRate", e."dailyRate", ${DEFAULT_RATE}))::float AS "totalCost"
            FROM "Session" s
            JOIN "Exporter" e ON s."exporterId" = e.id
            GROUP BY s."exporterId"
        `;
        const costMap = new Map<string, number>(
            costRows.map(r => [r.exporterId, Number(r.totalCost)])
        );

        const exporterBreakdown = exporterRows.map(row => ({
            exporterId: row.exporterId,
            exporterName: row.exporterName,
            sessionCount: Number(row.sessionCount),
            daysActive: Number(row.daysActive),
            uniqueWorkers: Number(row.uniqueWorkers),
            womenWorkers: womenMap.get(row.exporterId) ?? 0,
            totalAmountPaid: costMap.get(row.exporterId) ?? 0,
        }));

        const activeExporters = exporterBreakdown.length;
        const totalSessions = exporterBreakdown.reduce((s, e) => s + e.sessionCount, 0);

        return NextResponse.json({
            analytics: {
                totalWorkers,
                totalWomen,
                activeWomen,
                totalExporters,
                activeExporters,
                totalSessions,
                totalWagesPaid: Math.round(totalWagesPaid),
                exporterBreakdown,
            },
        });
    } catch (error) {
        console.error('[NAEB Analytics] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
