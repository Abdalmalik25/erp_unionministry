/**
 * ProductShowcase.tsx — صفحة العرض التوضيحي التفاعلية الكاملة
 * Complete Interactive Product Showcase Page
 * صفحة مستقلة تعرض جميع وظائف المنظومة بطريقة بصرية احترافية
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, Users, FileCheck, Shield, BarChart3, 
  Globe, ChevronRight, ChevronLeft, Play, Pause,
  CheckCircle2, ArrowRight, Eye, EyeOff, X,
  Briefcase, UserCheck, AlertTriangle, ClipboardCheck,
  TrendingUp, Award, Calendar, FileText, MapPin,
  Zap, Lock, Database, Cloud, Smartphone, 
  Target, Rocket, Sparkles, Heart
} from 'lucide-react';

// ===== أنواع البيانات =====
interface Feature {
  id: string;
  icon: React.ElementType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  stats?: { labelAr: string; labelEn: string; value: string }[];
  color: string;
  gradient: string;
}

interface Module {
  id: string;
  icon: React.ElementType;
  titleAr: string;
  titleEn: string;
  featuresAr: string[];
  featuresEn: string[];
  color: string;
}

// ===== بيانات الوحدات الرئيسية =====
const modules: Module[] = [
  {
    id: 'employer',
    icon: Building2,
    titleAr: 'إدارة المنشآت',
    titleEn: 'Establishment Management',
    featuresAr: [
      'سجل المنشآت الشامل',
      'إدارة الفروع والمواقع',
      'عقود العمل الموحدة',
      'نظام الأجور والبدلات',
      'التقارير والإحصائيات',
    ],
    featuresEn: [
      'Comprehensive establishment registry',
      'Branches & locations management',
      'Unified work contracts',
      'Wages & allowances system',
      'Reports & statistics',
    ],
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'worker',
    icon: UserCheck,
    titleAr: 'جواز العمل اليمني',
    titleEn: 'Worker Passport',
    featuresAr: [
      'الهوية والمهارات',
      'التعاقد والتنسيب',
      'الشهادات الصحية',
      'التدريب والاختبارات',
      'الحوادث والإصابات',
    ],
    featuresEn: [
      'Identity & skills profile',
      'Contracts & assignments',
      'Health certificates',
      'Training & assessments',
      'Accidents & injuries',
    ],
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'inspection',
    icon: ClipboardCheck,
    titleAr: 'التفتيش والمراقبة',
    titleEn: 'Inspection & Monitoring',
    featuresAr: [
      'الزيارات الميدانية',
      'سجل المخالفات',
      'الإنذارات والتوجيهات',
      'الجدولة والمتابعة',
      'التقارير الرقابية',
    ],
    featuresEn: [
      'Field visits',
      'Violations registry',
      'Alerts & directives',
      'Scheduling & follow-up',
      'Oversight reports',
    ],
    color: 'from-purple-500 to-violet-600',
  },
  {
    id: 'contracts',
    icon: FileCheck,
    titleAr: 'العقود والأجور',
    titleEn: 'Contracts & Wages',
    featuresAr: [
      'عقود العمل الموحدة',
      'الحد الأدنى للأجور',
      'سجل الأجور',
      'التجديد والإنهاء',
      'الامتثال والرقابة',
    ],
    featuresEn: [
      'Unified work contracts',
      'Minimum wage system',
      'Wage registry',
      'Renewal & termination',
      'Compliance & monitoring',
    ],
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    titleAr: 'التحليلات الذكية',
    titleEn: 'Smart Analytics',
    featuresAr: [
      'لوحة المؤشرات الرئيسية',
      'تقارير سوق العمل',
      'تحليلات جغرافية',
      'مؤشرات الأداء',
      'التقارير الدورية',
    ],
    featuresEn: [
      'KPI dashboard',
      'Labor market reports',
      'Geographic analytics',
      'Performance indicators',
      'Periodic reports',
    ],
    color: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'services',
    icon: Globe,
    titleAr: 'الخدمات الذكية',
    titleEn: 'Smart Services',
    featuresAr: [
      'بوابة الخدمات الإلكترونية',
      'التوظيف الذكي',
      'إدارة الشكاوى',
      'التصاريح والأجازات',
      'التواصل والتفاعل',
    ],
    featuresEn: [
      'E-services portal',
      'Smart recruitment',
      'Complaints management',
      'Permits & leaves',
      'Communication & engagement',
    ],
    color: 'from-rose-500 to-pink-600',
  },
];

// ===== مكون البطاقة المضيئة =====
function GlowCard({ children, className = '' }: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-gradient-to-br from-white/10 to-white/5
      backdrop-blur-xl border border-white/20
      shadow-2xl shadow-black/20
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
}

// ===== مكون الشرائح المتحركة =====
function ModuleCard({ module, index, isActive, onSelect, isRTL }: {
  module: Module;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  isRTL: boolean;
}) {
  const Icon = module.icon;
  
  return (
    <button
      onClick={onSelect}
      className={`
        relative w-full p-4 rounded-xl transition-all duration-300
        ${isActive 
          ? 'bg-white/20 border-2 border-white/40 shadow-lg scale-105' 
          : 'bg-white/10 border border-white/10 hover:bg-white/15'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-12 h-12 rounded-xl
          bg-gradient-to-br ${module.color}
          flex items-center justify-center
          shadow-lg
        `}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="text-right flex-1">
          <h3 className="font-bold text-white">
            {isRTL ? module.titleAr : module.titleEn}
          </h3>
          <p className="text-sm text-white/60">
            {index + 1} / {modules.length}
          </p>
        </div>
        {isActive && (
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

// ===== مكون التفاصيل =====
function ModuleDetails({ module, isRTL }: {
  module: Module;
  isRTL: boolean;
}) {
  const Icon = module.icon;
  
  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center gap-4">
        <div className={`
          w-16 h-16 rounded-2xl
          bg-gradient-to-br ${module.color}
          flex items-center justify-center
          shadow-xl
        `}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isRTL ? module.titleAr : module.titleEn}
          </h2>
        </div>
      </div>
      
      {/* الوصف */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      {/* القائمة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(isRTL ? module.featuresAr : module.featuresEn).map((feature, i) => (
          <div 
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/90">{feature}</span>
          </div>
        ))}
      </div>
      
      {/* الإحصائيات */}
      {module.id === 'employer' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { labelAr: 'منشآت مسجلة', labelEn: 'Registered', value: '12,500' },
            { labelAr: 'فروع', labelEn: 'Branches', value: '45,200' },
            { labelAr: 'عقود نشطة', labelEn: 'Active Contracts', value: '98,700' },
            { labelAr: 'زيارات تفتيش', labelEn: 'Inspections', value: '156,000' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-white/5">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-white/60">
                {isRTL ? stat.labelAr : stat.labelEn}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {module.id === 'worker' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { labelAr: 'عمال مسجلين', labelEn: 'Registered Workers', value: '52,300' },
            { labelAr: 'شهادات صحية', labelEn: 'Health Certificates', value: '89,400' },
            { labelAr: 'تدريبات', labelEn: 'Trainings', value: '23,100' },
            { labelAr: 'شهادات مهنية', labelEn: 'Certifications', value: '15,800' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-white/5">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-white/60">
                {isRTL ? stat.labelAr : stat.labelEn}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== مكون الرسم البياني المتحرك =====
function AnimatedBarChart() {
  const [data, setData] = useState([65, 45, 80, 55, 70, 60, 85]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => prev.map(v => v + (Math.random() - 0.5) * 10).map(v => Math.max(30, Math.min(95, v))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex items-end justify-between h-32 gap-2">
      {data.map((value, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-white/20 rounded-t-lg relative overflow-hidden" style={{ height: `${value}%`, minHeight: '20px' }}>
            <div 
              className="absolute inset-0 bg-gradient-to-t from-blue-500 to-cyan-400"
              style={{ 
                height: `${100}%`,
                animation: `growUp 1s ease-out ${i * 0.1}s forwards`,
              }}
            />
          </div>
          <div className="text-xs text-white/60">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</div>
        </div>
      ))}
      <style>{`
        @keyframes growUp {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// ===== مكون العداد المتحرك =====
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const duration = 2000;
          const startTime = Date.now();
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(value * eased));
            
            if (progress < 1) requestAnimationFrame(animate);
          };
          
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);
  
  return (
    <div ref={ref} className="text-4xl font-bold text-white">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

// ===== مكون الشرائح الرئيسية =====
function HeroSection({ onExplore }: { onExplore: () => void }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return (
    <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* الخلفية المتحركة */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900"
        style={{
          transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      />
      
      {/* الجزيئات المتحركة */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* المحتوى */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* الشعار */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <Building2 className="w-6 h-6 text-white" />
            <span className="text-white font-medium">
              {isRTL ? 'وزارة العمل اليمنية' : 'Yemen Ministry of Labor'}
            </span>
          </div>
        </div>
        
        {/* العنوان */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          {isRTL ? 'المنظومة الوطنية' : 'National'}
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {isRTL ? 'لإدارة العمل' : 'Labor Platform'}
          </span>
        </h1>
        
        {/* الوصف */}
        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
          {isRTL 
            ? 'منصة متكاملة لرقابة وتنظيم سوق العمل اليمني، تشمل إدارة المنشآت والعمال والتفتيش والعقود والخدمات الذكية'
            : 'Integrated platform for monitoring and regulating Yemeni labor market, covering establishments, workers, inspection, contracts, and smart services'
          }
        </p>
        
        {/* الأزرار */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onExplore}
            className="px-8 py-4 rounded-xl bg-white text-blue-900 font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <Rocket className="w-5 h-5" />
            {isRTL ? 'استكشف المنظومة' : 'Explore Platform'}
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            {isRTL ? 'الدخول للنظام' : 'Access System'}
          </button>
        </div>
        
        {/* الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
          {[
            { labelAr: 'منشأة', labelEn: 'Establishments', value: 12500 },
            { labelAr: 'عامل', labelEn: 'Workers', value: 52300 },
            { labelAr: 'عقد', labelEn: 'Contracts', value: 98700 },
            { labelAr: 'زيارة تفتيش', labelEn: 'Inspections', value: 156000 },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <AnimatedCounter value={stat.value} suffix="+" />
              <div className="text-white/60 mt-1">
                {isRTL ? stat.labelAr : stat.labelEn}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* التمرير للأسفل */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronRight className="w-8 h-8 text-white/50 rotate-90" />
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function ProductShowcase() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeModule, setActiveModule] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // التبديل التلقائي
  useEffect(() => {
    if (!isAutoPlay) return;
    
    const interval = setInterval(() => {
      setActiveModule(prev => (prev + 1) % modules.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isAutoPlay]);
  
  // التنقل بلوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActiveModule(prev => (prev + 1) % modules.length);
      if (e.key === 'ArrowLeft') setActiveModule(prev => (prev - 1 + modules.length) % modules.length);
      if (e.key === 'Escape' && showFullscreen) setShowFullscreen(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreen]);
  
  const scrollToModules = () => {
    document.getElementById('modules-section')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setShowFullscreen(true);
    } else {
      await document.exitFullscreen();
      setShowFullscreen(false);
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className={`
        min-h-screen bg-gray-900 text-white
        ${showFullscreen ? 'fixed inset-0 z-50' : ''}
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Hero Section */}
      <HeroSection onExplore={scrollToModules} />
      
      {/* Modules Section */}
      <section id="modules-section" className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* العنوان */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {isRTL ? 'وحدات النظام الرئيسية' : 'Core System Modules'}
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {isRTL 
                ? 'استكشف الوحدات الستة الرئيسية التي تشكل منظومة إدارة العمل الوطنية'
                : 'Explore the six main modules that form the National Labor Management Platform'
              }
            </p>
          </div>
          
          {/* المحتوى */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* قائمة الوحدات */}
            <div className="space-y-3">
              {modules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  index={index}
                  isActive={activeModule === index}
                  onSelect={() => setActiveModule(index)}
                  isRTL={isRTL}
                />
              ))}
              
              {/* التحكم */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setActiveModule(prev => (prev - 1 + modules.length) % modules.length)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
                
                <button
                  onClick={() => setIsAutoPlay(prev => !prev)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {isAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span className="text-sm">
                    {isAutoPlay 
                      ? (isRTL ? 'إيقاف' : 'Pause') 
                      : (isRTL ? 'تشغيل' : 'Play')
                    }
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveModule(prev => (prev + 1) % modules.length)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            
            {/* تفاصيل الوحدة */}
            <div className="lg:col-span-2">
              <GlowCard className="min-h-[400px]">
                <ModuleDetails 
                  module={modules[activeModule]} 
                  isRTL={isRTL}
                />
              </GlowCard>
            </div>
          </div>
        </div>
      </section>
      
      {/* Dashboard Preview Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {isRTL ? 'معاينة لوحة التحكم' : 'Dashboard Preview'}
            </h2>
            <p className="text-white/70">
              {isRTL 
                ? 'لوحة تحكم تفاعلية مع إحصائيات حية'
                : 'Interactive dashboard with live statistics'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* الرسم البياني */}
            <div className="md:col-span-2">
              <GlowCard className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">
                    {isRTL ? 'النشاط الأسبوعي' : 'Weekly Activity'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {isRTL ? 'محدث الآن' : 'Live'}
                  </div>
                </div>
                <AnimatedBarChart />
              </GlowCard>
            </div>
            
            {/* الإحصائيات السريعة */}
            <div className="space-y-6">
              <GlowCard>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-white/60 text-sm">
                    {isRTL ? 'معدل التوظيف' : 'Employment Rate'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-emerald-400">+15.8%</div>
              </GlowCard>
              
              <GlowCard>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-white/60 text-sm">
                    {isRTL ? 'معدل الامتثال' : 'Compliance Rate'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-400">94.2%</div>
              </GlowCard>
              
              <GlowCard>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-white/60 text-sm">
                    {isRTL ? 'المخالفات' : 'Violations'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-amber-400">-23%</div>
              </GlowCard>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-white/20 mb-6">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="text-white/80">
              {isRTL ? 'جاهز للبدء؟' : 'Ready to get started?'}
            </span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {isRTL 
              ? 'ابدأ رحلتك مع المنظومة الوطنية للعمل'
              : 'Start your journey with the National Labor Platform'
            }
          </h2>
          
          <p className="text-white/70 mb-10 max-w-2xl mx-auto">
            {isRTL 
              ? 'انضم إلى آلاف المنشآت والعمال المستفيدين من خدمات المنظومة الوطنية لإدارة العمل في اليمن'
              : 'Join thousands of establishments and workers benefiting from Yemen National Labor Management Platform services'
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              {isRTL ? 'الدخول إلى النظام' : 'Access System'}
            </a>
            <button
              onClick={toggleFullscreen}
              className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              {isRTL ? 'عرض ملء الشاشة' : 'Fullscreen Mode'}
            </button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-white/60" />
            <span className="text-white/60 text-sm">
              {isRTL ? 'وزارة العمل - الجمهورية اليمنية' : 'Ministry of Labor - Republic of Yemen'}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span>© 2024</span>
            <span>•</span>
            <span>{isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
