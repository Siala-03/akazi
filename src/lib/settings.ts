import prisma from './prisma';

interface RateSettings {
    exporterDailyRate: number;
    workerDailyWage: number;
    supervisorCanEditWorkers: boolean;
}

let cache: RateSettings | null = null;

export async function getSettings(): Promise<RateSettings> {
    if (cache) return cache;

    let settings = await prisma.settings.findFirst();
    if (!settings) {
        settings = await prisma.settings.create({
            data: { id: 'singleton', exporterDailyRate: 3000, workerDailyWage: 2500, supervisorCanEditWorkers: true },
        });
    }

    cache = {
        exporterDailyRate: settings.exporterDailyRate,
        workerDailyWage: settings.workerDailyWage,
        supervisorCanEditWorkers: settings.supervisorCanEditWorkers,
    };
    return cache;
}

export function invalidateSettingsCache() {
    cache = null;
}

// Deliberately uncached: a hard/soft lock must take effect immediately across
// every serverless instance, and an in-memory cache can't propagate a toggle
// from one instance to another. The extra per-request read is the tradeoff.
export async function getSystemLock(): Promise<{ loginsLocked: boolean; sessionsInvalidatedAt: Date | null }> {
    const settings = await prisma.settings.findUnique({
        where: { id: 'singleton' },
        select: { loginsLocked: true, sessionsInvalidatedAt: true },
    });
    return {
        loginsLocked: settings?.loginsLocked ?? false,
        sessionsInvalidatedAt: settings?.sessionsInvalidatedAt ?? null,
    };
}
