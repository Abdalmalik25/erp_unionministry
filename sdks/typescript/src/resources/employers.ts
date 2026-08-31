import { BaseResource } from '../base-resource';
import { Entity, QueryParams } from '../types';

export class EmployersResource extends BaseResource {
  /** List employers */
  async list(params?: QueryParams & { sectorId?: string; status?: string }): Promise<{ items: Entity[]; pagination: any }> {
    return this.client.requestPaginated<Entity>({
      method: 'GET',
      url: `/employers${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Get employer by ID */
  async get(id: string): Promise<Entity> {
    return this.client.request<Entity>({ method: 'GET', url: `/employers/${id}` });
  }

  /** Register new employer */
  async create(data: any): Promise<Entity> {
    return this.client.request<Entity>({ method: 'POST', url: '/employers', data });
  }

  /** Update employer */
  async update(id: string, data: any): Promise<Entity> {
    return this.client.request<Entity>({ method: 'PUT', url: `/employers/${id}`, data });
  }

  // ============ Employer Self-Service Portal ============

  /** Get my employer dashboard */
  async getMyDashboard(): Promise<any> {
    return this.client.request({ method: 'GET', url: '/employer-portal/dashboard' });
  }

  /** List my workers */
  async getMyWorkers(params?: QueryParams): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/employer-portal/workers${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** List my contracts */
  async getMyContracts(params?: QueryParams): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/employer-portal/contracts${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Create a contract as employer */
  async createContract(data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: '/employer-portal/contracts', data });
  }

  /** List my payments */
  async getMyPayments(params?: QueryParams): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/employer-portal/payments${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Initiate a payment */
  async initiatePayment(data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: '/employer-portal/payments/initiate', data });
  }

  /** Get my compliance status */
  async getMyCompliance(): Promise<any> {
    return this.client.request({ method: 'GET', url: '/employer-portal/compliance' });
  }
}