import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 350
): T {
  const [pending, setPending] = useState<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = ((...args: Parameters<T>) => {
    if (pending) clearTimeout(pending);
    setPending(setTimeout(() => {
      callback(...args);
      setPending(null);
    }, delay));
  }) as T;

  useEffect(() => {
    return () => {
      if (pending) clearTimeout(pending);
    };
  }, [pending]);

  return debouncedFn;
}