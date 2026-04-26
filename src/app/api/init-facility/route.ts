import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { toMongo } from '@/lib/serialize';

export async function POST() {
    try {
        const existing = await prisma.facility.findFirst();

        if (existing) {
            return NextResponse.json({ message: 'Facility already exists', facility: toMongo(existing) });
        }

        const facility = await prisma.facility.create({
            data: { name: 'NAEB Sorting Facility', code: 'NAEB-001', location: 'Kigali, Rwanda', isActive: true },
        });

        return NextResponse.json(
            { message: 'Default facility created successfully', facility: toMongo(facility) },
            { status: 201 }
        );
    } catch (error) {
        console.error('[Init Facility] Error:', error);
        return NextResponse.json({ error: 'Failed to initialize facility' }, { status: 500 });
    }
}
