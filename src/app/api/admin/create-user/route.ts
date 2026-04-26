import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserModel from '@/models/User';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        const { email, name, phone, role, exporterId, facilityId } = body;

        if (!email || !name || !phone || !role) {
            return NextResponse.json(
                { error: 'Missing required fields: email, name, phone, role' },
                { status: 400 }
            );
        }

        if (!['supervisor', 'exporter'].includes(role)) {
            return NextResponse.json(
                { error: 'Role must be supervisor or exporter' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'A user with this email already exists' },
                { status: 409 }
            );
        }

        // Generate a temporary random password
        const tempPassword = crypto.randomBytes(6).toString('hex'); // 12-char random password
        const hashedPassword = await hashPassword(tempPassword);

        const user = await UserModel.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            phone,
            role,
            exporterId: exporterId || undefined,
            facilityId: facilityId || undefined,
            isActive: true,
        });

        // Send welcome email with temporary password
        let emailSent = false;
        let emailError = '';
        try {
            const emailResult = await sendWelcomeEmail(user.email, user.name, tempPassword, role);
            emailSent = emailResult.success;
            if (!emailResult.success) {
                emailError = emailResult.error || 'Unknown error';
                console.error('[Admin Create User] Welcome email failed:', emailError);
            }
        } catch (emailErr) {
            emailError = emailErr instanceof Error ? emailErr.message : 'Unknown error';
            console.error('[Admin Create User] Welcome email failed (non-blocking):', emailErr);
        }

        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                phone: user.phone,
            },
            message: emailSent
                ? `${roleLabel} account created. Login credentials sent to ${user.email}.`
                : `${roleLabel} account created but email failed: ${emailError}. Temporary password: ${tempPassword}`,
            emailFailed: !emailSent,
            tempPassword: !emailSent ? tempPassword : undefined,
        }, { status: 201 });
    } catch (error) {
        console.error('[Admin Create User] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET - List users by role (for admin management)
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const all = searchParams.get('all') === 'true';

        const query: any = {};
        if (role) query.role = role;
        if (!all) query.isActive = true;

        const users = await UserModel.find(query)
            .select('-password -resetOtp -resetOtpExpiry')
            .sort({ createdAt: -1 });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('[Admin Get Users] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Update user status (activate/deactivate)
export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { userId, isActive } = await request.json();

        if (!userId || typeof isActive !== 'boolean') {
            return NextResponse.json(
                { error: 'userId and isActive are required' },
                { status: 400 }
            );
        }

        const user = await UserModel.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        ).select('-password -resetOtp -resetOtpExpiry');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('[Admin Update User] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
