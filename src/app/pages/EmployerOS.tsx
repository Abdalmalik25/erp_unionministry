/**
 * EmployerOS — نظام تشغيل صاحب العمل (Command Center)
 * ليس Dashboard — بل Operating System
 * تبويبات: لوحة القيادة • السيناريو التشغيلي • الخدمة الذاتية • التقييم الذاتي
 */
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { ComplianceScoreCard, defaultBreakdown } from "../components/labor/ComplianceScoreCard";
import { WorkforceCommand } from "../components/labor/WorkforceCommand";
import { ServiceMarketplace } from "../components/labor/ServiceMarketplace";
import { Building2, ClipboardCheck, Scale, HeartPulse, Bell, FileText, Clock, TrendingUp, Eye, ArrowLeft, Route, Zap, ClipboardList } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { SmartChronology } from "../components/labor/SmartChronology";
import { InteractionHub } from "../components/labor/InteractionHub";
import { OfflineIndicator } from "../components/labor/OfflineIndicator";
import { IntegrationAware } from "../components/integration/IntegrationAware";
import { EmployerJourney } from "../components/employer/EmployerJourney";
import { SelfServiceCenter } from "../components/employer/SelfServiceCenter";
import { SelfAssessment } from "../components/employer/SelfAssessment";
import { EvidenceUploader } from "../components/employer/EvidenceUploader";
import { EstablishmentRegistration } from "../components/employer/EmployerRegistration";
import { toast } from "../components/ui/Toast";

type Stats = { total: number; active: number; violations: number; inspections: number; alerts: number };
type Tab = 'dashboard' | 'journey' | 'self-service' | 'assessment';

const TABS: { id: Tab; label: string; icon: any; hint: string }[] = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: Eye, hint: 'ما الذي يحتاج إجراءك الآن؟' },
  { id: 'journey', label: 'السيناريو التشغيلي', icon: Route, hint: 'رحلتك الكاملة + ضوابط الوزارة' },
  { id: 'self-service', label: 'الخدمة الذاتية', icon: Zap, hint: 'أنجز بدون زيارة مكتب' },
  { id: 'assessment', label: 'التقييم الذاتي', icon: ClipboardList, hint: 'اكتشف فجواتك قبل المفتش' },
];

export default function EmployerOS() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats|null>(null);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // السجل الرسمي: المنشأة المرتبطة + فروعها
  const [linkedEst, setLinkedEst] = useState<any | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [newBranch, setNewBranch] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);
  const [showReg, setShowReg] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('linked_establishment');
      if (stored) setLinkedEst(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!linkedEst?.id) { setBranches([]); return; }
    fetch(`/api/establishments/${linkedEst.id}/branches`)
      .then(r => r.json())
      .then(j => setBranches(j.data?.data || []))
      .catch(() => setBranches([]));
  }, [linkedEst]);

  const addBranch = async () => {
    if (!linkedEst || !newBranch.trim()) return;
    setAddingBranch(true);
    try {
      const r = await fetch(`/api/establishments/${linkedEst.id}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_name: newBranch.trim(), governorate: linkedEst.governorate }),
      });
      const j = await r.json();
      if (r.ok && j.success !== false) {
        toast.success(j.message || 'تمت إضافة الفرع — بانتظار الاعتماد');
        setNewBranch('');
        const br = await fetch(`/api/establishments/${linkedEst.id}/branches`).then(x => x.json());
        setBranches(br.data?.data || []);
      } else {
        toast.error(j.errors?.error || j.error || 'تعذر إضافة الفرع');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setAddingBranch(false);
    }
  };

  useEffect(()=>{
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const get = async (url: string): Promise<any[]> => {
      try {
        const r = await fetch(url, { signal });
        const j = await r.json();
        return j.data?.data || j.data || [];
      } catch { return []; }
    };
    (async () => {
      const results = await Promise.allSettled([
        fetch('/api/dashboard/enhanced-stats', { signal }).then(r => r.json()).catch(() => null),
        get('/api/commercial?limit=5'),
        get('/api/v1/cases?limit=5'),
        get('/api/inspections?limit=5'),
      ]);
      if (signal.aborted) return;
      if (results[0].status === 'fulfilled' && results[0].value) {
        const d = results[0].value.data || results[0].value;
        setStats({ total:d.entities||0, active:d.activeEntities||0, violations:d.openViolations||0, inspections:d.totalActivities||0, alerts:d.unresolvedAlerts||0 });
      }
      if (results[1].status === 'fulfilled') setEstablishments(results[1].value);
      if (results[2].status === 'fulfilled') setCases(results[2].value);
      if (results[3].status === 'fulfilled') setInspections(results[3].value);
      setLoading(false);
    })();
    return () => ctrl.abort();
  },[]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header — what needs my action now */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold"><Building2 className="w-4 h-4"/> نظام تشغيل صاحب العمل — Employer OS</div>
            <h1 className="text-2xl font-black mt-1">مرحباً، {user?.name || 'صاحب العمل'}</h1>
            <p className="text-sm text-blue-100 mt-1">ما الذي يحتاج إجراءك الآن؟ • المتأخرات • المخاطر • الخدمات المتاحة • التفتيش القادم</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setTab('assessment')}><Eye className="w-4 h-4 ml-1"/>تقييم جاهزيتي الآن</Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setTab('self-service')}>بدء خدمة ذاتية <ArrowLeft className="w-4 h-4 mr-1"/></Button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
          {[
            { label:'المنشآت', value: stats?.total ?? '—', sub:'النشطة '+(stats?.active ?? '—') },
            { label:'تنبيهات', value: stats?.alerts ?? 0, sub:'تحتاج إجراء' },
            { label:'مخالفات مفتوحة', value: stats?.violations ?? 0, sub:'قيد المعالجة' },
            { label:'تفتيش', value: 'قادم خلال 9 أيام', sub:'مخاطرة متوسطة' },
            { label:'عقود تنتهي', value: 4, sub:'خلال 30 يوم' },
          ].map(k=>(
            <div key={k.label} className="bg-white/10 backdrop-blur border border-white/15 rounded-xl p-3">
              <div className="text-[11px] text-blue-200">{k.label}</div>
              {loading && typeof k.value === 'number' ? (
                <div className="h-6 my-1 w-14 rounded bg-white/20 animate-pulse" aria-label="جارٍ التحميل" />
              ) : (
                <div className="text-lg font-black">{k.value}</div>
              )}
              <div className="text-[11px] text-blue-100">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" role="tablist" aria-label="أقسام نظام تشغيل صاحب العمل">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg border-transparent'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <span className="flex items-center gap-2 font-bold text-xs">
                <Icon size={16} className={active ? 'text-amber-300' : 'text-blue-600'} />
                {t.label}
              </span>
              <span className={`block text-[10px] mt-1 ${active ? 'text-blue-100' : 'text-muted-foreground'}`}>{t.hint}</span>
            </button>
          );
        })}
      </div>

      {/* ===== لوحة القيادة ===== */}
      {tab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <ComplianceScoreCard
                score={68}
                breakdown={defaultBreakdown}
                reasons={[
                  { label:'وثائق منتهية/ناقصة', count: 3, severity:'critical' },
                  { label:'إجراءات تصحيحية معلقة', count: 2, severity:'warning' },
                  { label:'نتائج تفتيش سابقة', count: 1, severity:'warning' },
                  { label:'شهادات مطابقة منتهية', count: 1, severity:'critical' },
                ]}
              />

              <WorkforceCommand
                total={142}
                yemeni={{ male: 89, female: 12 }}
                expat={{ male: 34, female: 7 }}
                byOccupation={[
                  { name:'فني صيانة', count: 28 },
                  { name:'سائق', count: 22 },
                  { name:'محاسب', count: 18 },
                  { name:'مهندس', count: 14 },
                  { name:'عامل إنتاج', count: 31 },
                  { name:'حارس', count: 9 },
                ]}
                expiringContracts={4}
                pendingTransfers={2}
              />

              <Card>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm"><ClipboardCheck className="w-5 h-5 text-emerald-600"/> التفتيش — الخطة القادمة</div>
                    <Badge variant="outline"><Clock className="w-3 h-3 ml-1"/>خلال 9 أيام • Field Mode Offline Ready</Badge>
                  </div>
                  {inspections.length===0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="border rounded-xl p-3"><div className="font-bold">تفتيش دوري</div><div className="text-muted-foreground">المنشأة الرئيسية — صنعاء</div><div className="mt-2 text-amber-600">قائمة التحقق: 18 بند (سلامة/عقود/يمننة)</div></div>
                      <div className="border rounded-xl p-3"><div className="font-bold">تفتيش متخصص — السلامة</div><div className="text-muted-foreground">فرع عدن — معدات وقاية</div><div className="mt-2 text-emerald-600">جاهز للـ offline: صور + توقيع</div></div>
                      <div className="border rounded-xl p-3"><div className="font-bold">إعادة تفتيش</div><div className="text-muted-foreground">إغلاق إجراءين تصحيحيين</div><div className="mt-2 text-rose-600">متأخر 4 أيام — تنبيه</div></div>
                    </div>
                  ) : (
                    <div className="space-y-2">{inspections.slice(0,3).map((it:any)=><div key={it.id} className="border rounded-xl p-3 text-sm flex justify-between"><span>{it.inspection_number||it.id}</span><Badge>{it.status||it.compliance_status}</Badge></div>)}</div>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <ServiceMarketplace onSelect={()=>{}} />

              <Card>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm"><Bell className="w-5 h-5 text-amber-600"/> مهامي ومواعيدي</div>
                  <div className="space-y-2 text-sm">
                    {[
                      { t:'تصحيح مخالفة سلامة', d:'ينتهي خلال 3 أيام', c:'critical' },
                      { t:'تجديد 4 عقود عمل', d:'خلال 30 يوم', c:'warning' },
                      { t:'رفع شهادة لياقة منتهية', d:'متأخر', c:'critical' },
                      { t:'الرد على شكوى عامل', d:'SLA 15 يوم — باقي 6', c:'warning' },
                    ].map(x=>(
                      <div key={x.t} className="flex items-center justify-between p-2.5 border rounded-xl">
                        <div><div className="font-medium">{x.t}</div><div className="text-xs text-muted-foreground">{x.d}</div></div>
                        <Badge variant={x.c==='critical'?'destructive':'secondary'}>{x.c==='critical'?'عاجل':'متابعة'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm"><Scale className="w-5 h-5 text-indigo-600"/> نزاعاتي وقضاياي</div>
                  {cases.length===0 ? (
                    <div className="text-xs text-muted-foreground">لا توجد قضايا مفتوحة — سيظهر هنا أي شكوى/نزاع/اعتراض مع الـ SLA والتنبيه قبل التأخر</div>
                  ) : cases.slice(0,3).map((c:any)=><div key={c.id} className="border rounded-xl p-3 text-sm"><div className="font-medium">{c.subject||c.case_number}</div><div className="text-xs text-muted-foreground">{c.status} • {c.sla_status}</div></div>)}
                </div>
              </Card>

              <Card>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm"><HeartPulse className="w-5 h-5 text-rose-600"/> السلامة والإصابات</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center"><div className="font-black text-lg">0</div><div>إصابات هذا الشهر</div></div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center"><div className="font-black text-lg">2</div><div>مخاطر تحتاج تقييم</div></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1"><FileText className="w-4 h-4 ml-1"/>الإبلاغ عن إصابة</Button>
                    <Button size="sm" variant="outline" className="flex-1"><TrendingUp className="w-4 h-4 ml-1"/>تقرير OSH</Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm flex items-center gap-2"><Building2 className="w-4 h-4"/> منشآتي وفروعها — السجل الرسمي</div>
                    <Button size="sm" variant="gold" onClick={() => setShowReg(true)}>طلب تسجيل</Button>
                  </div>

                  {linkedEst ? (
                    <div className="border border-emerald-300/50 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">{linkedEst.name_ar}</p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5" dir="ltr">{linkedEst.national_number}</p>
                        </div>
                        <Badge variant={linkedEst.status === 'active' ? 'default' : 'secondary'}>{linkedEst.status_label || linkedEst.status}</Badge>
                      </div>
                      {/* الفروع */}
                      <div className="space-y-1.5 pt-1">
                        {branches.length > 0 && <p className="text-[10px] font-black text-muted-foreground">الفروع ({branches.length})</p>}
                        {branches.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-accent">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.is_active ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                              <span className="truncate">{b.branch_name}</span>
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground shrink-0" dir="ltr">{b.national_number}</span>
                          </div>
                        ))}
                      </div>
                      {/* إضافة فرع سريع */}
                      <div className="flex gap-1.5 pt-1">
                        <input
                          value={newBranch}
                          onChange={(e) => setNewBranch(e.target.value)}
                          placeholder="اسم فرع جديد..."
                          className="flex-1 px-2.5 py-1.5 border border-border rounded-lg text-[11px] bg-card focus:ring-2 focus:ring-blue-500 outline-none"
                          aria-label="اسم الفرع الجديد"
                        />
                        <Button size="sm" variant="outline" onClick={addBranch} disabled={!newBranch.trim() || addingBranch}>إضافة</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>لم تُربط حسابك بمنشأة من السجل الرسمي بعد.</p>
                      <Button size="sm" variant="gold" onClick={() => setShowReg(true)}>
                        <Building2 className="w-4 h-4 ml-1" /> بحث عن منشأتي أو تسجيل طلب جديد
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <div className="p-4">
              <div className="font-bold text-sm mb-2">التحقق الخارجي — السجل التجاري (ذكي)</div>
              <IntegrationAware code="commercial_register" payload={{ commercial_register: establishments[0]?.commercial_register_number || 'CR-123' }}>
                {(res)=> <div className="text-xs">النتيجة: {res.valid?'مطابق':'غير مطابق'} — {res.owner||''} {res.source==='mock' && '(محاكاة — يعمل بدون ربط)'}</div>}
              </IntegrationAware>
            </div>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SmartChronology type="establishment" id={establishments[0]?.id || '00000000-0000-0000-0000-000000000000'} />
            <InteractionHub caseId={cases[0]?.id} />
          </div>
          <div className="flex justify-center"><OfflineIndicator /></div>
        </>
      )}

      {/* ===== السيناريو التشغيلي ===== */}
      {tab === 'journey' && <EmployerJourney />}

      {/* ===== الخدمة الذاتية ===== */}
      {tab === 'self-service' && (
        <SelfServiceCenter onGoAssessment={() => setTab('assessment')} />
      )}

      {/* ===== التقييم الذاتي ===== */}
      {tab === 'assessment' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SelfAssessment />
          </div>
          <div className="space-y-4">
            <EvidenceUploader />
          </div>
        </div>
      )}

      {/* نموذج التسجيل في السجل الرسمي */}
      <EstablishmentRegistration
        open={showReg}
        onClose={() => setShowReg(false)}
        onSuccess={(r) => {
          // بعد النجاح: اربط المنشأة الجديدة فوراً بالبطاقة
          if (r.id) {
            const est = {
              id: r.id,
              establishment_id: r.establishment_id,
              name_ar: r.name_ar || 'طلب تسجيل جديد',
              national_number: r.national_number,
              status: 'under_review',
              status_label: 'طلب بانتظار الموافقة',
            };
            sessionStorage.setItem('linked_establishment', JSON.stringify(est));
            setLinkedEst(est);
          }
        }}
      />

      <div className="text-[11px] text-muted-foreground text-center border-t pt-3">
        🔒 Zero Trust • RBAC/ABAC + Jurisdiction • كل إجراء يُسجل مع before/after وIP وEvidence Hash • الأداء: pagination + caching • Offline Field Mode للمفتش • مزمنة دقيقة 100%
      </div>
    </div>
  );
}
