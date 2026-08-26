/**
 * IntegrationAware — غلاف ذكي: يعمل متصل/منفصل — كفاءة واعتمادية
 * يظهر حالة الطرف الخارجي ويستخدم mock/cache عند عدم الربط
 */
import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Wifi, WifiOff, Database, Clock } from "lucide-react";

export function IntegrationAware({ code, payload, children, fallback }: { code: string; payload: any; children: (result:any, meta:any)=>React.ReactNode; fallback?: React.ReactNode }){
  const [state,setState]=useState<{mode:string; result:any; took?:number; cached?:boolean; queued?:boolean}|null>(null);
  const [loading,setLoading]=useState(true);
  const payloadKey = JSON.stringify(payload || {});
  useEffect(()=>{
    let cancelled=false;
    fetch(`/api/v1/integrations/${code}/verify`, { method:'POST', headers:{'Content-Type':'application/json'}, body: payloadKey })
      .then(r=>r.json()).then(j=>{
        if(cancelled) return;
        const d=j.data||j;
        setState({ mode:d.mode, result:d.result, took:d.took_ms, cached:d.cached, queued:d.queued });
        setLoading(false);
      }).catch(()=> setLoading(false));
    return ()=>{ cancelled=true; };
  },[code, payloadKey]);
  if(loading) return <div className="p-3 border rounded-xl bg-slate-50 text-xs flex items-center gap-2"><Clock className="w-4 h-4 animate-spin"/> جاري التحقق {code}...</div>;
  const meta = { mode: state?.mode, took: state?.took, cached: state?.cached, queued: state?.queued };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px]">
        {state?.mode==='mock' && <><Database className="w-3 h-3 text-amber-600"/><Badge variant="secondary" className="text-[10px]">محاكاة — يعمل بدون ربط</Badge></>}
        {state?.mode==='cache' && <><Database className="w-3 h-3 text-blue-600"/><Badge variant="outline" className="text-[10px]">كاش 5د — {state.took}ms</Badge></>}
        {state?.mode==='fallback' && <><WifiOff className="w-3 h-3 text-amber-600"/><Badge className="bg-amber-600 text-[10px]">سقوط آمن — مؤجل</Badge></>}
        {state?.mode==='live' && <><Wifi className="w-3 h-3 text-emerald-600"/><Badge className="bg-emerald-600 text-[10px]">متصل {state.took}ms</Badge></>}
        {state?.queued && <Badge variant="outline" className="text-[10px]">مؤجل للمزامنة</Badge>}
        <span className="text-muted-foreground">الطرف: {code}</span>
      </div>
      {children(state?.result, meta)}
      {!state?.result?.valid && fallback}
    </div>
  );
}
