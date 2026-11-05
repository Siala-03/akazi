import prisma from '@/lib/prisma';

// Agreed session totals (AgreedSessionCount) override recorded check-ins in every count
// and cost shown to admins, exporters and NAEB. Individual session/attendance records are
// never changed; instead each report adds the difference (agreed − recorded) per exporter/day.
// Days are keyed as YYYY-MM-DD of the session's stored `date` (UTC), matching TO_CHAR(date)
// used in the analytics queries.

export interface AgreedAdjustment {
    exporterId: string;
    day: string;
    agreed: number;
    recorded: number;
    /** agreed − recorded; may be negative */
    extraSessions: number;
    /** extraSessions × that day's average session rate */
    extraCost: number;
    note: string | null;
}

export interface AgreedAdjustmentSummary {
    adjustments: AgreedAdjustment[];
    extraSessions: number;
    extraCost: number;
    byDay: Map<string, { extraSessions: number; extraCost: number }>;
    byExporter: Map<string, { extraSessions: number; extraCost: number }>;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
// Range bounds come from getStartOfDay/getEndOfDay (server-local midnights), so read
// them as local calendar days; on the UTC server this is identical to dayKey.
const localDayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function getAgreedAdjustments(opts: {
    from?: Date;
    to?: Date;
    exporterId?: string;
    defaultRate: number;
}): Promise<AgreedAdjustmentSummary> {
    const { from, to, exporterId, defaultRate } = opts;
    const agreed = await prisma.agreedSessionCount.findMany({
        where: {
            ...(exporterId && { exporterId }),
            ...((from || to) && {
                date: {
                    ...(from && { gte: new Date(`${localDayKey(from)}T00:00:00Z`) }),
                    ...(to && { lte: new Date(`${localDayKey(to)}T00:00:00Z`) }),
                },
            }),
        },
        include: { exporter: { select: { dailyRate: true } } },
    });

    const summary: AgreedAdjustmentSummary = {
        adjustments: [], extraSessions: 0, extraCost: 0, byDay: new Map(), byExporter: new Map(),
    };
    if (agreed.length === 0) return summary;

    // Recorded sessions for the agreed exporter/days
    const days = agreed.map(a => a.date);
    const minDay = new Date(Math.min(...days.map(d => d.getTime())));
    const maxDay = new Date(Math.max(...days.map(d => d.getTime())) + 24 * 60 * 60 * 1000);
    const sessions = await prisma.session.findMany({
        where: {
            exporterId: { in: [...new Set(agreed.map(a => a.exporterId))] },
            date: { gte: minDay, lt: maxDay },
        },
        select: { exporterId: true, date: true, dailyRate: true },
    });
    const exporterRate = new Map(agreed.map(a => [a.exporterId, a.exporter.dailyRate ?? defaultRate]));
    const recordedMap = new Map<string, { count: number; cost: number }>();
    for (const s of sessions) {
        const key = `${s.exporterId}::${dayKey(s.date)}`;
        const r = recordedMap.get(key) ?? { count: 0, cost: 0 };
        r.count += 1;
        r.cost += s.dailyRate ?? exporterRate.get(s.exporterId)!;
        recordedMap.set(key, r);
    }

    for (const a of agreed) {
        const day = dayKey(a.date);
        const recorded = recordedMap.get(`${a.exporterId}::${day}`) ?? { count: 0, cost: 0 };
        const rate = recorded.count > 0 ? recorded.cost / recorded.count : exporterRate.get(a.exporterId)!;
        const extraSessions = a.agreedCount - recorded.count;
        const extraCost = extraSessions * rate;

        summary.adjustments.push({
            exporterId: a.exporterId, day, agreed: a.agreedCount, recorded: recorded.count,
            extraSessions, extraCost, note: a.note,
        });
        summary.extraSessions += extraSessions;
        summary.extraCost += extraCost;
        for (const [map, key] of [[summary.byDay, day], [summary.byExporter, a.exporterId]] as const) {
            const t = map.get(key) ?? { extraSessions: 0, extraCost: 0 };
            t.extraSessions += extraSessions;
            t.extraCost += extraCost;
            map.set(key, t);
        }
    }
    return summary;
}
