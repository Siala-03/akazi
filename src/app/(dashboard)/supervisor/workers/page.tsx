'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Users, Phone, Calendar, User, Filter, X, ChevronDown, Search, Clock, Package, Banknote, Award, TrendingUp, Eye, BarChart2, QrCode } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import { WorkerQrModal } from '@/components/qr/WorkerQrModal';

const SESSION_RATE = 2000;

interface Worker {
    _id: string;
    workerId: string;
    fullName: string;
    phone: string;
    gender: string;
    status: string;
    enrollmentDate: string;
    weekSessions?: number;
}

interface WorkerStats {
    totalActiveWorkers: number;
    totalInactiveWorkers: number;
    totalLaborCosts: number;
    avgHoursPerWorker: number;
    topPerformer: {
        name: string;
        bagsProcessed: number;
    } | null;
}

interface WorkerDetails {
    totalHours: number;
    totalBags: number;
    earnings: number;
    daysWorkedThisMonth: number;
}

interface FilterParams {
    search?: string;
    status?: string;
    gender?: string;
    dateFrom?: string;
    dateTo?: string;
    week?: string;
}

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [showTable, setShowTable] = useState(true);
    const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
    const [workerDetails, setWorkerDetails] = useState<WorkerDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [qrWorker, setQrWorker] = useState<{ id: string; name: string } | null>(null);
    
    const [filters, setFilters] = useState<FilterParams>({
        search: '',
        status: 'all',
        gender: 'all',
        dateFrom: '',
        dateTo: '',
        week: ''
    });

    useEffect(() => {
        fetchWorkers();
        fetchWorkerStats();
    }, [filters]);

    const fetchWorkers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            
            if (filters.search) params.append('search', filters.search);
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.gender && filters.gender !== 'all') params.append('gender', filters.gender);
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.week) params.append('week', filters.week);
            
            const queryString = params.toString();
            const url = `/api/workers${queryString ? `?${queryString}` : ''}`;
            
            const res = await fetch(url);
            const data = await res.json();
            setWorkers(data.workers || []);
        } catch (error) {
            console.error('Error fetching workers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkerStats = async () => {
        try {
            const res = await fetch('/api/workers/stats');
            const data = await res.json();
            setWorkerStats(data.stats);
        } catch (error) {
            console.error('Error fetching worker stats:', error);
        }
    };

    const fetchWorkerDetails = async (workerId: string) => {
        setLoadingDetails(true);
        try {
            const res = await fetch(`/api/workers/${workerId}/details`);
            const data = await res.json();
            setWorkerDetails(data.details);
            setSelectedWorker(workerId);
        } catch (error) {
            console.error('Error fetching worker details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleFilterChange = (key: keyof FilterParams, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            gender: 'all',
            dateFrom: '',
            dateTo: '',
            week: ''
        });
    };

    const getWeekOptions = () => {
        const weeks = [];
        const today = new Date();
        
        for (let i = 0; i < 12; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - (today.getDay() || 7) - (i * 7));
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const startStr = weekStart.toISOString().split('T')[0];
            const endStr = weekEnd.toISOString().split('T')[0];
            
            weeks.push({
                value: `${startStr}_${endStr}`,
                label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            });
        }
        
        return weeks;
    };

    const hasActiveFilters = () => {
        return filters.search !== '' || 
               (filters.status !== 'all' && filters.status !== '') ||
               (filters.gender !== 'all' && filters.gender !== '') ||
               filters.dateFrom !== '' ||
               filters.dateTo !== '' ||
               filters.week !== '';
    };

    const columns: Column<Worker>[] = [
        {
            key: 'fullName',
            label: 'Name',
            sortable: true,
            render: (worker) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                        {worker.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-medium text-gray-900">{worker.fullName}</div>
                </div>
            )
        },
        {
            key: 'workerId',
            label: 'National ID',
            sortable: true,
            render: (worker) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-mono font-semibold border border-emerald-200">
                    {worker.workerId}
                </span>
            )
        },
        {
            key: 'phone',
            label: 'Phone',
            sortable: true,
            render: (worker) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {worker.phone}
                </div>
            )
        },
        {
            key: 'gender',
            label: 'Gender',
            sortable: true,
            render: (worker) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="capitalize">{worker.gender}</span>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (worker) => (
                <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${worker.status === 'active'
                        ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-300'
                        : 'bg-gray-50 text-gray-400'
                    }
                `}>
                    {worker.status === 'active' && (
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1.5" />
                    )}
                    {worker.status}
                </span>
            )
        },
        {
            key: 'weekSessions',
            label: 'Sessions This Week',
            sortable: true,
            render: (worker) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <BarChart2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{worker.weekSessions ?? 0}</span>
                    <span className="text-xs text-gray-400">session{(worker.weekSessions ?? 0) !== 1 ? 's' : ''}</span>
                </div>
            )
        },
        {
            key: 'earnings',
            label: 'Total Earnings (RWF)',
            sortable: true,
            render: (worker) => {
                const earnings = (worker.weekSessions ?? 0) * SESSION_RATE;
                return (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Banknote className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-700">
                            {earnings.toLocaleString()}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'enrollmentDate',
            label: 'Enrolled Date',
            sortable: true,
            render: (worker) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(worker.enrollmentDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (worker) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchWorkerDetails(worker._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-200"
                    >
                        <Eye className="w-4 h-4" />
                        Details
                    </button>
                    <button
                        onClick={() => setQrWorker({ id: worker._id, name: worker.fullName })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors border border-emerald-200"
                        title="Show QR Badge"
                    >
                        <QrCode className="w-4 h-4" />
                        QR
                    </button>
                </div>
            )
        }
    ];

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
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                                <Users className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Workers Directory</h1>
                        </div>
                        <p className="text-white/90 text-base sm:text-lg ml-15">
                            Manage and view all registered workers ({workers.length} total)
                        </p>
                    </div>
                    <a
                        href="/supervisor/onboarding"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors w-full sm:w-auto border border-white/30 backdrop-blur-sm shadow-sm shrink-0"
                    >
                        <UserPlus className="w-4 h-4" />
                        Onboard Worker
                    </a>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Filter Toggle Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">Filters</span>
                        {hasActiveFilters() && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                Active
                            </span>
                        )}
                    </div>
                    <ChevronDown 
                        className={`w-5 h-5 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Filter Controls */}
                {showFilters && (
                    <div className="px-4 sm:px-6 pb-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
                            {/* Search */}
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or worker ID..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-sm"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors bg-white text-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Gender Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                <select
                                    value={filters.gender}
                                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors bg-white text-sm"
                                >
                                    <option value="all">All Genders</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Week Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Week</label>
                                <select
                                    value={filters.week}
                                    onChange={(e) => handleFilterChange('week', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors bg-white text-sm"
                                >
                                    <option value="">All Weeks</option>
                                    {getWeekOptions().map(week => (
                                        <option key={week.value} value={week.value}>
                                            {week.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-sm"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors text-sm"
                                />
                            </div>
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters() && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={resetFilters}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Cards - Worker Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Workers</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {workerStats?.totalActiveWorkers || workers.filter(w => w.status === 'active').length}
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Inactive</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {workerStats?.totalInactiveWorkers || workers.filter(w => w.status !== 'active').length}
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Labor Costs (RWF)</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {workerStats?.totalLaborCosts?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">All time</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg Hrs / Worker</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {workerStats?.avgHoursPerWorker?.toFixed(1) || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Per worker</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Top Performer</p>
                    <p className="text-base sm:text-xl font-bold text-gray-900 mt-1 truncate">
                        {workerStats?.topPerformer?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {workerStats?.topPerformer?.bagsProcessed || 0} bags
                    </p>
                </div>
            </div>

            {/* Workers Table - collapsible */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Table toggle header */}
                <button
                    onClick={() => setShowTable(!showTable)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">Workers Data</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            {workers.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="hidden sm:inline">{showTable ? 'Hide' : 'Show'}</span>
                        <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showTable ? 'rotate-180' : ''}`}
                        />
                    </div>
                </button>

                {/* Table content */}
                {showTable && (
                    <div className="border-t border-gray-200 overflow-x-auto">
                        <DataTable
                            data={workers}
                            columns={columns}
                            keyExtractor={(worker) => worker._id}
                            searchable={true}
                            searchKeys={['fullName', 'workerId', 'phone']}
                            pageSize={25}
                            loading={loading}
                            emptyMessage="No workers found. Click 'Onboard Worker' to register your first worker."
                        />
                    </div>
                )}
            </div>

            {/* Worker Details Modal */}
            {selectedWorker && (
                <div className="fixed inset-0 bg-gray-600/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setSelectedWorker(null)}>
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Worker Details</h2>
                            <button
                                onClick={() => setSelectedWorker(null)}
                                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            </div>
                        ) : workerDetails ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                            <Clock className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Total Hours Worked</p>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">{workerDetails.totalHours.toFixed(1)}</p>
                                    <p className="text-sm text-gray-500 mt-1">Hours</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                            <Package className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Total Bags Processed</p>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">{workerDetails.totalBags}</p>
                                    <p className="text-sm text-gray-500 mt-1">Bags</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                            <Banknote className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Earnings to Date (RWF)</p>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">{workerDetails.earnings.toLocaleString()}</p>
                                    <p className="text-sm text-gray-500 mt-1">Total Earned</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                                            <Calendar className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Days Worked This Month</p>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">{workerDetails.daysWorkedThisMonth}</p>
                                    <p className="text-sm text-gray-500 mt-1">Days</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No details available</p>
                        )}
                    </div>
                </div>
            )}

            {/* QR Badge Modal */}
            {qrWorker && (
                <WorkerQrModal
                    workerId={qrWorker.id}
                    workerName={qrWorker.name}
                    onClose={() => setQrWorker(null)}
                />
            )}
        </div>
    );
}
