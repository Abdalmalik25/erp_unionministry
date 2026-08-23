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
      className="fixed bottom-5 left-5 right-5 md:left-auto md:right-5 md:w-96 bg-[#0f1c31] border border-blue-500/30 text-white rounded-2xl shadow-2xl p-5 z-50 animate-slideUp backdrop-blur-xl"
      dir="rtl"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 left-3 p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3.5 mb-3.5">
        <div className="w-12 h-12 bg-blue-900/50 border border-blue-500/40 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-400 shadow-md">
          <Download size={22} />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-sm text-white mb-0.5">تثبيت المنظومة كتطبيق مستقل</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            للحصول على أداء فائق وسرعة مضاعفة وتشغيل محلي مباشر على جهازك.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 cursor-pointer"
        >
          <Download size={15} />
          <span>تثبيت التطبيق الآن</span>
        </button>

        <button
          onClick={handleDismiss}
          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          لاحقاً
        </button>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><Check size={13} className="text-emerald-400" /> يعمل محلياً</span>
        <span className="flex items-center gap-1"><Check size={13} className="text-emerald-400" /> بدون إطار متصفح</span>
        <span className="flex items-center gap-1"><Check size={13} className="text-emerald-400" /> أداء أقصى</span>
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
