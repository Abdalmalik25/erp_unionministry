import { useCallback, useRef, useState, useEffect } from 'react';

interface OptimisticUpdateOptions<TData, TVariables> {
  onMutate: (variables: TVariables) => Promise<TData>;
  onError?: (error: Error, variables: TVariables, context?: TData) => void;
  onSuccess?: (data: TData, variables: TVariables, context?: TData) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  rollbackOnError?: boolean;
}

interface UseOptimisticMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: () => void;
}

export function useOptimisticMutation<TData, TVariables>(
  options: OptimisticUpdateOptions<TData, TVariables>
): UseOptimisticMutationReturn<TData, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | undefined>(undefined);
  const contextRef = useRef<TData | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setIsPending(false);
    setIsError(false);
    setIsSuccess(false);
    setError(null);
    setData(undefined);
    contextRef.current = undefined;
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsPending(true);
      setIsError(false);
      setIsSuccess(false);
      setError(null);

      let context: TData | void;
      try {
        context = await options.onMutate(variables);
        if (context !== undefined) {
          contextRef.current = context;
          setData(context);
        }
      } catch (mutateError) {
        setIsPending(false);
        setIsError(true);
        setError(mutateError as Error);
        options.onError?.(mutateError as Error, variables);
        return undefined;
      }

      try {
        const result = await options.onMutate(variables);
        setIsPending(false);
        setIsSuccess(true);
        setData(result);
        options.onSuccess?.(result, variables, contextRef.current);
        options.onSettled?.(result, null, variables);
        return result;
      } catch (err) {
        const error = err as Error;
        setIsPending(false);
        setIsError(true);
        setError(error);

        if (options.rollbackOnError && contextRef.current !== undefined) {
          setData(contextRef.current);
        }

        options.onError?.(error, variables, contextRef.current);
        options.onSettled?.(undefined, error, variables);
        return undefined;
      }
    },
    [options]
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

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    mutate,
    mutateAsync,
    isPending,
    isError,
    isSuccess,
    error,
    data,
    reset,
  };
}

interface UseOptimisticListOptions<T> {
  initialData: T[];
  onAdd?: (newItem: T) => Promise<T>;
  onUpdate?: (id: string | number, updates: Partial<T>) => Promise<T>;
  onDelete?: (id: string | number) => Promise<void>;
  getId: (item: T) => string | number;
}

export function useOptimisticList<T>({
  initialData,
  onAdd,
  onUpdate,
  onDelete,
  getId,
}: UseOptimisticListOptions<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [isMutating, setIsMutating] = useState(false);
  const pendingRef = useRef<Map<string | number, T>>(new Map());
  const rollbackRef = useRef<T[]>(initialData);

  const commitPending = useCallback((id: string | number) => {
    pendingRef.current.delete(id);
  }, []);

  const rollback = useCallback((id: string | number) => {
    const original = rollbackRef.current.find((item) => getId(item) === id);
    if (original) {
      setData((prev) => prev.map((item) => (getId(item) === id ? original : item)));
    }
    pendingRef.current.delete(id);
  }, [getId]);

  const optimisticAdd = useCallback(
    async (newItem: T) => {
      if (!onAdd) throw new Error('onAdd not provided');
      setIsMutating(true);
      const tempId = getId(newItem);
      rollbackRef.current = [...data];
      setData((prev) => [...prev, newItem]);
      pendingRef.current.set(tempId, newItem);

      try {
        const result = await onAdd(newItem);
        setData((prev) => prev.map((item) => (getId(item) === tempId ? result : item)));
        commitPending(tempId);
        return result;
      } catch (err) {
        rollback(tempId);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [data, onAdd, getId, commitPending, rollback]
  );

  const optimisticUpdate = useCallback(
    async (id: string | number, updates: Partial<T>) => {
      if (!onUpdate) throw new Error('onUpdate not provided');
      setIsMutating(true);
      const originalItem = data.find((item) => getId(item) === id);
      if (!originalItem) throw new Error('Item not found');

      rollbackRef.current = data;
      const updatedItem = { ...originalItem, ...updates };
      setData((prev) => prev.map((item) => (getId(item) === id ? updatedItem : item)));
      pendingRef.current.set(id, updatedItem);

      try {
        const result = await onUpdate(id, updates);
        setData((prev) => prev.map((item) => (getId(item) === id ? result : item)));
        commitPending(id);
        return result;
      } catch (err) {
        rollback(id);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [data, onUpdate, getId, commitPending, rollback]
  );

  const optimisticDelete = useCallback(
    async (id: string | number) => {
      if (!onDelete) throw new Error('onDelete not provided');
      setIsMutating(true);
      const originalItem = data.find((item) => getId(item) === id);
      if (!originalItem) throw new Error('Item not found');

      rollbackRef.current = data;
      setData((prev) => prev.filter((item) => getId(item) !== id));
      pendingRef.current.set(id, originalItem);

      try {
        await onDelete(id);
        commitPending(id);
      } catch (err) {
        setData((prev) => [...prev, originalItem]);
        rollback(id);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [data, onDelete, getId, commitPending, rollback]
  );

  return {
    data,
    isMutating,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete,
    setData,
  };
}

interface DebouncedMutateOptions<TVariables> {
  delay?: number;
  onMutate: (variables: TVariables) => Promise<void>;
}

export function useDebouncedMutate<TVariables>({
  delay = 500,
  onMutate,
}: DebouncedMutateOptions<TVariables>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<TVariables | null>(null);

  const mutate = useCallback(
    (variables: TVariables) => {
      pendingRef.current = variables;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(async () => {
        const vars = pendingRef.current;
        pendingRef.current = null;
        if (vars) {
          try {
            await onMutate(vars);
          } catch (err) {
            console.error('Debounced mutate failed:', err);
          }
        }
      }, delay);
    },
    [onMutate, delay]
  );

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      const vars = pendingRef.current;
      pendingRef.current = null;
      if (vars) {
        await onMutate(vars);
      }
    }
  }, [onMutate]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      pendingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { mutate, flush, cancel };
}

export default useOptimisticMutation;