import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
    exporter: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/auth', () => ({
    getCurrentUser: mockGetCurrentUser,
    hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}));
vi.mock('@/lib/email', () => ({
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

import { GET, POST } from '@/app/api/exporters/route';
import {
    GET as GET_BY_ID,
    PUT as PUT_BY_ID,
    DELETE as DELETE_BY_ID,
} from '@/app/api/exporters/[id]/route';

const BASE = 'http://localhost';

function get(path: string) { return new NextRequest(`${BASE}${path}`); }
function post(path: string, body: unknown) {
    return new NextRequest(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}
function put(path: string, body: unknown) {
    return new NextRequest(`${BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const ADMIN = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' as const };
const SUPERVISOR = { userId: 'sup-1', email: 'sup@test.com', role: 'supervisor' as const };
const EXPORTER_USER = {
    userId: 'exp-1', email: 'exp@test.com', role: 'exporter' as const, exporterId: 'exporter-db-1',
};

const EXPORTER_FIXTURE = {
    id: 'exporter-db-1',
    exporterCode: 'EXP001',
    companyTradingName: "Pedro's Coffee",
    contactPerson: 'Pedro',
    email: 'pedro@test.com',
    phone: '0788000002',
    isActive: true,
    dailyRate: 2000,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
};

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/exporters', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET(get('/api/exporters'));
        expect(res.status).toBe(401);
    });

    it('returns active exporters for supervisor', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.exporter.findMany.mockResolvedValue([EXPORTER_FIXTURE]);

        const res = await GET(get('/api/exporters'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.exporters).toHaveLength(1);
        expect(data.exporters[0]._id).toBe('exporter-db-1');
    });

    it('scopes exporter-role users to their own exporter', async () => {
        mockGetCurrentUser.mockResolvedValue(EXPORTER_USER);
        mockPrisma.exporter.findMany.mockResolvedValue([EXPORTER_FIXTURE]);

        await GET(get('/api/exporters'));

        expect(mockPrisma.exporter.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ id: 'exporter-db-1' }) })
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/exporters', () => {
    it('returns 401 for non-admin', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await POST(post('/api/exporters', {}));
        expect(res.status).toBe(401);
    });

    it('creates exporter without user account when no email', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.exporter.create.mockResolvedValue({ ...EXPORTER_FIXTURE, email: null });

        const res = await POST(post('/api/exporters', { companyTradingName: "Pedro's Coffee" }));
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.exporter._id).toBe('exporter-db-1');
        expect(data.userCreated).toBe(false);
        expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('creates exporter and user account when email provided', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.exporter.create.mockResolvedValue(EXPORTER_FIXTURE);
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.user.create.mockResolvedValue({ id: 'user-1', email: 'pedro@test.com' });

        const res = await POST(post('/api/exporters', {
            companyTradingName: "Pedro's Coffee",
            email: 'pedro@test.com',
        }));
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.userCreated).toBe(true);
        expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/exporters/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET_BY_ID(get('/api/exporters/exporter-db-1'), {
            params: Promise.resolve({ id: 'exporter-db-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 404 when not found', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.exporter.findUnique.mockResolvedValue(null);

        const res = await GET_BY_ID(get('/api/exporters/bad-id'), {
            params: Promise.resolve({ id: 'bad-id' }),
        });
        expect(res.status).toBe(404);
    });

    it('returns 403 when exporter user accesses wrong exporter', async () => {
        mockGetCurrentUser.mockResolvedValue({ ...EXPORTER_USER, exporterId: 'other-id' });
        mockPrisma.exporter.findUnique.mockResolvedValue(EXPORTER_FIXTURE);

        const res = await GET_BY_ID(get('/api/exporters/exporter-db-1'), {
            params: Promise.resolve({ id: 'exporter-db-1' }),
        });
        expect(res.status).toBe(403);
    });

    it('returns exporter for admin', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.exporter.findUnique.mockResolvedValue(EXPORTER_FIXTURE);

        const res = await GET_BY_ID(get('/api/exporters/exporter-db-1'), {
            params: Promise.resolve({ id: 'exporter-db-1' }),
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.exporter._id).toBe('exporter-db-1');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('PUT /api/exporters/[id]', () => {
    it('returns 401 for non-admin', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await PUT_BY_ID(put('/api/exporters/exporter-db-1', {}), {
            params: Promise.resolve({ id: 'exporter-db-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('updates exporter daily rate and returns 200', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.exporter.update.mockResolvedValue({ ...EXPORTER_FIXTURE, dailyRate: 2500 });

        const res = await PUT_BY_ID(put('/api/exporters/exporter-db-1', { dailyRate: 2500 }), {
            params: Promise.resolve({ id: 'exporter-db-1' }),
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.exporter.dailyRate).toBe(2500);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/exporters/[id]', () => {
    it('returns 401 for non-admin', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await DELETE_BY_ID(get('/api/exporters/exporter-db-1'), {
            params: Promise.resolve({ id: 'exporter-db-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('soft-deletes exporter (sets isActive: false) and returns 200', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.exporter.update.mockResolvedValue({ ...EXPORTER_FIXTURE, isActive: false });

        const res = await DELETE_BY_ID(get('/api/exporters/exporter-db-1'), {
            params: Promise.resolve({ id: 'exporter-db-1' }),
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.message).toMatch(/deactivated/i);
        expect(mockPrisma.exporter.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isActive: false } })
        );
    });
});
