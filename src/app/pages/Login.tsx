/**
 * Login.tsx — شاشة الدخول المطورة للمنظومة الوطنية للعمل
 * Premium Modern Login with Glass Morphism & Advanced Security UX
 * World-Class Security Design with Micro-interactions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import {
  User, Lock, Eye, EyeOff, AlertCircle, Loader2, LogIn, CheckCircle2,
  Landmark, Building2, Users, HardHat, ShieldCheck, ArrowRight,
  Fingerprint, Smartphone, Shield, Zap, Globe, Timer, Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLandingPath } from '../utils/portals';
import type { Audience } from '../utils/portals';
import { BRAND } from '../branding';
import { checkRateLimit } from '../utils/security';
import { isFeatureEnabled } from '../utils/featureFlags';

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

type IconType = React.ComponentType<{ className?: string }>;
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
  icon: IconType;
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
  const particles = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${3 + Math.random() * 4}s`,
  })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2 h-2 bg-amber-400/20 rounded-full animate-pulse"
          style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }}
        />
      ))}
    </div>
  );
}

// ===== Main Component =====
export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading: authLoading } = useAuth();

  const [identity, setIdentity] = useState<OfficialIdentity>(IDENTITY_FALLBACK);
  const [audience, setAudience] = useState<Audience>('ministry');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem('unionsphere_remember') !== 'false'; } catch { return true; }
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const biometricEnabled = isFeatureEnabled('biometric_verification');

  useEffect(() => {
    fetchIdentity().then(setIdentity);
    // preserve returnTo from ProtectedRoute redirect
    const params = new URLSearchParams(location.search);
    const ret = params.get('returnTo');
    if (ret) sessionStorage.setItem('returnTo', ret);
  }, [location.search]);

  // Redirect if already logged in — يحترم مسار العودة الأصلي
  useEffect(() => {
    if (user && !authLoading) {
      const ret = sessionStorage.getItem('returnTo');
      if (ret) { sessionStorage.removeItem('returnTo'); navigate(ret, { replace: true }); return; }
      navigate(getLandingPath(user), { replace: true });
    }
  }, [user, authLoading, navigate]);

  // مراقبة حالة القفل الأمني (rate limit) — عدّاد تنازلي
  useEffect(() => {
    if (!lockoutUntil) return;
    if (Date.now() >= lockoutUntil) { setLockoutUntil(null); return; }
    const t = setInterval(() => {
      if (Date.now() >= lockoutUntil!) { setLockoutUntil(null); clearInterval(t); }
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutUntil]);

  const validateForm = (): boolean => {
    const errs: typeof fieldErrors = {};
    const u = username.trim();
    if (!u) errs.username = 'اسم المستخدم مطلوب';
    else if (u.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) errs.username = 'صيغة البريد غير صحيحة';
    else if (!u.includes('@') && u.length < 3) errs.username = 'اسم المستخدم قصير جداً';
    if (!password) errs.password = 'كلمة المرور مطلوبة';
    else if (password.length < 6) errs.password = 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // منع الإرسال المزدوج

    if (!validateForm()) {
      setErrorMessage('يرجى تصحيح الحقول المشار إليها');
      return;
    }

    // فحص القفل الأمني قبل الاتصال بالخادم
    const rlKey = `login_${username.trim().toLowerCase()}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      const secs = Math.ceil(rl.resetIn / 1000);
      setLockoutUntil(Date.now() + rl.resetIn);
      setErrorMessage(`تم تعليق المحاولات مؤقتاً لأسباب أمنية — حاول بعد ${secs} ثانية`);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setFieldErrors({});

    try {
      // تذكر اختيار “تذكرني” للجلسات القادمة (قرار العميل فقط — لا يؤثر على أمان JWT)
      try { localStorage.setItem('unionsphere_remember', String(rememberMe)); } catch { /* storage unavailable */ }
      const userType = audience === 'ministry' ? 'ministry' : 'organization';
      const userData = await signIn(username, password, userType);
      setAuthSuccess(true);
      const ret = sessionStorage.getItem('returnTo');
      setTimeout(() => {
        if (ret) { sessionStorage.removeItem('returnTo'); navigate(ret, { replace: true }); }
        else navigate(getLandingPath(userData as { role?: string; userType?: string }), { replace: true });
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول';
      setErrorMessage(msg);
      // تحديث عدّاد القفل بعد الفشل
      const after = checkRateLimit(`login_${username.trim().toLowerCase()}`);
      if (!after.allowed) setLockoutUntil(Date.now() + after.resetIn);
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
                  label={audience === 'worker' ? 'رقم الهوية / البريد' : audience === 'ministry' ? 'البريد الرسمي' : 'البريد المسجل'}
                  value={username}
                  onChange={v => { setUsername(v); if (fieldErrors.username) setFieldErrors(s => ({ ...s, username: undefined })); }}
                  placeholder={audience === 'worker' ? 'مثال: 123456789 أو worker@labor.ye' : audience === 'ministry' ? 'name@yemen.gov.ye' : 'example@business.ye'}
                  autoComplete="username"
                  disabled={loading || !!lockoutUntil}
                  error={fieldErrors.username}
                  description={audience === 'worker' ? 'أدخل رقم هويتك أو بريدك المسجل' : 'أدخل البريد الرسمي المرتبط بمنشأتك'}
                />
                {audience !== 'ministry' && !fieldErrors.username && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 -mt-3"><Info className="w-3.5 h-3.5" /> تلميح: {audience === 'worker' ? 'يمكن للعامل الدخول برقم الهوية الوطنية' : audience === 'employer' ? 'بريد المنشأة المسجل لدى الوزارة' : 'بريد النقابة المسجل'}</p>
                )}

                {/* Password */}
                <PremiumInput
                  icon={Lock}
                  label="كلمة المرور"
                  type="password"
                  value={password}
                  onChange={v => { setPassword(v); if (fieldErrors.password) setFieldErrors(s => ({ ...s, password: undefined })); }}
                  placeholder="أدخل كلمة المرور"
                  showPasswordToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  autoComplete="current-password"
                  disabled={loading || !!lockoutUntil}
                  error={fieldErrors.password}
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
                
                {/* قفل أمني — عدّاد تنازلي */}
                {lockoutUntil && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3" role="status" aria-live="polite">
                    <Timer className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" />
                    <p className="text-sm text-amber-800">محاولات كثيرة — متاح مجدداً بعد {Math.ceil((lockoutUntil - Date.now())/1000)} ثانية</p>
                  </div>
                )}
                {/* Error Message */}
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3" role="alert" aria-live="assertive">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1"><p className="text-sm text-red-700">{errorMessage}</p><p className="text-xs text-red-600/80 mt-1">إذا نسيت كلمة المرور استخدم “نسيت كلمة المرور؟” — لا تحاول تخمين كلمات متكررة</p></div>
                  </div>
                )}
                
                {/* Submit Button — يمنع الإرسال المزدوج + يحترم القفل الأمني */}
                <button
                  type="submit"
                  disabled={loading || !!lockoutUntil}
                  aria-busy={loading}
                  className={`
                    w-full py-4 rounded-xl font-bold text-lg
                    flex items-center justify-center gap-3
                    transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2
                    ${loading || lockoutUntil
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:-translate-y-0.5'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري التحقق...
                    </>
                  ) : lockoutUntil ? (
                    <>
                      <Timer className="w-5 h-5" />
                      محظور مؤقتاً
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      تسجيل الدخول الآمن
                    </>
                  )}
                </button>

                {/* خيارات دخول بديلة — موثوقة وسريعة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link to="/forgot-password" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-sm font-semibold text-slate-700 hover:text-amber-700 transition-colors">
                    <Smartphone className="w-4 h-4" /> دخول بديل: استعادة عبر البريد
                  </Link>
                  {biometricEnabled ? (
                    <button type="button" onClick={() => setErrorMessage('التحقق البيومتري متاح لأجهزة الدعم — فعّلها من إعدادات جهازك ثم أعد المحاولة')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-sm font-semibold text-slate-700 hover:text-emerald-700 transition-colors">
                      <Fingerprint className="w-4 h-4" /> التحقق البيومتري
                    </button>
                  ) : (
                    <Link to="/register" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-sm font-semibold text-slate-700 hover:text-blue-700 transition-colors">
                      <User className="w-4 h-4" /> إنشاء حساب جديد
                    </Link>
                  )}
                </div>
                <p className="text-xs text-center text-slate-500">بدائل الدخول نفسها آمنة — كل المحاولات تُسجَّل وتُفحص (Audit + RateLimit)</p>
              </form>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-sm text-slate-400">أو</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Register Link — خيار بديل واضح */}
            <div className="text-center">
              <p className="text-slate-600 mb-3">لا تملك حساباً؟ اختر بوابتك وسجّل</p>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-700 font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <User className="w-5 h-5" />
                إنشاء حساب جديد — 4 بوابات
              </Link>
              <p className="text-xs text-slate-500 mt-2">وزارة / صاحب عمل / نقابة / عامل — كل بوابة لها مسارها بعد الدخول</p>
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
