import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CooperativeModel from '@/models/Cooperative';
import { getCurrentUser } from '@/lib/auth';

// GET - List all cooperatives
export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const cooperatives = await CooperativeModel.find({ isActive: true })
            .sort({ name: 1 })
            .select('_id name code');

        return NextResponse.json({ cooperatives });
    } catch (error) {
        console.error('[Cooperatives API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create a cooperative (Admin only)
export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        const { name, code, contactPerson, phone } = body;

        if (!name || !code || !contactPerson || !phone) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if cooperative with same code already exists
        const existing = await CooperativeModel.findOne({ code: code.toUpperCase() });
        if (existing) {
            return NextResponse.json(
                { error: 'Cooperative with this code already exists' },
                { status: 409 }
            );
        }

        const cooperative = await CooperativeModel.create({
            name,
            code: code.toUpperCase(),
            contactPerson,
            phone,
            isActive: true,
        });

        return NextResponse.json({ cooperative }, { status: 201 });
    } catch (error) {
        console.error('[Cooperatives API] Create error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
