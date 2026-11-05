import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toMongo } from '@/lib/serialize';
import { RWANDA_DISTRICTS } from '@/lib/rwanda-locations';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const worker = await prisma.worker.findUnique({
            where: { id },
            include: { cooperative: true },
        });

        if (!worker) {
            return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
        }

        return NextResponse.json({ worker: toMongo(worker, { cooperative: 'cooperativeId' }) });
    } catch (error) {
        console.error('Get worker error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (currentUser.role === 'supervisor') {
            const settings = await prisma.settings.findFirst();
            if (settings && settings.supervisorCanEditWorkers === false) {
                return NextResponse.json({ error: 'Worker editing has been disabled by the administrator' }, { status: 403 });
            }
        }

        const body = await request.json();
        const { id } = await params;

        // Strip immutable fields (except workerId which is editable)
        const { enrollmentDate: _ed, consentTimestamp: _ct, id: _id, workerId, dateOfBirth: rawDob, ...rest } = body;

        const data: any = { ...rest };

        if (workerId) {
            const cleanId = String(workerId).trim();
            if (!/^\d{16}$/.test(cleanId)) {
                return NextResponse.json({ error: 'National ID must be exactly 16 digits' }, { status: 400 });
            }
            const duplicate = await prisma.worker.findFirst({ where: { workerId: cleanId, NOT: { id } } });
            if (duplicate) {
                return NextResponse.json({ error: 'A worker with this National ID already exists' }, { status: 409 });
            }
            data.workerId = cleanId;
        }

        // Only touch date of birth when the request includes it — partial updates such as
        // activate/deactivate must not wipe it
        if ('dateOfBirth' in body) {
            data.dateOfBirth = rawDob ? new Date(rawDob) : null;
        }

        // Address: all five fields together, or all empty (older workers may have none)
        const ADDRESS_FIELDS = ['province', 'district', 'sector', 'cell', 'village'] as const;
        if (ADDRESS_FIELDS.some(f => f in body)) {
            const values = ADDRESS_FIELDS.map(f => (typeof body[f] === 'string' ? body[f].trim() : ''));
            const filled = values.filter(Boolean).length;
            if (filled > 0 && filled < ADDRESS_FIELDS.length) {
                return NextResponse.json({ error: 'Fill in all address fields or leave them all empty' }, { status: 400 });
            }
            if (filled > 0 && !RWANDA_DISTRICTS[values[0]]?.includes(values[1])) {
                return NextResponse.json({ error: 'Invalid province or district' }, { status: 400 });
            }
            ADDRESS_FIELDS.forEach((f, i) => { data[f] = values[i] || null; });
        }

        const worker = await prisma.worker.update({
            where: { id },
            data,
            include: { cooperative: true },
        });

        return NextResponse.json({ worker: toMongo(worker, { cooperative: 'cooperativeId' }) });
    } catch (error) {
        console.error('Update worker error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { id } = await params;

        const [attendanceCount, sessionCount, earningsCount, bagWorkerCount] = await Promise.all([
            prisma.attendance.count({ where: { workerId: id } }),
            prisma.session.count({ where: { workerId: id } }),
            prisma.earnings.count({ where: { workerId: id } }),
            prisma.bagWorker.count({ where: { workerId: id } }),
        ]);

        const totalDependencies = attendanceCount + sessionCount + earningsCount + bagWorkerCount;
        if (totalDependencies > 0) {
            return NextResponse.json(
                {
                    error: 'Cannot delete worker with operational records. Deactivate the worker instead.',
                    details: {
                        attendances: attendanceCount,
                        sessions: sessionCount,
                        earnings: earningsCount,
                        bagAssignments: bagWorkerCount,
                    },
                },
                { status: 400 }
            );
        }

        const worker = await prisma.worker.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Worker deleted successfully', worker: { ...worker, _id: worker.id } });
    } catch (error) {
        console.error('Delete worker error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
