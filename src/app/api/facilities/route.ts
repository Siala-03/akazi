import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FacilityModel from '@/models/Facility';
import { getCurrentUser } from '@/lib/auth';

// GET - List all facilities
export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const facilities = await FacilityModel.find({ isActive: true })
            .sort({ name: 1 })
            .select('_id name code location');

        return NextResponse.json({ facilities });
    } catch (error) {
        console.error('[Facilities API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
