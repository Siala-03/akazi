'use client';

import { useEffect, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { FileSpreadsheet, ChevronLeft, ChevronRight, Download, Building2, Calendar, Pencil, Handshake } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface Row {
    date: string;
    exporterId: string;
    exporterName: string;
    sessionCount: number;
    recordedCount: number;
    agreedCount: number | null;
    workerCost: number;
    umucyoMargin: number;
    totalCost: number;
}

interface ExporterTotal {
    exporterId: string;
    exporterName: string;
    sessionCount: number;
    recordedCount: number;
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
    const [grandTotal, setGrandTotal] = useState({ sessionCount: 0, recordedCount: 0, totalCost: 0, workerCost: 0, umucyoMargin: 0 });
    const [agreedForm, setAgreedForm] = useState({ exporterId: '', date: '', count: '' });
    const [savingAgreed, setSavingAgreed] = useState(false);
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

    const saveAgreed = async (clear = false) => {
        const count = Number(agreedForm.count);
        if (!agreedForm.exporterId || !agreedForm.date) { toast.error('Choose an exporter and a date'); return; }
        if (!clear && (!Number.isInteger(count) || count < 0 || agreedForm.count === '')) { toast.error('Enter a whole number'); return; }
        setSavingAgreed(true);
        try {
            const res = await fetch('/api/admin/agreed-counts', {
                method: clear ? 'DELETE' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exporterId: agreedForm.exporterId, date: agreedForm.date, agreedCount: count }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            toast.success(clear ? 'Agreed count cleared — billing recorded check-ins' : 'Agreed count saved');
            setAgreedForm({ exporterId: '', date: '', count: '' });
            fetchBreakdown();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSavingAgreed(false);
        }
    };

    const shiftWeek = (delta: number) => {
        const d = new Date(selectedWeek + 'T12:00:00');
        d.setDate(d.getDate() + delta * 7);
        setSelectedWeek(getWeekStart(d));
    };

    const handleExportCsv = () => {
        if (rows.length === 0) return;
        const lines = [
            'Exporter / Date,Workers/Sessions,Recorded Check-ins,Umucyo Margin (RWF),Worker Cost (RWF),Total Cost (RWF)',
            ...exporterTotals.flatMap(t => [
                [`${t.exporterName} (Week Total)`, t.sessionCount, t.recordedCount, t.umucyoMargin, t.workerCost, t.totalCost].join(','),
                ...rows.filter(r => r.exporterId === t.exporterId).map(r =>
                    [fmtDate(r.date) + (r.agreedCount !== null ? ' (agreed)' : ''), r.sessionCount, r.recordedCount, r.umucyoMargin, r.workerCost, r.totalCost].join(',')
                ),
            ]),
            '',
            `Grand Total,${grandTotal.sessionCount},${grandTotal.recordedCount},${grandTotal.umucyoMargin},${grandTotal.workerCost},${grandTotal.totalCost}`,
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

            {/* Agreed totals override recorded check-ins for billing on that exporter/day */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Set agreed count</h3>
                    <span className="text-xs text-gray-500">Bills this number for the exporter and day instead of recorded check-ins. Worker payroll is unchanged.</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <select value={agreedForm.exporterId} onChange={e => setAgreedForm({ ...agreedForm, exporterId: e.target.value })} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                        <option value="">Exporter</option>
                        {exporters.map(exp => <option key={exp._id} value={exp._id}>{exp.companyTradingName}</option>)}
                    </select>
                    <input type="date" value={agreedForm.date} onChange={e => setAgreedForm({ ...agreedForm, date: e.target.value })} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                    <input type="number" min={0} step={1} value={agreedForm.count} onChange={e => setAgreedForm({ ...agreedForm, count: e.target.value })} placeholder="Agreed workers" className="w-36 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                    <button onClick={() => saveAgreed()} disabled={savingAgreed} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">Save</button>
                    <button onClick={() => saveAgreed(true)} disabled={savingAgreed} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg disabled:opacity-50">Clear</button>
                </div>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Umucyo Margin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Cost</th>
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
                                            <td className="px-6 py-3 font-bold text-gray-900">{fmt(t.umucyoMargin)}</td>
                                            <td className="px-6 py-3 font-bold text-gray-900">{fmt(t.workerCost)}</td>
                                            <td className="px-6 py-3 font-bold text-gray-900">{fmt(t.totalCost)}</td>
                                        </tr>
                                        {rows.filter(r => r.exporterId === t.exporterId).map(r => (
                                            <tr key={`${t.exporterId}-${r.date}`} className="hover:bg-gray-50">
                                                <td className="pl-10 pr-6 py-2 text-gray-600 text-sm">
                                                    <span className="inline-flex items-center gap-2">
                                                        {fmtDate(r.date)}
                                                        <button
                                                            onClick={() => setAgreedForm({ exporterId: r.exporterId, date: r.date, count: String(r.agreedCount ?? r.recordedCount) })}
                                                            title="Set agreed count"
                                                            className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-2 text-gray-600 text-sm">
                                                    {r.sessionCount}
                                                    {r.agreedCount !== null && (
                                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-semibold" title="Agreed with exporter; recorded check-ins shown in brackets">
                                                            agreed ({r.recordedCount} recorded)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-2 text-gray-600 text-sm">{fmt(r.umucyoMargin)}</td>
                                                <td className="px-6 py-2 text-gray-600 text-sm">{fmt(r.workerCost)}</td>
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
                                    <td className="px-6 py-3 font-bold text-gray-900">{fmt(grandTotal.umucyoMargin)}</td>
                                    <td className="px-6 py-3 font-bold text-gray-900">{fmt(grandTotal.workerCost)}</td>
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
