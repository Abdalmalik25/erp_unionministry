import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ${
        styles[type]
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      dir="rtl"
    >
      {icons[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="p-1 hover:bg-black/5 rounded transition-colors"
      >
        <X size={16} />
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
  success: (message: string) => {
    const id = toastId++;
    const toastData = { id, message, type: 'success' as ToastType };
    toastListeners.forEach((listener) => listener(toastData));
  },
  error: (message: string) => {
    const id = toastId++;
    const toastData = { id, message, type: 'error' as ToastType };
    toastListeners.forEach((listener) => listener(toastData));
  },
  warning: (message: string) => {
    const id = toastId++;
    const toastData = { id, message, type: 'warning' as ToastType };
    toastListeners.forEach((listener) => listener(toastData));
  },
  info: (message: string) => {
    const id = toastId++;
    const toastData = { id, message, type: 'info' as ToastType };
    toastListeners.forEach((listener) => listener(toastData));
  },
};
