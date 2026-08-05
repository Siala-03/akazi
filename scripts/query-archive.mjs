// Query archived attendance/session records stored in Vercel Blob (private store).
// Requires BLOB_READ_WRITE_TOKEN in the environment — run with:
//   node --env-file=.env scripts/query-archive.mjs --worker "solange"
//   node --env-file=.env scripts/query-archive.mjs --exporter "GIC"
//   node --env-file=.env scripts/query-archive.mjs --date 2026-08-04
//   node --env-file=.env scripts/query-archive.mjs --from 2026-08-01 --to 2026-08-03
import fs from 'fs';
import path from 'path';
import { get } from '@vercel/blob';

const manifestPath = path.join(import.meta.dirname, '..', 'archive', 'manifest.json');
const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, arg, i, arr) => {
        if (arg.startsWith('--')) pairs.push([arg.slice(2), arr[i + 1]]);
        return pairs;
    }, [])
);

if (!fs.existsSync(manifestPath)) {
    console.error(`No manifest found at ${manifestPath}`);
    process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not set — run with: node --env-file=.env scripts/query-archive.mjs ...');
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

let results = [];
for (const entry of manifest) {
    const blob = await get(entry.pathname, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blob) {
        console.error(`Warning: could not fetch ${entry.pathname}, skipping`);
        continue;
    }
    const chunks = [];
    for await (const chunk of blob.stream) chunks.push(chunk);
    const dump = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    results.push(...dump.attendances.map(a => ({ ...a, _archiveFile: entry.file })));
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
