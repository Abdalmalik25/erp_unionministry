/**
 * ActionButtons — أزرار إجراءات موحّدة للجداول والبطاقات
 * توحيد مظهر أزرار العرض والتعديل والحذف عبر جميع الشاشات
 */

import { ReactNode } from 'react';
import { Eye, Pencil, Trash2, Download, CheckCircle, XCircle, Archive } from 'lucide-react';
import { cn } from './utils';
import { ACTION_BUTTON_STYLES, type ActionType } from './designSystem';

// ============================================================
// الأنواع
// ============================================================

export interface ActionItem {
  type: ActionType;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

interface ActionButtonsProps {
  actions: ActionItem[];
  size?: 'sm' | 'md';
  className?: string;
}

// ============================================================
// أيقونات افتراضية لكل نوع إجراء
// ============================================================

const DEFAULT_ICONS: Record<ActionType, ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  edit: <Pencil className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
  export: <Download className="w-4 h-4" />,
  approve: <CheckCircle className="w-4 h-4" />,
  reject: <XCircle className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
};

// ============================================================
// المكوّن
// ============================================================

export function ActionButtons({ actions, size = 'sm', className }: ActionButtonsProps) {
  const sizeClass = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {actions.map((action, idx) => {
        const style = ACTION_BUTTON_STYLES[action.type];
        const defaultTitle = {
          view: 'عرض',
          edit: 'تعديل',
          delete: 'حذف',
          export: 'تصدير',
          approve: 'اعتماد',
          reject: 'رفض',
          archive: 'أرشفة',
        }[action.type];

        return (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title || defaultTitle}
            className={cn(
              sizeClass,
              style.color,
              style.hover,
              'rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
            )}
          >
            {action.icon || DEFAULT_ICONS[action.type]}
          </button>
        );
      })}
    </div>
  );
}