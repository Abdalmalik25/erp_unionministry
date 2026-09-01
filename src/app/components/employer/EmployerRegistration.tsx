/**
 * EstablishmentRegistration — نموذج طلب تسجيل منشأة رسمي مؤسسي
 * يكتب مباشرة في السجل الرسمي commercial_establishments بحالة «طلب بانتظار الموافقة»
 * يدعم: منشأة جديدة بفروع متعددة • أو ربط/مطالبة بمنشأة قائمة بالرقم الوطني
 */
import { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, CheckCircle2, X, Loader2, LinkIcon, FilePlus2 } from 'lucide-react';
import { useGovernorates } from '../../hooks/useReferenceData';

export const SECTORS_AR: Record<string, string> = {
  trade: 'تجارة', services: 'خدمات', industry: 'صناعة', construction: 'إنشاءات',
  agriculture: 'زراعة', healthcare: 'صحة', education: 'تعليم', transportation: 'نقل',
  technology: 'تقنية معلومات', finance: 'مالية', tourism: 'سياحة', other: 'أخرى',
};

const ENTITY_TYPES_AR: Record<string, string> = {
  company: 'شركة', llc: 'شركة محدودة', shop: 'محل تجاري', restaurant: 'مطعم',
  factory: 'مصنع', service: 'نشاط خدمي', craft: 'حرفي', office: 'مكتب',
  warehouse: 'مخزن', partnership: 'تضامن', corporation: 'مساهمة', cooperative: 'تعاونية', other: 'أخرى',
};

interface BranchDraft {
  branch_name: string;
  branch_type: string;
  governorate: string;
  city: string;
  manager_name: string;
  phone: string;
}

interface LinkedEst {
  id: string;
  name_ar: string;
  national_number?: string;
}

type Result = {
  id?: string;
  establishment_id?: string;
  name_ar?: string;
  national_number?: string;
  reference?: string;
  message: string;
};

export function EstablishmentRegistration({
  open, onClose, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (r: Result) => void;
}) {
  const [mode, setMode] = useState<'new' | 'link'>('new');
  const [linked, setLinked] = useState<LinkedEst | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const { governorates, isLoading: govLoading, usedFallback } = useGovernorates();

  const [f, setF] = useState({
    name_ar: '', name_en: '', owner_name: '', owner_national_id: '',
    phone: '', email: '', governorate: '', city: '', address: '',
    sector: 'trade', entity_type: 'company', employees_count: '',
    commercial_register: '',
  });
  const [branches, setBranches] = useState<BranchDraft[]>([]);

  const DEFAULT_GOV = governorates[0] || 'أمانة العاصمة';

  useEffect(() => {
    setF(p => {
      if (p.governorate) return p;
      return { ...p, governorate: DEFAULT_GOV };
    });
  }, [DEFAULT_GOV]);

  if (!open) return null;

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const addBranch = () => setBranches(b => [...b, { branch_name: '', branch_type: 'فرع', governorate: f.governorate || DEFAULT_GOV, city: '', manager_name: '', phone: '' }]);
  const rmBranch = (i: number) => setBranches(b => b.filter((_, x) => x !== i));
  const editBranch = (i: number, k: keyof BranchDraft, v: string) =>
    setBranches(b => b.map((x, xi) => xi === i ? { ...x, [k]: v } : x));

  const submit = async () => {
    setError('');
    if (mode === 'new') {
      if (!f.name_ar.trim()) return setError('اسم المنشأة مطلوب');
      if (!f.owner_name.trim()) return setError('اسم المالك مطلوب');
      if (!f.phone.trim()) return setError('هاتف التواصل مطلوب');
      if (branches.some(b => !b.branch_name.trim())) return setError('أحد الفروع بدون اسم — أكمله أو احذفه');
    } else if (!linked) {
      return setError('اختر المنشأة المراد ربطها أولاً');
    }
    setSubmitting(true);
    try {
      const body = mode === 'new'
        ? {
            mode, ...f,
            employees_count: f.employees_count ? Number(f.employees_count) : undefined,
            branches: branches.filter(b => b.branch_name.trim()),
          }
        : {
            mode, establishment_id: linked!.id,
            owner_name: f.owner_name, phone: f.phone, email: f.email,
          };
      const r = await fetch('/api/establishments/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.errors?.error || j.error || 'تعذر الإرسال');
      const res: Result = {
        id: j.data?.id,
        establishment_id: j.data?.establishment_id,
        name_ar: j.data?.name_ar,
        national_number: j.data?.national_number,
        reference: j.data?.national_number || j.reference || linked?.name_ar,
        message: j.message || j.data?.message || 'تم الاستلام',
      };
      setResult(res);
      onSuccess?.(res);
    } catch (e: any) {
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-card text-sm focus:ring-2 focus:ring-blue-500 outline-none';
  const labelCls = 'block text-xs font-semibold mb-1 text-muted-foreground';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="نموذج طلب تسجيل منشأة"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-l from-blue-900 to-indigo-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">طلب تسجيل في سجل المنشآت الرسمي</h3>
              <p className="text-[11px] text-blue-200">وزارة الشؤون الاجتماعية والعمل — قطاع العمل</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 hover:bg-white/10 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {result ? (
          /* ===== شاشة النجاح ===== */
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
            <h4 className="font-black text-lg">تم استلام طلبك رسمياً</h4>
            <p className="text-sm text-muted-foreground">{result.message}</p>
            {result.national_number && (
              <div className="inline-block bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl px-6 py-3">
                <p className="text-[11px] font-semibold text-muted-foreground">رقم طلبك الوطني المرجعي</p>
                <p className="text-xl font-black tracking-wider text-amber-700 dark:text-amber-400" dir="ltr">{result.national_number}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              حالة الطلب الآن: <span className="font-bold text-amber-600">طلب بانتظار الموافقة</span><br />
              سيطلع عليه موظف السجل الرسمي وتصلك نتيجة المراجعة عبر بيانات تواصلك.
            </p>
            <button onClick={onClose} className="mt-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer">
              حفظ الرقم والإغلاق
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* تبديل الوضع */}
            {!linked && (
              <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="نوع الطلب">
                <button type="button" role="tab" aria-selected={mode === 'new'} onClick={() => setMode('new')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${mode === 'new' ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-border hover:bg-accent'}`}>
                  <FilePlus2 className="w-4 h-4" /> منشأة جديدة (بفروعها)
                </button>
                <button type="button" role="tab" aria-selected={mode === 'link'} onClick={() => setMode('link')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${mode === 'link' ? 'bg-blue-600/15 border-blue-500 text-blue-700 dark:text-blue-300' : 'border-border hover:bg-accent'}`}>
                  <LinkIcon className="w-4 h-4" /> ربط بمنشأة قائمة بالرقم الوطني
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">{error}</div>
            )}

            {/* وضع الربط */}
            {mode === 'link' && !linked && (
              <LinkLookup onPick={(est) => { setLinked(est); setError(''); }} />
            )}
            {mode === 'link' && linked && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl">
                <div className="text-xs">
                  <p className="font-bold">{linked.name_ar}</p>
                  <p className="text-muted-foreground mt-0.5" dir="ltr">{linked.national_number}</p>
                </div>
                <button type="button" onClick={() => setLinked(null)} className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer">تغيير</button>
              </div>
            )}

            {/* بيانات المالك (للوضعين) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>اسم المالك *</label><input className={inputCls} value={f.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="الاسم الكامل لصاحب المنشأة" /></div>
              <div><label className={labelCls}>هاتف التواصل *</label><input className={inputCls} dir="ltr" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="7xxxxxxxx" /></div>
              {mode === 'link' ? (
                <div className="sm:col-span-2"><label className={labelCls}>البريد الإلكتروني</label><input className={inputCls} dir="ltr" value={f.email} onChange={e => set('email', e.target.value)} /></div>
              ) : (
                <>
                  <div><label className={labelCls}>الرقم الوطني للمالك</label><input className={inputCls} dir="ltr" value={f.owner_national_id} onChange={e => set('owner_national_id', e.target.value)} placeholder="رقم البطاقة الشخصية" /></div>
                  <div><label className={labelCls}>البريد الإلكتروني</label><input className={inputCls} dir="ltr" value={f.email} onChange={e => set('email', e.target.value)} /></div>
                </>
              )}
            </div>

            {/* بيانات المنشأة الجديدة */}
            {mode === 'new' && (
              <>
                <hr className="border-border" />
                <p className="text-xs font-black text-blue-700 dark:text-blue-400">بيانات المنشأة — تُقيَّد في السجل الرسمي</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={labelCls}>اسم المنشأة (عربي) *</label><input className={inputCls} value={f.name_ar} onChange={e => set('name_ar', e.target.value)} /></div>
                  <div><label className={labelCls}>الاسم (إنجليزي)</label><input className={inputCls} dir="ltr" value={f.name_en} onChange={e => set('name_en', e.target.value)} /></div>
                  <div>
                    <label className={labelCls}>نوع الكيان</label>
                    <select className={inputCls} value={f.entity_type} onChange={e => set('entity_type', e.target.value)}>
                      {Object.entries(ENTITY_TYPES_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>القطاع</label>
                    <select className={inputCls} value={f.sector} onChange={e => set('sector', e.target.value)}>
                      {Object.entries(SECTORS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>السجل التجاري (إن وُجد)</label><input className={inputCls} dir="ltr" value={f.commercial_register} onChange={e => set('commercial_register', e.target.value)} placeholder="CR-xxxxxx" /></div>
                  <div><label className={labelCls}>عدد العاملين المتوقع</label><input type="number" min="0" className={inputCls} dir="ltr" value={f.employees_count} onChange={e => set('employees_count', e.target.value)} /></div>
                  <div>
                    <label className={labelCls}>المحافظة *</label>
                    {govLoading ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ تحميل دليل المحافظات الوطني...
                      </div>
                    ) : (
                      <select className={inputCls} value={f.governorate} onChange={e => set('governorate', e.target.value)}>
                        {governorates.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                    {!govLoading && usedFallback && (
                      <p className="mt-1 text-[10px] text-amber-600">تجريبي (خارج الشبكة) — القائمة الوطنية الرسمية</p>
                    )}
                  </div>
                  <div><label className={labelCls}>المدينة / المديرية</label><input className={inputCls} value={f.city} onChange={e => set('city', e.target.value)} /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>العنوان التفصيلي</label><input className={inputCls} value={f.address} onChange={e => set('address', e.target.value)} /></div>
                </div>

                {/* الفروع — تعدد فروع كامل */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-blue-700 dark:text-blue-400">فروع المنشأة ({branches.length})</p>
                    <button type="button" onClick={addBranch} disabled={branches.length >= 10}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-40 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" /> إضافة فرع
                    </button>
                  </div>
                  {branches.length === 0 && (
                    <p className="text-[11px] text-muted-foreground border border-dashed border-border rounded-lg p-3 text-center">
                      لا فروع بعد — الفرع الرئيسي هو نفس بيانات المنشأة أعلاه. أضف فروعاً إضافية عند الحاجة.
                    </p>
                  )}
                  {branches.map((b, i) => (
                    <div key={i} className="border border-border rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 relative">
                      <button type="button" onClick={() => rmBranch(i)} aria-label={`حذف الفرع ${i + 1}`}
                        className="absolute left-2 top-2 p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      <div className="col-span-2 sm:col-span-3"><label className={labelCls}>اسم الفرع {i + 1}</label><input className={inputCls} value={b.branch_name} onChange={e => editBranch(i, 'branch_name', e.target.value)} /></div>
                      <div><label className={labelCls}>المحافظة</label>
                        <select className={inputCls} value={b.governorate || DEFAULT_GOV} onChange={e => editBranch(i, 'governorate', e.target.value)}>
                          {governorates.map(g => <option key={g} value={g}>{g}</option>)}
                        </select></div>
                      <div><label className={labelCls}>المدينة</label><input className={inputCls} value={b.city} onChange={e => editBranch(i, 'city', e.target.value)} /></div>
                      <div><label className={labelCls}>الهاتف</label><input className={inputCls} dir="ltr" value={b.phone} onChange={e => editBranch(i, 'phone', e.target.value)} /></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* أزرار */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                بالإرسال أنت تقر بصحة البيانات — يخضع الطلب لمراجعة موظف السجل الرسمي وفق قانون العمل رقم 5 لسنة 1995
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 border border-border rounded-xl text-sm hover:bg-accent cursor-pointer">إلغاء</button>
              <button type="button" onClick={submit} disabled={submitting}
                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب رسمياً'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** بحث داخل النموذج للربط بمنشأة قائمة */
function LinkLookup({ onPick }: { onPick: (est: any) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [touched, setTouched] = useState(false);

  const run = async (val: string) => {
    if (val.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/establishments/lookup?q=${encodeURIComponent(val.trim())}`);
      const j = await r.json();
      setResults(j.data?.data || []);
    } catch { setResults([]); }
    finally { setSearching(false); setTouched(true); }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-muted-foreground">ابحث بالاسم أو الرقم الوطني (NE-XXXXXX) أو السجل التجاري</label>
      <input
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-card text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        value={q}
        onChange={e => { setQ(e.target.value); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); run(q); } }}
        placeholder="NE-000042 أو اسم المنشأة..."
        dir="auto"
      />
      <button type="button" onClick={() => run(q)} className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">بحث</button>
      {searching && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> جارٍ البحث في السجل...</p>}
      {touched && !searching && results.length === 0 && (
        <p className="text-[11px] text-amber-600">لا نتائج — تأكد من الرقم أو جرّب جزءاً من الاسم</p>
      )}
      <div className="max-h-44 overflow-y-auto space-y-1.5">
        {results.map(est => (
          <button key={est.id} type="button" onClick={() => onPick(est)}
            className="w-full text-right p-2.5 border border-border hover:border-blue-400 rounded-xl transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">{est.name_ar}</span>
              <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">{est.national_number}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{est.governorate} • {est.status_label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
