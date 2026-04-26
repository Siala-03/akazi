import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { email, password } = await request.json();
        console.log('[Login API] Login attempt for email:', email);

        // Validate input
        if (!email || !password) {
            console.log('[Login API] ✗ Missing email or password');
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user
        const user = await UserModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('[Login API] ✗ User not found:', email);
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        console.log('[Login API] User found:', user.email, 'role:', user.role);

        // Check if user is active
        if (!user.isActive) {
            console.log('[Login API] ✗ User account deactivated:', email);
            return NextResponse.json(
                { error: 'Your account has been deactivated' },
                { status: 403 }
            );
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
            console.log('[Login API] ✗ Invalid password for:', email);
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        console.log('[Login API] ✓ Password verified for:', email);

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            exporterId: user.exporterId?.toString(),
            facilityId: user.facilityId?.toString(),
        });

        console.log('[Login API] ✓ JWT token generated for:', email);

        // Determine redirect based on role
        const dashboardUrl =
            user.role === 'supervisor'
                ? '/supervisor/dashboard'
                : user.role === 'admin'
                    ? '/admin/dashboard'
                    : '/exporter/dashboard';

        console.log('[Login API] ✓ Redirecting to:', dashboardUrl);

        // Set authentication cookie using Next.js cookies API
        const { cookies } = require('next/headers');
        const cookieStore = await cookies();

        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        console.log('[Login API] ✓ Cookie set successfully');

        // Create response with cookie header
        const response = NextResponse.json(
            {
                success: true,
                redirectUrl: dashboardUrl,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }
            },
            { status: 200 }
        );

        // Also set cookie via response header for immediate availability
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('[Login API] ✗ Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
