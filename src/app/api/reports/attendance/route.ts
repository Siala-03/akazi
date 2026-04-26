import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AttendanceModel from '@/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || !['supervisor', 'admin'].includes(currentUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const workerId = searchParams.get('workerId');

        let query: any = {};

        // Date range filter
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Worker filter
        if (workerId) {
            query.workerId = workerId;
        }

        const attendance = await AttendanceModel.find(query)
            .populate('workerId')
            .populate('facilityId')
            .sort({ date: -1 });

        // Calculate statistics
        const totalDays = attendance.length;
        const checkedOut = attendance.filter((a: any) => a.status === 'checked-out').length;
        const onSite = attendance.filter((a: any) => a.status === 'on-site').length;

        // Group by worker
        const workerStats: any = {};
        attendance.forEach((record: any) => {
            const workerId = record.workerId._id.toString();
            if (!workerStats[workerId]) {
                workerStats[workerId] = {
                    worker: record.workerId,
                    totalDays: 0,
                    checkedOutDays: 0,
                };
            }
            workerStats[workerId].totalDays++;
            if (record.status === 'checked-out') {
                workerStats[workerId].checkedOutDays++;
            }
        });

        return NextResponse.json({
            attendance,
            summary: {
                totalRecords: totalDays,
                checkedOut,
                onSite,
                uniqueWorkers: Object.keys(workerStats).length,
            },
            workerStats: Object.values(workerStats),
        });
    } catch (error) {
        console.error('Attendance report error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
