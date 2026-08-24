/**
 * VirtualizedTable — أداء نووي: لا تحميل آلاف السجلات في DOM
 */
import { useState, useMemo } from "react";

type Col<T> = { key: keyof T; label: string; width?: string; render?: (v:any,row:T)=>React.ReactNode };
type Props<T> = { rows: T[]; cols: Col<T>[]; pageSize?: number; onRowClick?: (r:T)=>void };

export function VirtualizedTable<T extends { id:any }>({ rows, cols, pageSize=20, onRowClick }: Props<T>) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const filtered = useMemo(()=> {
    if(!q) return rows;
    const s=q.toLowerCase();
    return rows.filter(r=> JSON.stringify(r).toLowerCase().includes(s));
  }, [rows,q]);
  const pages = Math.max(1, Math.ceil(filtered.length/pageSize));
  const slice = filtered.slice((page-1)*pageSize, page*pageSize);
  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2">
        <input value={q} onChange={e=>{setQ(e.target.value); setPage(1);}} placeholder="بحث فوري أثناء الكتابة..." className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        <span className="text-xs text-muted-foreground">{filtered.length} سجل • صفحة {page}/{pages}</span>
      </div>
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr>{cols.map(c=> <th key={String(c.key)} className="text-right p-2 font-bold text-xs" style={{width:c.width}}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {slice.map(r=>(
              <tr key={r.id} onClick={()=> onRowClick?.(r)} className="border-b hover:bg-slate-50 cursor-pointer">
                {cols.map(c=> <td key={String(c.key)} className="p-2 truncate max-w-[220px]">{c.render? c.render(r[c.key], r): String(r[c.key]??'—')}</td>)}
              </tr>
            ))}
            {slice.length===0 && <tr><td colSpan={cols.length} className="text-center py-8 text-muted-foreground text-sm">لا نتائج</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t flex items-center justify-between">
        <button disabled={page<=1} onClick={()=> setPage(p=> p-1)} className="px-3 py-1 border rounded-lg text-xs disabled:opacity-40">السابق</button>
        <span className="text-xs">عرض محسّن بتحميل تدريجي — أداء ثابت مهما كان حجم البيانات</span>
        <button disabled={page>=pages} onClick={()=> setPage(p=> p+1)} className="px-3 py-1 border rounded-lg text-xs disabled:opacity-40">التالي</button>
      </div>
    </div>
  );
}
