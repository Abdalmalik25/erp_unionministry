/**
 * SplashScreen - شاشة البداية الاحترافية
 * تظهر قبل شاشة الدخول لتوفير تجربة مستخدم مميزة
 */

import { useEffect, useState } from 'react';
import { ShieldCheck, Building2, Users, Zap, Database, Lock, FileCheck } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

// خطوات التحميل لعرض التقدم
const loadingSteps = [
  { icon: ShieldCheck, text: 'يتم تهيئة الأمان', color: 'text-blue-600' },
  { icon: Database, text: 'جاري تحميل البيانات', color: 'text-indigo-600' },
  { icon: FileCheck, text: 'فحص النظام', color: 'text-purple-600' },
  { icon: Lock, text: 'إنشاء جلسة آمنة', color: 'text-emerald-600' },
  { icon: Zap, text: 'جاهز للبدء', color: 'text-amber-600' },
];

export function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev: number) => {
        const newProgress = prev + 1;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return newProgress;
      });
    }, duration / 100);

    // تغيير الخطوة كل 600ms
    const stepsInterval = setInterval(() => {
      setCurrentStep((prev: number) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepsInterval);
    };
  }, [duration, onComplete]);

  const CurrentIcon = loadingSteps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0f2460] via-[#1E3A8A] to-[#1d4ed8] overflow-hidden">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="absolute top-20 right-20 w-96 h-96 border-2 border-white rounded-full animate-pulse" />
        <div className="absolute top-40 right-40 w-64 h-64 border border-white rounded-full" />
        <div className="absolute bottom-32 left-16 w-[28rem] h-[28rem] border border-white rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 border-2 border-white rounded-full animate-pulse" />
      </div>

      {/* نمط زخرفي إضافي */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* محتوى الشاشة */}
      <div className="relative z-10 text-center px-6 max-w-md w-full">
        {/* الشعار الرئيسي */}
        <div className="mb-12 relative">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl">
            <ShieldCheck className="w-14 h-14 text-white" strokeWidth={1.5} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">UnionSphere</h1>
            <p className="text-blue-200 text-sm font-medium">منصة وزارة الشؤون الاجتماعية والعمل</p>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs text-blue-200 font-medium">التحميل جارٍ...</span>
            <span className="text-xs text-blue-200 font-bold">{progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-300 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* الخطوة الحالية */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 ${loadingSteps[currentStep].color}`}>
            <CurrentIcon className="w-5 h-5" />
          </div>
          <span className="text-blue-100 font-medium text-sm">
            {loadingSteps[currentStep].text}
          </span>
        </div>

        {/* نقط التقدم */}
        <div className="flex justify-center gap-2 mb-8">
          {loadingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'bg-white w-8' 
                  : index < currentStep 
                    ? 'bg-blue-300' 
                    : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
          <div className="text-center">
            <Building2 className="w-5 h-5 text-blue-300 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">78+</p>
            <p className="text-[10px] text-blue-300">كياناً مسجّلاً</p>
          </div>
          <div className="text-center">
            <Users className="w-5 h-5 text-indigo-300 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">15K+</p>
            <p className="text-[10px] text-blue-300">عضو نشط</p>
          </div>
          <div className="text-center">
            <Lock className="w-5 h-5 text-emerald-300 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">256بت</p>
            <p className="text-[10px] text-blue-300">تشفير AES</p>
          </div>
        </div>

        {/* النص في الأسفل */}
        <div className="mt-8">
          <p className="text-blue-300 text-[11px] leading-relaxed">
            جميع البيانات محمية ومشفّرة.<br />
            هذا النظام للاستخدام الرسمي المصرّح به فقط.
          </p>
        </div>
      </div>

      {/* مؤشر الاتصال في الأسفل */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-blue-300 text-xs">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span>متصل بأمان</span>
      </div>
    </div>
  );
}

/**
 * ProfessionalLoader - مكوّن تحميل احترافي للاستخدام في أماكن أخرى
 */
export function ProfessionalLoader({ 
  message = 'جاري التحميل...',
  size = 'md' 
}: { 
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: { container: 'w-12 h-12', icon: 'w-6 h-6' },
    md: { container: 'w-16 h-16', icon: 'w-8 h-8' },
    lg: { container: 'w-20 h-20', icon: 'w-10 h-10' },
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className={`absolute inset-0 border-2 border-blue-200 rounded-full animate-ping ${sizeClasses[size].container}`} />
        <div className={`border-2 border-t-blue-600 border-r-blue-400 border-b-blue-500 border-l-blue-300 rounded-full animate-spin ${sizeClasses[size].container}`}>
          <ShieldCheck className={`text-blue-600 ${sizeClasses[size].icon}`} />
        </div>
      </div>
      <p className="text-gray-600 font-medium text-sm">{message}</p>
    </div>
  );
}