import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from './utils';
import { Search, X, Loader2, ChevronDown } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface TypeaheadOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  [key: string]: unknown;
}

interface TypeaheadProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: TypeaheadOption) => void;
  fetchOptions: (query: string, signal: AbortSignal) => Promise<TypeaheadOption[]>;
  debounceMs?: number;
  minChars?: number;
  maxOptions?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  optionClassName?: string;
  selectedClassName?: string;
  renderOption?: (option: TypeaheadOption, isSelected: boolean) => React.ReactNode;
  renderEmpty?: (query: string) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}

export function Typeahead({
  label,
  placeholder = 'اكتب للبحث...',
  value,
  onChange,
  onSelect,
  fetchOptions,
  debounceMs = 300,
  minChars = 2,
  maxOptions = 50,
  disabled = false,
  required = false,
  error,
  description,
  className,
  inputClassName,
  listClassName,
  optionClassName,
  selectedClassName,
  renderOption,
  renderEmpty,
  renderLoading,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  id = `typeahead-${Math.random().toString(36).slice(2, 9)}`,
  name,
  autoComplete = 'off',
}: TypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<TypeaheadOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [activeQuery, setActiveQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(value, debounceMs);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!query || query.length < minChars) {
      setOptions([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetch = async () => {
      setLoading(true);
      try {
        const results = await fetchOptions(query, abortControllerRef.current.signal);
        if (isMountedRef.current && query === debouncedQuery.trim()) {
          setOptions(results.slice(0, maxOptions));
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isMountedRef.current) {
          setOptions([]);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetch();
  }, [debouncedQuery, fetchOptions, minChars, maxOptions]);

  useEffect(() => {
    if (isOpen && options.length > 0) {
      setSelectedIndex(0);
      setFocusedIndex(0);
    } else {
      setSelectedIndex(-1);
      setFocusedIndex(-1);
    }
  }, [isOpen, options.length]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setActiveQuery(e.target.value);
      setIsOpen(true);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || options.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && options[focusedIndex]) {
            onSelect(options[focusedIndex]);
            onChange(options[focusedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'Tab':
          if (focusedIndex >= 0 && options[focusedIndex]) {
            e.preventDefault();
            onSelect(options[focusedIndex]);
            onChange(options[focusedIndex].value);
          }
          setIsOpen(false);
          break;
      }
    },
    [isOpen, options, focusedIndex, onSelect, onChange]
  );

  const handleOptionClick = useCallback(
    (option: TypeaheadOption) => {
      onSelect(option);
      onChange(option.value);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onSelect, onChange]
  );

  const handleClear = useCallback(() => {
    onChange('');
    setActiveQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  const optionId = `${id}-option`;
  const listboxId = `${id}-listbox`;

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
          {label} {required && <span className="text-error" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" aria-hidden />
          {loading && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" aria-hidden />}
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (debouncedQuery.trim().length >= minChars) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            aria-label={ariaLabel}
            aria-describedby={cn(ariaDescribedBy, description ? `${id}-desc` : '', error ? `${id}-error` : '', options.length > 0 ? listboxId : '')}
            aria-expanded={isOpen && options.length > 0}
            aria-controls={isOpen && options.length > 0 ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={focusedIndex >= 0 ? `${optionId}-${focusedIndex}` : undefined}
            className={cn(
              'w-full pr-10 pl-4 py-3 rounded-xl border-2 transition-colors',
              'bg-white/90 backdrop-blur-sm placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red/20'
                : 'border-slate-200 hover:border-slate-300',
              inputClassName
            )}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute left-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="مسح القيمة"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {description && !error && (
          <p id={`${id}-desc`} className="mt-1.5 text-xs text-slate-500">
            {description}
          </p>
        )}

        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600 flex items-center gap-1" role="alert">
            <X className="w-3.5 h-3.5" />
            {error}
          </p>
        )}

        {isOpen && (
          <div className="absolute z-50 w-full mt-1.5" role="listbox" id={listboxId} aria-label="اقتراحات البحث">
            <ul
              ref={listRef}
              className={cn(
                'bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden',
                'max-h-60 overflow-y-auto scrollbar-formal',
                listClassName
              )}
              role="listbox"
            >
              {loading ? (
                <li className="px-4 py-6 text-center text-slate-500 flex items-center justify-center gap-2" role="option" aria-disabled="true">
                  {renderLoading ? renderLoading() : (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري البحث...
                    </>
                  )}
                </li>
              ) : options.length === 0 ? (
                <li className="px-4 py-6 text-center text-slate-500" role="option" aria-disabled="true">
                  {renderEmpty ? renderEmpty(value) : (
                    <>
                      <Search className="w-5 h-5 mx-auto mb-2 text-slate-300" />
                      لا توجد نتائج مطابقة لـ «{value}»
                    </>
                  )}
                </li>
              ) : (
                options.map((option, index) => {
                  const isFocused = index === focusedIndex;
                  const isSelected = index === selectedIndex;
                  return (
                    <li
                      key={option.value}
                      id={`${optionId}-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled}
                      onClick={() => handleOptionClick(option)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={cn(
                        'px-4 py-3 cursor-pointer transition-colors',
                        'hover:bg-slate-50 dark:hover:bg-gray-700/50',
                        'first:rounded-t-xl last:rounded-b-xl',
                        isFocused && 'bg-primary/5 text-primary',
                        isSelected && 'bg-primary/10 text-primary font-medium',
                        option.disabled && 'opacity-50 cursor-not-allowed text-slate-400',
                        optionClassName
                      )}
                    >
                      {renderOption ? (
                        renderOption(option, isSelected)
                      ) : (
                        <div className="flex items-center gap-3">
                          {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                          <div className="flex-1 min-w-0 text-right">
                            <span className={cn('font-medium truncate block', isSelected ? 'text-primary' : 'text-slate-900 dark:text-white')}>
                              {option.label}
                            </span>
                            {option.description && (
                              <span className="text-xs text-slate-500 truncate block mt-0.5">{option.description}</span>
                            )}
                          </div>
                          {isSelected && <ChevronDown className="w-4 h-4 text-primary flex-shrink-0" />}
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Typeahead;