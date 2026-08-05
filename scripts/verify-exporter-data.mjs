// Prints exactly what each exporter's portal would show, without logging in as them.
// Usage: node --env-file=.env scripts/verify-exporter-data.mjs [--company "name"]
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, arg, i, arr) => {
        if (arg.startsWith('--')) pairs.push([arg.slice(2), arr[i + 1]]);
        return pairs;
    }, [])
);

const where = args.company
    ? { companyTradingName: { contains: args.company, mode: 'insensitive' } }
    : {};

const exporters = await prisma.exporter.findMany({ where, orderBy: { companyTradingName: 'asc' } });

for (const exp of exporters) {
    const [onSite, requestCounts, sessionCount, lastSession] = await Promise.all([
        prisma.session.count({ where: { exporterId: exp.id, status: 'active' } }),
        prisma.workerRequest.groupBy({ by: ['status'], where: { exporterId: exp.id }, _count: true }),
        prisma.session.count({ where: { exporterId: exp.id } }),
        prisma.session.findFirst({ where: { exporterId: exp.id }, orderBy: { startTime: 'desc' }, select: { startTime: true } }),
    ]);

    console.log(`\n=== ${exp.companyTradingName} (${exp.exporterCode}) ===`);
    console.log(`  Contact: ${exp.contactPerson} | ${exp.phone} | ${exp.email}`);
    console.log(`  Address: ${exp.companyAddress}${exp.tinNumber ? ` | TIN: ${exp.tinNumber}` : ''}`);
    console.log(`  Daily rate: ${exp.dailyRate ? `FRw ${exp.dailyRate}` : '(using default rate)'}`);
    console.log(`  Active: ${exp.isActive} | Ops access: ${exp.operationsEnabled} | Multi check-out: ${exp.bulkCheckoutEnabled} | QR badges: ${exp.bulkQrDownloadEnabled} | Backdated attendance: ${exp.backdatedAttendanceEnabled}`);
    console.log(`  On-site right now: ${onSite}`);
    console.log(`  Total sessions ever: ${sessionCount} | Last session started: ${lastSession?.startTime?.toLocaleString() ?? 'never'}`);
    console.log(`  Worker requests: ${requestCounts.map(r => `${r.status}=${r._count}`).join(', ') || 'none'}`);
}

console.log(`\n${exporters.length} exporter(s) shown.`);
await prisma.$disconnect();
