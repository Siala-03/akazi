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
        const workerIdParam = searchParams.get('workerId');

        const where: any = {};
        if (startDate && endDate) {
            where.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }
        if (workerIdParam) where.workerId = workerIdParam;

        const attendance = await prisma.attendance.findMany({
            where,
            include: { worker: true, facility: true },
            orderBy: { date: 'desc' },
        });

        const totalDays = attendance.length;
        const checkedOut = attendance.filter(a => a.status === 'checked-out').length;
        const onSite = attendance.filter(a => a.status === 'on-site').length;

        const workerStats: Record<string, any> = {};
        for (const record of attendance) {
            const wid = record.workerId;
            if (!workerStats[wid]) {
                workerStats[wid] = { worker: toMongo(record.worker), totalDays: 0, checkedOutDays: 0 };
            }
            workerStats[wid].totalDays++;
            if (record.status === 'checked-out') workerStats[wid].checkedOutDays++;
        }

        return NextResponse.json({
            attendance: attendance.map(a => toMongo(a, { worker: 'workerId', facility: 'facilityId' })),
            summary: { totalRecords: totalDays, checkedOut, onSite, uniqueWorkers: Object.keys(workerStats).length },
            workerStats: Object.values(workerStats),
        });
    } catch (error) {
        console.error('Attendance report error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
