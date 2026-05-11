'use client';

import { useEffect, useState } from 'react';
import { GitBranch, User, Phone, Plus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';

interface Cooperative {
    _id: string;
    name: string;
    code: string;
    contactPerson: string;
    phone: string;
    isActive: boolean;
}

export default function AdminCooperativesPage() {
    const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        contactPerson: '',
        phone: '',
    });

    useEffect(() => {
        fetchCooperatives();
    }, []);

    const fetchCooperatives = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/cooperatives');
            const data = await res.json();
            setCooperatives(data.cooperatives || []);
        } catch (error) {
            console.error('Error fetching cooperatives:', error);
            toast.error('Failed to load cooperatives');
        } finally {
            setLoading(false);
        }
    };

    const handleInitUmucyo = async () => {
        try {
            const res = await fetch('/api/init-cooperative', {
                method: 'POST',
            });

            const data = await res.json();
            
            if (res.ok) {
                toast.success(data.message);
                fetchCooperatives();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast.error('Failed to initialize Umucyo cooperative');
        }
    };

    const handleAddCooperative = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/cooperatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Add failed');
            }

            toast.success('Cooperative added successfully');
            setShowAddForm(false);
            setFormData({
                name: '',
                code: '',
                contactPerson: '',
                phone: '',
            });
            fetchCooperatives();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add cooperative');
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <PageHeader
                icon={GitBranch}
                iconColor="text-indigo-600 dark:text-indigo-400"
                iconBg="bg-indigo-100 dark:bg-indigo-900/30"
                title="Cooperatives Management"
                subtitle="Manage worker cooperatives"
                action={
                    <div className="flex gap-2">
                        <button
                            onClick={handleInitUmucyo}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                        >
                            ✓ Init Umucyo
                        </button>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Cooperative
                        </button>
                    </div>
                }
            />

            {/* Cooperatives List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                        <p>Loading cooperatives...</p>
                    </div>
                ) : cooperatives.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 mb-4 font-medium">No cooperatives found</p>
                        <button
                            onClick={handleInitUmucyo}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            Initialize Umucyo Women Cooperative
                        </button>
                    </div>
                ) : (
                    cooperatives.map((cooperative) => (
                        <div
                            key={cooperative._id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
                        >
                            <div className="mb-4">
                                <h3 className="text-base font-semibold text-gray-900">
                                    {cooperative.name}
                                </h3>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">{cooperative.code}</p>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span className="truncate">{cooperative.contactPerson}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span>{cooperative.phone}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span
                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        cooperative.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {cooperative.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-gray-100">
                        <h2 className="text-2xl font-bold mb-4">Add New Cooperative</h2>
                        <form onSubmit={handleAddCooperative} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cooperative Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Person
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    Add Cooperative
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setFormData({ name: '', code: '', contactPerson: '', phone: '' });
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
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
