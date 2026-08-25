/**
 * الصفحات التعريفية العامة — تُبنى جميعها فوق PublicLayout
 * محتوى مؤسسي موسّع بأكورديون أصلي (بدون تبعيات) وحاويات تمرير
 */
import { useState } from "react";
import { Link } from "react-router";
import {
  Landmark, Scale, Database, Briefcase,
  HelpCircle, ChevronDown, ArrowLeft, PhoneCall, Mail, MapPin, Clock,
  FileText, ScrollText, BadgeCheck, Users,
} from "lucide-react";
import { PublicLayout } from "./PublicLayout";
import { BRAND } from "../../branding";

/* ============ مكوّنات مشتركة ============ */

function PageHero({ icon: Icon, title, subtitle }: { icon: typeof Landmark; title: string; subtitle: string }) {
  return (
    <section className="bg-gradient-to-bl from-[#0b1526] to-[#101a3a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center">
            <Icon size={20} />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">{title}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Accordion({ items, defaultOpen = 0 }: { items: { title: string; body: string }[]; defaultOpen?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden divide-y divide-border/60">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.title}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-5 py-4 text-right hover:bg-accent/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ScrollText size={15} className={`shrink-0 ${isOpen ? "text-primary" : "text-muted-foreground"}`} />
              <span className="flex-1 font-bold text-sm text-foreground">{it.title}</span>
              <ChevronDown size={17} className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 pr-[52px] text-[13px] leading-relaxed text-muted-foreground whitespace-pre-line max-h-80 overflow-y-auto">
                  {it.body}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CtaLogin() {
  return (
    <div className="mt-10 rounded-2xl border border-primary/25 bg-primary/[.04] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <p className="font-black text-sm text-foreground">جاهز للانتقال إلى بوابتك؟</p>
        <p className="text-xs text-muted-foreground mt-1">الدخول متاح للحسابات المعتمدة من إدارة الحسابات بالوزارة</p>
      </div>
      <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow hover:opacity-90 active:scale-[.98] transition-all shrink-0">
        بوابة الدخول <ArrowLeft size={15} />
      </Link>
    </div>
  );
}

/* ============ المحتوى الرسمي المشترك ============ */

const ABOUT_SECTIONS: { title: string; body: string }[] = [
  {
    title: "ما هي المنظومة الوطنية للعمل النقابي؟",
    body: `المنظومة الوطنية للعمل النقابي هي النظام الحكومي الموحّد لإدارة قطاع العمل في الجمهورية اليمنية، تعتمده وزارة الشؤون الاجتماعية والعمل مرجعاً رسمياً واحداً لكل ما يتعلق بعلاقات العمل: تسجيل المنشآت والنقابات، ترخيص التشغيل، توثيق العقود، التفتيش والامتثال، النزاعات العمالية، وخدمات أصحاب العمل والعاملين.

صُممت المنظومة لتُنهي تشتت السجلات الورقية والأنظمة المتفرقة: بيانة واحدة تُدخل في سجلها الوطني ثم تعبر كل الجهات بصلاحيات مضبوطة، وكل إجراء يمضي في مسار موثق لا يمكن اختصاره أو إخفاء أي خطوة منه.`,
  },
  {
    title: "الرؤية",
    body: "سوق عمل يمني منظّم وعادل وموثّق: كل منشأة مسجلة، كل عقد موثق، كل تفتيش معلن، وكل قرار مستند إلى نص نظامي — بخدمة إلكترونية سريعة تعمل حتى في أصعب الظروف الميدانية.",
  },
  {
    title: "الرسالة",
    body: "تمكين الوزارة والنقابات وأصحاب العمل والعاملين من منصة واحدة رسمية تجمع البيانات مرة واحدة بمصدرها الموثق، وتُدير الإجراءات بدورة كاملة شفافة، وتضمن المساءلة عبر سجل تدقيق غير قابل للتلاعب.",
  },
  {
    title: "الأهداف الاستراتيجية",
    body: `• توحيد السجلات الوطنية لقطاع العمل في مرجعية رقمية واحدة معتمدة.
• رفع نسبة الامتثال الترخيصي والعقدي عبر أتمتة الإجراءات والتفتيش.
• تقليص زمن الخدمات على المراجعين من أيام إلى دقائق.
• ترسيخ اليمننة وفق السياسة الوطنية المعتمدة بنسب ملزمة آلياً.
• حوكمة كاملة: كل قرار معلل وموثق وقابل للتتبع من البداية للنهاية.
• استمرارية العمل في كل الظروف: ميدانياً، دون اتصال، وبشبكات ضعيفة.`,
  },
  {
    title: "من يخدمه النظام؟ (الأدوار الأربعة)",
    body: `وزارة الشؤون الاجتماعية والعمل: الجهة المنظمة والرقابية — تدير السجلات الوطنية، تعتمد القرارات، وتشرف على التفتيش والانتخابات النقابية.

النقابات ومنظمات أصحاب العمل: جهات ذات نفع عام تُدار إلكترونياً من التأسيس إلى الانتخابات والتقارير.

أصحاب العمل: المنشآت الخاصة — تسجيل وترخيص وإبلاغ وطلبات تخفيض ومتابعة امتثال.

العاملون: المستفيد النهائي — جواز رقمي موثق يجمع العقد والخبرة والشهادات والمطالبات.`,
  },
];

const REGISTRIES_ROWS: [string, string][] = [
  ["سجل الأشخاص", "القاعدة المرجعية الوطنية لكل شخص له تعامل مع منظومة العمل: البيانات الأساسية، المعرفات الرسمية، وحالة النفاذ — تُستكمل مرة واحدة وتُعتمد في كل السجلات الأخرى."],
  ["سجل المنشآت", "بيانات المنشآت الخاصة وأرقامها التجارية، فروعها، نشاطها الاقتصادي وفق التصنيف الدولي، حالتها الترخيصية، وملاك تشغيلها."],
  ["سجل العاملين", "الملف المهني الوطني للعامل: المؤهلات، الخبرات، الوظائف المتقلدة، والتاريخ المهني الموثق من أول يوم عمل."],
  ["سجل العقود", "عقود العمل الفردية والجماعية بنصوصها ومددها وأطرافها، مع ربط آلي بحالة المنشأة والعامل وسجل التفتيش."],
  ["سجل التفتيش", "زيارات التفتيش الميداني، الملاحظات، المخالفات المرصودة، الإشعارات الصادرة، ومتابعة التصحيح حتى الإغلاق."],
  ["سجل القضايا", "النزاعات العمالية بجميع مراحلها: التسوية الودية، الجلسات، الأحكام، والتنفيذ — بسلسلة إجراءات مكتملة التوثيق."],
  ["سجل النقابات", "تأسيس النقابات ومنظمات أصحاب العمل، مجالس إدارتها، جمعياتها العمومية، انتخاباتها، ومراسلاتها الرسمية."],
  ["المرجع النظامي", "النصوص القانونية واللوائح ذات الصلة بقطاع العمل مرتبة ومحدثة، وكل قرار في المنظومة يستند إلى مرجع صريح منها."],
  ["اللوائح التنظيمية", "القرارات الوزارية والتعميمات المنظمة للعمل، مع تواريخ النفاذ والحالات الملغاة — لضمان العمل بالنص الساري فقط."],
  ["البحث الموحد", "نافذة بحث واحدة عبر جميع السجلات بصلاحيات المستخدم، تُظهر النتيجة بمصدرها ورابط سياقها الكامل."],
];

const SERVICES_BY_PORTAL: { portal: string; who: string; rows: [string, string][] }[] = [
  {
    portal: "خدمات أصحاب العمل",
    who: "للمنشآت الخاصة — عبر منصة أصحاب العمل",
    rows: [
      ["تسجيل منشأة جديدة", "نموذج إلكتروني واحد مع رفع المستندات الرسمية، ورقم مرجعي لمتابعة الطلب لحظة بلحظة حتى القرار."],
      ["إضافة الفروع وتحديث البيانات", "تعديل النشاط أو العنوان أو الملاك عبر طلبات موثقة تُراجع من الجهة المختصة دون مراجعة ميدانية."],
      ["طلبات الترخيص والتجديد", "دورة ترخيص كاملة آلياً مع فحص الالتزام بنسبة التعيين الوطني المعتمدة وإشعار بالمتطلبات قبل انتهاء المدة."],
      ["الإبلاغ الدوري عن العمالة", "نماذج إبلاغ موحدة عن التعيينات والإنهاءات تتغذى مباشرة في سجلات العاملين والعقود الوطنية."],
      ["طلب تخفيض نسبة التعيين", "تقديم الطلب بالمستندات المؤيدة، ومراجعته وفق القرار الوزاري المنظم، وإشعار رسمي بالقرار المعلل."],
      ["متابعة الزيارات التفتيشية", "عرض الزيارات المجدولة، نتائج المعاينة، المخالفات المرصودة، ومتابعة التصحيح حتى الإغلاق."],
    ],
  },
  {
    portal: "خدمات النقابات والمنظمات",
    who: "للنقابات ومنظمات أصحاب العمل",
    rows: [
      ["التأسيس والتسجيل", "طلب تأسيس نقابة أو اتحاد أو منظمة أصحاب عمل بالمتطلبات النظامية كاملة إلكترونياً."],
      ["الانتخابات النقابية", "جدولة الجمعيات العمومية، كشوف الناخبين، إجراء الاقتراع بإشراف الوزارة، وتوثيق النتائج رسمياً."],
      ["مجالس الإدارة والهياكل", "تحديث المكاتب التنفيذية والمجالس بعد كل انتخابات أو تعديل عضوية بسند موثق."],
      ["المحاضر والتقارير الدورية", "رفع محاضر الاجتماعات والتقارير المالية والأنشطتها ضمن مواعيد النظام مع تأكيد استلام رسمي."],
      ["المراسلات الرسمية", "تبادل الخطابات مع الوزارة داخل المنظومة — كل رسالة برقم قيد وحالة تتبع."],
    ],
  },
  {
    portal: "خدمات العاملين",
    who: "لكل عامل — عبر جواز العامل الرقمي",
    rows: [
      ["جواز العامل الرقمي", "ملف مهني موثق يجمع بياناتك الوظيفية من مصادرها الرسمية: عقودك، خبرتك، شهاداتك، وسجل خدمتك."],
      ["سجل الخدمة الموثق", "مدد العمل الفعلية لدى المنشآت المسجلة — يُحدَّث آلياً من سجلات العقود ولا يحتاج تصديقاً ورقياً."],
      ["متابعة المطالبات", "حالة أي مطالبة عمالية مقدمة: مرحلتها، جلساتها، والقرارات الصادرة فيها — بشفافية كاملة."],
      ["تنبيهات الوثائق", "إشعار آلي قبل انتهاء الإقامة أو الترخيص أو العقد لتجنّب الانقطاع والغرامات."],
    ],
  },
  {
    portal: "خدمات الوزارة والتفتيش",
    who: "للموظفين المعتمدين — عبر بوابة الوزارة",
    rows: [
      ["إدارة السجلات الوطنية", "تشغيل كامل للسجلات العشرة بصلاحيات دقيقة وقيود إدخال موحدة تمنع البيانات الناقصة."],
      ["التفتيش الميداني الرقمي", "جدولة الزيارات، تسجيل المعاينة من الميدان (يعمل دون إنترنت ويزامن لاحقاً)، وإصدار الإشعارات فورياً."],
      ["اعتماد القرارات", "كل قرار يصدر بمسوغ ومرجع نظامي صريح وتاريخ ومعتمد باسمه — ويُؤرشف تلقائياً."],
      ["الحسابات والصلاحيات", "إنشاء الحسابات وإسناد الأدوار ومراجعة طلبات الانضمام حكراً على إدارة الحسابات."],
      ["المؤشرات والتقارير الرسمية", "لوحات وطنية وتقارير تستخرج من نفس السجلات التي يعمل عليها الجميع — لا تقارير موازية."],
    ],
  },
];

const LEGAL_ITEMS: [string, string][] = [
  ["قانون العمل اليمني", "المرجع الأم لعلاقات العمل: العقود الفردية والجماعية، الأجور، ساعات العمل، الإجازات، سلامة البيئة العملية، إنهاء الخدمة، وتسوية النزاعات — وتُفصَّل أحكامه التنفيذية في اللوائز المصاحبة له. كل إجراء في المنظومة يتصل تلقائياً بالمادة الناظمة له."],
  ["قانون المنظمات النقابية", "ينظّم حق التنظيم النقابي لأصحاب العمل والعاملين: إجراءات التأسيس والترخيص، الهياكل التنظيمية، الجمعيات العمومية، انتخابات المجالس، أموال المنظمات ورقابتها، وعلاقتها الرسمية بوزارة الشؤون الاجتماعية والعمل."],
  ["سياسة اليمننة ونسبة التعيين", "السياسة الوطنية لإيراد العمالة الوطنية في الوظائف والمناصب. النسبة المعتمدة حالياً هي 80% وتُطبَّق آلياً داخل المنظومة على طلبات الترخيص والتوسع والتخفيض وفق القرار الوزاري المنظم — ولا يمكن تجاوزها إلا بقرار رسمي معلل يسري في النظام."],
  ["أنظمة التفتيش والجزاءات", "إجراءات المعاينة والتفتيش الميداني، صلاحيات المفتشين، تصنيف المخالفات درجةً درجة، الجزاء المقابل لكل مخالفة نصاً، إجراءات الإشعار والتصحيح، وحق الاعتراض والتظلم ومواعيده."],
  ["حماية البيانات الشخصية", "تجاه بيانات العاملين والمنشآت: جمع الحد الأدنى اللازم، تقييد الوصول بالدور الوظيفي، تشفير البيانات الحساسة، ومنع الاستخدام خارج الغرض الرسمي الذي جُمعت له — مع سجل تدقيق يوثق كل اطلاع حساس."],
];

const FAQ_ITEMS: [string, string][] = [
  ["هل القرار الذي تصدره المنصة نهائي؟", "لا. المنصة تجمع المعطيات وتعرض التحليل والمسوغ النظامي، لكن القرار النهائي يبقى دائماً بيد المختص البشري المعتمد — هذا مبدأ ثابت في تصميم المنظومة."],
  ["ماذا لو انقطع الإنترنت أثناء العمل الميداني؟", "تستمر المنصة في العمل بشكل كامل على جهازك: تُحفظ كل عملية في ذاكرة محلية آمنة داخل الجهاز، وعند عودة الاتصال تُزامَن تلقائياً مع الخادم دون أي تدخل. ولا تُعتبر العملية منجزة إلا بعد تأكيد استلام الخادم لها؛ فلا تضيع أي بيانات."],
  ["هل يمكن لأحد تعديل سجل التدقيق؟", "مستحيل تقنياً. كل قيد يحمل بصمة رقمية مرتبطة بالقيد الذي قبله؛ أي تعديل أو حذف يكسر السلسلة ويُكتشف فوراً. والجدول نفسه مقفل ضد التعديل والحذف على مستوى قاعدة البيانات نفسها."],
  ["كيف تُحمى بيانات الأشخاص؟", "البيانات الشخصية الحساسة مشفرة بمعيار AES-256 داخل قاعدة البيانات، وكلمات المرور تُحفظ بمشتق تشفير scrypt لا يسمح باسترجاعها، والصلاحيات مبنية على الحد الأدنى: كل حساب يرى ما يتطلبه دوره فقط، وكل اطلاع حساس يُسجَّل باسم صاحبه."],
  ["من يحق له إنشاء الحسابات؟", "إنشاء الحسابات وإسناد الأدوار حكر على إدارة الحسابات بالوزارة. طلبات الانضمام تُقدَّم إلكترونياً من شاشة الدخول وتُراجع وتُعتمد رسمياً، ولا يمكن لأي جهة أخرى منح نفاذ."],
  ["هل تُحتسب درجة خطورة أو عقوبة تلقائياً؟", "لا تُحتسب أي درجة عقوبة إلا بنص نظامي صريح ينظمها، والمنظومة تعرض الأساس النظامي لكل احتساب مع إمكانية مراجعته والاعتراض عليه وفق الإجراءات المنظمة."],
  ["هل يعمل النظام على الهاتف؟", "نعم. المنظومة تطبيق ويب متقدم يعمل من المتصفح مباشرة على الهاتف والحاسب، ويمكن تثبيته كتطبيق مستقل من المتصفح دون الحاجة إلى متجر تطبيقات، ويستمر بالعمل عند انقطاع الاتصال."],
  ["كم تستغرق خدمات الترخيص؟", "بعد اكتمال المستندات، تمر الطلب الآلي بدورة فحص واعتماد موثقة داخل المنظومة، ويظهر لك رقم مرجعي وحالة الطلب لحظياً. الهدف المعتمد: تقليص ما كان يستغرق أياماً إلى دقائق من وقت المراجع."],
];

/* ============ الصفحات ============ */

export function AboutPage() {
  return (
    <PublicLayout>
      <PageHero icon={Landmark} title="عن المنظومة" subtitle="التعريف المؤسسي الشامل: النظام، الرؤية، الأهداف، والأدوار" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Accordion items={ABOUT_SECTIONS} />

        <h2 className="font-black text-lg mt-12 mb-1 flex items-center gap-2"><Database size={18} className="text-primary" />السجلات الوطنية العشرة</h2>
        <p className="text-xs text-muted-foreground mb-4">البنية المرجعية الموحدة التي تقوم عليها المنظومة — تفصيلاً</p>
        <div className="rounded-2xl border bg-card px-4 py-1 shadow-sm max-h-[420px] overflow-y-auto">
          {REGISTRIES_ROWS.map(([k, v]) => (
            <div key={k} className="border-b border-border/60 last:border-0 py-3.5">
              <p className="text-sm font-bold text-foreground flex items-center gap-2"><FileText size={13} className="text-primary shrink-0" />{k}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pr-5">{v}</p>
            </div>
          ))}
        </div>

        <h2 className="font-black text-lg mt-12 mb-4 flex items-center gap-2"><BadgeCheck size={18} className="text-primary" />الضمانات الحكومية الثابتة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "النظام لا يصدر حكماً نهائياً — القرار النهائي للمختص البشري",
            "لا عقوبة إلا بنص نظامي صريح ينظمها",
            "كل قرار يوضح سببه ومرجعه النظامي وتاريخه ومعتمده",
            "البيانات التاريخية محفوظة كاملة بمصدرها وسلسلة اعتمادها",
            "سجل تدقيق مقفل بتقنية البصمات المتسلسلة ضد أي تلاعب",
            "استمرارية ميدانية كاملة حتى دون اتصال بالإنترنت",
          ].map(g => (
            <div key={g} className="flex items-start gap-2.5 rounded-xl border bg-card p-3.5">
              <BadgeCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-foreground leading-relaxed">{g}</p>
            </div>
          ))}
        </div>
        <CtaLogin />
      </div>
    </PublicLayout>
  );
}

export function ServicesPage() {
  return (
    <PublicLayout>
      <PageHero icon={Briefcase} title="الخدمات الإلكترونية" subtitle="ماذا يمكنك إنجازه إلكترونياً — بحسب بوابتك" />
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {SERVICES_BY_PORTAL.map(sec => (
          <section key={sec.portal}>
            <h2 className="font-black text-base text-foreground">{sec.portal}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">{sec.who}</p>
            <Accordion items={sec.rows.map(([t, b]) => ({ title: t, body: b }))} defaultOpen={-1} />
          </section>
        ))}
        <CtaLogin />
      </div>
    </PublicLayout>
  );
}

export function RegistriesPage() {
  return (
    <PublicLayout>
      <PageHero icon={Database} title="السجلات الوطنية العشرة" subtitle="مرجعية رقمية واحدة لقطاع العمل — كل بيانة من مصدرها" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-xl border-r-4 border-primary/50 bg-primary/[.04] p-4 mb-6">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            مبدأ «مصدر واحد للحقيقة»: أي بيانة تُدخل مرة واحدة في سجلها الوطني ثم تُستخدم عبر المنظومة كلها
            بصلاحيات مضبوطة. كل عرض للبيانة يوضح مصدرها الرسمي وسلسلة اعتمادها، ولا توجد نسخ متكررة قد تتعارض.
          </p>
        </div>
        <Accordion items={REGISTRIES_ROWS.map(([t, b]) => ({ title: t, body: b }))} defaultOpen={0} />
        <CtaLogin />
      </div>
    </PublicLayout>
  );
}

export function LegalPage() {
  return (
    <PublicLayout>
      <PageHero icon={Scale} title="الأساس القانوني" subtitle="النصوص المنظِّمة التي تعمل بها المنظومة في كل إجراء" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Accordion items={LEGAL_ITEMS.map(([t, b]) => ({ title: t, body: b }))} />
        <div className="rounded-xl border-r-4 border-amber-500/60 bg-amber-500/[.05] p-4 mt-8">
          <p className="text-[13px] text-foreground font-bold leading-relaxed">
            قاعدة ثابتة: لا تُحتسب أي درجة خطورة أو عقوبة داخل المنظومة إلا بنص نظامي صريح ينظمها،
            ويعرض النظام أساس الاحتساب دائماً مع إمكانية الاعتراض وفق الإجراءات المنظمة.
          </p>
        </div>
        <CtaLogin />
      </div>
    </PublicLayout>
  );
}

export function FaqPage() {
  return (
    <PublicLayout>
      <PageHero icon={HelpCircle} title="الأسئلة الشائعة" subtitle="إجابات رسمية مختصرة عن أكثر الاستفسارات تكراراً" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Accordion items={FAQ_ITEMS.map(([t, b]) => ({ title: t, body: b }))} />
        <div className="mt-6 rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">لم تجد إجابتك؟ فريق الدعم الرسمي جاهز عبر قنوات التواصل المعتمدة</p>
          <Link to="/contact" className="inline-flex items-center gap-1.5 mt-2 text-primary font-bold text-sm hover:underline">
            صفحة التواصل الرسمي <ArrowLeft size={14} />
          </Link>
        </div>
        <CtaLogin />
      </div>
    </PublicLayout>
  );
}

export function ContactPage() {
  const channels = [
    { icon: PhoneCall, title: "الدعم الفني", value: BRAND.supportPhone, note: "خط مجاني — خلال ساعات العمل الرسمية" },
    { icon: Mail, title: "البريد الرسمي", value: BRAND.supportEmail, note: "للأعطال الفنية والاستفسارات المؤسسية" },
    { icon: MapPin, title: "المقر", value: "وزارة الشؤون الاجتماعية والعمل — صنعاء", note: "إدارة المنظومة الوطنية لقطاع العمل" },
    { icon: Clock, title: "أوقات العمل", value: "الأحد – الخميس، 8:00 ص – 2:00 م", note: "المنظومة الإلكترونية تعمل على مدار الساعة" },
  ];
  return (
    <PublicLayout>
      <PageHero icon={PhoneCall} title="تواصل معنا" subtitle="قنوات الدعم والتواصل الرسمي المعتمدة" />
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {channels.map(c => (
            <div key={c.title} className="rounded-2xl border bg-card p-5">
              <span className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <c.icon size={19} />
              </span>
              <h3 className="font-black text-sm mt-3.5 text-foreground">{c.title}</h3>
              <p className="text-sm text-primary font-bold mt-1" dir={c.value.includes("@") || c.value.includes("-") ? "ltr" : undefined}>{c.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/40">
            <h2 className="font-black text-sm flex items-center gap-2"><Users size={16} className="text-primary" />طلب حساب جديد</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">للمنشآت والنقابات والموظفين — يُراجع من إدارة الحسابات بالوزارة</p>
          </div>
          <div className="p-5 text-[13px] text-muted-foreground leading-relaxed space-y-2">
            <p>1. انتقل إلى <Link to="/login" className="text-primary font-bold hover:underline">بوابة الدخول</Link>.</p>
            <p>2. اختر نوع الحساب المناسب (منشأة / نقابة / موظف).</p>
            <p>3. اضغط «طلب حساب» واملأ النموذج بالمستندات الرسمية.</p>
            <p>4. ستصل الموافقة إلى بريدك الرسمي بعد المراجعة، ثم تدخل بحسابك مباشرة.</p>
          </div>
        </div>

        <div className="rounded-xl border-r-4 border-amber-500/60 bg-amber-500/[.05] p-4">
          <p className="text-[13px] font-bold text-foreground leading-relaxed">
            تنبيه أمني: لن تطلب إدارة النظام كلمة المرور الخاصة بك أبداً بأي صورة.
            لا تشاركها مع أي جهة، واستخدم قناة الدعم الرسمية فقط.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
