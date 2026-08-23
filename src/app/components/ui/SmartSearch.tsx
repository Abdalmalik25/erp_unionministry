/**
 * Smart Search - بحث ذكي متقدم
 * بحث في الوقت الفعلي مع اقتراحات وتصفية متقدمة
 */

import { useState, useEffect, useRef, memo } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useDebounce } from '../../utils/performance';

interface SearchFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'range';
  options?: Array<{ value: string; label: string }>;
}

interface SmartSearchProps {
  placeholder?: string;
  onSearch: (term: string, filters: Record<string, any>) => void;
  filters?: SearchFilter[];
  suggestions?: string[];
  autoFocus?: boolean;
  minLength?: number;
  debounceMs?: number;
}

export const SmartSearch = memo(function SmartSearch({
  placeholder = 'بحث...',
  onSearch,
  filters = [],
  suggestions = [],
  autoFocus = false,
  minLength = 2,
  debounceMs = 300,
}: SmartSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({});
  const [focusedSuggestion, setFocusedSuggestion] = useState(-1);

  const debouncedSearch = useDebounce(searchTerm, debounceMs);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedSearch.length >= minLength || debouncedSearch.length === 0) {
      onSearch(debouncedSearch, selectedFilters);
    }
  }, [debouncedSearch, selectedFilters, onSearch, minLength]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
    setFocusedSuggestion(-1);
  };

  const handleClear = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    setFocusedSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion, selectedFilters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestion((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedSuggestion >= 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[focusedSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedSuggestion(-1);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...selectedFilters, [key]: value };
    setSelectedFilters(newFilters);
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...selectedFilters };
    delete newFilters[key];
    setSelectedFilters(newFilters);
  };

  const activeFiltersCount = Object.keys(selectedFilters).filter(
    (key) => selectedFilters[key]
  ).length;

  return (
    <div className="relative" dir="rtl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Search size={20} className="text-muted-foreground" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() =>
            setShowSuggestions(searchTerm.length > 0 && filteredSuggestions.length > 0)
          }
          placeholder={placeholder}
          className="w-full pr-10 pl-24 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />

        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searchTerm && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-accent rounded-lg transition-colors"
              title="مسح"
            >
              <X size={18} className="text-muted-foreground" />
            </button>
          )}

          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 rounded-lg transition-colors relative ${
                showFilters ? 'bg-info/10 text-info' : 'hover:bg-accent text-muted-foreground'
              }`}
              title="تصفية"
            >
              <SlidersHorizontal size={18} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-bright text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-right px-4 py-3 hover:bg-accent/50 transition-colors ${
                index === focusedSuggestion ? 'bg-info/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Search size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && filters.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-heading">تصفية متقدمة</h3>
            <button
              onClick={() => setSelectedFilters({})}
              className="text-sm text-primary-bright hover:text-info-dark"
            >
              مسح الكل
            </button>
          </div>

          <div className="space-y-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {filter.label}
                </label>

                {filter.type === 'select' && filter.options && (
                  <div className="relative">
                    <select
                      value={selectedFilters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">الكل</option>
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {selectedFilters[filter.key] && (
                      <button
                        onClick={() => clearFilter(filter.key)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}

                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={selectedFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={`ابحث في ${filter.label}`}
                  />
                )}

                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={selectedFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(selectedFilters)
            .filter(([_, value]) => value)
            .map(([key, value]) => {
              const filter = filters.find((f) => f.key === key);
              if (!filter) return null;

              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-info/10 text-info-dark rounded-full text-sm"
                >
                  <span className="font-medium">{filter.label}:</span>
                  <span>{value}</span>
                  <button
                    onClick={() => clearFilter(key)}
                    className="hover:bg-info/20 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
});
