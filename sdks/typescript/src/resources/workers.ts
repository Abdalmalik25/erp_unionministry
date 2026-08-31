import { BaseResource } from '../base-resource';
import {
  WorkerProfile,
  WorkerCreate,
  WorkerUpdate,
  QueryParams,
  Contract,
  Document,
  LaborRecord,
} from '../types';

export class WorkersResource extends BaseResource {
  /** List workers */
  async list(params?: QueryParams & { employerId?: string; professionId?: string; status?: string }): Promise<{ items: WorkerProfile[]; pagination: any }> {
    return this.client.requestPaginated<WorkerProfile>({
      method: 'GET',
      url: `/workers${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Get worker by ID */
  async get(id: string): Promise<WorkerProfile> {
    return this.client.request<WorkerProfile>({ method: 'GET', url: `/workers/${id}` });
  }

  /** Register new worker */
  async create(data: WorkerCreate): Promise<WorkerProfile> {
    return this.client.request<WorkerProfile>({ method: 'POST', url: '/workers', data });
  }

  /** Update worker profile */
  async update(id: string, data: Partial<WorkerUpdate>): Promise<WorkerProfile> {
    return this.client.request<WorkerProfile>({ method: 'PUT', url: `/workers/${id}`, data });
  }

  // ============ Worker Self-Service Portal ============

  /** Get current worker's own profile */
  async getMyProfile(): Promise<WorkerProfile> {
    return this.client.request<WorkerProfile>({ method: 'GET', url: '/worker-portal/profile' });
  }

  /** Update own profile */
  async updateMyProfile(data: Partial<WorkerUpdate>): Promise<WorkerProfile> {
    return this.client.request<WorkerProfile>({ method: 'PUT', url: '/worker-portal/profile/update', data });
  }

  /** Get my documents */
  async getMyDocuments(): Promise<Document[]> {
    return this.client.request<Document[]>({ method: 'GET', url: '/worker-portal/documents' });
  }

  /** Get my contracts */
  async getMyContracts(): Promise<Contract[]> {
    return this.client.request<Contract[]>({ method: 'GET', url: '/worker-portal/contracts' });
  }

  /** Get my compliance status */
  async getMyCompliance(): Promise<any> {
    return this.client.request({ method: 'GET', url: '/worker-portal/compliance' });
  }

  /** Get worker passport data */
  async getPassport(workerId?: string): Promise<any> {
    return this.client.request({ method: 'GET', url: '/worker-passport', params: workerId ? { workerId } : {} });
  }

  // ============ Labor Records ============

  /** List labor records */
  async laborRecords(params?: QueryParams & { workerId?: string; recordType?: string }): Promise<{ items: LaborRecord[]; pagination: any }> {
    return this.client.requestPaginated<LaborRecord>({
      method: 'GET',
      url: `/labor-records${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Create labor record */
  async createLaborRecord(data: any): Promise<LaborRecord> {
    return this.client.request<LaborRecord>({ method: 'POST', url: '/labor-records', data });
  }

  // ============ Dispatches ============

  /** List worker dispatches */
  async dispatches(params?: QueryParams & { workerId?: string; status?: string }): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/dispatches${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Create dispatch */
  async createDispatch(data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: '/dispatches', data });
  }

  /** Update dispatch status */
  async updateDispatchStatus(id: string, status: string, notes?: string): Promise<any> {
    return this.client.request({ method: 'PUT', url: `/dispatches/${id}/status`, data: { status, notes } });
  }

  // ============ Reduction Requests ============

  /** List reduction requests */
  async reductionRequests(params?: QueryParams & { workerId?: string; status?: string }): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/reduction-requests${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Create reduction request */
  async createReductionRequest(data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: '/reduction-requests', data });
  }

  /** Update reduction request status */
  async updateReductionRequestStatus(id: string, data: any): Promise<any> {
    return this.client.request({ method: 'PUT', url: `/reduction-requests/${id}/status`, data });
  }

  // ============ Evaluation Certificates ============

  /** List evaluation certificates */
  async certificates(params?: QueryParams & { workerId?: string; level?: string }): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/evaluation-certificates${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Issue certificate */
  async issueCertificate(data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: '/evaluation-certificates', data });
  }
}