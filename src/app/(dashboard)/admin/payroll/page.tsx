'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    FileSpreadsheet,
    RefreshCw,
    Users,
    Calendar,
    Wallet,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Download,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { exportPayrollToExcel } from '@/lib/export/payrollExport';

interface PayrollWorker {
    workerId: string;
    fullName: string;
    phone: string;
    nationalId: string;
    numberOfBags: number;
    numberOfDays: number;
    dailyRate: number;
    totalWage: number;
    exporterCharge: number;
}

interface PayrollSummary {
    totalWorkers: number;
    totalDays: number;
    totalWorkerWages: number;
    totalCostToExporters: number;
    cooperativeMargin: number;
    exporterDailyRate: number;
    workerDailyWage: number;
    weekStart: string;
    weekEnd: string;
}

function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PayrollPage() {
    const [payroll, setPayroll] = useState<PayrollWorker[]>([]);
    const [summary, setSummary] = useState<PayrollSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const fetchPayroll = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await fetch(`/api/admin/payroll?weekStart=${selectedWeek}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load payroll');
            setPayroll(data.payroll || []);
            setSummary(data.summary || null);
            setCurrentPage(1);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedWeek]);

    useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

    const handleExportExcel = async () => {
        if (!summary || payroll.length === 0) return;
        try {
            setExporting(true);
            exportPayrollToExcel(
                payroll.map(w => ({
                    fullName: w.fullName,
                    nationalId: w.nationalId,
                    numberOfBags: w.numberOfBags,
                    numberOfDays: w.numberOfDays,
                    dailyRate: w.dailyRate,
                    totalWage: w.totalWage,
                })),
                summary
            );
        } finally {
            setExporting(false);
        }
    };

    const weekLabel = summary
        ? `${fmtDate(summary.weekStart)} – ${fmtDate(summary.weekEnd)}`
        : '';

    const totalPages = Math.ceil(payroll.length / ITEMS_PER_PAGE);
    const pageRows = payroll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-5">

            <PageHeader
                icon={FileSpreadsheet}
                iconBg="bg-transparent"
                title="Weekly Payroll"
                subtitle={weekLabel
                    ? `${weekLabel} · FRw ${(summary?.workerDailyWage || 1700).toLocaleString()} / worker-day`
                    : 'Loading rates…'}
                action={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchPayroll}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting || payroll.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                            <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
                            {exporting ? 'Generating…' : 'Export Excel'}
                        </button>
                    </div>
                }
            />

            {/* ── Week picker ── */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
                <div className="flex items-center gap-2 shrink-0">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Week of</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="date"
                        value={selectedWeek}
                        onChange={e => setSelectedWeek(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
                    />
                    {(() => {
                        const thisWeek = getWeekStart(new Date());
                        const lastWeek = getWeekStart(new Date(Date.now() - 7 * 86400000));
                        return (
                            <>
                                <button
                                    onClick={() => setSelectedWeek(thisWeek)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${selectedWeek === thisWeek ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                                >
                                    This Week
                                </button>
                                <button
                                    onClick={() => setSelectedWeek(lastWeek)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${selectedWeek === lastWeek ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                                >
                                    Last Week
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Workers paid',
                        value: summary?.totalWorkers ?? 0,
                        sub: 'this week',
                        icon: Users,
                        format: 'number',
                        accent: 'emerald',
                    },
                    {
                        label: 'Worker-days',
                        value: summary?.totalDays ?? 0,
                        sub: 'attendance days',
                        icon: Calendar,
                        format: 'number',
                        accent: 'teal',
                    },
                    {
                        label: 'Total wages',
                        value: summary?.totalWorkerWages ?? 0,
                        sub: `FRw ${(summary?.workerDailyWage || 1700).toLocaleString()} × days`,
                        icon: Wallet,
                        format: 'currency',
                        accent: 'emerald',
                    },
                    {
                        label: 'Coop margin',
                        value: summary?.cooperativeMargin ?? 0,
                        sub: `FRw ${((summary?.exporterDailyRate || 2000) - (summary?.workerDailyWage || 1700)).toLocaleString()} × days`,
                        icon: TrendingUp,
                        format: 'currency',
                        accent: 'teal',
                    },
                ].map(({ label, value, sub, icon: Icon, format, accent }) => (
                    <div key={label} className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm p-5 flex flex-col gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center">
                            <Icon className={`w-4 h-4 ${accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-600 dark:text-teal-400'}`} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{label}</p>
                            <p className={`mt-1 font-bold text-gray-900 dark:text-gray-100 ${format === 'currency' ? 'text-lg' : 'text-3xl'}`}>
                                {format === 'currency' ? `FRw ${value.toLocaleString()}` : value.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Payroll table ── */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">

                {/* Table header bar */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Wage Disbursement List</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {loading ? 'Loading…' : `${payroll.length} worker${payroll.length !== 1 ? 's' : ''}${weekLabel ? ` · ${weekLabel}` : ''}`}
                        </p>
                    </div>
                    {payroll.length > 0 && (
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download Excel
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Loading payroll data…</p>
                    </div>
                ) : payroll.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <FileSpreadsheet className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No attendance data for this week</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Select a different week or verify worker check-ins</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Worker</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">National ID</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bags</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Daily Rate</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Wage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((worker, i) => (
                                        <tr
                                            key={worker.workerId}
                                            className="group hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-colors"
                                        >
                                            <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                                {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-tight">{worker.fullName}</p>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="text-sm text-gray-700 dark:text-gray-200">{worker.phone || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                {worker.nationalId ? (
                                                    <span className="text-sm font-mono text-gray-700 dark:text-gray-200">{worker.nationalId}</span>
                                                ) : (
                                                    <span className="text-[11px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800">Not set</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-sm text-gray-700 dark:text-gray-200 tabular-nums">{worker.numberOfBags}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="text-sm text-gray-700 dark:text-gray-200 tabular-nums">{worker.numberOfDays}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <span className="text-sm text-gray-700 dark:text-gray-200 tabular-nums">FRw {worker.dailyRate.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">FRw {worker.totalWage.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                                        <td className="px-6 py-4" />
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Total — {payroll.length} workers</span>
                                        </td>
                                        <td className="px-6 py-4" />
                                        <td className="px-6 py-4" />
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                                                {payroll.reduce((s, w) => s + w.numberOfBags, 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                                                {(summary?.totalDays ?? 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4" />
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                                                FRw {(summary?.totalWorkerWages ?? 0).toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, payroll.length)} of {payroll.length}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                        const page = start + i;
                                        return page <= totalPages ? (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ) : null;
                                    })}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Cost reconciliation ── */}
            {summary && summary.totalDays > 0 && (
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                    <div className="px-6 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Weekly Cost Reconciliation</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700/40">
                        <div className="px-6 py-5">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">Collected from exporters</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">FRw {summary.totalCostToExporters.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">FRw {(summary.exporterDailyRate || 2000).toLocaleString()} × {summary.totalDays} days</p>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">Disbursed to workers</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">FRw {summary.totalWorkerWages.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">FRw {(summary.workerDailyWage || 1700).toLocaleString()} × {summary.totalDays} days</p>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">Cooperative &amp; operations</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">FRw {summary.cooperativeMargin.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">FRw {((summary.exporterDailyRate || 2000) - (summary.workerDailyWage || 1700)).toLocaleString()} × {summary.totalDays} days</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
