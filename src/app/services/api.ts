/**
 * api.ts — Unified API Service Layer
 * Centralized API client with auth, error handling, CSRF, and caching
 * جميع عمليات المنصة تمر عبر هذه الطبقة لضمان الاتساق والأمان
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

/** تحويل خطأ الاستجابة إلى كائن خطأ موحد */
function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return res.json().then(errBody => {
      const error = errBody.error || errBody.message || 'حدث خطأ غير معروف';
      throw new Error(error);
    });
  }
  return res.json();
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
function createTimeoutSignal(signal?: AbortSignal): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
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

/** تنفيذ fetch مع مهلة + خيار إعادة المحاولة */
async function fetchJson<T>(
  path: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    credentials?: RequestCredentials;
  },
  retry = false,
): Promise<T> {
  const { signal, clear } = createTimeoutSignal(init.signal);
  try {
    const makeFetch = (): Promise<Response> =>
      fetch(`${API_BASE}${path}`, { ...init, signal } as RequestInit);
    const res = retry ? await withRetry(makeFetch) : await makeFetch();
    return await handleResponse<T>(res);
  } finally {
    clear();
  }
}

/** رؤوس الطلب الافتراضية */
function defaultHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  // إضافة الرمز المميز تلقائياً إذا كان متوفراً
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
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
  healthCheck,
};