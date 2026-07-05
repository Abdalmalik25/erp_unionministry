/**
 * Smart Search - بحث ذكي متقدم
 * بحث في الوقت الفعلي مع اقتراحات وتصفية متقدمة
 */

import { useState, useEffect, useRef, memo } from 'react';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';
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
          <Search size={20} className="text-gray-400" />
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
          className="w-full pr-10 pl-24 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />

        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searchTerm && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="مسح"
            >
              <X size={18} className="text-gray-500" />
            </button>
          )}

          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 rounded-lg transition-colors relative ${
                showFilters ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="تصفية"
            >
              <SlidersHorizontal size={18} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
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
          className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors ${
                index === focusedSuggestion ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Search size={16} className="text-gray-400" />
                <span className="text-sm text-gray-700">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && filters.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">تصفية متقدمة</h3>
            <button
              onClick={() => setSelectedFilters({})}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              مسح الكل
            </button>
          </div>

          <div className="space-y-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>

                {filter.type === 'select' && filter.options && (
                  <div className="relative">
                    <select
                      value={selectedFilters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`ابحث في ${filter.label}`}
                  />
                )}

                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={selectedFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  <span className="font-medium">{filter.label}:</span>
                  <span>{value}</span>
                  <button
                    onClick={() => clearFilter(key)}
                    className="hover:bg-blue-100 rounded-full p-0.5"
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
