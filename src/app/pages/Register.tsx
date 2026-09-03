import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { User, Mail, Lock, Building2, ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { AUDIENCES, Audience } from '../utils/portals';



export function Register() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState<Audience>('ministry');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    nationalId: '',
    organizationName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          audience,
          userType: audience === 'employer' ? 'organization' : 'ministry' }) });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data?.error?.message || data?.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return formData.name && formData.email && formData.password && formData.confirmPassword;
    if (step === 2) return formData.nationalId && formData.organizationName;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-amber-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 font-semibold transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          العودة إلى تسجيل الدخول
        </button>

        <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-black/10 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-400 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">إنشاء حساب جديد</h2>
            <p className="text-slate-600">
              {step === 1 ? 'أدخل بياناتك الأساسية' : 'أكمل بيانات حسابك'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s <= step ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-12 h-1 rounded ${s < step ? 'bg-amber-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-emerald-600 font-semibold mb-2">تم إنشاء حسابك بنجاح!</p>
              <p className="text-sm text-slate-500 mb-6">يتم تفعيل حسابك خلال 24 ساعة</p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
              >
                العودة إلى تسجيل الدخول
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
               {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3" role="alert" aria-live="assertive">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-name">الاسم الكامل</label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="reg-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="أدخل اسمك الكامل"
                        required
                        aria-describedby="reg-name-desc"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/90 border-2 border-slate-200 focus:border-amber-400 focus:outline-none transition-colors placeholder:text-slate-400"
                      />
                    </div>
                    <p id="reg-name-desc" className="text-xs text-slate-500 mt-1">الاسم الكامل كما يظهر في الهوية الوطنية</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-email">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="reg-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@yemen.gov.ye"
                        required
                        aria-describedby="reg-email-desc"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/90 border-2 border-slate-200 focus:border-amber-400 focus:outline-none transition-colors placeholder:text-slate-400"
                      />
                    </div>
                    <p id="reg-email-desc" className="text-xs text-slate-500 mt-1">البريد الرسمي المرتبط بالمنشأة أو النقابة</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-password">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="reg-password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        aria-describedby="reg-password-desc"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/90 border-2 border-slate-200 focus:border-amber-400 focus:outline-none transition-colors placeholder:text-slate-400"
                      />
                    </div>
                    <p id="reg-password-desc" className="text-xs text-slate-500 mt-1">8 أحرف على الأقل مع رقم ورمز خاص</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-confirm">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="reg-confirm"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        required
                        aria-describedby="reg-confirm-desc"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/90 border-2 border-slate-200 focus:border-amber-400 focus:outline-none transition-colors placeholder:text-slate-400"
                      />
                    </div>
                    <p id="reg-confirm-desc" className="text-xs text-slate-500 mt-1">أعد إدخال كلمة المرور للتأكيد</p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-id">رقم الهوية الوطنية</label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="reg-id"
                        type="text"
                        value={formData.nationalId}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                        placeholder="••••••••••"
                        required
                        aria-describedby="reg-id-desc"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/90 border-2 border-slate-200 focus:border-amber-400 focus:outline-none transition-colors placeholder:text-slate-400"
                      />
                    </div>
                    <p id="reg-id-desc" className="text-xs text-slate-500 mt-1">رقم الهوية الوطنية من 9 إلى 12 رقمًا</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-org">اسم المنشأة / النقابة</label>
                    <div className="relative">
                      <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        id="reg-org"
                        type="text"
                        value={formData.organizationName}
                        onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                        placeholder="أدخل اسم المنشأة أو النقابة"
                        required
                        aria-describedby="reg-org-desc"
                        className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/90 border-2 border-slate-200 focus:border-amber-400 focus:outline-none transition-colors placeholder:text-slate-400"
                      />
                    </div>
                    <p id="reg-org-desc" className="text-xs text-slate-500 mt-1">الاسم الرسمي المسجل لدى الوزارة</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">نوع الحساب</label>
                    <div className="grid grid-cols-2 gap-3">
                      {AUDIENCES.map((aud) => (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => setAudience(aud.id)}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${audience === aud.id ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                        >
                          <p className={`text-sm font-bold ${audience === aud.id ? 'text-amber-800' : 'text-slate-700'}`}>
                            {aud.label}
                          </p>
                          <p className="text-xs text-slate-500">{aud.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading || !isStepValid()}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {step === 1 ? 'الخطوة التالية' : 'إنشاء الحساب'}
                  </>
                )}
              </button>
            </form>
          )}

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-400">أو</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="text-center">
            <p className="text-slate-600 mb-3">لديك حساب بالفعل؟</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-700 font-semibold transition-all"
            >
              <User className="w-5 h-5" />
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}