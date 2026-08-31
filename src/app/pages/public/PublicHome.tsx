/**
 * PublicHome — الصفحة الرئيسية المطورة للمنظومة الوطنية للعمل
 * Premium Modern Design with Glass Morphism & Micro-interactions
 * World-Class Labor Sector Platform Design
 */

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft, ArrowRight, Building2, Briefcase, Users, FileCheck, Shield, Scale, Globe,
  TrendingUp, CheckCircle2, Star, Zap, Heart, Play, ChevronDown, Lock, Fingerprint,
  Award, Target, Rocket, Sparkles, Phone, Mail, MapPin, Clock, Menu, X,
  BarChart3, ClipboardCheck, UserCheck, BriefcaseIcon, Activity, ShieldCheck
} from "lucide-react";
import { PublicLayout } from "./PublicLayout";
import { BRAND } from "../../branding";

// ===== Premium Animations =====
function useIntersectionObserver(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// ===== Animated Counter Component =====
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useIntersectionObserver();
  
  useEffect(() => {
    if (!isVisible) return;
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(end * eased));
      
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);
  
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ===== Floating Particles Background =====
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-amber-400/30 rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ===== Premium Glass Card =====
function GlassCard({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-white/70 backdrop-blur-xl
      border border-white/50
      shadow-xl shadow-black/5
      ${hover ? 'hover:shadow-2xl hover:scale-[1.02] transition-all duration-300' : ''}
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
      <div className="relative z-10 p-6">{children}</div>
    </div>
  );
}

// ===== Stats Section =====
function StatsSection() {
  const stats = [
    { icon: Building2, value: 12500, suffix: '+', label: 'منشأة مسجلة', subLabel: 'Registered Establishments' },
    { icon: Users, value: 52300, suffix: '+', label: 'عامل مسجل', subLabel: 'Registered Workers' },
    { icon: FileCheck, value: 98700, suffix: '+', label: 'عقد نشط', subLabel: 'Active Contracts' },
    { icon: ClipboardCheck, value: 156000, suffix: '+', label: 'زيارة تفتيش', subLabel: 'Inspection Visits' },
  ];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, i) => (
        <GlassCard key={i} className="text-center group">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
            <stat.icon className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mb-1">
            <AnimatedCounter end={stat.value} suffix={stat.suffix} />
          </div>
          <div className="text-sm font-semibold text-slate-700">{stat.label}</div>
          <div className="text-xs text-slate-500 mt-0.5">{stat.subLabel}</div>
        </GlassCard>
      ))}
    </div>
  );
}

// ===== Feature Cards =====
function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: 'حماية قانونية شاملة',
      description: 'ضمان حقوق جميع أطراف علاقة العمل وفق أحدث التشريعات',
      color: 'from-blue-500 to-blue-700',
      iconBg: 'bg-blue-500',
    },
    {
      icon: Zap,
      title: 'خدمات إلكترونية ذكية',
      description: 'إتمام المعاملات فوراً دون الحاجة لزيارة المكاتب',
      color: 'from-amber-500 to-amber-700',
      iconBg: 'bg-amber-500',
    },
    {
      icon: BarChart3,
      title: 'تحليلات متقدمة',
      description: 'مؤشرات أداء ولوحات تحكم احترافية لصنع القرار',
      color: 'from-emerald-500 to-emerald-700',
      iconBg: 'bg-emerald-500',
    },
    {
      icon: Globe,
      title: 'تغطية وطنية',
      description: 'خدمة جميع المناطق والمحافظات اليمنية',
      color: 'from-purple-500 to-purple-700',
      iconBg: 'bg-purple-500',
    },
    {
      icon: Lock,
      title: 'أمان متقدم',
      description: 'تشفير البيانات والمصادقة الثنائية للحماية القصوى',
      color: 'from-slate-600 to-slate-800',
      iconBg: 'bg-slate-600',
    },
    {
      icon: Activity,
      title: 'مراقبة مستمرة',
      description: 'تتبع آني للمخالفات والتجاوزات Labour Market Oversight',
      color: 'from-rose-500 to-rose-700',
      iconBg: 'bg-rose-500',
    },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, i) => (
        <GlassCard key={i} className="group">
          <div className="flex items-start gap-4">
            <div className={`
              w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color}
              flex items-center justify-center shadow-lg
              group-hover:scale-110 group-hover:rotate-3 transition-all duration-300
            `}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ===== Process Steps =====
function ProcessSection() {
  const steps = [
    { num: '01', title: 'التسجيل', description: 'إنشاء حساب جديد للمنشأة أو العامل', icon: UserCheck },
    { num: '02', title: 'التحقق', description: 'مصادقة هوية المستخدم عبر النظام', icon: Fingerprint },
    { num: '03', title: 'الخدمات', description: 'الوصول لجميع الخدمات الإلكترونية', icon: Globe },
    { num: '04', title: 'المتابعة', description: 'تتبع حالة المعاملات والإشعارات', icon: Activity },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {steps.map((step, i) => (
        <div key={i} className="relative text-center group">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300">
            <step.icon className="w-9 h-9 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shadow-lg">
            {step.num}
          </div>
          <h3 className="font-bold text-lg text-slate-900 mb-1">{step.title}</h3>
          <p className="text-slate-600 text-sm">{step.description}</p>
          {i < steps.length - 1 && (
            <div className="hidden md:block absolute top-10 -left-1/2 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-200" />
          )}
        </div>
      ))}
    </div>
  );
}

// ===== Testimonials =====
function TestimonialsSection() {
  const testimonials = [
    {
      quote: 'منظومة متكاملة غيّرت طريقة تعاملنا مع سوق العمل اليمني',
      author: 'وزارة الشؤون الاجتماعية والعمل',
      role: 'الجهة التنظيمية',
    },
    {
      quote: 'وفرت علينا ساعات طويلة من الانتظار في المكاتب الحكومية',
      author: 'أحمد محمد',
      role: 'صاحب منشأة',
    },
    {
      quote: ' теперь أستطيع متابعة حقوقي كمقيم بكل سهولة',
      author: 'محمد علي',
      role: 'عامل مسجل',
    },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {testimonials.map((item, i) => (
        <GlassCard key={i} className="text-center">
          <div className="flex justify-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star key={j} className="w-5 h-5 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <p className="text-slate-700 italic mb-4">"{item.quote}"</p>
          <div className="font-bold text-slate-900">{item.author}</div>
          <div className="text-sm text-slate-500">{item.role}</div>
        </GlassCard>
      ))}
    </div>
  );
}

// ===== CTA Section =====
function CTASection() {
  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <FloatingParticles />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />
      
      <div className="relative z-10 px-8 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-sm font-semibold mb-6">
          <Rocket className="w-4 h-4" />
          ابدأ رحلتك الآن
        </div>
        
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
          جاهز للانضمام إلى المنظومة؟
        </h2>
        <p className="text-slate-300 max-w-xl mx-auto mb-8">
          انضم إلى آلاف المنشآت والعمال المستفيدين من خدمات المنظومة الوطنية لإدارة قطاع العمل في اليمن
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-black text-lg shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            الدخول إلى المنظومة
          </Link>
          <Link
            to="/showcase"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-lg backdrop-blur-sm transition-all"
          >
            <Play className="w-5 h-5" />
            مشاهدة العرض التوضيحي
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
          <FloatingParticles />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-sm font-bold mb-6 shadow-sm">
                <Award className="w-4 h-4" />
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
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-amber-400 text-slate-800 font-bold text-lg shadow-sm hover:shadow-md transition-all"
                >
                  <Play className="w-5 h-5" />
                  عرض توضيحي
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
          <StatsSection />
        </div>
      </section>
      
      {/* ===== Features Section ===== */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-bold mb-4">
              <Sparkles className="w-4 h-4" />
              لماذا تختار منصتنا؟
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              خدمات متكاملة لقادة سوق العمل
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              نقدم مجموعة شاملة من الأدوات والخدمات المصممة لتلبية احتياجات جميع أطراف علاقة العمل
            </p>
          </div>
          
          <FeaturesSection />
        </div>
      </section>
      
      {/* ===== Process Section ===== */}
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
                <Heart className="w-4 h-4" />
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
                { icon: Scale, title: 'العدالة', desc: 'ضمان حقوق جميع الأطراف' },
                { icon: Shield, title: 'الشفافية', desc: 'عمليات واضحة ومفتوحة' },
                { icon: Zap, title: 'الفعالية', desc: 'إنجاز المعاملات بسرعة' },
                { icon: Heart, title: 'الاستدامة', desc: 'دعم طويل الأمد' },
              ].map((item, i) => (
                <GlassCard key={i} className="text-center bg-white/5 border-white/10">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-400/20 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* ===== Testimonials ===== */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold mb-4">
              <Star className="w-4 h-4" />
              آراء المستخدمين
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              ماذا يقول عنا المستخدمون؟
            </h2>
          </div>
          
          <TestimonialsSection />
        </div>
      </section>
      
      {/* ===== Partners ===== */}
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
