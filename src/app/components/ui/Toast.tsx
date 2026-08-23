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
    success: <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />,
    error: <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-error" />,
    warning: <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />,
    info: <Info className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />,
  };

  const positionClasses = {
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
  };

  return (
    <div
      className={`fixed z-50 flex items-center gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xl backdrop-blur-sm transition-all duration-300 animate-fadeIn
        ${positionClasses[position]}
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}`}
      dir="rtl"
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <p className="text-sm sm:text-base font-medium flex-1 leading-tight">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="flex-shrink-0 p-1 sm:p-1.5 hover:bg-black/5 rounded-lg transition-all duration-200 hover:scale-110"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
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
