'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Users, UserCheck, Building2, TrendingUp,
    RefreshCw, DollarSign, BarChart2, Activity,
} from 'lucide-react';

interface ExporterRow {
    exporterId: string;
    exporterName: string;
    sessionCount: number;
    daysActive: number;
    uniqueWorkers: number;
    womenWorkers: number;
    totalAmountPaid: number;
}

interface Analytics {
    totalWorkers: number;
    totalWomen: number;
    activeWomen: number;
    totalExporters: number;
    activeExporters: number;
    totalSessions: number;
    totalWagesPaid: number;
    exporterBreakdown: ExporterRow[];
}

function fmt(n: number) {
    return `FRw ${n.toLocaleString()}`;
}

export default function NaebDashboardPage() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analytics/naeb');
            if (!res.ok) throw new Error(`Failed (${res.status})`);
            const data = await res.json();
            setAnalytics(data.analytics);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    useEffect(() => {
        const interval = setInterval(() => fetchAnalytics(true), 60000);
        return () => clearInterval(interval);
    }, [fetchAnalytics]);

    const statCards = [
        {
            label: 'Total Workers Registered',
            value: analytics?.totalWorkers ?? 0,
            sub: 'Across all cooperatives',
            icon: Users,
            border: 'border-l-emerald-500',
            iconColor: 'text-emerald-600',
            subColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Women Employed',
            value: analytics?.totalWomen ?? 0,
            sub: `${analytics?.activeWomen ?? 0} currently active`,
            icon: UserCheck,
            border: 'border-l-pink-500',
            iconColor: 'text-pink-600',
            subColor: 'text-pink-600 dark:text-pink-400',
        },
        {
            label: 'Exporters on Platform',
            value: analytics?.totalExporters ?? 0,
            sub: `${analytics?.activeExporters ?? 0} with recorded sessions`,
            icon: Building2,
            border: 'border-l-teal-500',
            iconColor: 'text-teal-600',
            subColor: 'text-teal-600 dark:text-teal-400',
        },
        {
            label: 'Total Worker-Days',
            value: analytics?.totalSessions ?? 0,
            sub: 'Cumulative sessions logged',
            icon: Activity,
            border: 'border-l-orange-500',
            iconColor: 'text-orange-600',
            subColor: 'text-orange-600 dark:text-orange-400',
        },
        {
            label: 'Total Wages Paid',
            value: fmt(analytics?.totalWagesPaid ?? 0),
            sub: 'Cumulative all time',
            icon: DollarSign,
            border: 'border-l-green-500',
            iconColor: 'text-green-600',
            subColor: 'text-green-600 dark:text-green-400',
        },
    ];

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-8 shadow-xl shadow-emerald-500/20">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                </div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300/20 rounded-full blur-3xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">NAEB Overview</h1>
                        <p className="text-white/80 text-base mt-1">Akazi — Coffee Sorting Workforce Summary</p>
                        {lastUpdated && (
                            <p className="text-xs text-white/60 mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
                        )}
                    </div>
                    <button
                        onClick={() => fetchAnalytics(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 font-medium transition-all disabled:opacity-50 shadow-lg self-start sm:self-auto"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
            )}

            {/* Stat Cards — row 1: 3 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statCards.slice(0, 3).map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className={`relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 ${card.border} border-t border-r border-b border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:-translate-y-1 transition-all`}>
                            <div className="flex items-center justify-between mb-3">
                                <Icon className={`w-6 h-6 ${card.iconColor}`} />
                                <TrendingUp className="w-4 h-4 text-gray-300" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">{card.label}</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                {loading ? '—' : card.value}
                            </p>
                            <p className={`mt-1 text-xs font-medium ${card.subColor}`}>{card.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Stat Cards — row 2: last 2 cards full width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {statCards.slice(3).map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className={`relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 ${card.border} border-t border-r border-b border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:-translate-y-1 transition-all`}>
                            <div className="flex items-center justify-between mb-3">
                                <Icon className={`w-6 h-6 ${card.iconColor}`} />
                                <TrendingUp className="w-4 h-4 text-gray-300" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">{card.label}</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                {loading ? '—' : card.value}
                            </p>
                            <p className={`mt-1 text-xs font-medium ${card.subColor}`}>{card.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Exporter Breakdown Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <BarChart2 className="w-5 h-5 text-teal-600" />
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Exporter Activity Breakdown</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Frequency, workers, women, and amounts paid — all time</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-[#162032]">
                            <tr>
                                {['Exporter', 'Days Active', 'Total Sessions', 'Workers Engaged', 'Women Workers', 'Amount Paid (FRw)'].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/40">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4">
                                                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-20" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : analytics?.exporterBreakdown.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                                        No exporter session data recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                analytics?.exporterBreakdown.map((row) => (
                                    <tr key={row.exporterId} className="group bg-white dark:bg-[#1e293b] transition-all duration-150 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 hover:shadow-[inset_3px_0_0_0_#10b981]">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{row.exporterName}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">{row.daysActive}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">{row.sessionCount.toLocaleString()}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{row.uniqueWorkers}</td>
                                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{row.womenWorkers}</td>
                                        <td className="px-5 py-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                            {fmt(Math.round(row.totalAmountPaid))}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {!loading && analytics && analytics.exporterBreakdown.length > 0 && (
                            <tfoot className="bg-gray-50 dark:bg-[#162032] border-t-2 border-gray-200 dark:border-gray-600">
                                <tr>
                                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white">TOTAL</td>
                                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white">
                                        {analytics.exporterBreakdown.reduce((s, r) => s + r.daysActive, 0)}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white">
                                        {analytics.totalSessions.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white">
                                        {analytics.exporterBreakdown.reduce((s, r) => s + r.uniqueWorkers, 0)}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white">
                                        {analytics.exporterBreakdown.reduce((s, r) => s + r.womenWorkers, 0)}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                        {fmt(Math.round(analytics.totalWagesPaid))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
