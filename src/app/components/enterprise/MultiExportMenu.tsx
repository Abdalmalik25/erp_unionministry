// src/app/components/enterprise/MultiExportMenu.tsx
// Unified export dropdown: Excel + PDF + CSV in one accessible menu

import { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet, FileText, File, ChevronDown,
  Printer, Loader2, CheckCircle
} from 'lucide-react';
import { exportReportToExcel, exportReportToPDF, exportReportToCSV } from './PrintExportManager';
import { logAudit } from '../../utils/security';
import type { PrintExportOptions } from './PrintExportManager';
import { useFeature } from '../../hooks/useFeature';
import { useLanguage } from '../../contexts/LanguageContext';

interface MultiExportMenuProps {
  options: PrintExportOptions;
  /** Show CSV option (requires export_csv feature flag) */
  showCSV?: boolean;
  /** Small size variant */
  size?: 'sm' | 'md';
  className?: string;
}

type ExportFormat = 'excel' | 'pdf' | 'csv';
type ExportState = 'idle' | 'loading' | 'success' | 'error';

const formatLabels = {
  excel: { ar: 'تصدير Excel', en: 'Export Excel' },
  pdf: { ar: 'تصدير PDF', en: 'Export PDF' },
  csv: { ar: 'تصدير CSV', en: 'Export CSV' },
};

export function MultiExportMenu({
  options,
  showCSV = true,
  size = 'md',
  className = '',
}: MultiExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [state, setState] = useState<Record<ExportFormat, ExportState>>({
    excel: 'idle',
    pdf: 'idle',
    csv: 'idle',
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const csvEnabled = useFeature('export_csv');
  const { current, isRTL } = useLanguage();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setState((s) => ({ ...s, [format]: 'loading' }));
    setOpen(false);

    try {
      if (format === 'excel') await exportReportToExcel(options);
      else if (format === 'pdf') await exportReportToPDF(options);
      else if (format === 'csv') await exportReportToCSV(options);

      setState((s) => ({ ...s, [format]: 'success' }));
      logAudit({
        action: 'export',
        resource: options.reportType || 'report',
        details: { format, title: options.title, rowCount: options.data.length },
      });
      setTimeout(() => setState((s) => ({ ...s, [format]: 'idle' })), 3000);
    } catch (e) {
      console.error('[MultiExport] failed:', e);
      setState((s) => ({ ...s, [format]: 'error' }));
      setTimeout(() => setState((s) => ({ ...s, [format]: 'idle' })), 4000);
    } finally {
      setExporting(null);
    }
  };

  const label = (key: keyof typeof formatLabels) =>
    formatLabels[key][current as 'ar' | 'en'];

  const sizeClass = size === 'sm'
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-3 py-2 text-sm gap-1.5';

  const iconSize = size === 'sm' ? 12 : 14;
  const menuIconSize = size === 'sm' ? 12 : 14;

  const formats: Array<{ format: ExportFormat; icon: typeof FileSpreadsheet; color: string }> = [
    { format: 'excel', icon: FileSpreadsheet, color: 'text-success' },
    { format: 'pdf', icon: FileText, color: 'text-error' },
  ];

  if (showCSV && csvEnabled) {
    formats.push({ format: 'csv', icon: File, color: 'text-primary' });
  }

  return (
    <div ref={menuRef} className={`relative inline-flex ${className}`}>
      <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden shadow-sm">
        {formats.map(({ format, icon: Icon, color }) => {
          const fmtState = state[format];
          const isActive = exporting === format;
          return (
            <button
              key={format}
              type="button"
              onClick={() => void handleExport(format)}
              disabled={!!exporting}
              aria-label={label(format)}
              aria-busy={isActive}
              className={`
                flex items-center ${sizeClass} border-0 border-r border-border last:border-r-0
                hover:bg-accent transition-colors cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isRTL ? 'flex-row-reverse' : 'flex-row'}
              `}
            >
              {isActive ? (
                <Loader2 size={iconSize} className="animate-spin shrink-0" aria-hidden />
              ) : fmtState === 'success' ? (
                <CheckCircle size={iconSize} className="text-success shrink-0" aria-hidden />
              ) : (
                <Icon size={iconSize} className={`${color} shrink-0`} aria-hidden />
              )}
              <span className={isRTL ? 'mr-1' : 'ml-1'}>
                {label(format)}
              </span>
            </button>
          );
        })}

        <div className="w-px bg-border self-stretch" aria-hidden />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="خيارات التصدير"
          className={`
            ${sizeClass} border-0 border-r border-border last:border-r-0
            hover:bg-accent transition-colors cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
            ${isRTL ? 'flex-row-reverse' : 'flex-row'}
          `}
        >
          <ChevronDown
            size={menuIconSize}
            className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </div>

      {/* Dropdown for additional options */}
      {open && (
        <div
          role="menu"
          aria-label="خيارات التصدير"
          className={`
            absolute ${isRTL ? 'left-0' : 'right-0'} mt-1 z-50
            w-52 bg-popover text-popover-foreground rounded-xl
            border border-border shadow-xl p-1.5 animate-in fade-in-50 duration-150
          `}
        >
          {/* Print */}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              window.print();
            }}
            className="
              w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
              hover:bg-accent transition-colors cursor-pointer
              text-sm font-medium focus:outline-none focus-visible:bg-accent
            "
          >
            <Printer size={15} aria-hidden />
            {current === 'ar' ? 'طباعة' : 'Print'}
          </button>

          <div className="h-px bg-border my-1" aria-hidden />

          {formats.map(({ format, icon: Icon, color }) => (
            <button
              key={format}
              role="menuitem"
              onClick={() => void handleExport(format)}
              disabled={!!exporting}
              aria-label={label(format)}
              className="
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                hover:bg-accent transition-colors cursor-pointer
                text-sm font-medium focus:outline-none focus-visible:bg-accent
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <Icon size={15} className={color} aria-hidden />
              {label(format)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
