import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { toMongo } from '@/lib/serialize';

export async function POST() {
    try {
        const existing = await prisma.cooperative.findFirst({
            where: { OR: [{ code: 'UMUCYO' }, { name: { contains: 'umucyo', mode: 'insensitive' } }] },
        });

        if (existing) {
            return NextResponse.json({
                message: 'Umucyo Women Cooperative already exists',
                cooperative: toMongo(existing),
            });
        }

        const cooperative = await prisma.cooperative.create({
            data: {
                name: 'Umucyo Women Cooperative',
                code: 'UMUCYO',
                contactPerson: 'Cooperative Manager',
                phone: '+250788000000',
                isActive: true,
            },
        });

        return NextResponse.json(
            { message: 'Umucyo Women Cooperative created successfully', cooperative: toMongo(cooperative) },
            { status: 201 }
        );
    } catch (error) {
        console.error('[Init Cooperative] Error:', error);
        return NextResponse.json({ error: 'Failed to initialize cooperative' }, { status: 500 });
    }
}
