'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    ClipboardList,
    Download,
    RefreshCw,
    Users,
    Calendar,
    DollarSign,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Wallet,
    Banknote,
    FileSpreadsheet,
    AlertCircle
} from 'lucide-react';
import { exportPayrollToExcel } from '@/lib/export/payrollExport';

interface PayrollWorker {
    workerId: string;
    fullName: string;
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

    const fmt = (n: number) => `FRw ${n.toLocaleString()}`;

    const weekLabel = summary
        ? `${new Date(summary.weekStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(summary.weekEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : '';

    const totalPages = Math.ceil(payroll.length / ITEMS_PER_PAGE);
    const pageRows = payroll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-2xl p-8 shadow-xl shadow-green-500/30">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                </div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-300/20 rounded-full blur-3xl"></div>
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                                <ClipboardList className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Weekly Payroll</h1>
                        </div>
                        <p className="text-white/90 text-base sm:text-lg ml-15">Wage disbursement sheet · FRw 1,700 / worker / day</p>
                        {weekLabel && <p className="text-xs text-white/70 mt-1 ml-15">{weekLabel}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting || payroll.length === 0}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-green-700 rounded-xl hover:bg-green-50 font-semibold transition-all disabled:opacity-50 shadow-lg"
                        >
                            <FileSpreadsheet className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
                            {exporting ? 'Generating…' : 'Export Excel'}
                        </button>
                        <button
                            onClick={fetchPayroll}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 font-medium transition-all disabled:opacity-50 shadow-lg"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Week Selector */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Week starting (Monday):</label>
                </div>
                <input
                    type="date"
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Workers are paid cumulatively every Friday based on days worked</p>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-5">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Workers</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{summary?.totalWorkers ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">this week</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border-l-4 border-l-amber-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-5">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-3">
                        <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Days</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{summary?.totalDays ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">worker-days</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-5">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3">
                        <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Worker Wages</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmt(summary?.totalWorkerWages ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">FRw 1,700 × days</p>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-xl border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-5">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Coop Margin</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmt(summary?.cooperativeMargin ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">FRw 300 × days</p>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-green-600" />
                            Wage Disbursement List
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {payroll.length} worker{payroll.length !== 1 ? 's' : ''} · {weekLabel}
                        </p>
                    </div>
                    {payroll.length > 0 && (
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Download Excel
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : payroll.length === 0 ? (
                    <div className="text-center py-16">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No attendance data for this week</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Select a different week or check that workers have checked in</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">National ID</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bags</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Daily Rate</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Wage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {pageRows.map((worker, i) => (
                                        <tr key={worker.workerId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">
                                                {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{worker.fullName}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{worker.workerId}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {worker.nationalId ? (
                                                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{worker.nationalId}</span>
                                                ) : (
                                                    <span className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">Not set</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-bold">
                                                    {worker.numberOfBags}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold">
                                                    {worker.numberOfDays}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">FRw {worker.dailyRate.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                    FRw {worker.totalWage.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                                        <td className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300" colSpan={3}>
                                            TOTAL ({payroll.length} workers)
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-purple-700 dark:text-purple-300">
                                            {payroll.reduce((s, w) => s + w.numberOfBags, 0)}
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-blue-700 dark:text-blue-300">
                                            {summary?.totalDays ?? 0}
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm text-gray-400">—</td>
                                        <td className="px-6 py-3 text-right text-sm font-bold text-green-600 dark:text-green-400">
                                            FRw {(summary?.totalWorkerWages ?? 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–<span className="font-semibold text-gray-900 dark:text-gray-100">{Math.min(currentPage * ITEMS_PER_PAGE, payroll.length)}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{payroll.length}</span>
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                        <ChevronLeft className="w-4 h-4" /> Prev
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                        const page = start + i;
                                        return page <= totalPages ? (
                                            <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-green-600 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{page}</button>
                                        ) : null;
                                    })}
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Cost Reconciliation */}
            {summary && summary.totalDays > 0 && (
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Weekly Cost Reconciliation
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">Exporter charges collected</span>
                            <span className="font-bold text-green-700 dark:text-green-400">{fmt(summary.totalCostToExporters)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">Worker wages to disburse</span>
                            <span className="font-bold text-blue-700 dark:text-blue-400">{fmt(summary.totalWorkerWages)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">Cooperative &amp; software</span>
                            <span className="font-bold text-purple-700 dark:text-purple-400">{fmt(summary.cooperativeMargin)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
