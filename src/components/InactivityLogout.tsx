'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = 'akazi_last_activity';
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

        const scheduleCheck = () => {
            if (timer.current) clearTimeout(timer.current);
            const last = Number(localStorage.getItem(STORAGE_KEY) ?? Date.now());
            const elapsed = Date.now() - last;
            const remaining = INACTIVITY_MS - elapsed;
            if (remaining <= 0) {
                logout();
            } else {
                timer.current = setTimeout(logout, remaining);
            }
        };

        // Write shared timestamp on any activity
        const onActivity = () => {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
            scheduleCheck();
        };

        // Another tab updated localStorage — re-sync the timer
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) scheduleCheck();
        };

        EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
        window.addEventListener('storage', onStorage);

        // Initialise timestamp if not present, then start timer
        if (!localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        }
        scheduleCheck();

        return () => {
            if (timer.current) clearTimeout(timer.current);
            EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
            window.removeEventListener('storage', onStorage);
        };
    }, [router]);

    return null;
}
