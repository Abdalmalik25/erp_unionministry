import { BaseResource } from '../base-resource';
import { AnalyticsData, Recommendation, RiskAssessment } from '../types';

export class IntelligenceResource extends BaseResource {
  /** Get analytics for a metric */
  async analytics(params: { metric: string; governorate?: string; dateRange?: string }): Promise<AnalyticsData> {
    return this.client.request<AnalyticsData>({
      method: 'GET',
      url: `/intelligence/analytics${this.buildQuery(params)}`,
    });
  }

  /** Get AI-powered recommendations */
  async recommendations(params?: { category?: string }): Promise<Recommendation[]> {
    return this.client.request<Recommendation[]>({
      method: 'GET',
      url: `/intelligence/recommendations${this.buildQuery(params)}`,
    });
  }

  /** Perform risk assessment */
  async riskAssessment(entityType: 'employer' | 'worker' | 'union', entityId: string, assessmentType?: string): Promise<RiskAssessment> {
    return this.client.request<RiskAssessment>({
      method: 'POST',
      url: '/intelligence/risk-assessment',
      data: { entityType, entityId, assessmentType },
    });
  }

  // ============ External Integrations ============

  /** Get social security data for worker */
  async getSocialSecurity(workerId: string): Promise<any> {
    return this.client.request({ method: 'GET', url: `/integrations/social-security?workerId=${encodeURIComponent(workerId)}` });
  }

  /** Verify passport */
  async verifyPassport(passportNumber: string, nationality: string): Promise<any> {
    return this.client.request({
      method: 'GET',
      url: `/integrations/passport${this.buildQuery({ passportNumber, nationality })}`,
    });
  }

  // ============ Data Quality ============

  /** Get data quality report */
  async dataQualityReport(entityType?: string): Promise<any> {
    return this.client.request({
      method: 'GET',
      url: `/data-quality/report${this.buildQuery({ entityType })}`,
    });
  }

  /** List data quality issues */
  async dataQualityIssues(params?: { severity?: string; status?: string; page?: number; limit?: number }): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/data-quality/issues${this.buildQuery(params)}`,
    });
  }
}