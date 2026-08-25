/**
 * بوابة الدخول الرسمية الموحدة — وزارة الشؤون الاجتماعية والعمل
 * الجمهورية اليمنية | قطاع العمل
 * تصميم مؤسسي نهائي: لوحة هوية رسمية + نموذج دخول آمن، بدون أي بيانات تجريبية.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  User, Lock, Eye, EyeOff, AlertCircle, Loader2, LogIn, CheckCircle2,
  Landmark, Building2, Users, HardHat, Search, SearchX, MapPin, UserPlus,
  ShieldCheck, Scale, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AUDIENCES, getAudience, getLandingPath } from '../utils/portals';
import type { Audience } from '../utils/portals';
import { BRAND } from '../branding';
import { BrandLogo } from '../components/ui/BrandLogo';
import { EstablishmentRegistration } from '../components/employer/EmployerRegistration';

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
  legalBasis: 'قانون العمل رقم 40 لسنة 2025 ولائحه التنفيذية',
};

// جلب الهوية الرسمية من إعدادات النظام (مصدر واحد للحقيقة)
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

const AUDIENCE_ICONS: Record<Audience, React.ElementType> = {
  ministry: Landmark,
  employer: Building2,
  union: Users,
  worker: HardHat,
};

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

  useEffect(() => {
    fetchIdentity().then(setIdentity);
  }, []);

  // بحث السجل الرسمي عن منشأة صاحب العمل (بالاسم أو الرقم الوطني)
  const [estQuery, setEstQuery] = useState('');
  const [estResults, setEstResults] = useState<any[]>([]);
  const [estSearching, setEstSearching] = useState(false);
  const [estPicked, setEstPicked] = useState<any | null>(null);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regDone, setRegDone] = useState('');

  useEffect(() => {
    if (audience !== 'employer') return;
    const q = estQuery.trim();
    if (q.length < 2) { setEstResults([]); return; }
    setEstSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/establishments/lookup?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setEstResults(j.data?.data || []);
      } catch { setEstResults([]); }
      finally { setEstSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [estQuery, audience]);

  const pickEstablishment = (est: any) => {
    setEstPicked(est);
    sessionStorage.setItem('linked_establishment', JSON.stringify(est));
  };

  // طلب فتح حساب — للنقابات والعاملين وموظفي الوزارة
  const REQUEST_TYPE_BY_AUDIENCE: Record<string, string> = {
    union: 'union', worker: 'worker', ministry: 'ministry_employee',
  };
  const [showAccReq, setShowAccReq] = useState(false);
  const [accReqDone, setAccReqDone] = useState('');
  const [accForm, setAccForm] = useState({ full_name: '', email: '', phone: '', national_id: '', entity_name: '' });
  const [accBusy, setAccBusy] = useState(false);

  const submitAccountRequest = async () => {
    if (!accForm.full_name.trim() || !accForm.email.trim()) {
      setErrorMessage('الاسم والبريد الإلكتروني مطلوبان لطلب الحساب');
      return;
    }
    setAccBusy(true); setErrorMessage('');
    try {
      const r = await fetch('/api/account-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: REQUEST_TYPE_BY_AUDIENCE[audience],
          ...accForm,
          governorate: estPicked?.governorate || undefined,
        }),
      });
      const j = await r.json();
      if (r.ok && j.success !== false) {
        setAccReqDone(j.data?.type_label || 'طلبك');
        setShowAccReq(false);
        setAccForm({ full_name: '', email: '', phone: '', national_id: '', entity_name: '' });
      } else {
        setErrorMessage(j.errors?.error || j.error || 'تعذر إرسال الطلب');
      }
    } catch { setErrorMessage('خطأ في الاتصال بالخادم'); }
    finally { setAccBusy(false); }
  };

  const audienceInfo = getAudience(audience);

  // جلسة قائمة؟ توجيه مباشر للبوابة الصحيحة بدلاً من إعادة الدخول
  useEffect(() => {
    if (!authLoading && user) {
      navigate(getLandingPath(user), { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم أو البريد الإلكتروني');
      return;
    }
    if (!password) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const signedUser = await signIn(username.trim(), password);
      setAuthSuccess(true);
      navigate(getLandingPath(signedUser as any), { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'بيانات الدخول غير صحيحة، يرجى التأكد وإعادة المحاولة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#070c16]" dir="rtl">
      {/* ===== لوحة الهوية المؤسسية (سطح المكتب) ===== */}
      <aside className="hidden lg:flex flex-col justify-between w-[44%] max-w-[620px] p-12 relative overflow-hidden border-l border-slate-800/60 bg-gradient-to-bl from-[#0b1526] via-[#09111e] to-[#070c16]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_100%_0%,rgba(30,58,138,0.28),rgba(255,255,255,0))] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_100%,rgba(180,140,30,0.07),rgba(255,255,255,0))] pointer-events-none" />

        <header className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <BrandLogo variant="emblem" size={72} rounded="2xl" priority="high" className="border border-slate-700/80 shadow-2xl" />
            <div>
              <p className="inline-block px-3 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-bold mb-1.5">
                {identity.countryAr}
              </p>
              <h1 className="text-2xl font-black text-white leading-snug">{identity.ministryNameAr}</h1>
            </div>
          </div>

          <div className="h-px bg-gradient-to-l from-transparent via-slate-700/70 to-transparent" />

          <p className="text-base text-slate-300 font-bold leading-relaxed">{identity.systemNameAr}</p>
          <p className="text-[11px] text-slate-600 tracking-wide" dir="ltr">{identity.systemNameEn} — {BRAND.abbrEn}</p>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md">{BRAND.tagline}</p>
        </header>

        <div className="relative z-10 space-y-4">
          {[
            { icon: Landmark, t: 'أصحاب العمل', d: 'تسجيل المنشآت، الفروع، الترخيص، وإدارة العمالة' },
            { icon: Users, t: 'النقابات والمنظمات', d: 'التسجيل النقابي، الانتخابات، الاجتماعات، والتقارير' },
            { icon: HardHat, t: 'العمال والموظفون', d: 'الملفات المهنية، الشهادات، الإصابات، والتأمين' },
            { icon: ShieldCheck, t: 'التفتيش والامتثال', d: 'المعاينات الميدانية، المخالفات، والإجراءات القانونية' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3.5">
              <span className="mt-0.5 w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                <Icon size={17} className="text-amber-400" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-200">{t}</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <footer className="relative z-10 pt-6 space-y-1.5">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Scale size={12} className="text-slate-600" /> السند القانوني: {identity.legalBasis}
          </p>
          <p className="text-[11px] text-slate-600">الدعم الفني: {BRAND.supportPhone} • {BRAND.supportEmail}</p>
          <p className="text-[11px] text-slate-600">أوقات العمل: السبت – الأربعاء، 8:00 ص – 2:00 م — والمنظومة تعمل على مدار الساعة</p>
        </footer>
      </aside>

      {/* ===== لوحة الدخول ===== */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative selection:bg-blue-600 selection:text-white">
        <div className="absolute inset-0 lg:hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(30,58,138,0.25),rgba(255,255,255,0))] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* رابط العودة إلى الموقع التعريفي العام */}
          <div className="flex justify-end mb-3">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-amber-300 transition-colors">
              <ArrowRight size={13} /> العودة إلى الموقع الرسمي
            </Link>
          </div>
          {/* ترويسة مضغوطة — الجوال فقط */}
          <div className="lg:hidden text-center mb-6 space-y-3">
            <div className="inline-flex items-center justify-center shadow-2xl mb-1">
              <BrandLogo variant="emblem" size={76} rounded="2xl" priority="high" className="border border-slate-700/80" />
            </div>
            <div className="space-y-1">
              <div className="inline-block px-3 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-bold">
                {identity.countryAr}
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">{identity.ministryNameAr}</h1>
              <p className="text-sm text-slate-400 font-medium">{identity.systemNameAr}</p>
            </div>
          </div>

          <div className="bg-[#0f1c31]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
            {/* رسالة الخطأ */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs sm:text-sm text-red-300 animate-in fade-in" role="alert">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* رسالة النجاح */}
            {authSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs sm:text-sm text-emerald-300 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p>تم التحقق بنجاح — جاري نقلك لبوابتك...</p>
              </div>
            )}

            {/* محدد نوع الحساب */}
            {!authSuccess && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-300 mb-2">حدد نوع حسابك</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {AUDIENCES.map((a) => {
                    const Icon = AUDIENCE_ICONS[a.id];
                    const isActive = audience === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={loading}
                        aria-pressed={isActive}
                        onClick={() => { setAudience(a.id); setErrorMessage(''); }}
                        title={a.label}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-200 shadow-inner'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-amber-400' : ''} />
                        <span className="leading-tight text-center">{a.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">{audienceInfo.hint}</p>
              </div>
            )}

            {/* بحث السجل الرسمي — لأصحاب العمل حصراً */}
            {!authSuccess && audience === 'employer' && (
              <div className="mb-5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                {estPicked ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> {estPicked.name_ar}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5" dir="ltr">
                        {estPicked.national_number} • {estPicked.governorate}
                      </p>
                    </div>
                    <button type="button" onClick={() => setEstPicked(null)}
                      className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer shrink-0">تغيير</button>
                  </div>
                ) : (
                  <>
                    <label htmlFor="est-lookup" className="block text-[11px] font-semibold text-slate-300 mb-2">
                      منشأتك في السجل الرسمي؟ ابحث بالاسم أو الرقم الوطني
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="est-lookup"
                        type="text"
                        value={estQuery}
                        onChange={(e) => setEstQuery(e.target.value)}
                        placeholder="اسم المنشأة أو رقمها الوطني"
                        dir="auto"
                        disabled={loading || authSuccess}
                        className="w-full pr-9 pl-3 py-2.5 bg-[#080d18] border border-slate-700/70 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      {estSearching && <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute left-3 top-1/2 -translate-y-1/2" />}
                    </div>

                    {estResults.length > 0 && (
                      <div className="mt-2 max-h-44 overflow-y-auto space-y-1.5" role="listbox" aria-label="نتائج البحث في سجل المنشآت">
                        {estResults.map(est => (
                          <button key={est.id} type="button" role="option" aria-selected={false}
                            onClick={() => pickEstablishment(est)}
                            className="w-full text-right p-2 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 border border-transparent hover:border-blue-500/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200 truncate">{est.name_ar}</span>
                              <span className="text-[10px] font-mono text-amber-400 shrink-0" dir="ltr">{est.national_number}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {est.governorate || '—'} • {est.status_label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {estQuery.trim().length >= 2 && !estSearching && estResults.length === 0 && (
                      <div className="mt-2 flex items-start justify-between gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-[11px] text-amber-300 flex items-center gap-1.5 leading-relaxed">
                          <SearchX className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          لم تُسجل منشأتك بعد في السجل الرسمي
                        </p>
                        <button type="button" onClick={() => setShowRegForm(true)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-[10px] font-black cursor-pointer whitespace-nowrap">
                          طلب تسجيل فوري
                        </button>
                      </div>
                    )}
                    {regDone && (
                      <p className="mt-2 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> تم حفظ طلبك — رقمك المرجعي {regDone} • يمكنك الدخول الآن ومتابعة الطلب من بوابتك
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="نموذج تسجيل الدخول الرسمي">
              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم المستخدم أو البريد الإلكتروني
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setErrorMessage(''); }}
                    placeholder={audienceInfo.placeholder}
                    dir="ltr"
                    disabled={loading || authSuccess}
                    autoComplete="username"
                    required
                    className="w-full pr-10 pl-3.5 py-3 bg-[#080d18] border border-slate-700/70 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                    placeholder="••••••••"
                    dir="ltr"
                    disabled={loading || authSuccess}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    className="w-full pr-10 pl-10 py-3 bg-[#080d18] border border-slate-700/70 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-pressed={showPassword}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#080d18] border-slate-700 text-blue-600 accent-blue-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-400 font-medium">إبقاء الجلسة مفتوحة</span>
                </label>
                <span className="lg:hidden text-[11px] text-slate-600">دعم: {BRAND.supportPhone}</span>
              </div>

              <button
                type="submit"
                disabled={loading || authSuccess}
                aria-busy={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </button>
            </form>

            {/* تلميح أمني — كلمة المرور الابتدائية */}
            {!authSuccess && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500 flex items-start justify-center gap-1.5">
                <ShieldCheck size={13} className="text-slate-600 shrink-0 mt-0.5" />
                إن كانت هذه كلمة مرور ابتدائية مُسلَّمة إليك إدارياً، فغيّرها فور الدخول من «الملف الشخصي ← تغيير كلمة المرور»
              </p>
            )}

            {/* طلب فتح حساب — نقابات / عمال / موظفو الوزارة */}
            {!authSuccess && REQUEST_TYPE_BY_AUDIENCE[audience] && !accReqDone && (
              <div className="mt-4">
                {!showAccReq ? (
                  <button type="button" onClick={() => setShowAccReq(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800/60 transition-colors cursor-pointer">
                    <UserPlus size={14} /> لا تملك حساباً؟ اطلب فتح حساب رسمي
                  </button>
                ) : (
                  <div className="mt-2 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5" aria-label="نموذج طلب فتح حساب">
                    <p className="text-[11px] font-bold text-slate-300">طلب {audienceInfo.label} — يُراجع من إدارة الحسابات بالوزارة</p>
                    <input value={accForm.full_name} onChange={e => setAccForm({ ...accForm, full_name: e.target.value })}
                      placeholder="الاسم الكامل *" dir="auto" autoComplete="name"
                      className="w-full px-3 py-2 bg-[#080d18] border border-slate-700/70 rounded-lg text-xs text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
                    <input value={accForm.email} onChange={e => setAccForm({ ...accForm, email: e.target.value })}
                      placeholder="البريد الإلكتروني *" type="email" dir="ltr" autoComplete="email" inputMode="email"
                      className="w-full px-3 py-2 bg-[#080d18] border border-slate-700/70 rounded-lg text-xs text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={accForm.phone} onChange={e => setAccForm({ ...accForm, phone: e.target.value })}
                        placeholder="الهاتف" dir="ltr" type="tel" inputMode="tel" autoComplete="tel-national"
                        className="px-3 py-2 bg-[#080d18] border border-slate-700/70 rounded-lg text-xs text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
                      <input value={accForm.national_id} onChange={e => setAccForm({ ...accForm, national_id: e.target.value })}
                        placeholder="الرقم القومي" dir="ltr" inputMode="numeric" pattern="\d{9,12}"
                        title="أرقام فقط (9–12 خانة)"
                        className="px-3 py-2 bg-[#080d18] border border-slate-700/70 rounded-lg text-xs text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
                    </div>
                    {audience === 'union' && (
                      <input value={accForm.entity_name} onChange={e => setAccForm({ ...accForm, entity_name: e.target.value })}
                        placeholder="اسم النقابة أو المنظمة" dir="auto"
                        className="w-full px-3 py-2 bg-[#080d18] border border-slate-700/70 rounded-lg text-xs text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
                    )}
                    <div className="flex gap-2 pt-0.5">
                      <button type="button" onClick={submitAccountRequest} disabled={accBusy}
                        className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-black cursor-pointer disabled:opacity-50">
                        {accBusy ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
                      </button>
                      <button type="button" onClick={() => setShowAccReq(false)}
                        className="px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 cursor-pointer">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {accReqDone && (
              <p className="mt-4 text-[11px] font-bold text-emerald-300 flex items-center justify-center gap-1.5 text-center">
                <CheckCircle2 size={13} /> تم استلام طلبك ({accReqDone}) — ستتواصل معك إدارة الحسابات بعد المراجعة
              </p>
            )}

            {/* تنبيه أمني مؤسسي */}
            <p className="mt-5 pt-4 border-t border-slate-800/70 text-[10px] text-slate-600 leading-relaxed text-center">
              <ShieldCheck size={11} className="inline ml-1 -translate-y-px" />
              هذا نظام معلومات حكومي محمي. جميع عمليات الدخول مسجلة ومراقبة، وأي محاولة وصول غير مصرح بها تخضع للمساءلة القانونية.
            </p>
          </div>

          <div className="text-center mt-5 text-xs text-slate-500">
            <p>{identity.countryAr} — بوابة رسمية معتمدة</p>
          </div>
        </div>
      </main>

      {/* نموذج طلب تسجيل منشأة في السجل الرسمي */}
      <EstablishmentRegistration
        open={showRegForm}
        onClose={() => setShowRegForm(false)}
        onSuccess={(r) => {
          setShowRegForm(false);
          setRegDone(r.national_number || r.reference || '');
          setEstQuery('');
        }}
      />
    </div>
  );
}

export default Login;
