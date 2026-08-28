import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function Toast({ 
  message, 
  type, 
  duration = 5000, 
  onClose,
  position = 'top-right' 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" aria-hidden />,
    error: <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-error" aria-hidden />,
    warning: <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" aria-hidden />,
    info: <Info className="w-5 h-5 sm:w-6 sm:h-6 text-primary" aria-hidden />,
  };

  const positionClasses = {
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
  };

  const role = type === 'error' || type === 'warning' ? 'alert' : 'status';
  const live = type === 'error' || type === 'warning' ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={live}
      className={`fixed z-50 flex items-center gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-300 animate-fade-in
        ${positionClasses[position]}
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}`}
      dir="rtl"
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <p className="text-sm sm:text-base font-medium flex-1 leading-tight">{message}</p>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="flex-shrink-0 p-1.5 hover:bg-black/5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
      </button>
    </div>
  );
}

// Toast Manager Hook
let toastId = 0;
const toastListeners: Set<(toast: any) => void> = new Set();

export function useToast() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const listener = (toast: any) => {
      setToasts((prev) => [...prev, toast]);
    };

    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    removeToast,
  };
}

export const toast = {
  success: (message: string, options?: { duration?: number; position?: ToastProps['position'] }) => {
    const id = toastId++;
    const toastData = { id, message, type: 'success' as ToastType, ...options };
    toastListeners.forEach((listener) => listener(toastData));
  },
  error: (message: string, options?: { duration?: number; position?: ToastProps['position'] }) => {
    const id = toastId++;
    const toastData = { id, message, type: 'error' as ToastType, ...options };
    toastListeners.forEach((listener) => listener(toastData));
  },
  warning: (message: string, options?: { duration?: number; position?: ToastProps['position'] }) => {
    const id = toastId++;
    const toastData = { id, message, type: 'warning' as ToastType, ...options };
    toastListeners.forEach((listener) => listener(toastData));
  },
  info: (message: string, options?: { duration?: number; position?: ToastProps['position'] }) => {
    const id = toastId++;
    const toastData = { id, message, type: 'info' as ToastType, ...options };
    toastListeners.forEach((listener) => listener(toastData));
  },
};
