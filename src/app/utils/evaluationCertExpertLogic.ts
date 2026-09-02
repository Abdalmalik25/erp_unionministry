/**
 * evaluationCertExpertLogic.ts — Expert Analysis for Evaluation Certificates
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derived from real certificate fields only (status, expiry_date, overall_score).
 * The 60-day re-assessment window is a normative ministry review standard,
 * clearly labelled as policy guidance.
 */

export type CertStatus = 'valid' | 'conditional' | 'revoked';

export interface CertLike {
  status: string;
  expiry_date?: string;
  overall_score?: number;
}

export type CertExpertIssue =
  | 'expired_still_valid'
  | 'expiring_soon'
  | 'conditional_active'
  | 'revoked_future_expiry'
  | 'low_score_valid';

export interface CertExpert {
  daysToExpiry: number | null;
  expiredByDays: number | null;
  drivers: string[];
  issue: CertExpertIssue | null;
  recommendedAction: string;
  badge: string;
}

const REASSESSMENT_WINDOW_DAYS = 60;
const WEAK_SCORE = 60;

export function analyzeEvaluationCert(c: CertLike, now: Date = new Date()): CertExpert {
  const drivers: string[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let daysToExpiry: number | null = null;
  let expiredByDays: number | null = null;
  if (c.expiry_date) {
    const exp = new Date(c.expiry_date);
    if (!Number.isNaN(exp.getTime())) {
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0) daysToExpiry = diff;
      else expiredByDays = -diff;
    }
  }

  let issue: CertExpertIssue | null = null;

  if (c.status === 'valid') {
    if (expiredByDays !== null) {
      issue = 'expired_still_valid';
      drivers.push(`انتهت صلاحية الشهادة قبل ${expiredByDays} يوماً والحالة ما زالت "صالحة"`);
    } else if (daysToExpiry !== null && daysToExpiry <= REASSESSMENT_WINDOW_DAYS) {
      issue = 'expiring_soon';
      drivers.push(`تنتهي صلاحية الشهادة خلال ${daysToExpiry} يوماً — يتطلب إعادة تقييم`);
    }
  }

  if (!issue && c.status === 'conditional') {
    issue = 'conditional_active';
    drivers.push('شهادة شَرطية — تُحكم بعد استيفاء الشروط');
  }

  if (!issue && c.status === 'revoked' && daysToExpiry !== null) {
    issue = 'revoked_future_expiry';
    drivers.push(`الحالة "ملغاة" رغم أن تاريخ الانتهاء مستقبلي (${daysToExpiry} يوماً)`);
  }

  if (!issue && c.status === 'valid' && (c.overall_score !== undefined && c.overall_score < WEAK_SCORE)) {
    issue = 'low_score_valid';
    drivers.push(`درجة امتثال ضعيفة (${c.overall_score}%) مع منح الشهادة بصفة "صالحة"`);
  }

  let recommendedAction: string;
  switch (issue) {
    case 'expired_still_valid':
      recommendedAction = 'إلغاء أو إعادة اعتماد الشهادة بعد إعادة التقييم الفعلية';
      break;
    case 'expiring_soon':
      recommendedAction = 'جدولة إعادة التقييم قبل الانتهاء أو تجهيز تجديد الصلاحية';
      break;
    case 'conditional_active':
      recommendedAction = 'متابعة استيفاء الشروط وتحويلها لصالحة أو إلغاؤها بعد المدة';
      break;
    case 'revoked_future_expiry':
      recommendedAction = 'مراجعة الحالة وتصحيحها لتطابق تاريخ الانتهاء';
      break;
    case 'low_score_valid':
      recommendedAction = 'مراجعة القرار ووضع خطة اشتقاق تحسين امتثال أو خفض التصنيف';
      break;
    default:
      recommendedAction = 'لا إجراء عاجل؛ سليم المتابعة';
  }

  const badge =
    c.status === 'revoked'
      ? 'bg-gray-100 text-gray-700'
      : issue === 'expired_still_valid'
        ? 'bg-red-100 text-red-800'
        : issue === 'expiring_soon' || issue === 'conditional_active' || issue === 'low_score_valid'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-100 text-emerald-800';

  return { daysToExpiry, expiredByDays, drivers, issue, recommendedAction, badge };
}