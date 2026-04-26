import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BagModel from '@/models/Bag';
import SessionModel from '@/models/Session';
import { getCurrentUser } from '@/lib/auth';
import { getStartOfDay, getEndOfDay } from '@/lib/utils';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const today = new Date();
        const startOfDay = getStartOfDay(today);
        const endOfDay = getEndOfDay(today);

        // Parallel queries for better performance
        const [bagsToday, sessionsToday, exportersToday] = await Promise.all([
            // All bags today
            BagModel.find({
                date: { $gte: startOfDay, $lte: endOfDay },
            }).select('workers weight'),

            // Sessions today (for hours calculation)
            SessionModel.find({
                date: { $gte: startOfDay, $lte: endOfDay },
            }).select('startTime endTime status'),

            // Unique exporters served today
            BagModel.distinct('exporterId', {
                date: { $gte: startOfDay, $lte: endOfDay },
            }),
        ]);

        // Calculate total kilograms (bags × 60kg)
        const totalKilogramsToday = bagsToday.length * 60;

        // Calculate average workers per bag
        let avgWorkersPerBag = 0;
        if (bagsToday.length > 0) {
            const totalWorkersAcrossBags = bagsToday.reduce((sum: number, bag: any) => {
                return sum + (bag.workers?.length || 0);
            }, 0);
            avgWorkersPerBag = totalWorkersAcrossBags / bagsToday.length;
        }

        // Calculate total hours worked today
        let totalHoursToday = 0;
        sessionsToday.forEach((session: any) => {
            if (session.endTime) {
                const hours = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHoursToday += hours;
            } else if (session.status === 'active') {
                // For active sessions, calculate up to now
                const hours = (Date.now() - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
                totalHoursToday += hours;
            }
        });

        const metrics = {
            bagsToday: bagsToday.length,
            totalKilogramsToday,
            avgWorkersPerBag: Math.round(avgWorkersPerBag * 10) / 10,
            totalHoursToday: Math.round(totalHoursToday * 10) / 10,
            exportersServedToday: exportersToday.length,
        };

        return NextResponse.json({ metrics });
    } catch (error) {
        console.error('Get operations metrics error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
