/**
 * i18n (Internationalization) Setup
 * Supports Arabic and English
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import en from './locales/en.json';
import ar from './locales/ar.json';

// Detect device locale
const getDeviceLanguage = (): string => {
  try {
    const locales = RNLocalize.getLocales();
    if (locales.length > 0) {
      return locales[0].languageCode;
    }
  } catch {
    // Fallback
  }
  return 'ar'; // Default to Arabic for Yemen
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;