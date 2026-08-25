/**
 * PublicLayout — التخطيط الرسمي للموقع التعريفي العام
 * يتصفحه الجميع بلا حساب، ومنه الانتقال إلى بوابة الدخول
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, LogIn, Globe, PhoneCall, Mail } from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { BRAND } from "../../branding";

const NAV = [
  { to: "/", label: "الرئيسية" },
  { to: "/about", label: "عن المنظومة" },
  { to: "/services", label: "الخدمات الإلكترونية" },
  { to: "/registries", label: "السجلات الوطنية" },
  { to: "/legal", label: "الأساس القانوني" },
  { to: "/faq", label: "الأسئلة الشائعة" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

/** جلب مسبق عند المرور بالماوس — يجعل التنقل فورياً تقريباً */
const PREFETCH: Record<string, () => Promise<unknown>> = {
  "/": () => import("./PublicHome"),
  "/about": () => import("./PublicPages"),
  "/services": () => import("./PublicPages"),
  "/registries": () => import("./PublicPages"),
  "/legal": () => import("./PublicPages"),
  "/faq": () => import("./PublicPages"),
  "/contact": () => import("./PublicPages"),
  "/login": () => import("../Login"),
};

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // إرجاع التمرير لأعلى عند كل تنقل — سلوك مواقع رسمية طبيعي
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setOpen(false);
  }, [pathname]);

  const prefetch = (to: string) => () => { void PREFETCH[to]?.(); };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-background">
      {/* الشريط العلوي الرسمي */}
      <div className="bg-slate-950 text-slate-300 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5"><Globe size={12} className="text-amber-400" />{BRAND.country} — البوابة الرسمية لقطاع العمل</span>
          <span className="hidden sm:flex items-center gap-4">
            <a href={`tel:${BRAND.supportPhone}`} className="flex items-center gap-1 hover:text-amber-300 transition-colors"><PhoneCall size={11} />{BRAND.supportPhone}</a>
            <a href={`mailto:${BRAND.supportEmail}`} className="flex items-center gap-1 hover:text-amber-300 transition-colors"><Mail size={11} />{BRAND.supportEmail}</a>
          </span>
        </div>
      </div>

      {/* الترويسة الرئيسية */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <BrandLogo size={44} rounded="xl" priority="high" className="border border-border shadow-sm group-hover:shadow-md transition-shadow" />
            <span className="leading-tight hidden sm:block">
              <span className="block text-[10px] font-bold text-amber-600">{BRAND.country}</span>
              <span className="block font-black text-[15px] text-foreground">{BRAND.ministry}</span>
              <span className="block text-[10px] text-muted-foreground">المنظومة الوطنية للعمل النقابي</span>
            </span>
          </Link>

          {/* تنقل سطح المكتب */}
          <nav className="hidden lg:flex items-center gap-1 mx-auto" aria-label="التنقل الرئيسي">
            {NAV.map(n => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onPointerEnter={prefetch(n.to)}
                  onFocus={prefetch(n.to)}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 rounded-lg text-[13px] font-bold transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 mr-auto lg:mr-0">
            <Link
              to="/login"
              onPointerEnter={prefetch("/login")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-black shadow hover:opacity-90 active:scale-[.98] transition-all"
            >
              <LogIn size={15} />
              بوابة الدخول
            </Link>
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-label="فتح القائمة"
              className="lg:hidden w-10 h-10 rounded-xl border flex items-center justify-center text-muted-foreground hover:bg-accent"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* تنقل الجوال */}
        {open && (
          <nav className="lg:hidden border-t px-4 py-3 grid grid-cols-2 gap-1.5 bg-background" aria-label="قائمة الجوال">
            {NAV.map(n => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                onPointerEnter={prefetch(n.to)}
                className={`px-3 py-2.5 rounded-lg text-[13px] font-bold ${n.to === "/" ? pathname === "/" : pathname.startsWith(n.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* المحتوى */}
      <main className="flex-1">{children}</main>

      {/* التذييل الرسمي */}
      <footer className="bg-slate-950 text-slate-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <BrandLogo size={40} rounded="xl" />
              <div className="leading-tight">
                <p className="text-white font-black text-sm">{BRAND.ministry}</p>
                <p className="text-[11px] text-slate-500">{BRAND.sector} — {BRAND.country}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">{BRAND.tagline}</p>
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-3">روابط سريعة</p>
            <ul className="space-y-2 text-xs">
              {NAV.slice(1).map(n => (
                <li key={n.to}><Link to={n.to} className="hover:text-amber-300 transition-colors">{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-3">بوابات الدخول</p>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>بوابة الوزارة — للموظفين المعتمدين</li>
              <li>بوابة النقابات والمنظمات</li>
              <li>منصة أصحاب العمل</li>
              <li>جواز العامل الرقمي</li>
            </ul>
            <Link to="/login" className="inline-flex items-center gap-1.5 mt-4 text-amber-400 font-bold text-xs hover:text-amber-300">
              <LogIn size={13} /> الدخول إلى المنظومة
            </Link>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>© {new Date().getFullYear()} {BRAND.ministry} — جميع الحقوق محفوظة</span>
            <span>سجل التدقيق مفعّل — كل العمليات موثقة وغير قابلة للتلاعب</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
