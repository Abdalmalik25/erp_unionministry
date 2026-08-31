/**
 * National Labor Platform TypeScript SDK
 * Yemen Ministry of Labor
 * 
 * @example
 * ```typescript
 * import NationalLaborPlatformClient from '@national-labor-platform/sdk';
 * 
 * const client = new NationalLaborPlatformClient({
 *   baseURL: 'https://api.labor.gov.ye/v2',
 * });
 * 
 * // Login
 * const { accessToken, user } = await client.auth.login({
 *   email: 'inspector@example.gov.ye',
 *   password: 'secure-password',
 * });
 * 
 * // Use resources
 * const inspections = await client.inspections.list({ status: 'scheduled' });
 * const workers = await client.workers.list({ governorate: 'Sana\'a' });
 * ```
 */

export { NationalLaborPlatformClient, SDKError } from './client';
export type { SDKConfig } from './client';

// Resource exports
export { AuthResource } from './resources/auth';
export { EntitiesResource } from './resources/entities';
export { MembersResource } from './resources/members';
export { WorkersResource } from './resources/workers';
export { EmployersResource } from './resources/employers';
export { InspectionsResource } from './resources/inspections';
export { ContractsResource } from './resources/contracts';
export { LicensesResource } from './resources/licenses';
export { PaymentsResource } from './resources/payments';
export { DisputesResource } from './resources/disputes';
export { ComplianceResource } from './resources/compliance';
export { DocumentsResource } from './resources/documents';
export { TrainingResource } from './resources/training';
export { DashboardResource } from './resources/dashboard';
export { NotificationsResource } from './resources/notifications';
export { AuditResource } from './resources/audit';
export { DirectoriesResource } from './resources/directories';
export { IntelligenceResource } from './resources/intelligence';
export { UploadsResource } from './resources/uploads';

// Type exports
export * from './types';

import { NationalLaborPlatformClient as Client } from './client';
export default Client;