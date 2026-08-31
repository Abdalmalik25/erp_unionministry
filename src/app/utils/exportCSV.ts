// src/app/utils/exportCSV.ts
// CSV export utility — zero-dependency, handles Arabic/RTL text properly

export interface CsvColumn<T> {
  /** Key in the data object */
  key: keyof T | string;
  /** Column header label */
  label: string;
  /** Optional formatter */
  format?: (value: unknown, row: T) => string;
}

/** Convert an array of objects to a CSV string with proper escaping */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn<T>[],
): string {
  if (!data.length) return '';

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Escape quotes and wrap if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key as keyof T];
        return escape(col.format ? col.format(raw, row) : raw);
      })
      .join(','),
  );

  // BOM for Excel UTF-8 compatibility with Arabic
  return '\uFEFF' + [header, ...rows].join('\r\n');
}

/** Trigger browser download of CSV data */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string,
): void {
  const csv = toCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Export data to CSV and trigger download */
export async function exportToCSV<T extends Record<string, unknown>>(
  options: {
    data: T[];
    columns: CsvColumn<T>[];
    title: string;
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<void> {
  const { data, columns, title, dateFrom, dateTo } = options;
  const dateStr = new Date().toISOString().slice(0, 10);
  const dateRange = [dateFrom, dateTo].filter(Boolean).join('_');
  const safeTitle = title.replace(/[^a-zA-Z0-9أ-ي_\s-]/g, '').trim();
  const filename = dateRange
    ? `${safeTitle}_${dateRange}_${dateStr}.csv`
    : `${safeTitle}_${dateStr}.csv`;

  downloadCSV(data, columns, filename);
}

/** Convert PrintExportManager columns to CSV columns */
export function normalizeToCSVColumns<T>(
  columns: Array<{ key: string; label: string }>,
): CsvColumn<T>[] {
  return columns.map((c) => ({ key: c.key as keyof T, label: c.label }));
}
