import { BaseResource } from '../base-resource';
import { Member, MemberCreate, MemberUpdate, QueryParams } from '../types';

export class MembersResource extends BaseResource {
  async list(params?: QueryParams & { entityId?: string; status?: string }): Promise<{ items: Member[]; pagination: any }> {
    return this.client.requestPaginated<Member>({
      method: 'GET',
      url: `/members${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async get(id: string): Promise<Member> {
    return this.client.request<Member>({ method: 'GET', url: `/members/${id}` });
  }

  async create(data: MemberCreate): Promise<Member> {
    return this.client.request<Member>({ method: 'POST', url: '/members', data });
  }

  async update(id: string, data: Partial<MemberUpdate>): Promise<Member> {
    return this.client.request<Member>({ method: 'PUT', url: `/members/${id}`, data });
  }

  async delete(id: string): Promise<void> {
    await this.client.request({ method: 'DELETE', url: `/members/${id}` });
  }
}