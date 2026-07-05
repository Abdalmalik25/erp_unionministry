/**
 * ConfirmDialog — نافذة تأكيد الإجراءات الحرجة
 * مع hook مساعد للاستخدام البرمجي
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Trash2, X, CheckCircle, Info } from 'lucide-react';

// ============================================================
// المكوّن
// ============================================================

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  requireTyping?: string; // اسم السجل الذي يجب كتابته لتأكيد الحذف
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  btnClass: string;
  borderColor: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
    borderColor: 'border-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    btnClass: 'bg-orange-600 hover:bg-orange-700 text-white',
    borderColor: 'border-orange-500',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    btnClass: 'bg-[#1E3A8A] hover:bg-blue-800 text-white',
    borderColor: 'border-blue-500',
  },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
  requireTyping,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const canConfirm = !requireTyping || typedValue === requireTyping;

  // التركيز على زر الإلغاء عند الفتح (أمان)
  useEffect(() => {
    if (open) {
      setTypedValue('');
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  // إغلاق بـ Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }, [onConfirm, canConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full border-t-4 ${config.borderColor}`}>
        <div className="p-6">
          {/* رأس */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 id="confirm-title" className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
            </div>
            <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* حقل التأكيد بالكتابة */}
          {requireTyping && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700 mb-2">
                اكتب <strong className="font-mono">{requireTyping}</strong> للتأكيد:
              </p>
              <input
                type="text"
                value={typedValue}
                onChange={e => setTypedValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canConfirm && handleConfirm()}
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={requireTyping}
                autoFocus
              />
            </div>
          )}

          {/* الأزرار */}
          <div className="flex gap-3">
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.btnClass}`}
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {loading ? 'جارٍ التنفيذ...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Hook مساعد
// ============================================================

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  requireTyping?: string;
}

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean; resolve?: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve?.(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve?.(false);
    setState(null);
  }, [state]);

  const dialog = state ? (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      requireTyping={state.requireTyping}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, dialog };
}
