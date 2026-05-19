'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
    Shield, Plus, Search, RefreshCw, Power, PowerOff, X,
    User, Phone, Mail, KeyRound, Trash2, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
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

const emptyForm = {
    name: '',
    email: '',
    phone: '',
};

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
    const [confirmToggle, setConfirmToggle] = useState<SupervisorUser | null>(null);
    const [deleteSup, setDeleteSup] = useState<SupervisorUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    useEffect(() => {
        fetchSupervisors();
    }, []);

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
        setDeleting(true);
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            toast.success('Supervisor deleted permanently');
            setDeleteSup(null);
            fetchSupervisors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleting(false);
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

            <PageHeader
                icon={Shield}
                iconColor="text-violet-600 dark:text-violet-400"
                iconBg="bg-transparent"
                title="Supervisors"
                subtitle="Manage supervisor accounts and access"
                action={
                    <button
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Supervisor
                    </button>
                }
            />

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{supervisors.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-green-200 dark:border-green-800 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                        <Power className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-green-600 font-medium">Active</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{active}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                        <PowerOff className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Inactive</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{inactive}</p>
                    </div>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Supervisor Directory</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{filtered.length} of {supervisors.length} supervisors</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search supervisors..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-44 sm:w-56 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button onClick={fetchSupervisors} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Refresh">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                        <p className="text-sm">Loading supervisors...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Shield className="w-14 h-14 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                        <p className="font-semibold text-gray-500 mb-1">No supervisors found</p>
                        <p className="text-sm text-gray-400 mb-5">
                            {searchTerm ? 'Try adjusting your search.' : 'Add your first supervisor to get started.'}
                        </p>
                        {!searchTerm && (
                            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition-colors">
                                <Plus className="w-4 h-4" /> Add Supervisor
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-[#162032] border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supervisor</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-4 sm:px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#1e293b] divide-y divide-gray-100 dark:divide-gray-700/60">
                                {paginated.map(sup => (
                                    <tr key={sup._id} className="group bg-white dark:bg-[#1e293b] transition-all duration-150 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 hover:shadow-[inset_3px_0_0_0_#10b981]">

                                        {/* Supervisor */}
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold shadow-sm bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                                                    {getInitials(sup.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{sup.name}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Added {new Date(sup.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span className="truncate max-w-[200px]">{sup.email}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <span>{sup.phone}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 sm:px-6 py-4">
                                            {sup.isActive ? (
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
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleResendCredentials(sup)}
                                                    title="Reset Password"
                                                    className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                                                >
                                                    <KeyRound className="w-4 h-4" strokeWidth={2.5} />
                                                </button>
                                                {sup.isActive ? (
                                                    <button
                                                        onClick={() => setConfirmToggle(sup)}
                                                        title="Deactivate"
                                                        className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                                                    >
                                                        <PowerOff className="w-4 h-4" strokeWidth={2.5} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleToggleStatus(sup)}
                                                        title="Activate"
                                                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                                                    >
                                                        <Power className="w-4 h-4" strokeWidth={2.5} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setDeleteSup(sup)}
                                                    title="Delete supervisor"
                                                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" strokeWidth={2.5} />
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

            {/* Confirm Deactivate Modal */}
            {confirmToggle && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Deactivate Supervisor?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{confirmToggle.name}</span> will lose access to the supervisor portal.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full pt-1">
                                <button onClick={() => setConfirmToggle(null)} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { handleToggleStatus(confirmToggle); setConfirmToggle(null); }}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                                >
                                    Yes, Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Modal */}
            {deleteSup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center">
                                <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Supervisor Permanently?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{deleteSup.name}</span> and their account will be permanently removed. This cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full pt-1">
                                <button onClick={() => setDeleteSup(null)} disabled={deleting} className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors disabled:opacity-50">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteSupervisor(deleteSup)}
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

            {/* Add Supervisor Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Supervisor</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Login credentials will be emailed automatically.
                                </p>
                            </div>
                            <button onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-emerald-600" />Full Name</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-emerald-600" />Email</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-600" />Phone</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                                        placeholder="+250..."
                                    />
                                </div>
                            </div>

                            {/* Info banner */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                    A temporary password will be generated and sent to the supervisor&apos;s email. They can change it using the &quot;Forgot Password&quot; option.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Creating...' : 'Create Supervisor'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeForm}
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
