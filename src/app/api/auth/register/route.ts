import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';

export async function GET() {
    try {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        return NextResponse.json({ needsSetup: adminCount === 0 });
    } catch (error) {
        console.error('Setup check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        if (adminCount > 0) {
            return NextResponse.json(
                { error: 'Registration is disabled. Contact your system administrator for an account.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { email, password, name, phone } = body;

        if (!email || !password || !name || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: { email: email.toLowerCase(), password: hashedPassword, name, phone, role: 'admin', isActive: true },
        });

        const token = generateToken({ userId: user.id, email: user.email, role: user.role });

        const response = NextResponse.json(
            {
                user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
