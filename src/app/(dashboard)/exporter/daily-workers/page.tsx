'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Download, RefreshCw, Users, Package, DollarSign } from 'lucide-react';

type DailyWorkerRow = {
    workerName: string;
    workerId: string;
    phone: string;
    checkInTime: string;
    assignmentTime: string;
    checkoutTime: string | null;
    sessionStatus: string;
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
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
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
                if (!range) {
                    throw new Error('Invalid week selected');
                }
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

    const csvContent = useMemo(() => {
        const header = 'Worker Name,Worker ID,Check-in Time,Assignment Time,Checkout Time,Session Status,Session Count,Total Bags,Total Payout (RWF)';
        const rows = data.workers.map((row) => [
            row.workerName,
            row.workerId,
            formatTime(row.checkInTime),
            formatTime(row.assignmentTime),
            formatTime(row.checkoutTime),
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
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Daily Workers</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Worker activity and payout summary for your exporter.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Period: {formatRange(data.rangeStart, data.rangeEnd)}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                            <button
                                onClick={() => setFilterMode('day')}
                                className={`px-3 py-2 text-sm font-medium ${
                                    filterMode === 'day'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                Day
                            </button>
                            <button
                                onClick={() => setFilterMode('week')}
                                className={`px-3 py-2 text-sm font-medium ${
                                    filterMode === 'week'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                Week
                            </button>
                        </div>

                        {filterMode === 'day' ? (
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none"
                                />
                            </label>
                        ) : (
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <input
                                    type="week"
                                    value={selectedWeek}
                                    onChange={(e) => setSelectedWeek(e.target.value)}
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none"
                                />
                            </label>
                        )}

                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>

                        <button
                            onClick={exportCsv}
                            disabled={data.workers.length === 0}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Workers</p>
                        <Users className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{data.totals.workers}</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Bags</p>
                        <Package className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{data.totals.totalBags}</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Payout</p>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                        {formatMoney(data.totals.totalPayout)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {data.totals.workers} workers · {filterMode === 'day' ? 'today' : 'this week'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full table-compact">
                        <thead className="bg-gray-50 dark:bg-gray-800/70">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Worker Name</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Worker ID</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Check-in Time</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Assignment Time</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Checkout Time</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Session Status</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total Bags</th>
                                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total Payout</th>
                            </tr>
                        </thead>
                        <tbody>
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
                                    <tr key={`${row.workerId}-${row.assignmentTime}`} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{row.workerName}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-mono">{row.workerId}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{row.phone || '—'}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.checkInTime)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.assignmentTime)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.checkoutTime)}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                    row.sessionStatus === 'active'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                                }`}
                                            >
                                                {row.sessionStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">{row.totalBags}</td>
                                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
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
