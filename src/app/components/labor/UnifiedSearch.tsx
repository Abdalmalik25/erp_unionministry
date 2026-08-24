/**
 * UnifiedSearch — البحث الوطني الموحد
 */
import { useState, useEffect, useRef } from "react";
import { Search, Building2, Users, GitBranch, Scale, BookOpen, Clock } from "lucide-react";
import { Badge } from "../ui/badge";

type Hit = { type: string; id: string; title: string; subtitle?: string; status?: string };

export function UnifiedSearch({ onPick }: { onPick?: (h:Hit)=>void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useEffect(()=>{
    if (q.trim().length < 2) { setHits([]); setMeta(null); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async()=>{
      setLoading(true);
      const cid = `srch-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const r = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { headers: { 'x-correlation-id': cid } });
      const j = await r.json();
      const data = j.data || j;
      setHits(data.results || []);
      setMeta({ took: data.took_ms, correlationId: data.correlationId || cid, query: data.query });
      setLoading(false);
    }, 350);
    return ()=> clearTimeout(timer.current);
  }, [q]);

  const icon: any = { establishment: Building2, worker: Users, union: GitBranch, case: Scale, legal: BookOpen };

  return (
    <div className="border rounded-2xl bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-blue-600"/>
        <span className="font-bold text-sm">البحث الوطني الموحد</span>
        <Badge variant="outline" className="text-[10px]">بحث موثق ومسجل</Badge>
        {meta && <span className="text-[11px] text-muted-foreground">— استجابة فورية ({meta.took} من الثانية)</span>}
      </div>
      <div className="relative">
        <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400"/>
        <input value={q} onChange={e=> setQ(e.target.value)} placeholder="ابحث عن منشأة / عامل / نقابة / قضية / مادة قانونية..." className="w-full pr-9 pl-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="البحث الوطني"/>
        {loading && <span className="absolute left-3 top-3 text-xs text-muted-foreground">جاري...</span>}
      </div>
      {hits.length>0 && (
        <div className="max-h-72 overflow-auto divide-y border rounded-xl">
          {hits.map(h=>{
            const Icon = icon[h.type] || Search;
            return (
              <button key={`${h.type}-${h.id}`} onClick={()=> onPick?.(h)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-right">
                <Icon className="w-4 h-4 text-slate-500 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{h.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{h.subtitle || ''}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{ {establishment:'منشأة', worker:'عامل', union:'نقابة', case:'قضية', legal:'مرجع نظامي'}[h.type] || h.type }</Badge>
                {h.status && <Badge variant="secondary" className="text-[10px]">{h.status}</Badge>}
              </button>
            );
          })}
        </div>
      )}
      {q.length>=2 && hits.length===0 && !loading && <div className="text-center text-xs text-muted-foreground py-4">لا نتائج — جرّب كلمة أخرى أو غيّر النطاق</div>}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock className="w-3 h-3"/> بحث موحد عبر جميع السجلات الوطنية — كل عملية بحث موثقة في سجل الحركة</div>
    </div>
  );
}
