/**
 * useServiceWorker — Service Worker registration and lifecycle hook
 * Yemen National Labor Platform
 *
 * Features:
 * - Auto-registers SW on mount
 * - Handles updates with user notification
 * - Provides cache management API
 * - Sync queue helper
 */

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  cacheStatus: { name: string; count: number }[] | null;
  registration: ServiceWorkerRegistration | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  updateServiceWorker: () => Promise<void>;
  clearAllCache: () => Promise<void>;
  clearApiCache: () => Promise<void>;
  queueOperation: (operation: QueuedOperation) => Promise<void>;
  getCacheStatus: () => Promise<void>;
}

interface QueuedOperation {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  headers?: Record<string, string>;
}

const SW_URL = '/sw.js';
const SW_SCOPE = '/';

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable: false,
    cacheStatus: null,
    registration: null,
  });

  // Register service worker on mount
  useEffect(() => {
    if (!state.isSupported) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_URL, {
          scope: SW_SCOPE,
        });

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        });
      } catch (error) {
        console.warn('[SW] Registration failed:', error);
      }
    };

    register();
  }, [state.isSupported]);

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update service worker (skip waiting + reload)
  const updateServiceWorker = useCallback(async () => {
    if (!state.registration || !state.registration.waiting) return;

    // Tell SW to skip waiting
    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page once new SW is active
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, [state.registration]);

  // Clear all caches
  const clearAllCache = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) return;

    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data?.ok) {
          setState((prev) => ({ ...prev, cacheStatus: null }));
        }
        resolve();
      };
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_ALL_CACHE' },
        [channel.port2]
      );
    });
  }, []);

  // Clear API cache only
  const clearApiCache = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) return;

    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data?.ok) {
          setState((prev) => ({ ...prev, cacheStatus: null }));
        }
        resolve();
      };
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_API_CACHE' },
        [channel.port2]
      );
    });
  }, []);

  // Queue operation for background sync
  const queueOperation = useCallback(async (operation: QueuedOperation) => {
    if (!navigator.serviceWorker?.controller) {
      // Try direct fetch as fallback
      try {
        await fetch(operation.url, {
          method: operation.method,
          headers: { 'Content-Type': 'application/json', ...operation.headers },
          body: JSON.stringify(operation.body),
        });
        return;
      } catch {
        throw new Error('No service worker and network unavailable');
      }
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'QUEUE_OPERATION',
      payload: operation,
    });
  }, []);

  // Get cache status
  const getCacheStatus = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) {
      setState((prev) => ({ ...prev, cacheStatus: [] }));
      return;
    }

    return new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data?.ok) {
          setState((prev) => ({ ...prev, cacheStatus: event.data.stats }));
        }
        resolve();
      };
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [channel.port2]
      );
    });
  }, []);

  return {
    ...state,
    updateServiceWorker,
    clearAllCache,
    clearApiCache,
    queueOperation,
    getCacheStatus,
  };
}

export default useServiceWorker;
