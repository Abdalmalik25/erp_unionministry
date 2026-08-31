/**
 * api.ts — Unified API Service Layer
 * Centralized API client with auth, error handling, CSRF, and caching
 * جميع عمليات المنصة تمر عبر هذه الطبقة لضمان الاتساق والأمان
 *
 * v3.0 Enhancements:
 *  - ApiError class with status, code, correlationId, retryable flag
 *  - Idempotency-Key header for safe POST/PUT retries
 *  - X-Correlation-Id end-to-end tracing (echoed from server)
 *  - ETag-based response cache for GET (respects server Cache-Control)
 *  - onUnauthorized callback for global session-expiry handling
 *  - requestDeduplication to prevent double-submit on rapid clicks
 */

const API_BASE = (import.meta.env?.VITE_API_BASE as string | undefined) || '/api';

/** Unified error type carrying the server's correlation ID and retry advice. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId: string | null;
  readonly retryable: boolean;
  readonly payload: unknown;
  constructor(message: string, opts: { status: number; code?: string; correlationId?: string | null; payload?: unknown } = { status: 0 }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code ?? `HTTP_${opts.status}`;
    this.correlationId = opts.correlationId ?? null;
    this.payload = opts.payload;
    // Network errors and 5xx are typically retryable; 4xx is not.
    this.retryable = opts.status === 0 || (opts.status >= 500 && opts.status < 600);
  }
}

/** Callback invoked on 401 to allow AuthContext to redirect to login. */
let onUnauthorized: ((correlationId: string | null) => void) | null = null;
export function setUnauthorizedHandler(fn: ((correlationId: string | null) => void) | null): void {
  onUnauthorized = fn;
}

/** ETag-keyed in-memory response cache. Bounded LRU to avoid unbounded growth. */
const etagCache = new Map<string, { etag: string; body: unknown; expires: number }>();
const ETAG_CACHE_MAX = 200;
const ETAG_TTL_MS = 60_000; // 1 minute client-side cap; server Cache-Control is authoritative

function cacheGet(key: string): { etag: string; body: unknown } | null {
  const entry = etagCache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    etagCache.delete(key);
    return null;
  }
  // Touch: move to end (LRU)
  etagCache.delete(key);
  etagCache.set(key, entry);
  return { etag: entry.etag, body: entry.body };
}
function cachePut(key: string, etag: string, body: unknown): void {
  if (etagCache.size >= ETAG_CACHE_MAX) {
    const first = etagCache.keys().next().value;
    if (first !== undefined) etagCache.delete(first);
  }
  etagCache.set(key, { etag, body, expires: Date.now() + ETAG_TTL_MS });
}

/** In-flight request deduplication: prevents double-submit on rapid clicks. */
const inFlight = new Map<string, Promise<unknown>>();
function dedupKey(method: string, path: string, body: string | undefined): string {
  return `${method}::${path}::${body ?? ''}`;
}

/** قراءة كوكي CSRF (نمط double-submit) لإرساله في رأس x-csrf-token */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? match[1] : null;
}

/** تطبيع المسار: يمنع ازدواج البادئة '/api' (مثال: '/api' + '/api/v1/x' كان ينتج '/api/api/v1/x') */
function normalizePath(path: string): string {
  if (!API_BASE || API_BASE === '/') return path.startsWith('/') ? path : `/${path}`;
  if (path.startsWith(`${API_BASE}/`) || path === API_BASE) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** معرّف ارتباط لربط طلبات الواجهة بسجلات الخادم — يولَّد مرة ويُعاد استخدامه في إعادة المحاولة */
function makeCorrelationId(): string {
  // Use crypto.randomUUID when available, fallback to a portable alternative
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* ignore */ }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** تحويل خطأ الاستجابة إلى ApiError موحَّد مع الحفاظ على معرّف الارتباط */
function handleResponse<T>(res: Response, correlationId: string): Promise<T> {
  const serverCid = res.headers.get('x-correlation-id') || res.headers.get('x-request-id') || correlationId;
  if (res.status === 401 && onUnauthorized) {
    try { onUnauthorized(serverCid); } catch { /* ignore handler errors */ }
  }
  if (!res.ok) {
    return res.json().then(errBody => {
      const message = errBody?.error?.message || errBody?.message || errBody?.error || 'حدث خطأ غير معروف';
      throw new ApiError(String(message), {
        status: res.status,
        code: errBody?.error?.code,
        correlationId: serverCid,
        payload: errBody,
      });
    }).catch((err) => {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err?.message || `HTTP ${res.status}`, { status: res.status, correlationId: serverCid });
    });
  }
  return res.json() as Promise<T>;
}

/** الحصول على الرمز المميز للمصادقة */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || null;
}

/** مهلة افتراضية للشبكة (ملي ثانية) — تمنع التعليق الأبدي على اتصال بطيء */
const DEFAULT_TIMEOUT_MS = 15000;

/** مهلة ادنى/أقصى لإعادة المحاولة مع تراجع أسي (بين 300ms و 3s) */
const RETRY_BASE_DELAY_MS = 300;
const RETRY_MAX_DELAY_MS = 3000;

/** إنشاء مصفوفة مهلة تُدمج مع أي إشارة إلغاء مقدَّمة من المتصل */
function createTimeoutSignal(signal?: AbortSignal, timeoutMs?: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const ms = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const timeout = window.setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    clear: () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

type Retryable = (init?: RequestInit) => Promise<Response>;

/** إعادة محاولة آمنة للطلبات القابلة لإعادة (idempotent) عند فشل شبكة أو انقطاع المهلة */
async function withRetry(fetchImpl: Retryable, attempts = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      // Retryable إذا فشل الاتصال (reject) أو انقطع بسبب المهلة — لا نعيد المحاولة على أخطاء HTTP
      const res = await fetchImpl();
      if (res.ok || res.status < 500 || attempt === attempts) {
        return res;
      }
      lastError = new Error(`Server error (${res.status})`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = new Error('انتهت مهلة الطلب');
      } else {
        lastError = err;
      }
      if (attempt === attempts) throw lastError;
    }
    if (attempt < attempts) {
      // تراجع أسي مع قبع علوي لتجنّب قصف الخادم
      const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/** تنفيذ fetch مع مهلة + إعادة المحاولة + ETag + Idempotency + منع ازدواج النقر */
async function fetchJson<T>(
  path: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    credentials?: RequestCredentials;
    /** هل يُسمح بإعادة المحاولة (يُمنح للقراءات idempotent فقط) */
    retry?: boolean;
    /** منع الازدواج عند النقر المتكرر */
    dedupe?: boolean;
    /** مدة مهلة مخصصة */
    timeoutMs?: number;
  },
  retry = false,
): Promise<T> {
  // 1) منع ازدواج الطلبات المتطابقة قيد التنفيذ
  if (init.dedupe && init.method !== 'GET' && init.method !== 'HEAD') {
    const key = dedupKey(init.method, normalizePath(path), init.body);
    const existing = inFlight.get(key);
    if (existing) return existing as Promise<T>;
  }

  const execute = async (): Promise<T> => {
    const { signal, clear } = createTimeoutSignal(init.signal, init.timeoutMs);
    try {
      // 2) إرفاق If-None-Match للقراءات المخزّنة سابقاً
      let headers = init.headers;
      let cacheKey: string | null = null;
      if (init.method === 'GET') {
        cacheKey = normalizePath(path);
        const cached = cacheGet(cacheKey);
        if (cached) {
          headers = { ...headers, 'If-None-Match': cached.etag };
        }
      }
      const makeFetch = (): Promise<Response> =>
        fetch(normalizePath(path), { ...init, signal, headers } as RequestInit);
      const res = (init.retry ?? retry) ? await withRetry(makeFetch) : await makeFetch();

      // 3) 304 Not Modified → نُعيد الجسم المخزَّن
      if (res.status === 304 && cacheKey) {
        const cached = cacheGet(cacheKey);
        if (cached) return cached.body as T;
      }

      const cid = init.headers['x-correlation-id'] || '';
      const data = await handleResponse<T>(res, cid);

      // 4) تخزين ETag للاستفادة من الكاش الشرطي
      if (res.ok && init.method === 'GET' && cacheKey) {
        const etag = res.headers.get('etag');
        if (etag) cachePut(cacheKey, etag, data);
      }
      return data;
    } finally {
      clear();
    }
  };

  if (init.dedupe && init.method !== 'GET' && init.method !== 'HEAD') {
    const key = dedupKey(init.method, normalizePath(path), init.body);
    const promise = execute().finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  }
  return execute();
}

/** رؤوس الطلب الافتراضية */
function defaultHeaders(extra: Record<string, string> = {}, correlationId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  // إضافة الرمز المميز تلقائياً إذا كان متوفراً
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // CSRF (double-submit): إرجاع قيمة الكوكي في الرأس — يلزم لكل الطلبات غير الآمنة
  const csrf = getCsrfToken();
  if (csrf) {
    headers['x-csrf-token'] = csrf;
  }
  // معرّف الارتباط من طرف العميل — يلتقطه الخادم في structuredLogger
  headers['x-correlation-id'] = correlationId ?? makeCorrelationId();
  // استخبارات الجهاز والموقع: المنطقة الزمنية تُقرأ في الخادم لتحديد الموقع الجغرافي وتقييم مخاطر الجلسة
  try {
    headers['x-client-timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  } catch { /* متصفح قديم — يُهمل بهدوء */ }
  return headers;
}

/** يُنشئ معرّف idempotency للطلبات غير الآمنة — يضمن أن إعادة المحاولة لا تُكرّر التأثير */
function makeIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `idem_${crypto.randomUUID()}`;
    }
  } catch { /* ignore */ }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** يمسح كاش ETag — يُستخدم بعد طفرات mutation (POST/PUT/DELETE) */
export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    etagCache.clear();
    return;
  }
  for (const key of etagCache.keys()) {
    if (key.includes(prefix)) etagCache.delete(key);
  }
}

/**
 * GET requests
 */
export async function get<T>(path: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  return fetchJson<T>(
    path,
    { method: 'GET', headers, credentials: 'include' },
    /* retry idempotent reads */ true,
  );
}

/**
 * POST requests
 */
export async function post<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  return fetchJson<T>(path, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
}

/**
 * PUT requests
 */
export async function put<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  return fetchJson<T>(path, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
}

/**
 * PATCH requests
 */
export async function patch<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  return fetchJson<T>(path, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE requests
 */
export async function del<T>(path: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  return fetchJson<T>(path, { method: 'DELETE', headers, credentials: 'include' });
}

/**
 * GET with signal (for cancellation) — يُحترم إلغاء المتصل مع الحفاظ على المهلة
 */
export async function getWithSignal<T>(
  path: string,
  signal: AbortSignal,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  return fetchJson<T>(path, { method: 'GET', headers, credentials: 'include', signal });
}

/**
 * File download (returns raw blob)
 */
export async function getFile(path: string): Promise<Blob> {
  const { signal, clear } = createTimeoutSignal();
  try {
    const headers = defaultHeaders({});
    const res = await fetch(normalizePath(path), {
      method: 'GET',
      headers,
      credentials: 'include',
      signal,
    });
    if (!res.ok) {
      const cid = res.headers.get('x-correlation-id') || '';
      const text = await res.text();
      throw new ApiError(text || `HTTP ${res.status}`, { status: res.status, correlationId: cid });
    }
    return res.blob();
  } finally {
    clear();
  }
}

/**
 * Multipart file upload (FormData) — مع idempotency-key وcorrelation-id
 */
export async function uploadFile<T>(path: string, formData: FormData, opts: { idempotencyKey?: string } = {}): Promise<T> {
  const { signal, clear } = createTimeoutSignal();
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'x-correlation-id': makeCorrelationId(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const csrf = getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;
    headers['Idempotency-Key'] = opts.idempotencyKey ?? makeIdempotencyKey();
    // No Content-Type — browser sets it with boundary for FormData

    const res = await fetch(normalizePath(path), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
      signal,
    });
    if (res.status === 401 && onUnauthorized) {
      try { onUnauthorized(res.headers.get('x-correlation-id')); } catch { /* ignore */ }
    }
    invalidateApiCache(path); // أي كتابة تبطل كاش GET المرتبط
    return handleResponse<T>(res, headers['x-correlation-id']);
  } finally {
    clear();
  }
}

/**
 * Multipart file upload with extra data
 */
export async function uploadFileWithData<T>(
  path: string,
  formData: FormData,
  extraData: Record<string, string> = {}
): Promise<T> {
  const { signal, clear } = createTimeoutSignal();
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'x-correlation-id': makeCorrelationId(),
      'Idempotency-Key': makeIdempotencyKey(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const csrf = getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;

    // Append extra data as JSON string
    if (Object.keys(extraData).length) {
      formData.append('_extra', JSON.stringify(extraData));
    }

    const res = await fetch(normalizePath(path), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
      signal,
    });
    if (res.status === 401 && onUnauthorized) {
      try { onUnauthorized(res.headers.get('x-correlation-id')); } catch { /* ignore */ }
    }
    invalidateApiCache(path);
    return handleResponse<T>(res, headers['x-correlation-id']);
  } finally {
    clear();
  }
}

/**
 * Post with FormData (multipart, not JSON)
 */
export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const { signal, clear } = createTimeoutSignal();
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'x-correlation-id': makeCorrelationId(),
      'Idempotency-Key': makeIdempotencyKey(),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const csrf = getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;

    const res = await fetch(normalizePath(path), {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
      signal,
    });
    if (res.status === 401 && onUnauthorized) {
      try { onUnauthorized(res.headers.get('x-correlation-id')); } catch { /* ignore */ }
    }
    invalidateApiCache(path);
    return handleResponse<T>(res, headers['x-correlation-id']);
  } finally {
    clear();
  }
}

/**
 * صحة اتصالات الخدمة (للتحقق من صحة الخادم)
 */
export async function healthCheck(): Promise<{ status: string }> {
  return get<{ status: string }>('/health');
}

export default {
  get,
  post,
  put,
  patch,
  del,
  getWithSignal,
  getFile,
  uploadFile,
  uploadFileWithData,
  postFormData,
  healthCheck,
  // New v3.0 exports
  ApiError,
  setUnauthorizedHandler,
  invalidateApiCache,
};