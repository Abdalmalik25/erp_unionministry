import { ReactNode } from 'react';
import { Button } from './Button';
interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    variant?: 'default' | 'gold' | 'glass' | 'elevated';
    clickable?: boolean;
}
export function Card({ children, className = '', hover = false, padding = 'md', variant = 'default', clickable = false }: CardProps) {
    const paddingClasses = {
        none: '',
        sm: 'p-4 sm:p-5',
        md: 'p-5 sm:p-6',
        lg: 'p-6 sm:p-8',
    };
    const variantClasses = {
        default: 'bg-card border border-border rounded-xl sm:rounded-2xl',
        gold: 'bg-gradient-to-br from-gold-light/25 to-card border-2 border-gold/30 rounded-xl sm:rounded-2xl shadow-gold gpu-accelerated',
        glass: 'glass-formal rounded-xl sm:rounded-2xl gpu-accelerated',
        elevated: 'bg-card border-0 rounded-xl sm:rounded-2xl shadow-xl',
    };
    const hoverClasses = hover || clickable
        ? 'hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer'
        : '';
    return (<div className={`
        ${variantClasses[variant]} 
        ${paddingClasses[padding]} 
        ${hoverClasses}
        ${className}
      `}>
      {children}
    </div>);
}
interface StatsCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    iconBg?: string;
    iconColor?: string;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    variant?: 'primary' | 'gold' | 'teal' | 'success';
}
export function StatsCard({ title, value, icon, iconBg = 'bg-primary/10', iconColor = 'text-primary', trend, variant = 'primary' }: StatsCardProps) {
    return (<Card hover variant={variant === 'gold' ? 'gold' : 'elevated'} padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className={`
          p-3 sm:p-4 rounded-xl sm:rounded-2xl w-fit 
          ${variant === 'gold' ? 'bg-gold/10' : iconBg}
        `}>
          <div className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`}>{icon}</div>
        </div>
        <span className="text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className={`text-2xl sm:text-3xl font-bold mb-1 ${variant === 'gold' ? 'text-gold-dark' : 'text-heading'}`}>
        {value}
      </div>
      {trend && (<div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className={`
            flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full
            ${trend.isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}
          `}>
            {trend.isPositive ? '↑' : '↓'}
          </span>
          <span className={trend.isPositive ? 'text-success' : 'text-error'}>
            {trend.value}
          </span>
        </div>)}
    </Card>);
}
// بطاقة متقدمة مثل Vuetify Cards
interface AdvancedCardProps extends CardProps {
    title?: string;
    subtitle?: string;
    action?: ReactNode;
    elevation?: 0 | 1 | 2 | 3 | 4;
    flat?: boolean;
}
export function AdvancedCard({ children, className = '', title, subtitle, action, elevation = 1, flat = false, ...props }: AdvancedCardProps) {
    const elevationClasses = {
        0: 'shadow-none',
        1: 'shadow-md',
        2: 'shadow-lg',
        3: 'shadow-xl',
        4: 'shadow-2xl',
    };
    return (<div className={`
        bg-card rounded-xl sm:rounded-2xl border border-border
        ${flat ? '' : elevationClasses[elevation]}
        ${props.hover ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer' : ''}
        gpu-accelerated ${className}
      `}>
      {(title || action) && (<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 sm:p-5 border-b border-border">
          <div>
            {title && <h3 className="text-lg sm:text-xl font-bold text-heading">{title}</h3>}
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>)}
      <div className="p-4 sm:p-5">{children}</div>
    </div>);
}
// بطاقة مستوى (Tiered)
interface TieredCardProps {
    title: string;
    price: string;
    features: string[];
    highlighted?: boolean;
    onSelect?: () => void;
}
export function TieredCard({ title, price, features, highlighted = false, onSelect }: TieredCardProps) {
    return (<Card variant={highlighted ? 'gold' : 'elevated'} className={`text-center ${highlighted ? 'scale-105' : ''} transition-transform duration-300`} padding="lg">
      <h3 className={`text-xl sm:text-2xl font-bold mb-3 ${highlighted ? 'text-gold-dark' : 'text-heading'}`}>
        {title}
      </h3>
      <div className={`text-3xl sm:text-4xl font-extrabold mb-4 ${highlighted ? 'text-gold' : 'text-primary'}`}>
        {price}
      </div>
      <ul className="space-y-2 mb-6 text-start">
        {features.map((feature, index) => (<li key={index} className="flex items-start gap-2 text-sm">
            <span className={`
              w-4 h-4 sm:w-5 sm:h-5 rounded-full flex-shrink-0
              flex items-center justify-center mt-0.5
              ${highlighted ? 'bg-gold/10 text-gold' : 'bg-primary/10 text-primary'}
            `}>
              ✓
            </span>
            <span className="text-muted">{feature}</span>
          </li>))}
      </ul>
      <Button variant={highlighted ? 'gold' : 'primary'} className="w-full" onClick={onSelect}>
        اختر
      </Button>
    </Card>);
}
