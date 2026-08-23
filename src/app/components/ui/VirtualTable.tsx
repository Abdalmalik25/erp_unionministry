/**
 * Virtual Table - جدول افتراضي للأداء العالي
 * يعرض فقط الصفوف المرئية لتحسين الأداء مع البيانات الكبيرة
 */

import { useEffect, useRef, useState, memo, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (row: T) => void;
  className?: string;
  sortBy?: keyof T | string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: keyof T | string, order: 'asc' | 'desc') => void;
}

export const VirtualTable = memo(function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  overscan = 5,
  onRowClick,
  className = '',
  sortBy,
  sortOrder = 'asc',
  onSort,
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });

    container.addEventListener('scroll', handleScroll);
    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const { visibleRange, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      data.length - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );

    return {
      visibleRange: { start: startIndex, end: endIndex },
      totalHeight: data.length * rowHeight,
    };
  }, [scrollTop, containerHeight, data.length, rowHeight, overscan]);

  const visibleData = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end + 1);
  }, [data, visibleRange]);

  const handleSort = (key: keyof T | string) => {
    if (!onSort) return;

    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-muted border-b border-border sticky top-0 z-10">
        <div className="flex">
          {columns.map((column, index) => (
            <div
              key={index}
              className={`px-6 py-4 text-right text-xs font-semibold text-foreground ${
                column.width || 'flex-1'
              } ${column.sortable ? 'cursor-pointer hover:bg-accent' : ''}`}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <div className="flex items-center justify-between">
                <span>{column.header}</span>
                {column.sortable && sortBy === column.key && (
                  <span className="mr-2">
                    {sortOrder === 'asc' ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Body with Virtual Scrolling */}
      <div
        ref={containerRef}
        className="overflow-y-auto"
        style={{ height: '600px', maxHeight: '70vh' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${visibleRange.start * rowHeight}px)`,
            }}
          >
            {visibleData.map((row, rowIndex) => {
              const actualIndex = visibleRange.start + rowIndex;
              return (
                <div
                  key={actualIndex}
                  className={`flex border-b border-border hover:bg-accent/50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  style={{ height: rowHeight }}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIndex) => {
                    const value = row[column.key as keyof T];
                    return (
                      <div
                        key={colIndex}
                        className={`px-6 py-4 text-sm text-heading flex items-center ${
                          column.width || 'flex-1'
                        }`}
                      >
                        {column.render ? column.render(value, row) : value}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}) as <T extends Record<string, any>>(props: VirtualTableProps<T>) => JSX.Element;

// ============================================
// Enhanced Table with Sorting and Filtering
// ============================================
interface EnhancedTableProps<T> extends VirtualTableProps<T> {
  enableSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
}

export const EnhancedTable = memo(function EnhancedTable<T extends Record<string, any>>({
  enableSearch = false,
  searchPlaceholder = 'بحث...',
  onSearch,
  ...tableProps
}: EnhancedTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch?.(value);
  };

  return (
    <div className="space-y-4">
      {enableSearch && (
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <VirtualTable {...tableProps} />
    </div>
  );
}) as <T extends Record<string, any>>(props: EnhancedTableProps<T>) => JSX.Element;
