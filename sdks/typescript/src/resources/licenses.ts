import { BaseResource } from '../base-resource';
import { License, LicenseCreate, LicenseUpdate, QueryParams } from '../types';

export class LicensesResource extends BaseResource {
  async list(params?: QueryParams & { type?: string; status?: string }): Promise<{ items: License[]; pagination: any }> {
    return this.client.requestPaginated<License>({
      method: 'GET',
      url: `/licenses${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async get(id: string): Promise<License> {
    return this.client.request<License>({ method: 'GET', url: `/licenses/${id}` });
  }

  async create(data: LicenseCreate): Promise<License> {
    return this.client.request<License>({ method: 'POST', url: '/licenses', data });
  }

  async update(id: string, data: Partial<LicenseUpdate>): Promise<License> {
    return this.client.request<License>({ method: 'PUT', url: `/licenses/${id}`, data });
  }

  async renew(id: string, newExpiryDate: string): Promise<License> {
    return this.client.request<License>({
      method: 'POST',
      url: `/licenses/${id}/renew`,
      data: { newExpiryDate },
    });
  }
}