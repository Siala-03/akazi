'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Users,
    Activity,
    Package,
    TrendingUp,
    Clock,
    UserPlus,
    UserCheck,
    UserX,
    Settings,
    RefreshCw,
    Info,
    Building2
} from 'lucide-react';

export default function SupervisorDashboard() {
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
            const res = await fetch('/api/analytics/supervisor');
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 rounded-2xl p-8 shadow-xl shadow-emerald-500/30">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                </div>
                
                {/* Decorative gradient circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300/20 rounded-full blur-3xl"></div>
                
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30 animate-bounce-once">
                                <TrendingUp className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold text-white drop-shadow-lg">Supervisor Dashboard</h1>
                        </div>
                        <p className="text-white/90 text-lg ml-15">
                            Welcome back! Here's today's overview
                        </p>
                        {lastUpdated && (
                            <p className="text-xs text-white/70 mt-2 ml-15">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
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

            {/* Quick Stats Summary Banner */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/50 p-4">
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.workersCheckedInToday || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">checked in</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-rose-500" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.workersCheckedOutToday || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">checked out</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.bagsToday || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">bags processed</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{analytics?.totalHoursWorked || 0}</span>
                        <span className="text-gray-600 dark:text-gray-400">hours worked</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {[
                    {
                        label: 'Total Workers',
                        value: analytics?.totalWorkers || 0,
                        sub: analytics?.totalWorkers > 0 ? 'Active' : 'No workers yet',
                        icon: Users,
                        border: 'border-l-emerald-500',
                        iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
                        iconColor: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                        label: 'Checked In Today',
                        value: analytics?.workersCheckedInToday || 0,
                        sub: analytics?.workersCheckedInToday > 0 ? 'On-site now' : 'Start check-ins',
                        icon: UserPlus,
                        border: 'border-l-emerald-500',
                        iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
                        iconColor: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                        label: 'Active Sessions',
                        value: analytics?.activeSessions || 0,
                        sub: analytics?.activeSessions > 0 ? 'Sorting now' : 'None active',
                        icon: Activity,
                        border: 'border-l-violet-500',
                        iconBg: 'bg-violet-50 dark:bg-violet-900/20',
                        iconColor: 'text-violet-600 dark:text-violet-400',
                        pulse: (analytics?.activeSessions || 0) > 0,
                    },
                    {
                        label: 'Bags Processed',
                        value: analytics?.bagsToday || 0,
                        sub: "Today's output",
                        icon: Package,
                        border: 'border-l-amber-500',
                        iconBg: 'bg-amber-50 dark:bg-amber-900/20',
                        iconColor: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                        label: 'Exporters Served',
                        value: analytics?.exportersServedToday || 0,
                        sub: 'Today',
                        icon: Building2,
                        border: 'border-l-teal-500',
                        iconBg: 'bg-teal-50 dark:bg-teal-900/20',
                        iconColor: 'text-teal-600 dark:text-teal-400',
                    },
                ].map(({ label, value, sub, icon: Icon, border, iconBg, iconColor, pulse }) => (
                    <div key={label} className={`bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 ${border} border-t border-r border-b border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                            </div>
                            {pulse && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
                        <p className="mt-1.5 text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>
                    </div>
                ))}
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
                        <div className="h-64 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-sm">Loading chart...</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={analytics?.trends?.attendance || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e5e7eb', 
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        color: '#111827'
                                    }}
                                    labelStyle={{ color: '#111827', fontWeight: 600 }}
                                    itemStyle={{ color: '#374151' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="workers" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
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
                        <div className="h-64 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-sm">Loading chart...</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics?.trends?.bags || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e5e7eb', 
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        color: '#111827'
                                    }}
                                    labelStyle={{ color: '#111827', fontWeight: 600 }}
                                    itemStyle={{ color: '#374151' }}
                                />
                                <Bar 
                                    dataKey="bags" 
                                    fill="#8b5cf6" 
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <a
                        href="/supervisor/operations"
                        className="group p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all hover:shadow-md"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800 transition-colors">
                                <Settings className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                    Daily Operations
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check-in & Assign</p>
                            </div>
                        </div>
                    </a>

                    <a
                        href="/supervisor/onboarding"
                        className="group p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:shadow-md"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                                    Onboard Worker
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Register new worker</p>
                            </div>
                        </div>
                    </a>

                    <a
                        href="/supervisor/workers"
                        className="group p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all hover:shadow-md"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-400">
                                    View Workers
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Worker directory</p>
                            </div>
                        </div>
                    </a>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="group p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:shadow-md disabled:opacity-50"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-medium text-gray-900 dark:text-gray-100">Refresh Stats</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update dashboard</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Info className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        Daily Workflow Guide
                    </h3>
                </div>
                <ol className="space-y-3">
                    {[
                        'Check-in workers as they arrive at the facility',
                        'Assign checked-in workers to exporters for sorting sessions',
                        'Record completed bags (select 2–4 workers per bag)',
                        'Check-out workers when their shift is complete',
                    ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-6 h-6 bg-gray-800 dark:bg-gray-600 text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                                {i + 1}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{step}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}
