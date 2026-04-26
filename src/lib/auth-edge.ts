import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable');
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: 'supervisor' | 'admin' | 'exporter';
    exporterId?: string;
    facilityId?: string;
}

/**
 * Verify JWT token (Edge runtime compatible)
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        
        console.log('[Auth Edge] Token verified successfully for user:', payload.email);
        
        return {
            userId: payload.userId as string,
            email: payload.email as string,
            role: payload.role as 'supervisor' | 'admin' | 'exporter',
            exporterId: payload.exporterId as string | undefined,
            facilityId: payload.facilityId as string | undefined,
        };
    } catch (error) {
        console.error('[Auth Edge] Token verification failed:', error instanceof Error ? error.message : error);
        return null;
    }
}

/**
 * Generate JWT token (Edge runtime compatible)
 */
export async function generateTokenEdge(payload: JWTPayload): Promise<string> {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    // Convert expires in to seconds
    let expirationTime: string | number = '7d';
    if (expiresIn.endsWith('d')) {
        expirationTime = `${parseInt(expiresIn) * 24 * 60 * 60}s`;
    } else if (expiresIn.endsWith('h')) {
        expirationTime = `${parseInt(expiresIn) * 60 * 60}s`;
    } else {
        expirationTime = expiresIn;
    }

    const token = await new SignJWT({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        exporterId: payload.exporterId,
        facilityId: payload.facilityId,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(expirationTime)
        .sign(secret);

    return token;
}
