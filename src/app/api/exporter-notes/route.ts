import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'exporter' || !currentUser.exporterId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notes = await prisma.exporterNote.findMany({
        where: { exporterId: currentUser.exporterId },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notes: notes.map(n => ({ ...n, _id: n.id })) });
}
