/**
 * Card Primitive — Accessible, performant, RTL-aware container
 * WCAG 2.1 AA compliant
 */
import * as React from 'react';
import { forwardRef, useMemo } from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass' | 'flat' | 'gradient';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  interactive?: boolean;
  loading?: boolean;
  asChild?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-white border border-slate-200 shadow-sm',
  elevated: 'bg-white shadow-lg hover:shadow-xl transition-shadow duration-300',
  outlined: 'bg-transparent border-2 border-slate-300 hover:border-slate-400 transition-colors',
  glass: 'bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl',
  flat: 'bg-slate-50 border border-slate-100',
  gradient: 'bg-gradient-to-br from-white via-slate-50 to-amber-50 border border-slate-200 shadow-md',
};

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 md:p-7',
  xl: 'p-8 md:p-10',
};

const radiusClasses: Record<CardRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-3xl',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      radius = 'xl',
      interactive = false,
      loading = false,
      asChild = false,
      ariaLabel,
      ariaDescribedBy,
      className = '',
      children,
      ...props
    },
    ref
  ): React.ReactElement => {
    const classes = useMemo(() => {
      const base = 'relative overflow-hidden';
      const variantCls = variantClasses[variant];
      const paddingCls = paddingClasses[padding];
      const radiusCls = radiusClasses[radius];
      const interactiveCls = interactive
        ? 'cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2'
        : '';
      return [base, variantCls, paddingCls, radiusCls, interactiveCls, className]
        .filter(Boolean)
        .join(' ');
    }, [variant, padding, radius, interactive, className]);

    const Comp = asChild ? 'div' : 'div';

    return (
      <Comp
        ref={ref}
        className={classes}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading || undefined}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        onKeyDown={
          interactive
            ? (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  props.onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : props.onKeyDown
        }
        {...props}
      >
        {loading ? (
          <div
            className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}
        {children}
      </Comp>
    );
  }
);
Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className = '', children, ...props }, ref): React.ReactElement => (
    <div
      ref={ref}
      className={`flex items-start justify-between gap-4 mb-4 ${className}`}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {title ? (
          <h3 className="text-lg font-semibold text-slate-900 truncate">{title}</h3>
        ) : null}
        {subtitle ? (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        ) : null}
        {children}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref): React.ReactElement => (
    <div ref={ref} className={`text-slate-700 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref): React.ReactElement => (
    <div
      ref={ref}
      className={`mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export default Card;
