import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'exporter' || !currentUser.exporterId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const note = await prisma.exporterNote.findUnique({ where: { id } });
    if (!note || note.exporterId !== currentUser.exporterId) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const { isRead } = await request.json();
    const updated = await prisma.exporterNote.update({
        where: { id },
        data: { isRead: typeof isRead === 'boolean' ? isRead : true },
    });

    return NextResponse.json({ note: { ...updated, _id: updated.id } });
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.exporterNote.delete({ where: { id } });

    return NextResponse.json({ message: 'Note deleted' });
}
