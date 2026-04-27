'use client';

import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft, Mail, KeyRound, Lock, Eye, EyeOff, Coffee } from 'lucide-react';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success('Reset code sent to your email!');
            setStep('otp');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success('Code verified!');
            setStep('password');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success('Password reset successfully!');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const stepConfig = {
        email:    { icon: Mail,     title: 'Forgot Password',  subtitle: 'Enter your email to receive a reset code' },
        otp:      { icon: KeyRound, title: 'Enter Reset Code', subtitle: `We sent a 6-digit code to ${email}` },
        password: { icon: Lock,     title: 'Set New Password', subtitle: 'Choose a strong new password' },
    };

    const { icon: StepIcon, title, subtitle } = stepConfig[step];
    const stepIndex = ['email', 'otp', 'password'].indexOf(step);

    const inputClass = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all";
    const submitClass = "w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-[0.99]";
    const submitStyle = { background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' };

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
            <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-[420px]">
                {/* Brand */}
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

                {/* Card */}
                <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)' }}
                >
                    <div className="px-8 pt-8 pb-7">
                        {/* Step icon + title */}
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                <StepIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-[18px] font-semibold text-gray-900 leading-tight">{title}</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                            </div>
                        </div>

                        {/* Step indicators */}
                        <div className="flex items-center gap-1.5 mt-5 mb-6">
                            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
                                <div key={s} className="flex items-center gap-1.5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                        step === s
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                            : stepIndex > i
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {i + 1}
                                    </div>
                                    {i < 2 && (
                                        <div className={`w-6 h-0.5 rounded-full transition-colors ${stepIndex > i ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step 1: Email */}
                        {step === 'email' && (
                            <form onSubmit={handleRequestOtp} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={inputClass}
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <div className="pt-1">
                                    <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
                                        {loading ? 'Sending...' : 'Send Reset Code'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 2: OTP */}
                        {step === 'otp' && (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                <div>
                                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1.5">6-Digit Code</label>
                                    <input
                                        id="otp"
                                        type="text"
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full px-3.5 py-3.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                                        placeholder="000000"
                                    />
                                </div>
                                <div className="pt-1 space-y-2">
                                    <button type="submit" disabled={loading || otp.length !== 6} className={submitClass} style={submitStyle}>
                                        {loading ? 'Verifying...' : 'Verify Code'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setOtp(''); handleRequestOtp({ preventDefault: () => {} } as React.FormEvent); }}
                                        className="w-full py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                                    >
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: New Password */}
                        {step === 'password' && (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            id="newPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={`${inputClass} pr-10`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            id="confirmPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`${inputClass} pr-10`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
                                        {loading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Card footer */}
                    <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                        <a href="/login" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Login
                        </a>
                    </div>
                </div>

                <p className="text-center text-[11px] text-white/30 mt-7">
                    For NAEB Coffee Sorting Facilities · Powered by Iwacu Cooperative
                </p>
            </div>
        </div>
    );
}
