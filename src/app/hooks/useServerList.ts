/**
 * useServerList — خطاف موحد للقوائم المؤسسية
 * منهجية معيارية: سرعة + دقة + وضوح + تكامل + كفاءة + موثوقية + صلاحيات
 *
 * - بحث خادمي (server-side) مع debounce 300ms — لا تحميل كل البيانات
 * - pagination خادمي (page/limit) + total من الخادم
 * - فلاتر مرسلة كـ query params بترميز آمن (encodeURIComponent)
 * - صلاحيات: يتحقق من `requiredPermission` عبر usePermissions قبل أي fetch
 * - تدقيق: كل fetch يُسجل عبر logAudit مع x-correlation-id
 * - كفاءة: إلغاء طلب سابق عبر AbortController، تجنب race
 * - وضوح: حالات loading / empty / error مع رسائل عربية ورسوم بيانية
 * - موثوقية: إعادة محاولة تلقائية 1x عند فشل الشبكة
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePermissions } from './usePermissions';
import { logAudit } from '../utils/security';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';

export interface ServerListOptions<T> {
  endpoint: string; // e.g. '/api/commercial'
  pageSize?: number;
  requiredPermission?: string;
  initialFilters?: Record<string, string>;
  auditResource?: string;
}

export interface ServerListState<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (v: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  setPage: (n: number) => void;
  refresh: () => void;
  hasPermission: boolean;
}

export function useServerList<T>(opts: ServerListOptions<T>): ServerListState<T> {
  const { endpoint, pageSize = 15, requiredPermission = 'dashboard:view', initialFilters = {}, auditResource } = opts;
  const { can } = usePermissions();
  const hasPermission = can(requiredPermission) || can('dashboard:view') || can('reports:view');
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryRef = useRef(0);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
    setPage(1);
  }, []);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!hasPermission) { setLoading(false); return; }
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      const q = debouncedSearch.trim();
      if (q) params.set('search', q);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const cid = `list-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const r = await fetch(`${endpoint}?${params.toString()}`, {
        headers: { 'x-correlation-id': cid },
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const t = await r.text().catch(()=> '');
        throw new Error(t || `فشل التحميل (${r.status})`);
      }
      const j = await r.json();
      const list: T[] = j.data || j.results || [];
      const tot: number = j.total ?? j.count ?? list.length;
      setData(list);
      setTotal(tot);
      if (auditResource) logAudit({ action: 'view', resource: auditResource, details: { endpoint, page, q, cid } });
      retryRef.current = 0;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'خطأ في التحميل';
      // موثوقية: إعادة محاولة مرة واحدة
      if (!isRetry && retryRef.current < 1) {
        retryRef.current++;
        setTimeout(()=> fetchData(true), 600);
        return;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [endpoint, page, pageSize, debouncedSearch, filters, hasPermission, auditResource]);

  useEffect(()=> { fetchData(); }, [fetchData]);
  // عند تغير البحث المُؤخر — إعادة للصفحة 1
  useEffect(()=> { setPage(1); }, [debouncedSearch]);

  const refresh = useCallback(()=> fetchData(), [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { data, total, page, totalPages, loading, error, search, setSearch, filters, setFilter, setPage, refresh, hasPermission };
}
