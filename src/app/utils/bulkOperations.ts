/**
 * bulkOperations — High-performance batch operations utility
 * Yemen National Labor Platform
 *
 * Provides batched API calls for bulk operations like:
 * - Bulk status update (approve/reject multiple items)
 * - Bulk delete (soft delete with audit trail)
 * - Bulk export (CSV/JSON streaming)
 * - Bulk assign (assign multiple items to user/role)
 *
 * Features:
 * - Configurable concurrency (prevents server overload)
 * - Progress callbacks
 * - Error collection (partial success support)
 * - Abort signal support
 * - Retry on transient failures
 */

import { get, post, patch, del, ApiError } from '../services/api';

export interface BulkOperationItem<T = unknown> {
  id: string;
  data?: T;
  metadata?: Record<string, unknown>;
}

export interface BulkOptions {
  /** Max concurrent requests (default: 5) */
  concurrency?: number;
  /** Max retries per item on failure (default: 2) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Only retry on retryable errors (default: true) */
  retryOnlyRetryable?: boolean;
  /** Abort signal */
  signal?: AbortSignal;
  /** Progress callback (called after each item) */
  onProgress?: (progress: BulkProgress) => void;
  /** Error callback (called for each failure) */
  onError?: (error: BulkError, item: BulkOperationItem) => void;
}

export interface BulkProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percent: number;
  currentItem?: BulkOperationItem;
  errors: BulkError[];
}

export interface BulkError {
  item: BulkOperationItem;
  error: Error;
  attempts: number;
  retryable: boolean;
}

export interface BulkResult<T = unknown> {
  successful: Array<{ item: BulkOperationItem; data?: T }>;
  failed: BulkError[];
  total: number;
  duration: number;
  totalAttempts: number;
}

export type BulkOperationType = 'update' | 'delete' | 'approve' | 'reject' | 'assign' | 'export';

/**
 * Execute a bulk operation with concurrency control
 */
export async function executeBulkOperation<T = unknown>(
  operation: BulkOperationType,
  endpoint: string,
  items: BulkOperationItem[],
  payloadBuilder: (item: BulkOperationItem) => unknown,
  options: BulkOptions = {}
): Promise<BulkResult<T>> {
  const {
    concurrency = 5,
    maxRetries = 2,
    retryDelay = 1000,
    retryOnlyRetryable = true,
    signal,
    onProgress,
    onError,
  } = options;

  const startTime = Date.now();
  const result: BulkResult<T> = {
    successful: [],
    failed: [],
    total: items.length,
    duration: 0,
    totalAttempts: 0,
  };

  const errors: BulkError[] = [];
  let completed = 0;

  // Initialize progress
  const reportProgress = (currentItem?: BulkOperationItem) => {
    onProgress?.({
      total: items.length,
      completed,
      failed: errors.length,
      pending: items.length - completed - errors.length,
      percent: Math.round(((completed + errors.length) / items.length) * 100),
      currentItem,
      errors: [...errors],
    });
  };

  reportProgress();

  // Process items with concurrency control
  const processItem = async (item: BulkOperationItem): Promise<void> => {
    if (signal?.aborted) {
      errors.push({
        item,
        error: new Error('Aborted'),
        attempts: 0,
        retryable: false,
      });
      completed++;
      reportProgress(item);
      return;
    }

    let lastError: Error | null = null;
    let attempts = 0;
    const isRetryable = (err: Error): boolean => {
      if (!retryOnlyRetryable) return true;
      if (err instanceof ApiError) return err.retryable;
      return true; // Network errors are retryable by default
    };

    while (attempts <= maxRetries) {
      attempts++;
      result.totalAttempts++;

      try {
        let data: T | undefined;
        const payload = payloadBuilder(item);

        switch (operation) {
          case 'update':
            data = await patch<T>(`${endpoint}/${item.id}`, payload);
            break;
          case 'delete':
            await del(`${endpoint}/${item.id}`);
            break;
          case 'approve':
          case 'reject':
            data = await post<T>(`${endpoint}/${item.id}/${operation}`, payload);
            break;
          case 'assign':
            data = await post<T>(`${endpoint}/${item.id}/assign`, payload);
            break;
          case 'export':
            data = await get<T>(`${endpoint}/${item.id}/export`);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        result.successful.push({ item, data });
        completed++;
        reportProgress(item);
        return;
      } catch (err) {
        lastError = err as Error;

        if (attempts > maxRetries || !isRetryable(lastError)) {
          const bulkError: BulkError = {
            item,
            error: lastError,
            attempts,
            retryable: isRetryable(lastError),
          };
          errors.push(bulkError);
          result.failed.push(bulkError);
          onError?.(bulkError, item);
          completed++;
          reportProgress(item);
          return;
        }

        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempts - 1);
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, delay);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        if (signal?.aborted) {
          errors.push({
            item,
            error: new Error('Aborted during retry'),
            attempts,
            retryable: false,
          });
          result.failed.push({
            item,
            error: new Error('Aborted during retry'),
            attempts,
            retryable: false,
          });
          completed++;
          reportProgress(item);
          return;
        }
      }
    }
  };

  // Concurrency-limited execution
  const queue = [...items];
  const inFlight: Promise<void>[] = [];

  while (queue.length > 0 || inFlight.length > 0) {
    while (inFlight.length < concurrency && queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      if (signal?.aborted) break;

      const promise = processItem(item).finally(() => {
        const idx = inFlight.indexOf(promise);
        if (idx > -1) inFlight.splice(idx, 1);
      });
      inFlight.push(promise);
    }

    if (inFlight.length > 0) {
      await Promise.race([Promise.all(inFlight), new Promise<void>((r) => setTimeout(r, 10))]);
    }

    if (signal?.aborted) break;
  }

  // Wait for remaining
  await Promise.allSettled(inFlight);

  result.duration = Date.now() - startTime;
  return result;
}

// ─────────────────────────────────────────────────
// Specialized Bulk Operations
// ─────────────────────────────────────────────────

/**
 * Bulk approve multiple items
 */
export async function bulkApprove<T = unknown>(
  endpoint: string,
  ids: string[],
  options: BulkOptions = {}
): Promise<BulkResult<T>> {
  return executeBulkOperation<T>(
    'approve',
    endpoint,
    ids.map((id) => ({ id })),
    () => ({ approvedAt: new Date().toISOString() }),
    options
  );
}

/**
 * Bulk reject with reason
 */
export async function bulkReject<T = unknown>(
  endpoint: string,
  ids: string[],
  reason: string,
  options: BulkOptions = {}
): Promise<BulkResult<T>> {
  return executeBulkOperation<T>(
    'reject',
    endpoint,
    ids.map((id) => ({ id })),
    () => ({ reason, rejectedAt: new Date().toISOString() }),
    options
  );
}

/**
 * Bulk delete (soft delete)
 */
export async function bulkDelete<T = unknown>(
  endpoint: string,
  ids: string[],
  options: BulkOptions = {}
): Promise<BulkResult<T>> {
  return executeBulkOperation<T>(
    'delete',
    endpoint,
    ids.map((id) => ({ id })),
    () => ({}),
    options
  );
}

/**
 * Bulk assign to user
 */
export async function bulkAssign<T = unknown>(
  endpoint: string,
  ids: string[],
  assigneeId: string,
  options: BulkOptions = {}
): Promise<BulkResult<T>> {
  return executeBulkOperation<T>(
    'assign',
    endpoint,
    ids.map((id) => ({ id })),
    () => ({ assigneeId, assignedAt: new Date().toISOString() }),
    options
  );
}

/**
 * Bulk update with custom field
 */
export async function bulkUpdate<T = unknown>(
  endpoint: string,
  items: Array<{ id: string; data: Record<string, unknown> }>,
  options: BulkOptions = {}
): Promise<BulkResult<T>> {
  return executeBulkOperation<T>(
    'update',
    endpoint,
    items,
    (item) => item.data,
    options
  );
}

// ─────────────────────────────────────────────────
// Batch Export
// ─────────────────────────────────────────────────

/**
 * Generate CSV from bulk data
 */
export function generateCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T; header: string; formatter?: (v: unknown) => string }>
): string {
  const header = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const raw = row[col.key];
          const value = col.formatter ? col.formatter(raw) : raw;
          const str = value == null ? '' : String(value);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');

  return `${header}\n${body}`;
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
