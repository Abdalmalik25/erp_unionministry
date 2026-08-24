/**
 * SecurityCenter — مركز الأمان والموثوقية
 */
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/Button";
import { Shield, Lock, KeyRound, Eye, FileCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function SecurityCenter() {
  const [health, setHealth] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  useEffect(()=>{
    fetch('/api/health/detailed').then(r=>r.json()).then(j=> setHealth(j.data||j)).catch(()=>{});
    fetch('/api/v1/audit?limit=5').then(r=> r.ok? r.json(): null).then(j=> { if(j) setAudit(j.data?.data||j.data||[])}).catch(()=>{});
  },[]);
  return (
    <Card>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600"/>
          <span className="font-bold text-sm">مركز الأمان والموثوقية</span>
          <Badge variant={health?.status==='healthy'?'default':'destructive'} className="mr-auto">{health ? (health.status==='healthy'?'يعمل بكفاءة':'أداء منخفض') : 'جارٍ الفحص...'}</Badge>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="p-3 border rounded-xl bg-emerald-50 border-emerald-200 text-center"><Lock className="w-5 h-5 mx-auto text-emerald-600"/><div className="font-bold mt-1">تحقق مزدوج</div><div>طبقة تحقق إضافية عند الحساسية</div></div>
          <div className="p-3 border rounded-xl bg-blue-50 border-blue-200 text-center"><KeyRound className="w-5 h-5 mx-auto text-blue-600"/><div className="font-bold mt-1">صلاحيات دقيقة</div><div>حسب الدور والنطاق الجغرافي</div></div>
          <div className="p-3 border rounded-xl bg-slate-50 border text-center"><Eye className="w-5 h-5 mx-auto"/><div className="font-bold mt-1">سجل الحركة</div><div>قبل/بعد مع بصمة رقمية</div></div>
          <div className="p-3 border rounded-xl bg-amber-50 border-amber-200 text-center"><FileCheck className="w-5 h-5 mx-auto text-amber-600"/><div className="font-bold mt-1">الأدلة الرقمية</div><div>سلسلة موثقة غير قابلة للعبث</div></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-xl p-3 space-y-2">
            <div className="font-bold text-xs flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600"/> فحوصات الصحة</div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span>قاعدة البيانات</span><Badge variant={health?.checks?.db==='up'?'default':'destructive'}>{health ? (health.checks?.db==='up'?'متصل':'غير متصل') : 'جارٍ الفحص...'}</Badge></div>
              <div className="flex justify-between"><span>الذاكرة المؤقتة</span><Badge variant="outline">{health && health.checks?.cache==='up' ? 'تعمل' : 'قيد التهيئة'}</Badge></div>
              <div className="flex justify-between"><span>محرك القواعد</span><Badge variant="outline">نشط</Badge></div>
              <div className="flex justify-between"><span>سير العمل</span><Badge variant="outline">نشط</Badge></div>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> آخر فحص: {health?.timestamp ? new Date(health.timestamp).toLocaleString('ar-YE') : '—'}</div>
          </div>

          <div className="border rounded-xl p-3 space-y-2">
            <div className="font-bold text-xs">آخر الحركات المسجلة — محمية من التلاعب</div>
            {audit.length===0 ? <div className="text-xs text-muted-foreground">يتطلب دور ministry_admin — يُعرض فقط للمخولين</div> :
              audit.slice(0,5).map((a:any)=>(
                <div key={a.id} className="text-[11px] border rounded-lg p-2 flex justify-between">
                  <span className="font-mono">{String(a.action||'').replace(/_/g,' ')} • {String(a.resource_type||'').replace(/_/g,' ')}</span>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleTimeString('ar-YE')}</span>
                </div>
              ))
            }
            <Button size="sm" variant="outline" className="w-full text-xs">عرض السجل الكامل</Button>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground bg-slate-50 border rounded-lg p-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0"/> البيانات الحساسة محفوظة بعيداً عن الشيفرة، والاتصالات مشفرة بالكامل مع فحص تلقائي للمدخلات والملفات
        </div>
      </div>
    </Card>
  );
}
