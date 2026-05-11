'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, X, ClipboardList, Calendar } from 'lucide-react';

interface Alert {
    type: 'worker-requests' | 'payroll';
    message: string;
    href: string;
    count?: number;
}

export function AdminTopbarExtras() {
    const router = useRouter();
    const [searchValue, setSearchValue] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [showAlerts, setShowAlerts] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const alertPanelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAlerts();
    }, []);

    useEffect(() => {
        if (showSearch) searchRef.current?.focus();
    }, [showSearch]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (alertPanelRef.current && !alertPanelRef.current.contains(e.target as Node)) {
                setShowAlerts(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchAlerts = async () => {
        const newAlerts: Alert[] = [];
        try {
            const res = await fetch('/api/admin/worker-requests');
            if (res.ok) {
                const data = await res.json();
                const pending = (data.requests || []).filter((r: any) => r.status === 'pending');
                if (pending.length > 0) {
                    newAlerts.push({
                        type: 'worker-requests',
                        message: `${pending.length} worker request${pending.length > 1 ? 's' : ''} pending approval`,
                        href: '/admin/worker-requests',
                        count: pending.length,
                    });
                }
            }
        } catch { /* silent */ }

        // Payroll reminder on Fridays
        if (new Date().getDay() === 5) {
            newAlerts.push({
                type: 'payroll',
                message: "It's Friday — payroll disbursement day",
                href: '/admin/payroll',
            });
        }
        setAlerts(newAlerts);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        router.push(`/admin/workers?q=${encodeURIComponent(searchValue.trim())}`);
        setSearchValue('');
        setShowSearch(false);
    };

    return (
        <div className="flex items-center gap-1">
            {/* Search */}
            {showSearch ? (
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        placeholder="Search workers..."
                        className="w-48 sm:w-64 px-3 py-1.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:bg-white/20 transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => { setShowSearch(false); setSearchValue(''); }}
                        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </form>
            ) : (
                <button
                    onClick={() => setShowSearch(true)}
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Search workers"
                >
                    <Search className="w-4 h-4" />
                </button>
            )}

            {/* Notification bell */}
            <div ref={alertPanelRef} className="relative">
                <button
                    onClick={() => setShowAlerts(!showAlerts)}
                    className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Alerts"
                >
                    <Bell className="w-4 h-4" />
                    {alerts.length > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
                    )}
                </button>

                {showAlerts && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Alerts</p>
                        </div>
                        {alerts.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                No alerts right now
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {alerts.map((alert, i) => (
                                    <li key={i}>
                                        <button
                                            onClick={() => { router.push(alert.href); setShowAlerts(false); }}
                                            className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.type === 'payroll' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                                {alert.type === 'payroll'
                                                    ? <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                    : <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                }
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{alert.message}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
