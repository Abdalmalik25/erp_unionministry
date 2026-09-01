// src/app/contexts/LanguageContext.tsx
// يوفر سياق اللغة وتبديلها مع مزامنة اتجاه المستند (RTL/LTR)

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import i18nInstance from '../i18n/config'; // القيمة المُهيّأة — استيراد بالقيمة يُبقي config.ts محمّلة دائماً

// ملاحظة (Root-Cause TD): اعتمد المُزوِّد سابقاً على useTranslation().i18n — أي على
// getI18n() العالمي داخل react-i18next. عندما يُسقِط bundler تهيئة config.ts
// (moduleSideEffects المخصّصة) يصبح المثيل فارغاً {} → "s.changeLanguage is not a function"
// → شاشة الخطأ. الآن نستخدم مثيل i18next المُهيّأ صراحةً (استيراد بالقيمة يُبقي config.ts
// محمّلة دائماً) مع حارس (guard) يجعل فشل تبديل اللغة غير قاتل.

export type Language = 'ar' | 'en';
const RTL_LANGS: ReadonlySet<Language> = new Set<Language>(['ar']);

interface LanguageContextValue {
  current: Language;
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
  switchLanguage: (lng: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  supported: ReadonlyArray<Language>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'i18nextLng';
const HTML_DIR = 'dir';
const HTML_LANG = 'lang';

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ar';
  const fromStorage = window.localStorage.getItem(STORAGE_KEY);
  if (fromStorage === 'ar' || fromStorage === 'en') return fromStorage;
  const navLang = window.navigator?.language?.split('-')[0];
  return navLang === 'en' ? 'en' : 'ar';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Language>(() => readInitialLanguage());

  // مزامنة الحالة مع i18next عند الإقلاع — غير قاتلة أبداً
  useEffect(() => {
    if (typeof i18nInstance.changeLanguage !== 'function') return;
    if (i18nInstance.language !== current) {
      void i18nInstance.changeLanguage(current).catch(() => {});
    }
  }, [current]);

  // مزامنة اتجاه و lang في HTML
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(HTML_LANG, current);
    document.documentElement.setAttribute(HTML_DIR, RTL_LANGS.has(current) ? 'rtl' : 'ltr');
  }, [current]);

  const switchLanguage = useCallback(async (lng: Language) => {
    try {
      if (typeof i18nInstance.changeLanguage === 'function') {
        await i18nInstance.changeLanguage(lng);
      }
    } catch {
      // فشل تبديل اللغة غير قاتل
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lng);
    }
    setCurrent(lng);
  }, []);

  const toggleLanguage = useCallback(async () => {
    await switchLanguage(current === 'ar' ? 'en' : 'ar');
  }, [current, switchLanguage]);

  const value = useMemo<LanguageContextValue>(() => ({
    current,
    isRTL: RTL_LANGS.has(current),
    direction: RTL_LANGS.has(current) ? 'rtl' : 'ltr',
    switchLanguage,
    toggleLanguage,
    supported: ['ar', 'en'],
  }), [current, switchLanguage, toggleLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
