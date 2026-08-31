import { BaseResource } from '../base-resource';
import { TrainingRecord, TrainingCreate, TrainingUpdate, QueryParams } from '../types';

export class TrainingResource extends BaseResource {
  async list(params?: QueryParams & { workerId?: string; type?: string }): Promise<{ items: TrainingRecord[]; pagination: any }> {
    return this.client.requestPaginated<TrainingRecord>({
      method: 'GET',
      url: `/training${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async get(id: string): Promise<TrainingRecord> {
    return this.client.request<TrainingRecord>({ method: 'GET', url: `/training/${id}` });
  }

  async create(data: TrainingCreate): Promise<TrainingRecord> {
    return this.client.request<TrainingRecord>({ method: 'POST', url: '/training', data });
  }

  async update(id: string, data: Partial<TrainingUpdate>): Promise<TrainingRecord> {
    return this.client.request<TrainingRecord>({ method: 'PUT', url: `/training/${id}`, data });
  }
}