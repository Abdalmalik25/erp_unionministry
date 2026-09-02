/**
 * reductionExpertLogic.ts — Expert Legal-Eligibility Screening for Workforce
 * Reduction Requests (طلبات تخفيض العمالة)
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Screens a reduction request against genuine statutory/administrative signals
 * derived only from the real fields on the request (current worker count,
 * requested reduction, justification). No synthetic numbers are injected.
 *
 * Legal anchor: Yemeni Labour Law No. 5 of 1995 (mass-reduction review, notice
 * to workers and the labour office) and standard reduction-order precedence
 * (dismiss temporary/recent hires before permanent staff).
 */

/** Words indicating a legitimate (acceptable) economic/technical/force-majeure cause. */
const LEGITIMATE_CAUSE_PATTERN =
  /(اقتصادي|تقني|فني|طوارئ|توقف|تصفية|إفلاس|انكماش|إغلاق|ظروف قاهرة|مصروف|إعادة هيكلة|تشغيل|تراجع)/;

/** Words indicating a substitution/replacement motive (not a genuine reduction). */
const REPLACEMENT_PATTERN =
  /(إحلال|استبدال|تعويض|تبديل|استقدام بديل|استبدال بعمالة)/;

export type ReductionVerdict =
  | 'blocked'      // impossible/invalid reduction
  | 'enhanced'     // needs broader review/conciliation
  | 'eligible'     // passes basic screening
  | 'refer_for_review'; // replacement/secondary motive — flag for case-by-case

export interface ReductionScreening {
  verdict: ReductionVerdict;
  verdictLabel: string;
  abbreviation_ratio: number | null; // requested/current as a 0-1 (null if no workforce)
  flags: string[];
  recommendedAction: string;
  scopeGuide: string | null;
}

/**
 * Screening requires knowledge of current workforce size and requested reduction
 * as provided on the real request record.
 */
export function screenReductionRequest(input: {
  current_worker_count?: number;
  requested_reduction_count?: number;
  justification?: string;
}): ReductionScreening {
  const flags: string[] = [];
  const current = Number(input.current_worker_count) || 0;
  const requested = Number(input.requested_reduction_count) || 0;
  const justification = (input.justification || '').trim();

  let verdict: ReductionVerdict = 'eligible';
  let abbreviation_ratio: number | null = null;

  if (current > 0) {
    abbreviation_ratio = Math.max(0, Math.min(1, requested / current));
  }

  // 1) Impossible / invalid reductions.
  if (requested >= current && current > 0) {
    verdict = 'blocked';
    flags.push('التخفيض المطلوب يبلغ أو يتجاوز إجمالي العمالة الحالية');
  } else if (current === 0) {
    verdict = 'blocked';
    flags.push('لا توجد عمالة حالية مسجلة لإجراء التخفيض عليها');
  }

  // 2) Mass-reduction threshold → enhanced statutory review (conciliation + labour office).
  if (abbreviation_ratio != null && abbreviation_ratio >= 0.3 && verdict === 'eligible') {
    verdict = 'enhanced';
    flags.push('نسبة التخفيض المطلوبة ٣٠٪ أو أكثر من العمالة — تتطلب مراجعة موسمية أوسع وإخطاراً رسمياً');
  }

  // 3) Cause screening from the real justification text.
  const hasLegitCause = LEGITIMATE_CAUSE_PATTERN.test(justification);
  const hasReplacement = REPLACEMENT_PATTERN.test(justification);

  if (hasReplacement && (verdict === 'eligible' || verdict === 'enhanced')) {
    verdict = 'refer_for_review';
    flags.push('يبوّب المبرر تخفيضاً مرتبطاً بالاستبدال/الإحلال — يُراجع مسار الترخيص للعمالة الوافدة');
  } else if (!hasLegitCause && justification && (verdict === 'eligible' || verdict === 'enhanced')) {
    flags.push('لم يذكر المبرر سبباً اقتصادياً/فنياً صريحاً كإغلاق أو تصفية أو تراجع — يؤكد سبب التخفيض');
  }

  // 4) Scope/order-of-dismissal guidance (advisory, derived from real data).
  let scopeGuide: string | null = null;
  if (abbreviation_ratio != null && abbreviation_ratio < 0.3) {
    scopeGuide = 'تخفيض محدود — الأفضلية في إنهاء الخدمة للعمال المؤقتين أو حديثي التحاقهم وفقاً لقانون العمل';
  } else if (abbreviation_ratio != null && abbreviation_ratio >= 0.3 && verdict !== 'blocked') {
    scopeGuide = 'نسبة مرتفعة — مراعاة أولوية إنهاء الخدمة (الأجور، المؤقتين) مع إخطار العمال ومكتب العمل قبل التنفيذ';
  }

  const map: Record<ReductionVerdict, { label: string; action: string }> = {
    blocked: {
      label: 'غير منطقي — يرفض',
      action: 'رفض الطلب والرجوع إلى العدد المسجل للعمالة',
    },
    enhanced: {
      label: 'يتطلب مراجعة معززة',
      action: 'إحالة إلى مأمور التوفيق/مكتب العمل لمراجعة السبب وإخطار العمال',
    },
    eligible: {
      label: 'يباشر الفحص الاعتيادي',
      action: 'مراجعة السبب المذكور وتدقيق المسمى الوظيفي قبل الموافقة',
    },
    refer_for_review: {
      label: 'يُحال للفحص التفصيلي',
      action: 'مراجعة تفصيلية لطبيعة الاستبدال والالتزام بتصاريح العمالة الوافدة',
    },
  };

  return {
    verdict,
    verdictLabel: map[verdict].label,
    abbreviation_ratio,
    flags,
    recommendedAction: map[verdict].action,
    scopeGuide,
  };
}

/** Badge color per verdict for UI rendering. */
export const REDUCTION_BADGE: Record<ReductionVerdict, string> = {
  blocked: 'bg-red-100 text-red-800',
  enhanced: 'bg-amber-100 text-amber-800',
  refer_for_review: 'bg-orange-100 text-orange-800',
  eligible: 'bg-emerald-100 text-emerald-800',
};
