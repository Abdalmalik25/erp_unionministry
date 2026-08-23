/**
 * DataTable — جدول بيانات موحّد
 * مع بحث وفرز وترقيم صفحات وحالة فارغة
 * يُستخدم في جميع شاشات النظام لضمان الترابط
 */

import { useState, useMemo, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from './utils';
import { getTotalPages, paginate } from './designSystem';

// ============================================================
// الأنواع
// ============================================================

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** مفتاح فريد للصف */
  rowKey: (row: T) => string;
  /** البحث النصي */
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  /** الترقيم */
  pagination?: boolean;
  pageSize?: number;
  /** الفرز */
  sortable?: boolean;
  /** حالة فارغة */
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  /** تحميل */
  loading?: boolean;
  loadingRows?: number;
  /** إجراءات الصف */
  actions?: (row: T) => ReactNode;
  /** نقر على الصف */
  onRowClick?: (row: T) => void;
  /** ترويسة إضافية */
  toolbar?: ReactNode;
  className?: string;
}

// ============================================================
// المكوّن
// ============================================================

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  searchable = false,
  searchPlaceholder = 'بحث...',
  searchKeys = [],
  pagination = true,
  pageSize = 10,
  sortable = true,
  emptyMessage = 'لا توجد بيانات',
  emptyIcon,
  loading = false,
  loadingRows = 5,
  actions,
  onRowClick,
  toolbar,
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ============================================================
  // البحث والفرز
  // ============================================================

  const filteredData = useMemo(() => {
    let result = data;

    // البحث
    if (searchTerm.trim() && searchKeys.length > 0) {
      const q = searchTerm.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const value = row[key];
          return value != null && String(value).toLowerCase().includes(q);
        })
      );
    }

    // الفرز
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const comparison = String(aVal).localeCompare(String(bVal), 'ar');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, searchKeys, sortKey, sortOrder]);

  const totalPages = getTotalPages(filteredData.length, pageSize);
  const paginatedData = pagination ? paginate(filteredData, currentPage, pageSize) : filteredData;

  // إعادة تعيين الصفحة عند تغيير البحث
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((key: string) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }, [sortable, sortKey]);

  // ============================================================
  // العرض
  // ============================================================

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      {/* شريط الأدوات */}
      {(toolbar || searchable) && (
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {toolbar}
          {searchable && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          )}
        </div>
      )}

      {/* الجدول */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'py-3 px-4 text-right font-semibold text-muted-foreground whitespace-nowrap',
                    col.sortable && sortable ? 'cursor-pointer select-none hover:bg-accent' : '',
                    col.headerClassName
                  )}
                  onClick={() => col.sortable && sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortable && (
                      sortKey === col.key ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-bright" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-bright" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/70" />
                      )
                    )}
                  </span>
                </th>
              ))}
              {actions && <th className="py-3 px-4 text-right font-semibold text-muted-foreground">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={`loading-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                  {actions && <td className="py-3 px-4"><div className="h-4 bg-muted rounded animate-pulse" /></td>}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {emptyIcon || <Search className="w-12 h-12 text-muted-foreground/70" />}
                    <p className="text-muted-foreground font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn('hover:bg-accent/50 transition-colors', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('py-3 px-4 text-foreground', col.className)}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* الترقيم */}
      {pagination && filteredData.length > 0 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            عرض {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)}–{Math.min(currentPage * pageSize, filteredData.length)} من {filteredData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // حساب الصفحات المعروضة حول الصفحة الحالية
              let start = Math.max(1, currentPage - 2);
              if (start + 4 > totalPages) start = Math.max(1, totalPages - 4);
              const page = start + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-7 h-7 text-xs rounded-lg font-medium transition-colors',
                    page === currentPage ? 'bg-primary text-white' : 'hover:bg-accent text-muted-foreground'
                  )}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
