'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    FileText,
    TrendingUp,
    Users,
    Package,
    Activity,
    Building2,
    ArrowRight,
    DollarSign,
    Weight,
    RefreshCw,
    UserCheck,
    BarChart3,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { ExportButton } from '@/components/export/ExportButton';
import { ExportData } from '@/lib/export';

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/analytics/admin');
            const data = await res.json();
            setAnalytics(data.analytics);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAnalytics();
        setRefreshing(false);
    };

    const getExportData = (): ExportData => {
        return {
            exporterName: 'Admin',
            exporterCode: 'ADMIN',
            summary: {
                totalBags: analytics?.totalBags || 0,
                totalWeight: analytics?.totalKilograms || 0,
                totalWorkers: analytics?.totalWorkers || 0,
                averageWeight: analytics?.totalBags > 0 ? (analytics?.totalKilograms || 0) / analytics.totalBags : 0,
            },
        };
    };

    const quickActions = [
        {
            title: 'Comprehensive Reports',
            description: 'Per exporter, worker, and facility reports',
            icon: FileText,
            href: '/admin/reports',
            color: 'emerald',
            hoverBorder: 'hover:border-emerald-500',
            hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconColor: 'text-emerald-600',
        },
        {
            title: 'Worker Management',
            description: 'View, edit, and manage worker records',
            icon: Users,
            href: '/admin/workers',
            color: 'blue',
            hoverBorder: 'hover:border-blue-500',
            hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600',
        },
        {
            title: 'Exporter Management',
            description: 'Configure exporters and sorting rates',
            icon: Building2,
            href: '/admin/exporters',
            color: 'purple',
            hoverBorder: 'hover:border-purple-500',
            hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
            iconBg: 'bg-purple-100 dark:bg-purple-900/30',
            iconColor: 'text-purple-600',
        },
        {
            title: 'Worker Requests',
            description: 'Review and approve worker requests',
            icon: ShieldCheck,
            href: '/admin/worker-requests',
            color: 'orange',
            hoverBorder: 'hover:border-orange-500',
            hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
            iconColor: 'text-orange-600',
        },
    ];

    const statCards = [
        {
            label: 'Total Workers',
            value: analytics?.totalWorkers || 0,
            sub: `${analytics?.activeWorkers || 0} active`,
            icon: Users,
            border: 'border-l-blue-500',
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600',
            subColor: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Checked In Today',
            value: analytics?.workersCheckedInToday || 0,
            sub: 'On-site now',
            icon: UserCheck,
            border: 'border-l-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconColor: 'text-emerald-600',
            subColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Active Sessions',
            value: analytics?.activeSessions || 0,
            sub: 'Sorting now',
            icon: Activity,
            border: 'border-l-purple-500',
            iconBg: 'bg-purple-100 dark:bg-purple-900/30',
            iconColor: 'text-purple-600',
            subColor: 'text-purple-600 dark:text-purple-400',
            pulse: (analytics?.activeSessions || 0) > 0,
        },
        {
            label: 'Bags Today',
            value: analytics?.bagsToday || 0,
            sub: `${analytics?.totalKilogramsToday || 0} kg`,
            icon: Package,
            border: 'border-l-amber-500',
            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
            iconColor: 'text-amber-600',
            subColor: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: 'Total Exporters',
            value: analytics?.totalExporters || 0,
            sub: `${analytics?.activeExporters || 0} active`,
            icon: Building2,
            border: 'border-l-indigo-500',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
            iconColor: 'text-indigo-600',
            subColor: 'text-indigo-600 dark:text-indigo-400',
        },
        {
            label: "Today's Costs",
            value: `FRw ${(analytics?.totalCostsToday || 0).toLocaleString()}`,
            sub: `${analytics?.totalHoursWorked || 0} hrs worked`,
            icon: DollarSign,
            border: 'border-l-green-500',
            iconBg: 'bg-green-100 dark:bg-green-900/30',
            iconColor: 'text-green-600',
            subColor: 'text-green-600 dark:text-green-400',
        },
    ];

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 rounded-2xl p-8 shadow-xl shadow-emerald-500/30">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                </div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300/20 rounded-full blur-3xl"></div>
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                                <TrendingUp className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Admin Dashboard</h1>
                        </div>
                        <p className="text-white/90 text-base sm:text-lg ml-15">System-wide overview and operational management</p>
                        {lastUpdated && (
                            <p className="text-xs text-white/70 mt-2 ml-15">Last updated: {lastUpdated.toLocaleTimeString()}</p>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <ExportButton data={getExportData()} label="Export Data" variant="header" />
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 font-medium transition-all disabled:opacity-50 shadow-lg"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 p-4">
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.totalWorkers || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">total workers</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.totalBags || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">bags all time</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-2">
                        <Weight className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{(analytics?.totalKilograms || 0).toLocaleString()}</span>
                        <span className="text-gray-600 dark:text-gray-400">kg total</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.avgBagsPerDay || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">avg bags/day</span>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className={`relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 ${card.border} border-t border-r border-b border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:-translate-y-1 transition-all`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-11 h-11 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                                </div>
                                {card.pulse && (
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">{card.label}</p>
                            <p className="mt-1 text-2xl xl:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{card.value}</p>
                            <p className={`mt-1 text-xs font-medium ${card.subColor}`}>{card.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trend */}
                <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attendance Trend</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 7 days</p>
                        </div>
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={analytics?.trends?.attendance || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: '#111827' }}
                                    labelStyle={{ color: '#111827', fontWeight: 600 }}
                                    itemStyle={{ color: '#374151' }}
                                />
                                <Line type="monotone" dataKey="workers" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Bags Processed Trend */}
                <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bags Processed</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 7 days</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics?.trends?.bags || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: '#111827' }}
                                    labelStyle={{ color: '#111827', fontWeight: 600 }}
                                    itemStyle={{ color: '#374151' }}
                                />
                                <Bar dataKey="bags" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Today's Exporter Activity */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            Today&apos;s Exporter Activity
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {analytics?.exporterBreakdown?.length || 0} exporter{(analytics?.exporterBreakdown?.length || 0) !== 1 ? 's' : ''} active today
                        </p>
                    </div>
                    <Link href="/admin/exporters" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                        Manage <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !analytics?.exporterBreakdown?.length ? (
                    <div className="text-center py-12">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No exporter activity today</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Bags recorded today will appear here</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exporter</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bags Today</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight (kg)</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate / Bag</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost Today</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {(analytics?.exporterBreakdown || []).map((exp: any, i: number) => (
                                    <tr key={exp.exporterId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{i + 1}</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{exp.name}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{exp.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-bold">
                                                {exp.bagsToday}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {(exp.weightToday || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {exp.ratePerBag > 0 ? `FRw ${exp.ratePerBag.toLocaleString()}` : <span className="text-amber-500 text-xs">No rate set</span>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-bold ${exp.costToday > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                {exp.costToday > 0 ? `FRw ${exp.costToday.toLocaleString()}` : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                                    <td className="px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-purple-700 dark:text-purple-300">
                                        {(analytics?.bagsToday || 0)}
                                    </td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-700 dark:text-gray-300">
                                        {(analytics?.totalKilogramsToday || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 text-right text-sm text-gray-400">—</td>
                                    <td className="px-6 py-3 text-right text-sm font-bold text-green-600 dark:text-green-400">
                                        FRw {(analytics?.totalCostsToday || 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.title}
                                href={action.href}
                                className={`group p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl ${action.hoverBorder} ${action.hoverBg} transition-all hover:shadow-md`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                                        <Icon className={`w-5 h-5 ${action.iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{action.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
