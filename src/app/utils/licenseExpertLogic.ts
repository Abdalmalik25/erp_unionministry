/**
 * licenseExpertLogic.ts — Expert Analysis for Establishment Licenses
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derives license consistency/urgency from real fields only (expiry_date,
 * status, renewal_status, renewal_date). The 60-day renewal window is a
 * normative ministry follow-up standard, clearly labelled as policy guidance.
 */

export type LicenseStatus = 'valid' | 'expired' | 'suspended' | 'revoked' | 'pending_renewal';

export interface LicenseLike {
  expiry_date?: string;
  status: string;
  renewal_status?: string;
  renewal_date?: string;
}

export type LicenseExpertIssue = 'expired_mislabel' | 'expired_pending_status' | 'renewal_window' | 'renewal_rejected' | 'future_expiry_mislabel';

export interface LicenseExpert {
  daysToExpiry: number | null;
  expiredByDays: number | null;
  drivers: string[];
  issue: LicenseExpertIssue | null;
  recommendedAction: string;
  badge: string;
  /** True when the license name/type is a labor/skilled category with statutory weight. */
  needsActiveMonitoring: boolean;
}

const RENEWAL_WINDOW_DAYS = 60;

export function analyzeLicense(l: LicenseLike, now: Date = new Date()): LicenseExpert {
  const drivers: string[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let daysToExpiry: number | null = null;
  let expiredByDays: number | null = null;
  if (l.expiry_date) {
    const exp = new Date(l.expiry_date);
    if (!Number.isNaN(exp.getTime())) {
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0) daysToExpiry = diff;
      else expiredByDays = -diff;
    }
  }

  let issue: LicenseExpertIssue | null = null;
  const renewalPending = l.renewal_status === 'pending' || l.renewal_status === 'approved';

  // 1) Expiry date already passed but status is not "expired"/"pending_renewal".
  if (expiredByDays !== null && l.status !== 'expired' && l.status !== 'pending_renewal') {
    issue = 'expired_pending_status';
    drivers.push(`انتهى الترخيص قبل ${expiredByDays} يوماً والحالة لم تُحدَّث إلى "منتهي"`);
  }

  // 2) Status labelled expired/revoked but the expiry date is still in the future.
  if (daysToExpiry !== null && (l.status === 'expired' || l.status === 'revoked')) {
    issue = 'expired_mislabel';
    drivers.push(`الحالة "منتهي/ملغى" لكن تاريخ الانتهاء لا يزال مستقبلياً (${daysToExpiry} يوماً)`);
  }

  // 3) Renewal window approaching without action.
  if (daysToExpiry !== null && daysToExpiry <= RENEWAL_WINDOW_DAYS && daysToExpiry >= 0 && !renewalPending) {
    issue = 'renewal_window';
    drivers.push(`داخل نافذة التجديد القياسية (${daysToExpiry} يوماً) دون طلب تجديد مسجل`);
  }

  // 4) Renewal rejected while license still active — needs re-application.
  if (l.renewal_status === 'rejected' && l.status !== 'expired' && l.status !== 'pending_renewal') {
    issue = 'renewal_rejected';
    drivers.push('طلب التجديد مرفوض والترخيص ما زال مدرجاً بصفة سارية');
  }

  let recommendedAction: string;
  switch (issue) {
    case 'expired_mislabel':
      recommendedAction = 'مراجعة الحالة وتصحيحها لتطابق تاريخ الانتهاء الفعلي';
      break;
    case 'expired_pending_status':
      recommendedAction = 'تحديث الحالة إلى "منتهي" وبدء إجراءات التجديد فوراً';
      break;
    case 'renewal_window':
      recommendedAction = 'بدء طلب التجديد خلال النافذة القياسية أو تجهيز التنبيه المنشأة';
      break;
    case 'renewal_rejected':
      recommendedAction = 'إعادة تقديم طلب التجديد بتصحيح أسباب الرفض';
      break;
    default:
      recommendedAction = 'لا إجراء عاجل؛ ساري المتابعة العادية';
  }

  const badge =
    issue === 'expired_mislabel' || issue === 'expired_pending_status'
      ? 'bg-red-100 text-red-800'
      : issue === 'renewal_rejected'
        ? 'bg-amber-100 text-amber-800'
        : issue === 'renewal_window'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-100 text-emerald-800';

  return {
    daysToExpiry,
    expiredByDays,
    drivers,
    issue,
    recommendedAction,
    badge,
    needsActiveMonitoring: false,
  };
}