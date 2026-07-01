'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
    UserCheck,
    UserX,
    Link2,
    Activity,
    Users,
    TrendingUp,
    CheckCircle2,
    Clock,
    ChevronDown,
    ChevronUp,
    Search,
    Building2,
    QrCode
} from 'lucide-react';
import { QrScannerModal } from '@/components/qr/QrScannerModal';
import { PageHeader } from '@/components/PageHeader';

interface Worker {
    _id: string;
    workerId: string;
    fullName: string;
    phone: string;
    status: string;
}

interface Attendance {
    _id: string;
    workerId: {
        _id: string;
        fullName: string;
        workerId: string;
    };
    checkInTime: string;
    status: string;
}

interface Session {
    _id: string;
    workerId: {
        _id: string;
        fullName: string;
        workerId: string;
    };
    exporterId: {
        _id: string;
        companyTradingName: string;
    };
    startTime: string;
    status: string;
}

interface Bag {
    _id: string;
    bagNumber: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    workers: Array<{
        _id: string;
        workerId: {
            _id: string;
            fullName?: string;
            workerId?: string;
        } | string;
        sessionId: string;
    }>;
}

export default function OperationsPage() {
    const [activeTab, setActiveTab] = useState('checkin');
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [exporters, setExporters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSessions, setShowSessions] = useState(true);
    const [searchWorkerId, setSearchWorkerId] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const [operationsMetrics, setOperationsMetrics] = useState<any>(null);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [qrScannerMode, setQrScannerMode] = useState<'checkin' | 'checkout'>('checkin');
    const [checkoutExporterFilter, setCheckoutExporterFilter] = useState('');
    const [checkinExporterId, setCheckinExporterId] = useState('');

    useEffect(() => {
        // Set initial time and update every second
        setCurrentTime(new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }));
        
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchWorkers();
        fetchAttendance();
        fetchSessions();
        fetchExporters();
        fetchOperationsMetrics();
    }, []);

    const fetchWorkers = async () => {
        try {
            // Only fetch active workers for check-in operations
            const res = await fetch('/api/workers?status=active');
            const data = await res.json();
            setWorkers(data.workers || []);
        } catch (error) {
            console.error('Error fetching workers:', error);
        }
    };

    const fetchAttendance = async () => {
        try {
            const res = await fetch('/api/attendance/checkin');
            const data = await res.json();
            setAttendance(data.attendance || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions');
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    const fetchExporters = async () => {
        try {
            const res = await fetch('/api/exporters');
            const data = await res.json();
            setExporters(data.exporters || []);
        } catch (error) {
            console.error('Error fetching exporters:', error);
        }
    };

    const fetchOperationsMetrics = async () => {
        try {
            setMetricsError(null);
            const metricsRes = await fetch('/api/operations/metrics');

            if (!metricsRes.ok) {
                const err = await metricsRes.json().catch(() => ({}));
                throw new Error(err?.error || `Failed to load operations metrics (${metricsRes.status})`);
            }

            const data = await metricsRes.json();
            setOperationsMetrics(data.metrics || {});
        } catch (error) {
            console.error('Error fetching operations metrics:', error);
            setMetricsError(error instanceof Error ? error.message : 'Failed to load operations metrics');
        }
    };

    const handleCheckIn = async (workerId: string) => {
        if (!checkinExporterId) {
            toast.error('Select an exporter above before checking in');
            return;
        }
        setLoading(true);
        try {
            const checkinRes = await fetch('/api/attendance/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId }),
            });
            if (!checkinRes.ok) {
                const data = await checkinRes.json();
                throw new Error(data.error);
            }
            const checkinData = await checkinRes.json();
            const attendanceId = checkinData.attendance?._id;

            if (attendanceId) {
                const sessionRes = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attendanceId, exporterId: checkinExporterId }),
                });
                if (!sessionRes.ok) {
                    const sd = await sessionRes.json();
                    throw new Error(sd.error || 'Checked in but session assignment failed');
                }
            }

            const exporterName = exporters.find(e => e._id === checkinExporterId)?.companyTradingName || 'exporter';
            toast.success(`Worker checked in and assigned to ${exporterName}`);
            fetchAttendance();
            fetchSessions();
            fetchOperationsMetrics();
            setSearchWorkerId('');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Check-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickCheckIn = async () => {
        if (!searchWorkerId) return;
        if (!checkinExporterId) {
            toast.error('Select an exporter above before checking in');
            return;
        }

        const worker = workers.find(w =>
            w.workerId.toLowerCase() === searchWorkerId.toLowerCase() ||
            w.phone === searchWorkerId ||
            w.fullName.toLowerCase().includes(searchWorkerId.toLowerCase())
        );

        if (!worker) {
            toast.error('Worker not found. Please check the ID/Phone.');
            return;
        }

        const onSiteWorkerIds = attendance.filter(a => a.status === 'on-site').map(a => a.workerId._id);
        const checkedOutWorkerIds = attendance.filter(a => a.status === 'checked-out').map(a => a.workerId._id);

        if (onSiteWorkerIds.includes(worker._id)) {
            toast.error('Worker is already checked in and on-site.');
            return;
        }
        if (checkedOutWorkerIds.includes(worker._id)) {
            toast.error('Worker has already completed their shift today.');
            return;
        }

        await handleCheckIn(worker._id);
    };

    const handleCheckOut = async (attendanceId: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/attendance/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendanceId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Check-out failed');
            }

            const data = await res.json();
            const sessionsClosed = data.sessionsClosed || 0;
            
            if (sessionsClosed > 0) {
                toast.success(`Worker checked out successfully! ${sessionsClosed} session(s) closed.`);
            } else {
                toast.success('Worker checked out successfully');
            }
            
            fetchAttendance();
            fetchSessions();
            fetchOperationsMetrics();
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error instanceof Error ? error.message : 'Check-out failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignExporter = async (attendanceId: string, exporterId: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendanceId, exporterId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast.success('Worker assigned to exporter');
            fetchSessions();
            fetchOperationsMetrics();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Assignment failed');
        } finally {
            setLoading(false);
        }
    };

    // Bag Recording State
    const [bagFormData, setBagFormData] = useState({
        exporterId: '',
        workers: [] as string[],
    });
    const [bagWorkerSearch, setBagWorkerSearch] = useState('');
    const [bagError, setBagError] = useState<string | null>(null);
    const [assignedBagWorkerIds, setAssignedBagWorkerIds] = useState<string[]>([]);

    const handleWorkerToggle = (workerId: string) => {
        setBagFormData((prev) => {
            const workers = prev.workers.includes(workerId)
                ? prev.workers.filter((id) => id !== workerId)
                : [...prev.workers, workerId];
            return { ...prev, workers };
        });
    };

    const handleRecordBag = async () => {
        setBagError(null);

        if (!bagFormData.exporterId) {
            toast.error('Please select an exporter');
            return;
        }
        if (bagFormData.workers.length < 2 || bagFormData.workers.length > 4) {
            toast.error('Please select 2-4 workers');
            return;
        }

        setLoading(true);
        try {
            const justAssignedWorkerIds = [...bagFormData.workers];
            const res = await fetch('/api/bags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exporterId: bagFormData.exporterId,
                    workerIds: bagFormData.workers,
                    weight: 60,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const details = data?.details ? ` (${data.details})` : '';
                throw new Error((data?.error || `Request failed (${res.status})`) + details);
            }

            toast.success('Bag started and workers assigned');
            setAssignedBagWorkerIds((prev) => [...new Set([...prev, ...justAssignedWorkerIds])]);
            setBagFormData((prev) => ({ ...prev, workers: [] }));
            fetchSessions();
            fetchAttendance();
            fetchOperationsMetrics();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to assign bag';
            setBagError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const onSiteWorkers = attendance.filter((a) => a.status === 'on-site');
    const selectedExporterName = exporters.find((e) => e._id === bagFormData.exporterId)?.companyTradingName;
    const bagCandidates = sessions
        .filter((s) => s.exporterId._id === bagFormData.exporterId)
        .filter((s) => !assignedBagWorkerIds.includes(s.workerId._id))
        .filter(
            (s) =>
                !bagWorkerSearch ||
                s.workerId.fullName.toLowerCase().includes(bagWorkerSearch.toLowerCase()) ||
                s.workerId.workerId.toLowerCase().includes(bagWorkerSearch.toLowerCase())
        );

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* QR Scanner Modal */}
            {showQrScanner && (
                <QrScannerModal
                    mode={qrScannerMode}
                    onClose={() => setShowQrScanner(false)}
                    onScanSuccess={async (result) => {
                        if (qrScannerMode === 'checkin' && checkinExporterId && result.attendanceId) {
                            try {
                                await fetch('/api/sessions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ attendanceId: result.attendanceId, exporterId: checkinExporterId }),
                                });
                                const expName = exporters.find(e => e._id === checkinExporterId)?.companyTradingName || 'exporter';
                                toast.success(`${result.workerName} checked in and assigned to ${expName}`);
                            } catch {
                                toast.success(`${result.workerName} checked in (assign manually)`);
                            }
                        } else {
                            toast.success(`${result.workerName} checked ${qrScannerMode === 'checkin' ? 'in' : 'out'} via QR`);
                        }
                        fetchAttendance();
                        fetchSessions();
                        fetchOperationsMetrics();
                    }}
                />
            )}

            <PageHeader
                icon={Activity}
                iconColor="text-teal-600 dark:text-teal-400"
                iconBg="bg-transparent"
                title="Daily Operations"
                subtitle="Manage worker check-in, exporter assignments, and bag recording"
            />

            {metricsError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
                    {metricsError}. Metrics cards may show stale values.
                </div>
            )}

            {/* Operations Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card rounded-xl p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                            <Clock className="w-4 h-4 text-gray-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hours Today</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {operationsMetrics?.totalHoursToday?.toFixed(1) || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">hours worked</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-gray-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Exporters Served</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {operationsMetrics?.exportersServedToday || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Active today</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">On-Site Workers</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {onSiteWorkers.length}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                </div>

                <div className="card rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {sessions.length}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                            <Activity className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                </div>

                <div className="card rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {attendance.length}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs with workflow step indicator */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                {/* Step progress bar */}
                <div className="px-6 pt-5 pb-0">
                    <div className="flex items-center gap-0">
                        {[
                            { id: 'checkin', step: 1, label: 'Check-in & Assign', icon: UserCheck },
                            { id: 'bags', step: 2, label: 'Record Bags', icon: Package },
                            { id: 'checkout', step: 3, label: 'Check-out', icon: UserX },
                        ].map((step, i, arr) => {
                            const tabOrder = ['checkin', 'bags', 'checkout'];
                            const activeIdx = tabOrder.indexOf(activeTab);
                            const isActive = activeTab === step.id;
                            const isDone = tabOrder.indexOf(step.id) < activeIdx;
                            const Icon = step.icon;
                            return (
                                <div key={step.id} className="flex items-center flex-1 min-w-0">
                                    <button
                                        onClick={() => setActiveTab(step.id)}
                                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors w-full ${isActive ? 'text-emerald-700' : isDone ? 'text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : isDone ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                            {isDone ? '✓' : step.step}
                                        </div>
                                        <span className={`text-[11px] font-semibold hidden sm:block truncate max-w-[90px] text-center ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>{step.label}</span>
                                    </button>
                                    {i < arr.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${tabOrder.indexOf(arr[i + 1].id) <= activeIdx ? 'bg-emerald-300' : 'bg-gray-100'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="border-b border-gray-200 mt-4">
                    <nav className="flex flex-wrap -mb-px">
                        {[
                            { id: 'checkin', label: 'Check-in & Assign', icon: UserCheck },
                            { id: 'bags', label: 'Record Bags', icon: Package },
                            { id: 'checkout', label: 'Check-out', icon: UserX },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all
                                        ${activeTab === tab.id
                                            ? 'border-gray-700 text-gray-900 bg-gray-50'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Check-in Tab */}
                    {activeTab === 'checkin' && (
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <UserCheck className="w-5 h-5 text-gray-600" />
                                        Worker Entry Check-in
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Select an exporter, then check workers in — they are assigned immediately
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-gray-700">{currentTime || '--:--:--'}</span>
                                </div>
                            </div>

                            {/* Exporter selector — required first step */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2 flex-1">
                                    <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                                    <select
                                        value={checkinExporterId}
                                        onChange={e => setCheckinExporterId(e.target.value)}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white text-gray-900 font-medium text-sm"
                                    >
                                        <option value="">— Select Exporter to begin —</option>
                                        {exporters.map(exp => (
                                            <option key={exp._id} value={exp._id}>{exp.companyTradingName}</option>
                                        ))}
                                    </select>
                                </div>
                                {checkinExporterId && (
                                    <button
                                        onClick={() => setCheckinExporterId('')}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        Done with {exporters.find(e => e._id === checkinExporterId)?.companyTradingName}
                                    </button>
                                )}
                            </div>

                            {!checkinExporterId ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Building2 className="w-12 h-12 text-gray-200 mb-4" />
                                    <p className="font-medium text-gray-500">Select an exporter above to begin</p>
                                    <p className="text-sm text-gray-400 mt-1">All check-ins will be assigned to that exporter automatically</p>
                                </div>
                            ) : (
                                <>
                                    {/* QR Scan Button */}
                                    <button
                                        onClick={() => {
                                            setQrScannerMode('checkin');
                                            setShowQrScanner(true);
                                        }}
                                        className="w-full mb-4 flex items-center justify-center gap-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-emerald-500/20"
                                    >
                                        <QrCode className="w-5 h-5" />
                                        Scan QR Badge to Check In &amp; Assign
                                    </button>

                                    {/* Quick Search */}
                                    <div className="mb-5 bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Search className="w-4 h-4 text-gray-700" />
                                            Manual check-in: Worker ID, Phone or Name
                                        </label>
                                        <div className="flex gap-3">
                                            <input
                                                suppressHydrationWarning
                                                type="text"
                                                value={searchWorkerId}
                                                onChange={e => setSearchWorkerId(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleQuickCheckIn()}
                                                placeholder="WORK001, 0788123456, or worker name..."
                                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white font-medium"
                                            />
                                            <button
                                                onClick={handleQuickCheckIn}
                                                disabled={loading || !searchWorkerId}
                                                className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Check In
                                            </button>
                                        </div>
                                    </div>

                                    {/* Worker List */}
                                    <p className="text-sm font-medium text-gray-600 mb-3">Or select from list:</p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full table-compact">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker ID</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {(() => {
                                                    const onSiteWorkerIds = attendance.filter(a => a.status === 'on-site').map(a => a.workerId._id);
                                                    const checkedOutWorkerIds = attendance.filter(a => a.status === 'checked-out').map(a => a.workerId._id);

                                                    const availableWorkers = workers.filter(w => {
                                                        if (onSiteWorkerIds.includes(w._id)) return false;
                                                        if (checkedOutWorkerIds.includes(w._id)) return false;
                                                        if (!searchWorkerId) return true;
                                                        const search = searchWorkerId.toLowerCase();
                                                        return w.fullName.toLowerCase().includes(search) ||
                                                            w.workerId.toLowerCase().includes(search) ||
                                                            w.phone.includes(search);
                                                    });

                                                    if (workers.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                                    No workers registered yet. Add workers in the Workers section.
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    if (availableWorkers.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                                    {searchWorkerId
                                                                        ? 'No workers found matching your search.'
                                                                        : 'All workers have been checked in or checked out for today.'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return availableWorkers.map(worker => (
                                                        <tr key={worker._id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4">
                                                                <span className="font-medium text-gray-900">{worker.fullName}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm font-mono font-semibold text-gray-700">{worker.workerId}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">{worker.phone}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleCheckIn(worker._id)}
                                                                    disabled={loading}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 transition-colors"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                    Check In
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Bag Recording Tab */}
                    {activeTab === 'bags' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Package className="w-5 h-5 text-gray-700" />
                                        Assign Bags (60kg)
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Select exporter, pick 2-4 workers with active sessions, then start a bag
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-700">60kg</p>
                                    <p className="text-xs text-gray-500">Standard weight</p>
                                </div>
                            </div>

                            {/* Exporter Filter */}
                            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Link2 className="w-4 h-4" />
                                    Filter by Exporter *
                                </label>
                                <select
                                    value={bagFormData.exporterId}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setBagFormData({ exporterId: id, workers: [] });
                                        setBagWorkerSearch('');
                                    }}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white font-medium"
                                >
                                    <option value="">-- Select Exporter Company --</option>
                                    {exporters.map((exp) => (
                                        <option key={exp._id} value={exp._id}>
                                            {exp.companyTradingName}
                                        </option>
                                    ))}
                                </select>
                                {bagFormData.exporterId && (
                                    <div className="mt-3">
                                        <p className="text-sm text-gray-600">
                                            Showing active session workers for {selectedExporterName}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {bagError && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {bagError}
                                </div>
                            )}

                            {/* Workers Table */}
                            {bagFormData.exporterId ? (
                                <div className="bg-white rounded-lg border border-gray-200">
                                    {/* Action bar — above the list */}
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            {/* Summary + Assign button */}
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${
                                                        bagFormData.workers.length >= 2 && bagFormData.workers.length <= 4
                                                            ? 'text-gray-700'
                                                            : 'text-gray-300'
                                                    }`} />
                                                    <span className="text-gray-600">
                                                        <strong>{bagFormData.workers.length}</strong> / 4 selected
                                                        {bagFormData.workers.length >= 2 && bagFormData.workers.length <= 4
                                                            ? ' · Ready to start new bag'
                                                            : ' · Need 2–4 workers'}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Search */}
                                            <div className="relative flex-1 max-w-xs">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    suppressHydrationWarning
                                                    type="text"
                                                    placeholder="Search worker..."
                                                    value={bagWorkerSearch}
                                                    onChange={(e) => setBagWorkerSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                                                />
                                            </div>
                                            {/* Assign Bag button */}
                                            <button
                                                onClick={handleRecordBag}
                                                disabled={loading || bagFormData.workers.length < 2 || bagFormData.workers.length > 4}
                                                className="flex-shrink-0 px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow flex items-center gap-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        Recording...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Package className="w-4 h-4" />
                                                        Start Bag
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full table-compact">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-gray-600 rounded focus:ring-gray-400"
                                                            checked={false}
                                                            disabled
                                                        />
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {(() => {
                                                    if (bagCandidates.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                                    {sessions.filter(s => s.exporterId._id === bagFormData.exporterId).length === 0 ? (
                                                                        <>
                                                                            <p>No active session workers for {selectedExporterName}</p>
                                                                            <p className="text-sm text-gray-400 mt-1">Assign workers in the "Assign Exporter" tab first</p>
                                                                        </>
                                                                    ) : bagWorkerSearch ? (
                                                                        <p>No workers match "{bagWorkerSearch}"</p>
                                                                    ) : (
                                                                        <>
                                                                            <p className="font-medium">All workers for this exporter are already assigned a bag</p>
                                                                            <p className="text-sm text-gray-400 mt-1">Proceed to checkout at end of day</p>
                                                                        </>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return bagCandidates.map((session) => {
                                                        const workerId = session.workerId._id;
                                                        const isSelected = bagFormData.workers.includes(workerId);
                                                        const canSelect = isSelected || bagFormData.workers.length < 4;

                                                        return (
                                                            <tr
                                                                key={session._id}
                                                                className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50' : ''}`}
                                                                onClick={() => canSelect && handleWorkerToggle(workerId)}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => handleWorkerToggle(workerId)}
                                                                        disabled={!canSelect}
                                                                        className="w-4 h-4 text-gray-600 rounded focus:ring-gray-400 disabled:opacity-30 cursor-pointer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                                                                            isSelected
                                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                                : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                                                                        }`}>
                                                                            {session.workerId.fullName.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-medium text-gray-900">{session.workerId.fullName}</p>
                                                                            <p className="text-xs text-gray-500">{session.workerId.workerId}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                                                                            <Link2 className="w-4 h-4 text-gray-700" />
                                                                        </div>
                                                                        <span className="text-sm font-medium text-gray-900">
                                                                            {session.exporterId.companyTradingName}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                                                                        Active
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">Select an Exporter to Continue</h4>
                                    <p className="text-sm text-gray-500">
                                        Choose an exporter from the dropdown above to see workers assigned to them
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Check-out Tab */}
                    {activeTab === 'checkout' && (
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <UserX className="w-5 h-5 text-red-600" />
                                        Worker Exit Check-out
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Record exit time and close sorting session
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-indigo-500" />
                                        <select
                                            value={checkoutExporterFilter}
                                            onChange={e => setCheckoutExporterFilter(e.target.value)}
                                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                                        >
                                            <option value="">All Exporters</option>
                                            {exporters.map(exp => (
                                                <option key={exp._id} value={exp._id}>{exp.companyTradingName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-700">
                                            {new Date().toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {onSiteWorkers.length} on-site
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setQrScannerMode('checkout');
                                    setShowQrScanner(true);
                                }}
                                className="w-full mb-4 flex items-center justify-center gap-3 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-red-500/20"
                            >
                                <QrCode className="w-5 h-5" />
                                Scan QR Badge to Check Out
                            </button>
                            {(() => {
                                const filteredCheckout = checkoutExporterFilter
                                    ? onSiteWorkers.filter(att => {
                                        const session = sessions.find(s => s.workerId._id === att.workerId._id);
                                        return session?.exporterId._id === checkoutExporterFilter;
                                    })
                                    : onSiteWorkers;

                                return (
                                    <div className="overflow-x-auto">
                                        <table className="w-full table-compact">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Worker ID</th>
                                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Exporter</th>
                                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check-in Time</th>
                                                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                                    <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {filteredCheckout.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                            {checkoutExporterFilter ? 'No workers on-site for this exporter' : 'No workers on-site to check-out'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredCheckout.map((att) => {
                                                        const session = sessions.find(s => s.workerId._id === att.workerId._id);
                                                        const durationMins = Math.floor((Date.now() - new Date(att.checkInTime).getTime()) / 1000 / 60);
                                                        const durationDisplay = durationMins < 60
                                                            ? `${durationMins}m`
                                                            : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;

                                                        return (
                                                            <tr key={att._id} className="hover:bg-gray-50">
                                                                <td className="px-6 py-2.5">
                                                                    <span className="font-medium text-gray-900">{att.workerId.fullName}</span>
                                                                </td>
                                                                <td className="px-6 py-2.5">
                                                                    <span className="text-sm font-mono font-semibold text-gray-700">{att.workerId.workerId}</span>
                                                                </td>
                                                                <td className="px-6 py-2.5">
                                                                    {session ? (
                                                                        <span className="text-sm font-medium text-gray-900">{session.exporterId.companyTradingName}</span>
                                                                    ) : (
                                                                        <span className="text-sm text-gray-400 italic">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-2.5">
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                                        {new Date(att.checkInTime).toLocaleTimeString('en-US', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-2.5">
                                                                    <span className="font-medium text-gray-700">{durationDisplay}</span>
                                                                </td>
                                                                <td className="px-6 py-2.5 text-right">
                                                                    <button
                                                                        onClick={() => handleCheckOut(att._id)}
                                                                        disabled={loading}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm disabled:opacity-50 transition-colors"
                                                                    >
                                                                        <UserX className="w-4 h-4" />
                                                                        Check Out
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Active Sessions - Compact Collapsible Panel */}
            {sessions.length > 0 && (
                <div className="card rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowSessions(!showSessions)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                                <Activity className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    Active Work Sessions
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
                                        {sessions.length}
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Workers currently assigned to exporters</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                                {showSessions ? 'Click to hide' : 'Click to view'}
                            </span>
                            {showSessions ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                        </div>
                    </button>

                    {showSessions && (
                        <div className="border-t border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="w-full table-compact">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exporter</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sessions.map((session) => {
                                            const startTime = new Date(session.startTime);
                                            const duration = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60); // minutes
                                            
                                            return (
                                                <tr key={session._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{session.workerId.fullName}</p>
                                                                <p className="text-xs text-gray-500">{session.workerId.workerId}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded flex items-center justify-center">
                                                                <Link2 className="w-3.5 h-3.5 text-gray-700" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">{session.exporterId.companyTradingName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-600">
                                                                {startTime.toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                                            <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                                                            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Quick Stats Footer */}
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-6">
                                    <span className="text-gray-600">
                                        Total Sessions: <strong className="text-gray-900">{sessions.length}</strong>
                                    </span>
                                    <span className="text-gray-600">
                                        Exporters Active: <strong className="text-gray-900">
                                            {new Set(sessions.map(s => s.exporterId._id)).size}
                                        </strong>
                                    </span>
                                </div>
                                <span className="text-gray-500">Auto-refreshes on actions</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
