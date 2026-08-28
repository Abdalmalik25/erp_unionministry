/**
 * Simple Select Component - قائمة منسدلة بسيطة
 * المنظومة الوطنية لإدارة قطاع العمل — وزارة الشؤون الاجتماعية والعمل
 */

import { forwardRef, useId } from 'react';
import { cn } from './utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SimpleSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  containerClassName?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const SimpleSelect = forwardRef<HTMLSelectElement, SimpleSelectProps>(
  ({ label, helperText, error, options, containerClassName, className, onChange, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;
    const helperId = useId();
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e);
    };

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error ms-1" aria-hidden>*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? helperId : undefined}
            className={cn(
              'w-full px-4 py-2.5 text-base min-h-[44px] border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input-background',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright',
              'disabled:bg-muted disabled:cursor-not-allowed appearance-none pe-10',
              error && 'border-error focus:ring-error',
              className
            )}
            onChange={handleChange}
            {...props}
          >
            <option value="">اختر...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* سهم القائمة الموحّد */}
          <svg
            className="pointer-events-none absolute inset-y-0 end-3 my-auto w-4 h-4 text-muted-foreground"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        {helperText && !error && (
          <span id={helperId} className="text-xs text-muted-foreground">{helperText}</span>
        )}
        {error && (
          <span id={helperId} role="alert" className="text-xs text-error">{error}</span>
        )}
      </div>
    );
  }
);

SimpleSelect.displayName = 'SimpleSelect';

export default SimpleSelect;