/**
 * api.ts — أدوات فك تغليف استجابات API الموحدة
 * الخادم يغلّف كل الاستجابات: { success, data: <routePayload>, meta, errors }
 * وحُمولات المسارات نفسها قد تكون: مصفوفة | {data:[...]} | {data:{data:[...],total}}
 * extractList يعيد المصفوفة دائماً — يمنع أعطال ‎.filter is not a function‎
 */
export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  errors?: unknown;
  meta?: { timestamp?: string; path?: string; method?: string };
};

const asArray = <T,>(v: unknown): T[] | null => (Array.isArray(v) ? (v as T[]) : null);

/** يستخرج أول مصفوفة من أي شكل استجابة (بعمق حتى 3 مستويات) */
export function unwrapApi<T = unknown>(payload: unknown): ApiEnvelope<T> | T[] {
  if (asArray<T>(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const env = payload as ApiEnvelope<T>;
    if ('data' in env || 'errors' in env) return env;
  }
  return { data: payload as T };
}

export function extractList<T = Record<string, unknown>>(payload: unknown, keys: string[] = []): T[] {
  const direct = asArray<T>(payload);
  if (direct) return direct;
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  const inner = (obj.data ?? obj.result ?? null) as unknown;
  const candidates: unknown[] = [
    ...(Array.isArray(inner) ? [] : [(inner as Record<string, unknown>)?.data]),
    ...keys.map((k) => (inner as Record<string, unknown>)?.[k]),
    ...keys.map((k) => obj[k]),
  ];
  for (const c of candidates) {
    const arr = asArray<T>(c);
    if (arr) return arr;
  }
  const innerArr = asArray<T>(inner);
  if (innerArr) return innerArr;
  return [];
}

/** fetch آمن يعيد مصفوفة دائماً — لا يرمي أبداً */
export async function fetchList<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit,
  keys: string[] = []
): Promise<T[]> {
  try {
    const r = await fetch(url, init);
    if (!r.ok) return [];
    return extractList<T>(await r.json(), keys);
  } catch {
    return [];
  }
}
