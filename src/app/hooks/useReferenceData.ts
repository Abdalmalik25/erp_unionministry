/**
 * useReferenceData.ts — مصدر موحّد للبيانات الأساسية (المحافظات/المديريات)
 * يربط العمليات الدورية واليومية بالسجل الوطني للأدلة (national-directories)
 * مع تراجع آمن نحو القائمة الوطنية الرسمية عند تعذّر جلبها (لا بيانات وهمية).
 */
import { useMemo } from 'react';
import { useQuery } from './useQuery';
import { getGovernoratesWithDistricts } from '../services/nationalDirectoriesService';
import { GOVERNORATES as STATIC_GOVERNORATES } from '../utils/laborRecordsConfig';

export interface UseGovernoratesResult {
  /** أسماء المحافظات (عربي) من السجل الوطني */
  governorates: string[];
  /** true أثناء الجلب الأول من الخادم */
  isLoading: boolean;
  /** true إذا كانت البيانات جاهزة */
  isReady: boolean;
  /** true إذا تعذّر الوصول للنظام واستخدمت القائمة الرسمية */
  usedFallback: boolean;
}

/**
 * جلب دليل المحافظات من السجل الوطني مع تراجع آمن.
 * تُستخدم في نماذج التشغيل اليومية (تسجيل المنشآت، الفروع، ...)
 * بحيث تعمل النماذج بالبيانات الأساسية الوطنية بدل قوائم جامدة داخل الواجهة.
 */
export function useGovernorates(): UseGovernoratesResult {
  const query = useQuery<string[]>({
    queryKey: ['reference', 'governorates'],
    queryFn: async () => {
      const { governorates } = await getGovernoratesWithDistricts();
      const names = (governorates || [])
        .map((g) => g.name_ar?.trim())
        .filter((n): n is string => Boolean(n));
      if (names.length === 0) return STATIC_GOVERNORATES;
      return names;
    },
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 2,
  });

  const governorates = useMemo(
    () => (query.data && query.data.length > 0 ? query.data : STATIC_GOVERNORATES),
    [query.data],
  );

  return {
    governorates,
    isLoading: query.isLoading,
    isReady: !query.isLoading,
    usedFallback: !query.isSuccess,
  };
}

/**
 * نسخة موحَّدة لقائمة المحافظات المصدَّرة للنماذج التي كانت تستخدم قائمة محلية ثابتة.
 * تحتفظ بهذا الاسم لسهولة الترقية التدريجية دون كسر الاستيرادات الحالية.
 * @deprecated استخدم useGovernorates() لربط النماذج بالسجل الوطني.
 */
export const GOVERNORATES = STATIC_GOVERNORATES;
