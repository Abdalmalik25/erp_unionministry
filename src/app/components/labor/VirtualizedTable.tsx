/**
 * VirtualizedTable (Deprecated Wrapper)
 *
 * @deprecated This component is NOT virtualized despite its name.
 * Use `src/components/ui/VirtualizedTable` for actual virtual scrolling.
 * This wrapper is kept for backward compatibility with existing // Canonical mirror: src/app/components/ui/VirtualizedTable.tsx — keep in sync or re-export
imports.
 * Migrate to the proper VirtualizedTable from ui/ for large datasets.
 */
import { useState, useMemo, useCallback } from "react";

type Col<T> = { key: keyof T; label: string; width?: string; render?: (v: any, row: T) => React.ReactNode };
type Props<T> = {
  rows: T[];
  cols: Col<T>[];
  pageSize?: number;
  onRowClick?: (r: T) => void;
  searchFields?: (keyof T)[];
};

/**
 * Debounced search — avoids O(n) JSON.stringify on every keystroke
 */
function useDebouncedSearch<T>(rows: T[], searchFields?: (keyof T)[]) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Simple debounce via state sync
  const handleSearch = useCallback((val: string) => {
    setQ(val);
    // Use setTimeout for debounce
    setTimeout(() => setDebouncedQ(val), 200);
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedQ) return rows;
    const s = debouncedQ.toLowerCase();

    // Use indexed field search if fields provided (much faster than JSON.stringify)
    if (searchFields && searchFields.length > 0) {
      return rows.filter(r =>
        searchFields.some(f => {
          const v = r[f];
          return v != null && String(v).toLowerCase().includes(s);
        })
      );
    }

    // Fallback: full-text JSON search (legacy behavior)
    return rows.filter(r => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, debouncedQ, searchFields]);

  return { q, filtered, handleSearch };
}

export function VirtualizedTable<T extends { id: any }>({
  rows,
  cols,
  pageSize = 20,
  onRowClick,
  searchFields,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const { q, filtered, handleSearch } = useDebouncedSearch(rows, searchFields);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => { handleSearch(e.target.value); setPage(1); }}
          placeholder="بحث..."
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length} سجل • صفحة {safePage}/{pages}
        </span>
      </div>
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr>
              {cols.map((c) => (
                <th key={String(c.key)} className="text-right p-2 font-bold text-xs" style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr
                key={r.id}
                onClick={() => onRowClick?.(r)}
                className="border-b hover:bg-slate-50 cursor-pointer"
              >
                {cols.map((c) => (
                  <td key={String(c.key)} className="p-2 truncate max-w-[220px]">
                    {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="text-center py-8 text-muted-foreground text-sm">
                  لا نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t flex items-center justify-between">
        <button
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 border rounded-lg text-xs disabled:opacity-40"
        >
          السابق
        </button>
        <span className="text-xs">عرض محسّن — للبيانات الكبيرة استخدم VirtualizedTable من ui/</span>
        <button
          disabled={safePage >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          className="px-3 py-1 border rounded-lg text-xs disabled:opacity-40"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
