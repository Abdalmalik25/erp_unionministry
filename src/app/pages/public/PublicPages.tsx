/**
 * الصفحات التعريفية العامة — تُبنى جميعها فوق PublicLayout
 * محتوى مؤسسي موسّع بأكورديون أصلي (بدون تبعيات) وحاويات تمرير
 */
import { useState } from "react";
import { Link } from "react-router";
import {
  Landmark, Scale, Database, Briefcase,
  HelpCircle, ChevronDown, ArrowLeft, PhoneCall, Mail, MapPin, Clock,
  FileText, ScrollText, BadgeCheck, Users, Handshake,
} from "lucide-react";
import { PublicLayout } from "./PublicLayout";
import { BRAND } from "../../branding";
import { NATIONAL_REGISTRIES, LEGAL_ITEMS, FAQ_ITEMS, VISION_COMMITMENTS, GUARANTEE_ITEMS } from "../../content/institutional";

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
  const uid = useState(() => `acc-${Math.random().toString(36).slice(2, 8)}`)[0];
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden divide-y divide-border/60">
      {items.map((it, i) => {
        const isOpen = open === i;
        const btnId = `${uid}-btn-${i}`;
        const panelId = `${uid}-panel-${i}`;
        return (
          <div key={it.title}>
            <button
              type="button"
              id={btnId}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-5 py-4 text-right hover:bg-accent/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ScrollText size={15} className={`shrink-0 ${isOpen ? "text-primary" : "text-muted-foreground"}`} />
              <span className="flex-1 font-bold text-sm text-foreground">{it.title}</span>
              <ChevronDown size={17} aria-hidden className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              hidden={!isOpen}
              className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
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
    title: "السياق الاستراتيجي",
    body: `يقف سوق العمل اليمني أمام معادلة صعبة: طموح وطني تنموي واسع، وبيئة تشغيل قاسية تتشابك فيها الورقيات المفقودة والسجلات المتضاربة وغياب المرجعية الموثوقة. وحين تضيع البيانة، تضيع معها الحقوق؛ وحين تتضارب الأرقام، تفقد السياسة العامة بوصلتها.

جاءت المنظومة الوطنية لتكسر هذه المعادلة من جذورها: مرجعية وطنية واحدة يثق فيها الجميع لأنها واحدة، وإجراءات مكتملة التوثيق لا تحتمل التفسير المزدوج، وبنية تعمل في أصعب الظروف الميدانية لا في أفضلها فقط. إنها استثمار الدولة مباشرة في الاستقرار الاجتماعي وفي مصداقية سوق العمل أمام المستثمر الوطني والدولي.`,
  },
  {
    title: "ما هي المنظومة الوطنية؟",
    body: `المنظومة الوطنية هي النظام الحكومي المرجعي الذي تمارس به وزارة الشؤون الاجتماعية والعمل إدارة قطاع العمل كاملاً: تسجيل المنشآت والنقابات، ترخيص التشغيل، توثيق العقود، التفتيش والامتثال، النزاعات العمالية، وخدمات أطراف السوق كلها — من نافذة واحدة، بمعايير واحدة، ومساءلة واحدة.

المبدأ الحاكم بسيط وصارم في آن: البيانات تُدخل مرة واحدة في سجلها الوطني فتعبّر كل الجهات بصلاحيات مضبوطة. لا نسخ متضاربة، ولا مسارات موازية، ولا قرار يخرج عن الدورة الموثقة.`,
  },
  {
    title: "الرؤية التي نعمل لها",
    body: "سوق عمل وطني يكون فيه التنظيم رافعة للإنتاجية لا عبئاً عليها؛ حيث تُدار الموارد البشرية الوطنية بوصفها الأصل الاستراتيجي الأول للتنمية، ويكون فيه امتثال القاعدة سلوكاً عادياً لأن العدالة في التطبيق مؤكدة، ويحظى فيه كل طرف — حكومياً كان أم نقابياً أم اقتصادياً أم عاملَ — بمكانة موثقة وصوت مسموع.",
  },
  {
    title: "رسالتنا المؤسسية",
    body: "أن نمنح كل طرفٍ في سوق العمل أدواته بدقة: للوزارة سلطة قرار مبنية على معلومة لحظية موثقة، وللنقابات تمثيلاً شرعياً محفوظاً بالوثائق، ولأصحاب العمل وضوحاً تكلفياً وزمنياً في كل طلب، وللعامل حقاً محفوظاً في ملف مهني لا يضيع ولا يُزوَّر — وذلك كلها عبر منظومة واحدة رسمية تجمع البيانات من منبعها، وتدير الإجراءات بشفافية كاملة، وتضمن المساءلة بسجل تدقيق غير قابل للتلاعب.",
  },
  {
    title: "الأهداف الاستراتيجية",
    body: `• مرجعية وطنية واحدة: انتهاء تشتت السجلات ببنية رقمية موحدة معتمدة للقطاع بأكمله.
• سياسات تقوم على الواقع: انتقال صناعة القرار من التقدير الانطباعي إلى المؤشر المستخرج من السجلات الحية.
• امتثال يكافئ الملتزم: تطبيق موحد معلن يجعل التهرب بلا جدوى والالتزام ميزة تنافسية.
• ترسيخ اليمننة آلياً: نسب التعيين الوطني مفروضة داخل دورات العمل ذاتها لا في التعليمات وحدها.
• خدمة بزمن ملائم: تقليص رحلة المستفيد من أيام الانتظار إلى دقائق إنجاز.
• حوكمة قابلة للمساءلة: كل قرار معلل وموثق وقابل للتتبع من أول خطوة إلى أرشيفه النهائي.
• استمرارية غير قابلة للتعطيل: عمل مكتمل الأداء ميدانياً ودون اتصال وعلى شبكات هشة.`,
  },
  {
    title: "من تخدمه المنظومة؟ (الأدوار الأربعة)",
    body: `وزارة الشؤون الاجتماعية والعمل: الجهة المنظمة والرقابية — تدير السجلات الوطنية، تعتمد القرارات، وتشرف على التفتيش والانتخابات النقابية.

النقابات ومنظمات أصحاب العمل: جهات ذات نفع عام تُدار إلكترونياً من التأسيس إلى الانتخابات والتقارير.

أصحاب العمل: المنشآت الخاصة — تسجيل وترخيص وإبلاغ وطلبات تخفيض ومتابعة امتثال.

العاملون: المستفيد النهائي — جواز رقمي موثق يجمع العقد والخبرة والشهادات والمطالبات.`,
  },
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
      ["تراخيص تشغيل العمالة الوافدة", "طلب ترخيص تشغيل العامل الأجنبي مرتبطاً بسجل المنشأة وحصص التعيين الوطني، وتجديد التراخيص والإقامات ضمن الدورة الموثقة ذاتها."],
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
      ["توثيق حوادث وإصابات العمل", "بلاغ إلكتروني إلزامي عن كل حادث عمل، فتح ملف التعويض وفق القانون، وربط الملف بسجل التفتيش والقضايا حتى التسوية."],
      ["اعتماد القرارات", "كل قرار يصدر بمسوغ ومرجع نظامي صريح وتاريخ ومعتمد باسمه — ويُؤرشف تلقائياً."],
      ["الحسابات والصلاحيات", "إنشاء الحسابات وإسناد الأدوار ومراجعة طلبات الانضمام حكراً على إدارة الحسابات."],
      ["المؤشرات والتقارير الرسمية", "لوحات وطنية وتقارير تستخرج من نفس السجلات التي يعمل عليها الجميع — لا تقارير موازية."],
    ],
  },
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
          {NATIONAL_REGISTRIES.map(([k, v]) => (
            <div key={k} className="border-b border-border/60 last:border-0 py-3.5">
              <p className="text-sm font-bold text-foreground flex items-center gap-2"><FileText size={13} className="text-primary shrink-0" />{k}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pr-5">{v}</p>
            </div>
          ))}
        </div>

        <h2 className="font-black text-lg mt-12 mb-4 flex items-center gap-2"><Handshake size={18} className="text-primary" />تعهداتنا أمام كل مستفيد</h2>
        <p className="text-xs text-muted-foreground mb-4 max-w-3xl leading-relaxed">
          عقدٌ مؤسسي معلن بين الوزارة وكل طرفٍ في سوق العمل — التزاماتنا المعلنة تجاهكم:
        </p>
        <Accordion items={VISION_COMMITMENTS.map(([t, b]) => ({ title: t, body: b }))} defaultOpen={-1} />

        <h2 className="font-black text-lg mt-12 mb-4 flex items-center gap-2"><BadgeCheck size={18} className="text-primary" />الضمانات الحكومية الثابتة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GUARANTEE_ITEMS.map(g => (
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
        <div className="rounded-xl border-r-4 border-primary/50 bg-primary/[.04] p-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            لكل خدمةٍ هنا وعدٌ رباعي: مستندات معلنة قبل التقديم، وزمنٌ محدد، ومسار موثق تتبعه خطوة بخطوة برقم مرجعي،
            وقرار معلل يعرف مصدره ومعتمده.
            الرسوم الحكومية محددة بقرارات وزارية معلنة ولا تُحصَّل بأي صورة خارج القنوات الرسمية — وأي طلبٍ خارجها يُوثَّق ويُعرض في سجل التدقيق.
          </p>
        </div>
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
            مبدأ «مصدر واحد للحقيقة»: البيانات تُدخل مرة واحدة في سجلها الوطني ثم تُستخدم عبر المنظومة كلها
            بصلاحيات مضبوطة. كل عرض للبيانة يوضح مصدرها الرسمي وسلسلة اعتمادها، ولا توجد نسخ متكررة قد تتعارض.
          </p>
        </div>
        <Accordion items={NATIONAL_REGISTRIES.map(([t, b]) => ({ title: t, body: b }))} defaultOpen={0} />
        <CtaLogin />
      </div>
    </PublicLayout>
  );
}

export function LegalPage() {
  return (
    <PublicLayout>
      <PageHero icon={Scale} title="الأساس القانوني" subtitle="سيادة القانون هي أساس الثقة — والثقة أساس سوق العمل الصحي" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-xl border-r-4 border-primary/50 bg-primary/[.04] p-4 mb-6">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            كل إجراء في هذه المنظومة — ترخيصٌ أو تفتيشٌ أو احتسابٌ أو عقوبة — يقف على نص نظامي صريح يُعرض
            أمام المعني فيه. لهذا لا تحدث مفاجآت: المنشأة تعرف مسبقاً ما يُحاسب عليه، والعامل يعرف حقوقه
            ونصها، والموظف يعرف حدود صلاحيته. هكذا يتحول القانون من نص يُستحضر عند الخلاف إلى بنية عمل يومية،
            في انسجامٍ مع اتفاقيات منظمة العمل الدولية ذات الصلة التي صادقت عليها الجمهورية اليمنية.
          </p>
        </div>
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
    { icon: Clock, title: "أوقات العمل", value: "السبت – الأربعاء، 8:00 ص – 2:00 م", note: "المنظومة الإلكترونية تعمل على مدار الساعة" },
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
