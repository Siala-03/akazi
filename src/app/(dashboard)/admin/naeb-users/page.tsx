'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Shield, Plus, RefreshCw, Power, PowerOff, X, User, Phone, Mail, Trash2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface NaebUser {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

const emptyForm = { name: '', email: '', phone: '' };

export default function AdminNaebUsersPage() {
    const [users, setUsers] = useState<NaebUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [confirmToggle, setConfirmToggle] = useState<NaebUser | null>(null);
    const [deleteUser, setDeleteUser] = useState<NaebUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [resendingId, setResendingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/create-user?role=naeb&all=true');
            const data = await res.json();
            setUsers(data.users || []);
        } catch {
            toast.error('Failed to load NAEB users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, role: 'naeb' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');
            toast.success(data.message);
            if (data.emailFailed && data.tempPassword) {
                toast(`Temp password: ${data.tempPassword}`, { duration: 15000, icon: '🔑' });
            }
            setShowForm(false);
            setFormData(emptyForm);
            fetchUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (user: NaebUser) => {
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, isActive: !user.isActive }),
            });
            if (!res.ok) throw new Error('Update failed');
            toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
            setConfirmToggle(null);
            fetchUsers();
        } catch {
            toast.error('Failed to update user');
        }
    };

    const handleDelete = async (user: NaebUser) => {
        setDeleting(true);
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            toast.success('User deleted');
            setDeleteUser(null);
            fetchUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const handleResend = async (user: NaebUser) => {
        setResendingId(user._id);
        try {
            const res = await fetch('/api/admin/resend-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            toast.success(data.message || 'Credentials resent');
            if (data.tempPassword) {
                toast(`Temp password: ${data.tempPassword}`, { duration: 15000, icon: '🔑' });
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to resend credentials');
        } finally {
            setResendingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <PageHeader
                icon={Shield}
                iconBg="bg-transparent"
                title="NAEB Users"
                subtitle="Manage NAEB portal access accounts"
                action={
                    <button
                        onClick={() => { setFormData(emptyForm); setShowForm(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add NAEB User
                    </button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</p>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{users.filter(u => u.isActive).length}</p>
                </div>
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500">Inactive</p>
                    <p className="text-2xl font-bold text-gray-400 mt-1">{users.filter(u => !u.isActive).length}</p>
                </div>
            </div>

            {/* User list */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{users.length} NAEB user{users.length !== 1 ? 's' : ''}</p>
                    <button onClick={fetchUsers} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="font-semibold text-gray-600 dark:text-gray-400">No NAEB users yet</p>
                        <p className="text-sm text-gray-400 mt-1">Add the first NAEB portal account above.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
                        {users.map(user => (
                            <div key={user._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-xs text-gray-400">{user.email}</p>
                                        <p className="text-xs text-gray-400">{user.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    {user.isActive ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 text-white">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                            Inactive
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleResend(user)}
                                        disabled={resendingId === user._id}
                                        title="Resend credentials"
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                    >
                                        {resendingId === user._id ? 'Sending...' : 'Resend Login'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmToggle(user)}
                                        title={user.isActive ? 'Deactivate' : 'Activate'}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                    >
                                        {user.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => setDeleteUser(user)}
                                        title="Delete user"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create form modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add NAEB User</h2>
                                <p className="text-sm text-gray-500 mt-0.5">A temporary password will be emailed to them.</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-600" />Full Name</span>
                                </label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                                    placeholder="Enter full name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-600" />Email</span>
                                </label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                                    placeholder="name@naeb.gov.rw" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-600" />Phone</span>
                                </label>
                                <input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white"
                                    placeholder="0788000000" />
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                    This user will have read-only access to the NAEB portal — workforce summary, exporter activity, and worker database. No operational access.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
                                    {submitting ? 'Creating...' : 'Create NAEB User'}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toggle confirmation */}
            {confirmToggle && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center text-center gap-4">
                            <AlertTriangle className="w-10 h-10 text-amber-500" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {confirmToggle.isActive ? 'Deactivate' : 'Activate'} User?
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">{confirmToggle.name} will {confirmToggle.isActive ? 'lose' : 'regain'} access to the NAEB portal.</p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setConfirmToggle(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors">Cancel</button>
                                <button onClick={() => handleToggle(confirmToggle)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center text-center gap-4">
                            <Trash2 className="w-10 h-10 text-red-500" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete User?</h3>
                                <p className="text-sm text-gray-500 mt-1">{deleteUser.name} will be permanently removed.</p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteUser(null)} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={() => handleDelete(deleteUser)} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
