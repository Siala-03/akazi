import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface PayrollWorker {
    fullName: string;
    nationalId: string;
    exporterName?: string;
    numberOfDays: number;
    dailyRate: number;
    totalWage: number;
    paid?: boolean;
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

    // ── Payroll Sheet ──
    const headerRows: any[][] = [
        ['AKAZI RWANDA LTD – PAYROLL'],
        [`Period: ${weekLabel}`],
        [`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`],
        [],
        ['Full Name', 'National ID', 'Exporter', 'Days', 'Daily Rate (FRw)', 'Total Wage (FRw)', 'Status'],
    ];

    const dataRows = workers.map(w => [
        w.fullName,
        w.nationalId || '—',
        w.exporterName || '—',
        w.numberOfDays,
        w.dailyRate,
        w.totalWage,
        w.paid ? 'Paid' : 'Pending',
    ]);

    const totalsRow = [
        'TOTAL',
        '',
        '',
        summary.totalDays,
        '',
        summary.totalWorkerWages,
        '',
    ];

    const allRows = [...headerRows, ...dataRows, [], totalsRow];
    const payrollSheet = XLSX.utils.aoa_to_sheet(allRows);
    payrollSheet['!cols'] = [
        { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
    ];
    payrollSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    ];
    XLSX.utils.book_append_sheet(workbook, payrollSheet, 'Payroll');

    // ── Exporter Summary Sheet ──
    const exporterMap = new Map<string, { workers: number; days: number; wages: number }>();
    workers.forEach(w => {
        const name = w.exporterName || 'Unknown';
        const existing = exporterMap.get(name);
        if (existing) {
            existing.workers++;
            existing.days += w.numberOfDays;
            existing.wages += w.totalWage;
        } else {
            exporterMap.set(name, { workers: 1, days: w.numberOfDays, wages: w.totalWage });
        }
    });

    const expRows: any[][] = [
        ['EXPORTER BREAKDOWN'],
        [`Period: ${weekLabel}`],
        [],
        ['Exporter', 'Workers', 'Days', 'Total Wages (FRw)'],
        ...Array.from(exporterMap.entries()).map(([name, d]) => [name, d.workers, d.days, d.wages]),
        [],
        ['TOTAL', summary.totalWorkers, summary.totalDays, summary.totalWorkerWages],
    ];

    const expSheet = XLSX.utils.aoa_to_sheet(expRows);
    expSheet['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 18 }];
    expSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ];
    XLSX.utils.book_append_sheet(workbook, expSheet, 'By Exporter');

    // ── Cost Summary Sheet ──
    const summaryRows: any[][] = [
        ['COST RECONCILIATION'],
        [`Period: ${weekLabel}`],
        [],
        ['Metric', 'Amount (FRw)'],
        ['Total Workers', summary.totalWorkers],
        ['Total Worker-Days', summary.totalDays],
        ['Worker Wages', summary.totalWorkerWages],
        ['Exporter Charges', summary.totalCostToExporters],
        ['Cooperative Margin', summary.cooperativeMargin],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 28 }, { wch: 20 }];
    summarySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Cost Summary');

    const fileName = `payroll_${format(weekStartDate, 'yyyyMMdd')}_${format(weekEndDate, 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
