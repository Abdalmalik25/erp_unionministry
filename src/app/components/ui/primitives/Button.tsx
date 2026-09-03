/**
 * Button.tsx — مكوّن الزر الأساسي المعتمد على WCAG 2.1 AA
 * World-Class Accessible Button Component
 */

import React, { forwardRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger' 
  | 'success'
  | 'gradient';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md focus-visible:ring-amber-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 focus-visible:ring-slate-500',
  outline: 'bg-transparent hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 focus-visible:ring-slate-500',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-500',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md focus-visible:ring-red-500',
  success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md focus-visible:ring-emerald-500',
  gradient: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl focus-visible:ring-amber-500',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  xl: 'h-14 px-8 text-lg gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ariaLabel,
  onClick,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled && onClick) {
      onClick(e);
    }
  }, [isDisabled, onClick]);
  
  const { onKeyDown } = props;
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Enter and Space are handled natively for buttons
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isDisabled) {
        e.currentTarget.click();
      }
    }
    onKeyDown?.(e);
  }, [isDisabled, onKeyDown]);
  
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex items-center justify-center
        font-semibold rounded-xl
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        select-none
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${loading ? 'cursor-wait' : 'active:scale-[0.98]'}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <Loader2 className="absolute inset-0 m-auto w-5 h-5 animate-spin" />
      )}
      <span className={`inline-flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>
        {icon && iconPosition === 'left' && icon}
        {loading && loadingText ? loadingText : children}
        {icon && iconPosition === 'right' && icon}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
