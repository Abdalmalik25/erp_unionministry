// src/app/hooks/useTranslation.ts — i18next hook wrapper (TD-024)
// wraps useTranslation with typed keys for full IDE autocomplete

import { useTranslation as useI18nBase } from 'react-i18next';
import { useCallback } from 'react';

// re-export with cleaner name
export { useI18nBase as useTranslation };

// convenience hook for language switching + RTL sync
export function useAppLanguage() {
  const { t, i18n, ready } = useI18nBase();

  const switchLanguage = useCallback((lng: string) => {
    i18n.changeLanguage(lng).then(() => {
      if (typeof document !== 'undefined') {
        const dir = lng === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('lang', lng);
        document.documentElement.setAttribute('dir', dir);
      }
    });
  }, [i18n]);

  const isRTL = i18n.language === 'ar';

  return {
    t,
    i18n,
    ready,
    switchLanguage,
    currentLanguage: i18n.language,
    isRTL,
    supportedLanguages: ['ar', 'en'],
  };
}
