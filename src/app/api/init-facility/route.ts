import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FacilityModel from '@/models/Facility';

// POST - Initialize default facility if it doesn't exist
export async function POST() {
    try {
        await dbConnect();

        // Check if any facility exists
        const existing = await FacilityModel.findOne();

        if (existing) {
            return NextResponse.json({ 
                message: 'Facility already exists',
                facility: existing 
            });
        }

        // Create default NAEB facility
        const facility = await FacilityModel.create({
            name: 'NAEB Sorting Facility',
            code: 'NAEB-001',
            location: 'Kigali, Rwanda',
            isActive: true,
        });

        return NextResponse.json({ 
            message: 'Default facility created successfully',
            facility 
        }, { status: 201 });
    } catch (error) {
        console.error('[Init Facility] Error:', error);
        return NextResponse.json(
            { error: 'Failed to initialize facility' },
            { status: 500 }
        );
    }
}
