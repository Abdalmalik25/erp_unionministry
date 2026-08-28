import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative select-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-dark focus-visible:ring-primary-bright',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:bg-secondary/90 focus-visible:ring-ring',
        success: 'bg-success text-white hover:bg-success-dark focus-visible:ring-success',
        danger: 'bg-error text-white hover:bg-error-dark focus-visible:ring-error',
        ghost: 'bg-transparent hover:bg-accent text-foreground focus-visible:ring-ring',
        gold: 'bg-gold text-primary-dark hover:bg-gold-dark focus-visible:ring-gold',
        outline: 'bg-transparent border border-primary/40 text-primary-bright hover:bg-primary/10 dark:hover:bg-primary/20 focus-visible:ring-ring',
        'outline-gold': 'bg-transparent border border-gold/60 text-gold-dark dark:text-gold-light hover:bg-gold/10 focus-visible:ring-gold',
      },
      size: {
        default: 'px-4 py-2 text-sm min-h-[44px]',
        sm: 'px-3 py-1.5 text-xs min-h-[36px]',
        md: 'px-4 py-2 text-sm min-h-[44px]',
        lg: 'px-6 py-3 text-base min-h-[52px]',
        icon: 'w-11 h-11 p-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  icon,
  disabled,
  className = '',
  type = 'button',
  ...props
}: Readonly<ButtonProps>) {
  const baseClasses = buttonVariants({ variant, size });

  return (
    <button
      type={type}
      className={cn(baseClasses, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} className="animate-spin shrink-0" aria-hidden />
      ) : icon ? (
        <span className="flex items-center shrink-0" aria-hidden>{icon}</span>
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

// Export buttonVariants for use in other components
export { buttonVariants };

// زر أيقونة موحّد الحجم
export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  ...props
}: Readonly<Omit<ButtonProps, 'children'> & { icon: ReactNode; 'aria-label'?: string }>) {
  const sizeClasses: Record<string, string> = {
    sm: 'w-9 h-9 p-1.5',
    md: 'w-11 h-11 p-2',
    lg: 'w-12 h-12 p-2.5',
    icon: 'w-11 h-11 p-2',
    default: 'w-11 h-11 p-2',
  };

  const variantClasses: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-dark',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    success: 'bg-success text-white hover:bg-success-dark',
    danger: 'bg-error text-white hover:bg-error-dark',
    outline: 'border border-border text-foreground hover:bg-accent',
    'outline-gold': 'border border-gold/60 text-gold-dark dark:text-gold-light hover:bg-gold/10',
    ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
    gold: 'bg-gold text-primary-dark hover:bg-gold-dark',
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant ?? 'ghost'],
        sizeClasses[size ?? 'md'],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}