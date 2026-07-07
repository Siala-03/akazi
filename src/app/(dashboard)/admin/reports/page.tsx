'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  ArrowUpDown,
  Users,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  Eye,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { formatExporterIdentifier, formatSessionReference } from '@/lib/utils';

interface ExporterReport {
  exporterId: string;
  exporterName: string;
  bagsSorted: number;
  workersInvolved: number;
  totalLaborCost: number;
  avgWorkersPerBag: number;
  dateRange: string;
}

interface WorkerReport {
  workerId: string;
  workerName: string;
  sessionCount: number;
  daysWorked: number;
  exportersServed: string[];
  bagsContributed: number;
  totalEarnings: number;
  avgBagsPerDay: number;
}

interface DailyOperation {
  date: string;
  workersOnSite: number;
  activeSessions: number;
  bagsCompleted: number;
  exportersActive: string[];
  totalLaborCost: number;
}

interface AuditTrail {
  date: string;
  workerId: string;
  workerName: string;
  exporterId: string;
  exporterName: string;
  bagId: string;
  sessionId: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
}

type TabType = 'exporter' | 'worker' | 'daily' | 'audit';

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('exporter');
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Data
  const [exporterReports, setExporterReports] = useState<ExporterReport[]>([]);
  const [workerReports, setWorkerReports] = useState<WorkerReport[]>([]);
  const [dailyOperations, setDailyOperations] = useState<DailyOperation[]>([]);
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);

  const getId = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || value.id || '';
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      switch (activeTab) {
        case 'exporter':
          await loadExporterReports(params);
          break;
        case 'worker':
          await loadWorkerReports(params);
          break;
        case 'daily':
          await loadDailyOperations(params);
          break;
        case 'audit':
          await loadAuditTrail(params);
          break;
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const loadExporterReports = async (params: URLSearchParams) => {
    try {
      // Fetch exporters, bags, and settings from real API
      const [exportersRes, bagsRes, sessionsRes, settingsRes] = await Promise.all([
        fetch('/api/exporters?all=true'),
        fetch(`/api/bags?${params.toString()}`),
        fetch(`/api/sessions?all=true&${params.toString()}`),
        fetch('/api/admin/settings')
      ]);

      const exportersData = await exportersRes.json();
      const bagsData = await bagsRes.json();
      const sessionsData = await sessionsRes.json();
      const settingsData = await settingsRes.json();

      const exporters = exportersData.exporters || [];
      const bags = bagsData.bags || [];
      const sessions = sessionsData.sessions || [];
      const workerDailyWage = settingsData.settings?.workerDailyWage || 0;

      const exporterById = new Map<string, any>();
      exporters.forEach((exp: any) => {
        const id = getId(exp);
        if (id) exporterById.set(id, exp);
      });

      // Include exporters that appear in bags/sessions even if they are not in the exporters list.
      bags.forEach((bag: any) => {
        const id = getId(bag.exporterId);
        if (id && !exporterById.has(id)) exporterById.set(id, bag.exporterId);
      });
      sessions.forEach((session: any) => {
        const id = getId(session.exporterId);
        if (id && !exporterById.has(id)) exporterById.set(id, session.exporterId);
      });

      // Calculate report for each exporter
      const reports: ExporterReport[] = Array.from(exporterById.values()).map((exporter: any) => {
        const exporterIdValue = getId(exporter);

        // Filter bags for this exporter
        const exporterBags = bags.filter((bag: any) => 
          getId(bag.exporterId) === exporterIdValue
        );

        // Calculate unique workers involved
        const workerIds = new Set();
        exporterBags.forEach((bag: any) => {
          bag.workers?.forEach((w: any) => {
            const wid = getId(w.workerId);
            if (wid) workerIds.add(wid);
          });
        });

        if (workerIds.size === 0) {
          sessions.forEach((session: any) => {
            if (getId(session.exporterId) === exporterIdValue) {
              const wid = getId(session.workerId);
              if (wid) workerIds.add(wid);
            }
          });
        }

        // Calculate average workers per bag
        const totalWorkers = exporterBags.reduce((sum: number, bag: any) => 
          sum + (bag.workers?.length || 0), 0
        );
        const avgWorkersPerBag = exporterBags.length > 0 
          ? Number((totalWorkers / exporterBags.length).toFixed(1))
          : 0;

        const exporterSessions = sessions.filter((session: any) =>
          getId(session.exporterId) === exporterIdValue
        );
        const laborCost = exporterSessions.length * workerDailyWage;

        return {
          exporterId: formatExporterIdentifier(exporter),
          exporterName: exporter.companyTradingName || 'Unknown',
          bagsSorted: exporterBags.length,
          workersInvolved: workerIds.size,
          totalLaborCost: laborCost,
          avgWorkersPerBag,
          dateRange: startDate && endDate 
            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : 'All time'
        };
      });

      setExporterReports(reports);
    } catch (error) {
      console.error('Error loading exporter reports:', error);
      toast.error('Failed to load exporter reports');
    }
  };

  const loadWorkerReports = async (params: URLSearchParams) => {
    try {
      // Fetch workers, bags, attendance, sessions, and settings from real API
      const attendanceParams = new URLSearchParams();
      if (params.get('startDate')) attendanceParams.set('startDate', params.get('startDate')!);
      if (params.get('endDate')) attendanceParams.set('endDate', params.get('endDate')!);
      const attendanceQuery = attendanceParams.toString();
      const [workersRes, bagsRes, attendanceRes, sessionsRes, settingsRes] = await Promise.all([
        fetch('/api/workers'),
        fetch(`/api/bags?${params.toString()}`),
        fetch(`/api/attendance/checkin${attendanceQuery ? `?${attendanceQuery}` : ''}`),
        fetch(`/api/sessions?all=true&${params.toString()}`),
        fetch('/api/admin/settings')
      ]);

      const workersData = await workersRes.json();
      const bagsData = await bagsRes.json();
      const attendanceData = await attendanceRes.json();
      const sessionsData = await sessionsRes.json();
      const settingsData = await settingsRes.json();

      const workers = workersData.workers || [];
      const bags = bagsData.bags || [];
      const attendance = attendanceData.attendance || [];
      const sessions = sessionsData.sessions || [];
      const workerDailyWage = settingsData.settings?.workerDailyWage || 0;

      const exporterNameById = new Map<string, string>();
      bags.forEach((bag: any) => {
        const exporterId = getId(bag.exporterId);
        const name = bag.exporterId?.companyTradingName;
        if (exporterId && name) exporterNameById.set(exporterId, name);
      });
      sessions.forEach((session: any) => {
        const exporterId = getId(session.exporterId);
        const name = session.exporterId?.companyTradingName;
        if (exporterId && name) exporterNameById.set(exporterId, name);
      });

      // Calculate report for each worker
      const reports: WorkerReport[] = workers.map((worker: any) => {
        const workerIdValue = getId(worker);

        // Find all bags this worker participated in
        const workerBags = bags.filter((bag: any) => 
          bag.workers?.some((w: any) => 
            getId(w.workerId) === workerIdValue
          )
        );

        // Get unique exporters this worker has worked with
        const exporterIds = new Set();
        const exporterNames: string[] = [];
        workerBags.forEach((bag: any) => {
          const exporterId = getId(bag.exporterId);
          if (!exporterIds.has(exporterId)) {
            exporterIds.add(exporterId);
            exporterNames.push(bag.exporterId?.companyTradingName || 'Unknown');
          }
        });

        const workerSessions = sessions.filter((session: any) =>
          getId(session.workerId) === workerIdValue
        );

        workerSessions.forEach((session: any) => {
          const exporterId = getId(session.exporterId);
          if (!exporterId || exporterIds.has(exporterId)) return;
          exporterIds.add(exporterId);
          exporterNames.push(
            session.exporterId?.companyTradingName || exporterNameById.get(exporterId) || 'Unknown'
          );
        });

        // Count days worked (unique dates in attendance)
        const workerAttendance = attendance.filter((att: any) => 
          getId(att.workerId) === workerIdValue
        );
        const attendanceDates = new Set(
          workerAttendance.map((att: any) => 
            new Date(att.date).toDateString()
          )
        );

        const sessionDates = new Set(
          workerSessions.map((session: any) =>
            new Date(session.date || session.startTime).toDateString()
          )
        );

        const uniqueDates = new Set([...attendanceDates, ...sessionDates]);

        // Calculate earnings from number of sessions × admin-configured daily wage
        const totalEarnings = workerSessions.length * workerDailyWage;

        // Calculate average bags per day
        const avgBagsPerDay = uniqueDates.size > 0 
          ? Number((workerBags.length / uniqueDates.size).toFixed(1))
          : 0;

        return {
          workerId: worker.workerId,
          workerName: worker.fullName,
          sessionCount: workerSessions.length,
          daysWorked: uniqueDates.size,
          exportersServed: exporterNames,
          bagsContributed: workerBags.length,
          totalEarnings,
          avgBagsPerDay
        };
      });

      // Filter out workers with no activity if date range is set
      const filteredReports = reports.filter(r => !startDate || r.sessionCount > 0);

      setWorkerReports(filteredReports);
    } catch (error) {
      console.error('Error loading worker reports:', error);
      toast.error('Failed to load worker reports');
    }
  };

  const loadDailyOperations = async (params: URLSearchParams) => {
    try {
      // Fetch data from real APIs
      const dateQuery = params.toString();
      const [attendanceRes, sessionsRes, bagsRes, exportersRes, settingsRes] = await Promise.all([
        fetch(`/api/attendance/checkin${dateQuery ? `?${dateQuery}` : ''}`),
        fetch(`/api/sessions?all=true${dateQuery ? `&${dateQuery}` : ''}`),
        fetch(`/api/bags${dateQuery ? `?${dateQuery}` : ''}`),
        fetch('/api/exporters?all=true'),
        fetch('/api/admin/settings')
      ]);

      const attendanceData = await attendanceRes.json();
      const sessionsData = await sessionsRes.json();
      const bagsData = await bagsRes.json();
      const exportersData = await exportersRes.json();
      const settingsData = await settingsRes.json();

      const attendance = attendanceData.attendance || [];
      const sessions = sessionsData.sessions || [];
      const allBags = bagsData.bags || [];
      const exporters = exportersData.exporters || [];
      const workerDailyWage = settingsData.settings?.workerDailyWage || 0;

      // Group data by date
      const dateMap = new Map<string, { date: string; workerIds: Set<string>; activeSessions: number; bagsCompleted: number; exporterIds: Set<string>; totalLaborCost: number }>();

      const ensureDay = (dateKey: string) => {
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: dateKey,
            workerIds: new Set<string>(),
            activeSessions: 0,
            bagsCompleted: 0,
            exporterIds: new Set<string>(),
            totalLaborCost: 0
          });
        }
        return dateMap.get(dateKey)!;
      };

      // Process attendance
      attendance.forEach((att: any) => {
        const dateKey = new Date(att.date).toISOString().split('T')[0];
        const day = ensureDay(dateKey);
        const workerId = att.workerId?._id || att.workerId;
        if (workerId) day.workerIds.add(workerId);
      });

      // Process sessions
      sessions.forEach((session: any) => {
        const dateKey = new Date(session.date).toISOString().split('T')[0];
        const day = ensureDay(dateKey);
        day.activeSessions++;
        const exporterId = getId(session.exporterId);
        if (exporterId) day.exporterIds.add(exporterId);
        day.totalLaborCost += workerDailyWage;
      });

      // Process bags
      allBags.forEach((bag: any) => {
        const bagDate = bag.completedAt || bag.date;
        const dateKey = new Date(bagDate).toISOString().split('T')[0];
        const day = ensureDay(dateKey);
        day.bagsCompleted++;
      });

      // Convert map to array and add exporter names
      const operations: DailyOperation[] = Array.from(dateMap.values())
        .map((day: any) => {
          const activeExporterNames = Array.from(day.exporterIds)
            .map((id: any) => {
              const exporter = exporters.find((e: any) => getId(e) === id);
              return exporter?.companyTradingName || 'Unknown';
            });

          return {
            date: day.date,
            workersOnSite: day.workerIds.size,
            activeSessions: day.activeSessions,
            bagsCompleted: day.bagsCompleted,
            exportersActive: activeExporterNames,
            totalLaborCost: day.totalLaborCost
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setDailyOperations(operations);
    } catch (error) {
      console.error('Error loading daily operations:', error);
      toast.error('Failed to load daily operations');
    }
  };

  const loadAuditTrail = async (params: URLSearchParams) => {
    try {
      // Fetch all related data from real APIs
      const dateQuery = params.toString();
      const attendanceQuery = dateQuery || `startDate=2000-01-01&endDate=${new Date().toISOString().split('T')[0]}`;
      const [bagsRes, attendanceRes, sessionsRes] = await Promise.all([
        fetch(`/api/bags${dateQuery ? `?${dateQuery}` : ''}`),
        fetch(`/api/attendance/checkin?${attendanceQuery}`),
        fetch(`/api/sessions?all=true&${params.toString()}`)
      ]);

      const bagsData = await bagsRes.json();
      const attendanceData = await attendanceRes.json();
      const sessionsData = await sessionsRes.json();

      const bags = bagsData.bags || [];
      const attendance = attendanceData.attendance || [];
      const sessions = sessionsData.sessions || [];

      // Build audit trail from bags (each bag entry shows worker-exporter-bag linkage)
      const trails: AuditTrail[] = [];

      bags.forEach((bag: any) => {
        // For each worker in the bag, create an audit entry
        bag.workers?.forEach((bagWorker: any) => {
          const worker = bagWorker.workerId;
          const exporter = bag.exporterId;
          
          // Find the session for this worker
          const session = sessions.find((s: any) => 
            s._id === bagWorker.sessionId || 
            (getId(s.workerId) === getId(worker) &&
             getId(s.exporterId) === getId(exporter))
          );

          // Find attendance record
          const workerAttendance = attendance.find((att: any) => 
            att._id === session?.attendanceId ||
            getId(att.workerId) === getId(worker)
          );

          trails.push({
            date: new Date(bag.date || bag.createdAt).toISOString().split('T')[0],
            workerId: worker?.workerId || 'N/A',
            workerName: worker?.fullName || 'Unknown Worker',
            exporterId: formatExporterIdentifier(exporter),
            exporterName: exporter?.companyTradingName || 'Unknown Exporter',
            bagId: bag.bagNumber || bag._id,
            sessionId: formatSessionReference(
              exporter?.companyTradingName,
              session?.startTime || session?.date || bag.date || bag.createdAt
            ),
            checkInTime: workerAttendance?.checkInTime 
              ? new Date(workerAttendance.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : 'N/A',
            checkOutTime: workerAttendance?.checkOutTime 
              ? new Date(workerAttendance.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : session?.status === 'active' ? 'Active' : 'N/A',
            status: bag.status || 'completed'
          });
        });
      });

      // Sort by date descending
      trails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (trails.length === 0 && sessions.length > 0) {
        sessions.forEach((session: any) => {
          const exporter = session.exporterId;
          const worker = session.workerId;
          const workerAttendance = attendance.find((att: any) => att._id === session.attendanceId);

          trails.push({
            date: new Date(session.date || session.startTime).toISOString().split('T')[0],
            workerId: worker?.workerId || 'N/A',
            workerName: worker?.fullName || 'Unknown Worker',
            exporterId: formatExporterIdentifier(exporter),
            exporterName: exporter?.companyTradingName || 'Unknown Exporter',
            bagId: 'N/A',
            sessionId: formatSessionReference(
              exporter?.companyTradingName,
              session?.startTime || session?.date
            ),
            checkInTime: workerAttendance?.checkInTime
              ? new Date(workerAttendance.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : 'N/A',
            checkOutTime: workerAttendance?.checkOutTime
              ? new Date(workerAttendance.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : session?.status === 'active' ? 'Active' : 'N/A',
            status: session?.status || 'active',
          });
        });

        trails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      setAuditTrails(trails);
    } catch (error) {
      console.error('Error loading audit trail:', error);
      toast.error('Failed to load audit trail');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    switch (activeTab) {
      case 'exporter':
        csvContent = 'Exporter TIN / Business Reg No,Exporter Name,Bags Sorted,Workers Involved,Total Labor Cost,Avg Workers/Bag\n';
        exporterReports.forEach(row => {
          csvContent += `${row.exporterId},${row.exporterName},${row.bagsSorted},${row.workersInvolved},${row.totalLaborCost},${row.avgWorkersPerBag}\n`;
        });
        filename = 'exporter-report.csv';
        break;
      case 'worker':
        csvContent = 'Worker ID,Worker Name,Days Worked,Exporters Served,Bags Contributed,Total Earnings,Avg Bags/Day\n';
        workerReports.forEach(row => {
          csvContent += `${row.workerId},${row.workerName},${row.daysWorked},"${row.exportersServed.join('; ')}",${row.bagsContributed},${row.totalEarnings},${row.avgBagsPerDay}\n`;
        });
        filename = 'worker-report.csv';
        break;
      case 'daily':
        csvContent = 'Date,Workers On Site,Active Sessions,Bags Completed,Exporters Active,Total Labor Cost\n';
        dailyOperations.forEach(row => {
          csvContent += `${row.date},${row.workersOnSite},${row.activeSessions},${row.bagsCompleted},"${row.exportersActive.join('; ')}",${row.totalLaborCost}\n`;
        });
        filename = 'daily-operations.csv';
        break;
      case 'audit':
        csvContent = 'Date,Worker ID,Worker Name,Exporter TIN / Business Reg No,Exporter Name,Bag ID,Session Ref,Check In,Check Out,Status\n';
        auditTrails.forEach(row => {
          csvContent += `${row.date},${row.workerId},${row.workerName},${row.exporterId},${row.exporterName},${row.bagId},${row.sessionId},${row.checkInTime},${row.checkOutTime},${row.status}\n`;
        });
        filename = 'audit-trail.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success('Report exported to CSV');
  };

  const exportToPDF = () => {
    const tabLabels: Record<TabType, string> = {
      exporter: 'Exporter Report',
      worker: 'Worker Report',
      daily: 'Daily Operations Report',
      audit: 'Audit Trail Report',
    };

    const dateRangeLabel = startDate && endDate
      ? `${format(new Date(startDate), 'dd MMM yyyy')} – ${format(new Date(endDate), 'dd MMM yyyy')}`
      : 'All Time';

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    // ── Header ──
    doc.setFillColor(6, 95, 70);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Akazi', margin, 12);
    doc.setFontSize(10);
    doc.text(tabLabels[activeTab], margin, 20);
    doc.setFontSize(8);
    doc.text(`Period: ${dateRangeLabel}`, pageWidth - margin, 12, { align: 'right' });
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth - margin, 19, { align: 'right' });

    let y = 36;
    const cellCenter = { halign: 'center' as const };

    // ── Summary bar chart helper ──
    const drawSummaryBar = (items: { label: string; value: number }[], title: string, color: [number, number, number]) => {
      if (items.length === 0 || items.every(i => i.value === 0)) return;
      if (y > pageH - 80) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setTextColor(6, 95, 70);
      doc.text(title, margin, y);
      y += 5;
      const maxVal = Math.max(...items.map(i => i.value), 1);
      const barW = Math.min((pageWidth - margin * 2 - 10) / items.length, 28);
      const gap = 2;
      const chartH = 35;
      items.forEach((item, i) => {
        const bh = (item.value / maxVal) * (chartH - 8);
        const bx = margin + 5 + i * (barW + gap);
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(bx, y + chartH - bh, barW, bh, 'F');
        doc.setFontSize(5);
        doc.setTextColor(60, 60, 60);
        if (item.value > 0) doc.text(item.value.toLocaleString(), bx + barW / 2, y + chartH - bh - 1, { align: 'center' });
        doc.setTextColor(100, 100, 100);
        const lbl = item.label.length > 12 ? item.label.slice(0, 11) + '…' : item.label;
        doc.text(lbl, bx + barW / 2, y + chartH + 4, { align: 'center' });
      });
      y += chartH + 10;
    };

    if (activeTab === 'exporter') {
      // Summary stats first
      const totBags = filteredExporterReports.reduce((s, r) => s + r.bagsSorted, 0);
      const totWorkers = filteredExporterReports.reduce((s, r) => s + r.workersInvolved, 0);
      const totCost = filteredExporterReports.reduce((s, r) => s + r.totalLaborCost, 0);
      autoTable(doc, {
        startY: y,
        head: [['Total Exporters', 'Total Bags', 'Total Workers', 'Total Labor Cost']],
        body: [[filteredExporterReports.length.toString(), totBags.toLocaleString(), totWorkers.toLocaleString(), `FRw ${totCost.toLocaleString()}`]],
        theme: 'grid',
        headStyles: { fillColor: [6, 95, 70], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 9, halign: 'center', fontStyle: 'bold' },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Detail table
      const rows = filteredExporterReports.map(r => [r.exporterId, r.exporterName, r.bagsSorted.toLocaleString(), r.workersInvolved.toLocaleString(), `FRw ${r.totalLaborCost.toLocaleString()}`, r.avgWorkersPerBag.toString()]);
      rows.push(['TOTAL', '', totBags.toLocaleString(), totWorkers.toLocaleString(), `FRw ${totCost.toLocaleString()}`, '']);
      autoTable(doc, {
        startY: y,
        head: [['TIN / Reg', 'Exporter Name', 'Bags', 'Workers', 'Labor Cost', 'Avg/Bag']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [6, 95, 70], fontSize: 7, halign: 'center' },
        bodyStyles: { fontSize: 7, halign: 'center' },
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } },
        margin: { left: margin, right: margin },
        didParseCell: (d) => { if (d.row.index === rows.length - 1 && d.section === 'body') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [240, 253, 244]; } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // Chart at the bottom
      const top = filteredExporterReports.slice(0, 15);
      drawSummaryBar(top.map(r => ({ label: r.exporterName, value: r.bagsSorted })), 'Bags by Exporter', [59, 130, 246]);

    } else if (activeTab === 'worker') {
      const totDays = filteredWorkerReports.reduce((s, r) => s + r.daysWorked, 0);
      const totBags = filteredWorkerReports.reduce((s, r) => s + r.bagsContributed, 0);
      const totEarn = filteredWorkerReports.reduce((s, r) => s + r.totalEarnings, 0);
      autoTable(doc, {
        startY: y,
        head: [['Total Workers', 'Total Days', 'Total Bags', 'Total Earnings']],
        body: [[filteredWorkerReports.length.toString(), totDays.toLocaleString(), totBags.toLocaleString(), `FRw ${totEarn.toLocaleString()}`]],
        theme: 'grid',
        headStyles: { fillColor: [6, 95, 70], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 9, halign: 'center', fontStyle: 'bold' },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      const rows = filteredWorkerReports.map(r => [r.workerName, r.workerId, r.daysWorked.toString(), r.bagsContributed.toLocaleString(), `FRw ${r.totalEarnings.toLocaleString()}`, r.avgBagsPerDay.toString()]);
      rows.push(['TOTAL', '', totDays.toLocaleString(), totBags.toLocaleString(), `FRw ${totEarn.toLocaleString()}`, '']);
      autoTable(doc, {
        startY: y,
        head: [['Worker', 'ID', 'Days', 'Bags', 'Earnings', 'Avg/Day']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [6, 95, 70], fontSize: 7, halign: 'center' },
        bodyStyles: { fontSize: 7, halign: 'center' },
        columnStyles: { 0: { halign: 'left' } },
        margin: { left: margin, right: margin },
        didParseCell: (d) => { if (d.row.index === rows.length - 1 && d.section === 'body') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [240, 253, 244]; } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // Chart after the table
      const top = filteredWorkerReports.filter(r => r.bagsContributed > 0).sort((a, b) => b.bagsContributed - a.bagsContributed).slice(0, 15);
      drawSummaryBar(top.map(r => ({ label: r.workerName, value: r.bagsContributed })), 'Top Workers by Bags', [139, 92, 246]);

    } else if (activeTab === 'daily') {
      const totW = filteredDailyOperations.reduce((s, r) => s + r.workersOnSite, 0);
      const totS = filteredDailyOperations.reduce((s, r) => s + r.activeSessions, 0);
      const totB = filteredDailyOperations.reduce((s, r) => s + r.bagsCompleted, 0);
      const totC = filteredDailyOperations.reduce((s, r) => s + r.totalLaborCost, 0);

      const rows = filteredDailyOperations.map(r => [
        format(new Date(r.date), 'dd MMM yyyy'), r.workersOnSite.toString(), r.activeSessions.toString(),
        r.bagsCompleted.toLocaleString(), r.exportersActive.join(', ') || '—', `FRw ${r.totalLaborCost.toLocaleString()}`
      ]);
      rows.push(['TOTAL', totW.toString(), totS.toString(), totB.toLocaleString(), '—', `FRw ${totC.toLocaleString()}`]);
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Workers', 'Sessions', 'Bags', 'Exporters', 'Labor Cost']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [6, 95, 70], fontSize: 7, halign: 'center' },
        bodyStyles: { fontSize: 7, halign: 'center' },
        columnStyles: { 4: { halign: 'left' } },
        margin: { left: margin, right: margin },
        didParseCell: (d) => { if (d.row.index === rows.length - 1 && d.section === 'body') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [240, 253, 244]; } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // Charts after the table
      const sorted = [...filteredDailyOperations].sort((a, b) => a.date.localeCompare(b.date));
      drawSummaryBar(sorted.slice(-20).map(r => ({ label: r.date.slice(5), value: r.bagsCompleted })), 'Bags Completed per Day', [16, 185, 129]);
      drawSummaryBar(sorted.slice(-20).map(r => ({ label: r.date.slice(5), value: r.activeSessions })), 'Sessions per Day', [59, 130, 246]);

    } else {
      const rows = filteredAuditTrails.map(r => [
        format(new Date(r.date), 'dd MMM'), r.workerName, r.workerId, r.exporterName,
        r.bagId, r.checkInTime, r.checkOutTime, r.status
      ]);
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Worker', 'ID', 'Exporter', 'Bag', 'In', 'Out', 'Status']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [6, 95, 70], fontSize: 7, halign: 'center' },
        bodyStyles: { fontSize: 6, halign: 'center' },
        columnStyles: { 1: { halign: 'left' }, 3: { halign: 'left' } },
        margin: { left: margin, right: margin },
      });
    }

    // ── Footer ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}  ·  ${format(new Date(), 'dd MMM yyyy HH:mm')}`, pageWidth / 2, pageH - 12, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(6, 95, 70);
      doc.text('Akazi by Umucyo Women Cooperative', pageWidth / 2, pageH - 6, { align: 'center' });
    }

    doc.save(`akazi_${activeTab}_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    toast.success(`${tabLabels[activeTab]} downloaded`);
  };

  const filteredExporterReports = exporterReports.filter(report =>
    report.exporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.exporterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWorkerReports = workerReports.filter(report =>
    report.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.workerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDailyOperations = dailyOperations.filter(op =>
    op.date.includes(searchTerm)
  );

  const filteredAuditTrails = auditTrails.filter(trail =>
    trail.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trail.exporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trail.bagId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={TrendingUp}
          iconBg="bg-transparent"
          title="Reports & Analytics"
          subtitle="Comprehensive operational reports and audit trails"
          action={
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                <FileDown className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          }
        />

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, or date..."
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px min-w-max">
              <button
                onClick={() => setActiveTab('exporter')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
                  activeTab === 'exporter'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Exporter Reports</span>
                <span className="sm:hidden">Exporters</span>
              </button>
              <button
                onClick={() => setActiveTab('worker')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
                  activeTab === 'worker'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Worker Reports</span>
                <span className="sm:hidden">Workers</span>
              </button>
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
                  activeTab === 'daily'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Daily Operations</span>
                <span className="sm:hidden">Daily</span>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
                  activeTab === 'audit'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Audit Trail</span>
                <span className="sm:hidden">Audit</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12 min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <>
                {/* Exporter Reports Table */}
                {activeTab === 'exporter' && (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th 
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]"
                                onClick={() => handleSort('exporterId')}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="hidden sm:inline">Business Reg / TIN</span>
                                  <span className="sm:hidden">TIN</span>
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th 
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[150px]"
                                onClick={() => handleSort('exporterName')}
                              >
                                <div className="flex items-center gap-1">
                                  Name
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th 
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[100px]"
                                onClick={() => handleSort('bagsSorted')}
                              >
                                <div className="flex items-center gap-1">
                                  Bags
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                Workers
                              </th>
                              <th 
                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]"
                                onClick={() => handleSort('totalLaborCost')}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="hidden lg:inline">Labor Cost (RWF)</span>
                                  <span className="lg:hidden">Cost</span>
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                <span className="hidden lg:inline">Avg Workers/Bag</span>
                                <span className="lg:hidden">Avg/Bag</span>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                Period
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredExporterReports.map((report) => (
                              <tr key={report.exporterId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                  {report.exporterId}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  {report.exporterName}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    {report.bagsSorted.toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {report.workersInvolved}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                                  {report.totalLaborCost.toLocaleString()}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  {report.avgWorkersPerBag.toFixed(1)}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                  {report.dateRange}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {filteredExporterReports.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No exporter reports found
                      </div>
                    )}
                  </div>
                )}

                {/* Worker Reports Table */}
                {activeTab === 'worker' && (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]">
                                <div className="flex items-center gap-1">
                                  <span className="hidden sm:inline">Worker ID</span>
                                  <span className="sm:hidden">ID</span>
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                Name
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[100px]">
                                <div className="flex items-center gap-1">
                                  Days
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                <span className="hidden lg:inline">Exporters Served</span>
                                <span className="lg:hidden">Exporters</span>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[100px]">
                                <div className="flex items-center gap-1">
                                  Bags
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]">
                                <div className="flex items-center gap-1">
                                  <span className="hidden lg:inline">Earnings (RWF)</span>
                                  <span className="lg:hidden">Earnings</span>
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                <span className="hidden lg:inline">Avg Bags/Day</span>
                                <span className="lg:hidden">Avg/Day</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredWorkerReports.map((report) => (
                              <tr key={report.workerId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                  {report.workerId}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  {report.workerName}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {report.daysWorked}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">
                                  <div className="flex flex-wrap gap-1">
                                    {report.exportersServed.map((exp, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {exp}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    {report.bagsContributed}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                                  {report.totalEarnings.toLocaleString()}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  {report.avgBagsPerDay.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {filteredWorkerReports.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No worker reports found
                      </div>
                    )}
                  </div>
                )}

                {/* Daily Operations Table */}
                {activeTab === 'daily' && (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]">
                                <div className="flex items-center gap-1">
                                  Date
                                  <ArrowUpDown className="w-3 h-3" />
                                </div>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                <span className="hidden lg:inline">Workers On-Site</span>
                                <span className="lg:hidden">Workers</span>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                <span className="hidden lg:inline">Active Sessions</span>
                                <span className="lg:hidden">Sessions</span>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                <span className="hidden lg:inline">Bags Completed</span>
                                <span className="lg:hidden">Bags</span>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                <span className="hidden lg:inline">Exporters Active</span>
                                <span className="lg:hidden">Exporters</span>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                <span className="hidden lg:inline">Labor Cost (RWF)</span>
                                <span className="lg:hidden">Cost</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDailyOperations.map((op, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                  {new Date(op.date).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {op.workersOnSite}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {op.activeSessions}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    {op.bagsCompleted}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">
                                  <div className="flex flex-wrap gap-1">
                                    {op.exportersActive.map((exp, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {exp}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                                  {op.totalLaborCost.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {filteredDailyOperations.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No daily operations found
                      </div>
                    )}
                  </div>
                )}

                {/* Audit Trail Table */}
                {activeTab === 'audit' && (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                Date
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                                Worker Name
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                Worker ID
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                                Exporter Name
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                Business Reg / TIN
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                Bag ID
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                <span className="hidden lg:inline">Session Ref</span>
                                <span className="lg:hidden">Session</span>
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                Check In
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                Check Out
                              </th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAuditTrails.map((trail, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  {new Date(trail.date).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="font-medium">{trail.workerName}</span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-500">
                                  {trail.workerId}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  <span className="font-medium">{trail.exporterName}</span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-500">
                                  {trail.exporterId}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-900">
                                  {trail.bagId}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-900">
                                  {trail.sessionId}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  {trail.checkInTime}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                  {trail.checkOutTime}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {trail.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {filteredAuditTrails.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No audit trail records found
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
            {activeTab === 'exporter' && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Bags</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {filteredExporterReports.reduce((sum, r) => sum + r.bagsSorted, 0).toLocaleString()}
                      </p>
                    </div>
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Workers</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {filteredExporterReports.reduce((sum, r) => sum + r.workersInvolved, 0)}
                      </p>
                    </div>
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Labor Cost</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                        {filteredExporterReports.reduce((sum, r) => sum + r.totalLaborCost, 0).toLocaleString()} <span className="text-sm sm:text-base">RWF</span>
                      </p>
                    </div>
                    <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Active Exporters</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                        {filteredExporterReports.length}
                      </p>
                    </div>
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
