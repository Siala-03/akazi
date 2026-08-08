import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exporterId = searchParams.get('exporterId');

    const notes = await prisma.exporterNote.findMany({
        where: exporterId ? { exporterId } : undefined,
        include: { exporter: { select: { companyTradingName: true } }, author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notes: notes.map(n => ({ ...n, _id: n.id })) });
}

export async function POST(request: NextRequest) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { exporterId, message } = await request.json();
    if (!exporterId || !message?.trim()) {
        return NextResponse.json({ error: 'exporterId and message are required' }, { status: 400 });
    }

    const exporter = await prisma.exporter.findUnique({ where: { id: exporterId } });
    if (!exporter) {
        return NextResponse.json({ error: 'Exporter not found' }, { status: 404 });
    }

    const note = await prisma.exporterNote.create({
        data: { exporterId, message: message.trim(), createdBy: currentUser.userId },
    });

    return NextResponse.json({ note: { ...note, _id: note.id } }, { status: 201 });
}
