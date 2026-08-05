import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await prisma.settings.findFirst();

        return NextResponse.json({
            supervisorCanEditWorkers: settings?.supervisorCanEditWorkers ?? true,
        });
    } catch (error) {
        console.error('Get features error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
