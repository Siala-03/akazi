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

        const { userId, email } = await request.json();

        if (!userId && !email) {
            return NextResponse.json({ error: 'userId or email is required' }, { status: 400 });
        }

        const user = userId
            ? await UserModel.findById(userId)
            : await UserModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate new temporary password
        const tempPassword = crypto.randomBytes(6).toString('hex');
        const hashedPassword = await hashPassword(tempPassword);

        user.password = hashedPassword;
        await user.save();

        // Send welcome email with new credentials
        const emailResult = await sendWelcomeEmail(user.email, user.name, tempPassword, user.role);

        if (!emailResult.success) {
            // Password was already reset, but email failed
            console.error('[Admin Resend Credentials] Email failed:', emailResult.error);
            return NextResponse.json({
                message: `Password was reset but email delivery failed: ${emailResult.error}. New temporary password: ${tempPassword}`,
                emailFailed: true,
                tempPassword,
            });
        }

        return NextResponse.json({
            message: `New login credentials sent to ${user.email}`,
        });
    } catch (error) {
        console.error('[Admin Resend Credentials] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
