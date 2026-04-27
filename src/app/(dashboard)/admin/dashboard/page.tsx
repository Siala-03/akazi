'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
    TrendingUp, Users, Package, Activity, Building2, ArrowRight,
    DollarSign, RefreshCw, UserCheck, BarChart3, ClipboardList,
    Banknote, Wallet, FileSpreadsheet, Shield,
} from 'lucide-react';
import Link from 'next/link';
import { ExportButton } from '@/components/export/ExportButton';
import { ExportData } from '@/lib/export';

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => { fetchAnalytics(); }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/analytics/admin');
            const data = await res.json();
            setAnalytics(data.analytics);
            setLastUpdated(new Date());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleRefresh = async () => { setRefreshing(true); await fetchAnalytics(); setRefreshing(false); };
    const fmt = (n: number) => `FRw ${n.toLocaleString()}`;

    const getExportData = (): ExportData => ({
        exporterName: 'Admin',
        exporterCode: 'ADMIN',
        summary: {
            totalBags: analytics?.totalBags || 0,
            totalWeight: analytics?.totalKilograms || 0,
            totalWorkers: analytics?.totalWorkers || 0,
            averageWeight: analytics?.totalBags > 0 ? (analytics?.totalKilograms || 0) / analytics.totalBags : 0,
        },
    });

    const statCards = [
        { label: 'Total Workers',       value: analytics?.totalWorkers || 0,           sub: `${analytics?.activeWorkers || 0} active`,          icon: Users,      color: 'text-violet-600',  bg: 'bg-violet-50' },
        { label: 'Checked In Today',    value: analytics?.workersCheckedInToday || 0,  sub: 'On-site now',                                       icon: UserCheck,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Active Sessions',     value: analytics?.activeSessions || 0,         sub: 'Sorting now',                                       icon: Activity,   color: 'text-sky-600',     bg: 'bg-sky-50',    pulse: true },
        { label: 'Bags Today',          value: analytics?.bagsToday || 0,              sub: `${analytics?.totalKilogramsToday || 0} kg`,         icon: Package,    color: 'text-amber-600',   bg: 'bg-amber-50' },
        { label: 'Total Exporters',     value: analytics?.totalExporters || 0,         sub: `${analytics?.activeExporters || 0} active`,         icon: Building2,  color: 'text-slate-600',   bg: 'bg-slate-100' },
        { label: "Today's Labor Cost",  value: fmt(analytics?.dailyCostToExporters || 0), sub: `${analytics?.workerDaysToday || 0} worker-days`, icon: DollarSign, color: 'text-violet-600',  bg: 'bg-violet-50', small: true },
    ];

    const quickActions = [
        { title: 'Worker Management',   desc: 'Manage worker records',          icon: Users,         href: '/admin/workers',          bg: 'bg-violet-50',  icon_c: 'text-violet-600' },
        { title: 'Supervisors',         desc: 'Manage supervisors',             icon: Shield,        href: '/admin/supervisors',      bg: 'bg-sky-50',     icon_c: 'text-sky-600' },
        { title: 'Exporters',           desc: 'Configure exporters & rates',    icon: Building2,     href: '/admin/exporters',        bg: 'bg-slate-100',  icon_c: 'text-slate-600' },
        { title: 'Weekly Payroll',      desc: 'Generate wage disbursement',     icon: FileSpreadsheet, href: '/admin/payroll',        bg: 'bg-emerald-50', icon_c: 'text-emerald-600' },
        { title: 'Worker Requests',     desc: 'Review staffing requests',       icon: ClipboardList, href: '/admin/worker-requests',  bg: 'bg-amber-50',   icon_c: 'text-amber-600' },
        { title: 'Reports',             desc: 'Analytics & exports',            icon: BarChart3,     href: '/admin/reports',          bg: 'bg-violet-50',  icon_c: 'text-violet-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            System-wide overview
                            {lastUpdated && <span className="ml-2 text-slate-400">· updated {lastUpdated.toLocaleTimeString()}</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton data={getExportData()} label="Export" variant="default" />
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-8 h-8 ${card.bg} dark:bg-slate-700 rounded-lg flex items-center justify-center`}>
                                    <Icon className={`w-4 h-4 ${card.color}`} />
                                </div>
                                {card.pulse && (analytics?.activeSessions || 0) > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">{card.label}</p>
                            <p className={`mt-1 font-bold text-slate-900 dark:text-white ${card.small ? 'text-base leading-tight' : 'text-2xl'}`}>
                                {card.value}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{card.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-violet-50 dark:bg-violet-950/40 rounded-lg flex items-center justify-center">
                            <Banknote className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Cost Breakdown</h2>
                            <p className="text-xs text-slate-400">FRw 2,000 charged · FRw 1,700 wages · FRw 300 margin</p>
                        </div>
                    </div>
                    <Link href="/admin/payroll" className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
                        Payroll <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { period: 'Today', cost: analytics?.dailyCostToExporters, wages: analytics?.dailyWorkerWages, margin: analytics?.dailyCoopMargin, days: analytics?.workerDaysToday },
                        { period: 'This Week', cost: analytics?.weeklyCostToExporters, wages: analytics?.weeklyWorkerWages, margin: (analytics?.weeklyCostToExporters||0)-(analytics?.weeklyWorkerWages||0), days: analytics?.workerDaysWeek },
                        { period: 'Cumulative', cost: analytics?.cumulativeCostToExporters, wages: analytics?.cumulativeWorkerWages, margin: (analytics?.cumulativeCostToExporters||0)-(analytics?.cumulativeWorkerWages||0), days: analytics?.workerDaysCumulative },
                    ].map(({ period, cost, wages, margin, days }) => (
                        <div key={period} className="rounded-lg border border-slate-100 dark:border-slate-700 p-4 space-y-2.5">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{period}</p>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><DollarSign className="w-3 h-3 text-emerald-500" />Charged</span>
                                <span className="text-sm font-bold text-emerald-600">{fmt(cost || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Wallet className="w-3 h-3 text-violet-500" />Wages</span>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{fmt(wages || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700">
                                <span className="text-xs text-slate-500">Margin</span>
                                <span className="text-sm font-bold text-violet-600">{fmt(margin || 0)}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{days || 0} worker-days</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-violet-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attendance</h3>
                            <p className="text-xs text-slate-400">Last 7 days</p>
                        </div>
                    </div>
                    {loading ? <div className="h-52 flex items-center justify-center"><div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={analytics?.trends?.attendance || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                                <Line type="monotone" dataKey="workers" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                            <Package className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Bags Processed</h3>
                            <p className="text-xs text-slate-400">Last 7 days</p>
                        </div>
                    </div>
                    {loading ? <div className="h-52 flex items-center justify-center"><div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analytics?.trends?.bags || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="bags" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Exporter Activity Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Exporter Activity</h3>
                        <span className="text-xs text-slate-400">· {analytics?.exporterBreakdown?.length || 0} active</span>
                    </div>
                    <Link href="/admin/exporters" className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
                        Manage <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !analytics?.exporterBreakdown?.length ? (
                    <div className="text-center py-12">
                        <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No activity today</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Exporter</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bags</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Worker-Days</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Wages Due</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Charged</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {(analytics?.exporterBreakdown || []).map((exp: any) => (
                                    <tr key={exp.exporterId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{exp.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{exp.code}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{exp.bagsToday}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{exp.workerDaysToday ?? 0}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">{exp.workerWagesToday > 0 ? fmt(exp.workerWagesToday) : '—'}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className={`text-sm font-bold ${exp.costToday > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                {exp.costToday > 0 ? fmt(exp.costToday) : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <td className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Total</td>
                                    <td className="px-5 py-3 text-right text-sm font-bold text-slate-800 dark:text-white">{analytics?.bagsToday || 0}</td>
                                    <td className="px-5 py-3 text-right text-sm font-bold text-slate-800 dark:text-white">{analytics?.workerDaysToday || 0}</td>
                                    <td className="px-5 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">{fmt(analytics?.dailyWorkerWages || 0)}</td>
                                    <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600">{fmt(analytics?.dailyCostToExporters || 0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.title} href={action.href}
                                className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all"
                            >
                                <div className={`w-9 h-9 ${action.bg} dark:bg-slate-700 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <Icon className={`w-4 h-4 ${action.icon_c}`} />
                                </div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">{action.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5 leading-tight">{action.desc}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
