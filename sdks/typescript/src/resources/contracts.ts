import { BaseResource } from '../base-resource';
import { Contract, ContractCreate, ContractUpdate, QueryParams } from '../types';

export class ContractsResource extends BaseResource {
  async list(params?: QueryParams & { employerId?: string; workerId?: string; status?: string }): Promise<{ items: Contract[]; pagination: any }> {
    return this.client.requestPaginated<Contract>({
      method: 'GET',
      url: `/contracts${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async get(id: string): Promise<Contract> {
    return this.client.request<Contract>({ method: 'GET', url: `/contracts/${id}` });
  }

  async create(data: ContractCreate): Promise<Contract> {
    return this.client.request<Contract>({ method: 'POST', url: '/contracts', data });
  }

  async update(id: string, data: Partial<ContractUpdate>): Promise<Contract> {
    return this.client.request<Contract>({ method: 'PUT', url: `/contracts/${id}`, data });
  }

  async terminate(id: string, reason: string, terminationDate?: string): Promise<Contract> {
    return this.client.request<Contract>({
      method: 'POST',
      url: `/contracts/${id}/terminate`,
      data: { reason, terminationDate },
    });
  }
}