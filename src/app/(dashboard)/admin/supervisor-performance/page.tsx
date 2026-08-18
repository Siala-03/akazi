'use client';

import { useEffect, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Activity, UserPlus, UserCheck, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface SupervisorPerformance {
    supervisorId: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    workersRegistered: number;
    checkInsPerformed: number;
    activeSince: string | null;
}

export default function SupervisorPerformancePage() {
    const [performance, setPerformance] = useState<SupervisorPerformance[]>([]);
    const [note, setNote] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchPerformance = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            const res = await fetch(`/api/admin/supervisor-performance?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load performance data');
            setPerformance(data.performance || []);
            setNote(data.note || null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load performance data');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchPerformance(); }, [fetchPerformance]);

    const totalRegistered = performance.reduce((s, p) => s + p.workersRegistered, 0);
    const totalCheckins = performance.reduce((s, p) => s + p.checkInsPerformed, 0);

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            <PageHeader
                icon={Activity}
                iconColor="text-indigo-600 dark:text-indigo-400"
                iconBg="bg-transparent"
                title="Supervisor Performance"
                subtitle="See which supervisor registered or checked in which workers, since tracking began"
            />

            {note && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{note} Check-in history is unaffected — that has always been tracked per supervisor.</span>
                </div>
            )}

            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 shrink-0">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date range</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                            Clear (all-time)
                        </button>
                    )}
                </div>
                <div className="flex-1" />
                <button
                    onClick={fetchPerformance}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <UserPlus className="w-6 h-6 text-purple-600" />
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Workers Registered</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalRegistered.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-emerald-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3">
                        <UserCheck className="w-6 h-6 text-emerald-600" />
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Check-ins Performed</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalCheckins.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full table-compact">
                        <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supervisor</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workers Registered</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check-ins Performed</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Since</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
                            ) : performance.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No supervisor activity found for this range.</td></tr>
                            ) : (
                                performance.map(p => (
                                    <tr key={p.supervisorId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{p.email}</p>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300 capitalize">{p.role}</td>
                                        <td className="px-6 py-3.5">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                {p.workersRegistered}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                {p.checkInsPerformed}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                                            {p.activeSince ? new Date(p.activeSince).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {p.isActive ? 'Active' : 'Inactive'}
                                            </span>
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
