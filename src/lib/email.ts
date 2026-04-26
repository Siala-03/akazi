import nodemailer from 'nodemailer';

// Create transporter lazily to ensure env vars are available at runtime
function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
        // Increase timeout for slow connections (Render free tier)
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
}

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: { filename: string; content: Buffer; cid?: string }[];
}

export async function sendEmail({ to, subject, html, attachments }: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        const msg = 'SMTP not configured – set SMTP_EMAIL and SMTP_PASSWORD environment variables';
        console.warn('[Email]', msg);
        return { success: false, error: msg };
    }

    try {
        const transporter = getTransporter();
        await transporter.sendMail({
            from: `"Akazi Rwanda Ltd" <${process.env.SMTP_EMAIL}>`,
            to,
            subject,
            html,
            attachments,
        });
        console.log(`[Email] Sent to ${to}: ${subject}`);
        return { success: true };
    } catch (error: any) {
        const errorMsg = error?.message || 'Unknown email error';
        console.error('[Email] Failed to send to', to, ':', errorMsg);
        console.error('[Email] Full error:', error);
        return { success: false, error: errorMsg };
    }
}

export async function sendOtpEmail(to: string, otp: string, name: string): Promise<{ success: boolean; error?: string }> {
    return sendEmail({
        to,
        subject: 'Akazi Rwanda Ltd – Password Reset Code',
        html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                <div style="background:#065f46;color:white;padding:16px;border-radius:8px;text-align:center;margin-bottom:20px;">
                    <h2 style="margin:0;">Akazi Rwanda Ltd</h2>
                    <p style="margin:4px 0 0;font-size:12px;opacity:0.85;">Akazi Rwanda Ltd</p>
                </div>
                <p>Hello <strong>${name}</strong>,</p>
                <p>You requested a password reset. Use the code below:</p>
                <div style="text-align:center;margin:24px 0;">
                    <div style="display:inline-block;background:#f0fdf4;border:2px solid #065f46;border-radius:8px;padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#065f46;">
                        ${otp}
                    </div>
                </div>
                <p style="color:#6b7280;font-size:14px;">This code expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
            </div>
        `,
    });
}

export async function sendWelcomeEmail(
    to: string,
    name: string,
    tempPassword: string,
    role: string
): Promise<{ success: boolean; error?: string }> {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const loginUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
        : '/login';

    return sendEmail({
        to,
        subject: `Akazi Rwanda Ltd – Your ${roleLabel} Account Has Been Created`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                <div style="background:#065f46;color:white;padding:16px;border-radius:8px;text-align:center;margin-bottom:20px;">
                    <h2 style="margin:0;">Akazi Rwanda Ltd</h2>
                    <p style="margin:4px 0 0;font-size:12px;opacity:0.85;">Akazi Rwanda Ltd</p>
                </div>
                <p>Hello <strong>${name}</strong>,</p>
                <p>An administrator has created a <strong>${roleLabel}</strong> account for you on the Akazi Rwanda Ltd.</p>
                <p>Use the credentials below to log in:</p>
                <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:8px;padding:16px;margin:20px 0;">
                    <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Email:</strong> ${to}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Temporary Password:</strong></p>
                    <div style="background:white;border:2px solid #065f46;border-radius:6px;padding:10px 16px;text-align:center;font-family:monospace;font-size:18px;font-weight:bold;color:#065f46;letter-spacing:2px;">
                        ${tempPassword}
                    </div>
                </div>
                <p style="color:#dc2626;font-size:14px;font-weight:600;">Please change your password after your first login using the "Forgot Password" option.</p>
                <div style="text-align:center;margin:20px 0;">
                    <a href="${loginUrl}" style="display:inline-block;background:#065f46;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                        Log In Now
                    </a>
                </div>
                <p style="color:#6b7280;font-size:13px;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
                    If you did not expect this email, please contact your system administrator.
                </p>
            </div>
        `,
    });
}

export async function sendQrBadgeEmail(
    to: string,
    workerName: string,
    workerId: string,
    qrDataUrl: string
): Promise<{ success: boolean; error?: string }> {
    // Convert data URL to Buffer for attachment
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Data, 'base64');

    return sendEmail({
        to,
        subject: `Akazi Rwanda Ltd – Your Worker QR Badge`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                <div style="background:#065f46;color:white;padding:16px;border-radius:8px;text-align:center;margin-bottom:20px;">
                    <h2 style="margin:0;">Akazi Rwanda Ltd</h2>
                    <p style="margin:4px 0 0;font-size:12px;opacity:0.85;">Akazi Rwanda Ltd</p>
                </div>
                <p>Hello <strong>${workerName}</strong>,</p>
                <p>You have been registered in the Akazi Rwanda Ltd. Below is your QR badge for check-in:</p>
                <div style="text-align:center;margin:20px 0;">
                    <img src="cid:qrbadge" alt="QR Code" style="width:200px;height:200px;border:1px solid #d1fae5;border-radius:8px;" />
                </div>
                <p style="text-align:center;font-weight:bold;font-size:16px;color:#111827;">${workerName}</p>
                <p style="text-align:center;font-family:monospace;color:#6b7280;background:#f0fdf4;padding:6px 12px;border-radius:6px;display:inline-block;margin:0 auto;">ID: ${workerId}</p>
                <p style="color:#6b7280;font-size:13px;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
                    Show this QR code to your supervisor during check-in. You can also download and print it.
                </p>
            </div>
        `,
        attachments: [
            { filename: 'qr-badge.png', content: qrBuffer, cid: 'qrbadge' },
        ],
    });
}
