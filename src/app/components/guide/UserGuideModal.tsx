/**
 * دليل المستخدم الرسمي — المنظومة الوطنية لإدارة قطاع العمل
 * دليل مؤسسي نهائي موجّه حسب دور المستخدم، يعرض دورة العمل الكاملة لكل ركيزة.
 */
import { useState } from 'react';
import {
  X, Landmark, Building2, Users, HardHat, ShieldCheck, FileSearch,
  BarChart3, Settings2, BookOpen, ChevronDown,
} from 'lucide-react';

interface GuideSection {
  icon: React.ElementType;
  title: string;
  intro: string;
  steps: string[];
}

const MINISTRY_GUIDE: GuideSection[] = [
  {
    icon: Landmark,
    title: 'إدارة المنظومة والحسابات',
    intro: 'بصفتك مدير الوزارة تملك وصولاً شاملاً لكل مكونات المنظومة وفق اللوائح المنظمة لقطاع العمل.',
    steps: [
      'من «إدارة الحسابات والجلسات والرقابة» راجع طلبات فتح الحسابات الجديدة ووافق عليها أو ارفضها مع توثيق السبب.',
      'فعّل أو أوقف أي حساب مستخدم — مع حماية نظامية تمنع تعطيل آخر مدير نشط.',
      'راقب الجلسات النشطة وأنهِ أي جلسة مشتبه بها فوراً؛ كل عملية تُسجل في سجل التدقيق الأمني.',
      'اضبط الإعدادات العامة للنظام من شاشة الإدارة: اسم الوزارة، السند القانوني، سياسات كلمات المرور ومدة الجلسات.',
    ],
  },
  {
    icon: Building2,
    title: 'سجل المنشآت وسوق العمل',
    intro: 'حوكمة كاملة لدورة حياة المنشأة من التسجيل حتى الإقفال.',
    steps: [
      'راجع طلبات تسجيل المنشآت الجديدة وأقرها لتُصدر الأرقام الوطنية تلقائياً (بادئة NE-).',
      'أضف الفروع التجارية للمنشآت وحدّث بياناتها؛ الحذف إجراء أرشيفي ناعم قابل للاستعادة.',
      'أدر تراخيص العمالة الوافدة وطلبات التقليص الاقتصادي عبر مسارات الموافقة المعتمدة.',
      'استخدم الإرساليات لتوجيه العمالة بين المنشآت مع متابعة حالة كل إرسالية.',
    ],
  },
  {
    icon: Users,
    title: 'السجلات الأساسية وشؤون العمل',
    intro: 'أحد عشر سجلاً مؤسسياً مترابطاً حول الشخص (الملف الديموغرافي الموحد بالرقم القومي).',
    steps: [
      'ابدأ بسجل المديريات ومكاتب الوزارة لبناء الهيكل الجغرافي الإداري.',
      'سجّل الموظفين والمفتشين — يُولَّد الرقم الوظيفي تلقائياً ويُربط حسابهم بالمكتب التابعين له.',
      'وثّق الإصابات والأمراض المهنية والتأمينات وشهادات اللياقة الصحية والخبرة.',
      'سجلات العمالة غير المنتظمة تتيح ضم العامل خارج التغطية الرسمية تدريجياً.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'التفتيش والمخالفات والنزاعات',
    intro: 'الدورة القانونية الكاملة: معاينة ← محضر ← مخالفة ← إجراء ← صلح أو قضية.',
    steps: [
      'جهّز معايير التفتيش لكل نشاط اقتصادي قبل إرسال فرق الميدان.',
      'في محاضر OSH وثّق الملاحظات وصنف خطورتها؛ تُولد المخالفات المرتبطة تلقائياً.',
      'تابع المخالفات خلال سير حالاتها (مفتوحة ← مراجعة ← محلولة/مغلقة/مستأنفة).',
      'أدر المنازعات العمالية عبر مراحل الصلح وفق المادة 128 من قانون العمل.',
    ],
  },
  {
    icon: BarChart3,
    title: 'التقارير والذكاء المؤسسي',
    intro: 'قرارات مبنية على بيانات حقيقية محدثة لحظياً.',
    steps: [
      'لوحة القيادة المركزية تعرض مؤشرات السوق عبر المحافظات الـ21 مباشرة من قاعدة البيانات.',
      'التحليل المقارن واستشراف AI يساعد في قرارات التوطين وتخطيط العمالة.',
      'كل تقرير قابل للطباعة والتصدير الرسمي بترويسة الوزارة.',
    ],
  },
];

const EMPLOYER_GUIDE: GuideSection[] = [
  {
    icon: Building2,
    title: 'تسجيل المنشأة وإدارة حسابك',
    intro: 'بوابة أصحاب العمل لإدارة العلاقة الرسمية مع الوزارة.',
    steps: [
      'إن لم تُسجل منشأتك بعد: ابحث عنها في بوابة الدخول ثم قدّم طلب تسجيل فوري.',
      'بعد اعتماد طلبك تصلك بيانات الدخول ويصبح رقمك الوطني (NE-) هويتك في كل التعاملات.',
      'حدّث بيانات المنشأة والفروع التجارية فور أي تغيير حفاظاً على سجلك الرسمي.',
    ],
  },
  {
    icon: Users,
    title: 'إدارة العاملين',
    intro: 'الامتثال لمتطلبات التوطين وتوثيق عقود العمل.',
    steps: [
      'احتفظ بسجل محدث لعمال منشأتك واربطهم بالمهن الموثقة من استوديو التوصيف.',
      'قدّم طلبات تراخيص العمالة غير اليمنية وفق النسب المسموح بها لنشاطك.',
      'عند الحاجة للتقليص الاقتصادي قدّم الطلب عبر المسار الرسمي وانتظر القرار الوزاري.',
    ],
  },
  {
    icon: FileSearch,
    title: 'التفتيش والامتثال',
    intro: 'استعداد دائم لزيارات التفتيش ومعالجة الملاحظات.',
    steps: [
      'تابع تنبيهات الامتثال وعالج الملاحظات قبل تحويلها لمخالفات.',
      'في حال تسجيل مخالفة لك يمكنك تقديم اعتراض (استئناف) خلال المهلة النظامية.',
      'احتفظ بشهادات اللياقة الصحية والخبرة لعاملين متاحة للمعاينة الميدانية.',
    ],
  },
];

const UNION_GUIDE: GuideSection[] = [
  {
    icon: Users,
    title: 'الحساب النقابي والتسجيل',
    intro: 'بوابة النقابات والاتحادات العمالية.',
    steps: [
      'اطلب فتح حساب نقابي من بوابة الدخول؛ يراجعه موظفو الوزارة وفق قانون النقابات.',
      'حدّث الهيكل النقابي والعلاقات مع الاتحادات العامة من شاشة الهيكل والتبعيات.',
    ],
  },
  {
    icon: HardHat,
    title: 'إدارة العضوية والانتخابات',
    intro: 'حوكمة عضوية نقابية شفافة.',
    steps: [
      'سجل النقابيين وحدث بياناتهم باستمرار؛ كل عضو يرتبط برقمه القومي الشخصي.',
      'وثّق مجالس وهيئات الإدارة ودوراتها الانتخابية بمحاضر رسمية.',
      'أعلن الانتخابات مسبقاً ووثّق نتائجها في سجل الانتخابات.',
    ],
  },
  {
    icon: FileSearch,
    title: 'الدفاع عن حقوق العمال',
    intro: 'شراكة مؤسسية مع الوزارة.',
    steps: [
      'بلّغ عن المخالفات العمالية التي تطال منسوبيك لتتحول لمسار التفتيش الرسمي.',
      'شارك في جلسات الصلح للمنازعات العمالية ممثلاً عن العمال.',
    ],
  },
];

const WORKER_GUIDE: GuideSection[] = [
  {
    icon: HardHat,
    title: 'ملفك المهني الرقمي',
    intro: 'ملفك الرسمي في منظومة قطاع العمل.',
    steps: [
      'اطلب فتح حساب عامل من بوابة الدخول برقمك القومي الشخصي.',
      'ملفك يجمع: شهادات الخبرة، شهادات اللياقة الصحية، سجل الإصابات إن وجدت، وحالة التأمين.',
      'إن كنت عاملاً غير منتظم سجّل في سجل العمالة غير المنتظمة لتنظيم وضعك تدريجياً.',
    ],
  },
  {
    icon: FileSearch,
    title: 'حقوقك ومسارات الشكوى',
    intro: 'قانون العمل يحميك والمنصة تتيح الوصول لحقوقك.',
    steps: [
      'يمكنك تقديم شكوى ضد مخالفة صاحب العمل فتتحول لمسار التفتيش الرسمي.',
      'في النزاع مع صاحب العمل يُستدعاك لجلسات الصلح أمام مكتب العمل المختص.',
    ],
  },
];

function guideForRole(role: string | undefined): { title: string; sections: GuideSection[] } {
  if (role === 'employer_admin' || role === 'hr_officer') return { title: 'دليل أصحاب العمل', sections: EMPLOYER_GUIDE };
  if (role === 'union_president' || role === 'financial_officer') return { title: 'دليل النقابات', sections: UNION_GUIDE };
  if (role === 'worker') return { title: 'دليل العاملين', sections: WORKER_GUIDE };
  return { title: 'دليل موظفي وإداريي الوزارة', sections: MINISTRY_GUIDE };
}

export function UserGuideModal({ open, onClose, role }: { open: boolean; onClose: () => void; role?: string }) {
  const [openIdx, setOpenIdx] = useState(0);
  if (!open) return null;
  const { title, sections } = guideForRole(role);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose} dir="rtl">
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* الترويسة */}
        <header className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
          <span className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
            <BookOpen size={19} className="text-blue-600 dark:text-blue-400" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">وزارة الشؤون الاجتماعية والعمل — قطاع العمل</p>
          </div>
          <button onClick={onClose} aria-label="إغلاق الدليل"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer">
            <X size={17} />
          </button>
        </header>

        {/* المحتوى */}
        <div className="overflow-y-auto p-4 space-y-2.5">
          {sections.map((s, i) => {
            const Icon = s.icon;
            const isOpen = openIdx === i;
            return (
              <section key={s.title} className="rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden">
                <button
                  onClick={() => setOpenIdx(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 py-3 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-amber-600 dark:text-amber-400" />
                  </span>
                  <span className="flex-1 font-bold text-sm text-slate-900 dark:text-white">{s.title}</span>
                  <ChevronDown size={15} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2.5 bg-slate-50/60 dark:bg-slate-800/30">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{s.intro}</p>
                    <ol className="space-y-2">
                      {s.steps.map((st, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-[10px] font-black flex items-center justify-center shrink-0">
                            {j + 1}
                          </span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </section>
            );
          })}

          <footer className="pt-3 px-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Settings2 size={12} className="shrink-0" />
            لأي استفسار تقني: support@ministry.gov.ye — الدعم: 8000-MOL
          </footer>
        </div>
      </div>
    </div>
  );
}

export default UserGuideModal;
