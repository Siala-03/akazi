import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'exporter') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { exporterCode } = await request.json();
        if (!exporterCode || typeof exporterCode !== 'string') {
            return NextResponse.json({ error: 'Exporter code is required.' }, { status: 400 });
        }

        const exporter = await prisma.exporter.findUnique({
            where: { exporterCode: exporterCode.trim().toUpperCase() },
        });

        if (!exporter || !exporter.isActive) {
            return NextResponse.json(
                { error: 'No active exporter found with that code. Please double-check and try again.' },
                { status: 404 }
            );
        }

        const alreadyLinked = await prisma.user.findFirst({
            where: { exporterId: exporter.id, id: { not: currentUser.userId } },
        });

        if (alreadyLinked) {
            return NextResponse.json(
                { error: 'This exporter code is already linked to another account. Contact the administrator.' },
                { status: 409 }
            );
        }

        await prisma.user.update({ where: { id: currentUser.userId }, data: { exporterId: exporter.id } });

        return NextResponse.json({
            success: true,
            exporter: { _id: exporter.id, exporterCode: exporter.exporterCode, companyTradingName: exporter.companyTradingName },
        });
    } catch (error) {
        console.error('Link exporter error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
