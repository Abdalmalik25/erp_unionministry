/**
 * FilterBar — شريط البحث والتصفية الموحّد
 * يُستخدم في جميع شاشات النظام لضمان تناسق تجربة البحث والتصفية
 */

import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from './utils';

// ============================================================
// الأنواع
// ============================================================

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  options?: FilterOption[];
  placeholder?: string;
  type?: 'select' | 'text' | 'date';
}

interface FilterBarProps {
  /** نص البحث */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** الحقول الإضافية للتصفية */
  filters?: FilterField[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  /** أدوات إضافية على اليسار (أزرار تصدير، إضافة...) */
  actions?: ReactNode;
  className?: string;
}

// ============================================================
// المكوّن
// ============================================================

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  filters = [],
  filterValues = {},
  onFilterChange,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-sm p-4',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row gap-3">
        {/* حقل البحث */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchValue || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="بحث"
            className="w-full pr-9 pl-3 py-2.5 min-h-[44px] text-sm bg-input-background text-foreground border border-border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:border-transparent transition-colors"
          />
        </div>

        {/* حقول التصفية */}
        {filters.map((filter) => (
          <div key={filter.key} className="w-full lg:w-48">
            {filter.type === 'select' ? (
              <div className="relative">
                <select
                  aria-label={filter.label}
                  value={filterValues[filter.key] || ''}
                  onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] text-sm border border-border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:border-transparent bg-input-background text-foreground appearance-none pe-9 cursor-pointer"
                >
                  <option value="">{filter.label}</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {/* سهم القائمة الموحّد */}
                <svg
                  className="pointer-events-none absolute inset-y-0 end-2.5 my-auto w-4 h-4 text-muted-foreground"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                aria-label={filter.label}
                value={filterValues[filter.key] || ''}
                onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] text-sm border border-border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:border-transparent bg-input-background"
              />
            ) : (
              <input
                type="text"
                aria-label={filter.label}
                value={filterValues[filter.key] || ''}
                onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                placeholder={filter.placeholder || filter.label}
                className="w-full px-3 py-2.5 min-h-[44px] text-sm border border-border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:border-transparent bg-input-background"
              />
            )}
          </div>
        ))}

        {/* الأزرار الإضافية */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap lg:ml-auto">{actions}</div>
        )}
      </div>
    </div>
  );
}