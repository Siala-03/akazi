'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
    Shield, Plus, Search, RefreshCw, Power, PowerOff, X,
    User, Phone, Mail, KeyRound, Trash2,
} from 'lucide-react';
import Pagination from '@/components/Pagination';

interface SupervisorUser {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

const emptyForm = { name: '', email: '', phone: '' };

const inputClass = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function AdminSupervisorsPage() {
    const [supervisors, setSupervisors] = useState<SupervisorUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    useEffect(() => { fetchSupervisors(); }, []);

    const fetchSupervisors = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/create-user?role=supervisor&all=true');
            const data = await res.json();
            setSupervisors(data.users || []);
        } catch {
            toast.error('Failed to load supervisors');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => { setFormData(emptyForm); setShowAddForm(true); };
    const closeForm = () => { setShowAddForm(false); setFormData(emptyForm); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, role: 'supervisor' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create supervisor');
            toast.success(data.message || 'Supervisor created successfully');
            closeForm();
            fetchSupervisors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create supervisor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (user: SupervisorUser) => {
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, isActive: !user.isActive }),
            });
            if (!res.ok) throw new Error('Status update failed');
            toast.success(`Supervisor ${!user.isActive ? 'activated' : 'deactivated'}`);
            fetchSupervisors();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleResendCredentials = async (user: SupervisorUser) => {
        try {
            const res = await fetch('/api/admin/resend-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to resend');
            toast.success(data.message || 'Credentials resent successfully');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to resend credentials');
        }
    };

    const handleDeleteSupervisor = async (user: SupervisorUser) => {
        if (!window.confirm(`Delete supervisor ${user.name}? This action cannot be undone.`)) return;
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete supervisor');
            toast.success('Supervisor deleted successfully');
            fetchSupervisors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete supervisor');
        }
    };

    const filtered = supervisors.filter(s => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !searchTerm ||
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.phone.includes(q);
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? s.isActive : !s.isActive);
        return matchSearch && matchStatus;
    });

    const active = supervisors.filter(s => s.isActive).length;
    const inactive = supervisors.length - active;

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Supervisors</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage supervisor accounts and access</p>
                    </div>
                </div>
                <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Add Supervisor
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Total</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{supervisors.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <Power className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{active}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <PowerOff className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Inactive</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{inactive}</p>
                    </div>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Supervisor Directory</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{filtered.length} of {supervisors.length} supervisors</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search supervisors..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent w-44 sm:w-56 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button onClick={fetchSupervisors} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Refresh">
                            <RefreshCw className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-3"></div>
                        <p className="text-sm">Loading supervisors...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-medium text-slate-500 mb-1">No supervisors found</p>
                        <p className="text-xs text-slate-400 mb-5">
                            {searchTerm ? 'Try adjusting your search.' : 'Add your first supervisor to get started.'}
                        </p>
                        {!searchTerm && (
                            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium transition-colors">
                                <Plus className="w-4 h-4" /> Add Supervisor
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supervisor</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {paginated.map(sup => (
                                    <tr key={sup._id} className="group hover:bg-violet-50/40 dark:hover:bg-violet-950/10 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold bg-gradient-to-br from-violet-500 to-violet-700 text-white">
                                                    {getInitials(sup.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{sup.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Added {new Date(sup.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[200px]">{sup.email}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span>{sup.phone}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {sup.isActive ? (
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
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleResendCredentials(sup)}
                                                    title="Reset Password"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors"
                                                >
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                    Reset
                                                </button>
                                                {sup.isActive ? (
                                                    <button
                                                        onClick={() => handleToggleStatus(sup)}
                                                        title="Deactivate"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 transition-colors"
                                                    >
                                                        <PowerOff className="w-3.5 h-3.5" />
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleToggleStatus(sup)}
                                                        title="Activate"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors"
                                                    >
                                                        <Power className="w-3.5 h-3.5" />
                                                        Activate
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteSupervisor(sup)}
                                                    title="Delete supervisor"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                            </div>
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
                        itemLabel="supervisors"
                    />
                )}
            </div>

            {/* Add Supervisor Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Supervisor</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Login credentials will be emailed automatically.</p>
                            </div>
                            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={labelClass}>
                                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-violet-600" />Full Name</span>
                                </label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Full name" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-violet-600" />Email</span>
                                    </label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="email@example.com" />
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-violet-600" />Phone</span>
                                    </label>
                                    <input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="+250..." />
                                </div>
                            </div>
                            <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-3">
                                <p className="text-xs text-sky-700 dark:text-sky-400">
                                    A temporary password will be generated and sent to the supervisor&apos;s email. They can change it using the &quot;Forgot Password&quot; option.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Creating...' : 'Create Supervisor'}
                                </button>
                                <button type="button" onClick={closeForm} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
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
