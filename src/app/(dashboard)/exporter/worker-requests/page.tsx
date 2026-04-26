'use client';

import { useEffect, useState } from 'react';
import { 
    ClipboardList, 
    Plus, 
    X, 
    Package, 
    Users, 
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    Container,
    CheckSquare
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface WorkerRequest {
    _id: string;
    exporterId: {
        _id: string;
        companyTradingName: string;
        exporterCode: string;
    };
    numberOfContainers: number;
    numberOfBags: number;
    numberOfWorkersNeeded: number;
    startDate: string;
    idealCompletionDate: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
    adminNotes?: string;
    createdAt: string;
}

const statusConfig = {
    pending:   { label: 'Pending Review',  icon: Clock,        color: 'bg-amber-100 text-amber-700 border-amber-200' },
    approved:  { label: 'Approved',        icon: CheckCircle,  color: 'bg-green-100 text-green-700 border-green-200' },
    rejected:  { label: 'Rejected',        icon: XCircle,      color: 'bg-red-100 text-red-700 border-red-200' },
    fulfilled: { label: 'Fulfilled',       icon: CheckSquare,  color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const defaultForm = {
    numberOfContainers: '',
    numberOfBags: '',
    numberOfWorkersNeeded: '',
    startDate: '',
    idealCompletionDate: '',
    notes: '',
};

export default function ExporterWorkerRequestsPage() {
    const [requests, setRequests] = useState<WorkerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [notLinked, setNotLinked] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState(defaultForm);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/worker-requests');
            const data = await res.json();
            setNotLinked(!!data.notLinked);
            setRequests(data.workerRequests || []);
        } catch {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/worker-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numberOfContainers:    Number(formData.numberOfContainers),
                    numberOfBags:          Number(formData.numberOfBags),
                    numberOfWorkersNeeded: Number(formData.numberOfWorkersNeeded),
                    startDate:             formData.startDate,
                    idealCompletionDate:   formData.idealCompletionDate,
                    notes:                 formData.notes || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit');
            toast.success('Request submitted successfully!');
            setShowForm(false);
            setFormData(defaultForm);
            fetchRequests();
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this request?')) return;
        try {
            const res = await fetch(`/api/worker-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' }),
            });
            if (!res.ok) throw new Error('Cancel failed');
            toast.success('Request cancelled');
            fetchRequests();
        } catch {
            toast.error('Failed to cancel request');
        }
    };

    const filtered = filterStatus === 'all' 
        ? requests 
        : requests.filter(r => r.status === filterStatus);

    const stats = {
        total:    requests.length,
        pending:  requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        fulfilled: requests.filter(r => r.status === 'fulfilled').length,
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* Not-linked info banner */}
            {notLinked && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-900 text-lg mb-1">Account Not Linked</h3>
                            <p className="text-amber-700 text-sm">
                                Your account is not yet linked to an exporter profile. Please contact the system administrator to have your account linked.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                        <p className="text-white/90 text-base sm:text-lg ml-15">Submit casual worker staffing requests to the cooperative admin</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        disabled={notLinked}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
                    >
                        <Plus className="w-5 h-5" />
                        New Request
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs text-amber-600 font-medium">Pending</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-green-600 font-medium">Approved</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-blue-600 font-medium">Fulfilled</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.fulfilled}</p>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">My Requests</h3>
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
                        <button onClick={fetchRequests} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                            <p className="text-sm">Loading requests...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-14">
                            <ClipboardList className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                            <p className="font-semibold text-gray-500 mb-1">No requests found</p>
                            <p className="text-sm text-gray-400 mb-6">Submit a new request to get casual workers assigned.</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Submit First Request
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filtered.map(req => {
                                const cfg = statusConfig[req.status];
                                const StatusIcon = cfg.icon;
                                return (
                                    <div key={req._id} className="border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-emerald-200 hover:shadow-sm transition-all">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                                    <div className="bg-gray-50 rounded-lg p-2.5">
                                                        <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                                                            <Container className="w-3 h-3" /> Containers
                                                        </p>
                                                        <p className="text-lg font-bold text-gray-900">{req.numberOfContainers}</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-2.5">
                                                        <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                                                            <Package className="w-3 h-3" /> Bags
                                                        </p>
                                                        <p className="text-lg font-bold text-gray-900">{req.numberOfBags}</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-2.5">
                                                        <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> Workers
                                                        </p>
                                                        <p className="text-lg font-bold text-gray-900">{req.numberOfWorkersNeeded}</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-2.5">
                                                        <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> Start
                                                        </p>
                                                        <p className="text-sm font-semibold text-gray-900">{new Date(req.startDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-2.5">
                                                        <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> Target
                                                        </p>
                                                        <p className="text-sm font-semibold text-gray-900">{new Date(req.idealCompletionDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                {req.notes && (
                                                    <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                                                        <span className="font-medium text-gray-700">Note: </span>{req.notes}
                                                    </div>
                                                )}
                                                {req.adminNotes && (
                                                    <div className={`mt-2 text-sm rounded-lg p-3 ${req.status === 'approved' ? 'bg-green-50 text-green-700' : req.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        <span className="font-medium">Admin response: </span>{req.adminNotes}
                                                    </div>
                                                )}
                                            </div>
                                            {req.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancel(req._id)}
                                                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Request Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">New Worker Request</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Fill in your staffing requirements for the admin</p>
                            </div>
                            <button onClick={() => { setShowForm(false); setFormData(defaultForm); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Container className="w-4 h-4 text-emerald-600" /> Containers</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.numberOfContainers}
                                        onChange={e => setFormData({ ...formData, numberOfContainers: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                        placeholder="e.g. 3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-emerald-600" /> Bags</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.numberOfBags}
                                        onChange={e => setFormData({ ...formData, numberOfBags: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                        placeholder="e.g. 50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-600" /> Workers Needed</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.numberOfWorkersNeeded}
                                        onChange={e => setFormData({ ...formData, numberOfWorkersNeeded: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                        placeholder="e.g. 10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-emerald-600" /> Start Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-emerald-600" /> Ideal Completion</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        value={formData.idealCompletionDate}
                                        onChange={e => setFormData({ ...formData, idealCompletionDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                                <textarea
                                    rows={3}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
                                    placeholder="Any special requirements, preferences, or context..."
                                />
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                <AlertCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />
                                Requests are reviewed by the admin. You will be notified of the status change.
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setFormData(defaultForm); }}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
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
