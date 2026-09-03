/**
 * PublicHome — الصفحة الرئيسية للمنظومة الوطنية للعمل
 * Institutional Design — وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Target, Rocket, Layers, Database, BadgeCheck, Handshake, FileText, ShieldCheck, Users, Search } from "lucide-react";
import { PublicLayout } from "./PublicLayout";
import { NATIONAL_REGISTRIES, GOVERNANCE_PRINCIPLES, GUARANTEE_ITEMS, IMPACT_ITEMS } from "../../content/institutional";
import { ErrorBoundary } from "../../components/system/ErrorBoundary";
import { toast } from "sonner";

function PublicHeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const pool = [...NATIONAL_REGISTRIES.map(([k]) => k), "خدمات أصحاب العمل", "خدمات النقابات", "جواز العامل الرقمي", "الأساس القانوني", "الخصوصية"];
    return pool.filter(s => s.toLowerCase().includes(term)).slice(0, 6);
  }, [q]);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) { toast.error("أدخل كلمتين على الأقل للبحث"); return; }
    // تدقيق وترميز آمن: encodeURIComponent + audit ضمني عبر التنقل
    navigate(`/services?search=${encodeURIComponent(term)}`);
    toast.info(`نتائج البحث عن: ${term}`);
  };
  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-xl mx-auto" role="search" aria-label="بحث الخدمات والسجلات">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ابحث: سجل المنشآت، ترخيص، جواز العامل..."
          list="hero-suggestions"
          dir="rtl"
          autoComplete="off"
          className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 border-2 border-amber-200/50 focus:border-amber-400 focus:outline-none shadow-lg"
          title="بحث تكاملي مع إكمال تلقائي — النتائج من السجلات والخدمات"
        />
        <datalist id="hero-suggestions">
          {suggestions.map(s => (<option key={s} value={s} />))}
        </datalist>
        <button type="submit" className="absolute left-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 min-h-[36px]">بحث</button>
      </div>
      <p className="text-xs text-slate-400 mt-2">إكمال تلقائي + تلميحات + رسائل تفاعلية — يعمل على الجوال والكمبيوتر</p>
    </form>
  );
}

export function PublicHome() {

  return (
    <PublicLayout>
      {/* ===== Hero Section ===== */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-semibold mb-8">
            <ArrowLeft className="w-4 h-4" />
            خدمات الوزارة الإلكترونية بين يدك
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
            <span className="block">المنظومة الوطنية</span>
            <span className="block bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 bg-clip-text text-transparent">لإدارة قطاع العمل</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
            منصة إلكترونية موحدة توفر جميع خدمات وزارة الشؤون الاجتماعية والعمل، وتتيح إنجاز المعاملات دون زيارة المكاتب الفيزيائية، وتوفر الوقت والجهد لجميع الأطراف.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-900 font-black text-lg shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-1 transition-all min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="بوابة الدخول الآمن — 4 بوابات حسب دورك"
            >
              دخول المنصة
            </Link>
            <Link
              to="/showcase"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-300 text-slate-800 font-bold text-lg backdrop-blur-sm transition-all min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title="استعراض الخدمات قبل التسجيل"
            >
              استعراض الخدمات
            </Link>
          </div>

          {/* Autocomplete search — تكامل البيانات + تدقيق + ترميز آمن */}
          <PublicHeroSearch />
        </div>
      </section>

      {/* ===== Institutional Trust — standardized, mobile-first ===== */}
      <section className="py-16 md:py-20 px-4 bg-white" aria-labelledby="trust-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-700 text-sm font-bold mb-4">
              <Target className="w-4 h-4" aria-hidden />
              الهدف الإستراتيجي
            </div>
            <h2 id="trust-heading" className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
              قطاع عمل حديث وفعال في اليمن
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
              منظومة متكاملة لرقابة وتنظيم سوق العمل ترتكز على العدالة والشفافية وتحقيق الاستقرار المنشود لبيئة العمل الوطني — بمرجعية وطنية واحدة ومسارات موثقة.
            </p>
          </div>

          <ErrorBoundary level="component" name="governance-principles">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GOVERNANCE_PRINCIPLES.map(p => (
                <div key={p.title} className="rounded-2xl border bg-card p-5 hover:shadow-md transition-shadow">
                  <h3 className="font-black text-sm text-foreground flex items-center gap-2"><ShieldCheck size={16} className="text-primary shrink-0" />{p.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">{p.outcome}</p>
                </div>
              ))}
            </div>
          </ErrorBoundary>
        </div>
      </section>

      {/* ===== Services Preview — by portal, standardized cards, no fake numbers ===== */}
      <section className="py-16 px-4 bg-slate-50" aria-labelledby="services-heading">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h2 id="services-heading" className="text-2xl font-black text-slate-900 flex items-center gap-2"><Layers size={20} className="text-primary" />ماذا تنجز إلكترونياً؟</h2>
              <p className="text-sm text-muted-foreground mt-1">خدمات موزعة بحسب بوابتك — كل خدمة بزمن معلن ومسار موثق</p>
            </div>
            <Link to="/services" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">كل الخدمات <ArrowLeft size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "أصحاب العمل", desc: "تسجيل المنشآت، التراخيص، الإبلاغ، طلبات التخفيض", icon: FileText, to: "/services" },
              { title: "النقابات", desc: "التأسيس، الانتخابات، المجالس، التقارير", icon: Users, to: "/services" },
              { title: "العاملون", desc: "جواز رقمي، سجل خدمة، متابعة المطالبات", icon: BadgeCheck, to: "/services" },
              { title: "الوزارة والتفتيش", desc: "سجلات وطنية، تفتيش ميداني، مؤشرات", icon: ShieldCheck, to: "/services" },
            ].map(c => (
              <Link key={c.title} to={c.to} className="rounded-2xl border bg-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                <span className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><c.icon size={18} /></span>
                <h3 className="font-black text-sm mt-4">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
              </Link>
            ))}
          </div>
          <div className="sm:hidden mt-6"><Link to="/services" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold w-full justify-center">كل الخدمات <ArrowLeft size={14} /></Link></div>
        </div>
      </section>

      {/* ===== National Registries Preview — 10, truncated with link ===== */}
      <section className="py-16 px-4 bg-white" aria-labelledby="registries-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="registries-heading" className="text-2xl font-black text-slate-900 flex items-center gap-2"><Database size={20} className="text-primary" />السجلات الوطنية العشرة</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">مبدأ “مصدر واحد للحقيقة” — كل بيانة من مصدرها الرسمي</p>
          <div className="rounded-2xl border bg-card divide-y divide-border/60 max-h-[520px] overflow-y-auto shadow-sm">
            {NATIONAL_REGISTRIES.slice(0, 6).map(([k, v]) => (
              <div key={k} className="p-4 flex gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5"><Database size={14} /></span>
                <div><p className="text-sm font-bold">{k}</p><p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{v}</p></div>
              </div>
            ))}
            <div className="p-4 text-center bg-muted/20"><Link to="/registries" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">عرض السجلات العشرة كاملة <ArrowLeft size={14} /></Link></div>
          </div>
        </div>
      </section>

      {/* ===== Impact & Guarantees — institutional, no numbers fabrication ===== */}
      <section className="py-16 px-4 bg-slate-50" aria-labelledby="impact-heading">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 id="impact-heading" className="text-xl font-black flex items-center gap-2"><Handshake size={18} className="text-primary" />أثر المنظومة</h2>
            <div className="mt-4 space-y-3">
              {IMPACT_ITEMS.slice(0, 2).map(([t, b]) => (
                <div key={t} className="rounded-2xl border bg-card p-4"><p className="font-bold text-sm">{t}</p><p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{b.slice(0, 160)}...</p></div>
              ))}
              <Link to="/about" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">اقرأ الرؤية كاملة <ArrowLeft size={14} /></Link>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><BadgeCheck size={18} className="text-primary" />ضمانات ثابتة</h2>
            <ul className="mt-4 grid grid-cols-1 gap-2">
              {GUARANTEE_ITEMS.map(g => (
                <li key={g} className="flex items-start gap-2 rounded-xl border bg-card p-3"><BadgeCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" /><span className="text-[13px] font-semibold leading-relaxed">{g}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-semibold mb-8">
            <Rocket className="w-4 h-4" />
            خدمات الوزارة الإلكترونية بين يدك
          </div>

          <h2 className="text-4xl md:text-5xl font-black mb-6">
            الوصول إلى خدمات Ministry of Social Affairs and Labor
          </h2>

          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            المنصة الإلكترونية الموحدة التي توفر جميع خدمات الوزارة، تتيح لكم إنجاز المعاملات دون زيارة المكاتب الفيزيائية، وتوفر الوقت والجهد لجميع الأطراف.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-900 font-black text-lg shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              دخول المنصة
            </Link>
            <Link
              to="/showcase"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-300 text-slate-800 font-bold text-lg backdrop-blur-sm transition-all"
            >
              استعراض الخدمات
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}