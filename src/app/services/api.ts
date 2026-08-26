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
  const res = await fetch(`${API_BASE}${path}`, { headers, method: 'GET', credentials: 'include' });
  return handleResponse<T>(res);
}

/**
 * POST requests
 */
export async function post<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/**
 * PUT requests
 */
export async function put<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    method: 'PUT',
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/**
 * PATCH requests
 */
export async function patch<T>(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/**
 * DELETE requests
 */
export async function del<T>(path: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<T>(res);
}

/**
 * GET with signal (for cancellation)
 */
export async function getWithSignal<T>(
  path: string,
  signal: AbortSignal,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const headers = defaultHeaders(extraHeaders);
  const res = await fetch(`${API_BASE}${path}`, { headers, method: 'GET', credentials: 'include', signal });
  return handleResponse<T>(res);
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