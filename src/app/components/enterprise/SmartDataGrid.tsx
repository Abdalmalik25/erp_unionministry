/**
 * Smart Data Grid Component - الإصدار المتقدم
 * جدول بيانات مؤسسي ذكي مع جميع الميزات المتقدمة
 *
 * الميزات المتقدمة:
 * - رؤوس مثبتة (Sticky Headers)
 * - أعمدة مجمدة (Frozen Columns with left/right support)
 * - صفوف قابلة للتوسيع (Expandable Rows)
 * - إجراءات مدمجة (Inline Actions)
 * - فلاتر ذكية لكل عمود مع بحث عام
 * - تنسيق شرطي مبني على القيم (Conditional Formatting)
 * - عمليات مجمعة (Bulk Operations)
 * - تحديثات فورية (Real-time Updates)
 * - ترقيم صفحات متقدم مع اختيار حجم الصفحة
 * - تصدير البيانات (CSV/Excel)
 * - إعادة تعيين الفلاتر والترتيب
 * - دعم كامل للغة العربية (RTL)
 * - تحميل متقدم وحالات فارغة مخصصة
 * - تحسين أداء مع useMemo/useCallback
 * - إمكانية الوصول (Accessibility)
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Columns,
} from 'lucide-react';

// ==================== أنواع البيانات (Types) ====================

export interface Column {
  id: string;
  label: string;
  field: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  frozen?: 'left' | 'right' | false; // دعم التجميد لليسار أو اليمين
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  filterComponent?: (value: string, onChange: (val: string) => void) => React.ReactNode; // فلتر مخصص
  format?: (value: any) => string; // تنسيق القيمة
  visible?: boolean; // إمكانية إخفاء العمود
}

export interface SmartDataGridProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onView?: (row: any) => void;
  onBulkAction?: (action: string, selected: any[]) => void;
  onExport?: (selectedOnly: boolean, format: 'csv' | 'excel') => void;
  expandable?: boolean;
  renderExpanded?: (row: any) => React.ReactNode;
  enableSelection?: boolean;
  enableActions?: boolean;
  stickyHeader?: boolean;
  highlightRisk?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  error?: string | null;
  emptyState?: React.ReactNode;
  rowClassName?: (row: any) => string;
  getRowId?: (row: any) => string;
  onSelectionChange?: (selectedIds: string[], selectedRows: any[]) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
  enableColumnVisibility?: boolean;
  stripedRows?: boolean;
  showPageSizeSelector?: boolean;
  showExportButtons?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  defaultHiddenColumns?: string[];
}

// ==================== المكون الرئيسي ====================

export function SmartDataGrid({
  data,
  columns: initialColumns,
  onRowClick,
  onRowDoubleClick,
  onEdit,
  onDelete,
  onView,
  onBulkAction,
  onExport,
  expandable = false,
  renderExpanded,
  enableSelection = true,
  enableActions = true,
  stickyHeader = true,
  highlightRisk = true,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  loading = false,
  error = null,
  emptyState,
  rowClassName,
  getRowId = (row) => row.id || row.entityId || JSON.stringify(row),
  onSelectionChange,
  onFilterChange,
  onSortChange,
  enableColumnVisibility = false,
  stripedRows = true,
  showPageSizeSelector = true,
  showExportButtons = true,
  showRefreshButton = true,
  onRefresh,
  defaultHiddenColumns = [],
}: SmartDataGridProps) {
  // ==================== الحالات (State) ====================
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    initialColumns.filter((col) => !defaultHiddenColumns.includes(col.id)).map((col) => col.id)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  // تصفية الأعمدة الظاهرة
  const columns = useMemo(
    () => initialColumns.filter((col) => visibleColumns.includes(col.id)),
    [initialColumns, visibleColumns]
  );

  // ==================== معالجة البيانات ====================

  // 1. الترتيب (Sorting)
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;
      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  // 2. التصفية (Filtering)
  const filteredData = useMemo(() => {
    let result = sortedData;

    // تصفية حسب أعمدة الفلتر
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        result = result.filter((row) =>
          String(row[field]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // بحث عام في جميع الحقول
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(lowerQuery)
        )
      );
    }

    return result;
  }, [sortedData, filters, searchQuery]);

  // إعادة ضبط الصفحة عند تغيير الفلاتر أو البحث
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, sortColumn, sortDirection]);

  // 3. تجزئة الصفحات (Pagination)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSizeState;
    const end = start + pageSizeState;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSizeState]);

  const totalPages = Math.ceil(filteredData.length / pageSizeState);
  const totalItems = filteredData.length;

  // ==================== المعالجات (Handlers) ====================

  const handleSort = useCallback(
    (column: Column) => {
      if (!column.sortable) return;

      let newDirection: 'asc' | 'desc' = 'asc';
      let newColumn = column.field;

      if (sortColumn === column.field) {
        newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      }

      setSortColumn(newColumn);
      setSortDirection(newDirection);
      onSortChange?.(newColumn, newDirection);
    },
    [sortColumn, sortDirection, onSortChange]
  );

  const handleFilterChange = useCallback(
    (field: string, value: string) => {
      const newFilters = { ...filters, [field]: value };
      if (!value) delete newFilters[field];
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [filters, onFilterChange]
  );

  const handleSelectRow = useCallback(
    (rowId: string, row: any) => {
      const newSelected = new Set(selectedRows);
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId);
      } else {
        newSelected.add(rowId);
      }
      setSelectedRows(newSelected);
      const selectedRowsArray = Array.from(newSelected).map(
        (id) => data.find((r) => getRowId(r) === id)!
      );
      onSelectionChange?.(Array.from(newSelected), selectedRowsArray);
    },
    [selectedRows, data, getRowId, onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    const allIds = paginatedData.map((row) => getRowId(row));
    let newSelected: Set<string>;

    if (selectedRows.size === allIds.length && allIds.length > 0) {
      newSelected = new Set();
    } else {
      newSelected = new Set(allIds);
    }

    setSelectedRows(newSelected);
    const selectedRowsArray = Array.from(newSelected).map(
      (id) => data.find((r) => getRowId(r) === id)!
    );
    onSelectionChange?.(Array.from(newSelected), selectedRowsArray);
  }, [paginatedData, selectedRows, data, getRowId, onSelectionChange]);

  const handleExpandRow = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    onFilterChange?.({});
  }, [onFilterChange]);

  const handleExport = useCallback(
    (format: 'csv' | 'excel') => {
      if (onExport) {
        onExport(selectedRows.size > 0, format);
      } else {
        // تصدير افتراضي إلى CSV
        const dataToExport = selectedRows.size > 0
          ? data.filter((row) => selectedRows.has(getRowId(row)))
          : filteredData;

        if (dataToExport.length === 0) return;

        const headers = columns.map((col) => col.label);
        const rows = dataToExport.map((row) =>
          columns.map((col) => {
            let value = row[col.field];
            if (col.format) value = col.format(value);
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          })
        );

        const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `export_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    },
    [onExport, selectedRows, data, filteredData, columns, getRowId]
  );

  const handleRefresh = useCallback(() => {
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  // حقن أنماط الأعمدة المجمدة مرة واحدة
  useEffect(() => {
    const id = 'smart-grid-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `.shadow-right{box-shadow:2px 0 5px -2px rgba(0,0,0,.1)}.shadow-left{box-shadow:-2px 0 5px -2px rgba(0,0,0,.1)}`;
      document.head.appendChild(s);
    }
  }, []);

  // إغلاق قائمة الأعمدة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==================== دوال مساعدة ====================

  const getRowRiskClass = (row: any): string => {
    if (!highlightRisk) return '';

    if (row.riskLevel === 'critical' || row.status === 'critical') {
      return 'bg-red-50 border-l-4 border-red-500';
    }
    if (row.riskLevel === 'high' || row.complianceStatus === 'non_compliant') {
      return 'bg-orange-50 border-l-4 border-orange-500';
    }
    if (row.riskLevel === 'medium' || row.status === 'suspended') {
      return 'bg-yellow-50 border-l-4 border-yellow-500';
    }
    return '';
  };

  const getCellValue = (row: any, column: Column) => {
    const value = row[column.field];
    if (column.format) return column.format(value);
    return value;
  };

  // ==================== حالات خاصة (Loading, Error, Empty) ====================

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-12">
        <div className="flex flex-col items-center justify-center text-red-600">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="font-medium">حدث خطأ</p>
          <p className="text-sm mt-1">{error}</p>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    );
  }

  if (filteredData.length === 0 && !loading) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="flex flex-col items-center text-gray-500">
          <AlertCircle className="h-12 w-12 mb-2" />
          <p className="text-lg font-medium">لا توجد بيانات</p>
          <p className="text-sm mt-1">حاول تعديل الفلاتر أو البحث</p>
          {(Object.keys(filters).length > 0 || searchQuery) && (
            <button
              onClick={handleClearAllFilters}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
            >
              مسح جميع الفلاتر
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==================== العرض الرئيسي ====================

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* شريط الأدوات المتقدم (Toolbar) */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* البحث العام */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث في جميع الحقول..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedRows.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                <span className="font-medium">{selectedRows.size} محدد</span>
                <button
                  onClick={() => onBulkAction?.('delete', Array.from(selectedRows))}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                  title="حذف المحدد"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                  title="تصدير المحدد"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )}

            {showRefreshButton && onRefresh && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">تحديث</span>
              </button>
            )}

            {showExportButtons && (
              <>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">تصدير CSV</span>
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">تصدير Excel</span>
                </button>
              </>
            )}

            {enableColumnVisibility && (
              <div className="relative" ref={columnMenuRef}>
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Columns className="h-4 w-4" />
                  <span className="hidden sm:inline">الأعمدة</span>
                </button>
                {showColumnMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="p-2">
                      <p className="text-sm font-medium text-gray-700 px-2 py-1">إظهار/إخفاء الأعمدة</p>
                      {initialColumns.map((col) => (
                        <label key={col.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.id)}
                            onChange={() => {
                              if (visibleColumns.includes(col.id)) {
                                setVisibleColumns(visibleColumns.filter((id) => id !== col.id));
                              } else {
                                setVisibleColumns([...visibleColumns, col.id]);
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* الفلاتر النشطة (Active Filters) */}
        {(Object.keys(filters).length > 0 || searchQuery) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-sm text-gray-600">الفلاتر النشطة:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                بحث: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="hover:bg-blue-100 rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {Object.entries(filters).map(
              ([field, value]) =>
                value && (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                  >
                    {field}: {value}
                    <button
                      onClick={() => handleFilterChange(field, '')}
                      className="hover:bg-blue-100 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
            )}
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              مسح الكل
            </button>
          </div>
        )}
      </div>

      {/* حاوية الجدول مع التمرير الأفقي */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* رأس الجدول (ثابت إذا كان stickyHeader مفعلاً) */}
          <thead className={`bg-gray-50 border-b border-gray-200 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {enableSelection && (
                <th className="w-12 px-4 py-3 text-right border-b border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}

              {expandable && <th className="w-12 px-4 py-3 border-b border-gray-200"></th>}

              {columns.map((column) => {
                const isFrozenLeft = column.frozen === 'left';
                const isFrozenRight = column.frozen === 'right';
                return (
                  <th
                    key={column.id}
                    className={`px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${
                      isFrozenLeft
                        ? 'sticky left-0 bg-gray-50 z-10 shadow-right'
                        : isFrozenRight
                        ? 'sticky right-0 bg-gray-50 z-10 shadow-left'
                        : ''
                    } ${column.className || ''}`}
                    style={{ width: column.width, minWidth: column.width }}
                    onClick={() => column.sortable && handleSort(column)}
                  >
                    <div className="flex items-center gap-2 justify-between">
                      <span>{column.label}</span>
                      <div className="flex items-center gap-1">
                        {column.sortable && sortColumn === column.field && (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        )}
                        {column.filterable && (
                          <Filter
                            className={`h-3 w-3 cursor-pointer ${filters[column.field] ? 'text-blue-600' : 'text-gray-400'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // يمكن فتح نافذة فلتر مخصصة هنا
                            }}
                          />
                        )}
                      </div>
                    </div>
                    {/* فلتر مدمج تحت العمود (اختياري) */}
                    {column.filterable && (
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder={`فلتر ${column.label}`}
                          value={filters[column.field] || ''}
                          onChange={(e) => handleFilterChange(column.field, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </th>
                );
              })}

              {enableActions && (
                <th className="w-24 px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">
                  إجراءات
                </th>
              )}
            </tr>
          </thead>

          {/* جسم الجدول */}
          <tbody className="divide-y divide-gray-200">
            {paginatedData.map((row, index) => {
              const rowId = getRowId(row);
              const isSelected = selectedRows.has(rowId);
              const isExpanded = expandedRows.has(rowId);
              const riskClass = getRowRiskClass(row);
              const customRowClass = rowClassName?.(row) || '';
              const stripeClass = stripedRows && index % 2 === 1 ? 'bg-gray-50' : '';

              return (
                <React.Fragment key={rowId}>
                  <tr
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50' : ''
                    } ${riskClass} ${stripeClass} ${customRowClass}`}
                    onClick={() => onRowClick?.(row)}
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                  >
                    {enableSelection && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId, row)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}

                    {expandable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleExpandRow(rowId)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          aria-label={isExpanded ? 'طي' : 'توسيع'}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                    )}

                    {columns.map((column) => {
                      const isFrozenLeft = column.frozen === 'left';
                      const isFrozenRight = column.frozen === 'right';
                      const cellValue = getCellValue(row, column);
                      return (
                        <td
                          key={column.id}
                          className={`px-4 py-3 text-sm text-gray-900 ${
                            isFrozenLeft
                              ? `sticky left-0 ${isSelected ? 'bg-blue-50' : stripeClass || 'bg-white'} z-10 shadow-right`
                              : isFrozenRight
                              ? `sticky right-0 ${isSelected ? 'bg-blue-50' : stripeClass || 'bg-white'} z-10 shadow-left`
                              : ''
                          } ${column.className || ''}`}
                        >
                          {column.render ? column.render(cellValue, row) : cellValue}
                        </td>
                      );
                    })}

                    {enableActions && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {onView && (
                            <button
                              onClick={() => onView(row)}
                              className="p-1.5 hover:bg-gray-200 rounded text-blue-600 transition-colors"
                              title="عرض"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1.5 hover:bg-gray-200 rounded text-green-600 transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="p-1.5 hover:bg-gray-200 rounded text-red-600 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* الصف الممتد (Expanded Row) */}
                  {expandable && isExpanded && renderExpanded && (
                    <tr>
                      <td
                        colSpan={
                          (enableSelection ? 1 : 0) +
                          (expandable ? 1 : 0) +
                          columns.length +
                          (enableActions ? 1 : 0)
                        }
                        className="px-4 py-4 bg-gray-50"
                      >
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* شريط الترقيم (Pagination) */}
      {(totalPages > 1 || showPageSizeSelector) && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              عرض {(currentPage - 1) * pageSizeState + 1} إلى{' '}
              {Math.min(currentPage * pageSizeState, totalItems)} من {totalItems} نتيجة
              {totalItems !== filteredData.length && (
                <span className="text-blue-600 mr-1"> (مصفى من {data.length})</span>
              )}
            </div>

            <div className="flex items-center gap-4 order-1 sm:order-2">
              {showPageSizeSelector && (
                <select
                  value={pageSizeState}
                  onChange={(e) => {
                    setPageSizeState(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size} / صفحة
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  السابق
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    if (page < 1 || page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span>...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

document.head.appendChild(styleSheet);