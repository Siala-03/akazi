import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/'];

// Role-based route access
const routeAccess: Record<string, string[]> = {
    '/supervisor': ['supervisor', 'admin'],
    '/admin': ['admin'],
    '/exporter': ['exporter', 'admin'],
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Debug: Check if JWT_SECRET is available
    console.log('[Middleware] JWT_SECRET available:', !!process.env.JWT_SECRET);

    // 1. Check if token exists and is valid
    const token = request.cookies.get('token')?.value;

    // Debug: Show token details
    if (token) {
        console.log('[Middleware] Token found, length:', token.length, 'first 20 chars:', token.substring(0, 20));
    }

    const user = token ? await verifyTokenEdge(token) : null;

    // Debug logging
    console.log('[Middleware]', pathname, '- Token exists:', !!token, '- User:', user?.email || 'none', '- Role:', user?.role || 'none');

    // 2. If user is logged in and trying to access login/signup pages, redirect to dashboard
    if (user && (pathname === '/login' || pathname === '/signup')) {
        console.log('[Middleware] Authenticated user accessing auth page, redirecting to dashboard');
        const dashboardUrl = new URL(`/${user.role}/dashboard`, request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    // 3. Allow public routes for non-authenticated users
    if (publicRoutes.some((route) => pathname === route)) {
        return NextResponse.next();
    }

    // 4. No valid user - redirect to login (except for public routes)
    if (!user) {
        console.log('[Middleware] No authenticated user, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        // Only set callback for protected routes, not for root
        if (pathname !== '/') {
            loginUrl.searchParams.set('callbackUrl', pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    // 5. Check role-based access for authenticated users
    for (const [route, allowedRoles] of Object.entries(routeAccess)) {
        if (pathname.startsWith(route)) {
            if (!allowedRoles.includes(user.role)) {
                console.log('[Middleware] User role not authorized for route, redirecting');
                // Unauthorized - redirect to appropriate dashboard
                const dashboardUrl = new URL(`/${user.role}/dashboard`, request.url);
                return NextResponse.redirect(dashboardUrl);
            }
        }
    }

    console.log('[Middleware] Access granted to', pathname);
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - uploads (uploaded files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
    ],
};
