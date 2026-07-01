import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
    attendance: { findUnique: vi.fn() },
    session: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
    },
    exporter: { findUnique: vi.fn() },
    bagWorker: { deleteMany: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('@/lib/settings', () => ({
    getSettings: vi.fn().mockResolvedValue({ exporterDailyRate: 2000, workerDailyWage: 1700 }),
}));
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

import { GET, POST } from '@/app/api/sessions/route';

const BASE = 'http://localhost';

function get(path: string) { return new NextRequest(`${BASE}${path}`); }
function post(path: string, body: unknown) {
    return new NextRequest(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const ADMIN = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' as const };
const SUPERVISOR = { userId: 'sup-1', email: 'sup@test.com', role: 'supervisor' as const };

const ATTENDANCE_FIXTURE = {
    id: 'att-1',
    workerId: 'worker-db-1',
    facilityId: null,
    date: new Date('2025-01-01'),
    status: 'on-site',
    checkInTime: new Date('2025-01-01T08:00:00'),
};

const SESSION_FIXTURE = {
    id: 'session-1',
    workerId: 'worker-db-1',
    exporterId: 'exporter-db-1',
    facilityId: null,
    dailyRate: 2000,
    date: new Date('2025-01-01'),
    startTime: new Date('2025-01-01T08:00:00'),
    status: 'active',
    worker: { id: 'worker-db-1', fullName: 'Jane Mukamana', workerId: 'W001' },
    exporter: { id: 'exporter-db-1', companyTradingName: "Pedro's Coffee" },
    facility: null,
};

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/sessions', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await POST(post('/api/sessions', {}));
        expect(res.status).toBe(401);
    });

    it('returns 401 for exporter role', async () => {
        mockGetCurrentUser.mockResolvedValue({
            userId: 'exp-1', email: 'e@t.com', role: 'exporter' as const, exporterId: 'e1',
        });
        const res = await POST(post('/api/sessions', {}));
        expect(res.status).toBe(401);
    });

    it('returns 404 when attendance record not found', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.attendance.findUnique.mockResolvedValue(null);

        const res = await POST(post('/api/sessions', {
            attendanceId: 'bad-att-id',
            exporterId: 'exporter-db-1',
        }));
        expect(res.status).toBe(404);
    });

    it('returns 400 when worker is not on-site', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.attendance.findUnique.mockResolvedValue({ ...ATTENDANCE_FIXTURE, status: 'checked-out' });

        const res = await POST(post('/api/sessions', {
            attendanceId: 'att-1',
            exporterId: 'exporter-db-1',
        }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/on-site/i);
    });

    it('returns 400 when worker already has an active session', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.attendance.findUnique.mockResolvedValue(ATTENDANCE_FIXTURE);
        mockPrisma.session.findFirst.mockResolvedValue(SESSION_FIXTURE);
        mockPrisma.exporter.findUnique.mockResolvedValue({ id: 'exporter-db-1', dailyRate: 2000 });

        const res = await POST(post('/api/sessions', {
            attendanceId: 'att-1',
            exporterId: 'exporter-db-1',
        }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/already has an active session/i);
    });

    it('creates session and snapshots daily rate', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.attendance.findUnique.mockResolvedValue(ATTENDANCE_FIXTURE);
        mockPrisma.session.findFirst.mockResolvedValue(null);
        mockPrisma.exporter.findUnique.mockResolvedValue({ id: 'exporter-db-1', dailyRate: 2500 });
        mockPrisma.session.create.mockResolvedValue(SESSION_FIXTURE);

        const res = await POST(post('/api/sessions', {
            attendanceId: 'att-1',
            exporterId: 'exporter-db-1',
        }));
        expect(res.status).toBe(201);

        expect(mockPrisma.session.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ dailyRate: 2500 }),
            })
        );
    });

    it('falls back to global rate when exporter has no dailyRate', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.attendance.findUnique.mockResolvedValue(ATTENDANCE_FIXTURE);
        mockPrisma.session.findFirst.mockResolvedValue(null);
        mockPrisma.exporter.findUnique.mockResolvedValue({ id: 'exporter-db-1', dailyRate: null });
        mockPrisma.session.create.mockResolvedValue(SESSION_FIXTURE);

        await POST(post('/api/sessions', { attendanceId: 'att-1', exporterId: 'exporter-db-1' }));

        expect(mockPrisma.session.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ dailyRate: 2000 }),
            })
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/sessions', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await GET(get('/api/sessions'));
        expect(res.status).toBe(401);
    });

    it('returns active sessions', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.session.findMany.mockResolvedValue([SESSION_FIXTURE]);

        const res = await GET(get('/api/sessions'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.sessions).toHaveLength(1);
    });

    it('filters to active status by default', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.session.findMany.mockResolvedValue([]);

        await GET(get('/api/sessions'));

        expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) })
        );
    });

    it('scopes exporter user to their own sessions', async () => {
        mockGetCurrentUser.mockResolvedValue({
            userId: 'exp-1', email: 'e@t.com', role: 'exporter' as const, exporterId: 'exporter-db-1',
        });
        mockPrisma.session.findMany.mockResolvedValue([]);

        await GET(get('/api/sessions'));

        expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ exporterId: 'exporter-db-1' }),
            })
        );
    });
});
