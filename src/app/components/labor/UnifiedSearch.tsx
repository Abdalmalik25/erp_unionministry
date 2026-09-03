/**
 * UnifiedSearch — البحث الوطني الموحد
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Building2, Users, GitBranch, Scale, BookOpen, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "../ui/badge";
import { usePermissions } from "../../hooks/usePermissions";
import { logAudit } from "../../utils/security";
import { toast } from "sonner";

type Hit = { type: string; id: string; title: string; subtitle?: string; status?: string };
type SearchMeta = { took?: number; correlationId: string; query: string; total?: number };

export function UnifiedSearch({ onPick }: { onPick?: (h:Hit)=>void }) {
  const { can } = usePermissions();
  const canSearch = can('dashboard:view') || can('reports:view') || can('entities:view') || can('members:view');
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSearch = useCallback(async (query: string, cid: string, attempt = 0): Promise<void> => {
    try {
      setError(null);
      const r = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}&limit=20`, { headers: { 'x-correlation-id': cid } });
      if (!r.ok) {
        const text = await r.text().catch(()=> '');
        throw new Error(text || `بحث فشل (${r.status})`);
      }
      const j = await r.json();
      const data = j.data || j;
      setHits(Array.isArray(data.results) ? data.results : []);
      setMeta({ took: data.took_ms, correlationId: data.correlationId || cid, query: data.query || query, total: data.total ?? data.results?.length });
      logAudit({ action: 'SEARCH', resource: 'unified_search', details: { query, took: data.took_ms, cid } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'فشل البحث';
      if (attempt < 2) {
        setTimeout(()=> fetchSearch(query, cid, attempt+1), 500 * (attempt+1));
        return;
      }
      setError(msg);
      toast.error(msg);
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{
    if (!canSearch) return;
    if (q.trim().length < 2) { setHits([]); setMeta(null); setError(null); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(()=>{
      setLoading(true);
      const cid = `srch-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      fetchSearch(q.trim(), cid);
    }, 350);
    return ()=> { if (timer.current) clearTimeout(timer.current); };
  }, [q, canSearch, fetchSearch]);

  const icon: Record<string, React.ComponentType<{ className?: string }>> = { establishment: Building2, worker: Users, union: GitBranch, case: Scale, legal: BookOpen };

  return (
    <div className="border rounded-2xl bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-blue-600"/>
        <span className="font-bold text-sm">البحث الوطني الموحد</span>
        <Badge variant="outline" className="text-[10px] flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>بحث موثق ومسجل</Badge>
        {meta && <span className="text-[11px] text-muted-foreground">— {meta.total ?? hits.length} نتيجة • {meta.took ?? '—'}ms • <span className="font-mono text-[10px]">{meta.correlationId.slice(0,8)}</span></span>}
      </div>
      {!canSearch && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0"/> ليس لديك صلاحية البحث الموحد — تواصل مع إدارة الحسابات
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs" role="alert">
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> {error}</span>
          <button onClick={()=> { setError(null); setQ(q); }} className="px-2 py-1 rounded-lg bg-white border text-red-700 hover:bg-red-50">إعادة المحاولة</button>
        </div>
      )}
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
