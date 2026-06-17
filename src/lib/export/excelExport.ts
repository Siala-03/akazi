import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ExportData } from './index';

export async function exportToExcel(data: ExportData): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const a = data.analytics;

  // ── Summary Sheet ──
  const summaryRows: any[][] = [
    ['Akazi Rwanda Ltd - Exporter Report'],
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
      ['Bags Processed', a.periodBags || 0, 'Total Bags', a.totalBags || 0],
      ['Total Weight (kg)', a.periodWeight || 0, 'Total Weight (kg)', a.totalWeight || 0],
      ['Workers Engaged', a.periodWorkersEngaged || 0, 'All-Time Workers', a.workersEngaged || 0],
      ['Sessions', a.periodSessionsCount || 0, 'All-Time Sessions', a.sessionsCumulativeCount || 0],
      ['Avg Bags/Day', a.periodAvgBagsPerDay || 0, 'Period Days', a.periodDays || 0],
      [],
      ['COST SUMMARY'],
      ['Metric', 'Amount (FRw)'],
      ['Period Cost', a.periodCostToExporter || 0],
      ['All-Time Cost', a.cumulativeCost || 0],
    );
    if (a.periodSessionsCount > 0) {
      summaryRows.push(['Avg Cost / Session', Math.round((a.periodCostToExporter || 0) / a.periodSessionsCount)]);
    }
    if (a.periodBags > 0) {
      summaryRows.push(['Cost / Bag', Math.round((a.periodCostToExporter || 0) / a.periodBags)]);
    }
  } else if (data.summary) {
    summaryRows.push(
      ['Summary'],
      ['Metric', 'Value'],
      ['Total Bags', data.summary.totalBags],
      ['Total Weight (kg)', data.summary.totalWeight],
      ['Total Workers', data.summary.totalWorkers],
      ['Average Weight (kg)', data.summary.averageWeight],
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // ── Daily Breakdown Sheet ──
  if (a?.dailyBreakdown && a.dailyBreakdown.length > 0) {
    const breakdownRows: any[][] = [
      ['Date', 'Sessions', 'Bags', 'Weight (kg)', 'Cost (FRw)'],
      ...a.dailyBreakdown.map((r: any) => [
        r.date,
        r.sessions,
        r.bags,
        r.weight || 0,
        r.costToExporter || 0,
      ]),
    ];

    const totals = a.dailyBreakdown.reduce((acc: any, r: any) => ({
      sessions: acc.sessions + r.sessions,
      bags: acc.bags + r.bags,
      weight: acc.weight + (r.weight || 0),
      cost: acc.cost + (r.costToExporter || 0),
    }), { sessions: 0, bags: 0, weight: 0, cost: 0 });

    breakdownRows.push(['TOTAL', totals.sessions, totals.bags, totals.weight, totals.cost]);

    const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownRows);
    breakdownSheet['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
    const range = XLSX.utils.decode_range(breakdownSheet['!ref'] || 'A1');
    breakdownSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Daily Breakdown');
  }

  const fileName = `${data.exporterCode}_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
