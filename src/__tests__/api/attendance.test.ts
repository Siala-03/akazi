import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
    worker: { findUnique: vi.fn() },
    attendance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    session: { updateMany: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}));

import { GET as CHECKIN_GET, POST as CHECKIN_POST } from '@/app/api/attendance/checkin/route';
import { POST as CHECKOUT_POST } from '@/app/api/attendance/checkout/route';

const BASE = 'http://localhost';

function get(path: string) { return new NextRequest(`${BASE}${path}`); }
function post(path: string, body: unknown) {
    return new NextRequest(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const SUPERVISOR = { userId: 'sup-1', email: 'sup@test.com', role: 'supervisor' as const };

const WORKER_FIXTURE = {
    id: 'worker-db-1',
    workerId: 'W001',
    fullName: 'Jane Mukamana',
    status: 'active',
};

const ATTENDANCE_FIXTURE = {
    id: 'att-1',
    workerId: 'worker-db-1',
    date: new Date('2025-01-01'),
    checkInTime: new Date('2025-01-01T08:00:00'),
    status: 'on-site',
    worker: WORKER_FIXTURE,
};

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/attendance/checkin', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await CHECKIN_POST(post('/api/attendance/checkin', {}));
        expect(res.status).toBe(401);
    });

    it('returns 404 when worker not found', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findUnique.mockResolvedValue(null);

        const res = await CHECKIN_POST(post('/api/attendance/checkin', { workerId: 'bad-id' }));
        expect(res.status).toBe(404);
    });

    it('returns 400 when worker is not active', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findUnique.mockResolvedValue({ ...WORKER_FIXTURE, status: 'inactive' });

        const res = await CHECKIN_POST(post('/api/attendance/checkin', { workerId: 'worker-db-1' }));
        expect(res.status).toBe(400);
    });

    it('returns 400 when worker is already on-site', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findUnique.mockResolvedValue(WORKER_FIXTURE);
        mockPrisma.attendance.findFirst.mockResolvedValue({ ...ATTENDANCE_FIXTURE, status: 'on-site' });

        const res = await CHECKIN_POST(post('/api/attendance/checkin', { workerId: 'worker-db-1' }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/already checked in/i);
    });

    it('returns 400 when worker already completed attendance today', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findUnique.mockResolvedValue(WORKER_FIXTURE);
        mockPrisma.attendance.findFirst.mockResolvedValue({ ...ATTENDANCE_FIXTURE, status: 'checked-out' });

        const res = await CHECKIN_POST(post('/api/attendance/checkin', { workerId: 'worker-db-1' }));
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/already completed/i);
    });

    it('creates attendance record and returns 201', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.worker.findUnique.mockResolvedValue(WORKER_FIXTURE);
        mockPrisma.attendance.findFirst.mockResolvedValue(null);
        mockPrisma.attendance.create.mockResolvedValue(ATTENDANCE_FIXTURE);

        const res = await CHECKIN_POST(post('/api/attendance/checkin', { workerId: 'worker-db-1' }));
        expect(res.status).toBe(201);

        const data = await res.json();
        expect(data.attendance).toBeDefined();
        expect(mockPrisma.attendance.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    workerId: 'worker-db-1',
                    status: 'on-site',
                }),
            })
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/attendance/checkin', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await CHECKIN_GET(get('/api/attendance/checkin'));
        expect(res.status).toBe(401);
    });

    it('returns today\'s attendance records', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.attendance.findMany.mockResolvedValue([ATTENDANCE_FIXTURE]);

        const res = await CHECKIN_GET(get('/api/attendance/checkin'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.attendance).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/attendance/checkout', () => {
    it('returns 401 when unauthenticated', async () => {
        mockGetCurrentUser.mockResolvedValue(null);
        const res = await CHECKOUT_POST(post('/api/attendance/checkout', {}));
        expect(res.status).toBe(401);
    });

    it('checks out worker and closes active sessions', async () => {
        mockGetCurrentUser.mockResolvedValue(SUPERVISOR);
        mockPrisma.attendance.findUnique.mockResolvedValue(ATTENDANCE_FIXTURE);
        mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.attendance.update.mockResolvedValue({
            ...ATTENDANCE_FIXTURE,
            status: 'checked-out',
            checkOutTime: new Date(),
            worker: WORKER_FIXTURE,
            facility: null,
        });

        const res = await CHECKOUT_POST(post('/api/attendance/checkout', { attendanceId: 'att-1' }));
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.sessionsClosed).toBe(1);
        expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ attendanceId: 'att-1', status: 'active' }),
                data: expect.objectContaining({ status: 'closed' }),
            })
        );
        expect(mockPrisma.attendance.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'checked-out' }),
            })
        );
    });
});
