/**
 * PublicHome — الصفحة الرئيسية للمنظومة الوطنية للعمل
 * Institutional Design — وزارة الشؤون الاجتماعية والعمل
 */

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, Target, Rocket } from "lucide-react";
import { PublicLayout } from "./PublicLayout";

export function PublicHome() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-900 font-black text-lg shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              دخول المنصة
            </Link>
            <Link
              to="/showcase"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-300 text-slate-800 font-bold text-lg backdrop-blur-sm transition-all"
            >
              استعراض الخدمات
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Institutional Content ===== */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-bold mb-4">
              <Target className="w-4 h-4" />
              الهدف الإستراتيجي
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              قطاع عمل حديث وفعال في اليمن
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              منظومة متكاملة لرقابة وتنظيم سوق العمل ترتكز على العدالة والشفافية وتحقيق الاستقرار المنشود لبيئة العمل الوطني.
            </p>
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