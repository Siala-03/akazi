import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
    session: { findMany: vi.fn() },
    bag: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    bagWorker: {
        findMany: vi.fn(),
        createMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

import { GET, POST } from '@/app/api/bags/route';
import { PATCH } from '@/app/api/bags/[id]/route';

const BASE = 'http://localhost';

function get(path: string) { return new NextRequest(`${BASE}${path}`); }
function post(path: string, body: unknown) {
    return new NextRequest(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}
function patch(path: string, body: unknown) {
    return new NextRequest(`${BASE}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const SUPERVISOR = { userId: 'sup-1', email: 'sup@test.com', role: 'supervisor' as const };

const SESSIONS = [
    { id: 'session-1', workerId: 'worker-1', facilityId: null },
    { id: 'session-2', workerId: 'worker-2', facilityId: null },
];

const BAG_FIXTURE = {
    id: 'bag-1',
    bagNumber: 'BAG-0001',
    exporterId: 'exporter-db-1',
    facilityId: null,
    date: new Date('2025-01-01'),
    startedAt: new Date('2025-01-01T08:00:00'),
    completedAt: null,
    weight: 60,
    status: 'in_progress',
    supervisorId: 'sup-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
};

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/bags', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await POST(post('/api/bags', {}));
        expect(res.status).toBe(401);
    });

    it('returns 401 for exporter role', async () => {
        mockGetCurrentUser.mockResolvedValue({
            userId: 'exp-1', email: 'e@t.com', role: 'exporter' as const, exporterId: 'e1',
        });
        const res = await POST(post('/api/bags', {}));
        expect(res.status).toBe(401);
    });

    it('returns 400 when exporterId is missing', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await POST(post('/api/bags', { workerIds: ['w1', 'w2'] }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/exporter/i);
    });

    it('returns 400 when fewer than 2 workers provided', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await POST(post('/api/bags', {
            exporterId: 'exporter-db-1',
            workerIds: ['worker-1'],
        }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/2 and 4/i);
    });

    it('returns 400 when more than 4 workers provided', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await POST(post('/api/bags', {
            exporterId: 'exporter-db-1',
            workerIds: ['w1', 'w2', 'w3', 'w4', 'w5'],
        }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/2 and 4/i);
    });

    it('returns 400 when workers lack active sessions', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        // Only 1 session found for 2 workers → mismatch
        mockPrisma.session.findMany.mockResolvedValue([SESSIONS[0]]);

        const res = await POST(post('/api/bags', {
            exporterId: 'exporter-db-1',
            workerIds: ['worker-1', 'worker-2'],
            weight: 60,
        }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/active sessions/i);
    });

    it('creates bag when all workers have active sessions', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.session.findMany.mockResolvedValue(SESSIONS);
        mockPrisma.bag.create.mockResolvedValue(BAG_FIXTURE);

        const res = await POST(post('/api/bags', {
            exporterId: 'exporter-db-1',
            workerIds: ['worker-1', 'worker-2'],
            weight: 60,
        }));
        expect(res.status).toBe(201);

        const data = await res.json();
        expect(data.bag._id).toBe('bag-1');
        expect(mockPrisma.bag.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    exporterId: 'exporter-db-1',
                    weight: 60,
                    status: 'in_progress',
                }),
            })
        );
    });

    it('defaults weight to 60 when not provided', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.session.findMany.mockResolvedValue(SESSIONS);
        mockPrisma.bag.create.mockResolvedValue(BAG_FIXTURE);

        await POST(post('/api/bags', {
            exporterId: 'exporter-db-1',
            workerIds: ['worker-1', 'worker-2'],
        }));

        expect(mockPrisma.bag.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ weight: 60 }),
            })
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/bags', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET(get('/api/bags'));
        expect(res.status).toBe(401);
    });

    it('returns bags list', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.bag.findMany.mockResolvedValue([BAG_FIXTURE]);

        const res = await GET(get('/api/bags'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.bags).toHaveLength(1);
        expect(data.bags[0]._id).toBe('bag-1');
    });

    it('scopes bags to exporter user', async () => {
        mockGetCurrentUser.mockResolvedValue({
            userId: 'exp-1', email: 'e@t.com', role: 'exporter' as const, exporterId: 'exporter-db-1',
        });
        mockPrisma.bag.findMany.mockResolvedValue([BAG_FIXTURE]);

        await GET(get('/api/bags'));

        expect(mockPrisma.bag.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ exporterId: 'exporter-db-1' }),
            })
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/bags/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await PATCH(patch('/api/bags/bag-1', { action: 'complete' }), {
            params: Promise.resolve({ id: 'bag-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 404 when bag not found', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.bag.findUnique.mockResolvedValue(null);

        const res = await PATCH(patch('/api/bags/bad-id', { action: 'complete' }), {
            params: Promise.resolve({ id: 'bad-id' }),
        });
        expect(res.status).toBe(404);
    });

    it('returns 400 when completing a non-in_progress bag', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.bag.findUnique.mockResolvedValue({ ...BAG_FIXTURE, status: 'completed' });

        const res = await PATCH(patch('/api/bags/bag-1', { action: 'complete' }), {
            params: Promise.resolve({ id: 'bag-1' }),
        });
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/in.progress/i);
    });

    it('completes an in_progress bag', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.bag.findUnique.mockResolvedValue(BAG_FIXTURE);
        mockPrisma.bag.update.mockResolvedValue({
            ...BAG_FIXTURE,
            status: 'completed',
            completedAt: new Date(),
            exporter: { id: 'exporter-db-1', companyTradingName: "Pedro's Coffee" },
            facility: null,
            workers: [],
        });

        const res = await PATCH(patch('/api/bags/bag-1', { action: 'complete' }), {
            params: Promise.resolve({ id: 'bag-1' }),
        });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.bag.status).toBe('completed');
    });

    it('returns 400 for invalid action', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.bag.findUnique.mockResolvedValue(BAG_FIXTURE);

        const res = await PATCH(patch('/api/bags/bag-1', { action: 'invalid-action' }), {
            params: Promise.resolve({ id: 'bag-1' }),
        });
        expect(res.status).toBe(400);
    });
});
