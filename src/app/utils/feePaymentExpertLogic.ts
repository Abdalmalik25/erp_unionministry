/**
 * feePaymentExpertLogic.ts — Expert Analysis for Fee Payments
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derived from real payment fields only (status, created_at). Flags payments
 * still "pending" after a normative 15-day follow-up window (ministry policy,
 * clearly labelled). No fabricated due dates are used.
 */

export interface FeePaymentLike {
  status: string;
  created_at: string;
  amount?: number;
}

export type FeePaymentExpertIssue = 'pending_aging' | 'failed';

export interface FeePaymentExpert {
  daysPending: number | null;
  drivers: string[];
  issue: FeePaymentExpertIssue | null;
  recommendedAction: string;
  badge: string;
}

export function analyzeFeePayment(p: FeePaymentLike, now: Date = new Date()): FeePaymentExpert {
  const drivers: string[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let daysPending: number | null = null;
  const created = new Date(p.created_at);
  if (!Number.isNaN(created.getTime())) {
    daysPending = Math.max(0, Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  }

  let issue: FeePaymentExpertIssue | null = null;

  if (p.status === 'failed') {
    issue = 'failed';
    drivers.push('عملية دفع فاشلة دون إعادة محاولة مسجلة');
  } else if (p.status === 'pending' && daysPending !== null && daysPending > 15) {
    issue = 'pending_aging';
    drivers.push(`معاملة دفع معلقة منذ ${daysPending} يوماً تتجاوز نافذة المتابعة القياسية`);
  }

  let recommendedAction: string;
  switch (issue) {
    case 'pending_aging':
      recommendedAction = 'متابعة المعاملة مع المؤسسة المالية أو تهيئة إعادة المحاولة';
      break;
    case 'failed':
      recommendedAction = 'مراجعة سبب الفشل وإعادة إصدار عملية الدفع';
      break;
    default:
      recommendedAction = 'لا إجراء عاجل؛ سليم المتابعة';
  }

  const badge =
    issue === 'failed'
      ? 'bg-red-100 text-red-800'
      : issue === 'pending_aging'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800';

  return { daysPending, drivers, issue, recommendedAction, badge };
}