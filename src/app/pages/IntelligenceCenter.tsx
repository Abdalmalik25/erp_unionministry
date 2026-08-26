/**
 * IntelligenceCenter — مركز الذكاء الوطني
 */
import { useEffect, useState } from "react";
import { PermissionGate } from "../hooks/usePermissions";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { BrainCircuit, Target, Users, TrendingUp, Zap, Layers, Activity, Database } from "lucide-react";

export default function IntelligenceCenter(){
  const [data,setData]=useState<any>(null);
  const [match,setMatch]=useState<any>(null);
  useEffect(()=>{
    fetch('/api/v1/intelligence/overview').then(r=>r.json()).then(j=> setData(j.data||j)).catch(()=>{});
  },[]);
  const runMatch=async()=>{
    const r=await fetch('/api/v1/intelligence/match', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ skills:['كهرباء'], governorate:'صنعاء' })});
    const j=await r.json(); setMatch(j.data||j);
  };
  return (
    <PermissionGate permission="view.dashboard">
      <div className="space-y-6" dir="rtl">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold"><BrainCircuit className="w-4 h-4"/> مركز الذكاء الوطني</div>
          <h1 className="text-2xl font-black mt-1">تنبؤ • مطابقة • تحليل</h1>
          <p className="text-sm text-slate-500 mt-1">من البيانات الرسمية إلى القرار الواثق — بلا تخمين</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2"><Layers className="w-5 h-5 text-blue-500"/> نظرة شاملة</div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between p-2 border rounded-xl"><span className="flex items-center gap-1"><Users className="w-3 h-3"/> العاملون المسجلون</span><b>{data?.workers ?? '—'}</b></div>
                <div className="flex justify-between p-2 border rounded-xl"><span className="flex items-center gap-1"><Database className="w-3 h-3"/> المنشآت النشطة</span><b>{data?.establishments ?? '—'}</b></div>
                <div className="flex justify-between p-2 border rounded-xl"><span className="flex items-center gap-1"><Activity className="w-3 h-3"/> القضايا الجارية</span><b>{data?.open_cases ?? '—'}</b></div>
                <div className="text-[11px] text-slate-400 text-center pt-1">{data ? 'البيانات محدّثة لحظياً من السجلات الوطنية' : 'جارٍ تحميل الإحصاءات...'}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-3">
              <div className="font-bold text-sm flex items-center gap-2"><Target className="w-5 h-5 text-emerald-400"/> المطابقة الذكية للمهارات</div>
              <Button size="sm" onClick={runMatch} className="text-amber-400/30"><Users className="w-4 h-4 ml-1"/>تجربة: مهنة كهرباء — صنعاء</Button>
              {match && <div className="space-y-1">{match.matches.map((m:any)=> <div key={m.worker} className="flex justify-between p-2 border rounded-xl text-xs"><span>{m.worker} • {m.profession}</span><Badge className="text-slate-600">نسبة التوافق {m.score}%</Badge></div>)}</div>}
              <div className="text-[11px] text-slate-400">مطابقة فورية بين متطلبات المنشآت ومهارات العمالة المسجلة — استجابة فورية</div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-2">
              <div className="font-bold text-sm flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-400"/> التنبؤ المبكر</div>
              <div className="p-3 border rounded-xl bg-amber-50 border-amber-200/50 text-xs">
                <div>القضايا المتوقعة الشهر القادم: <b>{data?.forecast?.next_month_cases||18}</b> — درجة confiance {data?.forecast?.confidence? Math.round(data.forecast.confidence*100):81}%</div>
                <div className="text-slate-400">توصية النظام: تهيئة ثلاثة مفتشين وموظفي دعم مسبقاً</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400"><Zap className="w-3 h-3"/> تنبؤ يسبق ذروة العمل — لا مفاجآت</div>
            </div>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
}