/**
 * PublicLayout.tsx — التخطيط الرسمي المطوّر للموقع التعريفي العام
 * Premium Modern Design with Glass Morphism & Smooth Transitions
 * World-Class Navigation Design
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  Menu, X, LogIn, Globe, PhoneCall, Mail, Clock, Home, Info, Layers,
  Database, Scale, HelpCircle, Sparkles, ChevronDown, Building2, Heart
} from "lucide-react";
import { BrandLogo } from "../../components/ui/BrandLogo";
import { BRAND } from "../../branding";

// ===== Navigation Configuration =====
const NAV = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/about", label: "عن المنظومة", icon: Info },
  { to: "/services", label: "الخدمات", icon: Layers },
  { to: "/registries", label: "السجلات", icon: Database },
  { to: "/legal", label: "الأساس القانوني", icon: Scale },
  { to: "/faq", label: "الأسئلة الشائعة", icon: HelpCircle },
  { to: "/contact", label: "تواصل معنا", icon: PhoneCall },
] as const;

// ===== Premium Components =====
function GlassHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  
  return (
    <>
      {/* Top Info Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white text-[11px]">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              {BRAND.country} — البوابة الرسمية لقطاع العمل
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a 
              href={`tel:${BRAND.supportPhone}`} 
              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
            >
              <PhoneCall size={11} className="text-amber-400" />
              <span className="hidden sm:inline">{BRAND.supportPhone}</span>
            </a>
            <a 
              href={`mailto:${BRAND.supportEmail}`} 
              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
            >
              <Mail size={11} className="text-amber-400" />
              <span className="hidden md:inline">{BRAND.supportEmail}</span>
            </a>
          </div>
        </div>
      </div>
      
      {/* Main Header */}
      <header className={`
        sticky top-0 z-50 transition-all duration-300
        ${scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-slate-200/50' 
          : 'bg-white/80 backdrop-blur-md border-b border-slate-200/30'
        }
      `}>
        {/* Gradient Line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-16 md:h-[4.5rem] flex items-center gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0 group">
              <BrandLogo 
                size={44} 
                rounded="xl" 
                priority="high" 
                className="border border-border shadow-sm group-hover:shadow-lg transition-shadow duration-300" 
              />
              <div className="hidden sm:block leading-tight">
                <div className="text-[10px] font-bold text-amber-600">{BRAND.country}</div>
                <div className="font-black text-[15px] text-slate-900">{BRAND.ministry}</div>
                <div className="text-[10px] text-slate-500">منظومة إدارة قطاع العمل</div>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 mx-auto" aria-label="التنقل الرئيسي">
              {NAV.map(n => {
                const NavIcon = n.icon;
                const isActive = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
                
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`
                      group relative px-4 py-2 rounded-xl text-[13px] font-semibold
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <NavIcon 
                        size={14} 
                        className={`
                          transition-colors duration-200
                          ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-500'}
                        `} 
                      />
                      {n.label}
                    </span>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-white/50" />
                    )}
                  </Link>
                );
              })}
            </nav>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mr-auto lg:mr-0">
              {/* Showcases Link */}
              <Link
                to="/showcase"
                className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <Sparkles size={14} />
                عرض توضيحي
              </Link>
              
              {/* Login Button */}
              <Link
                to="/login"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">دخول</span>
              </Link>
              
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setOpen(!open)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`
          lg:hidden overflow-hidden transition-all duration-300
          ${open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="px-4 py-4 bg-white border-t border-slate-100 space-y-1">
            {NAV.map(n => {
              const NavIcon = n.icon;
              const isActive = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <NavIcon size={16} className={isActive ? 'text-amber-500' : 'text-slate-400'} />
                  {n.label}
                </Link>
              );
            })}
            
            <div className="pt-3 mt-3 border-t border-slate-100">
              <Link
                to="/showcase"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold"
              >
                <Sparkles size={16} />
                مشاهدة العرض التوضيحي
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

// ===== Footer Component =====
function PremiumFooter() {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = {
    platform: [
      { label: "عن المنظومة", to: "/about" },
      { label: "الخدمات الإلكترونية", to: "/services" },
      { label: "السجلات الوطنية", to: "/registries" },
      { label: "الأساس القانوني", to: "/legal" },
    ],
    support: [
      { label: "الأسئلة الشائعة", to: "/faq" },
      { label: "تواصل معنا", to: "/contact" },
      { label: "الخصوصية", to: "/privacy" },
    ],
    resources: [
      { label: "دليل المستخدم", to: "/help" },
      { label: "الوثائق التقنية", to: "/docs" },
      { label: "API", to: "/api-docs" },
    ],
  };
  
  return (
    <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <BrandLogo size={48} rounded="xl" />
              <div>
                <div className="font-black text-lg">{BRAND.ministry}</div>
                <div className="text-sm text-slate-400">{BRAND.country}</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              المنظومة الوطنية لإدارة قطاع العمل - منصة إلكترونية متكاملة لرقابة وتنظيم سوق العمل اليمني
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                <Globe size={18} className="text-slate-400" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                <Mail size={18} className="text-slate-400" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                <PhoneCall size={18} className="text-slate-400" />
              </a>
            </div>
          </div>
          
          {/* Links Columns */}
          <div>
            <h3 className="font-bold text-amber-400 mb-4">المنصة</h3>
            <ul className="space-y-3">
              {footerLinks.platform.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-amber-400 mb-4">الدعم</h3>
            <ul className="space-y-3">
              {footerLinks.support.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-amber-400 mb-4">الموارد</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-slate-400 hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              © {currentYear} {BRAND.ministry}. جميع الحقوق محفوظة.
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>صُممت بـ</span>
              <Heart size={14} className="text-red-500 fill-red-500" />
              <span>في اليمن</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ===== Main Layout Component =====
export function PublicLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const { pathname } = useLocation();
  
  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <GlassHeader />
      <main className="flex-1">
        {children}
      </main>
      <PremiumFooter />
    </div>
  );
}
