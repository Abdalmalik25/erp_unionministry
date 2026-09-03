import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

const STORAGE_PREFIX = 'query-cache-';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  stale: boolean;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  staleWhileRevalidate?: boolean;
}

interface QueryOptions<T> {
  queryKey: string[];
  queryFn: (signal: AbortSignal) => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  retry?: number | boolean;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
}

interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  isStale: boolean;
  refetch: () => Promise<T | undefined>;
  invalidate: () => void;
}

const cache = new Map<string, CacheEntry<unknown>>();
const storage = typeof window !== 'undefined' ? window.localStorage : null;
const subscribers = new Map<string, Set<() => void>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function generateKey(queryKey: string[]): string {
  return queryKey.join(':');
}

function loadFromStorage(key: string): CacheEntry<unknown> | undefined {
  if (!storage) return undefined;
  try {
    const entry = storage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!entry) return undefined;
    return JSON.parse(entry);
  } catch {
    return undefined;
  }
}

function saveToStorage(key: string, entry: CacheEntry<unknown>) {
  if (!storage) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore storage errors in production
  }
}

function notifySubscribers(key: string) {
  const subs = subscribers.get(key);
  if (subs) {
    subs.forEach((callback) => callback());
  }
}

function subscribe(key: string, callback: () => void) {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key)!.add(callback);
  return () => {
    subscribers.get(key)?.delete(callback);
  };
}

function getFromCache<T>(key: string): T | undefined {
  // Check memory cache first
  const entry = cache.get(key) as CacheEntry<unknown> | undefined;
  if (entry && entry.data !== undefined) return entry.data as T;

  // Fall back to localStorage
  const storageEntry = loadFromStorage(key) as CacheEntry<unknown>;
  if (!storageEntry || !storageEntry.data) return undefined;

  // Store in memory cache
  cache.set(key, storageEntry);
  return storageEntry.data as T;
}

function setCache<T>(key: string, data: T, etag?: string) {
  const entry: CacheEntry<unknown> = {
    data: data as unknown,
    timestamp: Date.now(),
    etag,
    stale: false,
  };
  cache.set(key, entry);
  saveToStorage(key, entry);
  notifySubscribers(key);
}

function markStale(key: string) {
  const entry = cache.get(key);
  if (entry) {
    entry.stale = true;
    notifySubscribers(key);
  }
}

function invalidateCache(key: string) {
  cache.delete(key);
  notifySubscribers(key);
}

function isExpired(key: string, staleTime: number): boolean {
  const entry = cache.get(key);
  if (!entry) return true;
  return Date.now() - entry.timestamp > staleTime;
}

function cleanupCache(maxSize: number) {
  if (cache.size <= maxSize) return;
  const entries = Array.from(cache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toDelete = entries.slice(0, entries.length - maxSize);
  toDelete.forEach(([key]) => cache.delete(key));
}

export function useQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 5 * 60 * 1000,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cacheTime = 10 * 60 * 1000,
  refetchOnWindowFocus = true,
  refetchOnReconnect = true,
  retry = 3,
  retryDelay = 1000,
  onSuccess,
  onError,
  onSettled,
}: QueryOptions<T>): QueryResult<T> {
  const key = generateKey(queryKey);
  const [data, setData] = useState<T | undefined>(() => getFromCache<T>(key));
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const fetchData = useCallback(
    async (isRefetch = false) => {
      if (!enabled) return undefined;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const existingPromise = inFlightRequests.get(key);
      if (existingPromise && !isRefetch) {
        return existingPromise as Promise<T>;
      }

      const promise = (async () => {
        setIsFetching(true);
        if (!isRefetch) setIsLoading(true);
        setError(null);
        setIsError(false);

        try {
          const result = await queryFn(abortControllerRef.current.signal);
          if (!mountedRef.current) return result;

          setCache<T>(key, result);
          setData(result);
          setIsSuccess(true);
          setIsError(false);
          retryCountRef.current = 0;
          onSuccess?.(result);
          return result;
        } catch (err) {
          if (!mountedRef.current) throw err;
          if (err instanceof Error && err.name === 'AbortError') throw err;

          const error = err as Error;
          if (retryCountRef.current < (typeof retry === 'number' ? retry : 3)) {
            retryCountRef.current++;
            await new Promise((r) => setTimeout(r, retryDelay * retryCountRef.current));
            return fetchData(isRefetch);
          }

          setError(error);
          setIsError(true);
          setIsSuccess(false);
          onError?.(error);
          throw error;
        } finally {
          if (mountedRef.current) {
            setIsLoading(false);
            setIsFetching(false);
            onSettled?.(data, error);
          }
        }
      })();

      inFlightRequests.set(key, promise);
      try {
        return await promise;
      } finally {
        inFlightRequests.delete(key);
      }
    },
    [key, queryFn, enabled, retry, retryDelay, onSuccess, onError, onSettled, data]
  );

  const refetch = useCallback(async () => {
    markStale(key);
    return fetchData(true);
  }, [fetchData, key]);

  const invalidate = useCallback(() => {
    invalidateCache(key);
  }, [key]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      // Stale-while-revalidate: show cached data immediately, refetch background
      const cached = getFromCache<T>(key);
      if (cached !== undefined) {
        setData(cached);
      }
      // Mark as stale so it refetches after staleTime
      markStale(key);
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, key, staleTime]);

  useEffect(() => {
    if (!refetchOnWindowFocus) return;
    const handleFocus = () => {
      if (enabled && isExpired(key, staleTime)) {
        fetchData(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, key, staleTime, fetchData]);

  useEffect(() => {
    if (!refetchOnReconnect) return;
    const handleOnline = () => {
      if (enabled && isExpired(key, staleTime)) {
        fetchData(true);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, enabled, key, staleTime, fetchData]);

  const unsubscribe = useMemo(
    () => subscribe(key, () => {
      const cached = getFromCache<T>(key);
      if (cached !== undefined) {
        setData(cached);
      }
    }),
    [key]
  );

  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  useEffect(() => {
    const interval = setInterval(() => {
      cleanupCache(1000);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isSuccess,
    isError,
    isStale: isExpired(key, staleTime),
    refetch,
    invalidate,
  };
}

export function useMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
  onSettled,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | undefined>(undefined);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      setIsPending(true);
      setIsSuccess(false);
      setIsError(false);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        setIsSuccess(true);
        onSuccess?.(result, variables);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        setIsError(true);
        onError?.(error, variables);
        throw error;
      } finally {
        setIsPending(false);
        onSettled?.(data, error, variables);
      }
    },
    [mutationFn, onSuccess, onError, onSettled, data]
  );

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      const result = await mutate(variables);
      if (result === undefined && error) {
        throw error;
      }
      return result as TData;
    },
    [mutate, error]
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    setData(undefined);
  }, []);

  return { mutate, mutateAsync, isPending, isSuccess, isError, error, data, reset };
}

export function useInvalidateQueries() {
  const invalidate = useCallback((queryKey: string[]) => {
    const key = generateKey(queryKey);
    invalidateCache(key);
  }, []);

  const invalidateAll = useCallback(() => {
    cache.clear();
    subscribers.forEach((callbacks) => callbacks.forEach((cb) => cb()));
  }, []);

  return { invalidate, invalidateAll };
}

export function prefetchQuery<T>(queryKey: string[], queryFn: () => Promise<T>) {
  const key = generateKey(queryKey);
  if (cache.has(key) && !isExpired(key, 5 * 60 * 1000)) return;

  queryFn()
    .then((data) => setCache<T>(key, data))
    .catch(() => {});
}

export function setQueryData<T>(queryKey: string[], data: T) {
  const key = generateKey(queryKey);
  setCache<T>(key, data);
}

export function getQueryData<T>(queryKey: string[]): T | undefined {
  const key = generateKey(queryKey);
  return getFromCache<T>(key);
}

export function removeQueries(queryKey: string[]) {
  const key = generateKey(queryKey);
  invalidateCache(key);
}

export { cache, subscribers, inFlightRequests };