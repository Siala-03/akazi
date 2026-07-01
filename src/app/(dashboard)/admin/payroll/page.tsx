'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    FileSpreadsheet,
    RefreshCw,
    Users,
    Calendar,
    Wallet,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Download,
    Building2,
    Search,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { exportPayrollToExcel } from '@/lib/export/payrollExport';

interface PayrollWorker {
    workerId: string;
    fullName: string;
    phone: string;
    nationalId: string;
    exporterName: string;
    exporterCode: string;
    numberOfDays: number;
    dailyRate: number;
    totalWage: number;
    exporterCharge: number;
    paid?: boolean;
}

interface PayrollSummary {
    totalWorkers: number;
    totalDays: number;
    totalWorkerWages: number;
    totalCostToExporters: number;
    cooperativeMargin: number;
    workerDailyWage: number;
    weekStart: string;
    weekEnd: string;
}

interface Exporter {
    _id: string;
    companyTradingName: string;
    exporterCode: string;
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

type FilterMode = 'week' | 'custom' | 'month';

export default function PayrollPage() {
    const [payroll, setPayroll] = useState<PayrollWorker[]>([]);
    const [summary, setSummary] = useState<PayrollSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [filterMode, setFilterMode] = useState<FilterMode>('week');
    const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [selectedExporter, setSelectedExporter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showExporterBreakdown, setShowExporterBreakdown] = useState(false);
    const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetch('/api/exporters')
            .then(res => res.json())
            .then(data => setExporters(data.exporters || []))
            .catch(() => {});
    }, []);

    const fetchPayroll = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const params = new URLSearchParams();

            if (filterMode === 'week') {
                params.set('weekStart', selectedWeek);
            } else if (filterMode === 'month') {
                const [year, month] = selectedMonth.split('-').map(Number);
                const start = new Date(year, month - 1, 1);
                const end = new Date(year, month, 0);
                params.set('startDate', start.toISOString().split('T')[0]);
                params.set('endDate', end.toISOString().split('T')[0]);
            } else if (customStart && customEnd) {
                params.set('startDate', customStart);
                params.set('endDate', customEnd);
            }

            if (selectedExporter) params.append('exporterId', selectedExporter);
            const res = await fetch(`/api/admin/payroll?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load payroll');
            setPayroll(data.payroll || []);
            setSummary(data.summary || null);
            setCurrentPage(1);
            setPaidIds(new Set());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filterMode, selectedWeek, selectedMonth, customStart, customEnd, selectedExporter]);

    useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

    const handleExportExcel = async () => {
        if (!summary || payroll.length === 0) return;
        try {
            setExporting(true);
            exportPayrollToExcel(
                payroll.map(w => ({
                    fullName: w.fullName,
                    nationalId: w.nationalId,
                    exporterName: w.exporterName,
                    numberOfDays: w.numberOfDays,
                    dailyRate: w.dailyRate,
                    totalWage: w.totalWage,
                    paid: paidIds.has(w.workerId + w.exporterCode),
                })),
                summary
            );
        } finally {
            setExporting(false);
        }
    };

    const togglePaid = (key: string) => {
        setPaidIds(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const markAllPaid = () => {
        setPaidIds(new Set(filtered.map(w => w.workerId + w.exporterCode)));
    };

    const periodLabel = summary
        ? `${fmtDate(summary.weekStart)} – ${fmtDate(summary.weekEnd)}`
        : '';

    const filtered = payroll.filter(w => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return w.fullName.toLowerCase().includes(q) ||
            w.exporterName.toLowerCase().includes(q) ||
            w.phone?.toLowerCase().includes(q) ||
            w.nationalId?.toLowerCase().includes(q);
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const pageRows = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Exporter breakdown
    const exporterBreakdown = useMemo(() => {
        const map = new Map<string, { name: string; code: string; workers: number; days: number; wages: number; charge: number }>();
        for (const w of payroll) {
            const key = w.exporterCode || w.exporterName;
            const existing = map.get(key);
            if (existing) {
                existing.workers++;
                existing.days += w.numberOfDays;
                existing.wages += w.totalWage;
                existing.charge += w.exporterCharge;
            } else {
                map.set(key, { name: w.exporterName, code: w.exporterCode, workers: 1, days: w.numberOfDays, wages: w.totalWage, charge: w.exporterCharge });
            }
        }
        return Array.from(map.values()).sort((a, b) => b.charge - a.charge);
    }, [payroll]);

    const paidCount = filtered.filter(w => paidIds.has(w.workerId + w.exporterCode)).length;

    return (
        <div className="space-y-5">

            <PageHeader
                icon={FileSpreadsheet}
                iconBg="bg-transparent"
                title="Payroll"
                subtitle={periodLabel || 'Loading…'}
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

            {/* Filters */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 px-5 py-3.5 flex flex-col gap-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period</span>
                    </div>
                    <div className="flex gap-2">
                        {(['week', 'custom', 'month'] as FilterMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setFilterMode(mode)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterMode === mode ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>

                    {filterMode === 'week' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <input type="date" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
                            {(() => {
                                const thisWeek = getWeekStart(new Date());
                                const lastWeek = getWeekStart(new Date(Date.now() - 7 * 86400000));
                                return (<>
                                    <button onClick={() => setSelectedWeek(thisWeek)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${selectedWeek === thisWeek ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}>This Week</button>
                                    <button onClick={() => setSelectedWeek(lastWeek)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${selectedWeek === lastWeek ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}>Last Week</button>
                                </>);
                            })()}
                        </div>
                    )}

                    {filterMode === 'month' && (
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
                    )}

                    {filterMode === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
                            <span className="text-gray-400 text-sm">to</span>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
                        </div>
                    )}

                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <select value={selectedExporter} onChange={e => setSelectedExporter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent">
                            <option value="">All Exporters</option>
                            {exporters.map(exp => (<option key={exp._id} value={exp._id}>{exp.companyTradingName}</option>))}
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Workers', value: summary?.totalWorkers ?? 0, icon: Users, format: 'number', accent: 'emerald' },
                    { label: 'Worker-days', value: summary?.totalDays ?? 0, icon: Calendar, format: 'number', accent: 'teal' },
                    { label: 'Total wages', value: summary?.totalWorkerWages ?? 0, icon: Wallet, format: 'currency', accent: 'emerald' },
                    { label: 'Exporter charges', value: summary?.totalCostToExporters ?? 0, icon: Building2, format: 'currency', accent: 'teal' },
                    { label: 'Coop margin', value: summary?.cooperativeMargin ?? 0, icon: TrendingUp, format: 'currency', accent: 'emerald' },
                ].map(({ label, value, icon: Icon, format, accent }) => (
                    <div key={label} className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm p-5 flex flex-col gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center">
                            <Icon className={`w-4 h-4 ${accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-600 dark:text-teal-400'}`} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{label}</p>
                            <p className={`mt-1 font-bold text-gray-900 dark:text-gray-100 ${format === 'currency' ? 'text-lg' : 'text-3xl'}`}>
                                {format === 'currency' ? `FRw ${value.toLocaleString()}` : value.toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Exporter Breakdown */}
            {exporterBreakdown.length > 1 && (
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setShowExporterBreakdown(!showExporterBreakdown)}
                        className="w-full px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">Summary by Exporter</span>
                            <span className="text-xs text-gray-400">{exporterBreakdown.length} exporters</span>
                        </div>
                        {showExporterBreakdown ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    {showExporterBreakdown && (
                        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700/60">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Exporter</th>
                                        <th className="px-6 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Workers</th>
                                        <th className="px-6 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Days</th>
                                        <th className="px-6 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Worker Wages</th>
                                        <th className="px-6 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Billed to Exporter</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                                    {exporterBreakdown.map(exp => (
                                        <tr key={exp.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                            <td className="px-6 py-2.5"><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{exp.name}</span></td>
                                            <td className="px-6 py-2.5 text-center text-sm text-gray-700 dark:text-gray-300">{exp.workers}</td>
                                            <td className="px-6 py-2.5 text-center text-sm text-gray-700 dark:text-gray-300">{exp.days}</td>
                                            <td className="px-6 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">FRw {exp.wages.toLocaleString()}</td>
                                            <td className="px-6 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">FRw {exp.charge.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Payroll table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Wage Disbursement List</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {loading ? 'Loading…' : `${filtered.length} worker${filtered.length !== 1 ? 's' : ''}${periodLabel ? ` · ${periodLabel}` : ''}`}
                            {paidCount > 0 && ` · ${paidCount} marked paid`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input type="text" placeholder="Search…" value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="pl-9 pr-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent w-40" />
                        </div>
                        {filtered.length > 0 && paidCount < filtered.length && (
                            <button onClick={markAllPaid}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Paid
                            </button>
                        )}
                        {payroll.length > 0 && (
                            <button onClick={handleExportExcel} disabled={exporting}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm">
                                <Download className="w-3.5 h-3.5" /> Excel
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Loading payroll data…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <FileSpreadsheet className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{searchTerm ? 'No workers match your search' : 'No data for this period'}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-10">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Worker</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Exporter</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Days</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Wage</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((worker, i) => {
                                        const key = worker.workerId + worker.exporterCode;
                                        const isPaid = paidIds.has(key);
                                        return (
                                            <tr key={`${key}-${i}`} className={`group transition-colors ${isPaid ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                                                <td className="px-4 py-3 text-xs text-gray-500 tabular-nums">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{worker.fullName}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{worker.nationalId || '—'}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-gray-700 dark:text-gray-200">{worker.exporterName}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{worker.phone || '—'}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-200 tabular-nums">{worker.numberOfDays}</td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">FRw {worker.totalWage.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => togglePaid(key)}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-amber-100 hover:text-amber-700'}`}>
                                                        {isPaid ? <><CheckCircle2 className="w-3 h-3" /> Paid</> : <><Clock className="w-3 h-3" /> Pending</>}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                                        <td className="px-4 py-3" />
                                        <td className="px-4 py-3"><span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase">{filtered.length} workers</span></td>
                                        <td className="px-4 py-3" />
                                        <td className="px-4 py-3" />
                                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">{filtered.reduce((s, w) => s + w.numberOfDays, 0)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">FRw {filtered.reduce((s, w) => s + w.totalWage, 0).toLocaleString()}</td>
                                        <td className="px-4 py-3" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                        const page = start + i;
                                        return page <= totalPages ? (
                                            <button key={page} onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${currentPage === page ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                                {page}
                                            </button>
                                        ) : null;
                                    })}
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Cost reconciliation */}
            {summary && summary.totalDays > 0 && (
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                    <div className="px-6 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Cost Reconciliation</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700/40">
                        <div className="px-6 py-5">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">Collected from exporters</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">FRw {summary.totalCostToExporters.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{summary.totalDays} worker-days</p>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">Disbursed to workers</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">FRw {summary.totalWorkerWages.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{summary.totalDays} worker-days</p>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1.5">Cooperative margin</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">FRw {summary.cooperativeMargin.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">revenue − wages</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
