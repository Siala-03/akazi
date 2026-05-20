'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Download, RefreshCw, Users, Package, DollarSign } from 'lucide-react';

type DailyWorkerRow = {
    workerName: string;
    workerId: string;
    checkInTime: string;
    assignmentTime: string;
    checkoutTime: string | null;
    sessionStatus: string;
    totalBags: number;
    estimatedEarnings: number;
};

type DailyWorkersResponse = {
    date: string | null;
    workerDailyWage: number;
    totals: {
        workers: number;
        totalBags: number;
        totalEstimatedEarnings: number;
    };
    workers: DailyWorkerRow[];
};

function todayDateInputValue() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

export default function ExporterDailyWorkersPage() {
    const [selectedDate, setSelectedDate] = useState(todayDateInputValue());
    const [data, setData] = useState<DailyWorkersResponse>({
        date: null,
        workerDailyWage: 0,
        totals: { workers: 0, totalBags: 0, totalEstimatedEarnings: 0 },
        workers: [],
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDailyWorkers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`/api/exporter/daily-workers?date=${selectedDate}`);
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
    }, [selectedDate]);

    useEffect(() => {
        fetchDailyWorkers();
    }, [fetchDailyWorkers]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDailyWorkers();
        setRefreshing(false);
    };

    const csvContent = useMemo(() => {
        const header = 'Worker Name,Worker ID,Check-in Time,Assignment Time,Checkout Time,Session Status,Total Bags,Estimated Earnings (RWF)';
        const rows = data.workers.map((row) => [
            row.workerName,
            row.workerId,
            formatTime(row.checkInTime),
            formatTime(row.assignmentTime),
            formatTime(row.checkoutTime),
            row.sessionStatus,
            String(row.totalBags),
            String(row.estimatedEarnings),
        ]);

        return [header, ...rows.map((r) => r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))].join('\n');
    }, [data.workers]);

    const exportCsv = () => {
        if (data.workers.length === 0) return;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exporter_daily_workers_${selectedDate}.csv`;
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
                            Workers assigned to your exporter on the selected day.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none"
                            />
                        </label>

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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Payout</p>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                        {formatMoney(data.totals.totalEstimatedEarnings)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Wage baseline: {formatMoney(data.workerDailyWage)} per session-day
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
                        <thead className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Worker Name</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Worker ID</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Check-in Time</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Assignment Time</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Checkout Time</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Session Status</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Bags</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Estimated Earnings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">
                                        Loading daily worker report...
                                    </td>
                                </tr>
                            ) : data.workers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">
                                        No worker activity found for this date.
                                    </td>
                                </tr>
                            ) : (
                                data.workers.map((row) => (
                                    <tr key={`${row.workerId}-${row.assignmentTime}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                        <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.workerName}</td>
                                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">{row.workerId}</td>
                                        <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.checkInTime)}</td>
                                        <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.assignmentTime)}</td>
                                        <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{formatTime(row.checkoutTime)}</td>
                                        <td className="px-5 py-3 text-sm">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    row.sessionStatus === 'active'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                                }`}
                                            >
                                                {row.sessionStatus}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">{row.totalBags}</td>
                                        <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                                            {formatMoney(row.estimatedEarnings)}
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
