'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, CameraOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface CheckInResult {
    workerName: string;
    workerId: string;
    photo?: string;
}

interface QrScannerModalProps {
    onClose: () => void;
    onCheckInSuccess: (result: CheckInResult) => void;
}

type ScanState = 'scanning' | 'processing' | 'success' | 'error' | 'no-camera';

export function QrScannerModal({ onClose, onCheckInSuccess }: QrScannerModalProps) {
    const scannerRef = useRef<any>(null);
    const containerId = 'qr-scanner-container';
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [message, setMessage] = useState('');
    const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        let html5QrCode: any = null;

        const startScanner = async () => {
            try {
                // Dynamic import - browser only
                const { Html5Qrcode } = await import('html5-qrcode');
                html5QrCode = new Html5Qrcode(containerId);
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: 'environment' }, // rear camera
                    { fps: 10, qrbox: { width: 220, height: 220 } },
                    handleScan,
                    undefined // suppress errors during scanning
                );
            } catch (err: any) {
                console.error('Camera error:', err);
                const msg = err?.message || err?.toString() || '';
                if (msg.includes('NotAllowed') || msg.includes('Permission')) {
                    setScanState('no-camera');
                    setMessage('Camera permission was denied. Please allow camera access in your browser settings and try again.');
                } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
                    setScanState('no-camera');
                    setMessage('No camera found on this device.');
                } else {
                    setScanState('no-camera');
                    setMessage('Could not access camera. Please check permissions and try again.');
                }
            }
        };

        startScanner();

        return () => {
            html5QrCode?.stop().catch(() => {});
        };
    }, []);

    const handleScan = async (decodedText: string) => {
        // Prevent double-processing
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        // Validate QR format: must start with "AKAZI:"
        if (!decodedText.startsWith('AKAZI:')) {
            isProcessingRef.current = false;
            return;
        }

        const qrToken = decodedText.replace('AKAZI:', '').trim();
        if (!qrToken) {
            isProcessingRef.current = false;
            return;
        }

        // Stop the camera while processing
        await scannerRef.current?.stop().catch(() => {});
        setScanState('processing');
        setMessage('Processing check-in...');

        try {
            const res = await fetch('/api/attendance/qr-checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken }),
            });

            const data = await res.json();

            if (!res.ok) {
                setScanState('error');
                setMessage(data.error || 'Check-in failed');
            } else {
                const result: CheckInResult = {
                    workerName: data.worker.fullName,
                    workerId: data.worker.workerId,
                    photo: data.worker.photo,
                };
                setLastResult(result);
                setScanState('success');
                setMessage(`${data.worker.fullName} checked in successfully!`);
                onCheckInSuccess(result);
            }
        } catch {
            setScanState('error');
            setMessage('Network error. Please try again.');
        } finally {
            isProcessingRef.current = false;
        }
    };

    const handleScanAnother = async () => {
        setScanState('scanning');
        setMessage('');
        setLastResult(null);
        isProcessingRef.current = false;

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const html5QrCode = new Html5Qrcode(containerId);
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                handleScan,
                undefined
            );
        } catch (err) {
            setScanState('error');
            setMessage('Could not restart camera.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-emerald-700">
                    <div className="flex items-center gap-2 text-white">
                        <Camera className="w-5 h-5" />
                        <span className="font-semibold">QR Check-in Scanner</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5">
                    {/* Scanner viewport */}
                    {scanState === 'scanning' && (
                        <div className="mb-4">
                            <div
                                id={containerId}
                                className="w-full rounded-xl overflow-hidden border-2 border-emerald-500"
                                style={{ minHeight: 260 }}
                            />
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                                Point the camera at the worker's QR badge
                            </p>
                        </div>
                    )}

                    {/* Processing */}
                    {scanState === 'processing' && (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                            <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
                        </div>
                    )}

                    {/* Success */}
                    {scanState === 'success' && lastResult && (
                        <div className="flex flex-col items-center py-6 gap-4">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{lastResult.workerName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">ID: {lastResult.workerId}</p>
                                <p className="mt-2 text-emerald-600 font-semibold text-sm">Checked in successfully</p>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={handleScanAnother}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors"
                                >
                                    Scan Next Worker
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Camera Permission Denied */}
                    {scanState === 'no-camera' && (
                        <div className="flex flex-col items-center py-6 gap-4">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                <CameraOff className="w-9 h-9 text-amber-500" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Camera Access Required</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{message}</p>
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-left text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    <p className="font-medium text-gray-700 dark:text-gray-300">How to fix:</p>
                                    <p>1. Click the lock/camera icon in the address bar</p>
                                    <p>2. Set Camera to "Allow"</p>
                                    <p>3. Reload the page and try again</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button
                                    onClick={handleScanAnother}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors"
                                >
                                    Retry Camera
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {scanState === 'error' && (
                        <div className="flex flex-col items-center py-6 gap-4">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-9 h-9 text-red-500" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">Check-in Failed</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
                            </div>
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={handleScanAnother}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
