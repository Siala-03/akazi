'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { exportData, ExportData, ExportFormat } from '@/lib/export';
import { useSettings } from '@/contexts/SettingsContext';

interface ExportButtonProps {
  data: ExportData;
  label?: string;
  showFormatSelector?: boolean;
  variant?: 'default' | 'header';
}

export function ExportButton({ data, label = 'Export', showFormatSelector = true, variant = 'default' }: ExportButtonProps) {
  const { settings } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (showMenu && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 192),
      });
    }
  }, [showMenu]);

  const buttonClass = variant === 'header'
    ? 'flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 font-medium transition-all disabled:opacity-50 shadow-lg'
    : 'flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setShowMenu(false);

    try {
      await exportData(data, format);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportFormats = [
    { value: 'pdf' as ExportFormat, label: 'PDF', icon: FileText, color: 'text-red-600' },
    { value: 'excel' as ExportFormat, label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600' },
    { value: 'csv' as ExportFormat, label: 'CSV', icon: File, color: 'text-blue-600' },
  ];

  if (!showFormatSelector) {
    return (
      <button
        onClick={() => handleExport(settings.exports.defaultFormat)}
        disabled={isExporting}
        className={buttonClass}
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : label}
      </button>
    );
  }

  return (
    <div className="relative" ref={btnRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={buttonClass}
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : label}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="fixed z-50 w-48 rounded-lg shadow-xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            style={menuPos ? { top: menuPos.top, left: menuPos.left } : undefined}
          >
            {exportFormats.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.value}
                  onClick={() => handleExport(format.value)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <Icon className={`h-5 w-5 ${format.color}`} />
                  <span className="font-medium">{format.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
