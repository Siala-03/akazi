import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, name, phone, role, exporterId, facilityId } = await request.json();

        if (!email || !name || !phone || !role) {
            return NextResponse.json({ error: 'Missing required fields: email, name, phone, role' }, { status: 400 });
        }
        if (!['supervisor', 'exporter', 'naeb'].includes(role)) {
            return NextResponse.json({ error: 'Role must be supervisor, exporter, or naeb' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
        }

        const tempPassword = crypto.randomBytes(6).toString('hex');
        const hashedPassword = await hashPassword(tempPassword);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name,
                phone,
                role,
                exporterId: exporterId || null,
                facilityId: facilityId || null,
                isActive: true,
            },
        });

        let emailSent = false;
        let emailError = '';
        try {
            const result = await sendWelcomeEmail(user.email, user.name, tempPassword, role);
            emailSent = result.success;
            if (!result.success) emailError = result.error || 'Unknown error';
        } catch (e) {
            emailError = e instanceof Error ? e.message : 'Unknown error';
        }

        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        return NextResponse.json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
            message: emailSent
                ? `${roleLabel} account created. Login credentials sent to ${user.email}.`
                : `${roleLabel} account created but email failed: ${emailError}. Temporary password: ${tempPassword}`,
            emailFailed: !emailSent,
            tempPassword: !emailSent ? tempPassword : undefined,
        }, { status: 201 });
    } catch (error) {
        console.error('[Admin Create User] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const all = searchParams.get('all') === 'true';

        const where: any = {};
        if (role) where.role = role;
        if (!all) where.isActive = true;

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true, email: true, name: true, phone: true, role: true,
                profilePicture: true, exporterId: true, facilityId: true,
                isActive: true, createdAt: true, updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ users: users.map(u => ({ ...u, _id: u.id })) });
    } catch (error) {
        console.error('[Admin Get Users] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, isActive } = await request.json();
        if (!userId || typeof isActive !== 'boolean') {
            return NextResponse.json({ error: 'userId and isActive are required' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { isActive },
            select: {
                id: true, email: true, name: true, phone: true, role: true,
                exporterId: true, facilityId: true, isActive: true, createdAt: true, updatedAt: true,
            },
        });

        return NextResponse.json({ user: { ...user, _id: user.id } });
    } catch (error) {
        console.error('[Admin Update User] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.role === 'admin') {
            return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
        }

        await prisma.user.delete({ where: { id: userId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Admin Delete User] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
