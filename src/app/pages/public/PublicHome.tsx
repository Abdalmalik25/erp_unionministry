/**
 * PublicHome — الواجهة الرسمية الأولى للبوابة
 * لغة أثر مؤسسي استشاري: مخاطبة المستفيد، رؤية وطنية، نتائج لا ميزات
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft, Landmark, Building2, Users, HardHat, Globe,
  FileText, Scale, TrendingUp, ShieldCheck, Handshake,
} from "lucide-react";
import { PublicLayout } from "./PublicLayout";
import { BRAND } from "../../branding";
import { IMPACT_ITEMS } from "../../content/institutional";

const PORTALS = [
  {
    icon: Landmark,
    title: "إن كنت من الوزارة",
    who: "الجهة المنظمة والرقابية",
    desc: "سيادة كاملة على بيانات قطاع العمل، وصلاحية قرارية تستند إلى الواقع اللحظي لا التقارير المتأخرة — رقابة تسبق المشكلة، وسياسة تُبنى على رقم موثق.",
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Users,
    title: "إن كنت نقابة أو منظمة أصحاب عمل",
    who: "التمثيل النقابي المعتمد",
    desc: "صوت نقابي قوي لأنه شرعي: انتخابات موثقة بإشراف الدولة، هياكل معترف بها، ومكانة تفاوضية ترتقي بمستندات محكمة لا بالانطباعات.",
    color: "text-violet-600 bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: Building2,
    title: "إن كنت صاحب عمل",
    who: "المنشآت الخاصة والمستثمرون",
    desc: "طريق معلن من التسجيل إلى الترخيص إلى التوسع: نفقة ومدة وقواعد يعرفها الجميع، والتزامك يُكافأ بتسهيل، وسوق تتنافس فيه بقيمة منتجك لا بقدرته على التهرب.",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: HardHat,
    title: "إن كنت عاملاً",
    who: "القوة العاملة الوطنية",
    desc: "ملف مهني رسمي يرافقك مدى الحياة: عقد محفوظ لا يضيع، خبرة موثقة تُحتسب حيثما عملت، وأجر مطالب به بحجة — لأن كرامتك المهنية حق لا امتياز.",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  },
];

const GOVERNANCE_PRINCIPLES = [
  { icon: Scale, title: "لا قرار بلا سند", outcome: "كل احتساب وكل عقوبة خلفها نص نظامي يراه المعني — فتنعدم المفاجأة وتُبنى الثقة." },
  { icon: ShieldCheck, title: "التوثيق حماية للجميع", outcome: "حين تُوثَّق كل خطوة، يحمى الموظف من شبهة، ويطمئن المستفيد إلى أن ملفه لن يختفي." },
  { icon: TrendingUp, title: "الأداء يُقاس ويُعلن", outcome: "زمن الخدمة ونسبة الامتثال وجودة البيانات مؤشرات معلنة داخل المنظومة — المساءلة تبدأ من القياس." },
  { icon: Handshake, title: "شراكة لا وصاية", outcome: "المنظومة تجمع أطراف سوق العمل الطبيعية كلٍّ في دوره — فالقوة تنتج من التكامل لا من الهيمنة." },
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
      {/* ===== البطل: رسالة وطنية ===== */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-[#0b1526] via-[#0d1830] to-[#101a3a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_80%_10%,rgba(30,58,138,.35),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
            <Globe size={13} /> {BRAND.country} — البوابة الرسمية لقطاع العمل
          </p>
          <h1 className="mt-5 text-3xl md:text-[2.75rem] font-black leading-[1.25] max-w-4xl">
            سوق عمل يمني <span className="text-amber-300">منظّم وعادل وموثّق</span> —
            بناه ليعمل لصالح الجميع
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
            المنظومة الوطنية لإدارة قطاع العمل هي الترسانة المؤسسية التي تمارس بها وزارة الشؤون الاجتماعية والعمل
            دورها التنظيمي، ويجد فيها النقابي مكانته الموثقة، وصاحب العمل طريقه الواضح، والعامل حقه المحفوظ.
            بيانات واحدة موثوقة، وإجراء واحد عادل للجميع، وأثر يقاس في استقرار السوق واقتصاد الوطن.
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
              الرؤية والأثر الوطني
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 font-bold hover:bg-white/5 transition-colors"
            >
              خدماتك الإلكترونية
            </Link>
          </div>

          {/* شريط الالتزامات الرقمية */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            {[
              { v: ratio !== null ? `${ratio}%` : "—", l: "نسبة التعيين الوطني المفروضة آلياً" },
              { v: "10", l: "سجلات وطنية مصدر وحيد للحقيقة" },
              { v: "4", l: "بوابات متخصصة لأطراف السوق" },
              { v: "100%", l: "إجراءات موثقة بسجل تدقيق مقفل" },
            ].map(s => (
              <div key={s.l} className="rounded-xl border border-white/10 bg-white/[.04] backdrop-blur px-4 py-3">
                <p className="text-2xl font-black text-amber-300">{s.v}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== الأثر الوطني ===== */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground leading-snug">لماذا منظومة وطنية؟ لأن الأثر يتجاوز الشاشة</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed">
            هذه ليست برمجيات تُشترى وتُركّب؛ إنها بنية سياسات عامة. ما يلي هو الفرق الذي تصنعه
            حين يُدار سوق العمل بمرجعية وطنية واحدة:
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {IMPACT_ITEMS.map(([title, body], i) => (
            <article key={title} className="relative rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
              <span className="absolute top-5 left-5 text-4xl font-black text-primary/[.08] select-none" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-black text-base text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== مخاطبة الأطراف الأربعة ===== */}
      <section className="bg-muted/40 border-y">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-black text-foreground">أيّ طرفٍ من سوق العمل أنت؟</h2>
            <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed">
              لكل بوابةٍ وعدٌ مؤسسي مختلف — اختر ما يناسب موقعك:
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {PORTALS.map(p => (
              <article key={p.title} className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <span className={`w-12 h-12 rounded-xl border flex items-center justify-center ${p.color}`}>
                  <p.icon size={22} />
                </span>
                <h3 className="font-black text-[15px] mt-4 text-foreground">{p.title}</h3>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{p.who}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2.5 flex-1">{p.desc}</p>
                <Link to="/login" className="mt-4 inline-flex items-center gap-1 text-xs font-black text-primary hover:gap-2 transition-all">
                  ادخل بوابتك <ArrowLeft size={13} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== مبادئ الحوكمة (لغة النتائج) ===== */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-black text-foreground">مبادئ نلتزمها أمامكم — وما تعنيه لكم فعلياً</h2>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl">
          {GOVERNANCE_PRINCIPLES.map(pl => (
            <article key={pl.title} className="rounded-2xl border bg-card p-5 flex gap-4">
              <span className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <pl.icon size={20} />
              </span>
              <div>
                <h3 className="font-black text-sm text-foreground">{pl.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{pl.outcome}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== مسار البدء ===== */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="rounded-2xl border bg-gradient-to-l from-card to-muted/30 p-6 md:p-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <FileText size={19} className="text-primary" />
              طريقك إلى المنظومة — ثلاث خطوات
            </h2>
            <ol className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2.5"><span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">1</span>تصفّح هذه الصفحات لتعرف خدماتك وحقوقك وأساسها النظامي — دون حساب.</li>
              <li className="flex gap-2.5"><span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">2</span>بلا حساب؟ قدّم «طلب حساب» من شاشة الدخول وستراجعه إدارة الحسابات بالوزارة.</li>
              <li className="flex gap-2.5"><span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">3</span>ادخل بحسابك المعتمد، غيّر كلمة مرورك الابتدائية، وابدأ عملك من بوابتك مباشرة.</li>
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
