import { BaseResource } from '../base-resource';
import { DashboardStats, EnhancedStats } from '../types';

export class DashboardResource extends BaseResource {
  async stats(params?: { governorate?: string; dateRange?: string }): Promise<DashboardStats> {
    return this.client.request<DashboardStats>({
      method: 'GET',
      url: `/dashboard/stats${this.buildQuery(params)}`,
    });
  }

  async enhancedStats(params?: { governorate?: string; dateRange?: string; includePredictions?: boolean }): Promise<EnhancedStats> {
    return this.client.request<EnhancedStats>({
      method: 'GET',
      url: `/dashboard/enhanced-stats${this.buildQuery(params)}`,
    });
  }
}