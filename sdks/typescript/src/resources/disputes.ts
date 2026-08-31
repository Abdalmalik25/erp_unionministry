import { BaseResource } from '../base-resource';
import { Dispute, DisputeCreate, DisputeUpdate, QueryParams } from '../types';

export class DisputesResource extends BaseResource {
  async list(params?: QueryParams & { status?: string; type?: string }): Promise<{ items: Dispute[]; pagination: any }> {
    return this.client.requestPaginated<Dispute>({
      method: 'GET',
      url: `/disputes${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async get(id: string): Promise<Dispute> {
    return this.client.request<Dispute>({ method: 'GET', url: `/disputes/${id}` });
  }

  async create(data: DisputeCreate): Promise<Dispute> {
    return this.client.request<Dispute>({ method: 'POST', url: '/disputes', data });
  }

  async update(id: string, data: Partial<DisputeUpdate>): Promise<Dispute> {
    return this.client.request<Dispute>({ method: 'PUT', url: `/disputes/${id}`, data });
  }

  async resolve(id: string, resolution: string, decision?: string, implementationDate?: string): Promise<Dispute> {
    return this.client.request<Dispute>({
      method: 'POST',
      url: `/disputes/${id}/resolve`,
      data: { resolution, decision, implementationDate },
    });
  }
}