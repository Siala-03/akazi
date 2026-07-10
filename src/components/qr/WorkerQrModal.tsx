'use client';

import { useEffect, useState } from 'react';
import { X, Printer, RefreshCw, QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';

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

        const W = 620;
        const H = 380;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Background + border
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(2, 2, W - 4, H - 4, 10);
        ctx.stroke();

        // Header
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.roundRect(0, 0, W, 56, [10, 10, 0, 0]);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.fillText('Akazi', W / 2, 30);
        ctx.font = '11px Arial, sans-serif';
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText('Worker Attendance Badge', W / 2, 47);

        // Worker info
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(workerName, W / 2, 82);

        if (qrInfo.phone) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '12px Arial, sans-serif';
            ctx.fillText(qrInfo.phone, W / 2, 99);
        }

        const idText = `ID: ${qrInfo.workerId}`;
        ctx.font = '10px monospace';
        const idW = ctx.measureText(idText).width + 20;
        const idX = (W - idW) / 2;
        ctx.fillStyle = '#f0fdf4';
        ctx.beginPath();
        ctx.roundRect(idX, 106, idW, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#d1fae5';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#065f46';
        ctx.fillText(idText, W / 2, 120);

        // QR codes
        const qrSize = 170;
        const leftX = 60;
        const rightX = W - 60 - qrSize;
        const qrY = 136;

        const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });

        const [ciImg, coImg] = await Promise.all([loadImg(checkinUrl), loadImg(checkoutUrl)]);

        // Check-in box
        ctx.strokeStyle = '#d1fae5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(leftX - 6, qrY - 6, qrSize + 12, qrSize + 12, 6);
        ctx.stroke();
        ctx.drawImage(ciImg, leftX, qrY, qrSize, qrSize);

        // Check-out box
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rightX - 6, qrY - 6, qrSize + 12, qrSize + 12, 6);
        ctx.stroke();
        ctx.drawImage(coImg, rightX, qrY, qrSize, qrSize);

        // Labels
        const labelY = qrY + qrSize + 22;
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#065f46';
        ctx.fillText('CHECK IN', leftX + qrSize / 2, labelY);
        ctx.fillStyle = '#991b1b';
        ctx.fillText('CHECK OUT', rightX + qrSize / 2, labelY);

        // Divider
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2, qrY);
        ctx.lineTo(W / 2, qrY + qrSize);
        ctx.stroke();

        // Footer
        ctx.fillStyle = '#9ca3af';
        ctx.font = '9px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Supervisor scans CHECK IN in the morning · CHECK OUT at end of shift', W / 2, H - 10);

        const link = document.createElement('a');
        link.download = `Badge-${workerName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
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
