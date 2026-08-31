/**
 * nationalDirectoriesService.ts — خدمة شاملة للأدلة الوطنية
 * تكامل End-to-End مع السجلات القائمة ومع APIs الخادم
 *
 * يغطي:
 *  - الأدلة الجغرافية (المحافظات/المديريات/الرموز البريدية)
 *  - أدلة التصنيف (المهن ISCO-08، الأنشطة ISIC-4)
 *  - أدلة العمل (العقود/التصاريح/فئات العمال/التوظيف)
 *  - الأدلة الاقتصادية (القطاعات/التراخيص/المناطق الصناعية)
 *  - الأدلة التنظيمية (أقسام الوزارة/التفتيش/النزاعات/المخالفات)
 *  - الأدلة القانونية (المرجعيات/الأطر التنظيمية)
 *  - ربط الأدلة بالسجلات الأخرى (Person/LegalEntity/Contract/...)
 *  - إدارة الإصدارات وتتبع التغييرات
 */
import { get, post, put, del } from './api';

// ==================== الأنواع (Types) ====================

export type DirectoryType =
  | 'occupation'         // المهن (ISCO-08)
  | 'activity'           // الأنشطة الاقتصادية (ISIC-4)
  | 'establishment'      // أحجام المنشآت
  | 'legal_form'         // الأشكال القانونية
  | 'ownership'          // أنواع التملك
  | 'governorate'        // المحافظات
  | 'district'           // المديريات
  | 'postal_code'        // الرموز البريدية
  | 'contract_type'      // أنواع العقود
  | 'employment_type'    // أنماط التوظيف
  | 'worker_category'    // فئات العمال
  | 'work_permit'        // تصاريح العمل
  | 'hazard_category'    // فئات المخاطر المهنية
  | 'certification_type' // أنواع الشهادات
  | 'economic_sector'    // القطاعات الاقتصادية
  | 'license_category'   // فئات التراخيص
  | 'industrial_zone'    // المناطق الصناعية
  | 'ministry_department'// أقسام الوزارة
  | 'inspection_type'    // أنواع التفتيش
  | 'dispute_stage'      // مراحل النزاع
  | 'violation_class'    // فئات المخالفات
  | 'legal_reference'    // المرجعيات القانونية
  | 'regulatory_framework'; // الأطر التنظيمية

export interface DirectoryEntry {
  id: string;
  directory_type: DirectoryType;
  code: string;
  name_ar: string;
  name_en?: string | null;
  parent_code?: string | null;
  parent_id?: string | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  effective_from?: string;
  effective_to?: string;
  created_at?: string;
  updated_at?: string;
  // حقول موسعة
  region?: string;
  governorate_id?: string;
  category?: string;
  severity_level?: string;
  legal_basis?: string;
  isic_section?: string;
  isco_group?: string;
  // العلاقات
  related_records_count?: number;
  linked_entities?: LinkedRecord[];
}

export interface LinkedRecord {
  entity_type: 'person' | 'legal_entity' | 'contract' | 'inspection' | 'case' | 'service_request';
  entity_id: string;
  display_name: string;
  relationship_type: 'occupation' | 'activity' | 'governorate' | 'sector' | 'license' | 'contract_type' | 'inspection_type' | 'violation' | 'stage';
  link_strength: number;  // 0-1
  linked_at: string;
}

export interface DirectoryVersion {
  id: string;
  directory_type: DirectoryType;
  version_number: number;
  version_date: string;
  changes_summary: string;
  change_reasons: string[];
  approved_by?: string;
  approved_at?: string;
  is_current: boolean;
  total_records: number;
  active_records: number;
}

export interface DirectoryChangeLog {
  id: string;
  directory_type: DirectoryType;
  record_id: string;
  record_code: string;
  change_type: 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete';
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  change_reason?: string;
  changed_by?: string;
  changed_at: string;
}

export interface DirectoryStats {
  directory_type: DirectoryType;
  total: number;
  active: number;
  inactive: number;
  referenced_count: number;  // عدد السجلات المرتبطة
  last_change_at: string;
  current_version?: number;
}

export interface DirectoryQueryParams {
  directory_type?: DirectoryType;
  is_active?: boolean;
  parent_code?: string;
  level?: number;
  search?: string;
  page?: number;
  page_size?: number;
  include_inactive?: boolean;
  include_relations?: boolean;
  sort_by?: 'code' | 'name_ar' | 'sort_order' | 'created_at';
  sort_dir?: 'asc' | 'desc';
}

// ==================== دوال CRUD الأساسية ====================

/**
 * جلب قائمة من دليل معين
 */
export async function listDirectory(
  directoryType: DirectoryType,
  params: Partial<DirectoryQueryParams> = {}
): Promise<{ data: DirectoryEntry[]; total: number; page: number; page_size: number }> {
  const search = new URLSearchParams();
  search.set('directory_type', directoryType);
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
  if (params.parent_code) search.set('parent_code', params.parent_code);
  if (params.level !== undefined) search.set('level', String(params.level));
  if (params.search) search.set('search', params.search);
  if (params.include_inactive) search.set('include_inactive', 'true');
  if (params.include_relations) search.set('include_relations', 'true');
  if (params.page) search.set('page', String(params.page));
  if (params.page_size) search.set('page_size', String(params.page_size));
  if (params.sort_by) search.set('sort_by', params.sort_by);
  if (params.sort_dir) search.set('sort_dir', params.sort_dir);

  const r = await get<any>(`/national-directories?${search.toString()}`);
  return {
    data: r.data || [],
    total: r.total ?? (r.data?.length ?? 0),
    page: r.page ?? params.page ?? 1,
    page_size: r.page_size ?? params.page_size ?? 50,
  };
}

/**
 * جلب سجل واحد حسب النوع والكود
 */
export async function getDirectoryEntry(
  directoryType: DirectoryType,
  code: string,
  options: { includeRelations?: boolean } = {}
): Promise<DirectoryEntry | null> {
  const params = options.includeRelations ? '?include_relations=true' : '';
  try {
    const r = await get<any>(`/national-directories/${directoryType}/${code}${params}`);
    return r.data || r;
  } catch (e) {
    return null;
  }
}

/**
 * إنشاء سجل جديد في الدليل
 */
export async function createDirectoryEntry(
  directoryType: DirectoryType,
  data: Partial<DirectoryEntry>
): Promise<DirectoryEntry> {
  const payload = { ...data, directory_type: directoryType };
  const result = await post<any>('/national-directories', payload);
  return result.data || result;
}

/**
 * تحديث سجل في الدليل
 */
export async function updateDirectoryEntry(
  directoryType: DirectoryType,
  code: string,
  data: Partial<DirectoryEntry>,
  options: { changeReason?: string } = {}
): Promise<DirectoryEntry> {
  const payload = { ...data, change_reason: options.changeReason };
  const result = await put<any>(`/national-directories/${directoryType}/${code}`, payload);
  return result.data || result;
}

/**
 * تعطيل سجل (بدون حذف)
 */
export async function deactivateDirectoryEntry(
  directoryType: DirectoryType,
  code: string,
  reason: string
): Promise<void> {
  await del(`/national-directories/${directoryType}/${code}?reason=${encodeURIComponent(reason)}`);
}

/**
 * إعادة تفعيل سجل
 */
export async function reactivateDirectoryEntry(
  directoryType: DirectoryType,
  code: string
): Promise<DirectoryEntry> {
  const result = await post<any>(`/national-directories/${directoryType}/${code}/reactivate`, {});
  return result.data || result;
}

// ==================== دوال التكامل (Integration Functions) ====================

/**
 * جلب السجلات المرتبطة بكود دليل معين
 * مثال: جلب كل العمال المرتبطين بكود مهنة (ISCO-08)
 */
export async function getRelatedRecords(
  directoryType: DirectoryType,
  code: string,
  options: {
    entityType?: LinkedRecord['entity_type'];
    limit?: number;
  } = {}
): Promise<LinkedRecord[]> {
  const params = new URLSearchParams();
  if (options.entityType) params.set('entity_type', options.entityType);
  if (options.limit) params.set('limit', String(options.limit));
  const r = await get<any>(`/national-directories/${directoryType}/${code}/related?${params.toString()}`);
  return r.data || [];
}

/**
 * التحقق من استخدام كود في سجلات أخرى قبل تعطيله
 */
export async function checkDirectoryUsage(
  directoryType: DirectoryType,
  code: string
): Promise<{
  is_used: boolean;
  usage_count: number;
  usage_by_type: Record<string, number>;
  blocking_records: LinkedRecord[];
}> {
  const r = await get<any>(`/national-directories/${directoryType}/${code}/usage`);
  return r.data || { is_used: false, usage_count: 0, usage_by_type: {}, blocking_records: [] };
}

/**
 * نشر التغييرات على السجلات المرتبطة
 * يستخدم عند تحديث قاعدة دليل ويرغب في تطبيق التغيير على كل السجلات المرتبطة
 */
export async function propagateDirectoryChange(
  directoryType: DirectoryType,
  code: string,
  options: {
    target_entity_types?: LinkedRecord['entity_type'][];
    cascade_update?: boolean;
  } = {}
): Promise<{
  affected_count: number;
  affected_by_type: Record<string, number>;
  errors: any[];
}> {
  const r = await post<any>(`/national-directories/${directoryType}/${code}/propagate`, options);
  return r.data || { affected_count: 0, affected_by_type: {}, errors: [] };
}

// ==================== إدارة الإصدارات (Versioning) ====================

/**
 * جلب إصدارات دليل معين
 */
export async function getDirectoryVersions(
  directoryType: DirectoryType
): Promise<DirectoryVersion[]> {
  const r = await get<any>(`/national-directories/${directoryType}/versions`);
  return r.data || [];
}

/**
 * إنشاء إصدار جديد
 */
export async function createDirectoryVersion(
  directoryType: DirectoryType,
  data: {
    changes_summary: string;
    change_reasons: string[];
    effective_from?: string;
  }
): Promise<DirectoryVersion> {
  const r = await post<any>(`/national-directories/${directoryType}/versions`, data);
  return r.data || r;
}

/**
 * اعتماد إصدار
 */
export async function approveDirectoryVersion(
  directoryType: DirectoryType,
  versionId: string
): Promise<DirectoryVersion> {
  const r = await post<any>(`/national-directories/${directoryType}/versions/${versionId}/approve`, {});
  return r.data || r;
}

// ==================== سجل التغييرات (Change Log) ====================

/**
 * جلب سجل التغييرات لدليل معين
 */
export async function getDirectoryChangeLog(
  directoryType: DirectoryType,
  options: {
    recordCode?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  } = {}
): Promise<DirectoryChangeLog[]> {
  const params = new URLSearchParams();
  if (options.recordCode) params.set('record_code', options.recordCode);
  if (options.fromDate) params.set('from_date', options.fromDate);
  if (options.toDate) params.set('to_date', options.toDate);
  if (options.limit) params.set('limit', String(options.limit));
  const r = await get<any>(`/national-directories/${directoryType}/change-log?${params.toString()}`);
  return r.data || [];
}

// ==================== الإحصاءات (Statistics) ====================

/**
 * جلب إحصاءات شاملة للأدلة
 */
export async function getDirectoryStats(
  directoryType?: DirectoryType
): Promise<DirectoryStats[]> {
  const url = directoryType
    ? `/national-directories/stats?directory_type=${directoryType}`
    : '/national-directories/stats';
  const r = await get<any>(url);
  return r.data || [];
}

/**
 * جلب إحصاءات جودة البيانات
 */
export async function getDirectoryQualityReport(
  directoryType: DirectoryType
): Promise<{
  completeness_score: number;
  consistency_score: number;
  accuracy_score: number;
  total_records: number;
  issues: Array<{
    type: 'missing_data' | 'duplicate' | 'inconsistent' | 'orphan';
    severity: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    description: string;
    examples: any[];
  }>;
  recommendations: string[];
}> {
  const r = await get<any>(`/national-directories/${directoryType}/quality-report`);
  return r.data || { completeness_score: 0, consistency_score: 0, accuracy_score: 0, total_records: 0, issues: [], recommendations: [] };
}

// ==================== دوال مساعدة خاصة بكل دليل ====================

/**
 * جلب دليل المحافظات مع المديريات
 */
export async function getGovernoratesWithDistricts(): Promise<{
  governorates: DirectoryEntry[];
  districts_by_governorate: Record<string, DirectoryEntry[]>;
}> {
  const [govs, allDistricts] = await Promise.all([
    listDirectory('governorate', { is_active: true, sort_by: 'name_ar' }),
    listDirectory('district', { is_active: true, sort_by: 'sort_order' }),
  ]);
  const byGov: Record<string, DirectoryEntry[]> = {};
  for (const d of allDistricts.data) {
    const govId = (d as any).governorate_id;
    if (govId) {
      if (!byGov[govId]) byGov[govId] = [];
      byGov[govId].push(d);
    }
  }
  return { governorates: govs.data, districts_by_governorate: byGov };
}

/**
 * جلب شجرة المهن (ISCO-08) بشكل هرمي
 */
export async function getOccupationsTree(): Promise<Array<{
  code: string;
  name_ar: string;
  name_en?: string;
  level: number;
  children: any[];
  occupation_count: number;
}>> {
  const all = await listDirectory('occupation', { is_active: true, page_size: 1000, sort_by: 'code' });
  const tree: any[] = [];
  const map: Record<string, any> = {};
  for (const item of all.data) {
    map[item.code] = { ...item, children: [], occupation_count: 0 };
  }
  for (const item of all.data) {
    if (item.parent_code && map[item.parent_code]) {
      map[item.parent_code].children.push(map[item.code]);
    } else {
      tree.push(map[item.code]);
    }
  }
  return tree;
}

/**
 * جلب شجرة الأنشطة الاقتصادية (ISIC-4)
 */
export async function getActivitiesTree(): Promise<Array<{
  code: string;
  name_ar: string;
  name_en?: string;
  level: number;
  isic_section?: string;
  children: any[];
}>> {
  const all = await listDirectory('activity', { is_active: true, page_size: 1000, sort_by: 'code' });
  const tree: any[] = [];
  const map: Record<string, any> = {};
  for (const item of all.data) {
    map[item.code] = { ...item, children: [] };
  }
  for (const item of all.data) {
    if (item.parent_code && map[item.parent_code]) {
      map[item.parent_code].children.push(map[item.code]);
    } else {
      tree.push(map[item.code]);
    }
  }
  return tree;
}

/**
 * جلب دليل نوع عقد مع التحقق من المتطلبات
 */
export async function getContractTypeWithRules(code: string): Promise<{
  contract_type: DirectoryEntry;
  duration_rule: { max_days: number; renewable: boolean };
  approval_required: boolean;
  required_documents: string[];
  legal_basis: string;
}> {
  const entry = await getDirectoryEntry('contract_type', code, { includeRelations: true });
  if (!entry) throw new Error(`Contract type ${code} not found`);
  return {
    contract_type: entry,
    duration_rule: {
      max_days: (entry as any).max_duration_days || 365,
      renewable: (entry as any).duration_category !== 'project_based',
    },
    approval_required: entry.metadata?.requires_approval || false,
    required_documents: entry.metadata?.required_documents || [],
    legal_basis: (entry as any).legal_basis || '',
  };
}

// ==================== التصدير والاستيراد (Export/Import) ====================

/**
 * تصدير دليل كملف JSON
 */
export async function exportDirectory(
  directoryType: DirectoryType,
  options: { format?: 'json' | 'csv' | 'xlsx'; includeInactive?: boolean } = {}
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('format', options.format || 'json');
  if (options.includeInactive) params.set('include_inactive', 'true');
  const response = await fetch(`/api/national-directories/${directoryType}/export?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
    },
  });
  if (!response.ok) throw new Error('Export failed');
  return response.blob();
}

/**
 * استيراد دليل من ملف
 */
export async function importDirectory(
  directoryType: DirectoryType,
  file: File,
  options: { dryRun?: boolean; onConflict?: 'skip' | 'update' | 'error' } = {}
): Promise<{
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string; data: any }>;
  dry_run: boolean;
}> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.dryRun) formData.append('dry_run', 'true');
  if (options.onConflict) formData.append('on_conflict', options.onConflict);

  const response = await fetch(`/api/national-directories/${directoryType}/import`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
    },
  });
  if (!response.ok) throw new Error('Import failed');
  return response.json();
}

// ==================== مساعدات Hook ====================

/**
 * دالة مساعدة للحصول على اسم دليل حسب الرمز
 */
export async function getDirectoryName(
  directoryType: DirectoryType,
  code: string,
  language: 'ar' | 'en' = 'ar'
): Promise<string> {
  const entry = await getDirectoryEntry(directoryType, code);
  if (!entry) return code;
  return language === 'ar' ? entry.name_ar : (entry.name_en || entry.name_ar);
}

// ==================== Health Check ====================

/**
 * فحص سلامة خدمة الأدلة الوطنية
 */
export async function checkNationalDirectoriesHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  total_directories: number;
  active_directories: number;
  last_change_at: string;
  version: string;
  api_version: string;
}> {
  try {
    const r = await get<any>('/national-directories/health');
    return r.data || r;
  } catch (e) {
    return {
      status: 'unhealthy',
      total_directories: 0,
      active_directories: 0,
      last_change_at: '',
      version: 'unknown',
      api_version: 'unknown',
    };
  }
}

// ==================== تصدير افتراضي ====================

export default {
  // CRUD
  list: listDirectory,
  get: getDirectoryEntry,
  create: createDirectoryEntry,
  update: updateDirectoryEntry,
  deactivate: deactivateDirectoryEntry,
  reactivate: reactivateDirectoryEntry,

  // Integration
  getRelatedRecords,
  checkUsage: checkDirectoryUsage,
  propagateChange: propagateDirectoryChange,

  // Versioning
  getVersions: getDirectoryVersions,
  createVersion: createDirectoryVersion,
  approveVersion: approveDirectoryVersion,

  // Audit
  getChangeLog: getDirectoryChangeLog,

  // Statistics
  getStats: getDirectoryStats,
  getQualityReport: getDirectoryQualityReport,

  // Helpers
  getGovernoratesWithDistricts,
  getOccupationsTree,
  getActivitiesTree,
  getContractTypeWithRules,
  getName: getDirectoryName,

  // Export/Import
  export: exportDirectory,
  import: importDirectory,

  // Health
  healthCheck: checkNationalDirectoriesHealth,
};
