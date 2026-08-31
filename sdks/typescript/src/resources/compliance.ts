import { BaseResource } from '../base-resource';
import { ComplianceAlert, QueryParams } from '../types';

export class ComplianceResource extends BaseResource {
  async alerts(params?: QueryParams & { severity?: string; status?: string }): Promise<{ items: ComplianceAlert[]; pagination: any }> {
    return this.client.requestPaginated<ComplianceAlert>({
      method: 'GET',
      url: `/compliance/alerts${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async acknowledgeAlert(id: string): Promise<ComplianceAlert> {
    return this.client.request<ComplianceAlert>({ method: 'PUT', url: `/compliance/alerts/${id}/acknowledge` });
  }

  async resolveAlert(id: string, resolution: string, evidence?: string[]): Promise<ComplianceAlert> {
    return this.client.request<ComplianceAlert>({
      method: 'PUT',
      url: `/compliance/alerts/${id}/resolve`,
      data: { resolution, evidence },
    });
  }
}