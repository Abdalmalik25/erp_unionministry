/**
 * Smart API Client - عميل API ذكي
 * معالجة ذكية للطلبات مع إعادة المحاولة والتخزين المؤقت
 */

import { retryAsync } from './performance';

interface RequestConfig extends RequestInit {
  retry?: boolean;
  maxRetries?: number;
  cache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  onUploadProgress?: (progress: number) => void;
  throwOnError?: boolean;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  success: boolean;
}

class SmartApiClient {
  private baseURL: string;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private pendingRequests: Map<string, Promise<any>>;
  private requestQueue: Array<() => Promise<any>>;
  private isProcessingQueue: boolean;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  // طلب ذكي مع جميع الميزات
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      retry = true,
      maxRetries = 3,
      cache: useCache = false,
      cacheTTL = 5 * 60 * 1000,
      timeout = 30000,
      throwOnError = false,
      ...fetchConfig
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${fetchConfig.method || 'GET'}:${url}`;

    // التحقق من Cache
    if (useCache && fetchConfig.method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          data: cached,
          error: null,
          status: 200,
          success: true,
        };
      }
    }

    // التحقق من الطلبات المعلقة (Request Deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      const pending = await this.pendingRequests.get(cacheKey)!;
      return pending;
    }

    // إنشاء الطلب
    const requestPromise = this.executeRequest<T>(
      url,
      fetchConfig,
      timeout,
      retry,
      maxRetries
    );

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // حفظ في Cache
      if (useCache && result.success) {
        this.saveToCache(cacheKey, result.data, cacheTTL);
      }

      return result;
    } catch (error: any) {
      const errorResponse: ApiResponse<T> = {
        data: null,
        error: error.message || 'حدث خطأ في الطلب',
        status: error.status || 500,
        success: false,
      };

      if (throwOnError) {
        throw errorResponse;
      }

      return errorResponse;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(
    url: string,
    config: RequestInit,
    timeout: number,
    retry: boolean,
    maxRetries: number
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchFn = async () => {
      try {
        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        const data = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          throw {
            message: data.error || data.message || `HTTP ${response.status}`,
            status: response.status,
            data,
          };
        }

        return {
          data,
          error: null,
          status: response.status,
          success: true,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw {
            message: 'انتهت مهلة الطلب',
            status: 408,
          };
        }

        throw error;
      }
    };

    if (retry) {
      return retryAsync(fetchFn, {
        maxAttempts: maxRetries,
        delay: 1000,
        backoff: 2,
      });
    }

    return fetchFn();
  }

  // GET
  async get<T = any>(endpoint: string, config: RequestConfig = {}) {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  // POST
  async post<T = any>(endpoint: string, data?: any, config: RequestConfig = {}) {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
  }

  // PUT
  async put<T = any>(endpoint: string, data?: any, config: RequestConfig = {}) {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
  }

  // DELETE
  async delete<T = any>(endpoint: string, config: RequestConfig = {}) {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // PATCH
  async patch<T = any>(endpoint: string, data?: any, config: RequestConfig = {}) {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });
  }

  // Upload File
  async upload<T = any>(
    endpoint: string,
    file: File,
    config: RequestConfig = {}
  ) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
    });
  }

  // Cache Methods
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private saveToCache(key: string, data: any, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clearCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  // Request Queue (للطلبات المتتالية)
  async queueRequest<T = any>(
    fn: () => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.requestQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const request = this.requestQueue.shift()!;

    try {
      await request();
    } catch (error) {
      console.error('Queue request failed:', error);
    }

    // معالجة الطلب التالي
    this.processQueue();
  }

  // Interceptors
  private requestInterceptors: Array<(config: RequestInit) => RequestInit> = [];
  private responseInterceptors: Array<(response: Response) => Response> = [];

  addRequestInterceptor(interceptor: (config: RequestInit) => RequestInit) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: Response) => Response) {
    this.responseInterceptors.push(interceptor);
  }
}

// Instance واحد مشترك
export const api = new SmartApiClient();

// تكوين افتراضي
api.addRequestInterceptor((config) => {
  // إضافة Authorization header تلقائياً
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

export default api;
