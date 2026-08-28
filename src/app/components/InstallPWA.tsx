/**
 * Install PWA Component - مكون تثبيت التطبيق
 * عرض زر التثبيت وإدارة العملية
 */

import { useState, useEffect } from 'react';
import { Download, X, Check } from 'lucide-react';
import { showInstallPrompt, setupInstallPrompt, isPWAInstalled } from '../utils/pwa';

export function InstallPWA() {
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // تعطيل في بيئة Figma Make
    if (window.location.hostname.includes('figma.site') || window.location.hostname.includes('makeproxy')) {
      return;
    }

    // التحقق من التثبيت
    setIsInstalled(isPWAInstalled());

    // إعداد حدث التثبيت
    setupInstallPrompt();

    // الاستماع لحدث القابلية للتثبيت
    const handleInstallable = () => {
      setShowBanner(true);
    };

    window.addEventListener('pwa-installable', handleInstallable);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstall = async () => {
    const success = await showInstallPrompt();
    if (success) {
      setShowBanner(false);
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // إذا كان مثبتاً، لا نعرض شيء
  if (isInstalled) {
    return null;
  }

  // التحقق من الإخفاء السابق
  const dismissed = localStorage.getItem('pwa-banner-dismissed');
  if (dismissed) {
    const daysSinceDismiss = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss < 7) {
      return null;
    }
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 left-5 right-5 md:left-auto md:right-5 md:w-96 bg-card border border-border text-foreground rounded-2xl shadow-2xl p-5 z-50 animate-slideInUp"
      dir="rtl"
      role="dialog"
      aria-label="عرض تثبيت التطبيق"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 left-3 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3.5 mb-3.5">
        <div className="w-12 h-12 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center flex-shrink-0 text-primary shadow-md">
          <Download size={22} />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-sm text-foreground mb-0.5">تثبيت المنظومة كتطبيق مستقل</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            للحصول على أداء فائق وسرعة مضاعفة وتشغيل محلي مباشر على جهازك.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary-dark active:bg-primary-dark px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
        >
          <Download size={15} />
          <span>تثبيت التطبيق الآن</span>
        </button>

        <button
          onClick={handleDismiss}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
        >
          لاحقاً
        </button>
      </div>

      <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Check size={13} className="text-success" /> يعمل محلياً</span>
        <span className="flex items-center gap-1"><Check size={13} className="text-success" /> بدون إطار متصفح</span>
        <span className="flex items-center gap-1"><Check size={13} className="text-success" /> أداء أقصى</span>
      </div>
    </div>
  );
}

/**
 * زر تثبيت صغير في الإعدادات
 */
export function InstallButton() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
  }, []);

  const handleInstall = async () => {
    const success = await showInstallPrompt();
    if (success) {
      setIsInstalled(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-success-dark bg-success/10 px-4 py-2 rounded-lg">
        <Check size={18} />
        <span className="text-sm font-medium">التطبيق مثبت</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-4 py-2 bg-primary-bright text-white rounded-lg hover:bg-primary-dark transition-colors"
    >
      <Download size={18} />
      <span className="text-sm font-medium">تثبيت التطبيق</span>
    </button>
  );
}
