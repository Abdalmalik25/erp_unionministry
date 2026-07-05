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
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl p-4 z-50 animate-slideUp"
      dir="rtl"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 left-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
        aria-label="إغلاق"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <img src="/src/imports/image.png" alt="الشعار" className="w-10 h-10 object-contain" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">ثبّت التطبيق</h3>
          <p className="text-sm text-blue-100 leading-relaxed">
            للحصول على تجربة أفضل وأسرع، ثبّت التطبيق على جهازك
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-white text-blue-600 px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} />
          <span>تثبيت الآن</span>
        </button>

        <button
          onClick={handleDismiss}
          className="px-4 py-2.5 rounded-lg font-semibold hover:bg-white/20 transition-colors"
        >
          لاحقاً
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center gap-2 text-xs text-blue-100">
          <Check size={14} />
          <span>يعمل دون اتصال</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-100 mt-1">
          <Check size={14} />
          <span>وصول سريع من الشاشة الرئيسية</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-100 mt-1">
          <Check size={14} />
          <span>إشعارات فورية</span>
        </div>
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
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
        <Check size={18} />
        <span className="text-sm font-medium">التطبيق مثبت</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Download size={18} />
      <span className="text-sm font-medium">تثبيت التطبيق</span>
    </button>
  );
}
