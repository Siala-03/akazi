import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ExportData } from './index';

export async function exportToExcel(data: ExportData): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const a = data.analytics;

  // ── Summary Sheet ──
  const summaryRows: any[][] = [
    ['Akazi - Exporter Report'],
    [],
    ['Exporter:', data.exporterName],
    ['Code:', data.exporterCode],
    ...(data.dateRange ? [['Period:', `${format(data.dateRange.start, 'dd MMM yyyy')} – ${format(data.dateRange.end, 'dd MMM yyyy')}`]] : []),
    ['Generated:', format(new Date(), 'dd MMM yyyy HH:mm')],
    [],
  ];

  if (a) {
    summaryRows.push(
      ['KEY FIGURES', '', 'ALL-TIME', ''],
      ['Metric', 'Period Value', 'Metric', 'All-Time Value'],
      ['Workers Engaged', a.periodWorkersEngaged || 0, 'All-Time Workers', a.workersEngaged || 0],
      ['Sessions', a.periodSessionsCount || 0, 'All-Time Sessions', a.sessionsCumulativeCount || 0],
      ['Period Days', a.periodDays || 0, '', ''],
      [],
      ['COST SUMMARY'],
      ['Metric', 'Amount (FRw)'],
      ['Period Cost', a.periodCostToExporter || 0],
      ['All-Time Cost', a.cumulativeCost || 0],
    );
    if (a.periodSessionsCount > 0) {
      summaryRows.push(['Avg Cost / Session', Math.round((a.periodCostToExporter || 0) / a.periodSessionsCount)]);
    }
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // ── Daily Breakdown Sheet ──
  if (a?.dailyBreakdown && a.dailyBreakdown.length > 0) {
    const breakdownRows: any[][] = [
      ['Date', 'Sessions', 'Cost (FRw)'],
      ...a.dailyBreakdown.map((r: any) => [
        r.date,
        r.sessions,
        r.costToExporter || 0,
      ]),
    ];

    const totals = a.dailyBreakdown.reduce((acc: any, r: any) => ({
      sessions: acc.sessions + r.sessions,
      cost: acc.cost + (r.costToExporter || 0),
    }), { sessions: 0, cost: 0 });

    breakdownRows.push(['TOTAL', totals.sessions, totals.cost]);

    const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownRows);
    breakdownSheet['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }];
    const range = XLSX.utils.decode_range(breakdownSheet['!ref'] || 'A1');
    breakdownSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Daily Breakdown');
  }

  const fileName = `${data.exporterCode}_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
