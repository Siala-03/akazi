import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExportData {
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
}

export async function exportToExcel(data: ExportData): Promise<void> {
  const workbook = XLSX.utils.book_new();
  
  // Create Summary Sheet
  if (data.summary) {
    const summaryData = [
      ['Akazi Rwanda Ltd - Export Report'],
      [],
      ['Exporter:', data.exporterName],
      ['Code:', data.exporterCode],
      ...(data.dateRange ? [['Period:', `${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(data.dateRange.end, 'MMM dd, yyyy')}`]] : []),
      ['Generated:', format(new Date(), 'MMM dd, yyyy HH:mm')],
      [],
      ['Summary'],
      ['Metric', 'Value'],
      ['Total Bags', data.summary.totalBags],
      ['Total Weight (kg)', data.summary.totalWeight.toFixed(2)],
      ['Total Workers', data.summary.totalWorkers],
      ['Average Weight (kg)', data.summary.averageWeight.toFixed(2)],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
    
    // Add styling for header
    const range = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!summarySheet[address]) continue;
      summarySheet[address].s = {
        font: { bold: true, sz: 14 },
        fill: { fgColor: { rgb: "2563EB" } },
      };
    }
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }
  
  // Create Bags Details Sheet
  if (data.bags && data.bags.length > 0) {
    const bagsData = [
      ['Bag Number', 'Weight (kg)', 'Date', 'Worker'],
      ...data.bags.map((bag) => [
        bag.bagNumber,
        bag.weight,
        format(new Date(bag.date), 'MMM dd, yyyy'),
        bag.worker || 'N/A',
      ]),
    ];
    
    const bagsSheet = XLSX.utils.aoa_to_sheet(bagsData);
    
    // Set column widths
    bagsSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
    
    // Add auto filter
    const range = XLSX.utils.decode_range(bagsSheet['!ref'] || 'A1');
    bagsSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    
    XLSX.utils.book_append_sheet(workbook, bagsSheet, 'Bags Details');
  }
  
  // Generate filename
  const fileName = `${data.exporterCode}_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  
  // Write file
  XLSX.writeFile(workbook, fileName);
}
