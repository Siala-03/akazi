import { NextResponse } from 'next/server';
import { Gender } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateWorkerId, generateBagNumber } from '@/lib/utils';

export async function POST() {
    try {
        const existingUsers = await prisma.user.count();
        if (existingUsers > 0) {
            return NextResponse.json(
                { message: 'Database already seeded. Drop the database to re-seed.' },
                { status: 200 }
            );
        }

        const [cooperative1, cooperative2] = await Promise.all([
            prisma.cooperative.create({
                data: { name: 'Umucyo Women Cooperative', code: 'UMUCYO', contactPerson: 'Cooperative Manager', phone: '+250788000000', isActive: true },
            }),
            prisma.cooperative.create({
                data: { name: 'Iwacu Coffee Growers', code: 'IWACU', contactPerson: 'Director', phone: '+250788000001', isActive: true },
            }),
        ]);

        const facility = await prisma.facility.create({
            data: { name: 'NAEB Sorting Facility', code: 'NAEB-001', location: 'Kigali, Rwanda', isActive: true },
        });

        const [exporter1, exporter2, exporter3] = await Promise.all([
            prisma.exporter.create({
                data: { exporterCode: 'EXP-001', companyTradingName: 'Rwanda Coffee Exporters Ltd', companyAddress: 'KN 4 Ave, Kigali, Rwanda', contactPerson: 'John Doe', phone: '+250788111111', email: 'contact@rwandacoffee.rw', isActive: true },
            }),
            prisma.exporter.create({
                data: { exporterCode: 'EXP-002', companyTradingName: 'Global Coffee Trading', companyAddress: 'Kimihurura, KG 7 Ave, Kigali, Rwanda', contactPerson: 'Jane Smith', phone: '+250788222222', email: 'info@globalcoffee.com', isActive: true },
            }),
            prisma.exporter.create({
                data: { exporterCode: 'EXP-003', companyTradingName: 'East Africa Coffee Co', companyAddress: 'Remera, KG 17 Ave, Kigali, Rwanda', contactPerson: 'Mark Johnson', phone: '+250788333333', email: 'info@eacoffee.com', isActive: true },
            }),
        ]);

        const [adminPassword, supervisorPassword, exporterPassword] = await Promise.all([
            hashPassword('admin123'),
            hashPassword('super123'),
            hashPassword('exporter123'),
        ]);

        const [adminUser, supervisorUser] = await Promise.all([
            prisma.user.create({ data: { email: 'admin@cwms.rw', password: adminPassword, role: 'admin', name: 'System Administrator', phone: '+250788999999', isActive: true } }),
            prisma.user.create({ data: { email: 'supervisor@cwms.rw', password: supervisorPassword, role: 'supervisor', name: 'Facility Supervisor', phone: '+250788888888', facilityId: facility.id, isActive: true } }),
        ]);

        await Promise.all([
            prisma.user.create({ data: { email: 'exporter@rwandacoffee.rw', password: exporterPassword, role: 'exporter', name: 'Exporter Manager', phone: '+250788777777', exporterId: exporter1.id, isActive: true } }),
            prisma.rateCard.create({ data: { exporterId: exporter1.id, ratePerBag: 1000, effectiveFrom: new Date('2026-01-01'), isActive: true, createdBy: adminUser.id } }),
            prisma.rateCard.create({ data: { exporterId: exporter2.id, ratePerBag: 1200, effectiveFrom: new Date('2026-01-01'), isActive: true, createdBy: adminUser.id } }),
            prisma.rateCard.create({ data: { exporterId: exporter3.id, ratePerBag: 900, effectiveFrom: new Date('2026-01-01'), isActive: true, createdBy: adminUser.id } }),
        ]);

        const workerNames: { name: string; gender: Gender }[] = [
            { name: 'Uwase Marie', gender: Gender.female },
            { name: 'Mukamana Grace', gender: Gender.female },
            { name: 'Niyonsenga Jean', gender: Gender.male },
            { name: 'Habimana Paul', gender: Gender.male },
            { name: 'Uwamahoro Sarah', gender: Gender.female },
            { name: 'Ndayisaba Eric', gender: Gender.male },
            { name: 'Mukeshimana Alice', gender: Gender.female },
            { name: 'Nkurunziza David', gender: Gender.male },
            { name: 'Nyiransabimana Rose', gender: Gender.female },
            { name: 'Bizimana Felix', gender: Gender.male },
            { name: 'Uwera Christine', gender: Gender.female },
            { name: 'Nshuti Patrick', gender: Gender.male },
            { name: 'Mukasine Jeanette', gender: Gender.female },
            { name: 'Habimana Samuel', gender: Gender.male },
            { name: 'Nyirahabimana Louise', gender: Gender.female },
        ];

        const workers = await Promise.all(
            workerNames.map((w, i) =>
                prisma.worker.create({
                    data: {
                        workerId: generateWorkerId(),
                        fullName: w.name,
                        gender: w.gender,
                        ageRange: i % 3 === 0 ? '18-25' : i % 3 === 1 ? '26-35' : '36-50',
                        phone: `+25078800${(1000 + i).toString().padStart(4, '0')}`,
                        photo: 'https://via.placeholder.com/150',
                        cooperativeId: i % 2 === 0 ? cooperative1.id : cooperative2.id,
                        primaryRole: 'Coffee Sorter',
                        status: 'active',
                        consentWorkRecords: true,
                        consentAnonymizedReporting: true,
                        previousWorkType: i % 2 === 0 ? 'Farming' : 'Casual Labor',
                        avgDaysWorkedPerMonth: 15 + (i % 10),
                        typicalDailyEarnings: i % 2 === 0 ? '1000-2000 RWF' : '2000-3000 RWF',
                        isPrimaryEarner: i % 3 === 0,
                        householdSize: `${3 + (i % 4)}`,
                    },
                })
            )
        );

        const today = new Date();
        const exporters = [exporter1, exporter2, exporter3];
        let totalAttendance = 0;
        let totalSessions = 0;
        let totalBagsCreated = 0;

        for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
            const date = new Date(today);
            date.setDate(date.getDate() - dayOffset);
            date.setHours(0, 0, 0, 0);

            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (isWeekend && Math.random() > 0.3) continue;

            const activeWorkerCount = Math.min(workers.length, 6 + Math.floor(Math.random() * 7));
            const dayWorkers = [...workers].sort(() => Math.random() - 0.5).slice(0, activeWorkerCount);
            const isToday = dayOffset === 0;

            const dayAttendance = await Promise.all(
                dayWorkers.map(worker => {
                    const checkInTime = new Date(date);
                    checkInTime.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
                    const checkOutTime = new Date(date);
                    checkOutTime.setHours(15 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
                    return prisma.attendance.create({
                        data: {
                            workerId: worker.id,
                            facilityId: facility.id,
                            date,
                            checkInTime,
                            status: isToday ? 'on-site' : 'checked-out',
                            ...(isToday ? {} : { checkOutTime }),
                            supervisorId: supervisorUser.id,
                        },
                    });
                })
            );
            totalAttendance += dayAttendance.length;

            const daySessions = await Promise.all(
                dayWorkers.map((worker, i) => {
                    const exporter = exporters[i % 3];
                    const startTime = new Date(date);
                    startTime.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
                    const endTime = new Date(date);
                    endTime.setHours(15 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
                    return prisma.session.create({
                        data: {
                            attendanceId: dayAttendance[i].id,
                            workerId: worker.id,
                            exporterId: exporter.id,
                            facilityId: facility.id,
                            date,
                            startTime,
                            ...(isToday ? {} : { endTime }),
                            status: isToday ? 'active' : 'closed',
                            supervisorId: supervisorUser.id,
                        },
                    });
                })
            );
            totalSessions += daySessions.length;

            for (const exporter of exporters) {
                const exporterSessions = daySessions.filter(s => s.exporterId === exporter.id);
                let idx = 0;
                while (idx + 1 < exporterSessions.length) {
                    const workerCount = Math.min(2 + Math.floor(Math.random() * 2), exporterSessions.length - idx);
                    if (workerCount < 2) break;
                    const bagSessionSlice = exporterSessions.slice(idx, idx + workerCount);
                    const weight = 55 + Math.floor(Math.random() * 15);
                    await prisma.bag.create({
                        data: {
                            bagNumber: generateBagNumber(),
                            exporterId: exporter.id,
                            facilityId: facility.id,
                            date,
                            weight,
                            status: 'completed',
                            supervisorId: supervisorUser.id,
                            workers: {
                                create: bagSessionSlice.map(s => ({
                                    workerId: s.workerId,
                                    sessionId: s.id,
                                })),
                            },
                        },
                    });
                    totalBagsCreated++;
                    idx += workerCount;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Database seeded successfully',
            credentials: {
                admin: { email: 'admin@cwms.rw', password: 'admin123' },
                supervisor: { email: 'supervisor@cwms.rw', password: 'super123' },
                exporter: { email: 'exporter@rwandacoffee.rw', password: 'exporter123' },
            },
            data: {
                cooperatives: [cooperative1.name, cooperative2.name],
                facility: facility.name,
                exporters: [exporter1.companyTradingName, exporter2.companyTradingName, exporter3.companyTradingName],
                workers: workers.length,
                todayAttendance: totalAttendance,
                activeSessions: totalSessions,
                bagsProcessed: totalBagsCreated,
            },
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
