'use client';

import { useEffect, useState } from 'react';
import {
    ClipboardList,
    CheckCircle,
    XCircle,
    Clock,
    CheckSquare,
    RefreshCw,
    Package,
    Users,
    Calendar,
    Container,
    Building2,
    ChevronDown,
    ChevronUp,
    MessageSquare,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface WorkerRequest {
    _id: string;
    exporterId: {
        _id: string;
        companyTradingName: string;
        exporterCode: string;
        phone?: string;
        email?: string;
        contactPerson?: string;
    };
    numberOfContainers: number;
    numberOfBags: number;
    numberOfWorkersNeeded: number;
    startDate: string;
    idealCompletionDate: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    adminNotes?: string;
    reviewedBy?: { name: string; email: string };
    reviewedAt?: string;
    createdAt: string;
}

const statusConfig = {
    pending:   { label: 'Pending',    icon: Clock,        color: 'bg-amber-500 text-white border-amber-500',    dot: 'bg-white' },
    approved:  { label: 'Approved',   icon: CheckCircle,  color: 'bg-emerald-600 text-white border-emerald-600', dot: 'bg-white' },
    rejected:  { label: 'Rejected',   icon: XCircle,      color: 'bg-red-600 text-white border-red-600',        dot: 'bg-white' },
    fulfilled: { label: 'Fulfilled',  icon: CheckSquare,  color: 'bg-blue-600 text-white border-blue-600',      dot: 'bg-white' },
};

export default function AdminWorkerRequestsPage() {
    const [requests, setRequests] = useState<WorkerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [reviewState, setReviewState] = useState<{ [id: string]: { adminNotes: string } }>({});
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/worker-requests');
            const data = await res.json();
            setRequests(data.workerRequests || []);
        } catch {
            toast.error('Failed to load worker requests');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id: string, status: 'approved' | 'rejected' | 'fulfilled') => {
        setProcessingId(id);
        try {
            const adminNotes = reviewState[id]?.adminNotes || '';
            const res = await fetch(`/api/worker-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminNotes }),
            });
            if (!res.ok) throw new Error('Update failed');
            const labels: Record<string, string> = { approved: 'approved', rejected: 'rejected', fulfilled: 'marked as fulfilled' };
            toast.success(`Request ${labels[status]} successfully`);
            setExpandedId(null);
            fetchRequests();
        } catch {
            toast.error('Failed to update request');
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);

    const stats = {
        total:    requests.length,
        pending:  requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        fulfilled: requests.filter(r => r.status === 'fulfilled').length,
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

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
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                                <ClipboardList className="w-7 h-7 text-white" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">Worker Requests</h1>
                        </div>
                        <p className="text-white/90 text-base sm:text-lg ml-15">Review and respond to exporter staffing requests</p>
                    </div>
                    {stats.pending > 0 && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/20 border border-amber-300/40 text-white rounded-xl text-sm font-medium backdrop-blur-sm shrink-0">
                            <Clock className="w-4 h-4" />
                            {stats.pending} pending review{stats.pending !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total',     value: stats.total,     icon: ClipboardList, colorClass: 'bg-gray-50 border-gray-200',    iconClass: 'bg-gray-100 text-gray-600' },
                    { label: 'Pending',   value: stats.pending,   icon: Clock,         colorClass: 'bg-amber-50 border-amber-200',  iconClass: 'bg-amber-100 text-amber-600' },
                    { label: 'Approved',  value: stats.approved,  icon: CheckCircle,   colorClass: 'bg-green-50 border-green-200',  iconClass: 'bg-green-100 text-green-600' },
                    { label: 'Fulfilled', value: stats.fulfilled, icon: CheckSquare,   colorClass: 'bg-blue-50 border-blue-200',    iconClass: 'bg-blue-100 text-blue-600' },
                ].map(({ label, value, icon: Icon, colorClass, iconClass }) => (
                    <div key={label} className={`rounded-xl border shadow-sm p-4 flex items-center gap-3 ${colorClass}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{label}</p>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">All Requests</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="fulfilled">Fulfilled</option>
                        </select>
                        <button onClick={fetchRequests} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                        <p className="text-sm">Loading requests...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <ClipboardList className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                        <p className="font-semibold text-gray-500 mb-1">No requests found</p>
                        <p className="text-sm text-gray-400">Exporter requests will appear here once submitted.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filtered.map(req => {
                            const cfg = statusConfig[req.status];
                            const StatusIcon = cfg.icon;
                            const isExpanded = expandedId === req._id;
                            const notes = reviewState[req._id]?.adminNotes ?? req.adminNotes ?? '';

                            return (
                                <div key={req._id} className="group">
                                    {/* Main row */}
                                    <div
                                        className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : req._id)}
                                    >
                                        {/* Exporter info */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                                                <Building2 className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 text-sm truncate">{req.exporterId?.companyTradingName || 'Unknown'}</p>
                                                <p className="text-xs text-gray-400 font-mono">{req.exporterId?.exporterCode}</p>
                                            </div>
                                        </div>

                                        {/* Key metrics */}
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <Container className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="font-semibold text-gray-900">{req.numberOfContainers}</span>
                                                <span className="text-xs text-gray-400 hidden sm:inline">ctrs</span>
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <Package className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="font-semibold text-gray-900">{req.numberOfBags}</span>
                                                <span className="text-xs text-gray-400 hidden sm:inline">bags</span>
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="font-semibold text-gray-900">{req.numberOfWorkersNeeded}</span>
                                                <span className="text-xs text-gray-400 hidden sm:inline">workers</span>
                                            </span>
                                        </div>

                                        {/* Dates */}
                                        <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(req.startDate).toLocaleDateString()} – {new Date(req.idealCompletionDate).toLocaleDateString()}
                                        </div>

                                        {/* Status badge */}
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${cfg.color}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {cfg.label}
                                        </span>

                                        {/* Submitted date */}
                                        <span className="hidden xl:block text-xs text-gray-400 shrink-0">
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </span>

                                        {/* Expand arrow */}
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                        )}
                                    </div>

                                    {/* Expanded detail + review */}
                                    {isExpanded && (
                                        <div className="px-4 sm:px-6 pb-6 bg-gray-50 border-t border-gray-100">
                                            <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Request details */}
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Request Details</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Container className="w-3 h-3" /> Containers</p>
                                                            <p className="text-xl font-bold text-gray-900">{req.numberOfContainers}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Bags</p>
                                                            <p className="text-xl font-bold text-gray-900">{req.numberOfBags}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Workers</p>
                                                            <p className="text-xl font-bold text-gray-900">{req.numberOfWorkersNeeded}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Start</p>
                                                            <p className="text-sm font-semibold text-gray-900">{new Date(req.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Target</p>
                                                            <p className="text-sm font-semibold text-gray-900">{new Date(req.idealCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                        </div>
                                                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                            <p className="text-xs text-gray-500 mb-1">Submitted</p>
                                                            <p className="text-sm font-semibold text-gray-900">{new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                        </div>
                                                    </div>
                                                    {req.notes && (
                                                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                                                            <p className="font-medium text-gray-500 text-xs mb-1">Exporter Note</p>
                                                            {req.notes}
                                                        </div>
                                                    )}
                                                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                                                        <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Exporter Contact</p>
                                                        <div className="space-y-1 text-gray-600 text-xs">
                                                            {req.exporterId?.contactPerson && <p>👤 {req.exporterId.contactPerson}</p>}
                                                            {req.exporterId?.phone && <p>📞 {req.exporterId.phone}</p>}
                                                            {req.exporterId?.email && <p>✉ {req.exporterId.email}</p>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Admin Review Panel */}
                                                <div className="space-y-4">
                                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Admin Review</h4>

                                                    {req.reviewedBy && (
                                                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                                                            <p className="text-xs text-gray-400 mb-1">Previously reviewed by</p>
                                                            <p className="font-medium text-gray-700">{req.reviewedBy.name}</p>
                                                            {req.reviewedAt && (
                                                                <p className="text-xs text-gray-400 mt-0.5">{new Date(req.reviewedAt).toLocaleString()}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                            <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Response / Notes <span className="text-gray-400 font-normal">(optional)</span></span>
                                                        </label>
                                                        <textarea
                                                            rows={4}
                                                            value={notes}
                                                            onChange={e => setReviewState(prev => ({ ...prev, [req._id]: { adminNotes: e.target.value } }))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
                                                            placeholder="Add a note to the exporter about this decision..."
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => handleReview(req._id, 'approved')}
                                                            disabled={processingId === req._id || req.status === 'approved'}
                                                            className="flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReview(req._id, 'rejected')}
                                                            disabled={processingId === req._id || req.status === 'rejected'}
                                                            className="flex items-center justify-center gap-2 py-2.5 bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleReview(req._id, 'fulfilled')}
                                                            disabled={processingId === req._id || req.status !== 'approved'}
                                                            className="flex items-center justify-center gap-2 py-2.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-200 disabled:opacity-50 transition-colors"
                                                        >
                                                            <CheckSquare className="w-4 h-4" />
                                                            Fulfilled
                                                        </button>
                                                    </div>
                                                    {req.status !== 'approved' && req.status !== 'pending' && (
                                                        <p className="text-xs text-gray-400 text-center">Mark as Fulfilled is only available for approved requests.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
