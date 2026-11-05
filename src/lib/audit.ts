import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

// Records an admin data correction in AuditLog. Failures are logged, never thrown,
// so an audit write can't block the change itself.
export async function logAudit(
    request: NextRequest,
    entry: { userId: string; action: string; entity: string; entityId: string; changes: Prisma.InputJsonValue; reason?: string },
) {
    try {
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || request.headers.get('x-real-ip')
            || 'unknown';
        await prisma.auditLog.create({ data: { ...entry, ipAddress } });
    } catch (error) {
        console.error('[Audit] Failed to record', entry.action, entry.entity, entry.entityId, error);
    }
}
