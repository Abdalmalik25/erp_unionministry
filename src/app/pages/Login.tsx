/**
 * Auth — منظومة المصادقة الكاملة
 * دخول · تسجيل موظف وزارة · تسجيل منظمة نقابية
 * استرجاع كلمة المرور · تحقق OTP · إعادة الضبط
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Building2, Users, Eye, EyeOff, AlertCircle, Lock,
  Mail, Phone, ArrowRight, RefreshCw, CheckCircle,
  ShieldCheck, KeyRound, UserPlus, ChevronLeft, Info,
  Loader2, IdCard, Briefcase, Hash, UserCog,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkRateLimit, checkPasswordStrength } from '../utils/security';

// ============================================================
// الأنواع
// ============================================================

type AuthView =
  | 'login'
  | 'register-ministry'
  | 'register-org'
  | 'register-success'
  | 'forgot-email'
  | 'forgot-otp'
  | 'forgot-reset';

type UserType = 'ministry' | 'organization';

// ============================================================
// مكوّنات أساسية مشتركة
// ============================================================

function PasswordInput({
  value, onChange, placeholder = '••••••••',
  disabled = false, autoComplete = 'current-password', name,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; autoComplete?: string; name?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-sm bg-gray-50
          focus:bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none
          transition-all disabled:opacity-50"
      />
      <button type="button" tabIndex={-1} onClick={() => setShow(v => !v)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, requirements } = checkPasswordStrength(password);
  const widths  = ['5%', '25%', '50%', '75%', '100%'];
  const colors  = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];
  const lblClrs = ['text-red-600', 'text-orange-500', 'text-yellow-600', 'text-blue-600', 'text-green-600'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">قوة كلمة المرور</span>
        <span className={`font-bold ${lblClrs[score]}`}>{label}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colors[score]}`} style={{ width: widths[score] }} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {requirements.map((r, i) => (
          <div key={i} className={`flex items-center gap-1.5 text-[11px] ${r.met ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-1 h-1 rounded-full shrink-0 ${r.met ? 'bg-green-500' : 'bg-gray-300'}`} />
            {r.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <AlertCircle size={11} className="shrink-0" /> {msg}
    </p>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-gray-400 font-normal text-[11px] mr-1">({hint})</span>}
      </label>
      {children}
      <FieldErr msg={error} />
    </div>
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const n = [...value]; n[i] = d; onChange(n);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const n = Array(6).fill('');
    p.split('').forEach((c, i) => { n[i] = c; });
    onChange(n);
    refs.current[Math.min(p.length, 5)]?.focus();
  };
  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {Array(6).fill(0).map((_, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-[52px] text-center text-xl font-black border-2 rounded-xl outline-none
            transition-all caret-transparent border-gray-200 bg-gray-50
            focus:border-[#1E3A8A] focus:bg-white focus:ring-2 focus:ring-[#1E3A8A]/20"
        />
      ))}
    </div>
  );
}

function BackBtn({ to, label = 'العودة للدخول', onClick }: { to?: AuthView; label?: string; onClick?: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-6 transition-colors group">
      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </button>
  );
}

// ============================================================
// اللوحة اليسرى — هوية المنصة
// ============================================================

function BrandPanel({ userType }: { userType: UserType }) {
  const isMin = userType === 'ministry';
  return (
    <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#0f2460] via-[#1E3A8A] to-[#1d4ed8] p-10 text-white relative overflow-hidden h-full">
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
        <div className="absolute top-10 right-10 w-64 h-64 border-2 border-white rounded-full" />
        <div className="absolute top-28 right-28 w-40 h-40 border border-white rounded-full" />
        <div className="absolute bottom-24 left-10 w-72 h-72 border border-white rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-52 h-52 border-2 border-white rounded-full" />
      </div>

      {/* الشعار */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-black text-base leading-tight">الجمهورية اليمنية</p>
            <p className="text-blue-300 text-xs">وزارة الشؤون الاجتماعية والعمل</p>
          </div>
        </div>

        <h2 className="text-3xl font-black leading-snug mb-3">
          {isMin ? 'بوابة موظفي\nالوزارة' : 'بوابة المنظمات\nالنقابية'}
        </h2>
        <p className="text-blue-200 text-sm leading-relaxed max-w-[260px]">
          {isMin
            ? 'منصة رقمية متكاملة لإدارة ورقابة جميع الكيانات النقابية في الجمهورية اليمنية.'
            : 'منصة متخصصة لمتابعة وإدارة المنظمات النقابية المسجلة لدى وزارة الشؤون الاجتماعية والعمل.'}
        </p>

        {/* مؤشر الاختيار */}
        <div className={`mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border ${
          isMin ? 'bg-blue-700/50 border-blue-500/50 text-blue-200' : 'bg-indigo-700/50 border-indigo-500/50 text-indigo-200'
        }`}>
          {isMin ? <Building2 size={13} /> : <Users size={13} />}
          {isMin ? 'وضع الوزارة' : 'وضع المنظمات'}
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        {(isMin ? [
          { v: '78+', l: 'كياناً مسجّلاً' },
          { v: '15K+', l: 'عضو نشط' },
          { v: '96%', l: 'معدل الامتثال' },
          { v: '24/7', l: 'مراقبة مستمرة' },
        ] : [
          { v: '78', l: 'نقابة واتحاد' },
          { v: '22', l: 'نشاطاً شهرياً' },
          { v: '47', l: 'خدمة متاحة' },
          { v: '100%', l: 'رقمية كاملة' },
        ]).map(s => (
          <div key={s.l} className="bg-white/10 rounded-xl p-3.5 backdrop-blur-sm border border-white/10">
            <p className="text-2xl font-black">{s.v}</p>
            <p className="text-blue-200 text-xs mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 pt-5 border-t border-white/10">
        <p className="text-blue-300 text-xs leading-relaxed">
          جميع البيانات محمية ومشفّرة.<br />
          هذا النظام للاستخدام الرسمي المصرّح به فقط.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// نموذج التسجيل — موظف وزارة
// ============================================================

interface MinistryRegForm {
  fullName: string; nationalId: string; employeeId: string;
  department: string; jobTitle: string; grade: string;
  email: string; phone: string; supervisorEmail: string;
  password: string; confirmPassword: string; agree: boolean;
}

const MINISTRY_DEPTS = [
  'وزير الدولة', 'الوزير', 'نائب الوزير', 'ديوان الوزارة',
  'قطاع التفتيش والرقابة', 'قطاع المنظمات النقابية', 'قطاع الإدارة والمالية',
  'قطاع العمل', 'قطاع الشؤون الاجتماعية', 'الإدارة القانونية',
  'إدارة تكنولوجيا المعلومات', 'العلاقات الدولية', 'أخرى',
];

const GRADES = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'المدير العام', 'وكيل', 'نائب الوزير'];

function RegisterMinistry({
  onBack, onSuccess,
}: { onBack: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<MinistryRegForm>({
    fullName: '', nationalId: '', employeeId: '',
    department: MINISTRY_DEPTS[5], jobTitle: '', grade: GRADES[2],
    email: '', phone: '', supervisorEmail: '',
    password: '', confirmPassword: '', agree: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MinistryRegForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const set = (k: keyof MinistryRegForm, v: any) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.fullName.trim()) errs.fullName = 'الاسم الرباعي مطلوب';
    if (!form.nationalId.trim()) errs.nationalId = 'الرقم الوطني مطلوب';
    else if (!/^\d{11}$/.test(form.nationalId.replace(/\s/g, ''))) errs.nationalId = 'الرقم الوطني 11 رقماً';
    if (!form.employeeId.trim()) errs.employeeId = 'رقم الموظف مطلوب';
    if (!form.jobTitle.trim()) errs.jobTitle = 'المسمى الوظيفي مطلوب';
    if (!form.email.trim()) errs.email = 'البريد الإلكتروني مطلوب';
    else if (!form.email.toLowerCase().endsWith('.gov.ye') && !form.email.toLowerCase().endsWith('@ministry.ye'))
      errs.email = 'يجب أن يكون البريد الإلكتروني حكومياً (gov.ye)';
    if (!form.phone.trim()) errs.phone = 'رقم الهاتف مطلوب';
    else if (!/^7[0-9]{8}$/.test(form.phone.replace(/\s/g, ''))) errs.phone = 'رقم هاتف يمني غير صالح';
    if (!form.supervisorEmail.trim()) errs.supervisorEmail = 'بريد المشرف مطلوب للموافقة';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supervisorEmail)) errs.supervisorEmail = 'بريد إلكتروني غير صالح';
    if (!form.password) errs.password = 'كلمة المرور مطلوبة';
    else { const s = checkPasswordStrength(form.password); if (s.score < 3) errs.password = 'كلمة المرور ضعيفة'; }
    if (!form.confirmPassword) errs.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'كلمتا المرور غير متطابقتين';
    if (!form.agree) errs.agree = 'يجب الموافقة على الشروط';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    onSuccess();
  };

  return (
    <div>
      <BackBtn onClick={onBack} />
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 bg-[#1E3A8A]/10 rounded-xl flex items-center justify-center">
          <UserCog className="w-6 h-6 text-[#1E3A8A]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">إنشاء حساب موظف وزارة</h1>
          <p className="text-gray-500 text-xs">يحتاج الطلب موافقة المشرف المباشر قبل التفعيل</p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        <Info size={13} className="shrink-0 mt-0.5" />
        سيُرسَل طلب الحساب إلى مشرفك المباشر للموافقة. يُفعَّل الحساب فور الموافقة ويُرسَل بريد التأكيد تلقائياً.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        <SectionBox title="البيانات الشخصية والوظيفية">
          <Field label="الاسم الرباعي" required error={errors.fullName}>
            <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
              placeholder="كما هو في بطاقة الهوية الوطنية"
              className={`w-full px-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none transition-all ${errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="الرقم الوطني" required error={errors.nationalId}>
              <div className="relative">
                <IdCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.nationalId} onChange={e => set('nationalId', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="11 رقماً" dir="ltr"
                  className={`w-full pr-9 pl-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none font-mono text-right ${errors.nationalId ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
              </div>
            </Field>
            <Field label="رقم الموظف" required error={errors.employeeId}>
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.employeeId} onChange={e => set('employeeId', e.target.value)}
                  placeholder="MOL-XXXXX"
                  className={`w-full pr-9 pl-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none font-mono ${errors.employeeId ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
              </div>
            </Field>
          </div>

          <Field label="القسم / الإدارة" required>
            <div className="relative">
              <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={form.department} onChange={e => set('department', e.target.value)}
                className="w-full pr-9 pl-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none appearance-none">
                {MINISTRY_DEPTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="المسمى الوظيفي" required error={errors.jobTitle}>
              <input value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)}
                placeholder="مثال: مفتش نقابي"
                className={`w-full px-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none ${errors.jobTitle ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
            </Field>
            <Field label="الدرجة الوظيفية">
              <select value={form.grade} onChange={e => set('grade', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none">
                {GRADES.map(g => <option key={g}>الدرجة {g}</option>)}
              </select>
            </Field>
          </div>
        </SectionBox>

        <SectionBox title="بيانات التواصل">
          <Field label="البريد الإلكتروني الحكومي" required hint="gov.ye" error={errors.email}>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="user@ministry.gov.ye"
                autoComplete="email"
                className={`w-full pr-9 pl-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none ${errors.email ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
            </div>
          </Field>

          <Field label="رقم الهاتف" required error={errors.phone}>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="7XXXXXXXX" dir="ltr"
                className={`w-full pr-9 pl-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none font-mono text-right ${errors.phone ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
            </div>
          </Field>

          <Field label="بريد المشرف المباشر" required hint="للموافقة على الطلب" error={errors.supervisorEmail}>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={form.supervisorEmail} onChange={e => set('supervisorEmail', e.target.value)}
                placeholder="supervisor@ministry.gov.ye"
                className={`w-full pr-9 pl-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none ${errors.supervisorEmail ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
            </div>
          </Field>
        </SectionBox>

        <SectionBox title="كلمة المرور">
          <Field label="كلمة المرور" required error={errors.password}>
            <PasswordInput value={form.password} onChange={v => set('password', v)} autoComplete="new-password" />
            <PasswordStrengthBar password={form.password} />
          </Field>

          <Field label="تأكيد كلمة المرور" required error={errors.confirmPassword}>
            <div className="relative">
              <PasswordInput value={form.confirmPassword} onChange={v => set('confirmPassword', v)} autoComplete="new-password" placeholder="أعد كتابة كلمة المرور" />
              {form.confirmPassword && form.password === form.confirmPassword && (
                <CheckCircle className="absolute left-11 top-3.5 w-4 h-4 text-green-500 pointer-events-none" />
              )}
            </div>
          </Field>
        </SectionBox>

        {/* الموافقة */}
        <label className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-xl border-2 transition-colors ${form.agree ? 'border-[#1E3A8A] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className={`mt-0.5 w-4 h-4 border-2 rounded flex items-center justify-center shrink-0 transition-all ${form.agree ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'border-gray-300'}`}
            onClick={() => set('agree', !form.agree)}>
            {form.agree && <CheckCircle className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-gray-600 leading-relaxed">
            أُقرّ بصحة البيانات المُدخَلة وأوافق على
            {' '}<span className="text-[#1E3A8A] font-semibold">لائحة استخدام منظومة المعلومات الحكومية</span>{' '}
            وأتحمل المسؤولية القانونية عن أي استخدام غير مصرّح به.
          </span>
        </label>
        <FieldErr msg={errors.agree} />

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#162d6e] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-[#1E3A8A]/20">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ إرسال الطلب...</>
            : <><ArrowRight size={17} /> إرسال طلب إنشاء الحساب</>}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// نموذج التسجيل — منظمة نقابية
// ============================================================

interface OrgRegForm {
  orgName: string; orgType: string; sector: string; governorate: string;
  registrationNumber: string;
  contactName: string; contactTitle: string;
  email: string; phone: string;
  password: string; confirmPassword: string; agree: boolean;
}

const GOVERNORATES = ['صنعاء', 'عدن', 'تعز', 'حضرموت', 'إب', 'الحديدة', 'ذمار', 'مأرب', 'شبوة', 'البيضاء', 'حجة', 'عمران', 'المهرة', 'أخرى'];

function RegisterOrg({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<OrgRegForm>({
    orgName: '', orgType: 'union', sector: 'professional', governorate: 'صنعاء',
    registrationNumber: '', contactName: '', contactTitle: 'رئيس',
    email: '', phone: '', password: '', confirmPassword: '', agree: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OrgRegForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const set = (k: keyof OrgRegForm, v: any) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validateStep1 = () => {
    const errs: typeof errors = {};
    if (!form.orgName.trim()) errs.orgName = 'اسم المنظمة مطلوب';
    if (!form.contactName.trim()) errs.contactName = 'اسم المسؤول مطلوب';
    return errs;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.email.trim()) errs.email = 'البريد الإلكتروني مطلوب';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'بريد إلكتروني غير صالح';
    if (!form.phone.trim()) errs.phone = 'رقم الهاتف مطلوب';
    else if (!/^7[0-9]{8}$/.test(form.phone.replace(/\s/g, ''))) errs.phone = 'رقم هاتف يمني غير صالح';
    if (!form.password) errs.password = 'كلمة المرور مطلوبة';
    else { const s = checkPasswordStrength(form.password); if (s.score < 3) errs.password = 'كلمة المرور ضعيفة'; }
    if (!form.confirmPassword) errs.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'كلمتا المرور غير متطابقتين';
    if (!form.agree) errs.agree = 'يجب الموافقة على الشروط';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    onSuccess();
  };

  return (
    <div>
      <BackBtn onClick={step === 2 ? () => setStep(1) : onBack} label={step === 2 ? 'العودة للخطوة السابقة' : 'العودة للدخول'} />

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center">
          <UserPlus className="w-6 h-6 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">تسجيل منظمة نقابية</h1>
          <p className="text-gray-500 text-xs">الخطوة {step} من 2</p>
        </div>
      </div>

      {/* شريط التقدم */}
      <div className="flex gap-1.5 mb-5">
        <div className="flex-1 h-1.5 bg-[#1E3A8A] rounded-full" />
        <div className={`flex-1 h-1.5 rounded-full transition-all ${step === 2 ? 'bg-[#1E3A8A]' : 'bg-gray-200'}`} />
      </div>

      <div className="mb-4 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
        <Info size={13} className="shrink-0 mt-0.5" />
        يُقدَّم الطلب للوزارة للمراجعة والاعتماد. ستصلك إشعار بقرار الوزارة خلال 3-5 أيام عمل.
      </div>

      {/* الخطوة 1: بيانات المنظمة */}
      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-4" noValidate>
          <SectionBox title="بيانات المنظمة">
            <Field label="الاسم الرسمي للمنظمة" required error={errors.orgName}>
              <input value={form.orgName} onChange={e => set('orgName', e.target.value)}
                placeholder="مثال: نقابة مهندسي اليمن"
                className={`w-full px-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none ${errors.orgName ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع الكيان" required>
                <select value={form.orgType} onChange={e => set('orgType', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none">
                  <option value="union">نقابة</option>
                  <option value="federation">اتحاد</option>
                  <option value="association">جمعية</option>
                  <option value="cooperative">تعاونية</option>
                  <option value="foundation">مؤسسة</option>
                </select>
              </Field>
              <Field label="التصنيف" required>
                <select value={form.sector} onChange={e => set('sector', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none">
                  <option value="professional">مهنية</option>
                  <option value="labor">عمالية</option>
                  <option value="employers">أصحاب أعمال</option>
                  <option value="social">اجتماعية</option>
                  <option value="cultural">ثقافية</option>
                  <option value="sports">رياضية</option>
                </select>
              </Field>
            </div>

            <Field label="المحافظة الرئيسية" required>
              <select value={form.governorate} onChange={e => set('governorate', e.target.value)}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none">
                {GOVERNORATES.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>

            <Field label="رقم السجل / الترخيص" hint="إن وجد">
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)}
                  placeholder="YE-XXXX-XXX"
                  className="w-full pr-9 pl-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none font-mono" />
              </div>
            </Field>
          </SectionBox>

          <SectionBox title="المسؤول المفوَّض">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم الكامل" required error={errors.contactName}>
                <input value={form.contactName} onChange={e => set('contactName', e.target.value)}
                  placeholder="اسم المسؤول الرسمي"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none ${errors.contactName ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
              </Field>
              <Field label="الصفة الرسمية">
                <select value={form.contactTitle} onChange={e => set('contactTitle', e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none">
                  {['رئيس', 'نائب الرئيس', 'أمين عام', 'أمين الصندوق', 'مفوَّض'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          </SectionBox>

          <button type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#162d6e] active:scale-[0.98] transition-all shadow-lg shadow-[#1E3A8A]/20">
            التالي — بيانات الاتصال وكلمة المرور
            <ArrowRight size={16} />
          </button>
        </form>
      )}

      {/* الخطوة 2: الاتصال وكلمة المرور */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <SectionBox title="بيانات الاتصال">
            <Field label="البريد الإلكتروني الرسمي" required error={errors.email}>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="contact@union.ye" autoComplete="email"
                  className={`w-full pr-9 pl-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none ${errors.email ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
              </div>
            </Field>
            <Field label="رقم الهاتف" required error={errors.phone}>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="7XXXXXXXX" dir="ltr"
                  className={`w-full pr-9 pl-4 py-3 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none font-mono text-right ${errors.phone ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`} />
              </div>
            </Field>
          </SectionBox>

          <SectionBox title="بيانات الدخول">
            <Field label="كلمة المرور" required error={errors.password}>
              <PasswordInput value={form.password} onChange={v => set('password', v)} autoComplete="new-password" />
              <PasswordStrengthBar password={form.password} />
            </Field>
            <Field label="تأكيد كلمة المرور" required error={errors.confirmPassword}>
              <div className="relative">
                <PasswordInput value={form.confirmPassword} onChange={v => set('confirmPassword', v)} autoComplete="new-password" placeholder="أعد كتابة كلمة المرور" />
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <CheckCircle className="absolute left-11 top-3.5 w-4 h-4 text-green-500 pointer-events-none" />
                )}
              </div>
            </Field>
          </SectionBox>

          <label className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-xl border-2 transition-colors ${form.agree ? 'border-[#1E3A8A] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className={`mt-0.5 w-4 h-4 border-2 rounded flex items-center justify-center shrink-0 transition-all ${form.agree ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'border-gray-300'}`}
              onClick={() => set('agree', !form.agree)}>
              {form.agree && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-xs text-gray-600 leading-relaxed">
              أُقرّ بصحة البيانات وأوافق على{' '}
              <span className="text-[#1E3A8A] font-semibold">شروط الاستخدام وسياسة الخصوصية</span>،
              وأتحمل المسؤولية القانونية عن دقة المعلومات المُقدَّمة.
            </span>
          </label>
          <FieldErr msg={errors.agree} />

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#162d6e] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-[#1E3A8A]/20">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ إرسال الطلب...</>
              : <><ArrowRight size={17} /> إرسال طلب التسجيل</>}
          </button>
        </form>
      )}
    </div>
  );
}

// ============================================================
// شاشة النجاح
// ============================================================

function SuccessView({ type, onBack }: { type: UserType; onBack: () => void }) {
  const isMin = type === 'ministry';
  return (
    <div className="text-center py-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle className="w-11 h-11 text-green-600" />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">
        {isMin ? 'طلبك في طريقه!' : 'تم استلام طلب التسجيل'}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto mb-6">
        {isMin
          ? 'أُرسِل طلبك إلى مشرفك المباشر للموافقة. يُفعَّل حسابك فور الموافقة ويصلك بريد التأكيد تلقائياً.'
          : 'سيتولى فريق الوزارة مراجعة طلبك والرد عليك خلال 3-5 أيام عمل عبر البريد الإلكتروني المُدخَل.'}
      </p>

      <div className="text-right mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs font-black text-amber-800 mb-3">الخطوات التالية</p>
        <ol className="space-y-2">
          {(isMin ? [
            'يستلم مشرفك المباشر إشعار بريدي بطلبك',
            'يراجع ويعتمد الطلب إلكترونياً',
            'يصلك بريد تأكيد مع بيانات الدخول',
            'تسجّل الدخول وتغيّر كلمة المرور عند أول دخول',
          ] : [
            'مراجعة بيانات المنظمة والوثائق',
            'التحقق من استيفاء شروط التسجيل',
            'إصدار قرار القبول أو طلب مستندات إضافية',
            'تفعيل الحساب وإرسال بيانات الدخول',
          ]).map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-amber-700">
              <span className="w-5 h-5 bg-amber-200 text-amber-900 rounded-full flex items-center justify-center font-black shrink-0 text-[10px]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <button onClick={onBack}
        className="w-full py-3.5 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#162d6e] transition-all shadow-lg shadow-[#1E3A8A]/20">
        العودة لصفحة الدخول
      </button>
    </div>
  );
}

// ============================================================
// المكوّن الرئيسي
// ============================================================

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [view, setView] = useState<AuthView>('login');
  const [userType, setUserType] = useState<UserType>('ministry');
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [rateLimitWarning, setRateLimitWarning] = useState('');

  // حقول الدخول
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // استرجاع كلمة المرور
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetErrors, setResetErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const t = setTimeout(() => setOtpResendCountdown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendCountdown]);

  useEffect(() => {
    setGlobalError('');
    setLoginErrors({});
    setResetErrors({});
  }, [view]);

  const goLogin = useCallback(() => setView('login'), []);

  // ===== تسجيل الدخول =====
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!loginEmail.trim()) errs.email = 'البريد الإلكتروني مطلوب';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) errs.email = 'بريد إلكتروني غير صالح';
    if (!loginPassword) errs.password = 'كلمة المرور مطلوبة';
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }

    const rl = checkRateLimit(`login_${loginEmail.toLowerCase().trim()}`);
    if (!rl.allowed) {
      const mins = rl.lockedUntil ? Math.ceil((rl.lockedUntil.getTime() - Date.now()) / 60000) : 30;
      setGlobalError(`تم تعليق الحساب مؤقتاً. حاول مجدداً بعد ${mins} دقيقة.`);
      return;
    }
    setLoading(true); setGlobalError(''); setRateLimitWarning('');
    try {
      await signIn(loginEmail.trim(), loginPassword, userType);
      navigate(userType === 'ministry' ? '/ministry' : '/organization', { replace: true });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'بيانات الدخول غير صحيحة');
      const rlAfter = checkRateLimit(`login_${loginEmail.toLowerCase().trim()}`);
      if (rlAfter.remainingAttempts > 0 && rlAfter.remainingAttempts <= 3)
        setRateLimitWarning(`تنبيه: تبقّت ${rlAfter.remainingAttempts} محاولة قبل تعليق الوصول.`);
    } finally { setLoading(false); }
  }, [loginEmail, loginPassword, userType, signIn, navigate]);

  // ===== استرجاع — إدخال البريد =====
  const handleForgotEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setResetErrors({ email: 'أدخل بريداً إلكترونياً صالحاً' }); return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false); setOtpResendCountdown(60); setView('forgot-otp');
  }, [forgotEmail]);

  // ===== التحقق من OTP =====
  const handleOtpVerify = useCallback(async () => {
    if (otp.join('').length < 6) { setResetErrors({ otp: 'أدخل الرمز المكوّن من 6 أرقام' }); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false); setView('forgot-reset');
  }, [otp]);

  // ===== إعادة ضبط كلمة المرور =====
  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!newPassword) errs.newPassword = 'كلمة المرور الجديدة مطلوبة';
    else { const s = checkPasswordStrength(newPassword); if (s.score < 3) errs.newPassword = 'كلمة المرور ضعيفة جداً'; }
    if (!confirmNewPassword) errs.confirmNewPassword = 'التأكيد مطلوب';
    else if (newPassword !== confirmNewPassword) errs.confirmNewPassword = 'كلمتا المرور غير متطابقتين';
    if (Object.keys(errs).length) { setResetErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    setNewPassword(''); setConfirmNewPassword('');
    setView('login');
  }, [newPassword, confirmNewPassword]);

  const isRecoveryView = view.startsWith('forgot');
  const isRegView = view.startsWith('register');

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* اللوحة اليسرى */}
      <div className="hidden lg:block w-[42%] xl:w-[45%] shrink-0">
        <BrandPanel userType={isRecoveryView || isRegView ? userType : userType} />
      </div>

      {/* اللوحة اليمنى */}
      <div className="flex-1 flex flex-col justify-center overflow-y-auto bg-white">
        <div className="max-w-[480px] w-full mx-auto px-6 py-10">

          {/* ======== الدخول ======== */}
          {view === 'login' && (
            <div>
              {/* موبايل: شعار */}
              <div className="lg:hidden flex items-center gap-2.5 mb-7">
                <div className="w-9 h-9 bg-[#1E3A8A] rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-gray-800 text-sm leading-tight">الجمهورية اليمنية</p>
                  <p className="text-gray-400 text-[11px]">منصة UnionSphere</p>
                </div>
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-1">تسجيل الدخول</h1>
              <p className="text-gray-500 text-sm mb-6">أدخل بيانات حسابك للوصول إلى المنصة</p>

              {/* اختيار نوع المستخدم */}
              <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-2xl">
                {([
                  { type: 'ministry' as const, icon: Building2, label: 'الوزارة', sub: 'موظف حكومي' },
                  { type: 'organization' as const, icon: Users, label: 'المنظمة النقابية', sub: 'نقابة / اتحاد' },
                ]).map(({ type, icon: Icon, label, sub }) => (
                  <button key={type} type="button"
                    onClick={() => { setUserType(type); setGlobalError(''); setLoginErrors({}); }}
                    className={`flex flex-col items-center gap-0.5 py-3 px-3 rounded-xl transition-all ${
                      userType === type ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    <Icon size={20} />
                    <span className="text-sm font-bold">{label}</span>
                    <span className={`text-[10px] ${userType === type ? 'text-blue-400' : 'text-gray-400'}`}>{sub}</span>
                  </button>
                ))}
              </div>

              {/* خطأ */}
              {globalError && (
                <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700">{globalError}</p>
                    {rateLimitWarning && <p className="text-xs text-orange-600 mt-1 font-semibold">{rateLimitWarning}</p>}
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <Field label="البريد الإلكتروني" required error={loginErrors.email}>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={loginEmail}
                      onChange={e => { setLoginEmail(e.target.value); setLoginErrors(p => ({ ...p, email: '' })); }}
                      placeholder={userType === 'ministry' ? 'user@ministry.gov.ye' : 'user@union.ye'}
                      autoComplete="username" disabled={loading}
                      className={`w-full pr-10 pl-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none transition-all disabled:opacity-50 ${loginErrors.email ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                </Field>

                <Field label="كلمة المرور" required error={loginErrors.password}>
                  <PasswordInput value={loginPassword}
                    onChange={v => { setLoginPassword(v); setLoginErrors(p => ({ ...p, password: '' })); }}
                    autoComplete="current-password" disabled={loading} />
                </Field>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${rememberMe ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'border-gray-300 group-hover:border-[#1E3A8A]'}`}
                      onClick={() => setRememberMe(v => !v)}>
                      {rememberMe && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-600">تذكّرني لمدة 7 أيام</span>
                  </label>
                  <button type="button" onClick={() => setView('forgot-email')}
                    className="text-sm text-[#1E3A8A] hover:text-blue-800 font-semibold transition-colors">
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#162d6e] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-[#1E3A8A]/20 mt-1">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحقق...</> : 'الدخول إلى المنصة'}
                </button>
              </form>

              {/* فاصل */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs text-gray-400 shrink-0">أو</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              {/* زر التسجيل — ديناميكي */}
              <button
                onClick={() => setView(userType === 'ministry' ? 'register-ministry' : 'register-org')}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-blue-50/30 transition-all">
                <UserPlus size={17} />
                {userType === 'ministry' ? 'إنشاء حساب موظف وزارة' : 'تسجيل منظمة نقابية جديدة'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
                هذا النظام للاستخدام الرسمي المصرّح به فقط.<br />
                جميع الأنشطة مُسجَّلة وخاضعة للمراجعة.
              </p>
            </div>
          )}

          {/* ======== تسجيل موظف وزارة ======== */}
          {view === 'register-ministry' && (
            <RegisterMinistry onBack={goLogin} onSuccess={() => setView('register-success')} />
          )}

          {/* ======== تسجيل منظمة ======== */}
          {view === 'register-org' && (
            <RegisterOrg onBack={goLogin} onSuccess={() => setView('register-success')} />
          )}

          {/* ======== نجاح التسجيل ======== */}
          {view === 'register-success' && (
            <SuccessView type={userType} onBack={goLogin} />
          )}

          {/* ======== استرجاع — البريد ======== */}
          {view === 'forgot-email' && (
            <div>
              <BackBtn onClick={goLogin} />
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
                <Mail className="w-7 h-7 text-[#1E3A8A]" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">استرجاع كلمة المرور</h1>
              <p className="text-gray-500 text-sm mb-7 leading-relaxed">
                أدخل بريدك الإلكتروني المسجَّل وسنرسل رمز التحقق لإعادة ضبط كلمة المرور.
              </p>
              <form onSubmit={handleForgotEmail} className="space-y-4" noValidate>
                <Field label="البريد الإلكتروني" required error={resetErrors.email}>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setResetErrors({}); }}
                      placeholder="بريدك المسجّل" autoComplete="email"
                      className={`w-full pr-10 pl-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] outline-none transition-all ${resetErrors.email ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                </Field>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#162d6e] transition-all disabled:opacity-60 shadow-lg shadow-[#1E3A8A]/20">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> إرسال...</> : 'إرسال رمز التحقق'}
                </button>
              </form>
            </div>
          )}

          {/* ======== استرجاع — OTP ======== */}
          {view === 'forgot-otp' && (
            <div>
              <BackBtn onClick={() => setView('forgot-email')} label="تغيير البريد الإلكتروني" />
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5">
                <KeyRound className="w-7 h-7 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">رمز التحقق</h1>
              <p className="text-gray-500 text-sm mb-1">أُرسِل رمز 6 أرقام إلى:</p>
              <p className="text-[#1E3A8A] font-bold text-sm mb-6 font-mono">{forgotEmail}</p>

              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-700">
                <Info size={13} className="shrink-0" />
                وضع تجريبي — رمز التحقق: <strong className="font-mono tracking-wider mr-1">123456</strong>
              </div>

              <div className="mb-5">
                <OtpInput value={otp} onChange={setOtp} />
                <FieldErr msg={resetErrors.otp} />
              </div>

              <button onClick={handleOtpVerify} disabled={loading || otp.join('').length < 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#162d6e] transition-all disabled:opacity-50 shadow-lg shadow-[#1E3A8A]/20">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> التحقق...</> : 'تحقق من الرمز'}
              </button>

              <div className="text-center mt-5">
                {otpResendCountdown > 0
                  ? <p className="text-sm text-gray-400">إعادة الإرسال بعد <strong className="text-gray-600 font-mono">{otpResendCountdown}</strong>ث</p>
                  : <button onClick={() => { setOtpResendCountdown(60); setOtp(Array(6).fill('')); }}
                      className="flex items-center gap-1.5 text-sm text-[#1E3A8A] font-semibold mx-auto hover:text-blue-800 transition-colors">
                      <RefreshCw size={14} /> إعادة إرسال الرمز
                    </button>}
              </div>
            </div>
          )}

          {/* ======== استرجاع — كلمة مرور جديدة ======== */}
          {view === 'forgot-reset' && (
            <div>
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5">
                <Lock className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">كلمة مرور جديدة</h1>
              <p className="text-gray-500 text-sm mb-7">اختر كلمة مرور قوية لتأمين حسابك.</p>
              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                <Field label="كلمة المرور الجديدة" required error={resetErrors.newPassword}>
                  <PasswordInput value={newPassword}
                    onChange={v => { setNewPassword(v); setResetErrors(p => ({ ...p, newPassword: '' })); }}
                    placeholder="كلمة مرور قوية" autoComplete="new-password" />
                  <PasswordStrengthBar password={newPassword} />
                </Field>
                <Field label="تأكيد كلمة المرور" required error={resetErrors.confirmNewPassword}>
                  <div className="relative">
                    <PasswordInput value={confirmNewPassword}
                      onChange={v => { setConfirmNewPassword(v); setResetErrors(p => ({ ...p, confirmNewPassword: '' })); }}
                      placeholder="أعد كتابة كلمة المرور" autoComplete="new-password" />
                    {confirmNewPassword && newPassword === confirmNewPassword && (
                      <CheckCircle className="absolute left-11 top-3.5 w-4 h-4 text-green-500 pointer-events-none" />
                    )}
                  </div>
                </Field>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-60 shadow-lg shadow-green-600/20">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> حفظ...</> : <><CheckCircle size={16} /> حفظ كلمة المرور الجديدة</>}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
