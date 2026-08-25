/**
 * Simple Select Component - قائمة منسدلة بسيطة
 * المنظومة الوطنية لإدارة قطاع العمل — وزارة الشؤون الاجتماعية والعمل
 */

import { forwardRef } from 'react';
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
  ({ label, helperText, error, options, containerClassName, className, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e);
    };

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error mr-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input-background',
            'disabled:bg-muted disabled:cursor-not-allowed',
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
        {helperText && !error && (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        )}
        {error && (
          <span className="text-xs text-error">{error}</span>
        )}
      </div>
    );
  }
);

SimpleSelect.displayName = 'SimpleSelect';

export default SimpleSelect;