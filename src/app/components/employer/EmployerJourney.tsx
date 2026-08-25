/**
 * EmployerJourney — السيناريو التشغيلي الكامل لصاحب العمل
 * 6 مراحل، كل مرحلة تعرض وجهي العملة:
 * «ما يفعله صاحب العمل» مقابل «الضوابط التي يفرضها موظفو الوزارة»
 */
import { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/badge';
import { usePolicy } from '../../hooks/usePolicy';
import {
  Building2, ChevronDown, FileSignature, ShieldCheck, ClipboardCheck,
  CreditCard, Scale, UserCheck, Gavel, Ban, CalendarClock, Wallet,
} from 'lucide-react';

type Severity = 'info' | 'warn' | 'hard';

const SEVERITY_META: Record<Severity, { label: string; cls: string; icon: any }> = {
  info: { label: 'رقابة إجرائية', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300', icon: UserCheck },
  warn: { label: 'ضغط امتثال', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', icon: Ban },
  hard: { label: 'سلطة إلزامية', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', icon: Gavel },
};

export interface JourneyStage {
  id: string;
  icon: any;
  title: string;
  duration: string;
  desc: string;
  /** ما يفعله صاحب العمل */
  actions: string[];
  /** الضوابط التي يفرضها موظفو الوزارة */
  controls: { text: string; by: string; severity: Severity }[];
}

/** يبني مراحل الرحلة مع حقن العتبات القانونية الحية من إعدادات الوزارة */
export const buildStages = (yemenizationMinRatio: number): JourneyStage[] => [
  {
    id: 'register',
    icon: Building2,
    title: 'التسجيل والتوثيق في السجل الرسمي',
    duration: '5 أيام',
    desc: 'إقامة الملف الرسمي للمنشأة بالرقم الوطني NE-XXXXXX وربط الفروع.',
    actions: [
      'البحث في السجل باسم المنشأة أو رقمها الوطني قبل أي خطوة',
      'رفع طلب تسجيل إلكتروني (إن لم تكن موجودة) مع الفروع والشواهد',
      'طلب ربط الحساب بمنشأة قائمة بمالكها الشرعي',
      'استكمال الوثائق: سجل تجاري، عقد إيجار، هوية المالك',
    ],
    controls: [
      { text: 'التحقق المطابق من السجل التجاري والجهات الشقيقة قبل القبول', by: 'موظف السجل', severity: 'info' },
      { text: 'مهل SLA للمعاملة — تُحسب مدة المراجعة وتُرصد المتأخرات', by: 'نظام الامتثال', severity: 'warn' },
      { text: 'رفض الطلب بسبب رسمي موثق مع وجوب إعادة التسجيل', by: 'مدير السجل', severity: 'hard' },
    ],
  },
  {
    id: 'contracts',
    icon: FileSignature,
    title: 'التوظيف وتوثيق العقود',
    duration: '3 أيام لكل عقد',
    desc: 'توثيق عقود العمل إلكترونياً وتراخيص الوافدين ضمن سقف اليمننة.',
    actions: [
      'إصدار العقد بقوالب النظام المعتمدة وتوثيقه إلكترونياً',
      `التقديم على تراخيص الوافدة الجدد بعد تحقيق نسبة اليمننة (${yemenizationMinRatio}%)`,
      'تحديث بيانات العاملين ومهامهم وأجورهم في الملف',
      'نقل عامل من منشأة أخرى بموافقته الرقمية المسبقة',
    ],
    controls: [
      { text: 'تدقيق آلي للعقود: الأجور لا تقل عن الحد الأدنى، البنود نظامية', by: 'محرك القواعد', severity: 'info' },
      { text: 'رفض تراخيص الوافدين عند نقص اليمننة أو وجود مخالفات مفتوحة', by: 'مسؤول التراخيص', severity: 'hard' },
      { text: 'تنبيهات استباقية: انتهاء عقود، تجاوز فترات تجربة، تكرار التوثيق الخاطئ', by: 'الامتثال', severity: 'warn' },
    ],
  },
  {
    id: 'self-compliance',
    icon: ShieldCheck,
    title: 'الامتثال الذاتي الاستباقي',
    duration: 'مستمر',
    desc: 'اكتشاف الفجوات وتصحيحها ذاتياً قبل أي زيارة رقابية.',
    actions: [
      'تنفيذ التقييم الذاتي الدوري (10 دقائق) وقياس مؤشر الجاهزية',
      'تصحيح البنود الحرجة ورفع شواهد الإصلاح (صور/مستندات ببصمة)',
      'حجز تفتيش اختياري استباقي بقائمة تحقق معلومة',
      'سداد الرسوم والتأمينات دون متأخرات',
    ],
    controls: [
      { text: 'اعتماد الشواهد المرفوعة وإغلاق بنود التصحيح آلياً', by: 'موظف الامتثال', severity: 'info' },
      { text: 'خصم نقاط الامتثال عن البنود غير المصححة ضمن المهلة', by: 'لوحة الرقابة', severity: 'warn' },
      { text: 'تصعيد الملف للرقابة الميدانية عند تكرار الإهمال', by: 'مدير الرقابة', severity: 'hard' },
    ],
  },
  {
    id: 'inspection',
    icon: ClipboardCheck,
    title: 'التفتيش الميداني',
    duration: 'حسب الجدولة أو البلاغ',
    desc: 'زيارة المفتش بمحضر إلكتروني Offline Ready وصور موثقة.',
    actions: [
      'استقبال الإشعار المسبق وخطة الزيارة وقائمة التحقق',
      'تمكين المفتش من السجلات والعقود وشواهد التصحيح السابقة',
      'استلام المحضر الإلكتروني الموقع والنواقص إن وجدت',
      'الاعتراض على المحضر خلال 7 أيام عبر بوابة النزاعات',
    ],
    controls: [
      { text: 'المحضر الإلكتروني بتوقيع رقمي وصور موثقة — لا محاضر ورقية', by: 'مفتش العمل', severity: 'info' },
      { text: 'منح مهل تصحيح مراقبة آلياً مع تنبيهات تصاعدية', by: 'النظام', severity: 'warn' },
      { text: 'مخالفات جسيمة: غرامة فورية بإشارة قانونية أو إيقاف نشاط', by: 'مفتش أول / مدير فرع', severity: 'hard' },
    ],
  },
  {
    id: 'fees',
    icon: CreditCard,
    title: 'الرسوم والاشتراكات',
    duration: 'سنوي / حسب الخدمة',
    desc: 'سداد إلكتروني بإيصال موثق يحدّث ملف المنشأة فوراً.',
    actions: [
      'حساب الرسوم والغرامات مسبقاً بالحاسبة الذاتية',
      'السداد الإلكتروني والحصول على إيصال موثق رقمياً',
      'تجديد الاشتراكات والتراخيص قبل الانتهاء بأيام',
      'تقديم طلب تقليص عمالة مبرر عند الحاجة الاقتصادية',
    ],
    controls: [
      { text: 'مطابقة آلية بين المبالغ والمرسومات الرسمية — لا مبالغ خارج النظام', by: 'المحاسبة', severity: 'info' },
      { text: 'تعليق الخدمات ذاتياً للمتأخرات مع جدولة تقسيط ممكنة', by: 'المسؤول المالي', severity: 'warn' },
      { text: 'تحصيل جبري عبر المخالفات المستحقة وفق المادة القانونية', by: 'ضابط التحصيل', severity: 'hard' },
    ],
  },
  {
    id: 'disputes',
    icon: Scale,
    title: 'النزاعات والشكاوى',
    duration: 'SLA 15 يوماً للصلح',
    desc: 'صلح ودي أولاً، ثم لجان التحكيم — كل شيء موثق على المنظومة.',
    actions: [
      'الرد على شكاوى العاملين ضمن مهلة الـSLA قبل التصعيد',
      'رفع مستندات الدفاع (عقود، كشف أجور، إخلاء طرف) إلكترونياً',
      'حضور جلسات الصلح الودي عن بُعد',
      'متابعة أحكام اللجان وتنفيذها أو استئنافها',
    ],
    controls: [
      { text: 'جدولة جلسات الصلح وإدارة المحاضر رقمياً', by: 'مختص الصلح', severity: 'info' },
      { text: 'تصعيد تلقائي للجان التحكيم عند فشل الصلح أو صمت الطرفين', by: 'النظام', severity: 'warn' },
      { text: 'قرارات نازعة ملزمة وتنفيذ تحت الإشراف القانوني', by: 'المستشار القانوني / اللجنة', severity: 'hard' },
    ],
  },
];

const CALENDAR_ICON_MAP: Record<string, any> = {
  register: CalendarClock,
  contracts: FileSignature,
  'self-compliance': ShieldCheck,
  inspection: ClipboardCheck,
  fees: Wallet,
  disputes: Scale,
};

export function EmployerJourney() {
  const [openId, setOpenId] = useState<string>('register');
  const policy = usePolicy();
  const stages = buildStages(policy.yemenizationMinRatio);

  return (
    <div className="space-y-3" dir="rtl">
      {/* مفتاح الألوان */}
      <Card>
        <div className="p-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-sm">رحلتك الكاملة — من التسجيل إلى آخر معاملة</p>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(SEVERITY_META) as Severity[]).map(s => {
              const M = SEVERITY_META[s];
              const Icon = M.icon;
              return (
                <span key={s} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${M.cls}`}>
                  <Icon /> {M.label}
                </span>
              );
            })}
          </div>
        </div>
      </Card>

      {/* الخط الزمني */}
      <div className="relative pr-6">
        <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-400 to-transparent rounded-full" aria-hidden />
        {stages.map((stage, idx) => {
          const Icon = stage.icon ?? CALENDAR_ICON_MAP[stage.id];
          const open = openId === stage.id;
          return (
            <div key={stage.id} className="relative mb-3">
              {/* نقطة الخط */}
              <span className={`absolute -right-6 top-4 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow ${open ? 'bg-amber-400' : 'bg-blue-500'}`} aria-hidden />
              <Card>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? '' : stage.id)}
                  aria-expanded={open}
                  className="w-full p-4 text-right cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-600/10 flex items-center justify-center">
                        {Icon && <Icon className="w-5 h-5 text-blue-600" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">
                          <span className="text-muted-foreground ml-1">{idx + 1}.</span> {stage.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{stage.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline"><CalendarClock className="w-3 h-3 ml-1" />{stage.duration}</Badge>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* ما يفعله صاحب العمل */}
                    <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3">
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 mb-2">ما تفعله أنت (صاحب العمل)</p>
                      <ul className="space-y-1.5">
                        {stage.actions.map((a, i) => (
                          <li key={i} className="text-[11px] leading-relaxed flex items-start gap-1.5">
                            <CheckDot /> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* ضوابط الوزارة */}
                    <div className="border border-border rounded-xl p-3 space-y-2">
                      <p className="text-xs font-black text-slate-600 dark:text-slate-300 mb-1">الضوابط التي يفرضها موظفو الوزارة</p>
                      {stage.controls.map((c, i) => {
                        const M = SEVERITY_META[c.severity];
                        const SIcon = M.icon;
                        return (
                          <div key={i} className="text-[11px] leading-relaxed">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${M.cls}`}>
                                <SIcon /> {M.label}
                              </span>
                              <span className="text-[9px] font-semibold text-muted-foreground">{c.by}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300">{c.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckDot() {
  return <span className="mt-1 w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 inline-block" aria-hidden />;
}
