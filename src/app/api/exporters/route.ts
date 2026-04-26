import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const where: any = { isActive: true };
        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            where.id = currentUser.exporterId;
        }
        if (currentUser.role === 'admin') {
            const { searchParams } = new URL(request.url);
            if (searchParams.get('all') === 'true') {
                delete where.isActive;
            }
        }

        const exporters = await prisma.exporter.findMany({
            where,
            orderBy: { companyTradingName: 'asc' },
        });

        return NextResponse.json({ exporters: exporters.map(e => ({ ...e, _id: e.id })) });
    } catch (error) {
        console.error('Get exporters error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const exporter = await prisma.exporter.create({ data: body });

        let userCreated = false;
        if (exporter.email) {
            const existingUser = await prisma.user.findUnique({ where: { email: exporter.email.toLowerCase() } });
            if (!existingUser) {
                const tempPassword = crypto.randomBytes(6).toString('hex');
                await prisma.user.create({
                    data: {
                        email: exporter.email.toLowerCase(),
                        password: await hashPassword(tempPassword),
                        name: exporter.contactPerson,
                        phone: exporter.phone,
                        role: 'exporter',
                        exporterId: exporter.id,
                        isActive: true,
                    },
                });
                try {
                    await sendWelcomeEmail(exporter.email, exporter.contactPerson, tempPassword, 'exporter');
                    userCreated = true;
                } catch {
                    userCreated = true;
                }
            }
        }

        return NextResponse.json({
            exporter: { ...exporter, _id: exporter.id },
            userCreated,
            message: userCreated
                ? `Exporter created and login credentials sent to ${exporter.email}`
                : 'Exporter created',
        }, { status: 201 });
    } catch (error) {
        console.error('Create exporter error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
