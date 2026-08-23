/**
 * StatusBadge — شارات الحالة الموحّدة
 * يستخدم نظام التصميم الموحّد (designSystem.ts)
 * لضمان ترابط الألوان عبر جميع الشاشات
 */

import { cn } from './utils';
import { getStatusClasses, translateStatus } from './designSystem';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
  /** ترجمة النص تلقائياً عبر نظام التصميم الموحّد */
  autoTranslate?: boolean;
}

export function StatusBadge({ status, size = 'sm', showDot = false, className, autoTranslate = true }: StatusBadgeProps) {
  const styles = getStatusClasses(status);
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  const label = autoTranslate ? translateStatus(status) : status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full border',
        sizeClass,
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
    >
      {showDot && styles.dot && <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />}
      {label}
    </span>
  );
}