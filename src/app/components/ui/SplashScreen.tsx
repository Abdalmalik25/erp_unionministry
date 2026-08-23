/**
 * SplashScreen - شاشة البداية الاحترافية
 * تظهر قبل شاشة الدخول لتوفير تجربة مستخدم مميزة
 */

import { useEffect } from 'react';
import { BRAND } from '../../branding';
import { BrandLogo } from './BrandLogo';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 1200 }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white select-none" dir="rtl">
      {/* Subtle Glow Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center p-8 max-w-sm w-full text-center">
        {/* Official Emblem Container with Animated Circular Ring */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer Smooth Spinner Ring */}
          <div className="w-28 h-28 rounded-full border-2 border-white/10 border-t-amber-400 border-r-blue-500 animate-spin" />
          
          {/* Inner Glowing Badge */}
          <div className="absolute w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-md p-2 flex items-center justify-center border border-white/15 shadow-2xl shadow-blue-500/20">
            <BrandLogo size={72} rounded="2xl" priority="high" />
          </div>
        </div>

        {/* System Title */}
        <h1 className="text-xl font-bold text-white tracking-wide mb-1">
          {BRAND.systemName}
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          {BRAND.ministry}
        </p>

        {/* Minimal Circular Progress Status */}
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>جاري تهيئة بيئة العمل...</span>
        </div>
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
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6" dir="rtl">
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="w-full h-full rounded-full border-2 border-primary/20 border-t-primary border-r-amber-400 animate-spin" />
      </div>
      {message && <p className="text-muted-foreground font-medium text-xs">{message}</p>}
    </div>
  );
}