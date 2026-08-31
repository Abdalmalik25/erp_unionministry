import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  QueryParams,
  LoginRequest,
  LoginResponse,
  User,
} from './types';
import { AuthResource } from './resources/auth';
import { EntitiesResource } from './resources/entities';
import { MembersResource } from './resources/members';
import { WorkersResource } from './resources/workers';
import { EmployersResource } from './resources/employers';
import { InspectionsResource } from './resources/inspections';
import { ContractsResource } from './resources/contracts';
import { LicensesResource } from './resources/licenses';
import { PaymentsResource } from './resources/payments';
import { DisputesResource } from './resources/disputes';
import { ComplianceResource } from './resources/compliance';
import { DocumentsResource } from './resources/documents';
import { TrainingResource } from './resources/training';
import { DashboardResource } from './resources/dashboard';
import { NotificationsResource } from './resources/notifications';
import { AuditResource } from './resources/audit';
import { DirectoriesResource } from './resources/directories';
import { IntelligenceResource } from './resources/intelligence';
import { UploadsResource } from './resources/uploads';

/**
 * Configuration options for the SDK client
 */
export interface SDKConfig {
  baseURL: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onUnauthorized?: () => Promise<string | null>;
  onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string }) => void;
  locale?: 'en' | 'ar';
}

/**
 * Main SDK Client for the National Labor Platform API
 */
export class NationalLaborPlatformClient {
  private axios: AxiosInstance;
  private config: SDKConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  // Resource modules
  public readonly auth: AuthResource;
  public readonly entities: EntitiesResource;
  public readonly members: MembersResource;
  public readonly workers: WorkersResource;
  public readonly employers: EmployersResource;
  public readonly inspections: InspectionsResource;
  public readonly contracts: ContractsResource;
  public readonly licenses: LicensesResource;
  public readonly payments: PaymentsResource;
  public readonly disputes: DisputesResource;
  public readonly compliance: ComplianceResource;
  public readonly documents: DocumentsResource;
  public readonly training: TrainingResource;
  public readonly dashboard: DashboardResource;
  public readonly notifications: NotificationsResource;
  public readonly audit: AuditResource;
  public readonly directories: DirectoriesResource;
  public readonly intelligence: IntelligenceResource;
  public readonly uploads: UploadsResource;

  constructor(config: SDKConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      locale: 'en',
      ...config,
    };

    this.accessToken = config.accessToken || null;
    this.refreshToken = config.refreshToken || null;

    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': this.config.locale || 'en',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
      },
    });

    // Request interceptor — attach auth token
    this.axios.interceptors.request.use(
      (cfg) => {
        if (this.accessToken && !cfg.headers.Authorization) {
          cfg.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return cfg;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor — handle 401 with token refresh
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true;
          try {
            const newToken = await this.handleTokenRefresh();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.axios(originalRequest);
            }
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(this.normalizeError(error));
      }
    );

    // Initialize resource modules
    this.auth = new AuthResource(this);
    this.entities = new EntitiesResource(this);
    this.members = new MembersResource(this);
    this.workers = new WorkersResource(this);
    this.employers = new EmployersResource(this);
    this.inspections = new InspectionsResource(this);
    this.contracts = new ContractsResource(this);
    this.licenses = new LicensesResource(this);
    this.payments = new PaymentsResource(this);
    this.disputes = new DisputesResource(this);
    this.compliance = new ComplianceResource(this);
    this.documents = new DocumentsResource(this);
    this.training = new TrainingResource(this);
    this.dashboard = new DashboardResource(this);
    this.notifications = new NotificationsResource(this);
    this.audit = new AuditResource(this);
    this.directories = new DirectoriesResource(this);
    this.intelligence = new IntelligenceResource(this);
    this.uploads = new UploadsResource(this);
  }

  /** Internal: make a request through the axios instance */
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.axios(config);
    if (response.data?.success === false) {
      throw new SDKError(
        response.data.errors?.message || 'API Error',
        response.data.errors?.code || 'UNKNOWN_ERROR',
        response.status,
        response.data.errors?.details
      );
    }
    return response.data.data as T;
  }

  /** Internal: make a request that returns a paginated response */
  async requestPaginated<T = any>(
    config: AxiosRequestConfig
  ): Promise<{ items: T[]; pagination: any }> {
    const response: AxiosResponse<ApiResponse<{ items: T[]; pagination: any }>> = await this.axios(config);
    if (response.data?.success === false) {
      throw new SDKError(
        response.data.errors?.message || 'API Error',
        response.data.errors?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }
    return response.data.data || { items: [], pagination: null };
  }

  /** Internal: make a raw axios call returning the full response */
  async requestRaw<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axios(config);
  }

  /** Set the access token (e.g. after login) */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  /** Set the refresh token */
  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }

  /** Get the current access token */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** Get the current refresh token */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /** Update the SDK configuration */
  updateConfig(partial: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.baseURL) {
      this.axios.defaults.baseURL = partial.baseURL;
    }
    if (partial.timeout) {
      this.axios.defaults.timeout = partial.timeout;
    }
  }

  /** Handle token refresh — dedupes concurrent calls */
  private async handleTokenRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        if (!this.refreshToken) return null;
        if (this.config.onUnauthorized) {
          const newToken = await this.config.onUnauthorized();
          if (newToken) {
            this.setAccessToken(newToken);
            return newToken;
          }
          return null;
        }

        const response = await this.axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          '/auth/refresh',
          { refreshToken: this.refreshToken }
        );

        if (response.data.success && response.data.data) {
          const tokens = response.data.data;
          this.setAccessToken(tokens.accessToken);
          this.setRefreshToken(tokens.refreshToken);

          if (this.config.onTokenRefresh) {
            this.config.onTokenRefresh(tokens);
          }
          return tokens.accessToken;
        }
        return null;
      } catch (err) {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /** Normalize axios errors to SDKError */
  private normalizeError(error: any): SDKError {
    if (error.response?.data?.errors) {
      const errData = error.response.data.errors;
      return new SDKError(
        errData.message || 'API Error',
        errData.code || 'UNKNOWN_ERROR',
        error.response.status,
        errData.details
      );
    }
    if (error.code === 'ECONNABORTED') {
      return new SDKError('Request timeout', 'TIMEOUT', 408);
    }
    if (error.code === 'ERR_NETWORK') {
      return new SDKError('Network error', 'NETWORK_ERROR', 0);
    }
    return new SDKError(error.message || 'Unknown error', 'UNKNOWN_ERROR', 0);
  }
}

/** SDK error class with rich context */
export class SDKError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, SDKError.prototype);
  }
}

export default NationalLaborPlatformClient;