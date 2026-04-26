import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: currentUser.userId },
            select: {
                id: true, email: true, name: true, phone: true, role: true,
                profilePicture: true, exporterId: true, facilityId: true,
                isActive: true, createdAt: true, updatedAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user: { ...user, _id: user.id } });
    } catch (error) {
        console.error('Get current user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { name, phone, profilePicture } = body;

        const data: any = {};
        if (name) data.name = name;
        if (phone) data.phone = phone;
        if (profilePicture) data.profilePicture = profilePicture;

        const user = await prisma.user.update({
            where: { id: currentUser.userId },
            data,
            select: {
                id: true, email: true, name: true, phone: true, role: true,
                profilePicture: true, exporterId: true, facilityId: true,
                isActive: true, createdAt: true, updatedAt: true,
            },
        });

        return NextResponse.json({ success: true, user: { ...user, _id: user.id } });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
