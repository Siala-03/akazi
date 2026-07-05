'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Users, QrCode, MousePointer, Clock, Wifi, WifiOff } from 'lucide-react';
import Image from 'next/image';

type OnSiteWorker = {
    sessionId: string;
    workerId: string;
    workerName: string;
    phone: string;
    photo: string;
    gender: string;
    checkInTime: string;
    durationMinutes: number;
    checkInMethod: string;
};

type OnSiteData = {
    onSiteCount: number;
    qrCount: number;
    manualCount: number;
    workers: OnSiteWorker[];
    asOf: string;
};

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ExporterOnSitePage() {
    const [data, setData] = useState<OnSiteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [isLive, setIsLive] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchOnSite = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            const res = await fetch('/api/exporter/on-site');
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.error || 'Failed to load live data');
            setData(payload);
            setLastRefreshed(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load on-site data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchOnSite();
    }, [fetchOnSite]);

    useEffect(() => {
        if (isLive) {
            intervalRef.current = setInterval(() => fetchOnSite(true), 30000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isLive, fetchOnSite]);

    // Update durations every minute without a full refetch
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => n + 1), 60000);
        return () => clearInterval(t);
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchOnSite();
    };

    const workers = data?.workers ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-2xl p-8 shadow-xl shadow-emerald-500/20">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white">Live On-Site View</h1>
                        </div>
                        <p className="text-white/80 text-sm">Workers currently active at the warehouse — auto-refreshes every 30 seconds</p>
                        {lastRefreshed && (
                            <p className="text-white/60 text-xs mt-1">Last updated: {lastRefreshed.toLocaleTimeString()}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsLive((v) => !v)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
                                isLive
                                    ? 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                                    : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
                            }`}
                        >
                            {isLive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                            {isLive ? 'Live' : 'Paused'}
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 font-medium text-sm transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total On-Site</p>
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                            <Users className="w-4 h-4 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{loading ? '—' : (data?.onSiteCount ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">active sessions today</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">QR Check-ins</p>
                        <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                            <QrCode className="w-4 h-4 text-teal-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{loading ? '—' : (data?.qrCount ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">verified by QR scan</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manual Check-ins</p>
                        <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                            <MousePointer className="w-4 h-4 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{loading ? '—' : (data?.manualCount ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">entered by supervisor</p>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Workers Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Workers Currently On-Site</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/70">
                            <tr>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Worker</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Check-in</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading live data...</td>
                                </tr>
                            ) : workers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No workers currently on-site for your account</p>
                                    </td>
                                </tr>
                            ) : (
                                workers.map((w) => {
                                    const elapsed = Math.floor((Date.now() - new Date(w.checkInTime).getTime()) / 60000);
                                    return (
                                        <tr key={w.sessionId} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    {w.photo ? (
                                                        <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/40">
                                                            <Image src={w.photo} alt={w.workerName} fill className="object-cover" sizes="36px" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 text-white text-sm font-semibold">
                                                            {w.workerName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{w.workerName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 font-mono">{w.workerId}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">{w.phone || '—'}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{formatTime(w.checkInTime)}</td>
                                            <td className="px-4 py-2.5">
                                                <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                    {formatDuration(elapsed)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {w.checkInMethod === 'qr' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                                                        <QrCode className="w-3 h-3" />
                                                        QR
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                                        <MousePointer className="w-3 h-3" />
                                                        Manual
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
