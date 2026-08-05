// Query archived attendance/session records (see /archive/*.json).
// Usage:
//   node scripts/query-archive.mjs --worker "solange"
//   node scripts/query-archive.mjs --exporter "GIC"
//   node scripts/query-archive.mjs --date 2026-08-04
//   node scripts/query-archive.mjs --from 2026-08-01 --to 2026-08-03
import fs from 'fs';
import path from 'path';

const archiveDir = path.join(import.meta.dirname, '..', 'archive');
const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, arg, i, arr) => {
        if (arg.startsWith('--')) pairs.push([arg.slice(2), arr[i + 1]]);
        return pairs;
    }, [])
);

if (!fs.existsSync(archiveDir)) {
    console.error(`No archive directory found at ${archiveDir}`);
    process.exit(1);
}

const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json'));
if (files.length === 0) {
    console.error('No archive files found.');
    process.exit(1);
}

let results = [];
for (const file of files) {
    const dump = JSON.parse(fs.readFileSync(path.join(archiveDir, file), 'utf-8'));
    results.push(...dump.attendances.map(a => ({ ...a, _archiveFile: file })));
}

if (args.worker) {
    const q = args.worker.toLowerCase();
    results = results.filter(a => a.worker.fullName.toLowerCase().includes(q) || a.worker.workerId.toLowerCase().includes(q));
}
if (args.exporter) {
    const q = args.exporter.toLowerCase();
    results = results.filter(a => a.sessions.some(s => s.exporter.companyTradingName.toLowerCase().includes(q)));
}
if (args.date) {
    results = results.filter(a => a.date.startsWith(args.date));
}
if (args.from) {
    results = results.filter(a => a.date >= args.from);
}
if (args.to) {
    results = results.filter(a => a.date <= args.to + 'T23:59:59.999Z');
}

console.log(`${results.length} matching record(s):\n`);
for (const a of results) {
    const exp = a.sessions.map(s => s.exporter.companyTradingName).join(', ') || 'no session';
    console.log(`- ${a.worker.fullName} (${a.worker.workerId}) | ${exp} | in: ${a.checkInTime} out: ${a.checkOutTime} | [${a._archiveFile}]`);
}
