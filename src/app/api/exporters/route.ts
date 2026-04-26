import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ExporterModel from '@/models/Exporter';
import UserModel from '@/models/User';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import crypto from 'crypto';

// GET - List all exporters
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Exporter users can only see their own data
        let query: any = { isActive: true };
        if (currentUser.role === 'exporter' && currentUser.exporterId) {
            query._id = currentUser.exporterId;
        }
        // Admin with ?all=true sees all exporters including inactive
        if (currentUser.role === 'admin') {
            const { searchParams } = new URL(request.url);
            if (searchParams.get('all') === 'true') {
                query = {};
            }
        }

        const exporters = await ExporterModel.find(query).sort({ companyTradingName: 1 });

        return NextResponse.json({ exporters });
    } catch (error) {
        console.error('Get exporters error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create exporter (Admin only)
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();

        const exporter = await ExporterModel.create(body);

        // Auto-create a user account for the exporter's contact person
        let userCreated = false;
        if (exporter.email) {
            const existingUser = await UserModel.findOne({ email: exporter.email.toLowerCase() });
            if (!existingUser) {
                const tempPassword = crypto.randomBytes(6).toString('hex');
                const hashedPw = await hashPassword(tempPassword);

                await UserModel.create({
                    email: exporter.email.toLowerCase(),
                    password: hashedPw,
                    name: exporter.contactPerson,
                    phone: exporter.phone,
                    role: 'exporter',
                    exporterId: exporter._id,
                    isActive: true,
                });

                // Send welcome email with credentials
                try {
                    await sendWelcomeEmail(exporter.email, exporter.contactPerson, tempPassword, 'exporter');
                    userCreated = true;
                } catch (emailErr) {
                    console.error('[Exporters API] Welcome email failed (non-blocking):', emailErr);
                    userCreated = true; // user was still created
                }
            }
        }

        return NextResponse.json({
            exporter,
            userCreated,
            message: userCreated
                ? `Exporter created and login credentials sent to ${exporter.email}`
                : 'Exporter created',
        }, { status: 201 });
    } catch (error) {
        console.error('Create exporter error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
