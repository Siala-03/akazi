'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Download, RefreshCw, Users, DollarSign, QrCode, MousePointer } from 'lucide-react';
import Image from 'next/image';

type DailyWorkerRow = {
    workerName: string;
    workerId: string;
    phone: string;
    photo: string;
    checkInTime: string;
    assignmentTime: string;
    checkoutTime: string | null;
    sessionStatus: string;
    checkInMethod: string;
    totalBags: number;
    totalPayout: number;
    sessionCount: number;
};

type DailyWorkersResponse = {
    rangeStart: string | null;
    rangeEnd: string | null;
    exporterDailyRate: number;
    totals: {
        workers: number;
        totalBags: number;
        totalPayout: number;
    };
    workers: DailyWorkerRow[];
};

type FilterMode = 'day' | 'week';

function todayDateInputValue() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function currentWeekInputValue() {
    const now = new Date();
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function weekRangeFromInput(weekValue: string) {
    const match = weekValue.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const week = Number(match[2]);
    const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    const dayOfWeek = simple.getUTCDay() || 7;
    const monday = new Date(simple);
    monday.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    return {
        startDate: monday.toISOString().slice(0, 10),
        endDate: sunday.toISOString().slice(0, 10),
    };
}

function formatTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatMoney(value: number) {
    return `RWF ${value.toLocaleString()}`;
}

function formatRange(start: string | null, end: string | null) {
    if (!start || !end) return 'No range';
    if (start === end) return start;
    return `${start} to ${end}`;
}

export default function ExporterDailyWorkersPage() {
    const [filterMode, setFilterMode] = useState<FilterMode>('day');
    const [selectedDate, setSelectedDate] = useState(todayDateInputValue());
    const [selectedWeek, setSelectedWeek] = useState(currentWeekInputValue());
    const [data, setData] = useState<DailyWorkersResponse>({
        rangeStart: null,
        rangeEnd: null,
        exporterDailyRate: 0,
        totals: { workers: 0, totalBags: 0, totalPayout: 0 },
        workers: [],
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDailyWorkers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (filterMode === 'week') {
                const range = weekRangeFromInput(selectedWeek);
                if (!range) throw new Error('Invalid week selected');
                params.set('startDate', range.startDate);
                params.set('endDate', range.endDate);
            } else {
                params.set('date', selectedDate);
            }

            const res = await fetch(`/api/exporter/daily-workers?${params.toString()}`);
            const payload = await res.json().catch(() => ({}));

            if (!res.ok) {
                const details = payload?.details ? ` (${payload.details})` : '';
                throw new Error((payload?.error || `Failed to load data (${res.status})`) + details);
            }

            setData(payload as DailyWorkersResponse);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load worker daily data');
        } finally {
            setLoading(false);
        }
    }, [filterMode, selectedDate, selectedWeek]);

    useEffect(() => {
        fetchDailyWorkers();
    }, [fetchDailyWorkers]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDailyWorkers();
        setRefreshing(false);
    };

    const qrCount = data.workers.filter((w) => w.checkInMethod === 'qr').length;
    const manualCount = data.workers.filter((w) => w.checkInMethod === 'manual').length;

    const csvContent = useMemo(() => {
        const header = 'Worker Name,Worker ID,Phone,Check-in Time,Assignment Time,Checkout Time,Check-in Method,Session Status,Session Count,Total Bags,Total Payout (RWF)';
        const rows = data.workers.map((row) => [
            row.workerName,
            row.workerId,
            row.phone,
            formatTime(row.checkInTime),
            formatTime(row.assignmentTime),
            formatTime(row.checkoutTime),
            row.checkInMethod,
            row.sessionStatus,
            String(row.sessionCount),
            String(row.totalBags),
            String(row.totalPayout),
        ]);

        return [header, ...rows.map((r) => r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))].join('\n');
    }, [data.workers]);

    const exportCsv = () => {
        if (data.workers.length === 0) return;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exporter_workers_${data.rangeStart || selectedDate}_${data.rangeEnd || selectedDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header card */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 shadow-sm">
                {/* Title row */}
                <div className="mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Daily Workers</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Worker activity and payout summary — including check-in method for fraud verification.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Period: {formatRange(data.rangeStart, data.rangeEnd)}
                    </p>
                </div>

                {/* Controls row — wraps cleanly at every breakpoint */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Day / Week toggle */}
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shrink-0">
                        <button
                            onClick={() => setFilterMode('day')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${filterMode === 'day' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => setFilterMode('week')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${filterMode === 'week' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Week
                        </button>
                    </div>

                    {/* Date / week picker */}
                    {filterMode === 'day' ? (
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer">
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none min-w-0"
                            />
                        </label>
                    ) : (
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer">
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                type="week"
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none min-w-0"
                            />
                        </label>
                    )}

                    {/* Push action buttons to the right on wider screens */}
                    <div className="flex-1" />

                    {/* Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    {/* Export CSV */}
                    <button
                        onClick={exportCsv}
                        disabled={data.workers.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Workers</p>
                        <Users className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totals.workers}</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Total Cost</p>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatMoney(data.totals.totalPayout)}</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">QR Verified</p>
                        <QrCode className="w-4 h-4 text-teal-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{loading ? '—' : qrCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">of {data.totals.workers} workers</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Manual Entry</p>
                        <MousePointer className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{loading ? '—' : manualCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">supervisor entered</p>
                </div>
            </div>


            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Workers table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full table-compact">
                        <thead className="bg-gray-50 dark:bg-gray-800/70">
                            <tr>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Worker</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Worker ID</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Check-in</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Assigned</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Checkout</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Payout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">
                                        Loading worker report...
                                    </td>
                                </tr>
                            ) : data.workers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">
                                        No worker activity found for this selection.
                                    </td>
                                </tr>
                            ) : (
                                data.workers.map((row) => (
                                    <tr key={`${row.workerId}-${row.assignmentTime}`} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                {row.photo?.startsWith('http') ? (
                                                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/40">
                                                        <Image src={row.photo} alt={row.workerName} fill className="object-cover" sizes="32px" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 text-white text-xs font-semibold">
                                                        {row.workerName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.workerName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 font-mono">{row.workerId}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">{row.phone || '—'}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.checkInTime)}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.assignmentTime)}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.checkoutTime)}</td>
                                        <td className="px-4 py-2.5">
                                            {row.checkInMethod === 'qr' ? (
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
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                row.sessionStatus === 'active'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                            }`}>
                                                {row.sessionStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                                            {formatMoney(row.totalPayout)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
