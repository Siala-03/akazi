import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPrisma = vi.hoisted(() => ({
    user: { findUnique: vi.fn() },
}));

const mockVerifyPassword = vi.hoisted(() => vi.fn());
const mockGenerateToken = vi.hoisted(() => vi.fn().mockReturnValue('jwt-test-token'));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/auth', () => ({
    verifyPassword: mockVerifyPassword,
    generateToken: mockGenerateToken,
    getCurrentUser: vi.fn(),
    hashPassword: vi.fn().mockResolvedValue('hashed'),
    removeAuthCookie: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

import { POST as LOGIN_POST } from '@/app/api/auth/login/route';
import { POST as LOGOUT_POST } from '@/app/api/auth/logout/route';

const BASE = 'http://localhost';

function post(path: string, body: unknown) {
    return new NextRequest(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const USER_FIXTURE = {
    id: 'user-1',
    email: 'admin@test.com',
    password: 'hashed-password',
    name: 'Admin User',
    role: 'admin' as const,
    isActive: true,
    exporterId: null,
    facilityId: null,
};

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
    it('returns 400 when email is missing', async () => {
        const res = await LOGIN_POST(post('/api/auth/login', { password: 'pass' }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/required/i);
    });

    it('returns 400 when password is missing', async () => {
        const res = await LOGIN_POST(post('/api/auth/login', { email: 'test@test.com' }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/required/i);
    });

    it('returns 401 when user not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const res = await LOGIN_POST(post('/api/auth/login', {
            email: 'nobody@test.com',
            password: 'password123',
        }));
        const data = await res.json();
        expect(res.status).toBe(401);
        expect(data.error).toMatch(/invalid email or password/i);
    });

    it('returns 403 when account is deactivated', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ ...USER_FIXTURE, isActive: false });

        const res = await LOGIN_POST(post('/api/auth/login', {
            email: 'admin@test.com',
            password: 'password123',
        }));
        const data = await res.json();
        expect(res.status).toBe(403);
        expect(data.error).toMatch(/deactivated/i);
    });

    it('returns 401 when password is wrong', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(USER_FIXTURE);
        mockVerifyPassword.mockResolvedValue(false);

        const res = await LOGIN_POST(post('/api/auth/login', {
            email: 'admin@test.com',
            password: 'wrong-password',
        }));
        const data = await res.json();
        expect(res.status).toBe(401);
        expect(data.error).toMatch(/invalid email or password/i);
    });

    it('returns 200 with user info and sets cookie on success', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(USER_FIXTURE);
        mockVerifyPassword.mockResolvedValue(true);

        const res = await LOGIN_POST(post('/api/auth/login', {
            email: 'admin@test.com',
            password: 'correct-password',
        }));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.email).toBe('admin@test.com');
        expect(data.user.role).toBe('admin');
        expect(data.redirectUrl).toBe('/admin/dashboard');
        expect(mockGenerateToken).toHaveBeenCalledOnce();

        // Cookie should be set
        const setCookieHeader = res.headers.get('set-cookie');
        expect(setCookieHeader).toContain('token=jwt-test-token');
    });

    it('redirects supervisor to supervisor dashboard', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ ...USER_FIXTURE, role: 'supervisor' });
        mockVerifyPassword.mockResolvedValue(true);

        const res = await LOGIN_POST(post('/api/auth/login', {
            email: 'sup@test.com',
            password: 'correct-password',
        }));
        const data = await res.json();
        expect(data.redirectUrl).toBe('/supervisor/dashboard');
    });

    it('redirects exporter to exporter dashboard', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ ...USER_FIXTURE, role: 'exporter' });
        mockVerifyPassword.mockResolvedValue(true);

        const res = await LOGIN_POST(post('/api/auth/login', {
            email: 'exp@test.com',
            password: 'correct-password',
        }));
        const data = await res.json();
        expect(data.redirectUrl).toBe('/exporter/dashboard');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/logout', () => {
    it('calls removeAuthCookie and returns success', async () => {
        const { removeAuthCookie } = await import('@/lib/auth');

        const res = await LOGOUT_POST(post('/api/auth/logout', {}));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(removeAuthCookie).toHaveBeenCalledOnce();
    });
});
