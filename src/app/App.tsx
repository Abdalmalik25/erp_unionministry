import { useEffect, useState, useCallback } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { useToast, Toast } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPWA } from './components/InstallPWA';
import { registerServiceWorker } from './utils/pwa';
import { clearExpiredCache } from './utils/indexedDB';
import { SplashScreen } from './components/ui/SplashScreen';

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}

function AppContent() {
  // PWA Setup
  useEffect(() => {
    // تسجيل Service Worker (معطل في Figma Make)
    registerServiceWorker().catch(() => {
      // تجاهل الأخطاء في بيئة التطوير/Preview
    });

    // طلب إذن الإشعارات (اختياري)
    // requestNotificationPermission();

    // مسح الكاش القديم
    clearExpiredCache().catch(() => {
      // تجاهل الأخطأ في بيئة التطوير/Preview
    });
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
      <Toaster
        position="top-left"
        richColors
        duration={4000}
        dir="rtl"
        toastOptions={{ style: { fontFamily: 'inherit' } }}
      />
      <InstallPWA />
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} duration={3000} />}
      {!showSplash && (
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // يمكن إرسال الخطأ لخدمة تتبع مثل Sentry
            console.error('Global Error:', error, errorInfo);
          }}
        >
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ErrorBoundary>
      )}
    </>
  );
}