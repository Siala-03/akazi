'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export function ImpersonationBanner() {
    const router = useRouter();
    const [impersonatorEmail, setImpersonatorEmail] = useState<string | null>(null);
    const [returning, setReturning] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(data => setImpersonatorEmail(data.impersonatorEmail ?? null))
            .catch(() => {});
    }, []);

    if (!impersonatorEmail) return null;

    const handleReturn = async () => {
        setReturning(true);
        try {
            const res = await fetch('/api/admin/impersonate', { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) window.location.href = data.redirectUrl;
        } finally {
            setReturning(false);
        }
    };

    return (
        <div className="sticky top-16 z-40 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-md">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Viewing as this exporter — signed in by {impersonatorEmail}</span>
            <button
                onClick={handleReturn}
                disabled={returning}
                className="ml-2 px-3 py-1 bg-amber-950 text-amber-50 rounded-md text-xs font-semibold hover:bg-amber-900 transition-colors disabled:opacity-50"
            >
                {returning ? 'Returning…' : 'Return to admin'}
            </button>
        </div>
    );
}
