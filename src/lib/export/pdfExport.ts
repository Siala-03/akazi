import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ExportData } from './index';

function fmtFRw(n: number): string {
    return `FRw ${n.toLocaleString()}`;
}

function drawBarChart(doc: jsPDF, data: { label: string; value: number }[], x: number, y: number, width: number, height: number, title: string, color: [number, number, number]) {
    if (data.length === 0) return y;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(title, x, y);
    y += 5;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barWidth = Math.min((width - 10) / data.length, 20);
    const gap = 2;
    const chartStartX = x + 5;
    const chartHeight = height - 15;

    // Y-axis line
    doc.setDrawColor(200, 200, 200);
    doc.line(chartStartX, y, chartStartX, y + chartHeight);
    doc.line(chartStartX, y + chartHeight, chartStartX + data.length * (barWidth + gap), y + chartHeight);

    data.forEach((d, i) => {
        const barH = (d.value / maxVal) * (chartHeight - 5);
        const bx = chartStartX + i * (barWidth + gap) + gap;
        const by = y + chartHeight - barH;

        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(bx, by, barWidth, barH, 'F');

        // Label below
        doc.setFontSize(5);
        doc.setTextColor(100, 100, 100);
        const label = d.label.length > 6 ? d.label.slice(-5) : d.label;
        doc.text(label, bx + barWidth / 2, y + chartHeight + 4, { align: 'center' });

        // Value on top
        if (d.value > 0) {
            doc.setFontSize(5);
            doc.setTextColor(60, 60, 60);
            doc.text(d.value.toString(), bx + barWidth / 2, by - 1, { align: 'center' });
        }
    });

    return y + chartHeight + 10;
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
    doc.text('Akazi Rwanda Ltd', pageWidth / 2, 14, { align: 'center' });
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
            ['Bags Processed', (a.periodBags || 0).toLocaleString(), 'All-Time Bags', (a.totalBags || 0).toLocaleString()],
            ['Total Weight', `${(a.periodWeight || 0).toLocaleString()} kg`, 'All-Time Weight', `${(a.totalWeight || 0).toLocaleString()} kg`],
            ['Workers Engaged', (a.periodWorkersEngaged || 0).toString(), 'All-Time Workers', (a.workersEngaged || 0).toString()],
            ['Sessions (Worker-Days)', (a.periodSessionsCount || 0).toLocaleString(), 'All-Time Sessions', (a.sessionsCumulativeCount || 0).toLocaleString()],
            ['Avg Bags / Day', (a.periodAvgBagsPerDay || 0).toString(), 'Avg Bag Weight', a.periodBags > 0 ? `${(a.periodWeight / a.periodBags).toFixed(1)} kg` : '—'],
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
        if (a.periodBags > 0) {
            costRows.push(['Cost / Bag', fmtFRw(Math.round((a.periodCostToExporter || 0) / a.periodBags))]);
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
            .filter((r: any) => r.sessions > 0 || r.bags > 0)
            .map((r: any) => [
                r.date,
                r.sessions.toString(),
                r.bags.toString(),
                `${Number(r.weight || 0).toLocaleString()} kg`,
                fmtFRw(r.costToExporter || 0),
            ]);

        if (breakdownRows.length > 0) {
            // Totals row
            const totals = a.dailyBreakdown.reduce((acc: any, r: any) => ({
                sessions: acc.sessions + r.sessions,
                bags: acc.bags + r.bags,
                weight: acc.weight + (r.weight || 0),
                cost: acc.cost + (r.costToExporter || 0),
            }), { sessions: 0, bags: 0, weight: 0, cost: 0 });

            breakdownRows.push([
                'TOTAL',
                totals.sessions.toString(),
                totals.bags.toString(),
                `${totals.weight.toLocaleString()} kg`,
                fmtFRw(totals.cost),
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Date', 'Sessions', 'Bags', 'Weight', 'Cost (FRw)']],
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

    // ── Trend Charts (after tables) ──
    if (a?.trends?.bags && a.trends.bags.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }

        doc.setFontSize(12);
        doc.setTextColor(6, 95, 70);
        doc.text('7-Day Trends', margin, y);
        y += 6;

        const trendData = a.trends.bags;
        const halfW = (pageWidth - margin * 3) / 2;

        y = drawBarChart(doc, trendData.map(d => ({ label: d.date, value: d.bags })), margin, y, halfW, 50, 'Bags per Day', [59, 130, 246]);
        const chartY = y - 50 - 10 + 6;
        drawBarChart(doc, trendData.map(d => ({ label: d.date, value: Math.round(d.weight) })), margin + halfW + margin, chartY, halfW, 50, 'Weight per Day (kg)', [16, 185, 129]);
        y = Math.max(y, chartY + 60);
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
        doc.text('Akazi Rwanda Ltd by Umucyo Women Cooperative', pageWidth / 2, pageH - 6, { align: 'center' });
    }

    const fileName = `${data.exporterCode}_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    doc.save(fileName);
}
