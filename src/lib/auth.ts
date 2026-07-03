import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return secret;
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: 'supervisor' | 'admin' | 'exporter' | 'naeb';
    exporterId?: string;
    facilityId?: string;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Verify password against hashed password
 */
export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
    return token;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
        console.log('[Auth] Token verified successfully for user:', decoded.email);
        return decoded;
    } catch (error) {
        console.error('[Auth] Token verification failed:', error instanceof Error ? error.message : error);
        return null;
    }
}

/**
 * Get current user from cookie
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        return null;
    }

    return verifyToken(token);
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

/**
 * Remove authentication cookie
 */
export async function removeAuthCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete('token');
}

/**
 * Check if user has required role
 */
export function hasRole(user: JWTPayload | null, roles: string[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
}
