'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
    Building2, MapPin, User, Phone, Mail,
    Plus, Search, RefreshCw, Edit2, Power, PowerOff, X, Hash, KeyRound, DollarSign,
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import { PageHeader } from '@/components/PageHeader';

interface Exporter {
    _id: string;
    exporterCode: string;
    tinNumber?: string;
    companyTradingName: string;
    companyAddress: string;
    contactPerson: string;
    phone: string;
    email: string;
    isActive: boolean;
}

interface RateCard {
    _id: string;
    exporterId: string | { _id: string; companyTradingName: string };
    ratePerBag: number;
    isActive: boolean;
    effectiveFrom: string;
}

const emptyForm = {
    exporterCode: '',
    tinNumber: '',
    companyTradingName: '',
    companyAddress: '',
    contactPerson: '',
    phone: '',
    email: '',
};

export default function AdminExportersPage() {
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [rateCards, setRateCards] = useState<Record<string, RateCard>>({});
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingExporter, setEditingExporter] = useState<Exporter | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);
    const [showRateModal, setShowRateModal] = useState(false);
    const [rateExporter, setRateExporter] = useState<Exporter | null>(null);
    const [ratePerBag, setRatePerBag] = useState('');

    useEffect(() => { fetchExporters(); fetchRateCards(); }, []);

    const fetchExporters = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/exporters?all=true');
            const data = await res.json();
            setExporters(data.exporters || []);
        } catch {
            toast.error('Failed to load exporters');
        } finally {
            setLoading(false);
        }
    };

    const fetchRateCards = async () => {
        try {
            const res = await fetch('/api/rate-cards');
            const data = await res.json();
            const cards: Record<string, RateCard> = {};
            (data.rateCards || []).forEach((rc: RateCard) => {
                if (rc.isActive) {
                    const eid = typeof rc.exporterId === 'string' ? rc.exporterId : rc.exporterId._id;
                    cards[eid] = rc;
                }
            });
            setRateCards(cards);
        } catch {
            // silently fail
        }
    };

    const openRateModal = (exp: Exporter) => {
        setRateExporter(exp);
        setRatePerBag(rateCards[exp._id]?.ratePerBag?.toString() || '');
        setShowRateModal(true);
    };

    const handleSetRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rateExporter) return;
        try {
            const res = await fetch('/api/rate-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exporterId: rateExporter._id, ratePerBag: Number(ratePerBag) }),
            });
            if (!res.ok) throw new Error('Failed to set rate');
            toast.success(`Rate set to FRw ${ratePerBag}/bag for ${rateExporter.companyTradingName}`);
            setShowRateModal(false);
            setRateExporter(null);
            fetchRateCards();
        } catch {
            toast.error('Failed to set rate');
        }
    };

    const openAdd = () => { setEditingExporter(null); setFormData(emptyForm); setShowAddForm(true); };
    const openEdit = (exp: Exporter) => {
        setEditingExporter(exp);
        setFormData({
            exporterCode: exp.exporterCode, tinNumber: exp.tinNumber || '',
            companyTradingName: exp.companyTradingName, companyAddress: exp.companyAddress,
            contactPerson: exp.contactPerson, phone: exp.phone, email: exp.email,
        });
        setShowAddForm(true);
    };
    const closeForm = () => { setShowAddForm(false); setEditingExporter(null); setFormData(emptyForm); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingExporter) {
                const res = await fetch(`/api/exporters/${editingExporter._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                if (!res.ok) throw new Error('Update failed');
                toast.success('Exporter updated successfully');
            } else {
                const res = await fetch('/api/exporters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, isActive: true }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Add failed');
                if (data.userCreated) {
                    toast.success(`Exporter added! Login credentials sent to ${formData.email}`, { duration: 5000 });
                } else {
                    toast.success('Exporter added successfully');
                }
            }
            closeForm();
            fetchExporters();
        } catch {
            toast.error(editingExporter ? 'Failed to update exporter' : 'Failed to add exporter');
        }
    };

    const handleToggleStatus = async (exporter: Exporter) => {
        try {
            const res = await fetch(`/api/exporters/${exporter._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !exporter.isActive }),
            });
            if (!res.ok) throw new Error('Status update failed');
            toast.success(`Exporter ${!exporter.isActive ? 'activated' : 'deactivated'}`);
            fetchExporters();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleResetPassword = async (exporter: Exporter) => {
        if (!confirm(`Reset password for ${exporter.contactPerson} (${exporter.email})?`)) return;
        try {
            const res = await fetch('/api/admin/resend-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: exporter.email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');
            toast.success(data.message || 'New credentials sent!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to reset password');
        }
    };

    const filtered = exporters.filter(exp => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !searchTerm ||
            exp.companyTradingName.toLowerCase().includes(q) ||
            exp.exporterCode.toLowerCase().includes(q) ||
            exp.email.toLowerCase().includes(q) ||
            exp.contactPerson.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? exp.isActive : !exp.isActive);
        return matchSearch && matchStatus;
    });

    const active = exporters.filter(e => e.isActive).length;
    const inactive = exporters.length - active;

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <PageHeader
                icon={Building2}
                title="Exporters"
                subtitle="Manage coffee exporters and sorting rates"
                action={
                    <button
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Exporter
                    </button>
                }
            />

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{exporters.length}</p>
                    </div>
                </div>
                <div className="card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <Power className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-emerald-600 font-medium">Active</p>
                        <p className="text-2xl font-bold text-gray-900">{active}</p>
                    </div>
                </div>
                <div className="card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex items-center justify-center">
                        <PowerOff className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Inactive</p>
                        <p className="text-2xl font-bold text-gray-900">{inactive}</p>
                    </div>
                </div>
            </div>

            {/* Table card */}
            <div className="card rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Exporter Directory</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{filtered.length} of {exporters.length} exporters</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search exporters..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-44 sm:w-56"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button onClick={fetchExporters} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                        <p className="text-sm">Loading exporters...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Building2 className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                        <p className="font-semibold text-gray-500 mb-1">No exporters found</p>
                        <p className="text-sm text-gray-400 mb-5">
                            {searchTerm ? 'Try adjusting your search.' : 'Add your first exporter to get started.'}
                        </p>
                        {!searchTerm && (
                            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition-colors">
                                <Plus className="w-4 h-4" /> Add Exporter
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Exporter</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Address</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate/Bag</th>
                                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginated.map(exp => (
                                    <tr key={exp._id} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm">{exp.companyTradingName}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Hash className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-400 font-mono">{exp.exporterCode}</span>
                                                        {exp.tinNumber && (
                                                            <span className="text-xs text-gray-400">· TIN: {exp.tinNumber}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span className="truncate max-w-[140px]">{exp.contactPerson}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <span>{exp.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <span className="truncate max-w-[160px]">{exp.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                                            <div className="flex items-start gap-1.5 text-sm text-gray-600">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                                <span className="max-w-[160px] leading-snug">{exp.companyAddress}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            {rateCards[exp._id] ? (
                                                <button
                                                    onClick={() => openRateModal(exp)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer"
                                                    title="Click to update rate"
                                                >
                                                    <DollarSign className="w-3 h-3" />
                                                    FRw {rateCards[exp._id].ratePerBag.toLocaleString()}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openRateModal(exp)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
                                                    title="Set rate per bag"
                                                >
                                                    <DollarSign className="w-3 h-3" />
                                                    Set Rate
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                exp.isActive
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${exp.isActive ? 'bg-white' : 'bg-gray-400'}`}></span>
                                                {exp.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(exp)}
                                                    className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(exp)}
                                                    className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(exp)}
                                                    className={`p-1.5 rounded-lg transition-colors ${
                                                        exp.isActive
                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                                    title={exp.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {exp.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
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
                        itemLabel="exporters"
                    />
                )}
            </div>

            {/* Set Rate Modal */}
            {showRateModal && rateExporter && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Set Rate Per Bag</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{rateExporter.companyTradingName}</p>
                            </div>
                            <button onClick={() => { setShowRateModal(false); setRateExporter(null); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSetRate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-600" />Rate Per Bag (FRw)</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="1"
                                    value={ratePerBag}
                                    onChange={e => setRatePerBag(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                    placeholder="e.g. 150"
                                />
                                {rateCards[rateExporter._id] && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Current rate: FRw {rateCards[rateExporter._id].ratePerBag.toLocaleString()}/bag
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
                                >
                                    Save Rate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowRateModal(false); setRateExporter(null); }}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingExporter ? 'Edit Exporter' : 'Add New Exporter'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {editingExporter ? 'Update the exporter details below.' : 'Fill in the details to register a new exporter.'}
                                </p>
                            </div>
                            <button onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-emerald-600" />Exporter Code</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingExporter}
                                        value={formData.exporterCode}
                                        onChange={e => setFormData({ ...formData, exporterCode: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500 uppercase"
                                        placeholder="e.g. EXP001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        TIN Number <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.tinNumber}
                                        onChange={e => setFormData({ ...formData, tinNumber: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                        placeholder="Tax ID"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-600" />Company Trading Name</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.companyTradingName}
                                    onChange={e => setFormData({ ...formData, companyTradingName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                    placeholder="Company name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />Company Address</span>
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    value={formData.companyAddress}
                                    onChange={e => setFormData({ ...formData, companyAddress: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
                                    placeholder="Physical address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-emerald-600" />Contact Person</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.contactPerson}
                                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-600" />Phone</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                        placeholder="+250..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-emerald-600" />Email</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                        placeholder="email@company.com"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
                                >
                                    {editingExporter ? 'Save Changes' : 'Add Exporter'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeForm}
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
