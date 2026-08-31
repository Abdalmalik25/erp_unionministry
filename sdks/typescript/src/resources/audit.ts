import { BaseResource } from '../base-resource';
import { AuditLogEntry, QueryParams } from '../types';

export class AuditResource extends BaseResource {
  async list(params?: QueryParams & { userId?: string; action?: string; entityType?: string; entityId?: string }): Promise<{ items: AuditLogEntry[]; pagination: any }> {
    return this.client.requestPaginated<AuditLogEntry>({
      method: 'GET',
      url: `/audit-log${this.buildQuery(this.withPagination(params))}`,
    });
  }
}