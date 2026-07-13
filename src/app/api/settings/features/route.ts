import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await getSettings();

        return NextResponse.json({
            supervisorCanEditWorkers: settings.supervisorCanEditWorkers,
        });
    } catch (error) {
        console.error('Get features error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
