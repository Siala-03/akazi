'use client';

import { useEffect, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { FileSpreadsheet, ChevronLeft, ChevronRight, Download, Building2, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface Row {
    date: string;
    exporterId: string;
    exporterName: string;
    sessionCount: number;
    workerCost: number;
    umucyoMargin: number;
    totalCost: number;
}

interface ExporterTotal {
    exporterId: string;
    exporterName: string;
    sessionCount: number;
    workerCost: number;
    umucyoMargin: number;
    totalCost: number;
}

interface Exporter {
    _id: string;
    companyTradingName: string;
}

function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
}

function fmt(n: number) {
    return `RWF ${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function InvoiceBreakdownPage() {
    const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));
    const [selectedExporter, setSelectedExporter] = useState('');
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [rows, setRows] = useState<Row[]>([]);
    const [exporterTotals, setExporterTotals] = useState<ExporterTotal[]>([]);
    const [grandTotal, setGrandTotal] = useState({ sessionCount: 0, totalCost: 0, workerCost: 0, umucyoMargin: 0 });
    const [weekEnd, setWeekEnd] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/exporters?all=true')
            .then(res => res.json())
            .then(data => setExporters(data.exporters || []))
            .catch(() => {});
    }, []);

    const fetchBreakdown = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ weekStart: selectedWeek });
            if (selectedExporter) params.set('exporterId', selectedExporter);
            const res = await fetch(`/api/admin/invoice-breakdown?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load breakdown');
            setRows(data.rows || []);
            setExporterTotals(data.exporterTotals || []);
            setGrandTotal(data.grandTotal);
            setWeekEnd(data.weekEnd);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load breakdown');
        } finally {
            setLoading(false);
        }
    }, [selectedWeek, selectedExporter]);

    useEffect(() => { fetchBreakdown(); }, [fetchBreakdown]);

    const shiftWeek = (delta: number) => {
        const d = new Date(selectedWeek + 'T12:00:00');
        d.setDate(d.getDate() + delta * 7);
        setSelectedWeek(getWeekStart(d));
    };

    const handleExportCsv = () => {
        if (rows.length === 0) return;
        const lines = [
            'Exporter / Date,Workers/Sessions,Worker Cost (RWF),Umucyo Margin (RWF),Total Cost (RWF)',
            ...exporterTotals.flatMap(t => [
                [`${t.exporterName} (Week Total)`, t.sessionCount, t.workerCost, t.umucyoMargin, t.totalCost].join(','),
                ...rows.filter(r => r.exporterId === t.exporterId).map(r =>
                    [fmtDate(r.date), r.sessionCount, r.workerCost, r.umucyoMargin, r.totalCost].join(',')
                ),
            ]),
            '',
            `Grand Total,${grandTotal.sessionCount},${grandTotal.workerCost},${grandTotal.umucyoMargin},${grandTotal.totalCost}`,
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `invoice-breakdown_${selectedWeek}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            <PageHeader
                icon={FileSpreadsheet}
                iconColor="text-indigo-600 dark:text-indigo-400"
                iconBg="bg-transparent"
                title="Weekly Invoice Breakdown"
                subtitle="Day-by-day cost breakdown per exporter, for invoicing"
            />

            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <button onClick={() => shiftWeek(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:border-indigo-400"><ChevronLeft className="w-4 h-4" /></button>
                    <input
                        type="date"
                        value={selectedWeek}
                        onChange={e => setSelectedWeek(getWeekStart(new Date(e.target.value + 'T12:00:00')))}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                    />
                    <button onClick={() => shiftWeek(1)} className="p-1.5 rounded-lg border border-gray-200 hover:border-indigo-400"><ChevronRight className="w-4 h-4" /></button>
                    {weekEnd && <span className="text-sm text-gray-500">to {new Date(weekEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                </div>

                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <select
                        value={selectedExporter}
                        onChange={e => setSelectedExporter(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">All Exporters</option>
                        {exporters.map(exp => (
                            <option key={exp._id} value={exp._id}>{exp.companyTradingName}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1" />
                <button
                    onClick={handleExportCsv}
                    disabled={rows.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                >
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Per-exporter weekly total, with each day of that week nested underneath */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Weekly Breakdown by Exporter</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Each exporter's total for the week, broken down day by day</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full table-compact">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exporter / Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workers/Sessions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Umucyo Margin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Loading...</td></tr>
                            ) : exporterTotals.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No sessions this week.</td></tr>
                            ) : (
                                exporterTotals.map(t => (
                                    <>
                                        <tr key={t.exporterId} className="bg-indigo-50/60 hover:bg-indigo-50">
                                            <td className="px-6 py-3 font-bold text-gray-900">{t.exporterName}</td>
                                            <td className="px-6 py-3 font-bold text-gray-900">{t.sessionCount}</td>
                                            <td className="px-6 py-3 font-bold text-gray-900">{fmt(t.workerCost)}</td>
                                            <td className="px-6 py-3 font-bold text-gray-900">{fmt(t.umucyoMargin)}</td>
                                            <td className="px-6 py-3 font-bold text-gray-900">{fmt(t.totalCost)}</td>
                                        </tr>
                                        {rows.filter(r => r.exporterId === t.exporterId).map(r => (
                                            <tr key={`${t.exporterId}-${r.date}`} className="hover:bg-gray-50">
                                                <td className="pl-10 pr-6 py-2 text-gray-600 text-sm">{fmtDate(r.date)}</td>
                                                <td className="px-6 py-2 text-gray-600 text-sm">{r.sessionCount}</td>
                                                <td className="px-6 py-2 text-gray-600 text-sm">{fmt(r.workerCost)}</td>
                                                <td className="px-6 py-2 text-gray-600 text-sm">{fmt(r.umucyoMargin)}</td>
                                                <td className="px-6 py-2 text-gray-600 text-sm">{fmt(r.totalCost)}</td>
                                            </tr>
                                        ))}
                                    </>
                                ))
                            )}
                        </tbody>
                        {exporterTotals.length > 0 && (
                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                <tr>
                                    <td className="px-6 py-3 font-bold text-gray-900">Grand Total</td>
                                    <td className="px-6 py-3 font-bold text-gray-900">{grandTotal.sessionCount}</td>
                                    <td className="px-6 py-3 font-bold text-gray-900">{fmt(grandTotal.workerCost)}</td>
                                    <td className="px-6 py-3 font-bold text-gray-900">{fmt(grandTotal.umucyoMargin)}</td>
                                    <td className="px-6 py-3 font-bold text-gray-900">{fmt(grandTotal.totalCost)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
