/**
 * PublicHome — الصفحة الرئيسية للموقع التعريفي العام
 * الواجهة الأولى الرسمية: تعرّف على المنظومة ثم ادخل بحسابك
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft, Landmark, Building2, Users, HardHat, ShieldCheck,
  Database, Scale, WifiOff, FileText, Workflow, BadgeCheck, Globe,
} from "lucide-react";
import { PublicLayout } from "./PublicLayout";
import { BRAND } from "../../branding";

const PORTALS = [
  {
    icon: Landmark,
    title: "بوابة الوزارة",
    who: "للموظفين المعتمدين",
    desc: "إدارة السجلات الوطنية العشرة، اعتماد القرارات، التفتيش والامتثال، الحسابات والصلاحيات، والتقارير الرسمية.",
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Users,
    title: "بوابة النقابات",
    who: "للنقابات ومنظمات أصحاب العمل",
    desc: "ملف المنظمة النقابية، الانتخابات النقابية بإشراف الوزارة، الاجتماعات والمحاضر، والتقارير الدورية الرسمية.",
    color: "text-violet-600 bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: Building2,
    title: "منصة أصحاب العمل",
    who: "للمنشآت الخاصة",
    desc: "تسجيل المنشأة والفروع، طلبات الترخيص، الإبلاغ عن العمالة، طلبات تخفيض نسبة التعيين، ومتابعة الزيارات التفتيشية.",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: HardHat,
    title: "جواز العامل الرقمي",
    who: "للعاملين",
    desc: "الملف المهني الموثق: العقود، الخبرة، الشهادات، سجل الخدمة، المطالبات — بياناته رسمية من مصدرها الوحيد.",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  },
];

const PILLARS = [
  { icon: Database, title: "مصدر واحد للحقيقة", desc: "بيانة تُدخل مرة في سجلها الوطني فتعبر كل الجهات بصلاحيات مضبوطة — لا نسخ ولا تعارض." },
  { icon: Workflow, title: "إجراء مكتمل التوثيق", desc: "كل طلب يمضي بمسار معلن: تقديم، فحص، قرار معلل، إشعار، أرشفة — لا خطوة خارج النظام." },
  { icon: ShieldCheck, title: "حماية وسلسلة تدقيق", desc: "تشفير البيانات الحساسة، صلاحيات بالحد الأدنى، وسجل تدقيق مقفل بتقنية البصمات المتسلسلة يكشف أي تلاعب." },
  { icon: Scale, title: "قرار يستند إلى نص", desc: "لا عقوبة ولا احتساب إلا بنص نظامي صريح، وكل قرار يعرض أساسه القانوني وتاريخه ومعتمده." },
  { icon: WifiOff, title: "استمرارية ميدانية", desc: "العمل لا يتوقف عند انقطاع الإنترنت؛ العمليات تُحفظ محلياً وتُزامَن تلقائياً بعد تأكيد استلامها رسمياً." },
  { icon: BadgeCheck, title: "الإنسان يقرر", desc: "المنظومة تجمع المعطيات وتحلل وتعلّل، والقرار النهائي يبقى دائماً للمختص المعتمد." },
];

export function PublicHome() {
  const [ratio, setRatio] = useState<number | null>(null);

  // سياسة التعيين الرسمية من نقطة النهاية العامة
  useEffect(() => {
    fetch("/api/system/policy")
      .then(r => r.json())
      .then(j => setRatio(j?.data?.yemenizationMinRatio ?? null))
      .catch(() => {});
  }, []);

  return (
    <PublicLayout>
      {/* ===== البطل الرسمي ===== */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-[#0b1526] via-[#0d1830] to-[#101a3a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_80%_10%,rgba(30,58,138,.35),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
            <Globe size={13} /> {BRAND.country} — بوابة قطاع العمل الرسمية
          </p>
          <h1 className="mt-5 text-3xl md:text-5xl font-black leading-tight max-w-3xl">
            منظومة وطنية موحدة لإدارة قطاع العمل
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
            نظام حكومي مرجعي واحد يدير سوق العمل: تسجيل المنشآت والنقابات، ترخيص التشغيل، توثيق العقود،
            التفتيش والامتثال، وخدمات العاملين — بيانات رسمية من مصدرها، وإجراءات مكتملة التوثيق والمساءلة.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-black shadow-lg hover:bg-amber-300 active:scale-[.98] transition-all"
            >
              الدخول إلى المنظومة <ArrowLeft size={17} />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/25 text-white font-bold hover:bg-white/10 transition-colors"
            >
              تعرّف على المنظومة
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 font-bold hover:bg-white/5 transition-colors"
            >
              الخدمات الإلكترونية
            </Link>
          </div>

          {/* شريط الأرقام الرسمية */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            {[
              { v: ratio !== null ? `${ratio}%` : "—", l: "نسبة التعيين الوطني المعتمدة" },
              { v: "10", l: "سجلات وطنية موحدة" },
              { v: "4", l: "بوابات متخصصة" },
              { v: "24/7", l: "خدمة مستمرة" },
            ].map(s => (
              <div key={s.l} className="rounded-xl border border-white/10 bg-white/[.04] backdrop-blur px-4 py-3">
                <p className="text-2xl font-black text-amber-300">{s.v}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== البوابات الأربع ===== */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-black text-foreground">بوابات الدخول المتخصصة</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
          لكل طرف في منظومة العمل بوابته الخاصة وصلاحياته المحددة. تصفّح الموقع للتعرف على الخدمات،
          ثم ادخل بحسابك المعتمد من إدارة الحسابات بالوزارة.
        </p>
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PORTALS.map(p => (
            <article key={p.title} className="group rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <span className={`w-12 h-12 rounded-xl border flex items-center justify-center ${p.color}`}>
                <p.icon size={22} />
              </span>
              <h3 className="font-black text-[15px] mt-4 text-foreground">{p.title}</h3>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{p.who}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== ركائز التصميم المؤسسي ===== */}
      <section className="bg-muted/40 border-y">
        <div className="max-w-7xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-black text-foreground">ركائز التصميم المؤسسي</h2>
          <p className="text-sm text-muted-foreground mt-1.5">المبادئ الثابتة التي بُنيت عليها المنظومة الحكومية</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PILLARS.map(pl => (
              <article key={pl.title} className="rounded-2xl border bg-card p-5 flex gap-4">
                <span className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <pl.icon size={20} />
                </span>
                <div>
                  <h3 className="font-black text-sm text-foreground">{pl.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{pl.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== مسار المستخدم الجديد ===== */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="rounded-2xl border bg-gradient-to-l from-card to-muted/30 p-6 md:p-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <FileText size={19} className="text-primary" />
              كيف تبدأ؟ ثلاث خطوات رسمية
            </h2>
            <ol className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2.5"><span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">1</span>تصفّح صفحات الموقع: التعريف، الخدمات، الأساس القانوني — دون حساب.</li>
              <li className="flex gap-2.5"><span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">2</span>إن لم تكن لديك حساب: قدّم «طلب حساب» من شاشة الدخول ليُراجع من إدارة الحسابات بالوزارة.</li>
              <li className="flex gap-2.5"><span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">3</span>ادخل بحسابك المعتمد لتصل مباشرة إلى بوابتك الخاصة وصلاحياتك.</li>
            </ol>
          </div>
          <Link
            to="/login"
            className="justify-self-start md:justify-self-end inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-black shadow-lg hover:opacity-90 active:scale-[.98] transition-all"
          >
            انتقل إلى بوابة الدخول <ArrowLeft size={17} />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
