'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';

// Superadmin-only, view-only "view as this user" (see /api/admin/impersonate).
export function useIsSuperAdmin() {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setIsSuperAdmin(!!data.user?.isSuperAdmin))
            .catch(() => {});
    }, []);
    return isSuperAdmin;
}

export function ViewAsButton({ userId, name }: { userId: string; name: string }) {
    const [starting, setStarting] = useState(false);

    const handleClick = async () => {
        setStarting(true);
        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to view as ${name}`);
            window.location.href = data.redirectUrl;
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to view as ${name}`);
            setStarting(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={starting}
            title={`View as ${name} (view-only)`}
            className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors disabled:opacity-50"
        >
            <LogIn className="w-4 h-4" strokeWidth={2.5} />
        </button>
    );
}
