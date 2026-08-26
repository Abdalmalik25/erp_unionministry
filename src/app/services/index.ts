/**
 * services/index.ts — Service layer barrel exports
 * Composes the API client with domain-specific services
 */

import api from './api';

// Types للعمليات المشتركة
export type { User } from '../contexts/AuthContext';

// === Dictionary / Reference Data Services ===

export const dictionary = {
  governorates: () => api.get('/geography/governorates'),
  isic4: () => api.get('/isic4'),
  nationalDirectories: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/national-directories?${paramsStr}`);
  },
  nationalOccupations: () => api.get('/national-occupations'),
  sectorProperties: () => api.get('/sector-properties'),
};

// === Entity Services ===

export const entityService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/entities?${paramsStr}`);
  },
  detail: (id: string) => api.get(`/entities/${id}`),
  overview: (id: string) => api.get(`/entities/${id}/overview`),
  create: (data: any) => api.post('/entities', data),
  update: (id: string, data: any) => api.put(`/entities/${id}`, data),
  delete: (id: string) => api.del(`/entities/${id}`),
  members: (entityId: string, params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/entities/${entityId}/members?${paramsStr}`);
  },
};

// === Member Services ===

export const memberService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/members?${paramsStr}`);
  },
  detail: (id: string) => api.get(`/members/${id}`),
  create: (data: any) => api.post('/members', data),
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
  delete: (id: string) => api.del(`/members/${id}`),
};

// === Worker Profile Services ===

export const workerProfileService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/worker-profiles?${paramsStr}`);
  },
  detail: (id: string) => api.get(`/worker-profiles/${id}`),
  create: (data: any) => api.post('/worker-profiles', data),
  update: (id: string, data: any) => api.put(`/worker-profiles/${id}`, data),
  delete: (id: string) => api.del(`/worker-profiles/${id}`),
};

// === Dashboard Services ===

export const dashboardService = {
  stats: () => api.get('/dashboard/enhanced-stats'),
  timeSeries: () => api.get('/dashboard/time-series'),
};

// === Compliance Services ===

export const complianceService = {
  alerts: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/compliance-alerts?${paramsStr}`);
  },
  resolve: (id: string) => api.put(`/compliance-alerts/${id}/resolve`, {}),
  acknowledge: (id: string) => api.put(`/compliance-alerts/${id}/acknowledge`, {}),
  detail: (id: string) => api.get(`/compliance-alerts/${id}`),
};

// === Violations Services ===

export const violationService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/violations?${paramsStr}`);
  },
  create: (data: any) => api.post('/violations', data),
  detail: (id: string) => api.get(`/violations/${id}`),
  update: (id: string, data: any) => api.put(`/violations/${id}`, data),
  delete: (id: string) => api.del(`/violations/${id}`),
};

// === Inspection Services ===

export const inspectionService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/inspections?${paramsStr}`);
  },
  create: (data: any) => api.post('/inspections', data),
  detail: (id: string) => api.get(`/inspections/${id}`),
  update: (id: string, data: any) => api.put(`/inspections/${id}`, data),
  delete: (id: string) => api.del(`/inspections/${id}`),
};

// === License Services ===

export const licenseService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/licenses?${paramsStr}`);
  },
  create: (data: any) => api.post('/licenses', data),
  detail: (id: string) => api.get(`/licenses/${id}`),
  update: (id: string, data: any) => api.put(`/licenses/${id}`, data),
  delete: (id: string) => api.del(`/licenses/${id}`),
};

// === Service Request Services ===

export const serviceRequestService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/service-requests?${paramsStr}`);
  },
  create: (data: any) => api.post('/service-requests', data),
  detail: (id: string) => api.get(`/service-requests/${id}`),
  update: (id: string, data: any) => api.put(`/service-requests/${id}`, data),
  delete: (id: string) => api.del(`/service-requests/${id}`),
};

// === Audit Log Services ===

export const auditService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/audit-log?${paramsStr}`);
  },
};

// === Reports Services ===

export const reportService = {
  scheduled: (type: string, period = 'daily') => api.get(`/reports/scheduled/${type}?period=${period}`),
  generate: (type: string, period = 'daily') => api.get(`/reports/scheduled?type=${type}&period=${period}`),
};

// === Cases & Contracts Services ===

export const casesService = {
  list: (params = {}) => {
    const paramsStr = new URLSearchParams(params as any).toString();
    return api.get(`/v1/cases?${paramsStr}`);
  },
  detail: (id: string) => api.get(`/v1/cases/${id}`),
};

// === Integrations Services ===

export const integrationService = {
  list: () => api.get('/v1/integrations'),
  queue: () => api.get('/v1/integrations/queue'),
  verify: (code: string, payload: any) =>
    api.post(`/v1/integrations/${code}/verify`, payload),
};

// === Excellence Services ===

export const excellenceService = {
  slos: () => api.get('/v1/excellence/slos'),
  forecast: () => api.get('/v1/excellence/forecast'),
  maturity: () => api.get('/v1/excellence/maturity'),
};