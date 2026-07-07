import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ExportData } from './index';

function fmtFRw(n: number): string {
    return `FRw ${n.toLocaleString()}`;
}

export async function exportToPDF(data: ExportData): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const a = data.analytics;

    // ── Header ──
    doc.setFillColor(6, 95, 70);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Akazi', pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Exporter Performance Report', pageWidth / 2, 22, { align: 'center' });

    let y = 40;

    // ── Exporter Info ──
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`Exporter: ${data.exporterName}`, margin, y);
    doc.text(`Code: ${data.exporterCode}`, margin, y + 6);

    if (data.dateRange) {
        doc.text(
            `Period: ${format(data.dateRange.start, 'dd MMM yyyy')} – ${format(data.dateRange.end, 'dd MMM yyyy')}`,
            margin, y + 12
        );
    }
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth - margin, y, { align: 'right' });

    y += 22;

    // ── Key Figures ──
    if (a) {
        doc.setFontSize(12);
        doc.setTextColor(6, 95, 70);
        doc.text('Key Figures', margin, y);
        y += 3;

        const keyFigures = [
            ['Workers Engaged', (a.periodWorkersEngaged || 0).toString(), 'All-Time Workers', (a.workersEngaged || 0).toString()],
            ['Sessions (Worker-Days)', (a.periodSessionsCount || 0).toLocaleString(), 'All-Time Sessions', (a.sessionsCumulativeCount || 0).toLocaleString()],
            ['Period Days', (a.periodDays || 0).toString(), '', ''],
        ];

        autoTable(doc, {
            startY: y,
            head: [['Period Metric', 'Value', 'All-Time Metric', 'Value']],
            body: keyFigures,
            theme: 'grid',
            headStyles: { fillColor: [6, 95, 70], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
            margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Cost Breakdown ──
    if (a) {
        doc.setFontSize(12);
        doc.setTextColor(6, 95, 70);
        doc.text('Cost Summary', margin, y);
        y += 3;

        const costRows = [
            ['Period Cost', fmtFRw(a.periodCostToExporter || 0)],
            ['All-Time Cost', fmtFRw(a.cumulativeCost || 0)],
        ];
        if (a.periodSessionsCount > 0) {
            costRows.push(['Avg Cost / Session', fmtFRw(Math.round((a.periodCostToExporter || 0) / a.periodSessionsCount))]);
        }
        const activeDays = (a.dailyBreakdown || []).filter((d: any) => d.sessions > 0).length;
        if (activeDays > 0) {
            costRows.push(['Avg Daily Spend', fmtFRw(Math.round((a.periodCostToExporter || 0) / activeDays))]);
        }

        autoTable(doc, {
            startY: y,
            head: [['Metric', 'Amount']],
            body: costRows,
            theme: 'grid',
            headStyles: { fillColor: [6, 95, 70], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { fontStyle: 'bold' } },
            margin: { left: margin, right: margin },
            tableWidth: pageWidth / 2 - margin,
        });
        y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ── Daily Breakdown Table ──
    if (a?.dailyBreakdown && a.dailyBreakdown.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setTextColor(6, 95, 70);
        doc.text('Daily Breakdown', margin, y);
        y += 3;

        const breakdownRows = a.dailyBreakdown
            .filter((r: any) => r.sessions > 0)
            .map((r: any) => [
                r.date,
                r.sessions.toString(),
                fmtFRw(r.costToExporter || 0),
            ]);

        if (breakdownRows.length > 0) {
            const totals = a.dailyBreakdown.reduce((acc: any, r: any) => ({
                sessions: acc.sessions + r.sessions,
                cost: acc.cost + (r.costToExporter || 0),
            }), { sessions: 0, cost: 0 });

            breakdownRows.push([
                'TOTAL',
                totals.sessions.toString(),
                fmtFRw(totals.cost),
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Date', 'Sessions', 'Cost (FRw)']],
                body: breakdownRows,
                theme: 'striped',
                headStyles: { fillColor: [6, 95, 70], fontSize: 8 },
                bodyStyles: { fontSize: 7 },
                margin: { left: margin, right: margin },
                didParseCell: (hookData) => {
                    if (hookData.row.index === breakdownRows.length - 1 && hookData.section === 'body') {
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.fillColor = [240, 253, 244];
                    }
                },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // ── Footer ──
    const pageCount = doc.getNumberOfPages();
    const pageH = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Page ${i} of ${pageCount}  ·  Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
            pageWidth / 2,
            pageH - 12,
            { align: 'center' }
        );
        doc.setFontSize(8);
        doc.setTextColor(6, 95, 70);
        doc.text('Akazi by Umucyo Women Cooperative', pageWidth / 2, pageH - 6, { align: 'center' });
    }

    const fileName = `${data.exporterCode}_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    doc.save(fileName);
}
