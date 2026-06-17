import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface PayrollWorker {
    fullName: string;
    nationalId: string;
    numberOfBags: number;
    numberOfDays: number;
    dailyRate: number;
    totalWage: number;
}

export interface PayrollSummary {
    totalWorkers: number;
    totalDays: number;
    totalWorkerWages: number;
    totalCostToExporters: number;
    cooperativeMargin: number;
    weekStart: string;
    weekEnd: string;
}

export function exportPayrollToExcel(workers: PayrollWorker[], summary: PayrollSummary): void {
    const workbook = XLSX.utils.book_new();

    const weekStartDate = new Date(summary.weekStart);
    const weekEndDate = new Date(summary.weekEnd);
    const weekLabel = `${format(weekStartDate, 'dd MMM yyyy')} – ${format(weekEndDate, 'dd MMM yyyy')}`;

    // ── Payroll Sheet ─────────────────────────────────────────────────────────
    const headerRows: any[][] = [
        ['IKAWA RWANDA LTD – WEEKLY WAGE DISBURSEMENT'],
        [`Week: ${weekLabel}`],
        [`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`],
        [],
        ['Full Name', 'National ID', 'Bags Processed', 'Days Worked', 'Daily Rate (FRw)', 'Total Wage (FRw)'],
    ];

    const dataRows = workers.map((w, i) => [
        w.fullName,
        w.nationalId || '—',
        w.numberOfBags,
        w.numberOfDays,
        w.dailyRate,
        w.totalWage,
    ]);

    const totalsRow = [
        'TOTAL',
        '',
        workers.reduce((s, w) => s + w.numberOfBags, 0),
        summary.totalDays,
        '',
        summary.totalWorkerWages,
    ];

    const allRows = [...headerRows, ...dataRows, [], totalsRow];
    const payrollSheet = XLSX.utils.aoa_to_sheet(allRows);

    // Column widths
    payrollSheet['!cols'] = [
        { wch: 28 }, // Full Name
        { wch: 18 }, // National ID
        { wch: 16 }, // Bags
        { wch: 14 }, // Days
        { wch: 18 }, // Daily Rate
        { wch: 18 }, // Total Wage
    ];

    // Merge title cell A1 across all columns
    payrollSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    ];

    XLSX.utils.book_append_sheet(workbook, payrollSheet, 'Payroll');

    // ── Summary Sheet ─────────────────────────────────────────────────────────
    const summaryRows: any[][] = [
        ['PAYROLL SUMMARY'],
        [`Week: ${weekLabel}`],
        [],
        ['Metric', 'Value'],
        ['Total Workers', summary.totalWorkers],
        ['Total Worker-Days', summary.totalDays],
        ['Worker Wages', summary.totalWorkerWages],
        ['Exporter Charges', summary.totalCostToExporters],
        ['Cooperative Margin', summary.cooperativeMargin],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 35 }, { wch: 20 }];
    summarySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const fileName = `payroll_${format(weekStartDate, 'yyyyMMdd')}_${format(weekEndDate, 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
