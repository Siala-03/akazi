import { exportToPDF } from './pdfExport';
import { exportToExcel } from './excelExport';
import { exportToCSV } from './csvExport';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportData {
  exporterName: string;
  exporterCode: string;
  dateRange?: { start: Date; end: Date };
  bags?: Array<{
    bagNumber: string;
    weight: number;
    date: Date;
    worker?: string;
  }>;
  summary?: {
    totalBags: number;
    totalWeight: number;
    totalWorkers: number;
    averageWeight: number;
  };
  analytics?: {
    periodBags: number;
    periodWeight: number;
    periodWorkersEngaged: number;
    periodSessionsCount: number;
    periodCostToExporter: number;
    periodAvgBagsPerDay: number;
    periodDays: number;
    totalBags: number;
    totalWeight: number;
    workersEngaged: number;
    cumulativeCost: number;
    sessionsCumulativeCount: number;
    dailyBreakdown: Array<{
      date: string;
      sessions: number;
      bags: number;
      weight: number;
      costToExporter: number;
    }>;
    trends?: {
      bags: Array<{ date: string; bags: number; weight: number }>;
    };
  };
}

export async function exportData(
  data: ExportData,
  format: ExportFormat
): Promise<void> {
  try {
    switch (format) {
      case 'pdf':
        await exportToPDF(data);
        break;
      case 'excel':
        await exportToExcel(data);
        break;
      case 'csv':
        await exportToCSV(data);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Failed to export as ${format.toUpperCase()}`);
  }
}

export { exportToPDF, exportToExcel, exportToCSV };
