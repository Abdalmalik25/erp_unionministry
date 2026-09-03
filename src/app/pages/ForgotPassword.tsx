import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [fieldError, setFieldError] = useState('');

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setFieldError('أدخل بريداً صحيحاً مثل name@yemen.gov.ye'); return; }
    if (loading || resendIn > 0) return;
    setLoading(true);
    setError(''); setFieldError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setStep('success');
        setResendIn(60);
      } else {
        setError(data?.error?.message || data?.message || 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور');
      }
    } catch {
      setError('حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-amber-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600 font-semibold transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          العودة إلى تسجيل الدخول
        </button>

        <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-black/10 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {step === 'form' ? 'نسيت كلمة المرور' : 'تم الإرسال'}
            </h2>
            <p className="text-slate-600">
              {step === 'form'
                ? 'أدخل بريدك الإلكتروني الرسمي لتلقي رابط إعادة تعيين كلمة المرور'
                : 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'}
            </p>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {error ? `خطأ: ${error}` : 'نموذج استعادة كلمة المرور'}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="forgot-email">
                  البريد الإلكتروني الرسمي
                </label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fieldError) setFieldError(''); }}
                    placeholder="name@yemen.gov.ye"
                    required
                    aria-describedby="forgot-email-desc"
                    aria-invalid={!!fieldError}
                    className={`w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/90 border-2 focus:outline-none transition-colors placeholder:text-slate-400 ${fieldError ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-amber-400'}`}
                  />
                </div>
                {fieldError ? <p className="text-xs text-red-600 mt-1" role="alert">{fieldError}</p> : <p id="forgot-email-desc" className="text-xs text-slate-500 mt-1">سيتم إرسال رابط صالح 30 دقيقة — تحقق أيضاً من البريد المزعج</p>}
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3" role="alert" aria-live="assertive">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || resendIn > 0}
                aria-busy={loading}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : resendIn > 0 ? (
                  <>إعادة الإرسال بعد {resendIn}ث</>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    إرسال رابط إعادة التعيين
                  </>
                )}
              </button>
              <p className="text-xs text-center text-slate-500">خيار بديل: تواصل مع مسؤول النظام — التحقق يدوي خلال ساعات العمل</p>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-emerald-600 font-semibold mb-4">تم إرسال التعليمات إلى بريدك الإلكتروني</p>
              <p className="text-sm text-slate-500 mb-6">
                تحقق من صندوق الواردات وبريد عدم المرغوب فيه
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
              >
                العودة إلى تسجيل الدخول
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-400">أو</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="text-center">
            <p className="text-slate-600 mb-3">لا تملك حساباً؟</p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-700 font-semibold transition-all"
            >
              <Mail className="w-5 h-5" />
              إنشاء حساب جديد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}