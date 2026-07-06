'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function InactivityLogout() {
    const router = useRouter();
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const logout = async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        };

        const reset = () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(logout, INACTIVITY_MS);
        };

        EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
        reset();

        return () => {
            if (timer.current) clearTimeout(timer.current);
            EVENTS.forEach((e) => window.removeEventListener(e, reset));
        };
    }, [router]);

    return null;
}
