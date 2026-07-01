import { format } from 'date-fns';
import { ExportData } from './index';

export async function exportToCSV(data: ExportData): Promise<void> {
    const a = data.analytics;
    let csv = '';

    csv += `Akazi Rwanda Ltd - Exporter Report\n`;
    csv += `Exporter:,${data.exporterName}\n`;
    csv += `Code:,${data.exporterCode}\n`;
    if (data.dateRange) {
        csv += `Period:,${format(data.dateRange.start, 'dd MMM yyyy')} – ${format(data.dateRange.end, 'dd MMM yyyy')}\n`;
    }
    csv += `Generated:,${format(new Date(), 'dd MMM yyyy HH:mm')}\n`;
    csv += `\n`;

    if (a) {
        csv += `KEY FIGURES\n`;
        csv += `Metric,Period,All-Time\n`;
        csv += `Workers,${a.periodWorkersEngaged},${a.workersEngaged}\n`;
        csv += `Sessions,${a.periodSessionsCount},${a.sessionsCumulativeCount}\n`;
        csv += `\n`;

        csv += `COST SUMMARY\n`;
        csv += `Metric,Amount\n`;
        csv += `Period Cost,${a.periodCostToExporter}\n`;
        csv += `All-Time Cost,${a.cumulativeCost}\n`;
        if (a.periodSessionsCount > 0) {
            csv += `Avg Cost / Session,${Math.round(a.periodCostToExporter / a.periodSessionsCount)}\n`;
        }
        csv += `\n`;

        if (a.dailyBreakdown && a.dailyBreakdown.length > 0) {
            csv += `DAILY BREAKDOWN\n`;
            csv += `Date,Sessions,Cost (FRw)\n`;
            a.dailyBreakdown.forEach((r: any) => {
                csv += `${r.date},${r.sessions},${r.costToExporter || 0}\n`;
            });
        }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${data.exporterCode}_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
