import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isSuperSupervisor } from '@/lib/super-supervisor';

// Super supervisor view: everyone currently on site, grouped by exporter.
export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'supervisor' || !(await isSuperSupervisor(currentUser.userId))) {
            return NextResponse.json({ error: 'Super supervisor access required' }, { status: 403 });
        }

        const [exporters, sessions] = await Promise.all([
            prisma.exporter.findMany({
                where: { isActive: true },
                select: { id: true, companyTradingName: true },
                orderBy: { companyTradingName: 'asc' },
            }),
            prisma.session.findMany({
                where: { status: 'active' },
                select: {
                    id: true, exporterId: true, startTime: true,
                    worker: { select: { workerId: true, fullName: true } },
                    attendance: { select: { checkInMethod: true } },
                    supervisor: { select: { name: true } },
                },
                orderBy: { startTime: 'asc' },
            }),
        ]);

        const byExporter = new Map<string, typeof sessions>();
        for (const s of sessions) {
            const list = byExporter.get(s.exporterId) ?? [];
            list.push(s);
            byExporter.set(s.exporterId, list);
        }

        return NextResponse.json({
            asOf: new Date().toISOString(),
            totalOnSite: sessions.length,
            exporters: exporters.map(e => ({
                id: e.id,
                name: e.companyTradingName,
                onSite: (byExporter.get(e.id) ?? []).map(s => ({
                    sessionId: s.id,
                    workerId: s.worker.workerId,
                    workerName: s.worker.fullName,
                    checkInTime: s.startTime.toISOString(),
                    checkInMethod: s.attendance.checkInMethod,
                    checkedInBy: s.supervisor.name,
                })),
            })),
        });
    } catch (error) {
        console.error('[Supervisor Live] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
