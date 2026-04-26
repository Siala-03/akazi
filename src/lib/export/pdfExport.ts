import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export async function exportToPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add Header
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('Akazi Rwanda Ltd - Export Report', pageWidth / 2, 20, { align: 'center' });
  
  // Add Exporter Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Exporter: ${data.exporterName}`, 14, 35);
  doc.text(`Code: ${data.exporterCode}`, 14, 42);
  
  if (data.dateRange) {
    doc.text(
      `Period: ${format(data.dateRange.start, 'MMM dd, yyyy')} - ${format(data.dateRange.end, 'MMM dd, yyyy')}`,
      14,
      49
    );
  }
  
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 56);
  
  let yPos = 65;
  
  // Add Summary if available
  if (data.summary) {
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('Summary', 14, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const summaryData = [
      ['Total Bags', data.summary.totalBags.toString()],
      ['Total Weight (kg)', data.summary.totalWeight.toFixed(2)],
      ['Total Workers', data.summary.totalWorkers.toString()],
      ['Average Weight (kg)', data.summary.averageWeight.toFixed(2)],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Add Bags Table if available
  if (data.bags && data.bags.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('Bags Details', 14, yPos);
    
    yPos += 5;
    
    const tableData = data.bags.map((bag) => [
      bag.bagNumber,
      bag.weight.toFixed(2),
      format(new Date(bag.date), 'MMM dd, yyyy'),
      bag.worker || 'N/A',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Bag Number', 'Weight (kg)', 'Date', 'Worker']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Add Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  const fileName = `${data.exporterCode}_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(fileName);
}
