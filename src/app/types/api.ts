/**
 * Shared API types — Pagination & common envelopes
 * Used to replace `any` for `meta` fields across services without breaking runtime
 */
export interface PaginationMeta {
  total?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
  count?: number;
  hasMore?: boolean;
  [key: string]: unknown;
}
export interface ApiEnvelope<T> {
  data?: T;
  meta?: PaginationMeta;
  errors?: unknown[];
  success?: boolean;
}
