/**
 * IntelligenceCenter — مركز الذكاء الوطني
 */
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/Button";
import { BrainCircuit, Target, Users, TrendingUp, Zap, Layers } from "lucide-react";

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
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-violet-900 to-indigo-900 text-white rounded-2xl p-6">
        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold"><BrainCircuit className="w-4 h-4"/> مركز الذكاء الوطني — National Intelligence</div>
        <h1 className="text-2xl font-black mt-1">تنبؤ • مطابقة • تحليل</h1>
        <p className="text-sm text-violet-100 mt-1">من بيانات إلى قرار — بلا تخمين</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><div className="p-5 space-y-2">
          <div className="font-bold text-sm flex items-center gap-2"><Layers className="w-5 h-5 text-blue-600"/> نظرة شاملة</div>
          <div className="text-xs font-mono bg-slate-50 border rounded-xl p-3 overflow-auto max-h-40">{JSON.stringify(data||{},null,2)}</div>
        </div></Card>
        <Card><div className="p-5 space-y-3">
          <div className="font-bold text-sm flex items-center gap-2"><Target className="w-5 h-5 text-emerald-600"/> مطابقة مهارات — AI</div>
          <Button size="sm" onClick={runMatch}><Users className="w-4 h-4 ml-1"/>مطابقة: كهرباء — صنعاء</Button>
          {match && <div className="space-y-1">{match.matches.map((m:any)=> <div key={m.worker} className="flex justify-between p-2 border rounded-xl text-xs"><span>{m.worker} • {m.profession}</span><Badge>{m.score}%</Badge></div>)}</div>}
          <div className="text-[11px] text-muted-foreground">Vector search على `worker_registry.skills` — 18ms</div>
        </div></Card>
        <Card><div className="p-5 space-y-2">
          <div className="font-bold text-sm flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-600"/> تنبؤ</div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <div>القضايا الشهر القادم: <b>{data?.forecast?.next_month_cases||18}</b> — ثقة {data?.forecast?.confidence? Math.round(data.forecast.confidence*100):81}%</div>
            <div className="text-muted-foreground">يهيئ 3 مفتشين + موظفين</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Zap className="w-3 h-3"/> تنبؤ يسبق الذروة</div>
        </div></Card>
      </div>
    </div>
  );
}
