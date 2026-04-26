import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import { hashPassword, generateToken } from '@/lib/auth';

// GET - Check if initial admin setup is needed
export async function GET() {
    try {
        await dbConnect();
        const adminCount = await UserModel.countDocuments({ role: 'admin' });
        return NextResponse.json({ needsSetup: adminCount === 0 });
    } catch (error) {
        console.error('Setup check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Register (only allowed for first admin setup when no admins exist)
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        // Check if any admin already exists
        const adminCount = await UserModel.countDocuments({ role: 'admin' });
        if (adminCount > 0) {
            return NextResponse.json(
                { error: 'Registration is disabled. Contact your system administrator for an account.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { email, password, name, phone } = body;

        // Validate required fields
        if (!email || !password || !name || !phone) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create admin user (forced role = admin for initial setup)
        const user = await UserModel.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            phone,
            role: 'admin',
            isActive: true,
        });

        // Generate JWT token for auto-login
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        console.log('[Register] Initial admin created:', user.email);

        // Set authentication cookie
        const { cookies } = require('next/headers');
        const cookieStore = await cookies();

        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        const response = NextResponse.json(
            {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    phone: user.phone,
                },
                redirectUrl: '/admin/dashboard',
            },
            { status: 201 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
