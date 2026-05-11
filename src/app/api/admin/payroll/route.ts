import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);

        // Default to current Mon–Fri week
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

        // Week ends on Sunday (Mon–Sun window for capturing Fri payout)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Get all workers who attended during the week
        const attendanceRows = await prisma.$queryRaw<{ workerId: string; days_count: bigint }[]>`
            SELECT "workerId", COUNT(DISTINCT DATE(date))::bigint AS days_count
            FROM "Attendance"
            WHERE date >= ${weekStart} AND date <= ${weekEnd}
            GROUP BY "workerId"`;

        const { exporterDailyRate: EXPORTER_DAILY_RATE, workerDailyWage: WORKER_DAILY_WAGE } = await getSettings();

        if (attendanceRows.length === 0) {
            return NextResponse.json({
                payroll: [],
                summary: {
                    totalWorkers: 0,
                    totalDays: 0,
                    totalWorkerWages: 0,
                    totalCostToExporters: 0,
                    cooperativeMargin: 0,
                    exporterDailyRate: EXPORTER_DAILY_RATE,
                    workerDailyWage: WORKER_DAILY_WAGE,
                    weekStart: weekStart.toISOString(),
                    weekEnd: weekEnd.toISOString(),
                },
            });
        }

        const workerIds = attendanceRows.map(r => r.workerId);
        const daysMap = new Map(attendanceRows.map(r => [r.workerId, Number(r.days_count)]));

        // Bags per worker in the week
        const bagRows = await prisma.$queryRaw<{ workerId: string; bag_count: bigint }[]>`
            SELECT bw."workerId", COUNT(*)::bigint AS bag_count
            FROM "BagWorker" bw
            INNER JOIN "Bag" b ON b.id = bw."bagId"
            WHERE b.date >= ${weekStart} AND b.date <= ${weekEnd}
            GROUP BY bw."workerId"`;

        const bagsMap = new Map(bagRows.map(r => [r.workerId, Number(r.bag_count)]));

        // Worker details — workerId field contains the national ID (entered at onboarding)
        const workers = await prisma.worker.findMany({
            where: { id: { in: workerIds } },
            select: { id: true, fullName: true, workerId: true },
            orderBy: { fullName: 'asc' },
        });

        const payroll = workers.map(w => {
            const days = daysMap.get(w.id) ?? 0;
            const bags = bagsMap.get(w.id) ?? 0;
            const totalWage = days * WORKER_DAILY_WAGE;
            const exporterCharge = days * EXPORTER_DAILY_RATE;
            return {
                workerId: w.workerId,
                fullName: w.fullName,
                nationalId: w.workerId, // workerId holds the national ID entered at onboarding
                numberOfBags: bags,
                numberOfDays: days,
                dailyRate: WORKER_DAILY_WAGE,
                totalWage,
                exporterCharge,
            };
        });

        // Sort by fullName
        payroll.sort((a, b) => a.fullName.localeCompare(b.fullName));

        const totalDays = payroll.reduce((s, w) => s + w.numberOfDays, 0);
        const totalWorkerWages = totalDays * WORKER_DAILY_WAGE;
        const totalCostToExporters = totalDays * EXPORTER_DAILY_RATE;
        const cooperativeMargin = totalCostToExporters - totalWorkerWages;

        return NextResponse.json({
            payroll,
            summary: {
                totalWorkers: payroll.length,
                totalDays,
                totalWorkerWages,
                totalCostToExporters,
                cooperativeMargin,
                exporterDailyRate: EXPORTER_DAILY_RATE,
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
