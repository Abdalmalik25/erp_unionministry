import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef, useId } from 'react';
import { cn } from './utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, containerClassName, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const helperId = useId();

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error ms-1" aria-hidden>*</span>}
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
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? helperId : undefined}
            className={cn(
              'w-full px-4 py-2.5 text-base min-h-[44px] text-foreground bg-input-background border border-border rounded-lg',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:border-primary-bright',
              'placeholder:text-muted-foreground disabled:bg-muted disabled:cursor-not-allowed',
              'transition-colors duration-200',
              icon && 'ps-10',
              error && 'border-error focus-visible:ring-error focus-visible:border-error',
              className
            )}
            {...props}
          />
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

Input.displayName = 'Input';

// TextArea component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, containerClassName, className, id, ...props }, ref) => {
    const autoId = useId();
    const textareaId = id || autoId;
    const helperId = useId();

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error ms-1" aria-hidden>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? helperId : undefined}
          className={cn(
            'w-full px-4 py-2.5 text-base text-foreground bg-input-background border border-border rounded-lg',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:border-primary-bright',
            'placeholder:text-muted-foreground disabled:bg-muted disabled:cursor-not-allowed',
            'resize-y min-h-[100px] transition-colors duration-200',
            error && 'border-error focus-visible:ring-error focus-visible:border-error',
            className
          )}
          {...props}
        />
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
  ({ label, helperText, error, options, containerClassName, className, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id || autoId;
    const helperId = useId();

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
              'w-full px-4 py-2.5 text-base min-h-[44px] text-foreground bg-input-background border border-border rounded-lg',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:border-primary-bright',
              'disabled:bg-muted disabled:cursor-not-allowed',
              'transition-colors duration-200 appearance-none pe-10',
              error && 'border-error focus-visible:ring-error focus-visible:border-error',
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

Select.displayName = 'Select';

