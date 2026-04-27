'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Coffee, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { email, password } = formData;
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            toast.success('Login successful!');
            const redirectUrl = data.redirectUrl || callbackUrl;
            console.log('[Login] Redirecting to:', redirectUrl);
            setTimeout(() => { window.location.href = redirectUrl; }, 500);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Login failed');
            toast.error(error instanceof Error ? error.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12"
            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 35%, #0f766e 70%, #134e4a 100%)' }}
        >
            <Toaster position="top-right" />

            {/* Dot grid */}
            <div
                className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
            />

            {/* Glow blobs */}
            <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-[420px]">
                {/* Brand header */}
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl mb-5 border border-white/20 shadow-2xl"
                        style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)' }}
                    >
                        <Coffee className="w-9 h-9 text-white" />
                    </div>
                    <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">Akazi Rwanda Ltd</h1>
                    <p className="text-emerald-200/70 mt-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
                        Worker Management System
                    </p>
                </div>

                {/* Login card */}
                <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)' }}
                >
                    <div className="px-8 pt-8 pb-7">
                        <h2 className="text-[18px] font-semibold text-gray-900 mb-1">Welcome back</h2>
                        <p className="text-sm text-gray-400 mb-6">Sign in to access your dashboard</p>

                        {error && (
                            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <a href="/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword
                                            ? <EyeOff className="w-4 h-4" />
                                            : <Eye className="w-4 h-4" />
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-[0.99]"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                                        boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                                    }}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Signing in...
                                        </span>
                                    ) : 'Sign In'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Card footer */}
                    <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">No account? Contact your administrator</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs text-gray-400 font-medium">Secure login</span>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[11px] text-white/30 mt-7">
                    For NAEB Coffee Sorting Facilities · Powered by Iwacu Cooperative
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 35%, #0f766e 70%, #134e4a 100%)' }}
            >
                <div className="text-center">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 border border-white/20"
                        style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)' }}
                    >
                        <Coffee className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-emerald-200/70 text-sm">Loading...</p>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
