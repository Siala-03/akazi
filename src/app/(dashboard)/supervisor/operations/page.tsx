'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
    QrCode,
    Download,
    Loader2
} from 'lucide-react';
import { QrScannerModal } from '@/components/qr/QrScannerModal';
import { PageHeader } from '@/components/PageHeader';
import { generateBadgeCanvas, canvasToBlob } from '@/lib/qr/generateWorkerBadge';

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
        bulkCheckoutEnabled?: boolean;
    };
    startTime: string;
    status: string;
}


export default function OperationsPage() {
    const [activeTab, setActiveTab] = useState('checkin');
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [allSessionsToday, setAllSessionsToday] = useState<Session[]>([]);
    const [exporters, setExporters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSessions, setShowSessions] = useState(true);
    const [searchWorkerId, setSearchWorkerId] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [qrScannerMode, setQrScannerMode] = useState<'checkin' | 'checkout'>('checkin');
    const [checkoutExporterFilter, setCheckoutExporterFilter] = useState('');
    const [checkoutSearch, setCheckoutSearch] = useState('');
    const [checkinExporterId, setCheckinExporterId] = useState('');
    const [selectedCheckoutIds, setSelectedCheckoutIds] = useState<string[]>([]);
    const [downloadingQr, setDownloadingQr] = useState(false);

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
        fetchAllSessionsToday();
        fetchExporters();

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
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/sessions?startDate=${today}&endDate=${today}`);
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    // Includes closed sessions too (unlike fetchSessions above), so workers who were
    // already checked out today still resolve to their exporter for QR badge downloads.
    const fetchAllSessionsToday = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/sessions?startDate=${today}&endDate=${today}&all=true`);
            const data = await res.json();
            setAllSessionsToday(data.sessions || []);
        } catch (error) {
            console.error('Error fetching all sessions:', error);
        }
    };

    const fetchExporters = async () => {
        try {
            const res = await fetch('/api/exporters?approvedOnly=true');
            const data = await res.json();
            setExporters(data.exporters || []);
        } catch (error) {
            console.error('Error fetching exporters:', error);
        }
    };


    const handleCheckIn = async (workerId: string) => {
        if (!checkinExporterId) {
            toast.error('Select an exporter above before checking in');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/attendance/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId, exporterId: checkinExporterId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            const exporterName = exporters.find(e => e._id === checkinExporterId)?.companyTradingName || 'exporter';
            toast.success(`Worker checked in and assigned to ${exporterName}`);
            fetchAttendance();
            fetchSessions();
            fetchAllSessionsToday();
    
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

            setSelectedCheckoutIds(prev => prev.filter(id => id !== attendanceId));
            fetchAttendance();
            fetchSessions();
            fetchAllSessionsToday();

        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error instanceof Error ? error.message : 'Check-out failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkCheckOut = async () => {
        if (selectedCheckoutIds.length === 0) return;
        setLoading(true);
        try {
            const res = await fetch('/api/attendance/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendanceIds: selectedCheckoutIds }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Check-out failed');
            }

            const data = await res.json();
            toast.success(`${data.checkedOutCount} worker(s) checked out! ${data.sessionsClosed || 0} session(s) closed.`);

            setSelectedCheckoutIds([]);
            fetchAttendance();
            fetchSessions();
            fetchAllSessionsToday();
        } catch (error) {
            console.error('Bulk checkout error:', error);
            toast.error(error instanceof Error ? error.message : 'Check-out failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleCheckoutSelection = (attendanceId: string) => {
        setSelectedCheckoutIds(prev =>
            prev.includes(attendanceId) ? prev.filter(id => id !== attendanceId) : [...prev, attendanceId]
        );
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
            fetchAllSessionsToday();
    
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Assignment failed');
        } finally {
            setLoading(false);
        }
    };

    const onSiteWorkers = attendance.filter((a) => a.status === 'on-site');

    const filteredCheckout = (checkoutExporterFilter
        ? onSiteWorkers.filter(att => {
            const session = sessions.find(s => s.workerId._id === att.workerId._id);
            return session?.exporterId._id === checkoutExporterFilter;
        })
        : onSiteWorkers
    ).filter(att => {
        if (!checkoutSearch) return true;
        const search = checkoutSearch.toLowerCase();
        const phone = workers.find(w => w._id === att.workerId._id)?.phone || '';
        return att.workerId.fullName.toLowerCase().includes(search) ||
            att.workerId.workerId.toLowerCase().includes(search) ||
            phone.includes(search);
    });

    const checkoutExporter = checkoutExporterFilter
        ? exporters.find(e => e._id === checkoutExporterFilter)
        : null;

    // Today's workers for the selected exporter regardless of on-site/checked-out status —
    // unlike filteredCheckout (on-site only), this is what "today's QR badges" should cover,
    // since a worker's badge is still valid after they've checked out.
    const todaysExporterWorkers = checkoutExporterFilter
        ? attendance.filter(att => {
            const session = allSessionsToday.find(s => s.workerId._id === att.workerId._id);
            return session?.exporterId._id === checkoutExporterFilter;
        })
        : [];

    useEffect(() => { setSelectedCheckoutIds([]); setCheckoutSearch(''); }, [checkoutExporterFilter]);

    const handleDownloadQrBadges = async () => {
        if (!checkoutExporter || todaysExporterWorkers.length === 0) return;
        setDownloadingQr(true);
        try {
            const zip = new JSZip();
            for (const att of todaysExporterWorkers) {
                const worker = workers.find(w => w._id === att.workerId._id);
                const res = await fetch(`/api/workers/${att.workerId._id}/qr-token`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `Failed to load QR for ${att.workerId.fullName}`);

                const canvas = await generateBadgeCanvas(
                    { workerName: att.workerId.fullName, workerId: att.workerId.workerId, phone: worker?.phone },
                    data.qrToken
                );
                const blob = await canvasToBlob(canvas);
                zip.file(`${att.workerId.fullName.replace(/\s+/g, '_')}_${att.workerId.workerId}.png`, blob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const dateStr = new Date().toISOString().split('T')[0];
            saveAs(zipBlob, `${checkoutExporter.companyTradingName.replace(/\s+/g, '_')}_QR_Badges_${dateStr}.zip`);
            toast.success(`Downloaded ${todaysExporterWorkers.length} QR badge(s)`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to generate QR badges');
        } finally {
            setDownloadingQr(false);
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* QR Scanner Modal */}
            {showQrScanner && (
                <QrScannerModal
                    mode={qrScannerMode}
                    exporterId={qrScannerMode === 'checkin' ? checkinExporterId : undefined}
                    onClose={() => setShowQrScanner(false)}
                    onScanSuccess={async (result) => {
                        if (qrScannerMode === 'checkin') {
                            const expName = checkinExporterId
                                ? exporters.find(e => e._id === checkinExporterId)?.companyTradingName || 'exporter'
                                : null;
                            toast.success(expName
                                ? `${result.workerName} checked in and assigned to ${expName}`
                                : `${result.workerName} checked in via QR`
                            );
                        } else {
                            toast.success(`${result.workerName} checked out via QR`);
                        }
                        fetchAttendance();
                        fetchSessions();
                        fetchAllSessionsToday();
                
                    }}
                />
            )}

            <PageHeader
                icon={Activity}
                iconColor="text-teal-600 dark:text-teal-400"
                iconBg="bg-transparent"
                title="Daily Operations"
                subtitle="Manage worker check-in and exporter assignments"
            />

            {/* Tabs with workflow step indicator */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                {/* Step progress bar */}
                <div className="px-6 pt-5 pb-0">
                    <div className="flex items-center gap-0">
                        {[
                            { id: 'checkin', step: 1, label: 'Check-in & Assign', icon: UserCheck },
                            { id: 'checkout', step: 2, label: 'Check-out', icon: UserX },
                        ].map((step, i, arr) => {
                            const tabOrder = ['checkin', 'checkout'];
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
                                        <option value="">
                                            {exporters.length === 0
                                                ? '— No exporters with approved requests —'
                                                : '— Select Exporter to begin —'}
                                        </option>
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
                                    {exporters.length === 0 ? (
                                        <>
                                            <p className="font-medium text-gray-500">No exporters available</p>
                                            <p className="text-sm text-gray-400 mt-1">Only exporters with an approved worker request appear here. Ask admin to approve a request first.</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium text-gray-500">Select an exporter above to begin</p>
                                            <p className="text-sm text-gray-400 mt-1">All check-ins will be assigned to that exporter automatically</p>
                                        </>
                                    )}
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
                            {/* Quick Search */}
                            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Search className="w-4 h-4 text-gray-700" />
                                    Search: Worker ID, Phone or Name
                                </label>
                                <input
                                    suppressHydrationWarning
                                    type="text"
                                    value={checkoutSearch}
                                    onChange={e => setCheckoutSearch(e.target.value)}
                                    placeholder="WORK001, 0788123456, or worker name..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white font-medium"
                                />
                            </div>
                            {checkoutExporter?.bulkQrDownloadEnabled && (
                                <button
                                    onClick={handleDownloadQrBadges}
                                    disabled={downloadingQr || todaysExporterWorkers.length === 0}
                                    className="w-full mb-4 flex items-center justify-center gap-3 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50"
                                >
                                    {downloadingQr ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Download className="w-5 h-5" />
                                    )}
                                    {downloadingQr
                                        ? `Generating badges (${todaysExporterWorkers.length})...`
                                        : `Download QR Badges — ${todaysExporterWorkers.length} worker${todaysExporterWorkers.length !== 1 ? 's' : ''} today (zip)`}
                                </button>
                            )}
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
                                const eligibleIds = filteredCheckout
                                    .filter(att => sessions.find(s => s.workerId._id === att.workerId._id)?.exporterId?.bulkCheckoutEnabled)
                                    .map(att => att._id);
                                const anyBulkEnabled = eligibleIds.length > 0 || exporters.some(exp => exp.bulkCheckoutEnabled);
                                const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every(id => selectedCheckoutIds.includes(id));

                                const toggleSelectAllEligible = () => {
                                    setSelectedCheckoutIds(prev =>
                                        allEligibleSelected
                                            ? prev.filter(id => !eligibleIds.includes(id))
                                            : Array.from(new Set([...prev, ...eligibleIds]))
                                    );
                                };

                                return (
                                    <div>
                                        {selectedCheckoutIds.length > 0 && (
                                            <div className="flex items-center justify-between gap-3 mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                                                <span className="text-sm font-medium text-red-800">
                                                    {selectedCheckoutIds.length} worker{selectedCheckoutIds.length !== 1 ? 's' : ''} selected
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedCheckoutIds([])}
                                                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        onClick={handleBulkCheckOut}
                                                        disabled={loading}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm disabled:opacity-50 transition-colors"
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                        Check Out Selected
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-compact">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        {anyBulkEnabled && (
                                                            <th className="px-4 py-2 text-left">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allEligibleSelected}
                                                                    onChange={toggleSelectAllEligible}
                                                                    disabled={eligibleIds.length === 0}
                                                                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-30"
                                                                    title="Select all eligible for multiple check-out"
                                                                />
                                                            </th>
                                                        )}
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
                                                            <td colSpan={anyBulkEnabled ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                                                                {checkoutSearch
                                                                    ? 'No workers found matching your search.'
                                                                    : checkoutExporterFilter ? 'No workers on-site for this exporter' : 'No workers on-site to check-out'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredCheckout.map((att) => {
                                                            const session = sessions.find(s => s.workerId._id === att.workerId._id);
                                                            const isEligible = !!session?.exporterId?.bulkCheckoutEnabled;
                                                            const durationMins = Math.floor((Date.now() - new Date(att.checkInTime).getTime()) / 1000 / 60);
                                                            const durationDisplay = durationMins < 60
                                                                ? `${durationMins}m`
                                                                : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;

                                                            return (
                                                                <tr key={att._id} className="hover:bg-gray-50">
                                                                    {anyBulkEnabled && (
                                                                        <td className="px-4 py-2.5">
                                                                            {isEligible && (
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedCheckoutIds.includes(att._id)}
                                                                                    onChange={() => toggleCheckoutSelection(att._id)}
                                                                                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                                                />
                                                                            )}
                                                                        </td>
                                                                    )}
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
