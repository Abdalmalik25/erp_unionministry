/**
 * DataQualityCenter — مركز جودة البيانات الوطني
 */
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/badge";
import { ShieldCheck, Search, AlertTriangle, Users, Building2, FileWarning } from "lucide-react";

export default function DataQualityCenter(){
  const [findings,setFindings]=useState<any[]>([]);
  const [scanning,setScanning]=useState(false);
  const load=async()=>{
    const r=await fetch('/api/v1/data-quality/findings');
    const j=await r.json();
    setFindings(j.data?.data||j.data||[]);
  };
  useEffect(()=>{ load(); },[]);
  const scan=async()=>{
    setScanning(true);
    const r=await fetch('/api/v1/data-quality/scan', { method:'POST', headers:{ Authorization:`Bearer ${localStorage.getItem('auth_token')||''}` }});
    const j=await r.json();
    setScanning(false);
    load();
    alert(`فحص مكتمل: ${j.total||0} نتيجة — ${j.note||''}`);
  };
  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 text-white rounded-2xl p-6">
        <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold"><ShieldCheck className="w-4 h-4"/> مركز جودة البيانات — Data Quality Center</div>
        <h1 className="text-2xl font-black mt-1">نظافة البيانات = ثقة القرار</h1>
        <p className="text-sm text-emerald-100 mt-1">كشف التكرار • الأيتام • الأكواد غير الصالحة • التعارض التاريخي — كل نتيجة → Case للتنظيف</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={scan} disabled={scanning} className="bg-white text-slate-900 hover:bg-slate-100"><Search className="w-4 h-4 ml-1"/>{scanning?'جاري الفحص...':'فحص شامل الآن'}</Button>
          <Badge className="bg-white/15 text-white border-white/20">{findings.length} نتيجة مفتوحة</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
        <Card><div className="p-4 text-center"><Users className="w-6 h-6 mx-auto text-indigo-600"/><div className="font-bold">تكرار الأشخاص</div><div className="text-muted-foreground">national_id مكرر — ONE PERSON ONE IDENTITY</div></div></Card>
        <Card><div className="p-4 text-center"><Building2 className="w-6 h-6 mx-auto text-blue-600"/><div className="font-bold">تكرار المنشآت</div><div className="text-muted-foreground">entity_number + السجل</div></div></Card>
        <Card><div className="p-4 text-center"><FileWarning className="w-6 h-6 mx-auto text-amber-600"/><div className="font-bold">أيتام وعقود بأكواد غير صالحة</div><div className="text-muted-foreground">orphan_contract / invalid_code</div></div></Card>
      </div>

      <Card>
        <div className="p-5 space-y-3">
          <div className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600"/> النتائج (آخر 50)</div>
          {findings.length===0? <div className="text-sm text-muted-foreground text-center py-8">لا توجد نتائج — البيانات نظيفة أو لم يُجرَ فحص بعد</div> :
            <div className="space-y-2">
              {findings.slice(0,20).map((f:any)=>(
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-xl">
                  <div><div className="font-medium text-sm">{f.check_type}</div><div className="text-xs text-muted-foreground truncate max-w-[420px]">{JSON.stringify(f.details||{}).slice(0,140)}</div></div>
                  <Badge variant={f.severity==='critical'?'destructive':f.severity==='warning'?'default':'secondary'}>{f.severity}</Badge>
                </div>
              ))}
            </div>
          }
        </div>
      </Card>
    </div>
  );
}
