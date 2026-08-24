/**
 * MinistryWorkspace — مساحة عمل الموظف الحكومي (Unified Tasks/Cases/Approvals)
 */
import { useEffect, useState } from "react";
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

  useEffect(()=>{
    fetch('/api/v1/cases?limit=8').then(r=>r.json()).then(j=> setCases(j.data?.data||j.data||[])).catch(()=>{});
    fetch('/api/v1/sla/overview').then(r=>r.json()).then(j=> setSla(j.data||j)).catch(()=>{});
    fetch('/api/dashboard/enhanced-stats').then(r=>r.json()).then(j=> setStats(j.data||j)).catch(()=>{});
  },[]);

  const myTasks = [
    { id:'t1', title:'مراجعة عقد عمل — فني صيانة', type:'موافقة', due:'خلال يومين', prio:'high' },
    { id:'t2', title:'اعتماد شهادة خبرة — عامل', type:'مصادقة', due:'اليوم', prio:'urgent' },
    { id:'t3', title:'تفتيش ميداني — منشأة 1024', type:'تفتيش', due:'غداً 09:00', prio:'medium' },
    { id:'t4', title:'جلسة صلح — نزاع 2026/41', type:'جلسة', due:'2026/08/25', prio:'high' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div>
            <div className="text-amber-300 text-xs font-bold flex items-center gap-1"><ClipboardCheck className="w-4 h-4"/> مساحة عمل الموظف — Ministry Workspace</div>
            <h1 className="text-2xl font-black">أهلاً {user?.name}</h1>
            <p className="text-sm text-slate-200">مهامي • قضاياي • موافقاتي • تنبيهات SLA • مراسلات • تفتيش — كل شيء في مكان واحد</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" size="sm"><Bell className="w-4 h-4 ml-1"/>التنبيهات الذكية</Button><Button size="sm" className="bg-amber-500 hover:bg-amber-600">بدء معاملة</Button></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-slate-300">مهامي اليوم</div><div className="text-xl font-black">7</div><div className="text-xs text-amber-300">2 عاجلة</div></div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-slate-300">قضايا مسندة</div><div className="text-xl font-black">{cases.length || 12}</div><div className="text-xs">4 قيد المعالجة</div></div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-slate-300">SLA معرض للخطر</div><div className="text-xl font-black text-amber-300">{sla?.overdue?.length ?? 3}</div><div className="text-xs">ينبه قبل التأخر</div></div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-slate-300">موافقات معلقة</div><div className="text-xl font-black">5</div><div className="text-xs">عقود + تراخيص</div></div>
          <div className="bg-white/10 border border-white/15 rounded-xl p-3 text-center"><div className="text-xs text-slate-300">تفتيش هذا الأسبوع</div><div className="text-xl font-black">3</div><div className="text-xs">موزعة جغرافياً</div></div>
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
                {(cases.length?cases:[
                  { id:'1', case_number:'CASE-2026-041', subject:'شكوى تأخر أجور — مصنع', case_type:'complaint', priority:'high', status:'in_progress', sla_status:'at_risk' },
                  { id:'2', case_number:'CASE-2026-038', subject:'نزاع فصل تعسفي', case_type:'dispute', priority:'urgent', status:'hearing', sla_status:'on_track' },
                  { id:'3', case_number:'CASE-2026-033', subject:'اعتراض على تفتيش', case_type:'appeal', priority:'medium', status:'open', sla_status:'overdue' },
                ] as any).slice(0,5).map((c:any)=>(
                  <div key={c.id||c.case_number} className="p-3 border rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{c.subject || c.case_number}</div>
                      <div className="text-xs text-muted-foreground">{c.case_type} • {c.case_number} • {c.status}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant={c.priority==='urgent'?'destructive':c.priority==='high'?'default':'secondary'}>{c.priority}</Badge>
                      <Badge variant={c.sla_status==='overdue'?'destructive':c.sla_status==='at_risk'?'default':'outline'}>{c.sla_status}</Badge>
                    </div>
                  </div>
                ))}
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
              <div className="flex items-center gap-2 font-bold text-sm"><ClipboardCheck className="w-5 h-5 text-emerald-600"/> تفتيش — Risk-Based</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 border rounded-xl"><div className="font-bold">مخاطرة عالية</div><div>منشأة — 3 مخالفات سابقة + شكوى</div><Badge className="mt-2 bg-rose-600">أولوية 1</Badge></div>
                <div className="p-3 border rounded-xl"><div className="font-bold">متوسطة</div><div>تفتيش دوري مجدول</div><Badge variant="secondary" className="mt-2">أولوية 2</Badge></div>
                <div className="p-3 border rounded-xl"><div className="font-bold">منخفضة</div><div>التزام 92 — زيارة توعية</div><Badge variant="outline" className="mt-2">أولوية 3</Badge></div>
              </div>
              <div className="text-[11px] text-muted-foreground">Risk ≠ حكم قانوني — للترتيب فقط ما لم ينص القانون خلاف ذلك • الأدلة تُرفع مع Hash</div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card><div className="p-5 space-y-3">
            <div className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600"/> تنبيهات SLA</div>
            <div className="space-y-2 text-sm">
              <div className="p-2.5 border rounded-xl bg-amber-50 border-amber-200 flex justify-between"><span>شكوى 041 — باقي 2 يوم</span><Badge variant="default">at_risk</Badge></div>
              <div className="p-2.5 border rounded-xl bg-rose-50 border-rose-200 flex justify-between"><span>اعتراض 033 — متأخر</span><Badge variant="destructive">overdue</Badge></div>
              <div className="p-2.5 border rounded-xl bg-emerald-50 border-emerald-200 flex justify-between"><span>تفتيش — يلتزم بالموعد</span><Badge variant="outline">on_track</Badge></div>
            </div>
          </div></Card>

          <Card><div className="p-5 space-y-3">
            <div className="font-bold text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600"/> موافقات سريعة</div>
            <div className="space-y-2 text-sm">
              {[
                { t:'عقد عمل أجنبي — ترخيص 14', d:'المادة 15 — تصريح ساري' },
                { t:'تسجيل نقابة — النظام الأساسي', d:'قيد المراجعة القانونية' },
                { t:'تجديد ترخيص منشأة', d:'وثائق مكتملة — SLA 3 أيام' },
              ].map(x=>(
                <div key={x.t} className="p-2.5 border rounded-xl flex justify-between items-center">
                  <div><div className="font-medium">{x.t}</div><div className="text-xs text-muted-foreground">{x.d}</div></div>
                  <Button size="sm" variant="outline">مراجعة</Button>
                </div>
              ))}
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
  );
}
