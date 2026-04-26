'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Printer, RefreshCw, QrCode, User, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface WorkerQrModalProps {
    workerId: string; // MongoDB _id
    workerName: string;
    onClose: () => void;
}

export function WorkerQrModal({ workerId, workerName, onClose }: WorkerQrModalProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [qrInfo, setQrInfo] = useState<{ qrToken: string; workerId: string; phone?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchQrToken();
    }, [workerId]);

    const fetchQrToken = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/workers/${workerId}/qr-token`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setQrInfo({ qrToken: data.qrToken, workerId: data.workerId, phone: data.phone });

            // Generate QR code image from token
            const url = await QRCode.toDataURL(`AKAZI:${data.qrToken}`, {
                width: 280,
                margin: 2,
                color: { dark: '#065f46', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            });
            setQrDataUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load QR code');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!qrDataUrl || !qrInfo) return;

        const W = 340;
        const H = qrInfo.phone ? 430 : 410;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // White background + border
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(2, 2, W - 4, H - 4, 10);
        ctx.stroke();

        // Emerald header
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.roundRect(0, 0, W, 64, [10, 10, 0, 0]);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.fillText('Akazi Rwanda Ltd', W / 2, 36);
        ctx.font = '11px Arial, sans-serif';
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText('Akazi Rwanda Ltd', W / 2, 54);

        // QR code
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); });
        const qrSize = 210;
        const qrX = (W - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, 78, qrSize, qrSize);

        // Worker name
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 17px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(workerName, W / 2, 315);

        // Phone number
        let nextY = 336;
        if (qrInfo.phone) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '13px Arial, sans-serif';
            ctx.fillText(qrInfo.phone, W / 2, nextY);
            nextY += 22;
        }

        // Worker ID badge
        const idText = `ID: ${qrInfo.workerId}`;
        ctx.font = '11px monospace, Courier New';
        const idW = ctx.measureText(idText).width + 24;
        const idX = (W - idW) / 2;
        ctx.fillStyle = '#f0fdf4';
        ctx.beginPath();
        ctx.roundRect(idX, nextY, idW, 22, 4);
        ctx.fill();
        ctx.strokeStyle = '#d1fae5';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#065f46';
        ctx.fillText(idText, W / 2, nextY + 15);

        // Scan hint
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Arial, sans-serif';
        ctx.fillText('Scan this QR code to check in', W / 2, H - 14);

        const link = document.createElement('a');
        link.download = `QR-Badge-${workerName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !qrDataUrl || !qrInfo) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Worker Badge – ${workerName}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; }
                    .badge {
                        width: 85mm; padding: 6mm;
                        background: white; border: 2px solid #065f46;
                        border-radius: 4mm; text-align: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    }
                    .badge-header {
                        background: #065f46; color: white;
                        padding: 3mm 4mm; border-radius: 2mm; margin-bottom: 4mm;
                        font-size: 11pt; font-weight: bold; letter-spacing: 1px;
                    }
                    .badge-header span { font-size: 8pt; display: block; opacity: 0.85; margin-top: 1px; }
                    .qr-img { width: 50mm; height: 50mm; margin: 0 auto 3mm; display: block; border: 1px solid #d1fae5; border-radius: 2mm; }
                    .worker-name { font-size: 13pt; font-weight: bold; color: #111827; margin-bottom: 1mm; }
                    .worker-phone { font-size: 9.5pt; color: #6b7280; margin-bottom: 2mm; }
                    .worker-id { font-size: 9pt; color: #6b7280; font-family: monospace; background: #f0fdf4; padding: 1.5mm 3mm; border-radius: 2mm; display: inline-block; margin-bottom: 3mm; }
                    .scan-hint { font-size: 7.5pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 2mm; margin-top: 1mm; }
                    @media print { body { background: white; } }
                </style>
            </head>
            <body>
                <div class="badge">
                    <div class="badge-header">
                        Akazi Rwanda Ltd
                        <span>Akazi Rwanda Ltd</span>
                    </div>
                    <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
                    <div class="worker-name">${workerName}</div>
                    ${qrInfo.phone ? `<div class="worker-phone">${qrInfo.phone}</div>` : ''}
                    <div class="worker-id">ID: ${qrInfo.workerId}</div>
                    <div class="scan-hint">Scan this QR code to check in</div>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-emerald-600" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Worker QR Badge</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center py-10 gap-3">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Generating QR code...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-red-500 text-sm mb-3">{error}</p>
                            <button onClick={fetchQrToken} className="text-sm text-emerald-600 hover:underline">
                                Try again
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Badge Preview */}
                            <div ref={printRef} className="border-2 border-emerald-600 rounded-xl overflow-hidden mb-4">
                                <div className="bg-emerald-700 text-white text-center py-2 px-4">
                                    <p className="font-bold tracking-widest text-sm">Akazi Rwanda Ltd</p>
                                    <p className="text-xs text-emerald-200">Akazi Rwanda Ltd</p>
                                </div>
                                <div className="bg-white p-4 text-center">
                                    {qrDataUrl && (
                                        <img
                                            src={qrDataUrl}
                                            alt="QR Code"
                                            className="w-48 h-48 mx-auto mb-3 rounded-lg border border-emerald-100"
                                        />
                                    )}
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <p className="font-bold text-gray-900 text-base">{workerName}</p>
                                    </div>
                                    {qrInfo?.phone && (
                                        <p className="text-sm text-gray-500 mb-1">{qrInfo.phone}</p>
                                    )}
                                    <p className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1 rounded-md inline-block mb-2">
                                        ID: {qrInfo?.workerId}
                                    </p>
                                    <p className="text-xs text-gray-400 border-t border-gray-100 pt-2 mt-1">
                                        Scan to check in
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download
                                </button>
                                <button
                                    onClick={fetchQrToken}
                                    title="Regenerate QR (resets old code)"
                                    className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                                Worker shows this badge. Supervisor scans it at check-in.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
