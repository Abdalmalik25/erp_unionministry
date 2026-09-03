import type { PaginationMeta } from '../types/api';
/**
 * unionService.ts — Production-Grade Union/Organization Portal Service
 * Yemen National Labor Platform
 * Union governance, elections, members, board, financial management
 */

import { get, post, put, del } from './api';

export type UnionType = 'general' | 'professional' | 'craft' | 'industry' | 'employer_federation';
export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'expelled' | 'pending' | 'retired';
export type ElectionStatus = 'scheduled' | 'nomination' | 'campaigning' | 'voting' | 'completed' | 'cancelled';

export interface Union {
  id: string;
  unionNumber: string;
  name: string;
  nameAr: string;
  type: UnionType;
  governorate: string;
  directorate: string;
  establishedDate: string;
  licenseNumber: string;
  membersCount: number;
  status: 'active' | 'suspended' | 'dissolved';
  
  // Governance
  currentBoard?: {
    presidentName?: string;
    boardStartDate?: string;
    boardEndDate?: string;
    membersCount: number;
  };
  
  lastElectionDate?: string;
  nextElectionDue?: string;
  
  contact: {
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
  
  statutes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnionMember {
  id: string;
  unionId: string;
  workerId: string;
  workerName: string;
  membershipNumber: string;
  status: MemberStatus;
  joinDate: string;
  exitDate?: string;
  feesPaid: boolean;
  professionId?: string;
  position?: 'member' | 'board_member' | 'treasurer' | 'secretary' | 'president';
  votingEligible: boolean;
}

export interface UnionElection {
  id: string;
  unionId: string;
  title: string;
  type: 'board' | 'president' | 'amendment' | 'dissolution';
  status: ElectionStatus;
  nominationStart: string;
  nominationEnd: string;
  campaignStart: string;
  campaignEnd: string;
  votingStart: string;
  votingEnd: string;
  
  candidates: Array<{
    candidateId: string;
    name: string;
    position: string;
    manifesto?: string;
    votes: number;
    elected?: boolean;
  }>;
  
  eligibleVoters: number;
  votesCast: number;
  results?: {
    electedCandidates: string[];
    votingTurnout: number;
    certified: boolean;
    certifiedAt?: string;
    certifiedBy?: string;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

// ============================================================
// PRODUCTION-GRADE UNION SERVICE
// ============================================================

export const unionService = {
  /**
   * List unions
   */
  async listUnions(filters?: {
    type?: UnionType[];
    governorate?: string;
    status?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ServiceResponse<{ unions: Union[]; meta: PaginationMeta }>> {
    const params = new URLSearchParams();
    if (filters?.type?.length) params.set('type', filters.type.join(','));
    if (filters?.governorate) params.set('governorate', filters.governorate);
    if (filters?.status?.length) params.set('status', filters.status.join(','));
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    return get<any>(`/unions?${params.toString()}`);
  },

  /**
   * Get union details
   */
  async getUnion(id: string): Promise<ServiceResponse<Union>> {
    return get<any>(`/unions/${id}`);
  },

  /**
   * Get my union (if logged in as union)
   */
  async getMyUnion(): Promise<ServiceResponse<Union>> {
    return get<any>('/unions/me');
  },

  /**
   * Update union
   */
  async updateUnion(id: string, data: Partial<Union>): Promise<ServiceResponse<Union>> {
    return put<any>(`/unions/${id}`, data);
  },

  /**
   * List members
   */
  async listMembers(unionId: string, filters?: {
    status?: MemberStatus[];
    professionId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ServiceResponse<{ members: UnionMember[]; meta: PaginationMeta }>> {
    const params = new URLSearchParams();
    if (filters?.status?.length) params.set('status', filters.status.join(','));
    if (filters?.professionId) params.set('professionId', filters.professionId);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    return get<any>(`/unions/${unionId}/members?${params.toString()}`);
  },

  /**
   * Add member
   */
  async addMember(unionId: string, data: { workerId: string; position?: string }): Promise<ServiceResponse<UnionMember>> {
    return post<any>(`/unions/${unionId}/members`, data);
  },

  /**
   * Update member
   */
  async updateMember(unionId: string, memberId: string, data: Partial<UnionMember>): Promise<ServiceResponse<UnionMember>> {
    return put<any>(`/unions/${unionId}/members/${memberId}`, data);
  },

  /**
   * Remove member
   */
  async removeMember(unionId: string, memberId: string, reason: string): Promise<ServiceResponse<void>> {
    return del<any>(`/unions/${unionId}/members/${memberId}?reason=${encodeURIComponent(reason)}`);
  },

  /**
   * List elections
   */
  async listElections(unionId?: string): Promise<ServiceResponse<{ elections: UnionElection[]; meta: PaginationMeta }>> {
    const path = unionId ? `/unions/${unionId}/elections` : '/unions/elections';
    return get<any>(path);
  },

  /**
   * Schedule election
   */
  async scheduleElection(unionId: string, data: Omit<UnionElection, 'id' | 'unionId' | 'candidates' | 'eligibleVoters' | 'votesCast' | 'status'>): Promise<ServiceResponse<UnionElection>> {
    return post<any>(`/unions/${unionId}/elections`, data);
  },

  /**
   * Nominate candidate
   */
  async nominateCandidate(electionId: string, data: { candidateId: string; position: string; manifesto?: string }): Promise<ServiceResponse<UnionElection>> {
    return post<any>(`/elections/${electionId}/nominate`, data);
  },

  /**
   * Cast vote
   */
  async castVote(electionId: string, candidateId: string): Promise<ServiceResponse<void>> {
    return post<any>(`/elections/${electionId}/vote`, { candidateId });
  },

  /**
   * Get election results
   */
  async getElectionResults(electionId: string): Promise<ServiceResponse<{
    results: UnionElection['results'];
    candidates: UnionElection['candidates'];
  }>> {
    return get<any>(`/elections/${electionId}/results`);
  },

  /**
   * Certify election
   */
  async certifyElection(electionId: string): Promise<ServiceResponse<UnionElection>> {
    return post<any>(`/elections/${electionId}/certify`, {});
  },

  /**
   * Get union dashboard
   */
  async getUnionDashboard(unionId: string): Promise<ServiceResponse<{
    union: Union;
    memberStats: { total: number; active: number; eligible: number; pending: number };
    financialSummary: { totalRevenue: number; totalExpenses: number; balance: number };
    upcomingEvents: any[];
    pendingActions: number;
    recentActivities: any[];
  }>> {
    return get<any>(`/unions/${unionId}/dashboard`);
  } };

export default unionService;