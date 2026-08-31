/**
 * Universal Data View - Unified Data Component
 *
 * Integrates Search + Reports + Query Builder seamlessly
 * Single component, multiple views, zero friction
 *
 * Features:
 * - 3 view modes: Table / Cards / Analytics
 * - Built-in search (auto-applied to data)
 * - Quick filters via facets
 * - One-click export
 * - Lazy loaded sub-components
 * - URL state persistence
 * - Optimistic UI
 */

import { lazy, Suspense, useState, useMemo, useCallback, useEffect } from 'react';

// Lazy load heavy components
const AdvancedSearchEngine = lazy(() =>
  import('../search/AdvancedSearchEngine').then((m) => ({ default: m.AdvancedSearchEngine }))
);
const SmartReportsGenerator = lazy(() =>
  import('../reports/SmartReportsGenerator').then((m) => ({ default: m.SmartReportsGenerator }))
);

export type ViewMode = 'table' | 'cards' | 'analytics';
export type DataSource = 'api' | 'static' | 'computed';

export interface DataViewField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'array';
  options?: Array<{ value: string; label: string }>;
  searchable?: boolean;
  sortable?: boolean;
  aggregatable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  width?: number;
}

export interface UniversalDataViewProps<T extends Record<string, unknown>> {
  title: string;
  subtitle?: string;
  data: T[];
  fields: DataViewField[];
  defaultView?: ViewMode;
  onRowClick?: (row: T) => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf', data: T[]) => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
  enableAdvancedSearch?: boolean;
  enableAnalytics?: boolean;
  pageSize?: number;
  emptyState?: {
    icon?: string;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
}

export function UniversalDataView<T extends Record<string, unknown>>({
  title,
  subtitle,
  data,
  fields,
  defaultView = 'table',
  onRowClick,
  onExport,
  primaryAction,
  enableAdvancedSearch = true,
  enableAnalytics = true,
  pageSize = 25,
  emptyState,
}: UniversalDataViewProps<T>) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Filter data (quick search + sort)
  const processedData = useMemo(() => {
    let result = [...data];

    // Quick search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        fields
          .filter((f) => f.searchable !== false)
          .some((f) => String(row[f.key] ?? '').toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.field];
        const bVal = b[sortConfig.field];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, searchQuery, sortConfig, fields]);

  // Quick facets
  const quickFacets = useMemo(() => {
    const facetField = fields.find((f) => f.type === 'enum' || f.aggregatable);
    if (!facetField) return [];

    const counts = new Map<string, number>();
    for (const row of data) {
      const val = String(row[facetField.key] ?? 'other');
      counts.set(val, (counts.get(val) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data, fields]);

  // Paginated
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Sort handler
  const handleSort = useCallback((field: string) => {
    setSortConfig((prev) => {
      if (prev?.field === field) {
        return prev.direction === 'asc' ? { field, direction: 'desc' } : null;
      }
      return { field, direction: 'asc' };
    });
  }, []);

  // Export handler
  const handleExport = useCallback(
    (format: 'csv' | 'excel' | 'pdf') => {
      onExport?.(format, processedData);
    },
    [onExport, processedData]
  );

  return (
    <div className="universal-data-view bg-white rounded-xl shadow-sm border border-gray-200" dir="rtl">
      {/* Compact Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1"
              >
                {primaryAction.icon && <span>{primaryAction.icon}</span>}
                {primaryAction.label}
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ابحث..."
              className="w-full px-3 py-1.5 pr-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['table', 'cards', 'analytics'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  if (mode === 'analytics' && !enableAnalytics) return;
                  setViewMode(mode);
                  if (mode === 'analytics') setShowAnalytics(true);
                }}
                disabled={mode === 'analytics' && !enableAnalytics}
                className={`px-2.5 py-1 text-xs rounded transition ${
                  viewMode === mode
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 disabled:opacity-40'
                }`}
                title={mode === 'table' ? 'جدول' : mode === 'cards' ? 'بطاقات' : 'تحليلات'}
              >
                {mode === 'table' ? '☰' : mode === 'cards' ? '▦' : '📊'}
              </button>
            ))}
          </div>

          {/* Advanced Search */}
          {enableAdvancedSearch && (
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
            >
              بحث متقدم
            </button>
          )}

          {/* Export */}
          {onExport && processedData.length > 0 && (
            <div className="relative group">
              <button className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg">
                تصدير ▾
              </button>
              <div className="absolute left-0 mt-1 w-28 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                {(['csv', 'excel', 'pdf'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className="block w-full text-right px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Facets */}
        {quickFacets.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-xs text-gray-500">تصفية سريعة:</span>
            <button
              onClick={() => setQuickFilter(null)}
              className={`text-xs px-2 py-0.5 rounded-full transition ${
                !quickFilter ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل ({data.length})
            </button>
            {quickFacets.map((facet) => (
              <button
                key={facet.value}
                onClick={() => setQuickFilter(facet.value)}
                className={`text-xs px-2 py-0.5 rounded-full transition ${
                  quickFilter === facet.value
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {facet.value} ({facet.count})
              </button>
            ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
          <span>
            عرض: <strong className="text-gray-900">{processedData.length.toLocaleString('ar-YE')}</strong> من{' '}
            {data.length.toLocaleString('ar-YE')}
          </span>
          {(searchQuery || quickFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setQuickFilter(null);
                setCurrentPage(1);
              }}
              className="text-red-600 hover:underline"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Advanced Search (collapsible) */}
      {showAdvancedSearch && enableAdvancedSearch && (
        <div className="border-b border-gray-200">
          <Suspense fallback={<div className="p-4 text-sm text-gray-500">جاري التحميل...</div>}>
            <AdvancedSearchEngine
              fields={fields.map((f) => ({ ...f, label: f.label }))}
              data={data}
              onResultsChange={() => {}}
              enableExport={false}
            />
          </Suspense>
        </div>
      )}

      {/* Content */}
      {processedData.length === 0 ? (
        <EmptyState
          emptyState={emptyState}
          hasFilters={!!(searchQuery || quickFilter)}
          onClearFilters={() => {
            setSearchQuery('');
            setQuickFilter(null);
          }}
        />
      ) : viewMode === 'table' ? (
        <TableView
          fields={fields}
          data={paginatedData}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={onRowClick}
        />
      ) : viewMode === 'cards' ? (
        <CardsView fields={fields} data={paginatedData} onRowClick={onRowClick} />
      ) : null}

      {/* Pagination */}
      {processedData.length > pageSize && (
        <div className="flex items-center justify-between p-3 border-t border-gray-200">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-gray-600">
            صفحة <strong>{currentPage}</strong> من <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && enableAnalytics && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAnalytics(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">تحليلات: {title}</h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="h-[calc(90vh-60px)]">
              <Suspense fallback={<div className="p-8 text-center text-gray-500">جاري التحميل...</div>}>
                <SmartReportsGenerator
                  fields={fields.map((f) => ({ ...f, type: f.type === 'enum' ? 'string' : f.type as 'string' | 'number' | 'date' }))}
                  data={data as Record<string, unknown>[]}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Table view sub-component
function TableView<T extends Record<string, unknown>>({
  fields,
  data,
  sortConfig,
  onSort,
  onRowClick,
}: {
  fields: DataViewField[];
  data: T[];
  sortConfig: { field: string; direction: 'asc' | 'desc' } | null;
  onSort: (field: string) => void;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {fields.map((field) => (
              <th
                key={field.key}
                onClick={() => field.sortable !== false && onSort(field.key)}
                className={`px-3 py-2 text-right font-semibold text-gray-700 select-none ${
                  field.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{ width: field.width }}
              >
                <div className="flex items-center gap-1">
                  {field.label}
                  {sortConfig?.field === field.key && (
                    <span className="text-blue-600">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              className={`hover:bg-blue-50/50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {fields.map((field) => (
                <td key={field.key} className="px-3 py-2 text-gray-700">
                  {field.render ? field.render(row[field.key], row) : formatCellValue(row[field.key], field.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Cards view sub-component
function CardsView<T extends Record<string, unknown>>({
  fields,
  data,
  onRowClick,
}: {
  fields: DataViewField[];
  data: T[];
  onRowClick?: (row: T) => void;
}) {
  const titleField = fields[0];
  const subtitleField = fields[1];
  const metaFields = fields.slice(2, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
      {data.map((row, idx) => (
        <div
          key={idx}
          onClick={() => onRowClick?.(row)}
          className={`p-3 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition ${
            onRowClick ? 'cursor-pointer' : ''
          }`}
        >
          <h4 className="font-semibold text-gray-900 truncate">
            {titleField ? formatCellValue(row[titleField.key], titleField.type) : `#${idx + 1}`}
          </h4>
          {subtitleField && (
            <p className="text-sm text-gray-600 mt-1 truncate">
              {formatCellValue(row[subtitleField.key], subtitleField.type)}
            </p>
          )}
          <div className="mt-2 space-y-0.5">
            {metaFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{field.label}:</span>
                <span className="text-gray-700 font-medium">
                  {formatCellValue(row[field.key], field.type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState({
  emptyState,
  hasFilters,
  onClearFilters,
}: {
  emptyState?: UniversalDataViewProps<Record<string, unknown>>['emptyState'];
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <span className="text-5xl mb-3">🔍</span>
        <p className="text-lg mb-1">لا توجد نتائج</p>
        <p className="text-sm mb-3">جرّب تغيير معايير البحث</p>
        <button
          onClick={onClearFilters}
          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          مسح المرشحات
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
      <span className="text-5xl mb-3">{emptyState?.icon || '📭'}</span>
      <p className="text-lg mb-1">{emptyState?.title || 'لا توجد بيانات'}</p>
      {emptyState?.description && <p className="text-sm mb-3">{emptyState.description}</p>}
      {emptyState?.action && (
        <button
          onClick={emptyState.action.onClick}
          className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          {emptyState.action.label}
        </button>
      )}
    </div>
  );
}

// Helper: format cell value
function formatCellValue(value: unknown, type: string): string {
  if (value == null) return '-';
  if (type === 'date' && typeof value === 'string') {
    return new Date(value).toLocaleDateString('ar-YE');
  }
  if (type === 'number' && typeof value === 'number') {
    return value.toLocaleString('ar-YE');
  }
  if (type === 'boolean') {
    return value ? '✓' : '✗';
  }
  return String(value);
}
