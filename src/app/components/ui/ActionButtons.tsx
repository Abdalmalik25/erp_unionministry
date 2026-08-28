/**
 * ActionButtons — أزرار إجراءات موحّدة للجداول والبطاقات
 * توحيد مظهر أزرار العرض والتعديل والحذف عبر جميع الشاشات
 */

import { ReactNode } from 'react';
import { Eye, Pencil, Trash2, Download, CheckCircle, XCircle, Archive } from 'lucide-react';
import { cn } from './utils';
import { ACTION_BUTTON_STYLES, ACTION_LABELS, type ActionType } from './designSystem';

// ============================================================
// الأنواع
// ============================================================

export interface ActionItem {
  type: ActionType;
  onClick?: () => void;
  /** وصف مساعد (يُستخدم كأداة توضيح + aria-label) */
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
  view: <Eye className="w-4 h-4" aria-hidden />,
  edit: <Pencil className="w-4 h-4" aria-hidden />,
  delete: <Trash2 className="w-4 h-4" aria-hidden />,
  export: <Download className="w-4 h-4" aria-hidden />,
  approve: <CheckCircle className="w-4 h-4" aria-hidden />,
  reject: <XCircle className="w-4 h-4" aria-hidden />,
  archive: <Archive className="w-4 h-4" aria-hidden />,
};

// ============================================================
// المكوّن — مناطق لمس ≥ 36px + تركيز واضح + وصف صوتي
// ============================================================

export function ActionButtons({ actions, size = 'sm', className }: ActionButtonsProps) {
  // sm = 36px في الجداول الكثيفة، md = 44px (معيار اللمس)
  const touchClass = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const iconWrapClass = 'inline-flex items-center justify-center flex-shrink-0';

  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label="إجراءات السجل">
      {actions.map((action, idx) => {
        const style = ACTION_BUTTON_STYLES[action.type];
        const label = action.title || ACTION_LABELS[action.type];

        return (
          <button
            key={idx}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={label}
            title={label}
            className={cn(
              touchClass,
              iconWrapClass,
              style.color,
              style.hover,
              style.active,
              'rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none'
            )}
          >
            {action.icon || DEFAULT_ICONS[action.type]}
          </button>
        );
      })}
    </div>
  );
}