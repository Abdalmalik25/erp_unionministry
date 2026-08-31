import { BaseResource } from '../base-resource';
import { Inspection, InspectionCreate, InspectionUpdate, InspectionComplete, QueryParams } from '../types';

export class InspectionsResource extends BaseResource {
  /** List inspections */
  async list(params?: QueryParams & { employerId?: string; inspectorId?: string; status?: string; type?: string }): Promise<{ items: Inspection[]; pagination: any }> {
    return this.client.requestPaginated<Inspection>({
      method: 'GET',
      url: `/inspections${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Get inspection */
  async get(id: string): Promise<Inspection> {
    return this.client.request<Inspection>({ method: 'GET', url: `/inspections/${id}` });
  }

  /** Create inspection */
  async create(data: InspectionCreate): Promise<Inspection> {
    return this.client.request<Inspection>({ method: 'POST', url: '/inspections', data });
  }

  /** Update inspection */
  async update(id: string, data: Partial<InspectionUpdate>): Promise<Inspection> {
    return this.client.request<Inspection>({ method: 'PUT', url: `/inspections/${id}`, data });
  }

  /** Add violation to inspection */
  async addViolation(id: string, data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: `/inspections/${id}/violations`, data });
  }

  /** Complete inspection with findings */
  async complete(id: string, data: InspectionComplete): Promise<Inspection> {
    return this.client.request<Inspection>({ method: 'POST', url: `/inspections/${id}/complete`, data });
  }

  // ============ OSH Incidents ============

  /** List OSH incidents */
  async incidents(params?: QueryParams & { severity?: string; status?: string }): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/osh-incidents${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** Report OSH incident */
  async reportIncident(data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: '/osh-incidents', data });
  }

  /** Get incident */
  async getIncident(id: string): Promise<any> {
    return this.client.request({ method: 'GET', url: `/osh-incidents/${id}` });
  }

  /** Update incident */
  async updateIncident(id: string, data: any): Promise<any> {
    return this.client.request({ method: 'PUT', url: `/osh-incidents/${id}`, data });
  }
}