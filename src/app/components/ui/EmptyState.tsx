/**
 * EmptyState — حالة فارغة موحّدة
 * تُستخدم في جميع شاشات النظام عند عدم وجود بيانات
 * لضمان تجربة مستخدم متناسقة
 */

import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from './utils';

interface EmptyStateProps {
  /** نص العنوان الرئيسي */
  title?: string;
  /** نص توضيحي إضافي */
  description?: string;
  /** أيقونة مخصصة (اختياري) */
  icon?: ReactNode;
  /** إجراء إضافي (زر) */
  action?: ReactNode;
  /** حجم الحالة */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  title = 'لا توجد بيانات',
  description,
  icon,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-10 h-10',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      container: 'py-16',
      icon: 'w-14 h-14',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-24',
      icon: 'w-20 h-20',
      title: 'text-2xl',
      description: 'text-base',
    },
  };

  const s = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        s.container,
        'px-4',
        className
      )}
    >
      <div className={cn('mb-4 text-muted-foreground/70', s.icon)}>
        {icon || <Inbox className="w-full h-full" />}
      </div>
      <h3 className={cn('font-bold text-muted-foreground mb-1', s.title)}>{title}</h3>
      {description && (
        <p className={cn('text-muted-foreground mb-4 max-w-md', s.description)}>{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}