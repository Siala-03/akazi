import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const admin = {
    email: 'admin@akazi.rw',
    name: 'admin',
    password: 'Admin@123!',
    phone: '+250700000000',
    role: 'admin',
    isActive: true,
};

async function main() {
    const existing = await prisma.user.findUnique({ where: { email: admin.email } });
    if (existing) {
        console.log('Admin user already exists:', admin.email);
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(admin.password, salt);

    await prisma.user.create({
        data: { ...admin, password: hashed },
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Email:   ', admin.email);
    console.log('   Password:', admin.password);
}

main()
    .catch(err => { console.error('Error:', err); process.exit(1); })
    .finally(() => prisma.$disconnect());
