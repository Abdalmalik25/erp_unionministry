/**
 * PageTransition - مكوّن الانتقال بين الصفحات
 * يضيف تأثيرات بصرية سلسة عند تغيير المسارات
 */

import { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  return (
    <div 
      className={`animate-slideInUp ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {children}
    </div>
  );
}

/**
 * LoadingButton - زر التحميل المحسّن
 */
export function LoadingButton({
  loading,
  children,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}: {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 transition-all ${
        loading ? 'cursor-wait opacity-80' : 'cursor-pointer'
      } ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
}

/**
 * FadeTransition - تأثير الظهور والاختفاء
 */
export function FadeTransition({
  show,
  children,
  duration = 300,
}: {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
}) {
  return (
    <div
      className={`${show ? 'animate-fadeIn' : 'animate-fadeOut'}`}
      style={{
        animationDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}