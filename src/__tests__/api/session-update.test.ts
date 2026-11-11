import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => {
    const p = {
        attendance: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
        session: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
        exporter: { findUnique: vi.fn() },
        $transaction: vi.fn(),
    };
    p.$transaction.mockImplementation((fn: (tx: typeof p) => unknown) => fn(p));
    return p;
});

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/settings', () => ({
    getSettings: vi.fn().mockResolvedValue({ exporterDailyRate: 3000, workerDailyWage: 2700 }),
}));

import { PATCH } from '@/app/api/sessions/[id]/route';

const ADMIN = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' as const };

const ATTENDANCE = {
    id: 'att-1', workerId: 'w-1', facilityId: null, status: 'checked-out', supervisorId: 'sup-1', checkInMethod: 'manual',
    date: new Date('2026-11-09T08:00:00Z'),
    checkInTime: new Date('2026-11-09T08:00:00Z'),
    checkOutTime: new Date('2026-11-09T14:30:00Z'),
};

const SESSION = {
    id: 's-1', workerId: 'w-1', exporterId: 'exp-a', attendanceId: 'att-1', status: 'closed', dailyRate: 3000,
    date: new Date('2026-11-09T08:00:00Z'),
    startTime: new Date('2026-11-09T08:00:00Z'),
    endTime: new Date('2026-11-09T14:30:00Z'),
    attendance: ATTENDANCE,
    _count: { bagWorkers: 0 },
};

function patch(body: unknown) {
    return PATCH(
        new NextRequest('http://localhost/api/sessions/s-1', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: 's-1' }) },
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T09:00:00Z'));
    mockGetCurrentUser.mockResolvedValue(ADMIN);
    mockPrisma.session.findUnique.mockResolvedValue(SESSION);
    mockPrisma.session.update.mockImplementation(({ data }) => Promise.resolve({ ...SESSION, ...data }));
    mockPrisma.attendance.findFirst.mockResolvedValue(null);
    mockPrisma.session.count.mockResolvedValue(0);
});

describe('PATCH /api/sessions/[id] — change date', () => {
    it('shifts session and attendance times by whole days', async () => {
        const res = await patch({ date: '2026-11-07' });
        expect(res.status).toBe(200);

        const sessionData = mockPrisma.session.update.mock.calls[0][0].data;
        expect(sessionData.date.toISOString()).toBe('2026-11-07T08:00:00.000Z');
        expect(sessionData.startTime.toISOString()).toBe('2026-11-07T08:00:00.000Z');
        expect(sessionData.endTime.toISOString()).toBe('2026-11-07T14:30:00.000Z');
        expect(sessionData.exporterId).toBeUndefined();

        const attData = mockPrisma.attendance.update.mock.calls[0][0].data;
        expect(attData.checkInTime.toISOString()).toBe('2026-11-07T08:00:00.000Z');
        expect(attData.checkOutTime.toISOString()).toBe('2026-11-07T14:30:00.000Z');
        expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('changes exporter and date together', async () => {
        mockPrisma.exporter.findUnique.mockResolvedValue({ id: 'exp-b', dailyRate: 3200 });
        const res = await patch({ exporterId: 'exp-b', date: '2026-11-08' });
        expect(res.status).toBe(200);
        const data = mockPrisma.session.update.mock.calls[0][0].data;
        expect(data.exporterId).toBe('exp-b');
        expect(data.dailyRate).toBe(3200);
        expect(data.date.toISOString()).toBe('2026-11-08T08:00:00.000Z');
    });

    it('creates a new attendance when the old one still covers other sessions', async () => {
        mockPrisma.session.count.mockResolvedValue(1);
        mockPrisma.attendance.create.mockResolvedValue({ id: 'att-2' });
        const res = await patch({ date: '2026-11-08' });
        expect(res.status).toBe(200);
        expect(mockPrisma.attendance.update).not.toHaveBeenCalled();
        expect(mockPrisma.session.update.mock.calls[0][0].data.attendanceId).toBe('att-2');
    });

    it('rejects a day where the worker already has a check-in', async () => {
        mockPrisma.attendance.findFirst.mockResolvedValue({ id: 'other' });
        const res = await patch({ date: '2026-11-08' });
        expect(res.status).toBe(409);
        expect(mockPrisma.session.update).not.toHaveBeenCalled();
    });

    it('rejects future dates', async () => {
        const res = await patch({ date: '2026-11-12' });
        expect(res.status).toBe(400);
    });

    it('rejects moving an active session', async () => {
        mockPrisma.session.findUnique.mockResolvedValue({ ...SESSION, status: 'active', endTime: null });
        const res = await patch({ date: '2026-11-08' });
        expect(res.status).toBe(400);
    });

    it('rejects a no-op change', async () => {
        const res = await patch({ exporterId: 'exp-a', date: '2026-11-09' });
        expect(res.status).toBe(400);
    });
});
