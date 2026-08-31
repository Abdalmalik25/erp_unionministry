/**
 * Input Primitive — Accessible form input with WCAG 2.1 AA compliance
 * Supports text, email, password, number, tel, url, search with icon, validation states
 */
import * as React from 'react';
import { forwardRef, useId, useState, useCallback, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, X } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'flushed' | 'unstyled';
export type InputState = 'default' | 'error' | 'success' | 'warning';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  description?: string;
  size?: InputSize;
  variant?: InputVariant;
  state?: InputState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  showPasswordToggle?: boolean;
  loading?: boolean;
  required?: boolean;
  optional?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  hideLabel?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-9 text-sm px-3',
  md: 'h-11 text-base px-4',
  lg: 'h-13 text-lg px-5',
};

const variantClasses: Record<InputVariant, string> = {
  default:
    'border border-slate-300 bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200',
  filled:
    'border border-transparent bg-slate-100 focus-within:bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200',
  flushed:
    'border-0 border-b-2 border-slate-300 rounded-none bg-transparent focus-within:border-amber-500 px-0',
  unstyled: 'border-0 bg-transparent focus:outline-none',
};

const stateClasses: Record<InputState, string> = {
  default: '',
  error: 'border-red-500 focus-within:border-red-500 focus-within:ring-red-200',
  success: 'border-emerald-500 focus-within:border-emerald-500 focus-within:ring-emerald-200',
  warning: 'border-amber-500 focus-within:border-amber-500 focus-within:ring-amber-200',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorText,
      successText,
      description,
      size = 'md',
      variant = 'default',
      state = 'default',
      leftIcon,
      rightIcon,
      clearable = false,
      showPasswordToggle = false,
      loading = false,
      required = false,
      optional = false,
      containerClassName = '',
      labelClassName = '',
      hideLabel = false,
      className = '',
      type = 'text',
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      disabled,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ): React.ReactElement => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');
    const descId = `${inputId}-desc`;

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const isPassword = type === 'password';
    const effectiveType = isPassword && showPassword ? 'text' : type;

    const effectiveState: InputState = errorText ? 'error' : state;

    const containerClasses = useMemo(() => {
      const base =
        'relative flex items-center w-full rounded-lg transition-all duration-200';
      const sizeCls = variant === 'flushed' ? '' : sizeClasses[size];
      const variantCls = variantClasses[variant];
      const stateCls = stateClasses[effectiveState];
      const disabledCls = disabled ? 'opacity-50 cursor-not-allowed' : '';
      return [base, sizeCls, variantCls, stateCls, disabledCls, className]
        .filter(Boolean)
        .join(' ');
    }, [size, variant, effectiveState, disabled, className]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) setInternalValue(e.target.value);
        onChange?.(e);
      },
      [isControlled, onChange]
    );

    const handleClear = useCallback(() => {
      if (!isControlled) setInternalValue('');
      const event = {
        target: { value: '', name: props.name },
        currentTarget: { value: '', name: props.name },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(event);
    }, [isControlled, onChange, props.name]);

    const describedBy =
      [
        ariaDescribedBy,
        helperText ? helperId : null,
        errorText ? errorId : null,
        description ? descId : null,
      ]
        .filter(Boolean)
        .join(' ') || undefined;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && !hideLabel ? (
          <label
            htmlFor={inputId}
            className={`block mb-1.5 text-sm font-medium text-slate-700 ${labelClassName}`}
          >
            {label}
            {required ? (
              <span className="text-red-500 ms-1" aria-hidden="true">
                *
              </span>
            ) : null}
            {optional ? (
              <span className="text-slate-400 text-xs font-normal ms-2">(اختياري)</span>
            ) : null}
          </label>
        ) : null}

        <div className={containerClasses}>
          {leftIcon ? (
            <span
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            value={currentValue}
            onChange={handleChange}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            disabled={disabled}
            required={required}
            aria-invalid={effectiveState === 'error' || undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            aria-busy={loading || undefined}
            className={`
              w-full bg-transparent border-0 outline-none
              placeholder:text-slate-400
              disabled:cursor-not-allowed
              ${leftIcon ? 'ps-10' : ''}
              ${rightIcon || clearable || showPasswordToggle || loading || successText ? 'pe-10' : ''}
              ${className}
            `}
            {...props}
          />

          <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {loading ? (
              <span
                className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
            ) : null}

            {!loading && clearable && currentValue && !disabled ? (
              <button
                type="button"
                onClick={handleClear}
                aria-label="مسح"
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                tabIndex={0}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : null}

            {!loading && isPassword && showPasswordToggle ? (
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                tabIndex={0}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            ) : null}

            {!loading && rightIcon ? (
              <span className="text-slate-400" aria-hidden="true">
                {rightIcon}
              </span>
            ) : null}

            {!loading && !rightIcon && effectiveState === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
            ) : null}

            {!loading && !rightIcon && effectiveState === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            ) : null}
          </div>
        </div>

        {helperText && !errorText ? (
          <p id={helperId} className="mt-1.5 text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}

        {description && !errorText ? (
          <p id={descId} className="mt-1.5 text-xs text-slate-500">
            {description}
          </p>
        ) : null}

        {errorText ? (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-xs text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{errorText}</span>
          </p>
        ) : null}

        {successText && !errorText ? (
          <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{successText}</span>
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  state?: InputState;
  containerClassName?: string;
  hideLabel?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      errorText,
      state = 'default',
      containerClassName = '',
      hideLabel = false,
      required = false,
      className = '',
      id,
      ...props
    },
    ref
  ): React.ReactElement => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const effectiveState: InputState = errorText ? 'error' : state;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && !hideLabel ? (
          <label
            htmlFor={inputId}
            className="block mb-1.5 text-sm font-medium text-slate-700"
          >
            {label}
            {required ? (
              <span className="text-red-500 ms-1" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={effectiveState === 'error' || undefined}
          aria-describedby={errorText ? errorId : helperText ? helperId : undefined}
          className={`
            w-full rounded-lg border bg-white px-4 py-3 text-base
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-y min-h-[100px]
            ${stateClasses[effectiveState]}
            ${className}
          `}
          {...props}
        />

        {errorText ? (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-xs text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{errorText}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="mt-1.5 text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export default Input;
