import QRCode from 'qrcode';

export interface BadgeWorkerInfo {
    workerName: string;
    workerId: string;
    phone?: string;
}

const BADGE_WIDTH = 620;
const BADGE_HEIGHT = 380;

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
    });
}

export async function generateQrDataUrls(qrToken: string): Promise<{ checkinUrl: string; checkoutUrl: string }> {
    const [checkinUrl, checkoutUrl] = await Promise.all([
        QRCode.toDataURL(`AKAZI:CHECKIN:${qrToken}`, {
            width: 240, margin: 2,
            color: { dark: '#065f46', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        }),
        QRCode.toDataURL(`AKAZI:CHECKOUT:${qrToken}`, {
            width: 240, margin: 2,
            color: { dark: '#991b1b', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        }),
    ]);
    return { checkinUrl, checkoutUrl };
}

export async function drawBadgeOnCanvas(
    canvas: HTMLCanvasElement,
    info: BadgeWorkerInfo,
    checkinUrl: string,
    checkoutUrl: string
): Promise<void> {
    const W = BADGE_WIDTH;
    const H = BADGE_HEIGHT;
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
    ctx.fillText(info.workerName, W / 2, 82);

    if (info.phone) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText(info.phone, W / 2, 99);
    }

    const idText = `ID: ${info.workerId}`;
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

    const [ciImg, coImg] = await Promise.all([loadImage(checkinUrl), loadImage(checkoutUrl)]);

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
}

export async function generateBadgeCanvas(info: BadgeWorkerInfo, qrToken: string): Promise<HTMLCanvasElement> {
    const { checkinUrl, checkoutUrl } = await generateQrDataUrls(qrToken);
    const canvas = document.createElement('canvas');
    await drawBadgeOnCanvas(canvas, info, checkinUrl, checkoutUrl);
    return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create badge image'))),
            'image/png'
        );
    });
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
