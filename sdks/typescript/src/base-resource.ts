import { AxiosRequestConfig } from 'axios';
import { NationalLaborPlatformClient } from './client';
import { PaginationParams, QueryParams } from './types';

/**
 * Base class for all API resource modules.
 * Provides common CRUD operations + pagination + filtering.
 */
export abstract class BaseResource {
  protected client: NationalLaborPlatformClient;

  constructor(client: NationalLaborPlatformClient) {
    this.client = client;
  }

  /** Build query string from params object */
  protected buildQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const filtered = Object.entries(params).filter(
      ([_, value]) => value !== undefined && value !== null && value !== ''
    );
    if (filtered.length === 0) return '';
    const qs = new URLSearchParams();
    for (const [key, value] of filtered) {
      if (Array.isArray(value)) {
        value.forEach((v) => qs.append(key, String(v)));
      } else {
        qs.append(key, String(value));
      }
    }
    return `?${qs.toString()}`;
  }

  /** Merge pagination defaults into params */
  protected withPagination(params?: QueryParams, defaultLimit = 20): Record<string, any> {
    return {
      page: params?.page || 1,
      limit: params?.limit || defaultLimit,
      ...params,
    };
  }
}