/**
 * SmartToolbar - Unified Action Toolbar
 * 
 * Provides quick actions, filters, navigation, and bulk operations
 * Integrated with UniversalDataView for seamless data management
 */

import { useState, useMemo, useCallback, useDeferredValue, memo } from 'react';

// Types
interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  badge?: number | string;
  onClick: () => void;
}

interface ToolbarFilter {
  id: string;
  label: string;
  type: 'search' | 'select' | 'date' | 'range' | 'toggle';
  options?: { value: string; label: string }[];
  value?: string | boolean | [number, number];
  onChange: (value: string | boolean | [number, number]) => void;
  placeholder?: string;
}

interface ToolbarTab {
  id: string;
  label: string;
  icon: string;
  badge?: number | string;
  onClick: () => void;
}

interface SmartToolbarProps {
  title?: string;
  subtitle?: string;
  actions?: ToolbarAction[];
  filters?: ToolbarFilter[];
  tabs?: ToolbarTab[];
  activeTab?: string;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  lastUpdated?: Date;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

function SmartToolbar({
  title,
  subtitle,
  actions = [],
  filters = [],
  tabs = [],
  activeTab,
  onSearch,
  searchPlaceholder = 'بحث...',
  showRefresh = true,
  onRefresh,
  lastUpdated,
  isLoading = false,
  compact = false,
  className = '',
}: SmartToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const deferredQuery = useDeferredValue(searchQuery);

  // Debounced search
  useMemo(() => {
    if (onSearch && deferredQuery !== searchQuery) {
      const timer = setTimeout(() => onSearch(deferredQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [deferredQuery, onSearch]);

  const activeFiltersCount = useMemo(() =>
    filters.filter(f => {
      const v = f.value;
      if (v === undefined || v === null || v === '' || v === false) return false;
      if (Array.isArray(v) && v[0] === 0 && v[1] === 0) return false;
      return true;
    }).length,
    [filters]
  );

  const formatLastUpdated = useCallback((date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return date.toLocaleDateString('ar-YE');
  }, []);

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      {/* Header Row */}
      <div className={`px-4 py-3 flex items-center justify-between gap-4 ${compact ? 'py-2' : ''}`}>
        {/* Left: Title + Tabs */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {title && (
            <div className="min-w-0">
              <h1 className={`font-bold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-500 truncate">{subtitle}</p>
              )}
            </div>
          )}
          
          {/* Tabs */}
          {tabs.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-blue-200' : 'bg-gray-200'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions + Search */}
        <div className="flex items-center gap-2">
          {/* Search */}
          {onSearch && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-48 lg:w-64 px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
            </div>
          )}

          {/* Filter Toggle */}
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="تصفية متقدمة"
            >
              <span className="flex items-center gap-1">
                <span>⚙️</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </span>
            </button>
          )}

          {/* Refresh */}
          {showRefresh && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="تحديث"
            >
              <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            </button>
          )}

          {/* Actions */}
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                action.variant === 'primary'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : action.variant === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : action.variant === 'ghost'
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
              {action.badge !== undefined && (
                <span className="px-1.5 py-0.5 bg-white bg-opacity-20 rounded text-xs">
                  {action.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && filters.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filters.map((filter) => (
              <FilterControl key={filter.id} filter={filter} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              إخفاء الفلاتر
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => filters.forEach(f => f.onChange(''))}
                className="text-sm text-red-600 hover:text-red-700"
              >
                مسح الكل ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Bar */}
      {lastUpdated && (
        <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
          <span>آخر تحديث: {formatLastUpdated(lastUpdated)}</span>
          {isLoading && <span className="text-blue-600">جاري التحديث...</span>}
        </div>
      )}
    </div>
  );
}

// Filter Control Component
interface FilterControlProps {
  filter: ToolbarFilter;
}

const FilterControl = memo(function FilterControl({ filter }: FilterControlProps) {
  const { id, label, type, options = [], value, onChange, placeholder } = filter;

  const renderControl = () => {
    switch (type) {
      case 'search':
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || label}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        );

      case 'select':
        return (
          <select
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{placeholder || 'الكل'}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        );

      case 'range': {
        const [min, max] = (value as [number, number]) || [0, 100];
        return (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={min}
              onChange={(e) => onChange([Number(e.target.value), max])}
              placeholder="من"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              value={max}
              onChange={(e) => onChange([min, Number(e.target.value)])}
              placeholder="إلى"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>
        );
      }

      case 'toggle':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean || false}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{placeholder || 'تفعيل'}</span>
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {renderControl()}
    </div>
  );
});

export { SmartToolbar, type ToolbarAction, type ToolbarFilter, type ToolbarTab };
export default SmartToolbar;
