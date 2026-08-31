/**
 * Login.tsx — شاشة الدخول المطورة للمنظومة الوطنية للعمل
 * Premium Modern Login with Glass Morphism & Advanced Security UX
 * World-Class Security Design with Micro-interactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  User, Lock, Eye, EyeOff, AlertCircle, Loader2, LogIn, CheckCircle2,
  Landmark, Building2, Users, HardHat, ShieldCheck, Scale, ArrowRight,
  Sparkles, Fingerprint, Smartphone, KeyRound, Shield, Zap, Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AUDIENCES, getAudience, getLandingPath } from '../utils/portals';
import type { Audience } from '../utils/portals';
import { BRAND } from '../branding';
import { BrandLogo } from '../components/ui/BrandLogo';

// ===== Types =====
interface OfficialIdentity {
  ministryNameAr: string;
  countryAr: string;
  systemNameAr: string;
  systemNameEn: string;
  legalBasis: string;
}

const IDENTITY_FALLBACK: OfficialIdentity = {
  ministryNameAr: BRAND.ministry,
  countryAr: BRAND.country,
  systemNameAr: BRAND.systemName,
  systemNameEn: BRAND.nameEn,
  legalBasis: 'قانون العمل رقم 40 لسنة 2025 ولائحته التنفيذية',
};

// ===== Premium Components =====
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`
      relative overflow-hidden rounded-3xl
      bg-white/80 backdrop-blur-xl
      border border-white/50
      shadow-2xl shadow-black/10
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function PremiumInput({ 
  icon: Icon, 
  label, 
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  disabled,
  showPasswordToggle,
  onTogglePassword,
  showPassword,
  autoComplete,
  description
}: {
  icon: any;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
  autoComplete?: string;
  description?: string;
}) {
  const inputId = `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400">
          <Icon className="w-5 h-5" />
        </div>
        <input
          id={inputId}
          type={showPasswordToggle ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-describedby={description ? `${inputId}-desc` : undefined}
          className={`
            w-full pr-12 pl-4 py-3.5 rounded-xl
            bg-white/90 backdrop-blur-sm
            border-2 transition-all duration-200
            placeholder:text-slate-400
            focus:outline-none focus:ring-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-slate-200 focus:border-amber-400 hover:border-slate-300'
            }
          `}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {description && (
        <p id={`${inputId}-desc`} className="text-xs text-slate-500 sr-only">
          {description}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1" role="alert">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}

function AudienceSelector({ 
  selected, 
  onSelect 
}: { 
  selected: Audience; 
  onSelect: (audience: Audience) => void;
}) {
  const audiences = [
    { id: 'ministry' as Audience, icon: Landmark, label: 'وزارة العمل', subLabel: 'Ministry Portal' },
    { id: 'employer' as Audience, icon: Building2, label: 'صاحب عمل', subLabel: 'Employer Portal' },
    { id: 'union' as Audience, icon: Users, label: 'نقابة', subLabel: 'Union Portal' },
    { id: 'worker' as Audience, icon: HardHat, label: 'عامل', subLabel: 'Worker Portal' },
  ];
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        اختر نوع الحساب
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {audiences.map((aud) => (
          <button
            key={aud.id}
            type="button"
            onClick={() => onSelect(aud.id)}
            className={`
              relative p-4 rounded-xl transition-all duration-200
              border-2
              ${selected === aud.id 
                ? 'bg-amber-50 border-amber-400 shadow-lg shadow-amber-500/20' 
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            <div className={`
              w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center
              ${selected === aud.id 
                ? 'bg-gradient-to-br from-amber-400 to-amber-600' 
                : 'bg-slate-100'
              }
            `}>
              <aud.icon className={`w-5 h-5 ${selected === aud.id ? 'text-white' : 'text-slate-600'}`} />
            </div>
            <div className={`text-sm font-bold ${selected === aud.id ? 'text-amber-800' : 'text-slate-700'}`}>
              {aud.label}
            </div>
            <div className="text-xs text-slate-500">{aud.subLabel}</div>
            {selected === aud.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SecurityBadge() {
  return (
    <div className="flex items-center justify-center gap-6 py-4 px-6 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Shield className="w-4 h-4 text-emerald-500" />
        <span>تشفير 256-bit</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Fingerprint className="w-4 h-4 text-blue-500" />
        <span>مصادقة ثنائية</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Lock className="w-4 h-4 text-amber-500" />
        <span>حماية متقدمة</span>
      </div>
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-amber-400/20 rounded-full animate-pulse"
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

// ===== Main Component =====
export function Login() {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();

  const [identity, setIdentity] = useState<OfficialIdentity>(IDENTITY_FALLBACK);
  const [audience, setAudience] = useState<Audience>('ministry');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchIdentity().then(setIdentity);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate(getLandingPath(user), { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const userType = audience === 'employer' ? 'organization' : audience === 'union' ? 'organization' : 'ministry';
      const userData = await signIn(username, password, userType);

      setAuthSuccess(true);

      setTimeout(() => {
        navigate(getLandingPath(userData), { replace: true });
      }, 1000);
      
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-amber-50 flex items-center justify-center p-4">
      <FloatingParticles />
      
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex flex-col justify-center">
          <GlassCard className="p-10 h-full">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">
                {identity.systemNameAr}
              </h1>
              <p className="text-slate-600">{identity.ministryNameAr}</p>
              <p className="text-sm text-amber-600 font-semibold mt-1">{identity.countryAr}</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">آمن وموثوق</div>
                  <div className="text-sm text-slate-500">بياناتك محمية بأعلى معايير الأمان</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">سريع ومتكامل</div>
                  <div className="text-sm text-slate-500">إتمام المعاملات في دقائق معدودة</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">متاح للجميع</div>
                  <div className="text-sm text-slate-500">خدمة جميع المناطق والمحافظات</div>
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-slate-500">
              <p>{identity.legalBasis}</p>
            </div>
          </GlassCard>
        </div>
        
        {/* Right Panel - Login Form */}
        <div className="flex flex-col justify-center">
          <GlassCard className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                {authSuccess ? 'مرحباً بك!' : 'تسجيل الدخول'}
              </h2>
              <p className="text-slate-600">
                {authSuccess 
                  ? 'جاري توجيهك إلى لوحة التحكم...' 
                  : 'أدخل بيانات الدخول للوصول إلى حسابك'
                }
              </p>
            </div>
            
            {/* Success State */}
            {authSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <p className="text-emerald-600 font-semibold">تم تسجيل الدخول بنجاح</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div aria-live="polite" aria-atomic="true" className="sr-only">
                  {authSuccess ? 'تم تسجيل الدخول بنجاح، جاري التوجيه إلى لوحة التحكم' : 'نموذج تسجيل الدخول'}
                </div>
                {/* Audience Selector */}
                <AudienceSelector 
                  selected={audience} 
                  onSelect={setAudience} 
                />
                
                 {/* Username */}
                <PremiumInput
                  icon={User}
                  label="اسم المستخدم"
                  value={username}
                  onChange={setUsername}
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                  disabled={loading}
                  description="أدخل البريد الإلكتروني الرسمي أو اسم المستخدم"
                />
                
                {/* Password */}
                <PremiumInput
                  icon={Lock}
                  label="كلمة المرور"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="أدخل كلمة المرور"
                  showPasswordToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  autoComplete="current-password"
                  disabled={loading}
                  description="أدخل كلمة المرور الخاصة بحسابك"
                />
                
                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-600">تذكرني</span>
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                
                {/* Error Message */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3" role="alert" aria-live="assertive">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full py-4 rounded-xl font-bold text-lg
                    flex items-center justify-center gap-3
                    transition-all duration-200
                    ${loading 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:-translate-y-0.5'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري التحقق...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      تسجيل الدخول
                    </>
                  )}
                </button>
              </form>
            )}
            
            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-sm text-slate-400">أو</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            
            {/* Register Link */}
            <div className="text-center">
              <p className="text-slate-600 mb-3">لا تملك حساباً؟</p>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-700 font-semibold transition-all"
              >
                <User className="w-5 h-5" />
                إنشاء حساب جديد
              </Link>
            </div>
            
            {/* Security Badges */}
            <div className="mt-8">
              <SecurityBadge />
            </div>
          </GlassCard>
          
          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 font-semibold transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Functions
async function fetchIdentity(): Promise<OfficialIdentity> {
  try {
    const r = await fetch('/api/system/branding');
    if (!r.ok) return IDENTITY_FALLBACK;
    const j = await r.json();
    const d = j.data || {};
    return {
      ministryNameAr: d.ministryNameAr || IDENTITY_FALLBACK.ministryNameAr,
      countryAr: d.countryAr || IDENTITY_FALLBACK.countryAr,
      systemNameAr: d.systemNameAr || IDENTITY_FALLBACK.systemNameAr,
      systemNameEn: d.systemNameEn || IDENTITY_FALLBACK.systemNameEn,
      legalBasis: d.legalBasis || IDENTITY_FALLBACK.legalBasis,
    };
  } catch {
    return IDENTITY_FALLBACK;
  }
}
