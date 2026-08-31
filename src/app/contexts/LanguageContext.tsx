// src/app/contexts/LanguageContext.tsx
// يوفر سياق اللغة وتبديلها مع مزامنة اتجاه المستند (RTL/LTR)

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState<Language>(() => readInitialLanguage());

  // مزامنة الحالة مع i18next عند الإقلاع
  useEffect(() => {
    if (i18n.language !== current) {
      void i18n.changeLanguage(current);
    }
  }, [current, i18n]);

  // مزامنة اتجاه و lang في HTML
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(HTML_LANG, current);
    document.documentElement.setAttribute(HTML_DIR, RTL_LANGS.has(current) ? 'rtl' : 'ltr');
  }, [current]);

  const switchLanguage = useCallback(async (lng: Language) => {
    await i18n.changeLanguage(lng);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lng);
    }
    setCurrent(lng);
  }, [i18n]);

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
