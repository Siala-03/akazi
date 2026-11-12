import prisma from '@/lib/prisma';

// Checked against the database on every request (not the login token), so an admin
// granting or revoking access takes effect immediately.
export async function isSuperSupervisor(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true, isSuperSupervisor: true },
    });
    return !!user && user.role === 'supervisor' && user.isActive && user.isSuperSupervisor;
}

/** Today's calendar day in Rwanda (UTC+2), as YYYY-MM-DD */
export function kigaliToday(): string {
    return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
