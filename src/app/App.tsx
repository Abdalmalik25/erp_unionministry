// i18n initialization (TD-024) — must come before any component imports that use translations
import './i18n/config';
import { useEffect, useState, useCallback } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { useToast, Toast } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPWA } from './components/InstallPWA';
import { registerServiceWorker } from './utils/pwa';
import { db } from './utils/indexedDB';
import { SplashScreen } from './components/ui/SplashScreen';
import { OfflineIndicator, OfflineSyncBanner } from './components/OfflineIndicator';
import { OfflineProvider } from './contexts/OfflineContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { A11yAnnouncer, announce } from './components/a11y/A11yAnnouncer';
import { SkipToContent } from './components/a11y/SkipToContent';

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
    registerServiceWorker().catch((e) => {
      console.warn('[App] Service Worker registration failed:', e);
    });

    // مسح الكاش القديم
    db.clearExpiredCache().catch((e) => {
      console.warn('[App] Cache cleanup failed:', e);
    });

    // الإعلان عن تغيير المسار لقارئات الشاشة — عبر اشتراك مباشر في نسخة الـ router
    // (وليس A11yAnnouncer + useLocation: فهو مركَّب خارج <RouterProvider> وuseLocation
    //  فيه كانت تُسقط التطبيق كله عند أول تنقّل — الجذر الحقيقي لشاشة "حدث خطأ غير متوقع")
    const unsubscribe = router.subscribe(() => {
      try {
        const title = typeof document !== 'undefined' ? document.title : router.state.location.pathname;
        announce(`انتقلت إلى: ${title}`, 'polite');
      } catch {
        // الإعلان اختياري — لا يُسقط التطبيق أبداً
      }
    });
    return unsubscribe;
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
      <OfflineIndicator />
      <OfflineSyncBanner />
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
      {showSplash && <SplashScreen onComplete={handleSplashComplete} duration={600} />}
      {!showSplash && (
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="theme"
          >
            <LanguageProvider>
              <AuthProvider>
                <OfflineProvider>
                  <SkipToContent />
                  <A11yAnnouncer />
                  <AppContent />
                </OfflineProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      )}
    </>
  );
}