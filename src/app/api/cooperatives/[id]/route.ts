import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, code, contactPerson, phone } = body;

        if (!name || !code || !contactPerson || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const normalizedCode = String(code).toUpperCase().trim();
        const existing = await prisma.cooperative.findFirst({
            where: {
                code: normalizedCode,
                NOT: { id },
            },
            select: { id: true },
        });

        if (existing) {
            return NextResponse.json({ error: 'Cooperative with this code already exists' }, { status: 409 });
        }

        const cooperative = await prisma.cooperative.update({
            where: { id },
            data: {
                name: String(name).trim(),
                code: normalizedCode,
                contactPerson: String(contactPerson).trim(),
                phone: String(phone).trim(),
            },
        });

        return NextResponse.json({ cooperative: { ...cooperative, _id: cooperative.id } });
    } catch (error) {
        console.error('[Cooperative API] Update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { id } = await params;

        const workersCount = await prisma.worker.count({
            where: { cooperativeId: id },
        });

        if (workersCount > 0) {
            return NextResponse.json(
                { error: 'Cannot delete cooperative with linked workers. Remove or reassign all workers first.' },
                { status: 400 }
            );
        }

        await prisma.cooperative.delete({ where: { id } });

        return NextResponse.json({ message: 'Cooperative deleted successfully' });
    } catch (error) {
        console.error('[Cooperative API] Delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
