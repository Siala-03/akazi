'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { CalendarClock, ChevronLeft, ChevronRight, Building2, Calendar, Search, ArrowLeftRight, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface Exporter {
    _id: string;
    companyTradingName: string;
}

interface SessionRow {
    _id: string;
    status: 'active' | 'closed' | 'validated';
    startTime: string;
    endTime?: string | null;
    workerId: { _id: string; fullName: string; workerId: string } | string;
    exporterId: { _id: string; companyTradingName: string } | string;
}

function toLocalDate(d: Date) {
    return d.toLocaleDateString('en-CA');
}

function fmtTime(iso?: string | null) {
    return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
}

const workerOf = (s: SessionRow) => (typeof s.workerId === 'object' ? s.workerId : null);
const exporterOf = (s: SessionRow) => (typeof s.exporterId === 'object' ? s.exporterId : null);

const STATUS_STYLES: Record<SessionRow['status'], string> = {
    active: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-gray-100 text-gray-600',
    validated: 'bg-indigo-50 text-indigo-700',
};

// Runs requests a few at a time so bulk actions on hundreds of sessions don't flood the API
async function runInChunks<T>(items: T[], fn: (item: T) => Promise<boolean>, size = 10) {
    let ok = 0;
    for (let i = 0; i < items.length; i += size) {
        const results = await Promise.all(items.slice(i, i + size).map(fn));
        ok += results.filter(Boolean).length;
    }
    return ok;
}

export default function AdminSessionsPage() {
    const [date, setDate] = useState(toLocalDate(new Date()));
    const [exporterFilter, setExporterFilter] = useState('');
    const [search, setSearch] = useState('');
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [switchTarget, setSwitchTarget] = useState<{ ids: string[]; exporterId: string } | null>(null);
    const [working, setWorking] = useState(false);

    useEffect(() => {
        fetch('/api/exporters?all=true')
            .then(res => res.json())
            .then(data => setExporters(data.exporters || []))
            .catch(() => {});
    }, []);

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ all: 'true', startDate: date, endDate: date });
            const res = await fetch(`/api/sessions?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load sessions');
            setSessions(data.sessions || []);
            setSelected(new Set());
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sessions.filter(s => {
            if (exporterFilter && exporterOf(s)?._id !== exporterFilter) return false;
            if (!q) return true;
            const w = workerOf(s);
            return !!w && (w.fullName.toLowerCase().includes(q) || w.workerId.includes(q));
        });
    }, [sessions, exporterFilter, search]);

    const shiftDay = (delta: number) => {
        const d = new Date(date + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        setDate(toLocalDate(d));
    };

    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const allVisibleSelected = visible.length > 0 && visible.every(s => selected.has(s._id));
    const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(visible.map(s => s._id)));

    const handleSwitch = async () => {
        if (!switchTarget?.exporterId) return;
        setWorking(true);
        const errors: string[] = [];
        const ids = switchTarget.ids.filter(id => exporterOf(sessions.find(s => s._id === id)!)?._id !== switchTarget.exporterId);
        const ok = await runInChunks(ids, async id => {
            const res = await fetch(`/api/sessions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exporterId: switchTarget.exporterId }),
            });
            if (!res.ok) errors.push((await res.json().catch(() => ({}))).error || 'Switch failed');
            return res.ok;
        });
        setWorking(false);
        setSwitchTarget(null);
        if (ok > 0) toast.success(`Switched ${ok} session${ok === 1 ? '' : 's'}`);
        if (errors.length > 0) toast.error(`${errors.length} not switched: ${errors[0]}`);
        fetchSessions();
    };

    const handleDelete = async (ids: string[]) => {
        const label = ids.length === 1 ? 'this session' : `${ids.length} sessions`;
        if (!confirm(`Delete ${label}? Workers left with no session for the day will need to be checked in again. This cannot be undone.`)) return;
        setWorking(true);
        const ok = await runInChunks(ids, async id => (await fetch(`/api/sessions/${id}`, { method: 'DELETE' })).ok);
        setWorking(false);
        if (ok > 0) toast.success(`Deleted ${ok} session${ok === 1 ? '' : 's'}`);
        if (ok < ids.length) toast.error(`${ids.length - ok} could not be deleted`);
        fetchSessions();
    };

    const selectedIds = [...selected];

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            <PageHeader
                icon={CalendarClock}
                iconColor="text-indigo-600 dark:text-indigo-400"
                iconBg="bg-transparent"
                title="Sessions"
                subtitle="Correct check-ins: switch a session to another exporter or delete it"
            />

            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <button onClick={() => shiftDay(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:border-indigo-400"><ChevronLeft className="w-4 h-4" /></button>
                    <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                    <button onClick={() => shiftDay(1)} className="p-1.5 rounded-lg border border-gray-200 hover:border-indigo-400"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <select value={exporterFilter} onChange={e => setExporterFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
                        <option value="">All Exporters</option>
                        {exporters.map(exp => <option key={exp._id} value={exp._id}>{exp.companyTradingName}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                    <Search className="w-4 h-4 text-indigo-500" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search worker name or ID" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                </div>
            </div>

            {selected.size > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-indigo-900">{selected.size} selected</span>
                    <div className="flex-1" />
                    <button
                        onClick={() => setSwitchTarget({ ids: selectedIds, exporterId: '' })}
                        disabled={working}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                    >
                        <ArrowLeftRight className="w-4 h-4" /> Switch exporter
                    </button>
                    <button
                        onClick={() => handleDelete(selectedIds)}
                        disabled={working}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <button onClick={() => setSelected(new Set())} className="p-2 text-indigo-700 hover:text-indigo-900"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">{visible.length} session{visible.length === 1 ? '' : 's'}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full table-compact">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300" />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exporter</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading...</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No sessions for this day.</td></tr>
                            ) : visible.map(s => {
                                const w = workerOf(s);
                                return (
                                    <tr key={s._id} className={selected.has(s._id) ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}>
                                        <td className="px-4 py-2">
                                            <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggle(s._id)} className="w-4 h-4 rounded border-gray-300" />
                                        </td>
                                        <td className="px-6 py-2">
                                            <p className="text-sm font-medium text-gray-900">{w?.fullName || '—'}</p>
                                            <p className="text-xs text-gray-400">{w?.workerId}</p>
                                        </td>
                                        <td className="px-6 py-2 text-sm text-gray-700">{exporterOf(s)?.companyTradingName || '—'}</td>
                                        <td className="px-6 py-2 text-sm text-gray-600">{fmtTime(s.startTime)}</td>
                                        <td className="px-6 py-2 text-sm text-gray-600">{fmtTime(s.endTime)}</td>
                                        <td className="px-6 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                                        </td>
                                        <td className="px-6 py-2">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSwitchTarget({ ids: [s._id], exporterId: '' })}
                                                    disabled={working || s.status === 'validated'}
                                                    title={s.status === 'validated' ? 'Validated sessions cannot be switched' : 'Switch exporter'}
                                                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <ArrowLeftRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete([s._id])}
                                                    disabled={working}
                                                    title="Delete session"
                                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {switchTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !working && setSwitchTarget(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Switch {switchTarget.ids.length === 1 ? 'session' : `${switchTarget.ids.length} sessions`} to another exporter
                        </h3>
                        {switchTarget.ids.length === 1 && (() => {
                            const s = sessions.find(x => x._id === switchTarget.ids[0]);
                            return s ? (
                                <p className="text-sm text-gray-600">
                                    {workerOf(s)?.fullName} is currently with <span className="font-semibold">{exporterOf(s)?.companyTradingName}</span>.
                                </p>
                            ) : null;
                        })()}
                        <select
                            value={switchTarget.exporterId}
                            onChange={e => setSwitchTarget({ ...switchTarget, exporterId: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                            <option value="">Select new exporter</option>
                            {exporters.map(exp => <option key={exp._id} value={exp._id}>{exp.companyTradingName}</option>)}
                        </select>
                        <p className="text-xs text-gray-500">The session will be billed at the new exporter&apos;s daily rate.</p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setSwitchTarget(null)} disabled={working} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                            <button
                                onClick={handleSwitch}
                                disabled={working || !switchTarget.exporterId}
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {working ? 'Switching...' : 'Switch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
