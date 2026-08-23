import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden transform active:scale-[0.98] hover:-translate-y-0.5 shadow-md hover:shadow-xl gpu-accelerated',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-bright/90 focus:ring-primary-bright',
        secondary: 'bg-teal text-white hover:bg-teal-dark focus:ring-teal-light',
        success: 'bg-success text-white hover:bg-success-dark focus:ring-success',
        danger: 'bg-error text-white hover:bg-error-dark focus:ring-error',
        ghost: 'bg-muted hover:bg-accent text-muted-foreground focus:ring-ring',
        gold: 'bg-gold text-white hover:bg-gold-dark focus:ring-gold shadow-gold',
        outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground',
        'outline-gold': 'bg-transparent border border-gold text-gold-dark hover:bg-gold hover:text-white',
      },
      size: {
        default: 'px-4 py-2 text-sm min-h-[44px]',
        sm: 'px-3 py-1.5 text-xs min-h-[36px]',
        md: 'px-4 py-2 text-sm min-h-[44px]',
        lg: 'px-6 py-3 text-base min-h-[52px]',
        icon: 'w-10 h-10 p-2',
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
  ripple?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  icon,
  disabled,
  className = '',
  ripple = true,
  ...props
}: Readonly<ButtonProps>) {
  const baseClasses = buttonVariants({ variant, size });

  return (
    <button
      className={cn(baseClasses, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} />
      ) : icon ? (
        <span className="flex items-center">{icon}</span>
      ) : null}
      <span className="relative z-10">{children}</span>
      {ripple && (
        <span 
          className="absolute inset-0 overflow-hidden rounded-lg"
          style={{ 
            background: 'radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%), rgba(255,255,255,0.4) 0%, transparent 100%)'
          }}
        />
      )}
    </button>
  );
}

// Export buttonVariants for use in other components
export { buttonVariants };

// زر ميكي تثبيت حجمه
export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: Readonly<Omit<ButtonProps, 'children'> & { icon: ReactNode }>) {
  const sizeClasses: Record<string, string> = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
    icon: 'w-10 h-10 p-2',
    default: 'w-10 h-10 p-2',
  };

  const variantClasses: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-bright/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    success: 'bg-success text-white hover:bg-success/90',
    danger: 'bg-danger text-white hover:bg-danger/90',
    outline: 'border border-border text-foreground hover:bg-accent',
    'outline-gold': 'border border-gold text-gold hover:bg-gold/10',
    ghost: 'bg-transparent text-muted-foreground hover:bg-accent',
    gold: 'bg-gold text-white hover:bg-gold-dark',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50',
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