/**
 * trainingExpertLogic.ts — Expert Analysis for Training Records
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derived from real training fields only (status, start_date, end_date,
 * participants_count, pass_rate, certification_issued). The 30-day follow-up
 * window is a normative ministry review standard, clearly labelled as policy.
 */

export type TrainingStatus = 'in_progress' | 'completed' | 'pending' | 'cancelled';

export interface TrainingLike {
  status: string;
  start_date?: string;
  end_date?: string;
  participants_count?: number;
  pass_rate?: number;
  certification_issued?: boolean;
  duration_hours?: number;
}

export type TrainingExpertIssue =
  | 'overshoot_in_progress'
  | 'pending_overdue'
  | 'certification_missing'
  | 'no_participants'
  | 'no_result';

export interface TrainingExpert {
  daysOver: number | null;
  drivers: string[];
  issue: TrainingExpertIssue | null;
  recommendedAction: string;
  badge: string;
}

export function analyzeTraining(r: TrainingLike, now: Date = new Date()): TrainingExpert {
  const drivers: string[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let daysOver: number | null = null;
  if (r.end_date) {
    const end = new Date(r.end_date);
    if (!Number.isNaN(end.getTime())) {
      const diff = Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) daysOver = diff;
    }
  }

  let issue: TrainingExpertIssue | null = null;

  if (r.status === 'in_progress' && daysOver !== null) {
    issue = 'overshoot_in_progress';
    drivers.push(`انتهى الجدول الزمني قبل ${daysOver} يوماً والبرنامج ما زال "قيد التنفيذ"`);
  } else if (r.status === 'pending' && r.start_date) {
    const start = new Date(r.start_date);
    if (!Number.isNaN(start.getTime()) && start.getTime() < today.getTime()) {
      issue = 'pending_overdue';
      drivers.push('تدريب "معلق" رغم بلوغ تاريخ البدء');
    }
  }

  if (!issue && r.status === 'completed' && r.certification_issued === false) {
    issue = 'certification_missing';
    drivers.push('مكتمل دون إصدار شهادات للمتدربين');
  }

  if (!issue && (r.status === 'in_progress' || r.status === 'completed') && !(r.participants_count && r.participants_count > 0)) {
    issue = 'no_participants';
    drivers.push('لا مُشاركون مسجلون لبرنامج بالغ النشاط');
  }

  if (!issue && r.status === 'completed' && (r.pass_rate === undefined || r.pass_rate === null)) {
    issue = 'no_result';
    drivers.push('مكتمل دون تسجيل نسبة النجاح');
  }

  let recommendedAction: string;
  switch (issue) {
    case 'overshoot_in_progress':
      recommendedAction = 'تحديث الحالة إلى "مكتمل" أو إعادة جدولة النهاية والتحقق من التسليم';
      break;
    case 'pending_overdue':
      recommendedAction = 'البدء بالتدريب أو إعادة جدولته أو إلغاؤه رسمياً';
      break;
    case 'certification_missing':
      recommendedAction = 'إصدار الشهادات وإرفاق سجل للمتدربين';
      break;
    case 'no_participants':
      recommendedAction = 'استكمال بيانات المشاركين قبل اعتماد السجل';
      break;
    case 'no_result':
      recommendedAction = 'تسجيل نتائج التقييم ونسبة النجاح';
      break;
    default:
      recommendedAction = 'لا إجراء عاجل؛ سليم المتابعة';
  }

  const badge =
    issue === 'overshoot_in_progress' || issue === 'pending_overdue'
      ? 'bg-red-100 text-red-800'
      : issue
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800';

  return { daysOver, drivers, issue, recommendedAction, badge };
}