'use client';

import { useEffect, useState } from 'react';
import { X, Printer, RefreshCw, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { drawBadgeOnCanvas, downloadCanvasAsPng } from '@/lib/qr/generateWorkerBadge';

interface WorkerQrModalProps {
    workerId: string;
    workerName: string;
    onClose: () => void;
}

export function WorkerQrModal({ workerId, workerName, onClose }: WorkerQrModalProps) {
    const [qrInfo, setQrInfo] = useState<{ qrToken: string; workerId: string; phone?: string } | null>(null);
    const [checkinUrl, setCheckinUrl] = useState('');
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { fetchQrToken(); }, [workerId]);

    const fetchQrToken = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/workers/${workerId}/qr-token`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setQrInfo({ qrToken: data.qrToken, workerId: data.workerId, phone: data.phone });

            const [ci, co] = await Promise.all([
                QRCode.toDataURL(`AKAZI:CHECKIN:${data.qrToken}`, {
                    width: 240, margin: 2,
                    color: { dark: '#065f46', light: '#ffffff' },
                    errorCorrectionLevel: 'M',
                }),
                QRCode.toDataURL(`AKAZI:CHECKOUT:${data.qrToken}`, {
                    width: 240, margin: 2,
                    color: { dark: '#991b1b', light: '#ffffff' },
                    errorCorrectionLevel: 'M',
                }),
            ]);
            setCheckinUrl(ci);
            setCheckoutUrl(co);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load QR code');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!checkinUrl || !checkoutUrl || !qrInfo) return;

        const canvas = document.createElement('canvas');
        await drawBadgeOnCanvas(
            canvas,
            { workerName, workerId: qrInfo.workerId, phone: qrInfo.phone },
            checkinUrl,
            checkoutUrl
        );
        downloadCanvasAsPng(canvas, `Badge-${workerName.replace(/\s+/g, '_')}.png`);
    };

    const handlePrint = () => {
        if (!checkinUrl || !checkoutUrl || !qrInfo) return;
        const win = window.open('', '_blank');
        if (!win) return;

        win.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>Attendance Badge – ${workerName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; }
        .badge {
            width: 160mm; background: white;
            border: 2px solid #065f46; border-radius: 4mm;
            overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .badge-header {
            background: #065f46; color: white;
            padding: 3mm 4mm; text-align: center;
        }
        .badge-header .title { font-size: 13pt; font-weight: bold; letter-spacing: 1px; }
        .badge-header .sub { font-size: 8pt; opacity: 0.8; margin-top: 1px; }
        .worker-info { text-align: center; padding: 3mm 4mm 2mm; }
        .worker-name { font-size: 13pt; font-weight: bold; color: #111827; }
        .worker-phone { font-size: 9pt; color: #6b7280; margin-top: 1mm; }
        .worker-id { font-size: 8pt; font-family: monospace; background: #f0fdf4; color: #065f46; padding: 1mm 3mm; border-radius: 2mm; display: inline-block; margin-top: 1.5mm; border: 1px solid #d1fae5; }
        .qr-row { display: flex; border-top: 1px solid #e5e7eb; }
        .qr-cell { flex: 1; text-align: center; padding: 4mm 6mm; }
        .qr-cell:first-child { border-right: 1px solid #e5e7eb; }
        .qr-img { width: 52mm; height: 52mm; display: block; margin: 0 auto 2mm; border-radius: 2mm; }
        .qr-label { font-size: 10pt; font-weight: bold; letter-spacing: 1px; }
        .checkin-label { color: #065f46; }
        .checkout-label { color: #991b1b; }
        .qr-hint { font-size: 7pt; color: #9ca3af; }
        .footer { border-top: 1px solid #e5e7eb; text-align: center; padding: 2mm; font-size: 7pt; color: #9ca3af; }
        @media print { body { background: white; } }
    </style>
</head>
<body>
    <div class="badge">
        <div class="badge-header">
            <div class="title">Akazi</div>
            <div class="sub">Worker Attendance Badge</div>
        </div>
        <div class="worker-info">
            <div class="worker-name">${workerName}</div>
            ${qrInfo.phone ? `<div class="worker-phone">${qrInfo.phone}</div>` : ''}
            <div class="worker-id">ID: ${qrInfo.workerId}</div>
        </div>
        <div class="qr-row">
            <div class="qr-cell">
                <img src="${checkinUrl}" class="qr-img" alt="Check-in QR" />
                <div class="qr-label checkin-label">CHECK IN</div>
                <div class="qr-hint">Morning arrival</div>
            </div>
            <div class="qr-cell">
                <img src="${checkoutUrl}" class="qr-img" alt="Check-out QR" />
                <div class="qr-label checkout-label">CHECK OUT</div>
                <div class="qr-hint">End of shift</div>
            </div>
        </div>
        <div class="footer">Supervisor scans the appropriate code · Akazi Attendance System</div>
    </div>
    <script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`);
        win.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-emerald-600" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Attendance Badge — {workerName}</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center py-10 gap-3">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Generating QR codes...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-red-500 text-sm mb-3">{error}</p>
                            <button onClick={fetchQrToken} className="text-sm text-emerald-600 hover:underline">Try again</button>
                        </div>
                    ) : (
                        <>
                            {/* Badge preview */}
                            <div className="border-2 border-emerald-600 rounded-xl overflow-hidden mb-4">
                                {/* Badge header */}
                                <div className="bg-emerald-700 text-white text-center py-2 px-4">
                                    <p className="font-bold tracking-widest text-sm">Akazi</p>
                                    <p className="text-xs text-emerald-200">Worker Attendance Badge</p>
                                </div>

                                {/* Worker info */}
                                <div className="bg-white text-center py-2 px-4 border-b border-gray-100">
                                    <p className="font-bold text-gray-900 text-sm">{workerName}</p>
                                    {qrInfo?.phone && <p className="text-xs text-gray-500">{qrInfo.phone}</p>}
                                    <p className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block">
                                        ID: {qrInfo?.workerId}
                                    </p>
                                </div>

                                {/* Dual QR codes */}
                                <div className="bg-white grid grid-cols-2 divide-x divide-gray-100">
                                    <div className="flex flex-col items-center p-4 gap-2">
                                        {checkinUrl && (
                                            <img src={checkinUrl} alt="Check-in QR" className="w-32 h-32 rounded-lg border border-emerald-100" />
                                        )}
                                        <span className="text-xs font-bold tracking-widest text-emerald-700">CHECK IN</span>
                                        <span className="text-[10px] text-gray-400">Morning arrival</span>
                                    </div>
                                    <div className="flex flex-col items-center p-4 gap-2">
                                        {checkoutUrl && (
                                            <img src={checkoutUrl} alt="Check-out QR" className="w-32 h-32 rounded-lg border border-red-100" />
                                        )}
                                        <span className="text-xs font-bold tracking-widest text-red-700">CHECK OUT</span>
                                        <span className="text-[10px] text-gray-400">End of shift</span>
                                    </div>
                                </div>

                                <div className="bg-white text-center py-2 border-t border-gray-100">
                                    <p className="text-[10px] text-gray-400">Supervisor scans the appropriate code at check-in or check-out</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors">
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                                <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors">
                                    <Download className="w-4 h-4" />
                                    Download
                                </button>
                                <button onClick={fetchQrToken} title="Regenerate QR" className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
