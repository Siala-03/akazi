import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (!user.isActive) {
            return NextResponse.json({ error: 'Your account has been deactivated' }, { status: 403 });
        }

        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            exporterId: user.exporterId ?? undefined,
            facilityId: user.facilityId ?? undefined,
        });

        const dashboardUrl =
            user.role === 'supervisor'
                ? '/supervisor/dashboard'
                : user.role === 'admin'
                    ? '/admin/dashboard'
                    : '/exporter/dashboard';

        const response = NextResponse.json({
            success: true,
            redirectUrl: dashboardUrl,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('[Login API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
