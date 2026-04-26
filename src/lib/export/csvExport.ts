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

export async function exportToCSV(data: ExportData): Promise<void> {
  let csvContent = '';
  
  // Add Header Info
  csvContent += `Akazi Rwanda Ltd - Export Report\n`;
  csvContent += `Exporter:,${data.exporterName}\n`;
  csvContent += `Code:,${data.exporterCode}\n`;
  
  if (data.dateRange) {
    csvContent += `Period:,${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(data.dateRange.end, 'MMM dd, yyyy')}\n`;
  }
  
  csvContent += `Generated:,${format(new Date(), 'MMM dd, yyyy HH:mm')}\n`;
  csvContent += `\n`;
  
  // Add Summary
  if (data.summary) {
    csvContent += `Summary\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Bags,${data.summary.totalBags}\n`;
    csvContent += `Total Weight (kg),${data.summary.totalWeight.toFixed(2)}\n`;
    csvContent += `Total Workers,${data.summary.totalWorkers}\n`;
    csvContent += `Average Weight (kg),${data.summary.averageWeight.toFixed(2)}\n`;
    csvContent += `\n`;
  }
  
  // Add Bags Details
  if (data.bags && data.bags.length > 0) {
    csvContent += `Bags Details\n`;
    csvContent += `Bag Number,Weight (kg),Date,Worker\n`;
    
    data.bags.forEach((bag) => {
      const bagDate = format(new Date(bag.date), 'MMM dd, yyyy');
      const worker = bag.worker || 'N/A';
      csvContent += `${bag.bagNumber},${bag.weight.toFixed(2)},${bagDate},${worker}\n`;
    });
  }
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const fileName = `${data.exporterCode}_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
