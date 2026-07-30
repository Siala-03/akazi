import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        const [
            totalWorkers,
            attendanceCheckedInToday,
            workersCheckedOutToday,
            activeSessions,
            sessionsToday,
        ] = await Promise.all([
            prisma.worker.count(),
            prisma.attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: 'on-site' } }),
            prisma.attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: 'checked-out' } }),
            prisma.session.count({ where: { status: 'active' } }),
            prisma.session.findMany({
                where: { date: { gte: startOfDay, lte: endOfDay } },
                select: { startTime: true, endTime: true, status: true, exporterId: true, workerId: true },
            }),
        ]);

        let totalHoursWorked = 0;
        for (const session of sessionsToday) {
            if (session.endTime) {
                totalHoursWorked += (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            } else if (session.status === 'active') {
                totalHoursWorked += (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        const uniqueWorkersInSessionsToday = new Set(sessionsToday.map(s => s.workerId).filter(Boolean)).size;
        const workersCheckedInToday = attendanceCheckedInToday > 0
            ? attendanceCheckedInToday
            : uniqueWorkersInSessionsToday;

        const uniqueExporterIds = [...new Set(sessionsToday.map(s => s.exporterId).filter(Boolean))];
        const exportersServedToday = uniqueExporterIds.length;

        const trendStart = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

        const [attTrend] = await Promise.all([
            prisma.$queryRaw<{ day: string; count: bigint }[]>`
                SELECT TO_CHAR(date, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
                FROM "Attendance"
                WHERE date >= ${trendStart} AND date <= ${endOfDay}
                GROUP BY day`,
        ]);

        const attMap = new Map(attTrend.map(d => [d.day, Number(d.count)]));

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                workers: attMap.get(dateStr) || 0,
            });
        }

        return NextResponse.json({
            analytics: {
                totalWorkers,
                workersCheckedInToday,
                workersCheckedOutToday,
                activeSessions,
                totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
                exportersServedToday,
                trends: { attendance: trendData },
            },
        });
    } catch (error) {
        console.error('Get supervisor analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
