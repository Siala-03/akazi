import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

// In-memory rate limiter: 5 failed attempts per IP per 15 minutes
const failMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
    );
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = failMap.get(ip);
    if (!entry || now > entry.resetAt) return false;
    return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
    const now = Date.now();
    const entry = failMap.get(ip);
    if (!entry || now > entry.resetAt) {
        failMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    } else {
        entry.count += 1;
    }
}

function clearFailures(ip: string): void {
    failMap.delete(ip);
}

export async function POST(request: NextRequest) {
    try {
        const ip = getIp(request);

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many failed login attempts. Please try again in 15 minutes.' },
                { status: 429 }
            );
        }

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            recordFailure(ip);
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (!user.isActive) {
            return NextResponse.json({ error: 'Your account has been deactivated' }, { status: 403 });
        }

        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
            recordFailure(ip);
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        clearFailures(ip);

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
                    : user.role === 'naeb'
                        ? '/naeb/dashboard'
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
