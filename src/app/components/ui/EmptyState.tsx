/**
 * EmptyState — حالة فارغة موحّدة
 * تُستخدم في جميع شاشات النظام عند عدم وجود بيانات
 * لضمان تجربة مستخدم متناسقة
 */

import { ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';
import { cn } from './utils';
import { useEmptyState } from '../../hooks/useI18n';

interface EmptyStateProps {
  /** مفتاح الترجمة للعنوان (اختياري) — افتراضي: emptyState.noDataTitle */
  titleKey?: string;
  /** عنوان صريح (يتجاوز المفتاح) */
  title?: string;
  /** مفتاح الترجمة للوصف (اختياري) — افتراضي: emptyState.noDataDesc */
  descriptionKey?: string;
  /** وصف صريح (يتجاوز المفتاح) */
  description?: string;
  /** أيقونة مخصصة (اختياري) — يُفضَّل أن تكون سياقية للشاشة */
  icon?: ReactNode;
  /** إجراء إضافي (زر) */
  action?: ReactNode;
  /** حجم الحالة */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  titleKey = 'emptyState.noDataTitle',
  title,
  descriptionKey = 'emptyState.noDataDesc',
  description,
  icon,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const { t } = useEmptyState();

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
  const resolvedTitle = title || t(titleKey);
  const resolvedDescription = description || (descriptionKey ? t(descriptionKey) : undefined);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        s.container,
        'px-4',
        className
      )}
    >
      <div className={cn('mb-4 text-muted-foreground/70', s.icon)} aria-hidden>
        <FolderOpen className={cn('w-full h-full', s.icon.replace('w-', '').replace('h-', ''))} />
      </div>
      <h3 className={cn('font-bold text-muted-foreground mb-1', s.title)}>{resolvedTitle}</h3>
      {resolvedDescription && (
        <p className={cn('text-muted-foreground mb-4 max-w-md', s.description)}>{resolvedDescription}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}