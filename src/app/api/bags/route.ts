import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateBagNumber } from '@/lib/utils';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { exporterId, workerIds, weight } = await request.json();
        const uniqueWorkerIds: string[] = Array.isArray(workerIds)
            ? [...new Set(workerIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]
            : [];

        if (!exporterId || typeof exporterId !== 'string') {
            return NextResponse.json({ error: 'Exporter is required' }, { status: 400 });
        }

        if (uniqueWorkerIds.length < 2 || uniqueWorkerIds.length > 4) {
            return NextResponse.json({ error: 'Each bag must have between 2 and 4 workers' }, { status: 400 });
        }

        const parsedWeight = Number(weight);
        const safeWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 60;
        const now = new Date();
        const supervisorId = currentUser.userId;

        // Baseline behavior: use Prisma first (as it worked before the bag flow changes).
        let sessions: Array<{ id: string; workerId: string; facilityId: string | null }> = [];
        try {
            sessions = await prisma.session.findMany({
                where: { workerId: { in: uniqueWorkerIds }, exporterId, status: 'active' },
                select: { id: true, workerId: true, facilityId: true },
            });
        } catch (sessionQueryError) {
            console.error('Create bag prisma session query failed, using SQL fallback:', sessionQueryError);

            sessions = await prisma.$queryRaw<Array<{ id: string; workerId: string; facilityId: string | null }>>(
                Prisma.sql`
                    SELECT s.id, s."workerId", s."facilityId"
                    FROM "Session" s
                    WHERE s."workerId" IN (${Prisma.join(uniqueWorkerIds)})
                      AND s."exporterId" = ${exporterId}
                      AND s.status::text = 'active'
                `
            );
        }

        if (sessions.length !== uniqueWorkerIds.length) {
            return NextResponse.json(
                { error: 'All workers must have active sessions with the selected exporter' },
                { status: 400 }
            );
        }

        const facilityId = sessions[0]?.facilityId || null;

        try {
            const bag = await prisma.bag.create({
                data: {
                    bagNumber: generateBagNumber(),
                    exporterId,
                    facilityId,
                    date: now,
                    startedAt: now,
                    weight: safeWeight,
                    status: 'in_progress',
                    supervisorId,
                    workers: {
                        create: sessions.map((s) => ({ workerId: s.workerId, sessionId: s.id })),
                    },
                },
            });

            return NextResponse.json({ bag: { ...bag, _id: bag.id } }, { status: 201 });
        } catch (bagCreateError) {
            console.error('Create bag prisma create failed, using SQL fallback:', bagCreateError);

            const bagId = crypto.randomUUID();
            const bagNumber = generateBagNumber();
            let bagRows: Array<{ id: string; bagNumber: string; exporterId: string; facilityId: string | null; date: Date; weight: number; status: string; supervisorId: string; createdAt: Date; updatedAt: Date }> = [];

            try {
                bagRows = await prisma.$queryRaw<Array<{ id: string; bagNumber: string; exporterId: string; facilityId: string | null; date: Date; weight: number; status: string; supervisorId: string; createdAt: Date; updatedAt: Date }>>(
                    Prisma.sql`
                        INSERT INTO "Bag" (id, "bagNumber", "exporterId", "facilityId", date, weight, status, "supervisorId", "createdAt", "updatedAt")
                        VALUES (
                            ${bagId},
                            ${bagNumber},
                            ${exporterId},
                            ${facilityId},
                            ${now},
                            ${safeWeight},
                            'in_progress',
                            ${supervisorId},
                            ${now},
                            ${now}
                        )
                        RETURNING id, "bagNumber", "exporterId", "facilityId", date, weight, status::text AS status, "supervisorId", "createdAt", "updatedAt"
                    `
                );
            } catch (insertWithStatusError) {
                console.error('Create bag SQL insert with status failed, retrying with DB default:', insertWithStatusError);

                bagRows = await prisma.$queryRaw<Array<{ id: string; bagNumber: string; exporterId: string; facilityId: string | null; date: Date; weight: number; status: string; supervisorId: string; createdAt: Date; updatedAt: Date }>>(
                    Prisma.sql`
                        INSERT INTO "Bag" (id, "bagNumber", "exporterId", "facilityId", date, weight, "supervisorId", "createdAt", "updatedAt")
                        VALUES (
                            ${bagId},
                            ${bagNumber},
                            ${exporterId},
                            ${facilityId},
                            ${now},
                            ${safeWeight},
                            ${supervisorId},
                            ${now},
                            ${now}
                        )
                        RETURNING id, "bagNumber", "exporterId", "facilityId", date, weight, status::text AS status, "supervisorId", "createdAt", "updatedAt"
                    `
                );
            }

            const bag = bagRows[0];
            if (!bag) throw new Error('Failed to create bag');

            for (const session of sessions) {
                const bagWorkerId = crypto.randomUUID();
                await prisma.$executeRaw(
                    Prisma.sql`
                        INSERT INTO "BagWorker" (id, "bagId", "workerId", "sessionId")
                        VALUES (${bagWorkerId}, ${bag.id}, ${session.workerId}, ${session.id})
                    `
                );
            }

            return NextResponse.json({ bag: { ...bag, _id: bag.id } }, { status: 201 });
        }
    } catch (error) {
        console.error('Create bag error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const exporterIdParam = searchParams.get('exporterId');
        const status = searchParams.get('status');

        const where: any = {};

        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            where.exporterId = currentUser.exporterId;
        } else if (exporterIdParam) {
            where.exporterId = exporterIdParam;
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        try {
            const bags = await prisma.bag.findMany({
                where,
                orderBy: { date: 'desc' },
            });

            return NextResponse.json({ bags: bags.map((b) => ({ ...b, _id: b.id })) });
        } catch (queryError) {
            console.error('Get bags prisma query error, using SQL fallback:', queryError);

            const exporterFilter = where.exporterId
                ? Prisma.sql` AND b."exporterId" = ${where.exporterId}`
                : Prisma.empty;
            const statusFilter = where.status
                ? Prisma.sql` AND b.status::text = ${where.status}`
                : Prisma.empty;

            const fallbackRows = await prisma.$queryRaw<Array<{
                id: string;
                bagNumber: string;
                exporterId: string;
                facilityId: string | null;
                date: Date;
                startedAt: Date | null;
                completedAt: Date | null;
                weight: number;
                status: string;
                supervisorId: string;
                createdAt: Date | null;
                updatedAt: Date | null;
            }>>(
                Prisma.sql`
                    SELECT
                        b.id,
                        b."bagNumber",
                        b."exporterId",
                        b."facilityId",
                        b.date,
                        NULL::timestamp AS "startedAt",
                        NULL::timestamp AS "completedAt",
                        b.weight,
                        b.status::text AS status,
                        b."supervisorId",
                        NULL::timestamp AS "createdAt",
                        NULL::timestamp AS "updatedAt"
                    FROM "Bag" b
                    WHERE 1=1
                    ${exporterFilter}
                    ${statusFilter}
                    ORDER BY b.date DESC
                `
            );

            return NextResponse.json({
                bags: fallbackRows.map((row) => ({ ...row, _id: row.id })),
            });
        }
    } catch (error) {
        console.error('Get bags error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
