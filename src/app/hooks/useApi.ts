import { useState, useCallback } from 'react';
import { apiBase, publicAnonKey } from '../../../utils/supabase/info';

// استخدام API_BASE من البيئة أو الخادم المحلي
const API_BASE = apiBase || import.meta.env.VITE_API_BASE || '/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  requireAuth?: boolean;
}

export function useApi<T = Record<string, unknown>>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (endpoint: string, options: ApiOptions = {}) => {
    const { method = 'GET', body, requireAuth = true } = options;

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (requireAuth && publicAnonKey) {
        headers['Authorization'] = `Bearer ${publicAnonKey}`;
      }

      // CSRF (double-submit): إرجاع قيمة الكوكي في الرأس للطلبات غير الآمنة
      if (method !== 'GET' && typeof document !== 'undefined') {
        const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
        if (m) headers['x-csrf-token'] = m[1];
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'حدث خطأ غير متوقع' }));
        throw new Error(errorData.error || `خطأ في الطلب: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

// Hooks متخصصة للعمليات الشائعة
export function useUnions() {
  const api = useApi();

  const getAll = useCallback(() => {
    return api.execute('/entities');
  }, [api]);

  const create = useCallback((unionData: Record<string, unknown>) => {
    return api.execute('/entities', { method: 'POST', body: unionData });
  }, [api]);

  const update = useCallback((id: string, unionData: Record<string, unknown>) => {
    return api.execute(`/entities/${id}`, { method: 'PUT', body: unionData });
  }, [api]);

  const remove = useCallback((id: string) => {
    return api.execute(`/entities/${id}`, { method: 'DELETE' });
  }, [api]);

  return {
    ...api,
    getAll,
    create,
    update,
    remove,
  };
}

export function useMembers() {
  const api = useApi();

  const getAll = useCallback(() => {
    return api.execute('/members');
  }, [api]);

  const create = useCallback((memberData: Record<string, unknown>) => {
    return api.execute('/members', { method: 'POST', body: memberData });
  }, [api]);

  return {
    ...api,
    getAll,
    create,
  };
}

export function useActivities() {
  const api = useApi();

  const getAll = useCallback(() => {
    return api.execute('/activities');
  }, [api]);

  const create = useCallback((activityData: Record<string, unknown>) => {
    return api.execute('/activities', { method: 'POST', body: activityData });
  }, [api]);

  const update = useCallback((id: string, activityData: Record<string, unknown>) => {
    return api.execute(`/activities/${id}`, { method: 'PUT', body: activityData });
  }, [api]);

  const remove = useCallback((id: string) => {
    return api.execute(`/activities/${id}`, { method: 'DELETE' });
  }, [api]);

  return {
    ...api,
    getAll,
    create,
    update,
    remove,
  };
}

export function useServiceRequests() {
  const api = useApi();

  const getAll = useCallback(() => {
    return api.execute('/service-requests');
  }, [api]);

  const create = useCallback((requestData: Record<string, unknown>) => {
    return api.execute('/service-requests', { method: 'POST', body: requestData });
  }, [api]);

  return {
    ...api,
    getAll,
    create,
  };
}
