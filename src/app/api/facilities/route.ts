import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const facilities = await prisma.facility.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true, location: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ facilities: facilities.map(f => ({ ...f, _id: f.id })) });
    } catch (error) {
        console.error('[Facilities API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
