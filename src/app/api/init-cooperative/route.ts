import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CooperativeModel from '@/models/Cooperative';

// POST - Initialize Umucyo Cooperative if it doesn't exist
export async function POST() {
    try {
        await dbConnect();

        // Check if Umucyo already exists
        const existing = await CooperativeModel.findOne({ 
            $or: [
                { code: 'UMUCYO' },
                { name: /umucyo/i }
            ]
        });

        if (existing) {
            return NextResponse.json({ 
                message: 'Umucyo Women Cooperative already exists',
                cooperative: existing 
            });
        }

        // Create Umucyo Women Cooperative
        const cooperative = await CooperativeModel.create({
            name: 'Umucyo Women Cooperative',
            code: 'UMUCYO',
            contactPerson: 'Cooperative Manager',
            phone: '+250788000000',
            isActive: true,
        });

        return NextResponse.json({ 
            message: 'Umucyo Women Cooperative created successfully',
            cooperative 
        }, { status: 201 });
    } catch (error) {
        console.error('[Init Cooperative] Error:', error);
        return NextResponse.json(
            { error: 'Failed to initialize cooperative' },
            { status: 500 }
        );
    }
}
