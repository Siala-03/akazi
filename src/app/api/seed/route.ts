import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import CooperativeModel from '@/models/Cooperative';
import FacilityModel from '@/models/Facility';
import ExporterModel from '@/models/Exporter';
import RateCardModel from '@/models/RateCard';
import WorkerModel from '@/models/Worker';
import AttendanceModel from '@/models/Attendance';
import SessionModel from '@/models/Session';
import BagModel from '@/models/Bag';
import { hashPassword } from '@/lib/auth';
import { generateWorkerId, generateBagNumber } from '@/lib/utils';

export async function POST() {
    try {
        await dbConnect();

        // Check if data already exists
        const existingUsers = await UserModel.countDocuments();
        if (existingUsers > 0) {
            return NextResponse.json(
                { message: 'Database already seeded. Drop the database to re-seed.' },
                { status: 200 }
            );
        }

        // Create Cooperatives
        const cooperative1 = await CooperativeModel.create({
            name: 'Umucyo Women Cooperative',
            code: 'UMUCYO',
            contactPerson: 'Cooperative Manager',
            phone: '+250788000000',
            isActive: true,
        });

        const cooperative2 = await CooperativeModel.create({
            name: 'Iwacu Coffee Growers',
            code: 'IWACU',
            contactPerson: 'Director',
            phone: '+250788000001',
            isActive: true,
        });

        // Create Facility
        const facility = await FacilityModel.create({
            name: 'NAEB Sorting Facility',
            code: 'NAEB-001',
            location: 'Kigali, Rwanda',
            isActive: true,
        });

        // Create Exporters
        const exporter1 = await ExporterModel.create({
            exporterCode: 'EXP-001',
            companyTradingName: 'Rwanda Coffee Exporters Ltd',
            companyAddress: 'KN 4 Ave, Kigali, Rwanda',
            contactPerson: 'John Doe',
            phone: '+250788111111',
            email: 'contact@rwandacoffee.rw',
            isActive: true,
        });

        const exporter2 = await ExporterModel.create({
            exporterCode: 'EXP-002',
            companyTradingName: 'Global Coffee Trading',
            companyAddress: 'Kimihurura, KG 7 Ave, Kigali, Rwanda',
            contactPerson: 'Jane Smith',
            phone: '+250788222222',
            email: 'info@globalcoffee.com',
            isActive: true,
        });

        const exporter3 = await ExporterModel.create({
            exporterCode: 'EXP-003',
            companyTradingName: 'East Africa Coffee Co',
            companyAddress: 'Remera, KG 17 Ave, Kigali, Rwanda',
            contactPerson: 'Mark Johnson',
            phone: '+250788333333',
            email: 'info@eacoffee.com',
            isActive: true,
        });

        // Create Users
        const adminPassword = await hashPassword('admin123');
        const adminUser = await UserModel.create({
            email: 'admin@cwms.rw',
            password: adminPassword,
            role: 'admin',
            name: 'System Administrator',
            phone: '+250788999999',
            isActive: true,
        });

        const supervisorPassword = await hashPassword('super123');
        const supervisorUser = await UserModel.create({
            email: 'supervisor@cwms.rw',
            password: supervisorPassword,
            role: 'supervisor',
            name: 'Facility Supervisor',
            phone: '+250788888888',
            facilityId: facility._id,
            isActive: true,
        });

        const exporterPassword = await hashPassword('exporter123');
        const exporterUser = await UserModel.create({
            email: 'exporter@rwandacoffee.rw',
            password: exporterPassword,
            role: 'exporter',
            name: 'Exporter Manager',
            phone: '+250788777777',
            exporterId: exporter1._id,
            isActive: true,
        });

        // Create Rate Cards (one per exporter)
        await RateCardModel.create({
            exporterId: exporter1._id,
            ratePerBag: 1000,
            effectiveFrom: new Date('2026-01-01'),
            isActive: true,
            createdBy: adminUser._id,
        });
        await RateCardModel.create({
            exporterId: exporter2._id,
            ratePerBag: 1200,
            effectiveFrom: new Date('2026-01-01'),
            isActive: true,
            createdBy: adminUser._id,
        });
        await RateCardModel.create({
            exporterId: exporter3._id,
            ratePerBag: 900,
            effectiveFrom: new Date('2026-01-01'),
            isActive: true,
            createdBy: adminUser._id,
        });

        // Create Workers
        const workerNames = [
            { name: 'Uwase Marie', gender: 'female' },
            { name: 'Mukamana Grace', gender: 'female' },
            { name: 'Niyonsenga Jean', gender: 'male' },
            { name: 'Habimana Paul', gender: 'male' },
            { name: 'Uwamahoro Sarah', gender: 'female' },
            { name: 'Ndayisaba Eric', gender: 'male' },
            { name: 'Mukeshimana Alice', gender: 'female' },
            { name: 'Nkurunziza David', gender: 'male' },
            { name: 'Nyiransabimana Rose', gender: 'female' },
            { name: 'Bizimana Felix', gender: 'male' },
            { name: 'Uwera Christine', gender: 'female' },
            { name: 'Nshuti Patrick', gender: 'male' },
            { name: 'Mukasine Jeanette', gender: 'female' },
            { name: 'Habimana Samuel', gender: 'male' },
            { name: 'Nyirahabimana Louise', gender: 'female' },
        ];

        const workers: any[] = [];
        for (let i = 0; i < workerNames.length; i++) {
            const coop = i % 2 === 0 ? cooperative1 : cooperative2;
            const worker = await WorkerModel.create({
                workerId: generateWorkerId(),
                fullName: workerNames[i].name,
                gender: workerNames[i].gender,
                ageRange: i % 3 === 0 ? '18-25' : i % 3 === 1 ? '26-35' : '36-50',
                phone: `+25078800${(1000 + i).toString().padStart(4, '0')}`,
                photo: 'https://via.placeholder.com/150', // Placeholder
                cooperativeId: coop._id,
                primaryRole: 'Coffee Sorter',
                status: 'active',
                consentWorkRecords: true,
                consentAnonymizedReporting: true,
                previousWorkType: i % 2 === 0 ? 'Farming' : 'Casual Labor',
                avgDaysWorkedPerMonth: 15 + (i % 10),
                typicalDailyEarnings: i % 2 === 0 ? '1000-2000 RWF' : '2000-3000 RWF',
                isPrimaryEarner: i % 3 === 0,
                householdSize: `${3 + (i % 4)}`,
            });
            workers.push(worker);
        }

        // Create historical data for the last 30 days
        const today = new Date();
        const exporters = [exporter1, exporter2, exporter3];
        const allSessions: any[] = [];
        const allAttendance: any[] = [];
        const allBags: any[] = [];

        for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
            const date = new Date(today);
            date.setDate(date.getDate() - dayOffset);
            date.setHours(0, 0, 0, 0);

            // Skip weekends randomly (some weekends have work)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (isWeekend && Math.random() > 0.3) continue;

            // Random number of workers active each day (6-12)
            const activeWorkerCount = Math.min(workers.length, 6 + Math.floor(Math.random() * 7));
            const dayWorkers = [...workers].sort(() => Math.random() - 0.5).slice(0, activeWorkerCount);

            // Create attendance for the day
            const dayAttendance: any[] = [];
            for (const worker of dayWorkers) {
                const checkInTime = new Date(date);
                checkInTime.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

                const checkOutTime = new Date(date);
                checkOutTime.setHours(15 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);

                const isToday = dayOffset === 0;
                const attendance = await AttendanceModel.create({
                    workerId: worker._id,
                    facilityId: facility._id,
                    date: date,
                    checkInTime: checkInTime,
                    status: isToday ? 'on-site' : 'checked-out',
                    ...(!isToday && { checkOutTime }),
                    supervisorId: supervisorUser._id,
                });
                dayAttendance.push(attendance);
                allAttendance.push(attendance);
            }

            // Create sessions - assign workers to exporters
            const daySessions: any[] = [];
            for (let i = 0; i < dayWorkers.length; i++) {
                const exporter = exporters[i % 3];
                const startTime = new Date(date);
                startTime.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

                const endTime = new Date(date);
                endTime.setHours(15 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

                const isToday = dayOffset === 0;
                const session = await SessionModel.create({
                    attendanceId: dayAttendance[i]._id,
                    workerId: dayWorkers[i]._id,
                    exporterId: exporter._id,
                    facilityId: facility._id,
                    date: date,
                    startTime: startTime,
                    ...(!isToday && { endTime }),
                    status: isToday ? 'active' : 'closed',
                    supervisorId: supervisorUser._id,
                });
                daySessions.push(session);
                allSessions.push(session);
            }

            // Create bags - group workers by exporter, then create bags with 2-3 workers each
            for (const exporter of exporters) {
                const exporterSessions = daySessions.filter(
                    (s: any) => s.exporterId.toString() === exporter._id.toString()
                );

                // Create bags from available workers (2-3 workers per bag)
                let idx = 0;
                while (idx + 1 < exporterSessions.length) {
                    const workerCount = Math.min(2 + Math.floor(Math.random() * 2), exporterSessions.length - idx);
                    if (workerCount < 2) break;

                    const bagWorkers = exporterSessions.slice(idx, idx + workerCount).map((s: any) => ({
                        workerId: s.workerId,
                        sessionId: s._id,
                    }));

                    const weight = 55 + Math.floor(Math.random() * 15); // 55-69 kg
                    const bag = await BagModel.create({
                        bagNumber: generateBagNumber(),
                        exporterId: exporter._id,
                        facilityId: facility._id,
                        date: date,
                        weight,
                        workers: bagWorkers,
                        status: 'completed',
                        supervisorId: supervisorUser._id,
                    });
                    allBags.push(bag);
                    idx += workerCount;
                }
            }
        }

        const bags = allBags;
        const sessions = allSessions;

        return NextResponse.json({
            success: true,
            message: 'Database seeded successfully',
            credentials: {
                admin: {
                    email: 'admin@cwms.rw',
                    password: 'admin123',
                },
                supervisor: {
                    email: 'supervisor@cwms.rw',
                    password: 'super123',
                },
                exporter: {
                    email: 'exporter@rwandacoffee.rw',
                    password: 'exporter123',
                },
            },
            data: {
                cooperatives: [cooperative1.name, cooperative2.name],
                facility: facility.name,
                exporters: [exporter1.companyTradingName, exporter2.companyTradingName, exporter3.companyTradingName],
                workers: workers.length,
                todayAttendance: allAttendance.length,
                activeSessions: sessions.length,
                bagsProcessed: bags.length,
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
