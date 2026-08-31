import { useMemo, useRef, useEffect, useState, useCallback, ReactNode } from 'react';
import { cn } from './utils';

interface VirtualizedTableProps<T> {
  items: T[];
  rowHeight: number;
  height: number | string;
  width?: number | string;
  overscan?: number;
  children: (item: T, index: number, isVisible: boolean) => ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number) => void;
  itemKey?: keyof T | ((item: T, index: number) => string);
  stickyHeader?: ReactNode;
  stickyHeaderHeight?: number;
}

export function VirtualizedTable<T>({
  items,
  rowHeight,
  height,
  width = '100%',
  overscan = 5,
  children,
  className,
  style,
  onScroll,
  itemKey,
  stickyHeader,
  stickyHeaderHeight = 48,
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setClientHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const visibleRange = useMemo(() => {
    const effectiveHeight = clientHeight || (typeof height === 'number' ? height : 400);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + effectiveHeight) / rowHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, rowHeight, items.length, overscan, clientHeight, height]);

  const totalHeight = items.length * rowHeight;
  const offsetY = visibleRange.startIndex * rowHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    setScrollTop(top);
    onScroll?.(top);
  }, [onScroll]);

  const getItemKey = useCallback(
    (item: T, index: number) => {
      if (typeof itemKey === 'function') return itemKey(item, index);
      if (itemKey) return String((item as Record<string, unknown>)[String(itemKey)]);
      return String(index);
    },
    [itemKey]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height, width, ...style }}
      onScroll={handleScroll}
    >
      {stickyHeader && (
        <div
          className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border"
          style={{ height: stickyHeaderHeight }}
        >
          {stickyHeader}
        </div>
      )}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          className="flex flex-col"
          style={{
            transform: `translateY(${offsetY}px)`,
            willChange: 'transform',
            contain: 'strict',
          }}
          role="list"
          aria-label="قائمة افتراضية"
        >
          {items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, i) => {
            const index = visibleRange.startIndex + i;
            const isVisible = index >= visibleRange.startIndex && index <= visibleRange.endIndex;
            return (
              <div
                key={getItemKey(item, index)}
                style={{ height: rowHeight, contain: 'content' }}
                role="listitem"
                data-virtual-index={index}
              >
                {children(item, index, isVisible)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface VirtualizedGridProps<T> {
  items: T[];
  columnCount: number;
  cellHeight: number;
  cellWidth: number | ((index: number) => number);
  height: number | string;
  width?: number | string;
  gap?: number;
  overscan?: number;
  children: (item: T, index: number, row: number, col: number) => ReactNode;
  className?: string;
}

export function VirtualizedGrid<T>({
  items,
  columnCount,
  cellHeight,
  cellWidth,
  height,
  width = '100%',
  gap = 8,
  overscan = 3,
  children,
  className,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setClientHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const rowHeight = cellHeight + gap;
  const totalRows = Math.ceil(items.length / columnCount);
  const totalHeight = totalRows * rowHeight;

  const visibleRange = useMemo(() => {
    const effectiveHeight = clientHeight || (typeof height === 'number' ? height : 400);
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(totalRows - 1, Math.ceil((scrollTop + effectiveHeight) / rowHeight) + overscan);
    return { startRow, endRow };
  }, [scrollTop, rowHeight, totalRows, overscan, clientHeight, height]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const offsetY = visibleRange.startRow * rowHeight;
  const startIndex = visibleRange.startRow * columnCount;
  const endIndex = Math.min((visibleRange.endRow + 1) * columnCount, items.length);

  const getWidth = useCallback(
    (index: number) => (typeof cellWidth === 'function' ? cellWidth(index) : cellWidth),
    [cellWidth]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height, width }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          className="flex flex-wrap"
          style={{
            transform: `translateY(${offsetY}px)`,
            willChange: 'transform',
            padding: gap / 2,
            gap,
          }}
          role="list"
        >
          {items.slice(startIndex, endIndex).map((item, i) => {
            const index = startIndex + i;
            const col = index % columnCount;
            return (
              <div
                key={index}
                style={{
                  height: cellHeight,
                  width: getWidth(index),
                  flexShrink: 0,
                  contain: 'content',
                }}
                role="listitem"
              >
                {children(item, index, Math.floor(index / columnCount), col)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function useVirtualScroll<T>(
  items: T[],
  rowHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, rowHeight, containerHeight, overscan, items.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems: items.slice(visibleRange.startIndex, visibleRange.endIndex + 1),
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex,
    totalHeight: items.length * rowHeight,
    offsetY: visibleRange.startIndex * rowHeight,
    onScroll: handleScroll,
  };
}

export default VirtualizedTable;