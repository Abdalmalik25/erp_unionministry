import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from './Button';

interface AdvancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: ReactNode;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

export function AdvancedModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  type = 'default',
  closeOnBackdrop = true,
  showCloseButton = true,
}: AdvancedModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  const typeConfig = {
    default: { bg: 'bg-muted', icon: null, iconColor: '' },
    success: { bg: 'bg-success/10', icon: CheckCircle, iconColor: 'text-success-dark' },
    warning: { bg: 'bg-warning/10', icon: AlertTriangle, iconColor: 'text-warning-dark' },
    error: { bg: 'bg-error/10', icon: AlertCircle, iconColor: 'text-error' },
    info: { bg: 'bg-info/10', icon: Info, iconColor: 'text-info' },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      dir="rtl"
    >
      <div
        className={`bg-card rounded-2xl shadow-2xl max-h-[90vh] w-full ${sizeClasses[size]} flex flex-col animate-in fade-in zoom-in duration-200`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${config.bg} rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            {Icon && <Icon size={24} className={config.iconColor} />}
            <h2 className="text-xl font-bold text-heading">{title}</h2>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// مكون خاص بنوافذ التأكيد
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'error' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AdvancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      type={type}
      closeOnBackdrop={!loading}
      showCloseButton={!loading}
      footer={
        <>
          <Button onClick={onClose} variant="secondary" disabled={loading}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant={type === 'error' ? 'danger' : 'primary'}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-foreground leading-relaxed">{message}</p>
    </AdvancedModal>
  );
}
