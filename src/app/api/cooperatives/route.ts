import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const where = currentUser.role === 'admin' ? {} : { isActive: true };

        const cooperatives = await prisma.cooperative.findMany({
            where,
            select: {
                id: true,
                name: true,
                code: true,
                contactPerson: true,
                phone: true,
                isActive: true,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ cooperatives: cooperatives.map(c => ({ ...c, _id: c.id })) });
    } catch (error) {
        console.error('[Cooperatives API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { name, code, contactPerson, phone } = await request.json();
        if (!name || !code || !contactPerson || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existing = await prisma.cooperative.findUnique({ where: { code: code.toUpperCase() } });
        if (existing) {
            return NextResponse.json({ error: 'Cooperative with this code already exists' }, { status: 409 });
        }

        const cooperative = await prisma.cooperative.create({
            data: { name, code: code.toUpperCase(), contactPerson, phone, isActive: true },
        });

        return NextResponse.json({ cooperative: { ...cooperative, _id: cooperative.id } }, { status: 201 });
    } catch (error) {
        console.error('[Cooperatives API] Create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
