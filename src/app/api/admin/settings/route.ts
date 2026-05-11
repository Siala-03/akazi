import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { invalidateSettingsCache } from '@/lib/settings';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let settings = await prisma.settings.findFirst();
        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: 'singleton', exporterDailyRate: 2000, workerDailyWage: 1700 },
            });
        }

        return NextResponse.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { exporterDailyRate, workerDailyWage } = body;

        if (
            typeof exporterDailyRate !== 'number' ||
            typeof workerDailyWage !== 'number' ||
            exporterDailyRate < 0 ||
            workerDailyWage < 0 ||
            workerDailyWage > exporterDailyRate
        ) {
            return NextResponse.json(
                { error: 'Invalid rates: worker wage cannot exceed exporter rate and both must be non-negative' },
                { status: 400 }
            );
        }

        const settings = await prisma.settings.upsert({
            where: { id: 'singleton' },
            update: { exporterDailyRate, workerDailyWage },
            create: { id: 'singleton', exporterDailyRate, workerDailyWage },
        });

        invalidateSettingsCache();

        return NextResponse.json({ settings });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
