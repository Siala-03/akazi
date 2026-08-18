'use client';

import { useEffect, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ShieldAlert, Lock, LockOpen, Power, UserCheck, UserX, Loader2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface PendingUser {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
}

export default function SystemControlPage() {
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loginsLocked, setLoginsLocked] = useState(false);
    const [sessionsInvalidatedAt, setSessionsInvalidatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/superadmin');
            if (res.status === 401) { setForbidden(true); return; }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load');
            setPendingUsers(data.pendingUsers || []);
            setLoginsLocked(data.loginsLocked);
            setSessionsInvalidatedAt(data.sessionsInvalidatedAt);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load system control data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const call = async (action: string, extra: Record<string, unknown> = {}) => {
        setBusy(action);
        try {
            const res = await fetch('/api/admin/superadmin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Action failed');
            toast.success(data.message);
            await fetchData();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setBusy(null);
        }
    };

    const approveUser = (u: PendingUser) => call('approveUser', { userId: u._id });
    const rejectUser = (u: PendingUser) => {
        if (!confirm(`Reject and permanently remove ${u.name}'s pending account (${u.email})?`)) return;
        call('rejectUser', { userId: u._id });
    };

    const toggleSoftLock = () => {
        const turningOn = !loginsLocked;
        const msg = turningOn
            ? 'Block all new logins system-wide? Existing sessions keep working until they naturally expire.'
            : 'Allow new logins again?';
        if (!confirm(msg)) return;
        if (!confirm('Please confirm again to proceed.')) return;
        call('setLoginsLocked', { locked: turningOn });
    };

    const triggerHardLock = () => {
        if (!confirm('This will IMMEDIATELY force-logout every active user in the system, including anyone mid-task right now. Continue?')) return;
        if (!confirm('Are you absolutely sure? This cannot be undone for sessions that are already killed — they will need to log in again. Confirm again to proceed.')) return;
        call('triggerHardLock');
    };

    const clearHardLock = () => {
        if (!confirm('Lift the force-logout lock? Users will be able to log back in normally.')) return;
        if (!confirm('Please confirm again to proceed.')) return;
        call('clearHardLock');
    };

    if (forbidden) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <ShieldAlert className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-lg font-semibold text-gray-700">Superadmin access required</p>
                <p className="text-sm text-gray-500 mt-1">This page is only visible to the platform superadmin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            <PageHeader
                icon={ShieldAlert}
                iconColor="text-red-600 dark:text-red-400"
                iconBg="bg-transparent"
                title="System Control"
                subtitle="Superadmin-only: account approvals and system-wide lock switches"
            />

            {/* Lock switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className={`rounded-xl border p-5 ${loginsLocked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        {loginsLocked ? <Lock className="w-6 h-6 text-amber-600" /> : <LockOpen className="w-6 h-6 text-gray-400" />}
                        <div>
                            <p className="font-semibold text-gray-900">Soft Lock — Block New Logins</p>
                            <p className="text-xs text-gray-500">Existing sessions keep working; nobody new can sign in.</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleSoftLock}
                        disabled={busy === 'setLoginsLocked'}
                        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${
                            loginsLocked ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'
                        }`}
                    >
                        {busy === 'setLoginsLocked' ? <Loader2 className="w-4 h-4 animate-spin inline" /> : loginsLocked ? 'Unblock New Logins' : 'Block New Logins'}
                    </button>
                </div>

                <div className={`rounded-xl border p-5 ${sessionsInvalidatedAt ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <Power className={`w-6 h-6 ${sessionsInvalidatedAt ? 'text-red-600' : 'text-gray-400'}`} />
                        <div>
                            <p className="font-semibold text-gray-900">Hard Lock — Force Logout Everyone</p>
                            <p className="text-xs text-gray-500">
                                {sessionsInvalidatedAt
                                    ? `Active since ${new Date(sessionsInvalidatedAt).toLocaleString()}`
                                    : 'Immediately kills every active session system-wide.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={sessionsInvalidatedAt ? clearHardLock : triggerHardLock}
                        disabled={busy === 'triggerHardLock' || busy === 'clearHardLock'}
                        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${
                            sessionsInvalidatedAt ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-700 hover:bg-red-800 text-white'
                        }`}
                    >
                        {busy === 'triggerHardLock' || busy === 'clearHardLock'
                            ? <Loader2 className="w-4 h-4 animate-spin inline" />
                            : sessionsInvalidatedAt ? 'Lift Force-Logout' : 'Force Logout Everyone Now'}
                    </button>
                </div>
            </div>

            {/* Pending approvals */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">Pending Account Approvals</h3>
                    <p className="text-sm text-gray-500 mt-0.5">New accounts can't log in until you approve them here.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full table-compact">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
                            ) : pendingUsers.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No accounts awaiting approval.</td></tr>
                            ) : (
                                pendingUsers.map(u => (
                                    <tr key={u._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3.5 font-medium text-gray-900">{u.name}</td>
                                        <td className="px-6 py-3.5 text-gray-600">{u.email}</td>
                                        <td className="px-6 py-3.5 text-gray-600 capitalize">{u.role}</td>
                                        <td className="px-6 py-3.5 text-gray-500 text-sm">
                                            <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(u.createdAt).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => approveUser(u)}
                                                    disabled={busy === 'approveUser'}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm disabled:opacity-50"
                                                >
                                                    <UserCheck className="w-4 h-4" /> Approve
                                                </button>
                                                <button
                                                    onClick={() => rejectUser(u)}
                                                    disabled={busy === 'rejectUser'}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium text-sm disabled:opacity-50"
                                                >
                                                    <UserX className="w-4 h-4" /> Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
