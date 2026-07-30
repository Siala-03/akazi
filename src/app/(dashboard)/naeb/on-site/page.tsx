'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Users, QrCode, MousePointer, Wifi, WifiOff, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

type ExporterOnSite = {
    exporterId: string;
    exporterName: string;
    count: number;
};

type OnSiteData = {
    onSiteCount: number;
    qrCount: number;
    manualCount: number;
    exporterBreakdown: ExporterOnSite[];
    asOf: string;
};

export default function NaebOnSitePage() {
    const [data, setData] = useState<OnSiteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [isLive, setIsLive] = useState(true);
    const [breakdownPage, setBreakdownPage] = useState(1);
    const [breakdownPageSize, setBreakdownPageSize] = useState(10);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchOnSite = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            const res = await fetch('/api/naeb/on-site');
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

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchOnSite();
    };

    const exporters = data?.exporterBreakdown ?? [];
    const totalOnSite = data?.onSiteCount ?? 0;
    const totalBreakdownPages = Math.max(1, Math.ceil(exporters.length / breakdownPageSize));
    const safeBreakdownPage = Math.min(breakdownPage, totalBreakdownPages);
    const paginatedExporters = exporters.slice(
        (safeBreakdownPage - 1) * breakdownPageSize,
        safeBreakdownPage * breakdownPageSize
    );

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
                        <p className="text-white/80 text-sm">Casual workers currently in the sorting warehouse — auto-refreshes every 30 seconds</p>
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
                    <p className="text-xs text-gray-400 mt-1">workers currently in the warehouse</p>
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

            {/* Breakdown by Exporter */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Distribution by Exporter</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="p-6 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700/40 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-[#162032]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exporter</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workers On-Site</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/40">
                                    {exporters.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center">
                                                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">No workers currently on-site</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedExporters.map((e) => (
                                            <tr key={e.exporterId} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                                                            <Building2 className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{e.exporterName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{e.count}</td>
                                                <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                    {totalOnSite > 0 ? `${Math.round((e.count / totalOnSite) * 100)}%` : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {exporters.length > 0 && (
                            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Showing {(safeBreakdownPage - 1) * breakdownPageSize + 1}–{Math.min(safeBreakdownPage * breakdownPageSize, exporters.length)} of {exporters.length} exporters
                                    </p>
                                    <select
                                        value={breakdownPageSize}
                                        onChange={e => { setBreakdownPageSize(Number(e.target.value)); setBreakdownPage(1); }}
                                        className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    >
                                        <option value={10}>10 / page</option>
                                        <option value={25}>25 / page</option>
                                        <option value={50}>50 / page</option>
                                        <option value={100}>100 / page</option>
                                    </select>
                                </div>
                                {totalBreakdownPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setBreakdownPage(1)} disabled={safeBreakdownPage === 1} className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
                                        <button onClick={() => setBreakdownPage(p => Math.max(1, p - 1))} disabled={safeBreakdownPage === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            <ChevronLeft className="w-4 h-4" /> Prev
                                        </button>
                                        <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{safeBreakdownPage} / {totalBreakdownPages}</span>
                                        <button onClick={() => setBreakdownPage(p => Math.min(totalBreakdownPages, p + 1))} disabled={safeBreakdownPage === totalBreakdownPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setBreakdownPage(totalBreakdownPages)} disabled={safeBreakdownPage === totalBreakdownPages} className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
