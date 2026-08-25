/**
 * PlatformGuide — التعريف الموسّع بالمنظومة الوطنية للعمل النقابي
 * أكورديون مؤسسي (بدون تبعيات خارجية) + حاويات تمرير أنيقة للمحتوى الطويل
 */
import { useState } from "react";
import { ChevronDown, Landmark, Scale, Database, Workflow, ShieldCheck, WifiOff, Briefcase, HelpCircle, PhoneCall, ScrollText, Users, FileText } from "lucide-react";
import { NATIONAL_REGISTRIES, LEGAL_ITEMS as LEGAL, FAQ_ITEMS as FAQ } from "../../content/institutional";

const SERVICES: [string, string][] = [
  ["خدمات أصحاب العمل", "تسجيل منشأة جديدة، إضافة فروع، طلبات ترخيص وتجديد، إبلاغ دوري عن العمالة، طلبات تخفيض نسبة التعيين، واستعلام الحالة الترخيصية آنياً."],
  ["خدمات النقابات", "طلب تأسيس نقابة أو اتحاد، حجز موعد جمعية عمومية، إجراء انتخابات نقابية بإشراف الوزارة، رفع محاضر الاجتماعات والتقارير الدورية."],
  ["خدمات العاملين", "استخراج جواز العامل الرقمي، سجل الخدمة الموثق، شهادات الخبرة والتدريب، متابعة المطالبات وحالتها، والإشعار الآلي بانتهاء الوثائق."],
  ["خدمات التفتيش", "جدولة الزيارات الميدانية، تسجيل المعاينة إلكترونياً من الميدان (يعمل دون إنترنت ويزامن لاحقاً)، إصدار الإشعارات، ومتابعة التصحيح."],
  ["خدمات الوزارة", "إدارة الحسابات والصلاحيات، اعتماد القرارات، لوحات المؤشرات الوطنية، التقارير الرسمية، وسجل التدقيق غير القابل للتغيير."],
];

const GOVERNANCE: [string, string][] = [
  ["الأدوار الأربعة الرئيسية", "وزارة الشؤون الاجتماعية والعمل (الجهة المنظمة والرقابية)، النقابات ومنظمات أصحاب العمل (الجهات النقابية)، أصحاب العمل (المنشآت الخاصة)، والعاملون (المستفيد النهائي). لكل دور بوابته وصلاحياته وحدوده الدقيقة."],
  ["مبدأ مصدر واحد للحقيقة", "أي بيانة تُدخل مرة واحدة في سجلها الوطني ثم تُستخدم عبر المنظومة كلها؛ لا نسخ متكررة ولا تعارض بين الجهات، وكل عرض للبيانة يوضح مصدرها الرسمي."],
  ["دورة الإجراء المكتملة", "كل طلب يمر بدورة موثقة: تقديم → فحص → مراجعة → قرار معلل → إشعار → أرشفة. لا خطوة خارج النظام، ولا قرار بلا مسوغ وتاريخ واسم معتمده."],
  ["المساءلة والتتبع", "كل عملية قراءة حساسة أو كتابة تُقيَّد في سجل التدقيق باسم المنفذ وزمنه وجهازه. التقارير الرسمية تستخرج من نفس السجل الذي يعمل عليه الجميع — لا تقارير موازية."],
];

type Section = { id: string; icon: typeof Landmark; title: string; subtitle: string; rows?: [string, string][]; body?: string; bodyExtra?: string };

const SECTIONS: Section[] = [
  {
    id: "about",
    icon: Landmark,
    title: "التعريف بالنظام",
    subtitle: "ما هي المنظومة الوطنية للعمل النقابي، ولمن صُممت",
    body:
      "المنظومة الوطنية للعمل النقابي هي النظام الحكومي الموحّد لإدارة قطاع العمل في الجمهورية اليمنية، تعتمده وزارة الشؤون الاجتماعية والعمل مرجعاً رسمياً واحداً لكل ما يتعلق بعلاقات العمل: تسجيل المنشآت والنقابات، ترخيص التشغيل، توثيق العقود، التفتيش والامتثال، النزاعات العمالية، وخدمات أصحاب العمل والعاملين.\n\nصُممت المنظومة لتُنهي تشتت السجلات الورقية والأنظمة المتفرقة: بيانة واحدة تُدخل في سجلها الوطني ثم تعبر كل الجهات بصلاحيات مضبوطة، وكل إجراء يمضي في مسار موثق لا يمكن اختصاره أو إخفاء أي خطوة منه.\n\nتخدم المنظومة أربعة أطراف رئيسية: الوزارة في دورها المنظم والرقابي، النقابات ومنظمات أصحاب العمل، أصحاب العمل في القطاع الخاص، والعاملين بصفتهم المستفيدة النهائية — ولكل طرف بوابته الخاصة وخدماته المخصصة.",
  },
  {
    id: "legal",
    icon: Scale,
    title: "الأساس القانوني",
    subtitle: "النصوص المنظِّمة التي تعمل بها المنظومة",
    rows: LEGAL,
    bodyExtra:
      "كل قرار أو احتساب داخل المنظومة يعرض أساسه النظامي الصريح (القانون/اللائحة/القرار، رقم المادة، وتاريخ النفاذ). ولا تُطبَّق نصوص ملغاة أبداً؛ فالمرجع النظامي داخل المنظومة يدير دورة حياة كل نص: ساري، معدل، أو ملغى.",
  },
  {
    id: "registries",
    icon: Database,
    title: "السجلات الوطنية العشرة",
    subtitle: "البنية المرجعية الموحدة التي تقوم عليها المنظومة",
    rows: NATIONAL_REGISTRIES,
  },
  {
    id: "governance",
    icon: Workflow,
    title: "الحوكمة ودورة العمل",
    subtitle: "كيف يسير الإجراء، ومن المسؤول عن كل خطوة",
    rows: GOVERNANCE,
  },
  {
    id: "services",
    icon: Briefcase,
    title: "الخدمات الإلكترونية",
    subtitle: "ماذا يمكنك إنجازه إلكترونياً دون مراجعة ميدانية",
    rows: SERVICES,
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "حماية المعلومات والخصوصية",
    subtitle: "الضمانات التقنية والإجرائية لبياناتكم",
    body:
      "تعمل المنظومة بمعايير حكومية صارمة لحماية المعلومات:\n\n• تشفير كامل للاتصالات، وتشفير البيانات الشخصية الحساسة داخل قاعدة البيانات بمعيار AES-256.\n• كلمات المرور تُحفظ بمشتق تشفير أحادي الاتجاه (scrypt) فلا يستطيع أحد — ولا إدارة النظام نفسه — قراءتها.\n• صلاحيات مبنية على الحد الأدنى اللازم: كل حساب يرى ما يتطلبه دوره فقط، ويُسجَّل كل دخول وكل عملية حساسة باسم صاحبها وزمنها.\n• سجل تدقيق مقفل بتقنية سلسلة البصمات الرقمية: أي محاولة تعديل أو حذف تكسر السلسلة وتكشف نفسها فوراً.\n• حظر الاستخدام المفرط التلقائي يحمي الخدمة من محاولات التخريب، وفصل صارم بين بيئة الاختبار وبيئة الإنتاج.",
  },
  {
    id: "offline",
    icon: WifiOff,
    title: "العمل دون اتصال والمزامنة",
    subtitle: "استمرارية كاملة في الميدان وشبكات ضعيفة الإنترنت",
    body:
      "صُممت المنظومة لبيئة العمل اليمنية الواقعية:\n\n• عند انقطاع الإنترنت تبقى الواجهة تعمل بشكل طبيعي، وتُحفظ كل عملية (تسجيل، تعديل، معاينة تفتيش) في ذاكرة محلية مشفرة داخل الجهاز.\n• عند عودة الاتصال تبدأ المزامنة تلقائياً بالترتيب، مع إشعار واضح بعدد العناصر المُزامنة.\n• لا تُعتبر العملية منجزة إلا بعد تأكيد استلام الخادم لها؛ العمليات المرفوضة تبقى محفوظة لإعادة المحاولة ولا تضيع.\n• تحميل التطبيق كتطبيق سطح مكتب/جوال ممكن من المتصفح مباشرة، ويعمل بعد ذلك بدون متجر تطبيقات.",
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "الأسئلة الشائعة",
    subtitle: "إجابات رسمية مختصرة عن أكثر الاستفسارات تكراراً",
    rows: FAQ,
  },
  {
    id: "support",
    icon: PhoneCall,
    title: "الدعم والتواصل الرسمي",
    subtitle: "قنوات المساعدة المعتمدة",
    body:
      "الدعم الفني الرسمي للمنظومة عبر قنوات الوزارة المعتمدة فقط.\n\n• لمشاكل الدخول والحسابات: إدارة الحسابات — وزارة الشؤون الاجتماعية والعمل.\n• للأعطال الفنية: قناة الدعم الفني المعتمدة المعلنة في صفحة الدخول.\n• لطلبات الانضمام: نموذج «طلب حساب» في شاشة الدخول، ويُراجع من إدارة الحسابات.\n\nتحذير: لا تشارك كلمة المرور مع أي جهة، ولن تطلبها إدارة النظام أبداً بأي صورة.",
  },
];

function AccordionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/60 last:border-0 py-3">
      <p className="text-sm font-bold text-foreground flex items-start gap-2">
        <ScrollText size={14} className="mt-1 shrink-0 text-primary" />
        {label}
      </p>
      <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pr-6 whitespace-pre-line">{value}</p>
    </div>
  );
}

export function PlatformGuide() {
  const [open, setOpen] = useState<string>("about");
  const toggle = (id: string) => setOpen((cur) => (cur === id ? "" : id));

  return (
    <section dir="rtl" aria-label="التعريف الموسع بالمنظومة" className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* رأس القسم */}
      <div className="px-5 py-4 border-b bg-muted/40">
        <h2 className="font-black text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          التعريف الموسّع بالمنظومة
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          دليل مؤسسي شامل: التعريف، الأساس القانوني، السجلات، الحوكمة، الخدمات، الحماية، والأسئلة الشائعة — افتح أي قسم للتفاصيل
        </p>
      </div>

      <div className="divide-y divide-border/60 max-h-[560px] overflow-y-auto scroll-smooth">
        {SECTIONS.map((sec) => {
          const isOpen = open === sec.id;
          const Icon = sec.icon;
          return (
            <div key={sec.id}>
              <button
                type="button"
                onClick={() => toggle(sec.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-5 py-4 text-right hover:bg-accent/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Icon size={17} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-foreground">{sec.title}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">{sec.subtitle}</span>
                </span>
                <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 pt-1 pr-[68px]">
                    <div className="max-h-72 overflow-y-auto pl-2 space-y-2">
                      {sec.body && (
                        <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-line">{sec.body}</p>
                      )}
                      {sec.rows && (
                        <div className="border rounded-xl px-4 py-1 bg-muted/20">
                          {sec.rows.map(([k, v]) => <AccordionRow key={k} label={k} value={v} />)}
                        </div>
                      )}
                      {sec.bodyExtra && (
                        <p className="text-[12px] leading-relaxed text-muted-foreground/90 border-r-2 border-primary/40 pr-3">{sec.bodyExtra}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t bg-muted/30 text-[11px] text-muted-foreground flex items-center gap-2">
        <Users size={13} />
        محتوى رسمي معتمد — يُحدَّث بقرار من إدارة المنظومة، وآخر تحديث يظهر تلقائياً هنا
      </div>
    </section>
  );
}
