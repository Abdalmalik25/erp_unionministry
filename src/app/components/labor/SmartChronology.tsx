/**
 * SmartChronology — مزمنة ذكية دقيقة آمنة موثوقة سريعة
 * كل حدث: at (UTC) + actor + hash + type — لا تعديل صامت
 */
import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { Clock, ShieldCheck, Hash, User, FileText, AlertTriangle } from "lucide-react";

type Event = { at: string; action: string; actor: string; hash: string; type: string };

export function SmartChronology({ type, id }: { type: string; id: string }) {
  const [events,setEvents]=useState<Event[]>([]);
  const [loading,setLoading]=useState(true);
  const [took,setTook]=useState<number>(0);
  useEffect(()=>{
    fetch(`/api/v1/chronology/${type}/${id}`).then(r=>r.json()).then(j=>{
      const d=j.data||j;
      setEvents(d.events||[]);
      setTook(d.took_ms||0);
      setLoading(false);
    }).catch(()=> setLoading(false));
  },[type,id]);
  if(loading) return <div className="p-4 text-center text-sm">جاري تحميل المزمنة...</div>;
  return (
    <Card>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600"/>
          <span className="font-bold text-sm">المزمنة الذكية — {type} / {id.slice(0,8)}</span>
          <Badge variant="outline" className="text-[10px]"><ShieldCheck className="w-3 h-3 ml-1"/>موثقة • {took}ms</Badge>
          <Badge variant="secondary" className="text-[10px]">{events.length} حدث</Badge>
        </div>
        {events.length===0? <div className="text-sm text-muted-foreground text-center py-6">لا أحداث — بداية السجل</div> :
          <div className="relative border-r-2 border-slate-200 pr-4 space-y-3 max-h-[380px] overflow-auto">
            {events.map((e,i)=>(
              <div key={i} className="relative">
                <div className={`absolute -right-[9px] top-2 w-3 h-3 rounded-full border-2 border-white ${e.type==='violation'?'bg-rose-500': e.type==='contract'?'bg-blue-500': e.type==='inspection'?'bg-emerald-500':'bg-slate-400'}`}/>
                <div className="border rounded-xl p-3 bg-slate-50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3"/>{new Date(e.at).toLocaleString('ar-YE', { dateStyle:'short', timeStyle:'medium' })}
                    <Hash className="w-3 h-3 mr-2"/>{e.hash}
                    <User className="w-3 h-3 mr-1"/>{e.actor}
                  </div>
                  <div className="font-medium text-sm mt-1 flex items-center gap-1">
                    {e.type==='contract' && <FileText className="w-4 h-4 text-blue-600"/>}
                    {e.type==='violation' && <AlertTriangle className="w-4 h-4 text-rose-600"/>}
                    {e.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        }
        <div className="text-[11px] text-muted-foreground bg-slate-50 border rounded-lg p-2">كل حدث بختم UTC + hash + actor — يُحفظ في `workflow_transitions_log + audit_log` — لا تعديل صامت — قابل للتدقيق القضائي</div>
      </div>
    </Card>
  );
}
