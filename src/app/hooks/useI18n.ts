// src/app/hooks/useI18n.ts — Typed i18n hook with namespace support
// يُستخدم في جميع المكونات للوصول للترجمات بأمان ونوعيات TypeScript

import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

interface UseI18nReturn {
  t: (key: string, options?: Record<string, unknown>) => string;
  i18n: ReturnType<typeof useTranslation>['i18n'];
  language: string;
  isRTL: boolean;
  changeLanguage: (lng: string) => Promise<void>;
}

/**
 * Hook مركزي للوصول للترجمات مع دعم namespaces عبر مفاتيح مسبقة
 * الاستخدام:
 *   const { t } = useI18n();
 *   t('nav.home')           // "الرئيسية"
 *   t('actions.save')       // "حفظ"
 *   t('status.active')      // "نشط"
 *   t('portal.worker.passport') // "جواز العمل الرقمي"
 */
export function useNav() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`nav.${key}`, options),
  };
}

export function useActions() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`actions.${key}`, options),
  };
}

export function useStatus() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`status.${key}`, options),
  };
}

export function useMessages() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`messages.${key}`, options),
  };
}

export function useA11y() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`a11y.${key}`, options),
  };
}

export function useForm() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`form.${key}`, options),
  };
}

export function useValidation() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`validation.${key}`, options),
  };
}

export function useEmptyState() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`emptyState.${key}`, options),
  };
}

export function usePagination() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`pagination.${key}`, options),
  };
}

export function usePortal() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`portal.${key}`, options),
  };
}

export function useSectors() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`sectors.${key}`, options),
  };
}

export function useClassifications() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`classifications.${key}`, options),
  };
}

export function useEntityStatus() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`entityStatus.${key}`, options),
  };
}

export function useMemberStatus() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`memberStatus.${key}`, options),
  };
}

export function useToast() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`toast.${key}`, options),
  };
}

export function useTools() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`tools.${key}`, options),
  };
}

export function useApp() {
  const { t } = useTranslation();
  return {
    t: (key: string, options?: Record<string, unknown>) => t(`app.${key}`, options),
  };
}

/**
 * أداة مساعدة للحصول على ترجمة حالة (status) مع fallback
 * الاستخدام: getStatusLabel('active') -> "نشط"
 */
export function useStatusLabel() {
  const { t } = useTranslation();
  
  return useCallback((status: string, fallback?: string) => {
    // محاولة الترجمة من namespace status أولاً
    const translated = t(`status.${status}`);
    // إذا رجعت نفس المفتاح (لم توجد ترجمة)، جرب fallback أو المفتاح نفسه
    return translated !== `status.${status}` ? translated : (fallback || status);
  }, [t]);
}

/**
 * Hook رئيسي مع جميع الاختصارات
 */
export function useI18n() {
  const { t, i18n } = useTranslation();
  
  const changeLanguage = useCallback(async (lng: string) => {
    await i18n.changeLanguage(lng);
  }, [i18n]);

  const isRTL = i18n.language === 'ar';

  // دوال مختصرة للأسماءpaces الشائعة
  const nav = useNav();
  const actions = useActions();
  const status = useStatus();
  const messages = useMessages();
  const a11y = useA11y();
  const form = useForm();
  const validation = useValidation();
  const emptyState = useEmptyState();
  const pagination = usePagination();
  const portal = usePortal();
  const sectors = useSectors();
  const classifications = useClassifications();
  const entityStatus = useEntityStatus();
  const memberStatus = useMemberStatus();
  const toast = useToast();
  const tools = useTools();
  const app = useApp();

  return {
    t,
    nav,
    actions,
    status,
    messages,
    a11y,
    form,
    validation,
    emptyState,
    pagination,
    portal,
    sectors,
    classifications,
    entityStatus,
    memberStatus,
    toast,
    tools,
    app,
    i18n,
    language: i18n.language,
    isRTL,
    changeLanguage,
  };
}