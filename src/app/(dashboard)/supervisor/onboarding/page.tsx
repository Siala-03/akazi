'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { UserPlus } from 'lucide-react';

export default function OnboardingPage() {
    const router = useRouter();
    const [cooperatives, setCooperatives] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        workerId: '',
        gender: 'male',
        dateOfBirth: '',
        phone: '',
        email: '',
        primaryRole: 'Coffee Sorter',
        cooperativeId: '',
        facilityId: '',
        previousWorkType: '',
        consentWorkRecords: false,
        consentAnonymizedReporting: false,
    });

    useEffect(() => {
        fetchCooperatives();
    }, []);

    const fetchCooperatives = async () => {
        try {
            const res = await fetch('/api/cooperatives');
            if (res.ok) {
                const data = await res.json();
                const coops = data.cooperatives || [];
                setCooperatives(coops);
                
                // Auto-select Umucyo Women Cooperative if it exists
                const umucyo = coops.find((coop: any) => 
                    coop.name.toLowerCase().includes('umucyo') || 
                    coop.code.toLowerCase().includes('umucyo')
                );
                
                if (umucyo && !formData.cooperativeId) {
                    setFormData(prev => ({
                        ...prev,
                        cooperativeId: umucyo._id
                    }));
                }
            }

            // Fetch and set default facility
            const facilityRes = await fetch('/api/facilities');
            if (facilityRes.ok) {
                const facilityData = await facilityRes.json();
                const facilities = facilityData.facilities || [];
                if (facilities.length > 0 && !formData.facilityId) {
                    setFormData(prev => ({
                        ...prev,
                        facilityId: facilities[0]._id
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching cooperatives:', error);
            toast.error('Failed to load cooperatives');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.consentWorkRecords) {
            toast.error('Worker consent is required');
            return;
        }

        if (!formData.cooperativeId) {
            toast.error('Please select a cooperative');
            return;
        }

        if (!formData.fullName || !formData.phone) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);

        try {
            // For photo, we'll use a placeholder for now
            const payload: any = {
                ...formData,
                photo: '/uploads/placeholder.jpg',
            };

            // Remove empty facilityId if present
            if (!payload.facilityId || payload.facilityId === '') {
                delete payload.facilityId;
            }

            console.log('[Onboarding] Submitting payload:', payload);

            const res = await fetch('/api/workers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.details || 'Onboarding failed');
            }

            toast.success('Worker onboarded successfully!');
            setTimeout(() => {
                router.push('/supervisor/workers');
            }, 1000);
        } catch (error) {
            console.error('[Onboarding] Error:', error);
            toast.error(error instanceof Error ? error.message : 'Onboarding failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 rounded-2xl p-8 shadow-xl shadow-emerald-500/30 mb-8">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                </div>
                
                {/* Decorative gradient circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300/20 rounded-full blur-3xl"></div>
                
                <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30">
                            <UserPlus className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-white drop-shadow-lg">Worker Onboarding</h1>
                    </div>
                    <p className="text-white/90 text-lg ml-15">
                        Register a new casual worker (Target: ≤ 5 minutes)
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
                {/* Identity & Contact */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                        Identity & Contact
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) =>
                                    setFormData({ ...formData, fullName: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Enter full name"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Worker ID (National ID)
                            </label>
                            <input
                                type="text"
                                value={formData.workerId}
                                onChange={(e) =>
                                    setFormData({ ...formData, workerId: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Enter national ID or worker identification number"
                            />
                            <p className="mt-1 text-sm text-gray-500">Optional: Enter the worker's national ID card number for identification</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gender *
                            </label>
                            <select
                                required
                                value={formData.gender}
                                onChange={(e) =>
                                    setFormData({ ...formData, gender: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) =>
                                    setFormData({ ...formData, dateOfBirth: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="+250788000000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email (Optional)
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="worker@example.com"
                            />
                            <p className="text-xs text-gray-500 mt-1">QR badge will be emailed if provided</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Primary Role *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.primaryRole}
                                onChange={(e) =>
                                    setFormData({ ...formData, primaryRole: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cooperative *
                            </label>
                            <select
                                required
                                value={formData.cooperativeId}
                                onChange={(e) =>
                                    setFormData({ ...formData, cooperativeId: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="">Select a cooperative</option>
                                {cooperatives.map((coop) => (
                                    <option key={coop._id} value={coop._id}>
                                        {coop.name} ({coop.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Impact Baseline */}
                <div className="mb-8 pb-8 border-b">
                    <h2 className="text-xl font-semibold mb-2 text-gray-900">
                        Impact Baseline
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Optional - helps track worker progress over time
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Previous Work Type
                            </label>
                            <select
                                value={formData.previousWorkType}
                                onChange={(e) =>
                                    setFormData({ ...formData, previousWorkType: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="">Select...</option>
                                <option value="none">None</option>
                                <option value="casual">Casual</option>
                                <option value="seasonal">Seasonal</option>
                                <option value="fixed">Fixed</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Consent */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                        Consent *
                    </h2>

                    <div className="space-y-4">
                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                required
                                checked={formData.consentWorkRecords}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        consentWorkRecords: e.target.checked,
                                    })
                                }
                                className="mt-1 mr-3 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700">
                                I consent to storing my work and earnings records in this system *
                            </span>
                        </label>

                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                checked={formData.consentAnonymizedReporting}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        consentAnonymizedReporting: e.target.checked,
                                    })
                                }
                                className="mt-1 mr-3 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700">
                                I consent to anonymized reporting for impact analysis
                            </span>
                        </label>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 text-gray-700 hover:text-gray-900"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Onboarding...' : 'Complete Onboarding'}
                    </button>
                </div>
            </form>
        </div>
    );
}
