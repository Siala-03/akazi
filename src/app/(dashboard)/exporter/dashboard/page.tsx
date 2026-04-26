'use client';

import { useEffect, useState } from 'react';
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
    Info
} from 'lucide-react';
import { ExportButton } from '@/components/export/ExportButton';
import { ExportData } from '@/lib/export';

export default function ExporterDashboard() {
    const [bags, setBags] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [exporterInfo, setExporterInfo] = useState({ name: 'Exporter', code: 'EXP' });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [bagsRes, analyticsRes] = await Promise.all([
                fetch('/api/bags'),
                fetch('/api/analytics/exporter'),
            ]);

            const bagsData = await bagsRes.json();
            const analyticsData = await analyticsRes.json();

            const myBags = bagsData.bags || [];
            setBags(myBags);
            setAnalytics(analyticsData.analytics);
            setLastUpdated(new Date());

            if (myBags.length > 0 && myBags[0].exporterId) {
                setExporterInfo({
                    name: myBags[0].exporterId.companyTradingName || 'Exporter',
                    code: myBags[0].exporterId.exporterCode || 'EXP'
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
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
                totalBags: analytics?.totalBags || 0,
                totalWeight: analytics?.totalWeight || 0,
                totalWorkers: analytics?.workersEngaged || 0,
                averageWeight: analytics?.totalBags > 0 ? analytics.totalWeight / analytics.totalBags : 0
            }
        };
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
                            <h1 className="text-4xl font-bold text-white drop-shadow-lg">Exporter Dashboard</h1>
                        </div>
                        <p className="text-white/90 text-lg ml-15">
                            Coffee export operations & performance overview
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


            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Total Bags */}
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Bags</p>
                        <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100">{analytics?.totalBags || 0}</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">All time processed</p>
                    </div>
                </div>

                {/* Workers Engaged */}
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Workers Engaged</p>
                        <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100">{analytics?.workersEngaged || 0}</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Unique workers</p>
                    </div>
                </div>

                {/* Total Weight */}
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-emerald-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                <Weight className="w-6 h-6 text-emerald-600" />
                            </div>
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Weight</p>
                        <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100">{analytics?.totalWeight?.toLocaleString() || 0}</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">kg processed</p>
                    </div>
                </div>

                {/* Daily Average */}
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-amber-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                            <TrendingUp className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Daily Average</p>
                        <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100">{analytics?.avgBagsPerDay?.toFixed(1) || 0}</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">bags per day</p>
                    </div>
                </div>
            </div>

            {/* Financial Metrics */}
            {analytics && !analytics.hasRateCard && analytics.totalCost === 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No Rate Card Configured</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Contact an administrator to set up a rate card so labor costs can be calculated.</p>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Daily Labor Cost */}
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Daily Labor Cost</p>
                        <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100">
                            FRw {(analytics?.costToday || 0).toLocaleString()}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{analytics?.bagsToday || 0} bags today {analytics?.ratePerBag ? `@ FRw ${analytics.ratePerBag.toLocaleString()}/bag` : '(no rate set)'}</p>
                    </div>
                </div>

                {/* Monthly Cost */}
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-blue-600" />
                            </div>
                            <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Monthly Cost</p>
                        <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100">
                            FRw {(analytics?.costThisMonth || 0).toLocaleString()}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{analytics?.bagsThisMonth || 0} bags this month</p>
                    </div>
                </div>

                {/* Cumulative Cost */}
                <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border-l-4 border-l-orange-500 border-t border-r border-b border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-orange-600" />
                            </div>
                            <BarChart3 className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Cumulative Cost</p>
                        <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-gray-100">
                            FRw {(analytics?.totalCost || 0).toLocaleString()}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">All time labor charges</p>
                    </div>
                </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Overview</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bags processed across different periods</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Today</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics?.bagsToday || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Bags processed</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{analytics?.bagsToday > 0 ? 'Active' : 'Pending'}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 border-l-4 border-l-purple-500 border-t border-r border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">This Week</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics?.bagsThisWeek || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Last 7 days</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{((analytics?.bagsThisWeek || 0) / 7).toFixed(1)} avg/day</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] rounded-xl p-4 border-l-4 border-l-emerald-500 border-t border-r border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">This Month</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{analytics?.bagsThisMonth || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Monthly total</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{(((analytics?.bagsThisMonth || 0) / new Date().getDate()) * 30).toFixed(0)} projected</span>
                        </div>
                    </div>
                </div>
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
                                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
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

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–<span className="font-semibold text-gray-900 dark:text-gray-100">{Math.min(currentPage * ITEMS_PER_PAGE, bags.length)}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{bags.length.toLocaleString()}</span> bags
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setCurrentPage(1)}
                                                disabled={currentPage === 1}
                                                className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                title="First page"
                                            >
                                                «
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Prev
                                            </button>

                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                                                const page = start + i;
                                                return page <= totalPages ? (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                                            currentPage === page
                                                                ? 'bg-blue-600 text-white shadow'
                                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ) : null;
                                            })}

                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next <ChevronRight className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(totalPages)}
                                                disabled={currentPage === totalPages}
                                                className="px-2 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                title="Last page"
                                            >
                                                »
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Info className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        Read-Only Access
                    </h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    You have view-only access to your processing data. You cannot modify attendance,
                    worker assignments, or bag records. For any data corrections or updates,
                    please contact the system administrator.
                </p>
            </div>
        </div>
    );
}
