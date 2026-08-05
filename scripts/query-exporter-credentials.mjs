// List exporter portal login accounts, or reset a password (existing passwords are
// bcrypt-hashed and cannot be recovered — reset issues a new one).
// Usage:
//   node --env-file=.env scripts/query-exporter-credentials.mjs
//   node --env-file=.env scripts/query-exporter-credentials.mjs --company "GIC"
//   node --env-file=.env scripts/query-exporter-credentials.mjs --reset exporter@email.com
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, arg, i, arr) => {
        if (arg.startsWith('--')) pairs.push([arg.slice(2), arr[i + 1]]);
        return pairs;
    }, [])
);

if (args.reset) {
    const user = await prisma.user.findUnique({ where: { email: args.reset.toLowerCase() } });
    if (!user || user.role !== 'exporter') {
        console.error(`No exporter account found for ${args.reset}`);
        process.exit(1);
    }
    const newPassword = crypto.randomBytes(6).toString('hex');
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    console.log(`New password for ${user.email}: ${newPassword}`);
    console.log('(Give this to the exporter directly — it will not be shown again.)');
    await prisma.$disconnect();
    process.exit(0);
}

const where = { role: 'exporter' };
if (args.company) {
    where.exporter = { companyTradingName: { contains: args.company, mode: 'insensitive' } };
}

const users = await prisma.user.findMany({
    where,
    include: { exporter: true },
    orderBy: { name: 'asc' },
});

console.log(`${users.length} exporter account(s):\n`);
for (const u of users) {
    console.log(`- ${u.exporter?.companyTradingName ?? '(no exporter linked)'} | login: ${u.email} | contact: ${u.name} (${u.phone}) | active: ${u.isActive}`);
}
console.log('\nPasswords are hashed and cannot be retrieved. To issue a new one:');
console.log('  node --env-file=.env scripts/query-exporter-credentials.mjs --reset <email>');

await prisma.$disconnect();
