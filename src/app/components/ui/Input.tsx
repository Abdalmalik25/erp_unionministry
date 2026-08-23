import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from './utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none ps-3 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-2.5 text-base text-foreground bg-input-background border border-border rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-primary-bright focus:border-primary-bright',
              'placeholder:text-muted-foreground disabled:bg-muted disabled:cursor-not-allowed',
              'transition-all duration-200',
              icon && 'ps-10',
              error && 'border-error focus:ring-error focus:border-error',
              className
            )}
            {...props}
          />
        </div>
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

Input.displayName = 'Input';

// TextArea component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 text-base text-foreground bg-input-background border border-border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary-bright focus:border-primary-bright',
            'placeholder:text-muted-foreground disabled:bg-muted disabled:cursor-not-allowed',
            'resize-y min-h-[100px] transition-all duration-200',
            error && 'border-error focus:ring-error focus:border-error',
            className
          )}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

// ============================================
// Select Component - مكوّن القائمة المنسدلة
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, containerClassName, className, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 text-base text-foreground bg-input-background border border-border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary-bright focus:border-primary-bright',
            'disabled:bg-muted disabled:cursor-not-allowed',
            'transition-all duration-200 appearance-none',
            error && 'border-error focus:ring-error focus:border-error',
            className
          )}
          {...props}
        >
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

Select.displayName = 'Select';

