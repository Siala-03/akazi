'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Radio, RefreshCw, Search, ArrowLeftRight, ChevronDown, ChevronRight, X, Users } from 'lucide-react';

interface OnSiteWorker {
    sessionId: string;
    workerId: string;
    workerName: string;
    checkInTime: string;
    checkInMethod: string;
    checkedInBy: string;
}

interface ExporterLive {
    id: string;
    name: string;
    onSite: OnSiteWorker[];
}

interface LiveResponse {
    asOf: string;
    totalOnSite: number;
    exporters: ExporterLive[];
}

const REFRESH_MS = 30_000;

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// Runs requests a few at a time so switching many workers doesn't flood the API
async function runInChunks<T>(items: T[], fn: (item: T) => Promise<boolean>, size = 10) {
    let ok = 0;
    for (let i = 0; i < items.length; i += size) {
        ok += (await Promise.all(items.slice(i, i + size).map(fn))).filter(Boolean).length;
    }
    return ok;
}

export default function SupervisorLivePage() {
    const [data, setData] = useState<LiveResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [switchTarget, setSwitchTarget] = useState<{ ids: string[]; exporterId: string } | null>(null);
    const [working, setWorking] = useState(false);

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            const res = await fetch('/api/supervisor/live');
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Failed to load');
            setData(body);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(() => { if (!document.hidden) load(true); }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load]);

    const q = search.trim().toLowerCase();
    const exporters = useMemo(() => {
        if (!data) return [];
        return data.exporters
            .map(e => ({
                ...e,
                visible: q ? e.onSite.filter(w => w.workerName.toLowerCase().includes(q) || w.workerId.includes(q)) : e.onSite,
            }))
            .filter(e => e.onSite.length > 0 && (!q || e.visible.length > 0))
            .sort((a, b) => b.onSite.length - a.onSite.length);
    }, [data, q]);

    const allWorkers = useMemo(() => new Map((data?.exporters ?? []).flatMap(e => e.onSite.map(w => [w.sessionId, { ...w, exporterId: e.id }] as const))), [data]);

    const toggleExpanded = (id: string) => setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const toggleSelected = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const toggleAllIn = (ids: string[]) => setSelected(prev => {
        const next = new Set(prev);
        const all = ids.every(id => next.has(id));
        ids.forEach(id => (all ? next.delete(id) : next.add(id)));
        return next;
    });

    const handleSwitch = async () => {
        if (!switchTarget?.exporterId) return;
        setWorking(true);
        const errors: string[] = [];
        const ids = switchTarget.ids.filter(id => allWorkers.get(id)?.exporterId !== switchTarget.exporterId);
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
        setSelected(new Set());
        if (ok > 0) toast.success(`Switched ${ok} worker${ok === 1 ? '' : 's'}`);
        if (errors.length > 0) toast.error(`${errors.length} not switched: ${errors[0]}`, { duration: 6000 });
        load(true);
    };

    if (!loading && error && !data) {
        return (
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{error}</p>
                <p className="text-sm text-gray-500 mt-1">Ask an admin to give you super supervisor access.</p>
            </div>
        );
    }

    const selectedIds = [...selected];
    const single = switchTarget?.ids.length === 1 ? allWorkers.get(switchTarget.ids[0]) : null;

    return (
        <div className="space-y-5">
            <Toaster position="top-right" />

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Radio className="w-6 h-6 text-emerald-600" /> Live On-Site
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Workers on site now, by exporter. Updates every 30 seconds
                        {data && <> · last update {fmtTime(data.asOf)}</>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-emerald-600 text-white">
                        <span className="text-xs uppercase tracking-wide opacity-80">On site</span>
                        <span className="ml-2 text-xl font-bold">{data?.totalOnSite ?? '—'}</span>
                    </div>
                    <button onClick={() => load()} title="Refresh" className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-400">
                        <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search worker name or ID"
                    className="w-full bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100"
                />
            </div>

            {selected.size > 0 && (
                <div className="sticky top-20 z-10 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{selected.size} selected</span>
                    <div className="flex-1" />
                    <button
                        onClick={() => setSwitchTarget({ ids: selectedIds, exporterId: '' })}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
                    >
                        <ArrowLeftRight className="w-4 h-4" /> Switch exporter
                    </button>
                    <button onClick={() => setSelected(new Set())} className="p-2 text-emerald-700 dark:text-emerald-300"><X className="w-4 h-4" /></button>
                </div>
            )}

            {loading && !data ? (
                <p className="text-center text-gray-400 py-10">Loading...</p>
            ) : exporters.length === 0 ? (
                <div className="text-center py-14 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    {q ? 'No on-site worker matches your search.' : 'Nobody is on site right now.'}
                </div>
            ) : (
                <div className="space-y-3">
                    {exporters.map(e => {
                        const open = expanded.has(e.id) || !!q;
                        const ids = e.visible.map(w => w.sessionId);
                        const allSel = ids.length > 0 && ids.every(id => selected.has(id));
                        return (
                            <div key={e.id} className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <button onClick={() => toggleExpanded(e.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5">
                                    {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                    <span className="flex-1 font-semibold text-gray-900 dark:text-white">{e.name}</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-sm font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {e.onSite.length}
                                    </span>
                                </button>
                                {open && (
                                    <div className="border-t border-gray-100 dark:border-gray-700 overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-[#162032] text-xs uppercase text-gray-500">
                                                <tr>
                                                    <th className="px-4 py-2 w-10"><input type="checkbox" checked={allSel} onChange={() => toggleAllIn(ids)} className="w-4 h-4 rounded" /></th>
                                                    <th className="px-4 py-2 text-left">Worker</th>
                                                    <th className="px-4 py-2 text-left">Checked in</th>
                                                    <th className="px-4 py-2 text-left hidden sm:table-cell">By</th>
                                                    <th className="px-4 py-2 text-right">Switch</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                                {e.visible.map(w => (
                                                    <tr key={w.sessionId} className={selected.has(w.sessionId) ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''}>
                                                        <td className="px-4 py-2"><input type="checkbox" checked={selected.has(w.sessionId)} onChange={() => toggleSelected(w.sessionId)} className="w-4 h-4 rounded" /></td>
                                                        <td className="px-4 py-2">
                                                            <p className="font-medium text-gray-900 dark:text-gray-100">{w.workerName}</p>
                                                            <p className="text-xs text-gray-400">{w.workerId}</p>
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                                                            {fmtTime(w.checkInTime)} <span className="text-xs text-gray-400 uppercase">{w.checkInMethod}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">{w.checkedInBy}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button
                                                                onClick={() => setSwitchTarget({ ids: [w.sessionId], exporterId: '' })}
                                                                title="Switch exporter"
                                                                className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                                            >
                                                                <ArrowLeftRight className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {switchTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !working && setSwitchTarget(null)}>
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={ev => ev.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Switch {switchTarget.ids.length === 1 ? 'worker' : `${switchTarget.ids.length} workers`} to another exporter
                        </h3>
                        {single && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {single.workerName} is currently with{' '}
                                <span className="font-semibold">{data?.exporters.find(x => x.id === single.exporterId)?.name}</span>.
                            </p>
                        )}
                        <select
                            value={switchTarget.exporterId}
                            onChange={ev => setSwitchTarget({ ...switchTarget, exporterId: ev.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] dark:text-gray-100"
                        >
                            <option value="">Select new exporter</option>
                            {(data?.exporters ?? []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setSwitchTarget(null)} disabled={working} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
                            <button
                                onClick={handleSwitch}
                                disabled={working || !switchTarget.exporterId}
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
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
