/**
 * PublicHome — البوابة الرسمية لقطاع العمل
 * تصميم مؤسسي نظيف: تباين عالٍ، ألوان واضحة، لا داكن، لا كحلي
 * Law First: كل عنصر بصري يخضع لمنطق القانون التنظيمي والحوكمة
 */

import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft, Building2, Briefcase,
  FileText, Scale, TrendingUp, ShieldCheck, Handshake, Database, Lock,
  Fingerprint, Landmark,
} from "lucide-react";
import { PublicLayout } from "./PublicLayout";
import { BRAND } from "../../branding";
import {
  NATIONAL_PANELS,
  GOVERNANCE_PRINCIPLES,
  IMPACT_ITEMS,
  GUARANTEE_ITEMS,
} from "../../content/institutional";

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
      {/* ===== البطل: الرسالة الوطنية العليا ===== */}
      <section className="relative overflow-hidden bg-white">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_88%_-8%,rgba(245,158,11,.12),transparent),radial-gradient(ellipse_45%_45%_at_-5%_105%,rgba(2,6,23,.06),transparent)]" />
          <img
            src={BRAND.emblemUrl}
            alt=""
            className="absolute -left-16 top-1/2 -translate-y-1/2 w-[420px] max-w-none opacity-[.05] select-none"
            loading="lazy"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-500/30 text-amber-700 text-[13px] font-bold shadow-sm">
            <Landmark size={14} className="text-amber-600" /> {BRAND.country} — البوابة الرسمية لقطاع العمل
          </div>
          <h1 className="mt-7 text-4xl md:text-[3.25rem] font-black leading-[1.22] max-w-4xl text-slate-900 tracking-tight">
            نُنظِّم سوقَ العمل...
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-600 via-amber-500 to-amber-600">
              ليستقيمَ الحقَّ، ويَزدهرَ الوطنَ
            </span>
          </h1>
          <p className="mt-7 text-base md:text-xl text-slate-700 leading-[2] max-w-3xl font-medium">
            المنظومة الوطنية لإدارة قطاع العمل هي الترسانة المؤسسية التي تمارس بها{" "}
            <span className="font-bold text-slate-900">وزارة الشؤون الاجتماعية والعمل</span>{" "}
            دورها التنظيمي، ويجد فيها النقابي مكانته الموثقة، وصاحب العمل طريقه الواضح، والعامل حقه المحفوظ.
          </p>
          <p className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl border-r-4 border-amber-500 pr-4 py-1">
            بيانات واحدة موثوقة، وإجراء واحد عادل للجميع، وأثر يُقاس في استقرار السوق واقتصاد الوطن.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 transition-all"
              aria-label="الدخول إلى المنظومة"
            >
              <ArrowLeft size={17} /> دخول المنظومة
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold hover:border-amber-500/50 hover:bg-amber-50/40 transition-all"
              aria-label="الرؤية والأثر الوطني"
            >
              الرؤية والأثر الوطني
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold hover:border-amber-500/50 hover:bg-amber-50/40 transition-all"
              aria-label="الخدمات الإلكترونية"
            >
              الخدمات الإلكترونية
            </Link>
          </div>

          {/* شرائط الثقة الرسمية */}
          <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-[13px] font-bold text-slate-600">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> قرار مؤسسي موثّق لا اجتهاد شخصي</span>
            <span className="flex items-center gap-2"><Fingerprint size={16} className="text-emerald-600" /> سجل تدقيق مقفل ضد التلاعب</span>
            <span className="flex items-center gap-2"><Database size={16} className="text-emerald-600" /> بيانات وطنية واحدة معتمدة للجميع</span>
          </div>
        </div>
      </section>

      {/* ===== المؤشرات الوطنية في إطارات الدولة ===== */}
      <section aria-labelledby="national-indicators" className="relative bg-white border-y border-slate-300">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(245,158,11,.10),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-14 relative">
          <h2 id="national-indicators" className="text-2xl md:text-3xl font-black text-slate-900">
            قطاع العمل في مؤشرات الدولة
          </h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NATIONAL_PANELS.map((p, i) => {
              const value = p.label.includes("التعيين الوطني") && ratio !== null ? `${ratio}%` : p.value;
              const PanelIcon = [Scale, Database, Building2, Briefcase, TrendingUp, Lock][i];
              return (
                <article
                  key={p.label}
                  className="group relative overflow-hidden rounded-2xl border border-slate-300 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber-500/40 transition-all"
                >
                  <span className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-amber-500/[.1] group-hover:bg-amber-500/[.15] transition-colors aria-hidden" />
                  <span className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <PanelIcon size={20} />
                  </span>
                  <p className="mt-5 text-4xl font-black tracking-tight text-amber-600" dir="ltr">{value}</p>
                  <h3 className="mt-1.5 font-black text-[15px] text-slate-900">{p.label}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{p.message}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== الأثر الوطني ===== */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">
              الأثر الوطني — من توثيق السجل إلى صناعة الاستقرار
            </h2>
            <p className="text-sm md:text-base text-slate-700 mt-3 leading-relaxed">
              حين تُدار علاقات العمل بمعايير دولة واحدة، يتغير سلوك السوق بأكمله:
              الرقابة وقاية لا مطاردة، والسياسة قرار مبني على واقع موثق، والالتزام قاعدة لا استثناء.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {IMPACT_ITEMS.map(([title, body], i) => (
              <article key={title} className="relative rounded-2xl border border-slate-300 bg-white p-6 shadow-sm hover:shadow-lg transition-all">
                <span className="absolute top-5 left-5 text-4xl font-black text-amber-600 select-none" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-black text-base text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2.5">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== مبادئ الحوكمة ===== */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">
              مبادئ الحوكمة الملزمة داخل المنظومة
            </h2>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl">
            {GOVERNANCE_PRINCIPLES.map((pl, i) => {
              const Icon = [Scale, ShieldCheck, TrendingUp, Handshake][i];
              return (
                <article key={pl.title} className="rounded-2xl border border-slate-300 bg-white p-5 flex gap-4 hover:border-amber-500/40 hover:shadow-md transition-all">
                  <span className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-500/30 text-amber-600 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">{pl.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1.5">{pl.outcome}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== ضمانات الدولة داخل المنظومة ===== */}
      <section className="bg-slate-950 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-black text-white">ضمانات الدولة داخل المنظومة</h2>
            <p className="mt-3 text-sm md:text-base text-slate-400 leading-relaxed">التزامات مؤسسية ثابتة تحكم كل إجراء في المنظومة — لا استثناء فيها ولا حالة خاصة.</p>
          </div>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GUARANTEE_ITEMS.map((g) => (
              <li key={g} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-[13px] font-bold text-slate-200 leading-relaxed hover:border-amber-500/40 transition-colors">
                <ShieldCheck size={17} className="text-amber-400 shrink-0 mt-0.5" /> {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== مسار البدء ===== */}
      <section className="bg-white pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-2xl border border-slate-300 bg-white p-6 md:p-8 shadow-sm grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText size={19} className="text-amber-600" /> طريقك إلى المنظومة — ثلاث خطوات
              </h2>
              <ol className="mt-4 space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <span>تصفّح هذه الصفحات لتعرف خدماتك وحقوقك وأساسها النظامي — دون حساب.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <span>لا تملك حساباً بعد؟ قدّم «طلب حساب» من شاشة الدخول وستراجعه إدارة الحسابات بالوزارة.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <span>ادخل بحسابك المعتمد، غيّر كلمة المرور الابتدائية، وابدأ عملك من بوابتك مباشرة.</span>
                </li>
              </ol>
            </div>
            <Link
              to="/login"
              className="justify-self-start md:justify-self-end inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 transition-all"
              aria-label="انتقل إلى بوابة الدخول"
            >
              <ArrowLeft size={17} /> الانتقال إلى بوابة الدخول
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}