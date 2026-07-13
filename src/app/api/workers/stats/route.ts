import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { workerDailyWage: SESSION_RATE } = await getSettings();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const gender = searchParams.get('gender');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const week = searchParams.get('week');

        const workerWhere: any = {};
        if (status && status !== 'all') workerWhere.status = status;
        if (gender && gender !== 'all') workerWhere.gender = gender;
        if (search) {
            workerWhere.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { workerId: { contains: search, mode: 'insensitive' } },
            ];
        }

        const enrollmentDateFilter: { gte?: Date; lte?: Date } = {};
        if (week) {
            const [weekStart, weekEnd] = week.split('_');
            if (weekStart) enrollmentDateFilter.gte = new Date(weekStart);
            if (weekEnd) {
                const end = new Date(weekEnd);
                end.setHours(23, 59, 59, 999);
                enrollmentDateFilter.lte = end;
            }
        }
        if (dateFrom) enrollmentDateFilter.gte = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            enrollmentDateFilter.lte = end;
        }
        if (enrollmentDateFilter.gte || enrollmentDateFilter.lte) {
            workerWhere.enrollmentDate = enrollmentDateFilter;
        }

        const filteredWorkers = await prisma.worker.findMany({
            where: workerWhere,
            select: { id: true, status: true, fullName: true },
        });

        const filteredWorkerIds = filteredWorkers.map((w) => w.id);
        const totalActiveWorkers = filteredWorkers.filter((w) => w.status === 'active').length;
        const totalInactiveWorkers = filteredWorkers.filter((w) => w.status !== 'active').length;

        if (filteredWorkerIds.length === 0) {
            return NextResponse.json({
                stats: {
                    totalActiveWorkers: 0,
                    totalInactiveWorkers: 0,
                    totalLaborCosts: 0,
                    avgHoursPerWorker: 0,
                    totalSessions: 0,
                },
            });
        }

        const sessionDateFilter: { gte?: Date; lte?: Date } = {};
        if (week) {
            const [weekStart, weekEnd] = week.split('_');
            if (weekStart) sessionDateFilter.gte = new Date(weekStart);
            if (weekEnd) {
                const end = new Date(weekEnd);
                end.setHours(23, 59, 59, 999);
                sessionDateFilter.lte = end;
            }
        }
        if (dateFrom) sessionDateFilter.gte = new Date(dateFrom);
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            sessionDateFilter.lte = end;
        }

        const sessionWhere: any = {
            workerId: { in: filteredWorkerIds },
            status: { in: ['active', 'closed'] },
        };
        if (sessionDateFilter.gte || sessionDateFilter.lte) {
            sessionWhere.date = sessionDateFilter;
        }

        const allSessions = await prisma.session.findMany({
            where: sessionWhere,
            select: { startTime: true, endTime: true, status: true, workerId: true },
        });

        const totalLaborCosts = allSessions.length * SESSION_RATE;

        let totalHours = 0;
        for (const s of allSessions) {
            if (s.endTime) {
                totalHours += (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
            } else if (s.status === 'active') {
                totalHours += (Date.now() - s.startTime.getTime()) / (1000 * 60 * 60);
            }
        }

        const avgHoursPerWorker = totalActiveWorkers > 0 ? totalHours / totalActiveWorkers : 0;

        const bagWorkerWhere: any = {
            workerId: { in: filteredWorkerIds },
        };
        if (sessionDateFilter.gte || sessionDateFilter.lte) {
            bagWorkerWhere.session = { date: sessionDateFilter };
        }

        const bagWorkers = await prisma.bagWorker.findMany({
            where: bagWorkerWhere,
            select: { workerId: true },
        });

        const bagCountByWorker = new Map<string, number>();
        for (const row of bagWorkers) {
            bagCountByWorker.set(row.workerId, (bagCountByWorker.get(row.workerId) || 0) + 1);
        }

        let topPerformer: { name: string; bagsProcessed: number } | null = null;
        if (bagCountByWorker.size > 0) {
            const [topWorkerId, topCount] = [...bagCountByWorker.entries()].sort((a, b) => b[1] - a[1])[0];
            const topWorker = filteredWorkers.find((w) => w.id === topWorkerId);
            if (topWorker) {
                topPerformer = { name: topWorker.fullName, bagsProcessed: topCount };
            }
        }

        return NextResponse.json({
            stats: {
                totalActiveWorkers,
                totalInactiveWorkers,
                totalLaborCosts,
                avgHoursPerWorker: Math.round(avgHoursPerWorker * 10) / 10,
                totalSessions: allSessions.length,
            },
        });
    } catch (error) {
        console.error('Get worker stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
