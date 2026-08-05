import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Runs daily at 23:45 CAT (21:45 UTC) via Vercel Cron (see vercel.json).
// Closes out anyone still checked in as on-site, so a forgotten checkout
// can never carry over into the next day and create a duplicate/stuck session.
export async function GET(request: NextRequest) {
    if (process.env.CRON_SECRET) {
        const auth = request.headers.get('authorization');
        if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const now = new Date();

    const openAttendance = await prisma.attendance.findMany({
        where: { status: 'on-site' },
        include: { sessions: { where: { status: 'active' } } },
    });

    if (openAttendance.length === 0) {
        return NextResponse.json({ closedAttendance: 0, closedSessions: 0 });
    }

    const attendanceIds = openAttendance.map(a => a.id);
    const sessionIds = openAttendance.flatMap(a => a.sessions.map(s => s.id));

    const [attResult, sessResult] = await prisma.$transaction([
        prisma.attendance.updateMany({
            where: { id: { in: attendanceIds } },
            data: { checkOutTime: now, status: 'checked-out' },
        }),
        prisma.session.updateMany({
            where: { id: { in: sessionIds } },
            data: { endTime: now, status: 'closed' },
        }),
    ]);

    console.log(`[auto-checkout] Closed ${attResult.count} attendance, ${sessResult.count} sessions at ${now.toISOString()}`);

    return NextResponse.json({ closedAttendance: attResult.count, closedSessions: sessResult.count });
}
