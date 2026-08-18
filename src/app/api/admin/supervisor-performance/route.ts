import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
        const d = new Date(startDate);
        d.setHours(0, 0, 0, 0);
        dateFilter.gte = d;
    }
    if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        dateFilter.lte = d;
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const supervisors = await prisma.user.findMany({
        where: { role: { in: ['supervisor', 'admin'] } },
        select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    const [registeredCounts, checkinCounts, firstRegistrations, firstCheckins] = await Promise.all([
        prisma.worker.groupBy({
            by: ['registeredBy'],
            where: { registeredBy: { not: null }, ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
            _count: { id: true },
        }),
        prisma.attendance.groupBy({
            by: ['supervisorId'],
            where: hasDateFilter ? { checkInTime: dateFilter } : {},
            _count: { id: true },
        }),
        prisma.worker.groupBy({
            by: ['registeredBy'],
            where: { registeredBy: { not: null } },
            _min: { createdAt: true },
        }),
        prisma.attendance.groupBy({
            by: ['supervisorId'],
            _min: { checkInTime: true },
        }),
    ]);

    const registeredMap = new Map(registeredCounts.map(r => [r.registeredBy, r._count.id]));
    const checkinMap = new Map(checkinCounts.map(r => [r.supervisorId, r._count.id]));
    const firstRegMap = new Map(firstRegistrations.map(r => [r.registeredBy, r._min.createdAt]));
    const firstCheckinMap = new Map(firstCheckins.map(r => [r.supervisorId, r._min.checkInTime]));

    const performance = supervisors.map(s => {
        const firstReg = firstRegMap.get(s.id) ?? null;
        const firstCheckin = firstCheckinMap.get(s.id) ?? null;
        const dates = [firstReg, firstCheckin].filter(Boolean) as Date[];
        const activeSince = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;

        return {
            supervisorId: s.id,
            name: s.name,
            email: s.email,
            role: s.role,
            isActive: s.isActive,
            workersRegistered: registeredMap.get(s.id) ?? 0,
            checkInsPerformed: checkinMap.get(s.id) ?? 0,
            activeSince,
        };
    }).sort((a, b) => (b.workersRegistered + b.checkInsPerformed) - (a.workersRegistered + a.checkInsPerformed));

    const unregisteredWorkersCount = await prisma.worker.count({ where: { registeredBy: null } });

    return NextResponse.json({
        performance,
        unregisteredWorkersCount,
        note: unregisteredWorkersCount > 0
            ? `${unregisteredWorkersCount} worker(s) were registered before this tracking was added and have no recorded supervisor.`
            : null,
    });
}
