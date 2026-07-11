'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, RefreshCw, Phone, Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SkeletonTable } from '@/components/SkeletonTable';
import Pagination from '@/components/Pagination';

interface Worker {
    _id: string;
    workerId: string;
    fullName: string;
    gender: string;
    phone: string;
    primaryRole: string;
    status: string;
    dateOfBirth?: string;
    enrollmentDate: string;
    cooperativeId: { _id: string; name: string } | null;
}

export default function NaebWorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, genderFilter, statusFilter]);

    const fetchWorkers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/workers');
            const data = await res.json();
            setWorkers(data.workers || []);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

    const filtered = workers.filter(w => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
            !q ||
            w.fullName.toLowerCase().includes(q) ||
            w.workerId.toLowerCase().includes(q) ||
            w.phone.includes(q);
        const matchGender = genderFilter === 'all' || w.gender === genderFilter;
        const matchStatus = statusFilter === 'all' || w.status === statusFilter;
        return matchSearch && matchGender && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const womenCount = filtered.filter(w => w.gender === 'female').length;
    const activeCount = filtered.filter(w => w.status === 'active').length;

    const handleExportCsv = () => {
        const headers = ['Full Name', 'National ID', 'Gender', 'Phone', 'Role', 'Cooperative', 'Date of Birth', 'Status', 'Enrolled'];
        const rows = filtered.map(w => [
            w.fullName,
            w.workerId,
            w.gender,
            w.phone,
            w.primaryRole,
            w.cooperativeId?.name ?? '—',
            w.dateOfBirth ? new Date(w.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            w.status,
            new Date(w.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `naeb_workers_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Users}
                iconBg="bg-transparent"
                title="Worker Database"
                subtitle="All registered workers across cooperatives"
                action={
                    <button
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                }
            />

            {/* Summary strip */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-3 flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span>
                    <span className="text-gray-500">workers shown</span>
                </div>
                <div className="w-px h-4 self-center bg-gray-200 dark:bg-gray-600" />
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-pink-600">{womenCount}</span>
                    <span className="text-gray-500">women</span>
                </div>
                <div className="w-px h-4 self-center bg-gray-200 dark:bg-gray-600" />
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-600">{activeCount}</span>
                    <span className="text-gray-500">active</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                        />
                    </div>
                    <select
                        value={genderFilter}
                        onChange={e => setGenderFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                    >
                        <option value="all">All Genders</option>
                        <option value="female">Women</option>
                        <option value="male">Men</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
                    <button onClick={fetchWorkers} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <SkeletonTable rows={10} cols={8} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-[#162032]">
                                <tr>
                                    {['Full Name', 'National ID', 'Gender', 'Phone', 'Cooperative', 'Date of Birth', 'Status', 'Enrolled'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/40">
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                                            No workers match the selected filters.
                                        </td>
                                    </tr>
                                ) : paginated.map(worker => (
                                    <tr key={worker._id} className="group bg-white dark:bg-[#1e293b] transition-all duration-150 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 hover:shadow-[inset_3px_0_0_0_#10b981]">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {worker.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{worker.fullName}</p>
                                                    <p className="text-xs text-gray-400 capitalize">{worker.primaryRole}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm font-mono text-gray-600 dark:text-gray-400">{worker.workerId}</td>
                                        <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 capitalize">{worker.gender}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                {worker.phone}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                                            {worker.cooperativeId?.name ?? '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                                            {worker.dateOfBirth
                                                ? new Date(worker.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {worker.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 text-white">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(worker.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && filtered.length > 0 && (
                    <Pagination
                        currentPage={safePage}
                        totalItems={filtered.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                        itemLabel="workers"
                    />
                )}
            </div>
        </div>
    );
}
