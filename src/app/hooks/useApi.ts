import { useState, useCallback } from 'react';
import { apiBase, publicAnonKey } from '../../../utils/supabase/info';

// استخدام API_BASE من البيئة أو الخادم المحلي
const API_BASE = apiBase || import.meta.env.VITE_API_BASE || '/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  requireAuth?: boolean;
}

export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (endpoint: string, options: ApiOptions = {}) => {
    const { method = 'GET', body, requireAuth = true } = options;

    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (requireAuth && publicAnonKey) {
        headers['Authorization'] = `Bearer ${publicAnonKey}`;
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
    return api.execute('/unions');
  }, [api]);

  const create = useCallback((unionData: any) => {
    return api.execute('/unions', { method: 'POST', body: unionData });
  }, [api]);

  const update = useCallback((id: string, unionData: any) => {
    return api.execute(`/unions/${id}`, { method: 'PUT', body: unionData });
  }, [api]);

  return {
    ...api,
    getAll,
    create,
    update,
  };
}

export function useMembers() {
  const api = useApi();

  const getAll = useCallback(() => {
    return api.execute('/members');
  }, [api]);

  const create = useCallback((memberData: any) => {
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

  const create = useCallback((activityData: any) => {
    return api.execute('/activities', { method: 'POST', body: activityData });
  }, [api]);

  return {
    ...api,
    getAll,
    create,
  };
}

export function useServiceRequests() {
  const api = useApi();

  const getAll = useCallback(() => {
    return api.execute('/service-requests');
  }, [api]);

  const create = useCallback((requestData: any) => {
    return api.execute('/service-requests', { method: 'POST', body: requestData });
  }, [api]);

  return {
    ...api,
    getAll,
    create,
  };
}
