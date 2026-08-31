import { BaseResource } from '../base-resource';
import { Document, QueryParams } from '../types';

export class DocumentsResource extends BaseResource {
  async list(params?: QueryParams & { entityId?: string; type?: string }): Promise<{ items: Document[]; pagination: any }> {
    return this.client.requestPaginated<Document>({
      method: 'GET',
      url: `/documents${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async get(id: string): Promise<Document> {
    return this.client.request<Document>({ method: 'GET', url: `/documents/${id}` });
  }

  async delete(id: string): Promise<void> {
    await this.client.request({ method: 'DELETE', url: `/documents/${id}` });
  }
}