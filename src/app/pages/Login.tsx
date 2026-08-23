/**
 * بوابة الدخول الرسمية الموحدة — وزارة الشؤون الاجتماعية والعمل
 * الجمهورية اليمنية | قطاع العمل
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2, LogIn, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/ui/BrandLogo';

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('ministry@yemen.gov.ye');
  const [password, setPassword] = useState('Sector@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [authSuccess, setAuthSuccess] = useState(false);

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
      const user = await signIn(username.trim(), password);
      setAuthSuccess(true);
      
      const isOrg = (user as any)?.userType === 'organization' || (user as any)?.userType === 'entity';
      navigate(isOrg ? '/organization' : '/ministry', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'بيانات الدخول غير صحيحة، يرجى التأكد وإعادة المحاولة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09111e] px-4 py-8 relative selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(30,58,138,0.25),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Sovereign Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center shadow-2xl mb-1">
            <BrandLogo size={80} rounded="2xl" priority="high" className="border border-slate-700/80" />
          </div>

          <div className="space-y-1">
            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold">
              الجمهورية اليمنية
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              وزارة الشؤون الاجتماعية والعمل
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              قطاع العمل — المنظومة الإلكترونية الموحدة
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f1c31]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/40">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs sm:text-sm text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {authSuccess && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs sm:text-sm text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p>تم التحقق بنجاح — جاري نقلك للمنظومة...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="ministry@yemen.gov.ye"
                  dir="ltr"
                  disabled={loading || authSuccess}
                  autoComplete="username"
                  className="w-full pr-10 pl-3.5 py-3 bg-[#080d18] border border-slate-700/70 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  dir="ltr"
                  disabled={loading || authSuccess}
                  autoComplete="current-password"
                  className="w-full pr-10 pl-10 py-3 bg-[#080d18] border border-slate-700/70 rounded-xl text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#080d18] border-slate-700 text-blue-600 accent-blue-600 focus:ring-0"
                />
                <span className="text-xs text-slate-400 font-medium">تذكر بيانات الدخول</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || authSuccess}
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
        </div>

        {/* Official Footer Note */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <p>بوابة رسمية معتمدة — الجمهورية اليمنية</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
