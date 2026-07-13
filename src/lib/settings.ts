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
            data: { id: 'singleton', exporterDailyRate: 2000, workerDailyWage: 1700, supervisorCanEditWorkers: true },
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
