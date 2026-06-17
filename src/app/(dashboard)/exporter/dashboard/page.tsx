'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Package,
    Users,
    TrendingUp,
    Calendar,
    Weight,
    Clock,
    BarChart3,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Download,

} from 'lucide-react';
import { ExportButton } from '@/components/export/ExportButton';
import { ExportData } from '@/lib/export';

function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
}

function getWeekEnd(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExporterDashboard() {
    const [bags, setBags] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [exporterInfo, setExporterInfo] = useState({ name: 'Exporter', code: 'EXP' });
    const [currentPage, setCurrentPage] = useState(1);
    const [breakdownPage, setBreakdownPage] = useState(1);
    const [breakdownPageSize, setBreakdownPageSize] = useState(10);
    const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [filterMode, setFilterMode] = useState<'week' | 'month' | 'custom'>('week');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const ITEMS_PER_PAGE = 10;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const params = new URLSearchParams();
            
            if (filterMode === 'week') {
                const weekEnd = getWeekEnd(new Date(selectedWeek));
                params.append('startDate', selectedWeek);
                params.append('endDate', weekEnd);
            } else if (filterMode === 'month') {
                const [year, month] = selectedMonth.split('-').map(Number);
                const monthStart = new Date(year, month - 1, 1);
                const monthEnd = new Date(year, month, 0);
                params.append('startDate', monthStart.toISOString().split('T')[0]);
                params.append('endDate', monthEnd.toISOString().split('T')[0]);
            } else if (customStartDate && customEndDate) {
                params.append('startDate', customStartDate);
                params.append('endDate', customEndDate);
            }

            const analyticsRes = await fetch(`/api/analytics/exporter?${params.toString()}`);

            if (!analyticsRes.ok) {
                const analyticsErr = await analyticsRes.json().catch(() => ({}));
                throw new Error(
                    analyticsErr?.error ||
                    `Failed to load exporter dashboard (${analyticsRes.status})`
                );
            }

            const analyticsData = await analyticsRes.json();
            const myBags: any[] = [];

            setBags(myBags);
            setAnalytics(analyticsData.analytics || {});
            setLastUpdated(new Date());

            if (myBags.length > 0 && myBags[0].exporterId) {
                setExporterInfo({
                    name: myBags[0].exporterId.companyTradingName || 'Exporter',
                    code: myBags[0].exporterId.exporterCode || 'EXP'
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoadError(error instanceof Error ? error.message : 'Failed to load dashboard analytics');
        } finally {
            setLoading(false);
        }
    }, [filterMode, selectedWeek, selectedMonth, customStartDate, customEndDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleExportBreakdownCsv = () => {
        const rows = analytics?.dailyBreakdown || [];
        if (rows.length === 0) return;

        const periodStart = analytics?.periodStart ? new Date(analytics.periodStart) : null;
        const periodEnd = analytics?.periodEnd ? new Date(analytics.periodEnd) : null;
        const periodLabel = periodStart && periodEnd
            ? `${fmtDate(periodStart.toISOString())} - ${fmtDate(periodEnd.toISOString())}`
            : 'Selected Period';

        const csvRows = [
            ['Date', 'Sessions', 'Bags', 'Weight (kg)', 'Cost to Exporter (FRw)'],
            ...rows.map((row: any) => [
                row.date,
                row.sessions,
                row.bags,
                row.weight,
                row.costToExporter,
            ]),
        ];

        const csvContent = [
            'Akazi Rwanda Ltd - Exporter Daily Breakdown',
            `Exporter:,${exporterInfo.name}`,
            `Code:,${exporterInfo.code}`,
            `Period:,${periodLabel}`,
            `Generated:,${new Date().toLocaleString()}`,
            '',
            ...csvRows.map((line) => line.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${exporterInfo.code}_daily_breakdown_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getExportData = (): ExportData => {
        const exportBags = bags.slice(0, 100).map(bag => ({
            bagNumber: bag.bagNumber,
            weight: bag.weight || 60,
            date: new Date(bag.date),
            worker: bag.workers[0]?.workerId?.name || 'Unknown'
        }));

        return {
            exporterName: exporterInfo.name,
            exporterCode: exporterInfo.code,
            bags: exportBags,
            summary: {
                totalBags: analytics?.periodBags || 0,
                totalWeight: analytics?.periodWeight || 0,
                totalWorkers: analytics?.periodWorkersEngaged || 0,
                averageWeight: analytics?.periodBags > 0 ? analytics.periodWeight / analytics.periodBags : 0
            }
        };
    };

    const fmt = (n: number) => `FRw ${n.toLocaleString()}`;

    return (
        <div className="space-y-6">
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
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-bounce-once">
                                <TrendingUp className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold text-white drop-shadow-lg">Exporter Dashboard</h1>
                        </div>
                        <p className="text-white/90 text-lg ml-15">
                            Coffee export operations &amp; performance overview
                        </p>
                        {lastUpdated && (
                            <p className="text-xs text-white/70 mt-2 ml-15">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </p>
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

            {loadError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
                    {loadError}. Please refresh after confirming your session is active.
                </div>
            )}

            {/* Date Filter */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-100 dark:border-gray-700/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 shrink-0">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterMode('week')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterMode === 'week' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setFilterMode('custom')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterMode === 'custom' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                        >
                            Custom
                        </button>
                        <button
                            onClick={() => setFilterMode('month')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterMode === 'month' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                        >
                            Month
                        </button>
                    </div>

                    {filterMode === 'week' ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={selectedWeek}
                                onChange={e => setSelectedWeek(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
                            />
                            {(() => {
                                const thisWeek = getWeekStart(new Date());
                                const lastWeek = getWeekStart(new Date(Date.now() - 7 * 86400000));
                                return (
                                    <>
                                        <button
                                            onClick={() => setSelectedWeek(thisWeek)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${selectedWeek === thisWeek ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                                        >
                                            This Week
                                        </button>
                                        <button
                                            onClick={() => setSelectedWeek(lastWeek)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${selectedWeek === lastWeek ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-400'}`}
                                        >
                                            Last Week
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    ) : filterMode === 'month' ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={e => setCustomStartDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={e => setCustomEndDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Bags</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{(analytics?.periodBags || 0).toLocaleString()}</p>
                </div>

                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <BarChart3 className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Workers Engaged</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{(analytics?.periodWorkersEngaged || 0).toLocaleString()}</p>
                </div>

                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-emerald-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                            <Weight className="w-6 h-6 text-emerald-600" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Weight</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{(analytics?.periodWeight || 0).toLocaleString()} kg</p>
                </div>

                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-amber-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Daily Average</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{analytics?.periodAvgBagsPerDay?.toFixed(1) || 0} bags/day</p>
                </div>

                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Cost</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmt(analytics?.periodCostToExporter || 0)}</p>
                </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Overview</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {filterMode === 'week' 
                                ? `Week of ${fmtDate(selectedWeek)}`
                                : filterMode === 'month'
                                ? selectedMonth
                                : customStartDate && customEndDate 
                                ? `${fmtDate(customStartDate)} – ${fmtDate(customEndDate)}`
                                : 'All time data'
                            }
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Period Bags</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{(analytics?.periodBags || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{(analytics?.periodWeight || 0).toLocaleString()} kg</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(analytics?.periodCostToExporter || 0)}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Period Sessions</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{(analytics?.periodSessionsCount || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Worker-days</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{(analytics?.periodWorkersEngaged || 0)} workers</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 border-l-4 border-l-emerald-500 border-t border-r border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">All Time</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{(analytics?.totalBags || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Cumulative bags</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(analytics?.cumulativeCost || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Date-wise Expenses Breakdown */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Date-wise Expenses Breakdown</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sessions, output, and costs per day for selected period</p>
                    </div>
                    <button
                        onClick={handleExportBreakdownCsv}
                        disabled={!analytics?.dailyBreakdown?.length}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Export Breakdown CSV
                    </button>
                </div>

                {(() => {
                    const allRows = analytics?.dailyBreakdown || [];
                    const totalBreakdownPages = Math.max(1, Math.ceil(allRows.length / breakdownPageSize));
                    const safeBreakdownPage = Math.min(breakdownPage, totalBreakdownPages);
                    const paginatedRows = allRows.slice((safeBreakdownPage - 1) * breakdownPageSize, safeBreakdownPage * breakdownPageSize);

                    return (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-[#162032]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sessions</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bags</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight (kg)</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost (FRw)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/40">
                                        {allRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    No data available for this period.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedRows.map((row: any) => (
                                                <tr key={row.date}>
                                                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{fmtDate(row.date)}</td>
                                                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.sessions}</td>
                                                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{row.bags}</td>
                                                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(row.weight || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{Number(row.costToExporter || 0).toLocaleString()}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {allRows.length > 0 && (
                                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Showing {(safeBreakdownPage - 1) * breakdownPageSize + 1}–{Math.min(safeBreakdownPage * breakdownPageSize, allRows.length)} of {allRows.length} days
                                        </p>
                                        <select
                                            value={breakdownPageSize}
                                            onChange={e => { setBreakdownPageSize(Number(e.target.value)); setBreakdownPage(1); }}
                                            className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        >
                                            <option value={10}>10 / page</option>
                                            <option value={25}>25 / page</option>
                                            <option value={50}>50 / page</option>
                                            <option value={100}>100 / page</option>
                                        </select>
                                    </div>
                                    {totalBreakdownPages > 1 && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setBreakdownPage(1)} disabled={safeBreakdownPage === 1} className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
                                            <button onClick={() => setBreakdownPage(p => Math.max(1, p - 1))} disabled={safeBreakdownPage === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                <ChevronLeft className="w-4 h-4" /> Prev
                                            </button>
                                            <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{safeBreakdownPage} / {totalBreakdownPages}</span>
                                            <button onClick={() => setBreakdownPage(p => Math.min(totalBreakdownPages, p + 1))} disabled={safeBreakdownPage === totalBreakdownPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                Next <ChevronRight className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setBreakdownPage(totalBreakdownPages)} disabled={safeBreakdownPage === totalBreakdownPages} className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Recent Bags */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Bags</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest processed bags</p>
                    </div>
                    {bags.length > 0 && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                            {bags.length.toLocaleString()} total bags
                        </span>
                    )}
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-sm">Loading data...</p>
                        </div>
                    ) : bags.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="font-medium">No bags processed yet</p>
                            <p className="text-sm mt-1">Bag records will appear here once processing begins</p>
                        </div>
                    ) : (() => {
                        const totalPages = Math.ceil(bags.length / ITEMS_PER_PAGE);
                        const pageBags = bags.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                        return (
                            <>
                                <div className="space-y-3">
                                    {pageBags.map((bag, idx) => (
                                        <div key={bag._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all gap-3 sm:gap-0 bg-white dark:bg-[#1e293b]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{bag.bagNumber}</p>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500"># {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(bag.date).toLocaleDateString()}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {bag.workers.length} worker{bag.workers.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4">
                                                <div className="text-left sm:text-right">
                                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{bag.weight} kg</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{bag.status}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                    bag.status === 'completed'
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-amber-500 text-white'
                                                }`}>
                                                    {bag.status === 'completed' ? 'Complete' : 'Pending'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–<span className="font-semibold text-gray-900 dark:text-gray-100">{Math.min(currentPage * ITEMS_PER_PAGE, bags.length)}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{bags.length.toLocaleString()}</span> bags
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
                                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                <ChevronLeft className="w-4 h-4" /> Prev
                                            </button>
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                                const page = start + i;
                                                return page <= totalPages ? (
                                                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{page}</button>
                                                ) : null;
                                            })}
                                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                Next <ChevronRight className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

        </div>
    );
}
