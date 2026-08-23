/**
 * AI Labor Risk & Compliance Prediction Engine (Client-Side Intelligence)
 * منظومة الذكاء الاصطناعي لاستشراف مخاطر سوق العمل والتنبؤ بمعدلات الامتثال
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 */

export interface EntityRiskAssessment {
  entity_id: string;
  entity_name: string;
  sector?: string;
  ai_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_level_ar: string;
  color: string;
  confidence_rate: number;
  metrics: {
    open_violations: number;
    severe_violations: number;
    failed_inspections: number;
    unresolved_alerts: number;
    actual_yemenization_ratio: number;
    target_yemenization_ratio: number;
    total_workforce: number;
  };
  prescriptive_recommendations: string[];
  assessment_timestamp: string;
}

export interface LaborMarketInsights {
  engine_version: string;
  analysis_period: string;
  macro_indicators: {
    total_standard_professions: number;
    total_registered_establishments: number;
    active_tracked_workforce: number;
    system_open_violations: number;
    national_yemenization_index: number;
    average_wage_stability_index: number;
  };
  top_demanded_sectors: Array<{
    sector: string;
    growth_rate: string;
    demand_level: string;
  }>;
  legal_compliance_health: {
    osh_compliance_score: number;
    written_contract_rate: number;
    medical_exam_completion_rate: number;
  };
}

/**
 * Fetch AI Risk Assessment for a specific establishment
 */
export async function fetchEntityRiskAssessment(entityId: string): Promise<EntityRiskAssessment | null> {
  try {
    const res = await fetch(`/api/ai/risk-matrix/${entityId}`);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch Macro Labor Market Insights from AI Engine
 */
export async function fetchLaborMarketInsights(): Promise<LaborMarketInsights | null> {
  try {
    const res = await fetch('/api/ai/labor-market-insights');
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}
