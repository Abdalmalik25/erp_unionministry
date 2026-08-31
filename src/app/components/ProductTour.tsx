/**
 * ProductTour.tsx — شاشة العرض التفاعلية للمنظومة الوطنية للعمل
 * Interactive Product Tour Component for National Labor Platform
 * يعرض جميع وظائف النظام بطريقة بصرية جذابة للمستخدم النهائي
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, Users, FileCheck, Shield, BarChart3, 
  Globe, ChevronRight, ChevronLeft, Play, Pause,
  CheckCircle2, ArrowRight, Menu, X, Eye, EyeOff,
  Briefcase, UserCheck, AlertTriangle, ClipboardCheck,
  TrendingUp, Award, Calendar, FileText, MapPin
} from 'lucide-react';

// بيانات الشرائح التقديمية
const tourSlides = [
  {
    id: 'hero',
    icon: Building2,
    titleAr: 'منظومة إدارة العمل الوطنية',
    titleEn: 'National Labor Management Platform',
    subtitleAr: 'منصة متكاملة لإدارة شؤون العمل والتوظيف',
    subtitleEn: 'Integrated Platform for Labor & Employment Management',
    color: 'from-blue-600 to-blue-800',
    bgPattern: true,
    features: [
      { icon: Users, label: 'إدارة العمال', labelEn: 'Worker Management', value: '50,000+' },
      { icon: Building2, label: 'المنشآت', labelEn: 'Establishments', value: '12,000+' },
      { icon: FileCheck, label: 'العقود', labelEn: 'Contracts', value: '100,000+' },
      { icon: Shield, label: 'الجهات الرقابية', labelEn: 'Inspector Bodies', value: '350+' },
    ]
  },
  {
    id: 'employer',
    icon: Building2,
    titleAr: 'إدارة المنشآت',
    titleEn: 'Establishment Management',
    subtitleAr: 'سجل شامل لجميع المنشآت العاملة في اليمن',
    subtitleEn: 'Comprehensive Registry of All Establishments in Yemen',
    color: 'from-emerald-500 to-teal-700',
    features: [
      { icon: Building2, label: 'التسجيل والترخيص', labelEn: 'Registration & Licensing', value: '' },
      { icon: FileText, label: 'العقود والاجور', labelEn: 'Contracts & Wages', value: '' },
      { icon: MapPin, label: 'الفروع والمناطق', labelEn: 'Branches & Regions', value: '' },
      { icon: TrendingUp, label: 'التقارير الاحصائية', labelEn: 'Statistical Reports', value: '' },
    ]
  },
  {
    id: 'worker',
    icon: UserCheck,
    titleAr: 'ملف العامل',
    titleEn: 'Worker Passport',
    subtitleAr: 'جواز العمل اليمني - سجل شامل لمسار العامل',
    subtitleEn: 'Yemeni Work Passport - Complete Worker Career Record',
    color: 'from-amber-500 to-orange-700',
    features: [
      { icon: UserCheck, label: 'الهوية والمهارات', labelEn: 'Identity & Skills', value: '' },
      { icon: Briefcase, label: 'التعاقد والاجور', labelEn: 'Contracts & Wages', value: '' },
      { icon: FileCheck, label: 'الشهادات الصحية', labelEn: 'Health Certificates', value: '' },
      { icon: Award, label: 'التدريب والاختبارات', labelEn: 'Training & Assessments', value: '' },
    ]
  },
  {
    id: 'inspection',
    icon: ClipboardCheck,
    titleAr: 'التفتيش والمراقبة',
    titleEn: 'Inspection & Monitoring',
    subtitleAr: 'نظام متكامل للتفتيش الميداني والرقابة',
    subtitleEn: 'Integrated System for Field Inspection & Oversight',
    color: 'from-purple-500 to-violet-700',
    features: [
      { icon: ClipboardCheck, label: 'الزيارات الميدانية', labelEn: 'Field Visits', value: '' },
      { icon: AlertTriangle, label: 'المخالفات والانذارات', labelEn: 'Violations & Alerts', value: '' },
      { icon: Calendar, label: 'الجدولة والمتابعة', labelEn: 'Scheduling & Follow-up', value: '' },
      { icon: BarChart3, label: 'تقارير الرقابة', labelEn: 'Oversight Reports', value: '' },
    ]
  },
  {
    id: 'contracts',
    icon: FileCheck,
    titleAr: 'العقود والاجور',
    titleEn: 'Contracts & Wages',
    subtitleAr: 'إدارة العقود ونظام الحد الادنى للاجور',
    subtitleEn: 'Contract Management & Minimum Wage System',
    color: 'from-cyan-500 to-blue-700',
    features: [
      { icon: FileCheck, label: 'عقود العمل الموحدة', labelEn: 'Unified Work Contracts', value: '' },
      { icon: TrendingUp, label: 'الحد الادنى للاجور', labelEn: 'Minimum Wage', value: '' },
      { icon: Calendar, label: 'تجديد وانهاء العقود', labelEn: 'Contract Renewal & Termination', value: '' },
      { icon: FileText, label: 'سجل الاجور', labelEn: 'Wage Registry', value: '' },
    ]
  },
  {
    id: 'analytics',
    icon: BarChart3,
    titleAr: 'لوحة التحليلات',
    titleEn: 'Analytics Dashboard',
    subtitleAr: 'تقارير واحصائيات شاملة لاتخاذ القرار',
    subtitleEn: 'Comprehensive Reports & Statistics for Decision Making',
    color: 'from-indigo-500 to-purple-700',
    features: [
      { icon: BarChart3, label: 'احصائيات سوق العمل', labelEn: 'Labor Market Statistics', value: '' },
      { icon: TrendingUp, label: 'مؤشرات الاداء', labelEn: 'Performance Indicators', value: '' },
      { icon: Globe, label: 'التقارير الجغرافية', labelEn: 'Geographic Reports', value: '' },
      { icon: Shield, label: 'مؤشرات الالتزام', labelEn: 'Compliance Indicators', value: '' },
    ]
  },
  {
    id: 'services',
    icon: Globe,
    titleAr: 'الخدمات الذكية',
    titleEn: 'Smart Services',
    subtitleAr: 'خدمات الكترونية متكاملة لجميع المستخدمين',
    subtitleEn: 'Integrated Electronic Services for All Users',
    color: 'from-rose-500 to-pink-700',
    features: [
      { icon: Globe, label: 'بوابة الخدمات', labelEn: 'Services Portal', value: '' },
      { icon: UserCheck, label: 'التوظيف الذكي', labelEn: 'Smart Recruitment', value: '' },
      { icon: FileText, label: 'الاجازات والتصاريح', labelEn: 'Leaves & Permits', value: '' },
      { icon: Shield, label: 'الشكاوى والطعون', labelEn: 'Complaints & Appeals', value: '' },
    ]
  },
  {
    id: 'security',
    icon: Shield,
    titleAr: 'الأمان والحماية',
    titleEn: 'Security & Protection',
    subtitleAr: 'اعلى معايير الامان لحماية البيانات',
    subtitleEn: 'Highest Security Standards for Data Protection',
    color: 'from-slate-600 to-zinc-800',
    features: [
      { icon: Shield, label: 'تشفير البيانات', labelEn: 'Data Encryption', value: '' },
      { icon: CheckCircle2, label: 'المصادقة الثنائية', labelEn: 'Two-Factor Auth', value: '' },
      { icon: AlertTriangle, label: 'الكشف عن الاخطار', labelEn: 'Threat Detection', value: '' },
      { icon: FileText, label: 'سجل التدقيق', labelEn: 'Audit Trail', value: '' },
    ]
  },
];

// مكون البطاقة المضيئة
function GlowCard({ children, className = '', colorClass = 'from-blue-500/20 to-blue-600/20' }: { 
  children: React.ReactNode; 
  className?: string;
  colorClass?: string;
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-gradient-to-br ${colorClass}
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

// مكون الايقونة المتحركة
function AnimatedIcon({ icon: Icon, className = '', delay = 0 }: { 
  icon: any; 
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`
        transform transition-all duration-700 ease-out
        ${isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        ${className}
      `}
    >
      <Icon className="w-full h-full" />
    </div>
  );
}

// مكون شريط التقدم
function ProgressBar({ current, total, onSelect }: { 
  current: number; 
  total: number; 
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`
            h-2 rounded-full transition-all duration-300
            ${i === current 
              ? 'w-8 bg-white shadow-lg shadow-white/50' 
              : i < current 
                ? 'w-2 bg-white/60 hover:bg-white/80' 
                : 'w-2 bg-white/30 hover:bg-white/50'
            }
          `}
          aria-label={`Go to slide ${i + 1}`}
        />
      ))}
    </div>
  );
}

// مكون شرائح العرض
function TourSlide({ slide, index, current, isRTL }: {
  slide: typeof tourSlides[0];
  index: number;
  current: number;
  isRTL: boolean;
}) {
  const isActive = index === current;
  const Icon = slide.icon;
  
  return (
    <div 
      className={`
        absolute inset-0 transition-all duration-700 ease-out
        ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* الخلفية المتحركة */}
      <div className={`
        absolute inset-0 bg-gradient-to-br ${slide.color}
        opacity-90
      `} />
      
      {/* نمط الخلفية */}
      {slide.bgPattern && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
      )}
      
      {/* المحتوى */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 md:p-16">
        {/* العنوان الرئيسي */}
        <div className={`
          flex flex-col items-center text-center mb-8
          transform transition-all duration-500 delay-100
          ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
        `}>
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 shadow-xl">
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            {isRTL ? slide.titleAr : slide.titleEn}
          </h2>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl">
            {isRTL ? slide.subtitleAr : slide.subtitleEn}
          </p>
        </div>
        
        {/* بطاقات الوظائف */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {slide.features.map((feature, i) => {
            const FeatureIcon = feature.icon;
            return (
              <div
                key={i}
                className={`
                  transform transition-all duration-500
                  ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                `}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <GlowCard 
                  colorClass={`from-white/10 to-white/5`}
                  className="h-full min-h-[120px]"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                      <FeatureIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white/90">
                      {isRTL ? feature.label : feature.labelEn}
                    </span>
                    {feature.value && (
                      <span className="text-2xl font-bold text-white mt-2">
                        {feature.value}
                      </span>
                    )}
                  </div>
                </GlowCard>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// مكون العرض الرئيسي
export default function ProductTour() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // التبديل التلقائي
  useEffect(() => {
    if (isPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % tourSlides.length);
      }, 6000);
    }
    
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isPlaying]);

  // التنقل
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };
  
  const goNext = () => {
    setCurrentSlide(prev => (prev + 1) % tourSlides.length);
  };
  
  const goPrev = () => {
    setCurrentSlide(prev => (prev - 1 + tourSlides.length) % tourSlides.length);
  };

  // ملء الشاشة
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // التحكم بلوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (isRTL) goPrev();
        else goNext();
      }
      if (e.key === 'ArrowLeft') {
        if (isRTL) goNext();
        else goPrev();
      }
      if (e.key === ' ') setIsPlaying(prev => !prev);
      if (e.key === 'Escape' && isFullscreen) toggleFullscreen();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRTL, isFullscreen]);

  const currentSlideData = tourSlides[currentSlide];

  return (
    <div 
      ref={containerRef}
      className={`
        relative w-full overflow-hidden
        ${isFullscreen ? 'h-screen' : 'h-[500px] md:h-[600px]'}
        rounded-2xl shadow-2xl
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* شريط العنوان */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">
            {isRTL ? 'المنظومة الوطنية للعمل' : 'National Labor Platform'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* مؤشر الشريحة */}
          <span className="text-white/80 text-sm">
            {currentSlide + 1} / {tourSlides.length}
          </span>
          
          {/* زر ملء الشاشة */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label={isRTL ? 'ملء الشاشة' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <EyeOff className="w-4 h-4 text-white" />
            ) : (
              <Eye className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* الشرائح */}
      <div className="relative h-full">
        {tourSlides.map((slide, index) => (
          <TourSlide
            key={slide.id}
            slide={slide}
            index={index}
            current={currentSlide}
            isRTL={isRTL}
          />
        ))}
      </div>

      {/* شريط التقدم */}
      <div className="absolute bottom-16 left-0 right-0 z-20">
        <ProgressBar 
          current={currentSlide} 
          total={tourSlides.length} 
          onSelect={goToSlide}
        />
      </div>

      {/* ازرار التنقل */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
        {/* السابق */}
        <button
          onClick={goPrev}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
          aria-label={isRTL ? 'السابق' : 'Previous'}
        >
          {isRTL ? (
            <ChevronRight className="w-5 h-5 text-white" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-white" />
          )}
        </button>
        
        {/* التشغيل/الايقاف */}
        <button
          onClick={() => setIsPlaying(prev => !prev)}
          className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
          aria-label={isPlaying ? (isRTL ? 'ايقاف' : 'Pause') : (isRTL ? 'تشغيل' : 'Play')}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white mr-0.5" />
          )}
        </button>
        
        {/* التالي */}
        <button
          onClick={goNext}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
          aria-label={isRTL ? 'التالي' : 'Next'}
        >
          {isRTL ? (
            <ChevronLeft className="w-5 h-5 text-white" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
