import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateWorkerId } from '@/lib/utils';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { sendQrBadgeEmail } from '@/lib/email';
import { toMongoArray, toMongo } from '@/lib/serialize';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const gender = searchParams.get('gender');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const week = searchParams.get('week');

        const where: any = {};
        if (status && status !== 'all') where.status = status;
        if (gender && gender !== 'all') where.gender = gender;

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
            where.enrollmentDate = enrollmentDateFilter;
        }

        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { workerId: { contains: search, mode: 'insensitive' } },
            ];
        }

        const workers = await prisma.worker.findMany({
            where,
            include: { cooperative: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Calculate weekly sessions for each worker
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const { workerDailyWage: SESSION_RATE } = await getSettings();
        const sessionCounts = await prisma.session.groupBy({
            by: ['workerId'],
            where: {
                workerId: { in: workers.map(w => w.id) },
                date: { gte: weekStart, lt: weekEnd },
            },
            _count: { id: true },
        });
        const sessionCountMap = new Map(sessionCounts.map(s => [s.workerId, s._count.id]));

        const workersWithEarnings = workers.map(w => {
            const weekSessions = sessionCountMap.get(w.id) || 0;
            const serialized = toMongo(w, { cooperative: 'cooperativeId' });
            return { ...serialized, weekSessions, earnings: weekSessions * SESSION_RATE };
        });

        return NextResponse.json({ workers: workersWithEarnings });
    } catch (error) {
        console.error('[Workers API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.cooperativeId) {
            return NextResponse.json({ error: 'Cooperative ID is required' }, { status: 400 });
        }
        if (!body.fullName || !body.phone) {
            return NextResponse.json({ error: 'Missing required fields', details: 'Full name and phone are required' }, { status: 400 });
        }

        const cleanPhone = String(body.phone).replace(/\D/g, '');
        if (!/^07\d{8}$/.test(cleanPhone)) {
            return NextResponse.json({ error: 'Phone must start with 07 and be exactly 10 digits' }, { status: 400 });
        }

        if (!body.workerId || !String(body.workerId).trim()) {
            return NextResponse.json({ error: 'National ID is required' }, { status: 400 });
        }
        const workerId = String(body.workerId).trim();
        if (!/^\d{16}$/.test(workerId)) {
            return NextResponse.json({ error: 'National ID must be exactly 16 numerical digits' }, { status: 400 });
        }
        const existing = await prisma.worker.findUnique({ where: { workerId } });
        if (existing) {
            return NextResponse.json({ error: 'A worker with this National ID is already registered' }, { status: 409 });
        }

        const trimmedDateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim() : body.dateOfBirth;
        let parsedDateOfBirth: Date | undefined;
        if (trimmedDateOfBirth) {
            const dob = new Date(trimmedDateOfBirth);
            if (Number.isNaN(dob.getTime())) {
                return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
            }
            const minDob = new Date();
            minDob.setFullYear(minDob.getFullYear() - 16);
            if (dob > minDob) {
                return NextResponse.json({ error: 'Worker must be at least 16 years old' }, { status: 400 });
            }
            parsedDateOfBirth = dob;
        }

        const normalizedEmail = typeof body.email === 'string' ? body.email.trim() : body.email;
        const normalizedPreviousWorkType = typeof body.previousWorkType === 'string'
            ? body.previousWorkType.trim()
            : body.previousWorkType;

        const { workerId: _wid, facilityId: rawFacility, dateOfBirth: _dob, email: _email, previousWorkType: _pwt, ...rest } = body;
        const facilityId = rawFacility || null;

        const worker = await prisma.worker.create({
            data: {
                ...rest,
                workerId,
                facilityId,
                dateOfBirth: parsedDateOfBirth,
                email: normalizedEmail || undefined,
                previousWorkType: normalizedPreviousWorkType || undefined,
                qrToken: randomUUID(),
                enrollmentDate: new Date(),
                consentTimestamp: new Date(),
            },
            include: { cooperative: true },
        });

        if (worker.email) {
            try {
                const qrDataUrl = await QRCode.toDataURL(`AKAZI:${worker.qrToken}`, {
                    width: 280,
                    margin: 2,
                    color: { dark: '#065f46', light: '#ffffff' },
                    errorCorrectionLevel: 'M',
                });
                await sendQrBadgeEmail(worker.email, worker.fullName, worker.workerId, qrDataUrl);
            } catch (emailErr) {
                console.error('[Workers API] QR email failed (non-blocking):', emailErr);
            }
        }

        return NextResponse.json({ worker: toMongo(worker, { cooperative: 'cooperativeId' }) }, { status: 201 });
    } catch (error) {
        console.error('[Workers API] Create worker error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
