'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { UserPlus, ChevronRight, ChevronLeft, Check, User, Phone, Briefcase, FileCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

const STEPS = [
    { id: 1, label: 'Identity', icon: User, desc: 'Name, ID & gender' },
    { id: 2, label: 'Contact & Work', icon: Briefcase, desc: 'Phone, role & cooperative' },
    { id: 3, label: 'Consent', icon: FileCheck, desc: 'Review & confirm' },
];

const empty = {
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
};

type FormData = typeof empty;
type Errors = Partial<Record<keyof FormData, string>>;

function validate(step: number, data: FormData): Errors {
    const e: Errors = {};
    if (step >= 1) {
        if (!data.fullName.trim()) e.fullName = 'Full name is required';
        if (data.workerId && !/^[A-Za-z0-9\-]{4,20}$/.test(data.workerId))
            e.workerId = 'ID must be 4–20 alphanumeric characters';
    }
    if (step >= 2) {
        if (!data.phone.trim()) e.phone = 'Phone number is required';
        else if (!/^\+?[0-9]{9,15}$/.test(data.phone.replace(/\s/g, '')))
            e.phone = 'Enter a valid phone number (e.g. +250788000000)';
        if (!data.primaryRole.trim()) e.primaryRole = 'Primary role is required';
        if (!data.cooperativeId) e.cooperativeId = 'Please select a cooperative';
    }
    if (step >= 3) {
        if (!data.consentWorkRecords) e.consentWorkRecords = 'Worker consent is required to proceed';
    }
    return e;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [cooperatives, setCooperatives] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(empty);
    const [errors, setErrors] = useState<Errors>({});
    const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

    useEffect(() => { fetchCooperatives(); }, []);

    const fetchCooperatives = async () => {
        try {
            const res = await fetch('/api/cooperatives');
            if (res.ok) {
                const data = await res.json();
                const coops = data.cooperatives || [];
                setCooperatives(coops);
                const umucyo = coops.find((c: any) =>
                    c.name.toLowerCase().includes('umucyo') || c.code.toLowerCase().includes('umucyo')
                );
                if (umucyo) setFormData(prev => ({ ...prev, cooperativeId: umucyo._id }));
            }
            const fRes = await fetch('/api/facilities');
            if (fRes.ok) {
                const fData = await fRes.json();
                const facilities = fData.facilities || [];
                if (facilities.length > 0) setFormData(prev => ({ ...prev, facilityId: facilities[0]._id }));
            }
        } catch { toast.error('Failed to load cooperatives'); }
    };

    const set = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setTouched(prev => ({ ...prev, [field]: true }));
        const newErrors = validate(currentStep, { ...formData, [field]: value });
        setErrors(prev => ({ ...prev, [field]: newErrors[field] }));
    };

    const fieldError = (field: keyof FormData) =>
        touched[field] && errors[field] ? errors[field] : undefined;

    const goNext = () => {
        const allTouched = Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {} as any);
        setTouched(allTouched);
        const errs = validate(currentStep, formData);
        const stepFields: Record<number, (keyof FormData)[]> = {
            1: ['fullName', 'workerId'],
            2: ['phone', 'primaryRole', 'cooperativeId'],
            3: ['consentWorkRecords'],
        };
        const relevantErrors = stepFields[currentStep].filter(f => errs[f]);
        if (relevantErrors.length > 0) {
            setErrors(errs);
            return;
        }
        setCurrentStep(s => Math.min(3, s + 1));
    };

    const handleSubmit = async () => {
        const allTouched = Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {} as any);
        setTouched(allTouched);
        const errs = validate(3, formData);
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setLoading(true);
        try {
            const payload: any = { ...formData, photo: '/uploads/placeholder.jpg' };
            if (!payload.facilityId) delete payload.facilityId;
            const res = await fetch('/api/workers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.details || 'Onboarding failed');
            toast.success('Worker onboarded successfully!');
            setTimeout(() => router.push('/supervisor/workers'), 1000);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Onboarding failed');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field: keyof FormData) =>
        `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors ${
            fieldError(field)
                ? 'border-red-400 focus:ring-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-700'
                : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white'
        }`;

    return (
        <div className="max-w-2xl mx-auto">
            <Toaster position="top-right" />

            <PageHeader
                icon={UserPlus}
                iconBg="bg-transparent"
                title="Worker Onboarding"
                subtitle={`Target: under 5 minutes · Step ${currentStep} of 3`}
            />

            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-8">
                {STEPS.map((step, i) => {
                    const isDone = step.id < currentStep;
                    const isActive = step.id === currentStep;
                    const Icon = step.icon;
                    return (
                        <div key={step.id} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1.5 w-full">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isDone ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-4 ring-emerald-100' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                </div>
                                <div className="text-center">
                                    <p className={`text-xs font-semibold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : isDone ? 'text-gray-500' : 'text-gray-400'}`}>{step.label}</p>
                                    <p className="text-[10px] text-gray-400 hidden sm:block">{step.desc}</p>
                                </div>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mb-6 mx-2 rounded-full transition-colors duration-300 ${step.id < currentStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Form card */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">

                {/* Step 1: Identity */}
                {currentStep === 1 && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Identity</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                            <input type="text" value={formData.fullName} onChange={e => set('fullName', e.target.value)} className={inputClass('fullName')} placeholder="Enter full name" />
                            {fieldError('fullName') && <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">{fieldError('fullName')}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Worker ID (National ID)</label>
                            <input type="text" value={formData.workerId} onChange={e => set('workerId', e.target.value)} className={inputClass('workerId')} placeholder="Optional — auto-generated if blank" />
                            {fieldError('workerId') ? <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">{fieldError('workerId')}</p> : <p className="mt-1 text-xs text-gray-400">Leave blank to auto-generate</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender *</label>
                                <select value={formData.gender} onChange={e => set('gender', e.target.value)} className={inputClass('gender')}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date of Birth</label>
                                <input type="date" value={formData.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inputClass('dateOfBirth')} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Contact & Work */}
                {currentStep === 2 && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact & Work Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number *</label>
                                <input type="tel" value={formData.phone} onChange={e => set('phone', e.target.value)} className={inputClass('phone')} placeholder="+250788000000" />
                                {fieldError('phone') && <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">{fieldError('phone')}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input type="email" value={formData.email} onChange={e => set('email', e.target.value)} className={inputClass('email')} placeholder="worker@example.com" />
                                <p className="mt-1 text-xs text-gray-400">QR badge emailed if provided</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary Role *</label>
                            <input type="text" value={formData.primaryRole} onChange={e => set('primaryRole', e.target.value)} className={inputClass('primaryRole')} placeholder="Coffee Sorter" />
                            {fieldError('primaryRole') && <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">{fieldError('primaryRole')}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cooperative *</label>
                            <select value={formData.cooperativeId} onChange={e => set('cooperativeId', e.target.value)} className={inputClass('cooperativeId')}>
                                <option value="">Select a cooperative</option>
                                {cooperatives.map(c => (
                                    <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                            {fieldError('cooperativeId') && <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">{fieldError('cooperativeId')}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Previous Work Type <span className="text-gray-400 font-normal">(optional)</span></label>
                            <select value={formData.previousWorkType} onChange={e => set('previousWorkType', e.target.value)} className={inputClass('previousWorkType')}>
                                <option value="">Select...</option>
                                <option value="none">None</option>
                                <option value="casual">Casual</option>
                                <option value="seasonal">Seasonal</option>
                                <option value="fixed">Fixed</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Step 3: Consent & Review */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Consent</h2>

                        {/* Summary */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Name</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formData.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Phone</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{formData.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Role</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{formData.primaryRole}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Cooperative</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {cooperatives.find(c => c._id === formData.cooperativeId)?.name || '—'}
                                </span>
                            </div>
                        </div>

                        {/* Consent checkboxes */}
                        <div className="space-y-3">
                            <div className={`rounded-xl border p-4 ${fieldError('consentWorkRecords') ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.consentWorkRecords}
                                        onChange={e => set('consentWorkRecords', e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-800 dark:text-gray-200">
                                        Worker consents to storing their work and earnings records in this system. *
                                    </span>
                                </label>
                                {fieldError('consentWorkRecords') && <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-400 ml-7">{fieldError('consentWorkRecords')}</p>}
                            </div>
                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.consentAnonymizedReporting}
                                        onChange={e => set('consentAnonymizedReporting', e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Worker consents to anonymized reporting for impact analysis.
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className={`flex gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 ${currentStep === 1 ? 'justify-end' : 'justify-between'}`}>
                    {currentStep > 1 && (
                        <button
                            type="button"
                            onClick={() => setCurrentStep(s => s - 1)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>
                    )}
                    {currentStep < 3 ? (
                        <button
                            type="button"
                            onClick={goNext}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            Continue
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Registering...' : 'Complete Onboarding'}
                            {!loading && <Check className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
