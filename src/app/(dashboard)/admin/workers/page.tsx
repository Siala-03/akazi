'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, RefreshCw, X, UserPlus, Pencil, UserX, UserCheck, AlertTriangle, Phone, Building2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import toast, { Toaster } from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { SkeletonTable } from '@/components/SkeletonTable';

interface Worker {
    _id: string;
    workerId: string;
    fullName: string;
    gender: string;
    phone: string;
    email?: string;
    primaryRole: string;
    status: string;
    cooperativeId: {
        _id: string;
        name: string;
    };
    enrollmentDate: string;
}

interface Cooperative {
    _id: string;
    name: string;
    code: string;
}

const emptyNewWorker = {
    fullName: '',
    workerId: '',
    gender: 'male',
    phone: '',
    email: '',
    primaryRole: 'Coffee Sorter',
    cooperativeId: '',
    consentWorkRecords: false,
};

export default function AdminWorkersPage() {
    const searchParams = useSearchParams();
    const initializedFromUrl = useRef(false);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (!initializedFromUrl.current) {
            initializedFromUrl.current = true;
            const q = searchParams.get('q');
            if (q) setSearchTerm(q);
        }
    }, [searchParams]);

    // Reset to page 1 on filter change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<any>({});

    // New worker registration state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newWorker, setNewWorker] = useState(emptyNewWorker);
    const [submitting, setSubmitting] = useState(false);

    // Confirm toggle modal
    const [confirmWorker, setConfirmWorker] = useState<Worker | null>(null);

    // Confirm delete modal
    const [deleteWorker, setDeleteWorker] = useState<Worker | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        fetchWorkers();
        fetchCooperatives();
    }, []);

    const fetchWorkers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/workers');
            const data = await res.json();
            setWorkers(data.workers || []);
        } catch (error) {
            console.error('Error fetching workers:', error);
            toast.error('Failed to load workers');
        } finally {
            setLoading(false);
        }
    };

    const fetchCooperatives = async () => {
        try {
            const res = await fetch('/api/cooperatives');
            if (res.ok) {
                const data = await res.json();
                setCooperatives(data.cooperatives || []);
            }
        } catch {
            console.error('Failed to load cooperatives');
        }
    };

    const handleEditWorker = (worker: Worker) => {
        setSelectedWorker(worker);
        setFormData({
            fullName: worker.fullName,
            phone: worker.phone,
            gender: worker.gender,
            primaryRole: worker.primaryRole,
        });
        setEditMode(true);
    };

    const handleUpdateWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorker) return;

        try {
            const res = await fetch(`/api/workers/${selectedWorker._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Update failed');

            toast.success('Worker updated successfully');
            setEditMode(false);
            setSelectedWorker(null);
            fetchWorkers();
        } catch {
            toast.error('Failed to update worker');
        }
    };

    const handleToggleStatus = async (worker: Worker) => {
        try {
            const newStatus = worker.status === 'active' ? 'inactive' : 'active';
            const res = await fetch(`/api/workers/${worker._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error('Status update failed');

            toast.success(`Worker ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            setConfirmWorker(null);
            fetchWorkers();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteWorker = async (worker: Worker) => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/workers/${worker._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            toast.success('Worker permanently deleted');
            setDeleteWorker(null);
            fetchWorkers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newWorker.consentWorkRecords) {
            toast.error('Worker consent is required');
            return;
        }
        if (!newWorker.cooperativeId) {
            toast.error('Please select a cooperative');
            return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                ...newWorker,
                photo: '/uploads/placeholder.jpg',
            };

            const res = await fetch('/api/workers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.details || 'Registration failed');

            toast.success('Worker registered successfully!');
            setShowAddForm(false);
            setNewWorker(emptyNewWorker);
            fetchWorkers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredWorkers = workers.filter((worker) => {
        const matchesSearch =
            worker.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.phone.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || worker.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredWorkers.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedWorkers = filteredWorkers.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <PageHeader
                icon={Users}
                title="Workers Management"
                subtitle="Manage all workers across cooperatives"
                action={
                    <button
                        onClick={() => { setNewWorker(emptyNewWorker); setShowAddForm(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" /> Register Worker
                    </button>
                }
            />

            {/* Filters */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Search Workers
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name, ID, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status Filter
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                        >
                            <option value="all">All Workers</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={fetchWorkers}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Workers Table */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Workers Directory</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">{filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} found</p>
                    </div>
                </div>
                {loading ? (
                    <SkeletonTable rows={8} cols={5} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-[#162032] border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Worker</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cooperative</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/40">
                                {paginatedWorkers.map((worker) => (
                                    <tr
                                        key={worker._id}
                                        className="group bg-white dark:bg-[#1e293b] transition-all duration-150 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 hover:shadow-[inset_3px_0_0_0_#10b981]"
                                    >
                                        {/* Worker */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm
                                                    bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                                                    {getInitials(worker.fullName)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{worker.fullName}</div>
                                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-normal tracking-wide">{worker.workerId}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                {worker.phone}
                                            </div>
                                            <div className="text-xs text-gray-400 capitalize mt-0.5 ml-5">{worker.gender}</div>
                                        </td>

                                        {/* Cooperative */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{worker.cooperativeId?.name || 'N/A'}</span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {worker.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 text-white">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleEditWorker(worker)}
                                                    title="Edit worker"
                                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-800/40 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                {worker.status === 'active' ? (
                                                    <button
                                                        onClick={() => setConfirmWorker(worker)}
                                                        title="Deactivate worker"
                                                        className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-800/40 transition-colors"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleToggleStatus(worker)}
                                                        title="Activate worker"
                                                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-800/40 transition-colors"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setDeleteWorker(worker)}
                                                    title="Permanently delete worker"
                                                    className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700/40 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredWorkers.length === 0 && (
                            <div className="p-16 text-center">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="font-semibold text-gray-700 dark:text-gray-300">
                                    {searchTerm || statusFilter !== 'all' ? 'No workers match your filters' : 'No workers registered yet'}
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    {searchTerm || statusFilter !== 'all'
                                        ? 'Try clearing the search or changing the status filter'
                                        : 'Register your first worker using the button above'}
                                </p>
                                {(searchTerm || statusFilter !== 'all') && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                                        className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {!loading && filteredWorkers.length > 0 && (
                    <Pagination
                        currentPage={safePage}
                        totalItems={filteredWorkers.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                        itemLabel="workers"
                    />
                )}
            </div>

            {/* Edit Modal */}
            {editMode && selectedWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Worker</h2>
                            <button onClick={() => { setEditMode(false); setSelectedWorker(null); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateWorker} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" required>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Role</label>
                                <input type="text" value={formData.primaryRole} onChange={(e) => setFormData({ ...formData, primaryRole: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" required />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors">Save Changes</button>
                                <button type="button" onClick={() => { setEditMode(false); setSelectedWorker(null); }} className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Deactivate Modal */}
            {confirmWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Deactivate Worker?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{confirmWorker.fullName}</span> will be marked inactive and excluded from daily operations.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full pt-1">
                                <button
                                    onClick={() => setConfirmWorker(null)}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(confirmWorker)}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                                >
                                    Yes, Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Confirmation */}
            {deleteWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Worker Permanently?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{deleteWorker.fullName}</span> will be removed from all records. This cannot be undone.
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5">
                                    Workers with attendance, session, or payroll history cannot be deleted — deactivate them instead.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full pt-1">
                                <button
                                    onClick={() => setDeleteWorker(null)}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteWorker(deleteWorker)}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting...' : 'Delete Permanently'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Register Worker Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Register New Worker</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Fill in the worker details below.</p>
                            </div>
                            <button onClick={() => setShowAddForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddWorker} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                                <input type="text" required value={newWorker.fullName} onChange={e => setNewWorker({ ...newWorker, fullName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" placeholder="Enter full name" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Worker ID (National ID)</label>
                                    <input type="text" value={newWorker.workerId} onChange={e => setNewWorker({ ...newWorker, workerId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" placeholder="Auto-generated if blank" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender *</label>
                                    <select required value={newWorker.gender} onChange={e => setNewWorker({ ...newWorker, gender: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white">
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone *</label>
                                    <input type="tel" required value={newWorker.phone} onChange={e => setNewWorker({ ...newWorker, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" placeholder="+250..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <input type="email" value={newWorker.email} onChange={e => setNewWorker({ ...newWorker, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" placeholder="email@example.com" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary Role *</label>
                                    <input type="text" required value={newWorker.primaryRole} onChange={e => setNewWorker({ ...newWorker, primaryRole: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white" placeholder="Coffee Sorter" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cooperative *</label>
                                    <select required value={newWorker.cooperativeId} onChange={e => setNewWorker({ ...newWorker, cooperativeId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white">
                                        <option value="">Select cooperative</option>
                                        {cooperatives.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Consent */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg p-3">
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newWorker.consentWorkRecords}
                                        onChange={e => setNewWorker({ ...newWorker, consentWorkRecords: e.target.checked })}
                                        className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-xs text-amber-800 dark:text-amber-400">
                                        Worker has given consent for work records to be maintained in the system. *
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Registering...' : 'Register Worker'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
