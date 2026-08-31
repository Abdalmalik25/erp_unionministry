import { BaseResource } from '../base-resource';
import { Notification, QueryParams } from '../types';

export class NotificationsResource extends BaseResource {
  async list(params?: QueryParams & { read?: boolean; type?: string }): Promise<{ items: Notification[]; pagination: any }> {
    return this.client.requestPaginated<Notification>({
      method: 'GET',
      url: `/notifications${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.client.request<Notification>({ method: 'PUT', url: `/notifications/${id}/read` });
  }

  async markAllAsRead(): Promise<void> {
    await this.client.request({ method: 'PUT', url: '/notifications/read-all' });
  }
}