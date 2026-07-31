'use client';

import { useCallback, useMemo, useState } from 'react';
import { FileText, Download, FileDown, Calendar, Users, DollarSign, RefreshCw } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart, Bar,
    AreaChart, Area,
    CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type WorkerReportRow = {
    workerName: string;
    workerId: string;
    phone: string;
    checkInTime: string;
    assignmentTime: string;
    checkoutTime: string | null;
    sessionStatus: string;
    checkInMethod: string;
    totalPayout: number;
    sessionCount: number;
};

type WorkerReportData = {
    rangeStart: string | null;
    rangeEnd: string | null;
    totals: { workers: number; totalPayout: number };
    workers: WorkerReportRow[];
};

type CostBreakdownRow = {
    date: string;
    sessions: number;
    costToExporter: number;
    workerWages: number;
    coopMargin: number;
};

type CostReportData = {
    periodStart: string | null;
    periodEnd: string | null;
    periodSessionsCount: number;
    periodWorkersEngaged: number;
    periodCostToExporter: number;
    periodWorkerWages: number;
    periodCoopMargin: number;
    dailyBreakdown: CostBreakdownRow[];
};

type ReportType = 'workers' | 'costs';

function todayInputValue() {
    return new Date().toISOString().slice(0, 10);
}

function daysAgoInputValue(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

function fmtTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateLabel(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(value: number) {
    return `RWF ${Math.round(value).toLocaleString()}`;
}

const REPORT_LABELS: Record<ReportType, string> = {
    workers: 'Daily Workers Report',
    costs: 'Cost Breakdown Report',
};

export default function ExporterReportsPage() {
    const [reportType, setReportType] = useState<ReportType>('workers');
    const [startDate, setStartDate] = useState(daysAgoInputValue(6));
    const [endDate, setEndDate] = useState(todayInputValue());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [workerData, setWorkerData] = useState<WorkerReportData | null>(null);
    const [costData, setCostData] = useState<CostReportData | null>(null);
    const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

    const generateReport = useCallback(async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        setError(null);
        try {
            if (reportType === 'workers') {
                const res = await fetch(`/api/exporter/daily-workers?startDate=${startDate}&endDate=${endDate}`);
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(payload?.error || `Failed to generate report (${res.status})`);
                setWorkerData(payload);
                setCostData(null);
            } else {
                const res = await fetch(`/api/analytics/exporter?startDate=${startDate}&endDate=${endDate}`);
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(payload?.error || `Failed to generate report (${res.status})`);
                setCostData(payload.analytics);
                setWorkerData(null);
            }
            setGeneratedAt(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    }, [reportType, startDate, endDate]);

    const hasData = reportType === 'workers' ? !!workerData?.workers.length : !!costData?.dailyBreakdown.length;

    const costChartData = useMemo(() => {
        if (!costData) return [];
        let cumulative = 0;
        return costData.dailyBreakdown.map((row) => {
            cumulative += row.costToExporter;
            return {
                label: row.date.slice(5),
                date: row.date,
                cost: row.costToExporter,
                cumulative,
            };
        });
    }, [costData]);

    const downloadCsv = () => {
        let csvContent = '';
        let filename = '';

        if (reportType === 'workers' && workerData) {
            const header = 'Worker Name,Worker ID,Phone,Check-in Time,Assignment Time,Checkout Time,Check-in Method,Session Status,Session Count,Total Payout (RWF)';
            const rows = workerData.workers.map((row) => [
                row.workerName,
                row.workerId,
                row.phone,
                fmtTime(row.checkInTime),
                fmtTime(row.assignmentTime),
                fmtTime(row.checkoutTime),
                row.checkInMethod,
                row.sessionStatus,
                String(row.sessionCount),
                String(row.totalPayout),
            ]);
            csvContent = [header, ...rows.map((r) => r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))].join('\n');
            filename = `exporter-worker-report_${startDate}_${endDate}.csv`;
        } else if (reportType === 'costs' && costData) {
            const header = 'Date,Sessions,Cost to Exporter (RWF),Worker Wages (RWF),Coop Margin (RWF)';
            const rows = costData.dailyBreakdown.map((row) => [
                row.date,
                String(row.sessions),
                String(Math.round(row.costToExporter)),
                String(Math.round(row.workerWages)),
                String(Math.round(row.coopMargin)),
            ]);
            csvContent = [header, ...rows.map((r) => r.join(','))].join('\n');
            filename = `exporter-cost-report_${startDate}_${endDate}.csv`;
        } else {
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadPdf = () => {
        const dateRangeLabel = `${fmtDateLabel(startDate)} – ${fmtDateLabel(endDate)}`;
        const doc = new jsPDF({ orientation: reportType === 'workers' ? 'landscape' : 'portrait' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;

        doc.setFillColor(6, 95, 70);
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('Akazi', margin, 12);
        doc.setFontSize(10);
        doc.text(REPORT_LABELS[reportType], margin, 20);
        doc.setFontSize(8);
        doc.text(`Period: ${dateRangeLabel}`, pageWidth - margin, 12, { align: 'right' });
        doc.text(`Generated: ${(generatedAt ?? new Date()).toLocaleString('en-GB')}`, pageWidth - margin, 19, { align: 'right' });

        let y = 36;

        if (reportType === 'workers' && workerData) {
            autoTable(doc, {
                startY: y,
                head: [['Workers', 'Total Payout']],
                body: [[String(workerData.totals.workers), fmtMoney(workerData.totals.totalPayout)]],
                theme: 'grid',
                headStyles: { fillColor: [6, 95, 70], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 9, halign: 'center', fontStyle: 'bold' },
                margin: { left: margin, right: margin },
            });
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

            autoTable(doc, {
                startY: y,
                head: [['Worker', 'ID', 'Phone', 'Check-in', 'Checkout', 'Method', 'Sessions', 'Payout']],
                body: workerData.workers.map((w) => [
                    w.workerName,
                    w.workerId,
                    w.phone || '—',
                    fmtTime(w.checkInTime),
                    fmtTime(w.checkoutTime),
                    w.checkInMethod,
                    String(w.sessionCount),
                    fmtMoney(w.totalPayout),
                ]),
                theme: 'striped',
                headStyles: { fillColor: [6, 95, 70], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                margin: { left: margin, right: margin },
            });

            doc.save(`exporter-worker-report_${startDate}_${endDate}.pdf`);
        } else if (reportType === 'costs' && costData) {
            autoTable(doc, {
                startY: y,
                head: [['Sessions', 'Cost to Exporter', 'Worker Wages', 'Coop Margin']],
                body: [[
                    String(costData.periodSessionsCount),
                    fmtMoney(costData.periodCostToExporter),
                    fmtMoney(costData.periodWorkerWages),
                    fmtMoney(costData.periodCoopMargin),
                ]],
                theme: 'grid',
                headStyles: { fillColor: [6, 95, 70], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 9, halign: 'center', fontStyle: 'bold' },
                margin: { left: margin, right: margin },
            });
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

            // Daily cost bar chart
            const chartRows = costData.dailyBreakdown;
            if (chartRows.length > 0 && chartRows.some((r) => r.costToExporter > 0)) {
                if (y > pageHeight - 70) { doc.addPage(); y = 20; }
                const chartH = 40;
                const chartW = pageWidth - margin * 2;
                const maxCost = Math.max(...chartRows.map((r) => r.costToExporter), 1);
                const barGap = 2;
                const barW = Math.min((chartW - 10) / chartRows.length - barGap, 22);

                doc.setFontSize(9);
                doc.setTextColor(6, 95, 70);
                doc.text('Daily Cost to Exporter', margin, y);
                y += 5;

                chartRows.forEach((row, i) => {
                    const bh = (row.costToExporter / maxCost) * (chartH - 10);
                    const bx = margin + 5 + i * (barW + barGap);
                    doc.setFillColor(5, 150, 105);
                    doc.rect(bx, y + chartH - bh, barW, bh, 'F');
                    doc.setFontSize(6);
                    doc.setTextColor(100, 100, 100);
                    const lbl = row.date.slice(5);
                    doc.text(lbl, bx + barW / 2, y + chartH + 4, { align: 'center', angle: 0 });
                });
                y += chartH + 12;
            }

            autoTable(doc, {
                startY: y,
                head: [['Date', 'Sessions', 'Cost to Exporter', 'Worker Wages', 'Coop Margin']],
                body: costData.dailyBreakdown.map((row) => [
                    row.date,
                    String(row.sessions),
                    fmtMoney(row.costToExporter),
                    fmtMoney(row.workerWages),
                    fmtMoney(row.coopMargin),
                ]),
                theme: 'striped',
                headStyles: { fillColor: [6, 95, 70], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                margin: { left: margin, right: margin },
            });

            doc.save(`exporter-cost-report_${startDate}_${endDate}.pdf`);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-2xl p-8 shadow-xl shadow-emerald-500/20">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-white" />
                        <h1 className="text-3xl font-bold text-white">Reports</h1>
                    </div>
                    <p className="text-white/80 text-sm">Generate and download worker and cost reports for a custom date range</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shrink-0">
                        <button
                            onClick={() => setReportType('workers')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${reportType === 'workers' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Daily Workers
                        </button>
                        <button
                            onClick={() => setReportType('costs')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${reportType === 'costs' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            Cost Breakdown
                        </button>
                    </div>

                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="date"
                            value={startDate}
                            max={endDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none min-w-0"
                        />
                    </label>
                    <span className="text-sm text-gray-400">to</span>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="date"
                            value={endDate}
                            min={startDate}
                            max={todayInputValue()}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-sm text-gray-700 dark:text-gray-200 focus:outline-none min-w-0"
                        />
                    </label>

                    <div className="flex-1" />

                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Generate Report
                    </button>
                    <button
                        onClick={downloadCsv}
                        disabled={!hasData}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={downloadPdf}
                        disabled={!hasData}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0"
                    >
                        <FileDown className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {!hasData && !loading && !error && (
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 p-12 text-center">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Choose a report type and date range, then click Generate Report.</p>
                </div>
            )}

            {/* Preview — Daily Workers */}
            {reportType === 'workers' && workerData && workerData.workers.length > 0 && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Workers</p>
                                <Users className="w-4 h-4 text-emerald-600" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{workerData.totals.workers}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Payout</p>
                                <DollarSign className="w-4 h-4 text-amber-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmtMoney(workerData.totals.totalPayout)}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-[#162032]">
                                    <tr>
                                        {['Worker', 'ID', 'Phone', 'Check-in', 'Checkout', 'Method', 'Sessions', 'Payout'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/40">
                                    {workerData.workers.map((w) => (
                                        <tr key={w.workerId} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-colors">
                                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100">{w.workerName}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 font-mono">{w.workerId}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">{w.phone || '—'}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{fmtTime(w.checkInTime)}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{fmtTime(w.checkoutTime)}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 capitalize">{w.checkInMethod}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{w.sessionCount}</td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtMoney(w.totalPayout)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Preview — Cost Breakdown */}
            {reportType === 'costs' && costData && costData.dailyBreakdown.length > 0 && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Sessions</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{costData.periodSessionsCount}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Workers Engaged</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{costData.periodWorkersEngaged}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Cost to Exporter</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtMoney(costData.periodCostToExporter)}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Worker Wages</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtMoney(costData.periodWorkerWages)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Daily Cost</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Cost to exporter per day (RWF)</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={costChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40}
                                        tickFormatter={(v: number) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                                        formatter={(v: number | undefined) => [fmtMoney(v ?? 0), 'Cost']}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? fmtDateLabel(payload[0].payload.date) : ''}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                                    />
                                    <Bar dataKey="cost" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={48} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Cumulative Cost</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Running total across the period (RWF)</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={costChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={44}
                                        tickFormatter={(v: number) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(v: number | undefined) => [fmtMoney(v ?? 0), 'Running Total']}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? fmtDateLabel(payload[0].payload.date) : ''}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                                    />
                                    <Area dataKey="cumulative" stroke="#0d9488" strokeWidth={2} fill="url(#cumulativeGrad)"
                                        dot={{ r: 4, fill: '#0d9488', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#0d9488' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-[#162032]">
                                    <tr>
                                        {['Date', 'Sessions', 'Cost to Exporter', 'Worker Wages', 'Coop Margin'].map((h) => (
                                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/40">
                                    {costData.dailyBreakdown.map((row) => (
                                        <tr key={row.date}>
                                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{row.date}</td>
                                            <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.sessions}</td>
                                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{fmtMoney(row.costToExporter)}</td>
                                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{fmtMoney(row.workerWages)}</td>
                                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{fmtMoney(row.coopMargin)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
