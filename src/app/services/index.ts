/**
 * services/index.ts — Service Layer Exports
 * Yemen National Labor Platform
 * 
 * All production-grade services for the 8 major domains:
 * 1. Dispute Resolution (disputeService)
 * 2. Inspection Scheduling (inspectionService)
 * 3. Contract Management (contractService)
 * 4. OSH Platform (oshService)
 * 5. Worker Passport (workerPassportService)
 * 6. Union Governance (unionService)
 * 7. Employer OS (employerService)
 * 8. Reporting Engine (reportingService)
 * 
 * Cross-cutting: crossPortalService
 */

// Re-export all services for easy imports
export { disputeService } from './disputeService';
export { inspectionService } from './inspectionService';
export { contractService } from './contractService';
export { oshService } from './oshService';
export { workerPassportService } from './workerPassportService';
export { unionService } from './unionService';
export { employerService } from './employerService';
export { reportingService } from './reportingService';
export { crossPortalService } from './crossPortalService';

// Type exports for convenience
export type { LaborDispute, DisputeFilters, CreateDisputeRequest, DisputeServiceResponse } from './disputeService';
export type { Inspection, InspectionFilters, CreateInspectionRequest, InspectionServiceResponse } from './inspectionService';
export type { Contract, ContractFilters, CreateContractRequest, ContractServiceResponse } from './contractService';
export type { OSHIncident, OSHFilters, ServiceResponse } from './oshService';
export type { WorkerProfile, ServiceResponse as WorkerPassportServiceResponse } from './workerPassportService';
export type { Union, UnionMember, UnionElection, ServiceResponse as UnionServiceResponse } from './unionService';
export type { EmployerEntity, EmployerDashboard, ServiceResponse as EmployerServiceResponse } from './employerService';
export type { ReportDefinition, GeneratedReport, ReportSchedule, ServiceResponse as ReportingServiceResponse } from './reportingService';
export type { UnifiedRegistryEntry, CrossPortalUser, CrossPortalNotification, CrossPortalWorkflow, ServiceResponse as CrossPortalServiceResponse } from './crossPortalService';
