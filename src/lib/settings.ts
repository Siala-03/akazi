import prisma from './prisma';

interface RateSettings {
    exporterDailyRate: number;
    workerDailyWage: number;
}

let cache: RateSettings | null = null;

export async function getSettings(): Promise<RateSettings> {
    if (cache) return cache;

    let settings = await prisma.settings.findFirst();
    if (!settings) {
        settings = await prisma.settings.create({
            data: { id: 'singleton', exporterDailyRate: 2000, workerDailyWage: 1700 },
        });
    }

    cache = { exporterDailyRate: settings.exporterDailyRate, workerDailyWage: settings.workerDailyWage };
    return cache;
}

export function invalidateSettingsCache() {
    cache = null;
}
