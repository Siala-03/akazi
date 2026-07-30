import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['naeb', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const activeSessions = await prisma.session.findMany({
            where: {
                status: 'active',
                date: { gte: startOfDay, lte: endOfDay },
            },
            select: {
                exporterId: true,
                exporter: { select: { companyTradingName: true } },
                attendance: { select: { checkInMethod: true } },
            },
        });

        const exporterMap = new Map<string, { exporterId: string; exporterName: string; count: number }>();
        let qrCount = 0;
        let manualCount = 0;

        for (const session of activeSessions) {
            const method = session.attendance.checkInMethod ?? 'manual';
            if (method === 'qr') qrCount++;
            else manualCount++;

            const existing = exporterMap.get(session.exporterId);
            if (existing) {
                existing.count++;
            } else {
                exporterMap.set(session.exporterId, {
                    exporterId: session.exporterId,
                    exporterName: session.exporter.companyTradingName,
                    count: 1,
                });
            }
        }

        const exporterBreakdown = Array.from(exporterMap.values()).sort((a, b) => b.count - a.count);

        return NextResponse.json({
            onSiteCount: activeSessions.length,
            qrCount,
            manualCount,
            exporterBreakdown,
            asOf: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[naeb on-site] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
