/**
 * MinistryWorkspace — مساحة عمل الموظف الحكومي (Unified Tasks/Cases/Approvals)
 */
import { useEffect, useMemo, useState } from "react";
import { PermissionGate } from "../hooks/usePermissions";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { ClipboardCheck, Scale, Bell, Clock, FileText, AlertTriangle, CheckCircle2, Timer, Building2, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { SmartChronology } from "../components/labor/SmartChronology";
import { InteractionHub } from "../components/labor/InteractionHub";
import { OfflineIndicator } from "../components/labor/OfflineIndicator";

type CaseItem = { id: string; case_number: string; subject: string; case_type: string; priority: string; status: string; sla_status: string; sla_deadline?: string };

export default function MinistryWorkspace() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [sla, setSla] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const approvals = useMemo<unknown[]>(() => [], []);
  const inspections = useMemo<unknown[]>(() => [], []);

  useEffect(()=>{
    fetch('/api/v1/cases?limit=8').then(r=>r.json()).then(j=> setCases(j.data?.data||j.data||[])).catch(()=>{});
    fetch('/api/v1/sla/overview').then(r=>r.json()).then(j=> setSla(j.data||j)).catch(()=>{});
    fetch('/api/dashboard/enhanced-stats').then(r=>r.json()).then(j=> setStats(j.data||j)).catch(()=>{});
  },[]);

  const myTasks = useMemo<{ id: string; title: string; type: string; due: string; prio: string }[]>(() => {
    return [];
  }, []);

  return (
    <PermissionGate permission="view.dashboard">
      <div className="space-y-6" dir="rtl">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
          <div className="flex flex-wrap justify-between gap-4 items-center">
            <div>
              <div className="text-amber-300 text-xs font-bold flex items-center gap-1"><ClipboardCheck className="w-4 h-4"/> مساحة عمل الموظف — Ministry Workspace</div>
              <h1 className="text-2xl font-black">أهلاً {user?.name}</h1>
              <p className="text-sm text-slate-600">مهامي • قضاياي • موافقات • تنبيهات مهل الإنجاز • مراسلات • تفتيش — كل شيء في مكان واحد</p>
            </div>
            <div className="flex gap-2"><Button variant="secondary" size="sm"><Bell className="w-4 h-4 ml-1"/>التنبيهات الذكية</Button><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">بدء معاملة</Button></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
            <div className="p-3 rounded-xl border border-slate-200 text-center"><div className="text-xs text-slate-500">مهامي اليوم</div><div className="text-xl font-black">{myTasks.length || '—'}</div><div className="text-xs text-amber-400">حسب الأولوية والـ SLA</div></div>
            <div className="p-3 rounded-xl border border-slate-200 text-center"><div className="text-xs text-slate-500">قضايا مسندة</div><div className="text-xl font-black">{cases.length || '—'}</div><div className="text-xs text-slate-400">قيد المعالجة</div></div>
            <div className="p-3 rounded-xl border border-slate-200 text-center"><div className="text-xs text-slate-500">SLA معرض للخطر</div><div className="text-xl font-black text-amber-400">{sla?.overdue?.length ?? '—'}</div><div className="text-xs text-slate-400">ينبه قبل التأخر</div></div>
            <div className="p-3 rounded-xl border border-slate-200 text-center"><div className="text-xs text-slate-500">موافقات معلقة</div><div className="text-xl font-black">{approvals.length || '—'}</div><div className="text-xs text-slate-400">عقود + تراخيص</div></div>
            <div className="p-3 rounded-xl border border-slate-200 text-center"><div className="text-xs text-slate-500">تفتيش هذا الأسبوع</div><div className="text-xl font-black">{inspections.length || '—'}</div><div className="text-xs text-slate-400">موزعة جغرافياً</div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm"><Clock className="w-5 h-5 text-blue-600"/> مهامي — حسب الأولوية والـ SLA</div>
                  <Badge variant="outline"><Timer className="w-3 h-3 ml-1"/>يُنبه قبل الموعد</Badge>
                </div>
                <div className="space-y-2">
                  {myTasks.map(t=>(
                    <div key={t.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-sm">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.type} • {t.due}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={t.prio==='urgent'?'destructive':t.prio==='high'?'default':'secondary'}>{t.prio==='urgent'?'عاجل':t.prio==='high'?'هام':'عادي'}</Badge>
                        <Button size="sm" variant="outline">فتح</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm"><Scale className="w-5 h-5 text-indigo-600"/> قضاياي — Case Management</div>
                <div className="space-y-2">
                  {cases.length === 0 ? (
                    <div className="p-3 border rounded-xl text-sm text-muted-foreground">
                      لا توجد قضايا مسندة إليك حالياً.
                    </div>
                  ) : (
                    cases.slice(0, 5).map((c: any) => (
                      <div key={c.id || c.case_number} className="p-3 border rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{c.subject || c.case_number}</div>
                          <div className="text-xs text-muted-foreground">{c.case_type} • {c.case_number}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <Badge variant={c.priority==='urgent'?'destructive':c.priority==='high'?'default':'secondary'}>{ ({urgent:'عاجلة', high:'عالية', medium:'متوسطة', low:'منخفضة'} as Record<string,string>)[c.priority] || c.priority }</Badge>
                          <Badge variant={c.sla_status==='overdue'?'destructive':c.sla_status==='at_risk'?'default':'outline'}>{ ({on_track:'داخل المهلة', at_risk:'قارب الانتهاء', overdue:'تجاوز المهلة'} as Record<string,string>)[c.sla_status] || c.sla_status }</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm"><FileText className="w-4 h-4 ml-1"/>فتح القضية</Button>
                  <Button size="sm" variant="outline">إضافة إجراء</Button>
                  <Button size="sm" variant="outline">جدولة جلسة</Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm"><ClipboardCheck className="w-5 h-5 text-emerald-600"/> التفتيش المبني على المخاطر</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 border rounded-xl"><div className="font-bold">مخاطرة عالية</div><div>(تُحدَّد من سجل المخالفات والشكاوى)</div><Badge className="mt-2 bg-rose-600">أولوية 1</Badge></div>
                  <div className="p-3 border rounded-xl"><div className="font-bold">متوسطة</div><div>تفتيش دوري مجدول</div><Badge variant="secondary" className="mt-2">أولوية 2</Badge></div>
                  <div className="p-3 border rounded-xl"><div className="font-bold">منخفضة</div><div>زيارة توعوية</div><Badge variant="outline" className="mt-2">أولوية 3</Badge></div>
                </div>
                <div className="text-[11px] text-muted-foreground">درجة المخاطرة للترتيب والتخطيط فقط وليست حكماً قانونياً • الأدلة تُرفع ببصمة رقمية موثقة</div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card><div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600"/> تنبيهات SLA</div>
              <div className="space-y-2 text-sm">
                {(sla?.overdue ?? []).length === 0 && (sla?.atRisk ?? []).length === 0 ? (
                  <div className="p-2.5 border rounded-xl text-muted-foreground">
                    لا توجد مهل SLA معرّضة للخطر حالياً.
                  </div>
                ) : (
                  [
                    ...(sla?.overdue ?? []).map((x: any) => ({ text: x.case_number || 'قضية', badge: <Badge variant="destructive">تجاوز المهلة</Badge>, box: 'bg-rose-50 border-rose-200' })),
                    ...(sla?.atRisk ?? []).map((x: any) => ({ text: x.case_number || 'قضية', badge: <Badge variant="default">قارب الانتهاء</Badge>, box: 'bg-amber-50 border-amber-200' })),
                  ].map((x, i) => (
                    <div key={i} className={`p-2.5 border rounded-xl flex justify-between ${x.box}`}><span>{x.text}</span>{x.badge}</div>
                  ))
                )}
              </div>
            </div></Card>

            <Card><div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600"/> موافقات سريعة</div>
              <div className="space-y-2 text-sm">
                {approvals.length === 0 ? (
                  <div className="p-2.5 border rounded-xl text-muted-foreground">
                    لا توجد موافقات معلقة بانتظار مراجعتك حالياً.
                  </div>
                ) : (
                  approvals.map((x: any, i: number) => (
                    <div key={i} className="p-2.5 border rounded-xl flex justify-between items-center">
                      <div><div className="font-medium">{x.title ?? x}</div><div className="text-xs text-muted-foreground">{x.note ?? ''}</div></div>
                      <Button size="sm" variant="outline">مراجعة</Button>
                    </div>
                  ))
                )}
              </div>
            </div></Card>

            <Card><SmartChronology type="case" id={cases[0]?.id || '00000000-0000-0000-0000-000000000000'} /></Card>
            <InteractionHub caseId={cases[0]?.id} />
            <OfflineIndicator />
            <Card><div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2"><Building2 className="w-5 h-5 text-slate-700"/> نظرة وطنية (National View)</div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 bg-slate-50 border rounded-xl"><div className="font-black text-lg">{stats?.entities ?? '—'}</div><div>منشآت</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl"><div className="font-black text-lg">{stats?.totalActivities ?? stats?.total_activities ?? '—'}</div><div>أنشطة</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl"><div className="font-black text-lg flex justify-center gap-1"><Users className="w-4 h-4"/> {stats?.totalMembers ?? '—'}</div><div>عمال</div></div>
                <div className="p-3 bg-slate-50 border rounded-xl"><div className="font-black text-lg">{stats?.openViolations ?? '—'}</div><div>مخالفات</div></div>
              </div>
              <div className="text-[11px] text-muted-foreground">Drill-down: وطني → محافظة → مديرية → قطاع → نشاط → منشأة (مقنّع حسب الصلاحية)</div>
            </div></Card>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}