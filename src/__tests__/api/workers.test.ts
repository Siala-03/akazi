import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
const mockGetCurrentUser = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
    worker: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    session: { groupBy: vi.fn() },
    attendance: { count: vi.fn() },
    earnings: { count: vi.fn() },
    bagWorker: { count: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('@/lib/settings', () => ({
    getSettings: vi.fn().mockResolvedValue({ exporterDailyRate: 2000, workerDailyWage: 1700 }),
}));
vi.mock('@/lib/email', () => ({
    sendQrBadgeEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('qrcode', () => ({
    default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test') },
}));
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

// ── Route imports (after mocks) ────────────────────────────────────────────────
import { GET, POST } from '@/app/api/workers/route';
import {
    GET as GET_BY_ID,
    PUT as PUT_BY_ID,
    DELETE as DELETE_BY_ID,
} from '@/app/api/workers/[id]/route';

// ── Helpers ────────────────────────────────────────────────────────────────────
const BASE = 'http://localhost';

function get(path: string) {
    return new NextRequest(`${BASE}${path}`);
}

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

const WORKER_FIXTURE = {
    id: 'worker-db-1',
    workerId: 'W001',
    fullName: 'Jane Mukamana',
    phone: '0788000001',
    gender: 'female',
    status: 'active',
    cooperative: { id: 'coop-1', name: 'Umucyo' },
    cooperativeId: 'coop-1',
    createdAt: new Date('2025-01-01'),
    enrollmentDate: new Date('2025-01-01'),
    consentTimestamp: new Date('2025-01-01'),
    email: null,
    dateOfBirth: null,
    facilityId: null,
    qrToken: 'qr-token-1',
    previousWorkType: null,
};

beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.session.groupBy.mockResolvedValue([]);
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/workers', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET(get('/api/workers'));
        expect(res.status).toBe(401);
    });

    it('returns workers list with earnings for authenticated user', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.worker.findMany.mockResolvedValue([WORKER_FIXTURE]);
        mockPrisma.session.groupBy.mockResolvedValue([
            { workerId: 'worker-db-1', _count: { id: 3 } },
        ]);

        const res = await GET(get('/api/workers'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.workers).toHaveLength(1);
        expect(data.workers[0].fullName).toBe('Jane Mukamana');
        expect(data.workers[0].weekSessions).toBe(3);
        expect(data.workers[0].earnings).toBe(3 * 1700);
    });

    it('filters by status query param', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findMany.mockResolvedValue([]);

        await GET(get('/api/workers?status=active'));

        expect(mockPrisma.worker.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) })
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/workers', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await POST(post('/api/workers', {}));
        expect(res.status).toBe(401);
    });

    it('returns 401 for exporter role', async () => {
        mockGetCurrentUser.mockResolvedValue({
            userId: 'exp-1', email: 'exp@test.com', role: 'exporter' as const, exporterId: 'e1',
        });
        const res = await POST(post('/api/workers', {}));
        expect(res.status).toBe(401);
    });

    it('returns 400 when cooperativeId is missing', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await POST(post('/api/workers', { fullName: 'Test', phone: '0788000001' }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/cooperative/i);
    });

    it('returns 400 when fullName or phone is missing', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await POST(post('/api/workers', { cooperativeId: 'coop-1' }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/missing required/i);
    });

    it('returns 409 when workerId already exists', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findUnique.mockResolvedValue(WORKER_FIXTURE);

        const res = await POST(post('/api/workers', {
            cooperativeId: 'coop-1',
            fullName: 'Test',
            phone: '0788000001',
            workerId: 'W001',
        }));
        expect(res.status).toBe(409);
    });

    it('creates worker and returns 201', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findUnique.mockResolvedValue(null);
        mockPrisma.worker.create.mockResolvedValue({ ...WORKER_FIXTURE, email: null });

        const res = await POST(post('/api/workers', {
            cooperativeId: 'coop-1',
            fullName: 'Jane Mukamana',
            phone: '0788000001',
        }));

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.worker._id).toBe('worker-db-1');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/workers/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET_BY_ID(get('/api/workers/worker-db-1'), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 404 when worker not found', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.worker.findUnique.mockResolvedValue(null);

        const res = await GET_BY_ID(get('/api/workers/bad-id'), {
            params: Promise.resolve({ id: 'bad-id' }),
        });
        expect(res.status).toBe(404);
    });

    it('returns worker when found', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.worker.findUnique.mockResolvedValue(WORKER_FIXTURE);

        const res = await GET_BY_ID(get('/api/workers/worker-db-1'), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.worker._id).toBe('worker-db-1');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('PUT /api/workers/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await PUT_BY_ID(put('/api/workers/worker-db-1', {}), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 401 for exporter role', async () => {
        mockGetCurrentUser.mockResolvedValue({
            userId: 'exp-1', email: 'e@t.com', role: 'exporter' as const, exporterId: 'e1',
        });
        const res = await PUT_BY_ID(put('/api/workers/worker-db-1', {}), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('updates worker and returns 200', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.update.mockResolvedValue({ ...WORKER_FIXTURE, fullName: 'Updated Name' });

        const res = await PUT_BY_ID(put('/api/workers/worker-db-1', { fullName: 'Updated Name' }), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data.worker.fullName).toBe('Updated Name');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/workers/[id]', () => {
    it('returns 401 for non-admin', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        const res = await DELETE_BY_ID(get('/api/workers/worker-db-1'), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        expect(res.status).toBe(401);
    });

    it('returns 400 when worker has operational records', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.attendance.count.mockResolvedValue(2);
        mockPrisma.session.groupBy.mockResolvedValue([]);
        // reuse session count via a different mock shape
        vi.mocked(mockPrisma as any).session = {
            ...mockPrisma.session,
            count: vi.fn().mockResolvedValue(1),
        };
        mockPrisma.earnings.count.mockResolvedValue(0);
        mockPrisma.bagWorker.count.mockResolvedValue(0);

        const res = await DELETE_BY_ID(get('/api/workers/worker-db-1'), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        expect(res.status).toBe(400);
    });

    it('deletes worker with no dependencies and returns 200', async () => {
        mockGetCurrentUser.mockResolvedValue(ADMIN);
        mockPrisma.attendance.count.mockResolvedValue(0);
        (mockPrisma as any).session.count = vi.fn().mockResolvedValue(0);
        mockPrisma.earnings.count.mockResolvedValue(0);
        mockPrisma.bagWorker.count.mockResolvedValue(0);
        mockPrisma.worker.delete.mockResolvedValue(WORKER_FIXTURE);

        const res = await DELETE_BY_ID(get('/api/workers/worker-db-1'), {
            params: Promise.resolve({ id: 'worker-db-1' }),
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.message).toMatch(/deleted/i);
    });
});
