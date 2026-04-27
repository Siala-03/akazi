'use client';

import { useEffect, useState } from 'react';
import { Users, RefreshCw, X, UserPlus, Pencil, UserX, UserCheck, Trash2, AlertTriangle, Phone, Building2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Pagination from '@/components/Pagination';

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

const inputClass = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function AdminWorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<any>({});

    const [showAddForm, setShowAddForm] = useState(false);
    const [newWorker, setNewWorker] = useState(emptyNewWorker);
    const [submitting, setSubmitting] = useState(false);

    const [confirmWorker, setConfirmWorker] = useState<Worker | null>(null);
    const [deleteWorker, setDeleteWorker] = useState<Worker | null>(null);

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
        } catch {
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

    const handleDeleteWorker = async () => {
        if (!deleteWorker) return;
        try {
            const res = await fetch(`/api/workers/${deleteWorker._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete worker');
            toast.success('Worker deleted successfully');
            setDeleteWorker(null);
            fetchWorkers();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete worker');
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
            const payload: any = { ...newWorker, photo: '/uploads/placeholder.jpg' };
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

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workers</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage all workers across cooperatives</p>
                    </div>
                </div>
                <button
                    onClick={() => { setNewWorker(emptyNewWorker); setShowAddForm(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors shrink-0"
                >
                    <UserPlus className="w-4 h-4" />
                    Register Worker
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Search Workers</label>
                        <input
                            type="text"
                            placeholder="Search by name, ID, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={inputClass}
                        >
                            <option value="all">All Workers</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={fetchWorkers}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Workers Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Workers Directory</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} found</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-3"></div>
                        <p className="text-sm">Loading workers...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Worker</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cooperative</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {paginatedWorkers.map((worker) => (
                                    <tr key={worker._id} className="group hover:bg-violet-50/40 dark:hover:bg-violet-950/10 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold bg-gradient-to-br from-violet-500 to-violet-700 text-white">
                                                    {getInitials(worker.fullName)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{worker.fullName}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5 font-mono">{worker.workerId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                {worker.phone}
                                            </div>
                                            <div className="text-xs text-slate-400 capitalize mt-0.5 ml-5">{worker.gender}</div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{worker.cooperativeId?.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            {worker.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditWorker(worker)}
                                                    title="Edit worker"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/30 dark:hover:text-violet-400 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                {worker.status === 'active' ? (
                                                    <button
                                                        onClick={() => setConfirmWorker(worker)}
                                                        title="Deactivate worker"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleToggleStatus(worker)}
                                                        title="Activate worker"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setDeleteWorker(worker)}
                                                    title="Delete worker"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
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
                                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                <p className="text-sm font-medium text-slate-500">No workers found</p>
                                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria</p>
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Worker</h2>
                            <button onClick={() => { setEditMode(false); setSelectedWorker(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateWorker} className="space-y-4">
                            <div>
                                <label className={labelClass}>Full Name</label>
                                <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className={inputClass} required />
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} required />
                            </div>
                            <div>
                                <label className={labelClass}>Gender</label>
                                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className={inputClass} required>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Primary Role</label>
                                <input type="text" value={formData.primaryRole} onChange={(e) => setFormData({ ...formData, primaryRole: e.target.value })} className={inputClass} required />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 bg-violet-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors">Save Changes</button>
                                <button type="button" onClick={() => { setEditMode(false); setSelectedWorker(null); }} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Deactivate Modal */}
            {confirmWorker && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Deactivate Worker?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{confirmWorker.fullName}</span> will be marked inactive and excluded from daily operations.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setConfirmWorker(null)} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={() => handleToggleStatus(confirmWorker)} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                                    Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {deleteWorker && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Worker?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{deleteWorker.fullName}</span> will be permanently removed if no operational records exist.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteWorker(null)} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleDeleteWorker} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Register Worker Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Register New Worker</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Fill in the worker details below.</p>
                            </div>
                            <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddWorker} className="p-6 space-y-4">
                            <div>
                                <label className={labelClass}>Full Name *</label>
                                <input type="text" required value={newWorker.fullName} onChange={e => setNewWorker({ ...newWorker, fullName: e.target.value })} className={inputClass} placeholder="Enter full name" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Worker ID (National ID)</label>
                                    <input type="text" value={newWorker.workerId} onChange={e => setNewWorker({ ...newWorker, workerId: e.target.value })} className={inputClass} placeholder="Auto-generated if blank" />
                                </div>
                                <div>
                                    <label className={labelClass}>Gender *</label>
                                    <select required value={newWorker.gender} onChange={e => setNewWorker({ ...newWorker, gender: e.target.value })} className={inputClass}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Phone *</label>
                                    <input type="tel" required value={newWorker.phone} onChange={e => setNewWorker({ ...newWorker, phone: e.target.value })} className={inputClass} placeholder="+250..." />
                                </div>
                                <div>
                                    <label className={labelClass}>Email <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <input type="email" value={newWorker.email} onChange={e => setNewWorker({ ...newWorker, email: e.target.value })} className={inputClass} placeholder="email@example.com" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Primary Role *</label>
                                    <input type="text" required value={newWorker.primaryRole} onChange={e => setNewWorker({ ...newWorker, primaryRole: e.target.value })} className={inputClass} placeholder="Coffee Sorter" />
                                </div>
                                <div>
                                    <label className={labelClass}>Cooperative *</label>
                                    <select required value={newWorker.cooperativeId} onChange={e => setNewWorker({ ...newWorker, cooperativeId: e.target.value })} className={inputClass}>
                                        <option value="">Select cooperative</option>
                                        {cooperatives.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newWorker.consentWorkRecords}
                                        onChange={e => setNewWorker({ ...newWorker, consentWorkRecords: e.target.checked })}
                                        className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <span className="text-xs text-amber-800 dark:text-amber-400">
                                        Worker has given consent for work records to be maintained in the system. *
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Registering...' : 'Register Worker'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
