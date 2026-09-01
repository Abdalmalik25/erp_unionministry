/**
 * PublicHome — الصفحة الرئيسية المطورة للمنظومة الوطنية للعمل
 * Premium Modern Design with Glass Morphism & Micro-interactions
 * World-Class Labor Sector Platform Design
 */

import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft, ArrowRight, Building2, Shield, Globe, Target, Rocket, CheckCircle2,
  ChevronDown
} from "lucide-react";
import { PublicLayout } from "./PublicLayout";

// ===== Basic Glass Card =====
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-white/80 backdrop-blur-md
      border border-white/30
      shadow-sm
      ${className}
    `}>
      <div className="relative z-10 p-6">{children}</div>
    </div>
  );
}

// ===== Strategic Overview Section =====
function StrategicOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-black text-lg">رؤية وطنية</div>
            <div className="text-slate-300 text-sm">لقطاع عمل حديث وفعال في اليمن</div>
          </div>
        </div>
        <p className="text-slate-300 leading-relaxed">
          منظومة متكاملة لرقابة وتنظيم سوق العمل ترتكز على العدالة والشفافية وتحقيق الاستقرار المنشود لبيئة العمل الوطني.
        </p>
      </div>
      
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-black text-lg">الامتزام القانوني</div>
            <div className="text-slate-300 text-sm">ضمان حقوق جميع أطراف العلاقة الوظيفية</div>
          </div>
        </div>
        <p className="text-slate-300 leading-relaxed">
          إطار تشريعي شامل يضمن الامتثال ويلغي أي مخالفات أو تجاوزات في سوق العمل.
        </p>
      </div>
    </div>
  );
}

// ===== Service Offerings Section =====
function ServiceOfferingsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <div className="bg-white/5 rounded-2xl border border-white/10 text-center p-4">
<div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <div className="w-7 h-7 text-amber-400" />
        </div>
        <h3 className="font-bold text-sm text-slate-900 mb-2">خدمات تسجيل المنشآت</h3>
        <p className="text-slate-500 text-xs leading-relaxed">تسجيل وترخيص المنشآت الاقتصادية وفق الضوابط المنظمة</p>
      </div>
      <div className="bg-white/5 rounded-2xl border border-white/10 text-center p-4">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <div className="w-7 h-7 text-amber-400" />
        </div>
        <h3 className="font-bold text-sm text-slate-900 mb-2">خدمات تسجيل العمال</h3>
        <p className="text-slate-500 text-xs leading-relaxed">تسجيل العمالة الوطنية والإقليمية في النظام الموحد</p>
      </div>
      <div className="bg-white/5 rounded-2xl border border-white/10 text-center p-4">
<div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <Shield className="w-7 h-7 text-amber-400" />
        </div>
        <h3 className="font-bold text-sm text-slate-900 mb-2">الفحوصات التفتيشية</h3>
        <p className="text-slate-500 text-xs leading-relaxed">إجراء الفحوصات الرقابية وفق البرامج المعدة سلفاً</p>
      </div>
      <div className="bg-white/5 rounded-2xl border border-white/10 text-center p-4">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <Shield className="w-7 h-7 text-amber-400" />
        </div>
        <h3 className="font-bold text-sm text-slate-900 mb-2">إدارة العقود</h3>
        <p className="text-slate-500 text-xs leading-relaxed">ضبط وتتبع العقود العمالية وضوابطها النظامية</p>
      </div>
    </div>
  );
}

// ===== Process Steps =====
function ProcessSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="relative text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="font-bold text-lg text-slate-900 mb-1">التسجيل</h3>
        <p className="text-slate-500 text-sm">إنشاء حساب جديد للمنشأة أو العامل</p>
      </div>
      <div className="relative text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <Shield className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="font-bold text-lg text-slate-900 mb-1">التحقق</h3>
        <p className="text-slate-500 text-sm">مصادقة هوية المستخدم عبر النظام</p>
      </div>
      <div className="relative text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <Globe className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="font-bold text-lg text-slate-900 mb-1">الخدمات</h3>
        <p className="text-slate-500 text-sm">الوصول لجميع الخدمات الإلكترونية</p>
      </div>
      <div className="relative text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
          <Globe className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="font-bold text-lg text-slate-900 mb-1">المتابعة</h3>
        <p className="text-slate-500 text-sm">تتبع حالة المعاملات والإشعارات</p>
      </div>
    </div>
  );
}

// ===== Testimonials =====
// Removed - testimonials section replaced by strategic overview

// ===== CTA Section =====
function CTASection() {
  return (
    <div className="relative py-24 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-semibold mb-8">
          <Rocket className="w-4 h-4" />
          خدمات الوزارة الإلكترونية بين يدك
        </div>
        
        <h2 className="text-4xl md:text-5xl font-black mb-6">
          الوصول إلى خدمات وزارة الشؤون الاجتماعية والعمل
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
    </div>
  );
}

// ===== Partners Section =====
function PartnersSection() {
  const partners = [
    'وزارة العمل اليمنية',
    'اتحاد عمال اليمن',
    'غرفة التجارة والصناعة',
    'منظمة العمل الدولية',
    'برنامج الأمم المتحدة الإنمائي',
  ];
  
  return (
    <div className="text-center">
      <p className="text-slate-500 text-sm mb-6 font-medium">شراكاؤنا في النجاح</p>
      <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
        {partners.map((partner, i) => (
          <div key={i} className="text-slate-600 font-bold text-sm md:text-base">
            {partner}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Main Component =====
export function PublicHome() {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <PublicLayout>
      {/* ===== Premium Hero Section ===== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
          
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-sm font-bold mb-6 shadow-sm">
                البوابة الرسمية لقطاع العمل في اليمن
              </div>
              
              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
                <span className="block">المنظومة الوطنية</span>
                <span className="block bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                  لإدارة قطاع العمل
                </span>
              </h1>
              
              {/* Description */}
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
                منصة إلكترونية متكاملة لرقابة وتنظيم سوق العمل اليمني، تضمن حقوق جميع أطراف علاقة العمل وتحقق العدالة والشفافية
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-lg shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  الدخول إلى المنظومة
                </Link>
<Link
            to="/showcase"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-300 text-slate-800 font-bold text-lg backdrop-blur-sm transition-all"
          >
            استعراض الخدمات
          </Link>
              </div>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>تسجيل مجاني</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>متاح 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>دعم فني مستمر</span>
                </div>
              </div>
            </div>
            
            {/* Hero Visual */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Main Card */}
                <GlassCard className="p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">لوحة التحكم الرئيسية</div>
                      <div className="text-sm text-slate-500">Ministry Dashboard</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { label: 'المنشآت النشطة', value: '12,500', color: 'bg-emerald-500' },
                      { label: 'العمال المسجلين', value: '52,300', color: 'bg-blue-500' },
                      { label: 'العقود المبرمة', value: '98,700', color: 'bg-amber-500' },
                      { label: 'الزيارات التفتيشية', value: '156,000', color: 'bg-purple-500' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="flex-1 text-sm text-slate-600">{item.label}</span>
                        <span className="font-bold text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
                
                {/* Floating Cards */}
                <GlassCard className="absolute -top-4 -right-4 p-4 transform -rotate-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">+2,500</div>
                      <div className="text-xs text-slate-500">هذا الشهر</div>
                    </div>
                  </div>
                </GlassCard>
                
                <GlassCard className="absolute -bottom-4 -left-4 p-4 transform rotate-6 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">94.2%</div>
                      <div className="text-xs text-slate-500">معدل الامتثال</div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-slate-400" />
        </div>
      </section>
      
      {/* ===== Statistics Section ===== */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <StrategicOverview />
        </div>
      </section>
      

      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-bold mb-4">
              <Target className="w-4 h-4" />
              كيف تبدأ؟
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              أربع خطوات للبدء
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              ابدأ رحلتك مع المنظومة الوطنية للعمل في أربع خطوات بسيطة
            </p>
          </div>
          
          <ProcessSection />
        </div>
      </section>
      
      {/* ===== About Preview ===== */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-sm font-bold mb-6">
                رؤيتنا
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-6">
                بناء سوق عمل عادل وشفاف في اليمن
              </h2>
              <p className="text-slate-300 leading-relaxed mb-6">
                نسعى لتحقيق رؤية وطنية شاملة لإدارة قطاع العمل، ترتكز على العدالة والشفافية والفعالية، وتضمن حقوق جميع أطراف علاقة العمل.
              </p>
              <p className="text-slate-300 leading-relaxed mb-8">
                من خلال هذه المنصة، نوفر بيئة عمل رقمية متكاملة تجمع بين الجهات الرقابية وأصحاب العمل والعمال، لتحقيق الاستقرار في سوق العمل اليمني.
              </p>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-amber-400 font-bold hover:text-amber-300 transition-colors"
              >
                تعرف علينا أكثر
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'العدالة', desc: 'ضمان حقوق جميع الأطراف', color: 'from-amber-500 to-amber-600' },
                { title: 'الشفافية', desc: 'عمليات واضحة ومفتوحة', color: 'from-blue-500 to-blue-700' },
                { title: 'الفعالية', desc: 'إنجاز المعاملات بسرعة', color: 'from-green-500 to-green-600' },
                { title: 'الاستدامة', desc: 'دعم طويل الأمد', color: 'from-teal-500 to-teal-600' },
              ].map((item, i) => (
                <GlassCard key={i} className="text-center bg-white/5 border-white/10">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: item.color }}>
                    <div className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>
      

      <section className="py-16 px-4 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <PartnersSection />
        </div>
      </section>
      
      {/* ===== CTA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <CTASection />
        </div>
      </section>
    </PublicLayout>
  );
}
