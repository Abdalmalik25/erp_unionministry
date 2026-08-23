/**
 * dataSource.ts - جلب البيانات الحية من قاعدة البيانات (Neon PostgreSQL عبر Vercel Functions)
 * مع تراجع شفاف إلى بيانات عرض محلية عند غياب الاتصال
 * لا تعرض أبداً أي ادعاءات غير حقيقية: البيانات المحلية معلَّمة بوضوح
 */

import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface RemoteTableState<T> {
  data: T[];
  loading: boolean;
  connected: boolean;
  error: string | null;
}

const memoryCache = new Map<string, { ts: number; rows: unknown[] }>();
const TTL_MS = 30_000;

/** هل مصدر البيانات الحية مهيأ في البيئة؟ */
export function isRemoteAvailable(): boolean {
  return Boolean(API_BASE);
}

/**
 * قراءة جدول حي مع تراجع آمن إلى بيانات العرض المحلية.
 * `filters` مثال: `organization_id=eq.abc&status=eq.نشط`
 */
export function useRemoteTable<T = Record<string, unknown>>(
  table: string,
  fallback: T[],
  options?: { ttlMs?: number; filters?: string }
): RemoteTableState<T> {
  const [state, setState] = useState<RemoteTableState<T>>({
    data: fallback,
    loading: true,
    connected: false,
    error: null,
  });
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const ttl = options?.ttlMs ?? TTL_MS;
  const filtersKey = options?.filters ?? '';

  useEffect(() => {
    let cancelled = false;

    if (!isRemoteAvailable()) {
      setState({ data: fallbackRef.current, loading: false, connected: false, error: null });
      return;
    }

    const cacheKey = `${table}#${filtersKey}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ttl) {
      setState({ data: cached.rows as T[], loading: false, connected: true, error: null });
      return;
    }

    const query = filtersKey ? `?${filtersKey}&limit=500` : '?limit=500';

    fetch(`${API_BASE}/data/${table}${query}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as T[];
        if (!Array.isArray(rows)) throw new Error('استجابة غير متوقعة');
        memoryCache.set(cacheKey, { ts: Date.now(), rows });
        if (!cancelled) {
          setState({ data: rows, loading: false, connected: true, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: fallbackRef.current,
            loading: false,
            connected: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [table, filtersKey, ttl]);

  return state;
}

/** شارة صادقة عند عرض بيانات محلية بدلاً من بيانات الخادم */
export function LocalDataBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 text-warning-dark text-[11px] font-semibold border border-warning/30">
      بيانات محلية للعرض — لم يتصل النظام بخادم البيانات
    </span>
  );
}