import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from './utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** نص وصفي اختياري لقراء الشاشة */
  description?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  description,
}: ModalProps) {
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current;
  const descId = useRef(description ? `modal-desc-${Math.random().toString(36).slice(2, 9)}` : undefined).current;
  const closeRef = useRef<HTMLButtonElement>(null);

  // قفل تمرير الصفحة + التقاط مفتاح Escape + إعادة التركيز
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // نقل التركيز إلى زر الإغلاق عند الفتح (آمن)
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(t);
      prevFocus?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn('bg-card rounded-2xl shadow-xl', sizeClasses[size], 'w-full max-h-[90vh] overflow-hidden animate-scale-in')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-bold text-heading truncate">{title}</h2>
            {description && (
              <p id={descId} className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={20} className="text-muted-foreground" aria-hidden />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
