/**
 * expatLicenseExpertLogic.ts — Expert Expiry & Renewal Logic for Expatriate
 * Work Licenses (تراخيص العمل للعمالة الأجنبية الوافدة)
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derives expiry severity and a recommended action from the real fields on the
 * license (expiry_date, status). All values are computed; no fabricated data.
 */

export type LicenseExpiryBand = 'valid' | 'expiring_30' | 'expiring_90' | 'expired' | 'cancelled';

export interface LicenseExpert {
  band: LicenseExpiryBand;
  label: string;
  daysToExpiry: number | null; // null when no usable date or cancelled
  recommendedAction: string;
  badge: string;
  drivers: string[];
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function analyzeExpatLicense(input: {
  expiry_date?: string;
  status?: string;
}): LicenseExpert {
  const drivers: string[] = [];
  const now = new Date();

  // Cancelled licenses are terminal regardless of date.
  if (input.status === 'ملغي') {
    return {
      band: 'cancelled',
      label: 'ملغي',
      daysToExpiry: null,
      recommendedAction: 'لا يوجد إجراء — الترخيص ملغي',
      badge: 'bg-gray-100 text-gray-700',
      drivers: ['الترخيص ملغي وفق السجل'],
    };
  }

  if (!input.expiry_date) {
    return {
      band: 'valid',
      label: 'بدون تاريخ انتهاء',
      daysToExpiry: null,
      recommendedAction: 'استكمال تسجيل تاريخ الانتهاء',
      badge: 'bg-gray-100 text-gray-700',
      drivers: ['لا يوجد تاريخ انتهاء مسجل'],
    };
  }

  const expiry = new Date(input.expiry_date);
  if (Number.isNaN(expiry.getTime())) {
    return {
      band: 'valid',
      label: 'تاريخ غير صالح',
      daysToExpiry: null,
      recommendedAction: 'تصحيح تاريخ الانتهاء',
      badge: 'bg-gray-100 text-gray-700',
      drivers: ['تاريخ الانتهاء غير قابل للقراءة'],
    };
  }

  const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);

  let band: LicenseExpiryBand;
  let label: string;
  let action: string;
  let badge: string;

  if (daysToExpiry < 0) {
    band = 'expired';
    label = 'منتهي';
    action = 'إيقاف العمل حتى التجديد؛ مراجعة مدد العمل والتصاريح ذات الصلة';
    badge = 'bg-red-100 text-red-800';
    drivers.push(`انتهى منذ ${Math.abs(daysToExpiry)} يوماً`);
  } else if (daysToExpiry <= 30) {
    band = 'expiring_30';
    label = 'تنتهي خلال 30 يوماً';
    action = 'التحقق من تجهيز ملف التجديد وتصريح العمل وجواز العامل';
    badge = 'bg-amber-100 text-amber-800';
    drivers.push(`تنتهي خلال ${daysToExpiry} يوماً`);
  } else if (daysToExpiry <= 90) {
    band = 'expiring_90';
    label = 'تنتهي خلال 90 يوماً';
    action = 'جدولة مراجعة التجديد قبل انتهاء المهلة';
    badge = 'bg-yellow-100 text-yellow-800';
    drivers.push(`تنتهي خلال ${daysToExpiry} يوماً`);
  } else {
    band = 'valid';
    label = 'ساري';
    action = 'لا إجراء عاجل؛ متابعة دورية';
    badge = 'bg-emerald-100 text-emerald-800';
    drivers.push(`صالح لمدّة ${daysToExpiry} يوماً`);
  }

  return { band, label, daysToExpiry, recommendedAction: action, badge, drivers };
}
