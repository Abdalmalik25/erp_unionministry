import type { PaginationMeta } from '../types/api';
/**
 * workerPassportService.ts — Production-Grade Worker Passport (Digital Career ID) Service
 * Yemen National Labor Platform
 * Worker Portal Foundation — career identity, qualifications, employment history
 */

import { get, post, put, getFile } from './api';

export type WorkerEmploymentStatus = 'employed' | 'unemployed' | 'self_employed' | 'retired' | 'in_training' | 'suspended';

export interface WorkerProfile {
  id: string;
  passportNumber: string; // unique digital career ID
  fullName: string;
  fullNameAr: string;
  nationalId: string;
  birthDate: string;
  gender: 'male' | 'female';
  nationality: string;
  maritalStatus?: string;
  
  // Contact
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  governorate: string;
  directorate: string;
  
  // Professional
  professionId: string;
  professionName: string;
  professionNameAr: string;
  qualificationLevel?: string;
  yearsOfExperience?: number;
  
  // Employment Status
  currentEmploymentStatus: WorkerEmploymentStatus;
  currentEmployerEntityId?: string;
  currentEmployerName?: string;
  currentContractId?: string;
  
  // Career Summary
  totalContracts: number;
  totalWorkExperienceYears: number;
  totalTrainingsCompleted: number;
  totalCertifications: number;
  
  // Digital verification
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  biometricVerified: boolean;
  
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface WorkerQualification {
  id: string;
  workerId: string;
  type: 'degree' | 'diploma' | 'certificate' | 'license' | 'training' | 'skill';
  title: string;
  institution: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  fileId?: string;
}

export interface WorkerEmploymentHistory {
  id: string;
  workerId: string;
  employerEntityId: string;
  employerName: string;
  contractId?: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  durationMonths: number;
  reasonForLeaving?: string;
  rating?: number;
  certificateId?: string;
}

export interface WorkerTraining {
  id: string;
  workerId: string;
  trainingId: string;
  trainingName: string;
  provider: string;
  startDate: string;
  endDate: string;
  duration: number;
  certificateIssued: boolean;
  certificateNumber?: string;
  skills: string[];
}

export interface WorkerDisputeHistory {
  disputeId: string;
  caseNumber: string;
  category: string;
  status: string;
  filedAt: string;
  resolvedAt?: string;
  outcome?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

// ============================================================
// PRODUCTION-GRADE WORKER PASSPORT SERVICE
// ============================================================

export const workerPassportService = {
  /**
   * Get worker's passport
   */
  async getMyPassport(): Promise<ServiceResponse<WorkerProfile>> {
    return get<any>('/worker-passport/me');
  },

  /**
   * Get worker passport by ID
   */
  async getPassportById(workerId: string): Promise<ServiceResponse<WorkerProfile>> {
    return get<any>(`/worker-passport/${workerId}`);
  },

  /**
   * Update profile
   */
  async updateProfile(data: Partial<WorkerProfile>): Promise<ServiceResponse<WorkerProfile>> {
    return put<any>('/worker-passport/me', data);
  },

  /**
   * Verify email
   */
  async verifyEmail(code: string): Promise<ServiceResponse<void>> {
    return post<any>('/worker-passport/verify-email', { code });
  },

  /**
   * Verify phone
   */
  async verifyPhone(code: string): Promise<ServiceResponse<void>> {
    return post<any>('/worker-passport/verify-phone', { code });
  },

  /**
   * Get qualifications
   */
  async getQualifications(workerId?: string): Promise<ServiceResponse<{ qualifications: WorkerQualification[] }>> {
    const path = workerId ? `/worker-passport/${workerId}/qualifications` : '/worker-passport/me/qualifications';
    return get<any>(path);
  },

  /**
   * Add qualification
   */
  async addQualification(data: Omit<WorkerQualification, 'id' | 'workerId' | 'isVerified'>): Promise<ServiceResponse<WorkerQualification>> {
    return post<any>('/worker-passport/me/qualifications', data);
  },

  /**
   * Get employment history
   */
  async getEmploymentHistory(workerId?: string): Promise<ServiceResponse<{ history: WorkerEmploymentHistory[] }>> {
    const path = workerId ? `/worker-passport/${workerId}/employment-history` : '/worker-passport/me/employment-history';
    return get<any>(path);
  },

  /**
   * Get training records
   */
  async getTrainingHistory(workerId?: string): Promise<ServiceResponse<{ trainings: WorkerTraining[] }>> {
    const path = workerId ? `/worker-passport/${workerId}/trainings` : '/worker-passport/me/trainings';
    return get<any>(path);
  },

  /**
   * Get dispute history
   */
  async getDisputeHistory(workerId?: string): Promise<ServiceResponse<{ disputes: WorkerDisputeHistory[] }>> {
    const path = workerId ? `/worker-passport/${workerId}/disputes` : '/worker-passport/me/disputes';
    return get<any>(path);
  },

  /**
   * Download passport card (PDF)
   */
  async downloadPassportCard(): Promise<Blob> {
    return getFile('/worker-passport/me/card');
  },

  /**
   * Generate career CV
   */
  async generateCV(format: 'pdf' | 'docx'): Promise<Blob> {
    return getFile(`/worker-passport/me/cv?format=${format}`);
  },

  /**
   * Search workers (for employers/ministry)
   */
  async searchWorkers(query: string, filters?: {
    professionId?: string;
    governorate?: string;
    experienceMin?: number;
    qualificationLevel?: string;
    availableOnly?: boolean;
  }): Promise<ServiceResponse<{ workers: WorkerProfile[]; meta: PaginationMeta }>> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (filters) params.set('filters', JSON.stringify(filters));
    return get<any>(`/worker-passport/search?${params.toString()}`);
  },

  /**
   * Get my dashboard
   */
  async getMyDashboard(): Promise<ServiceResponse<{
    profile: WorkerProfile;
    activeContract?: any;
    upcomingTrainings: WorkerTraining[];
    pendingDisputes: number;
    recentNotifications: any[];
    careerScore: number;
    nextActions: Array<{ title: string; dueDate?: string; action: string }>;
  }>> {
    return get<any>('/worker-passport/me/dashboard');
  } };

export default workerPassportService;