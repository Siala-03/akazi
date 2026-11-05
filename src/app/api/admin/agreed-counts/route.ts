import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Agreed session totals per exporter per day (see AgreedSessionCount in schema.prisma).
// Dates are plain calendar days, passed and returned as YYYY-MM-DD.

function parseDay(value: unknown): Date | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = parseDay(searchParams.get('from'));
    const to = parseDay(searchParams.get('to'));
    const where: Prisma.AgreedSessionCountWhereInput = {};
    if (from || to) where.date = { ...(from && { gte: from }), ...(to && { lte: to }) };

    const counts = await prisma.agreedSessionCount.findMany({ where, orderBy: [{ date: 'asc' }] });
    return NextResponse.json({
        agreedCounts: counts.map(c => ({ ...c, date: c.date.toISOString().slice(0, 10) })),
    });
}

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { exporterId, date, agreedCount, note } = await request.json();
        const day = parseDay(date);
        if (!exporterId || !day) {
            return NextResponse.json({ error: 'exporterId and date (YYYY-MM-DD) are required' }, { status: 400 });
        }
        if (!Number.isInteger(agreedCount) || agreedCount < 0) {
            return NextResponse.json({ error: 'agreedCount must be a whole number of 0 or more' }, { status: 400 });
        }
        const exporter = await prisma.exporter.findUnique({ where: { id: exporterId }, select: { id: true } });
        if (!exporter) {
            return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
        }

        const cleanNote = typeof note === 'string' && note.trim() ? note.trim() : null;
        const saved = await prisma.agreedSessionCount.upsert({
            where: { exporterId_date: { exporterId, date: day } },
            create: { exporterId, date: day, agreedCount, note: cleanNote, setBy: currentUser.userId },
            update: { agreedCount, note: cleanNote, setBy: currentUser.userId },
        });

        return NextResponse.json({ agreedCount: { ...saved, date: saved.date.toISOString().slice(0, 10) } });
    } catch (error) {
        console.error('[Agreed Counts] Save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { exporterId, date } = await request.json();
        const day = parseDay(date);
        if (!exporterId || !day) {
            return NextResponse.json({ error: 'exporterId and date (YYYY-MM-DD) are required' }, { status: 400 });
        }

        await prisma.agreedSessionCount.deleteMany({ where: { exporterId, date: day } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Agreed Counts] Delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
