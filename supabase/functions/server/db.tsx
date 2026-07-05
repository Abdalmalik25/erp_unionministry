import { createClient } from "npm:@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const unionTypeMap: Record<string, string> = {
  union: 'نقابة',
  federation: 'اتحاد',
  organization: 'منظمة',
  branch: 'فرع',
  committee: 'لجنة',
  department: 'إدارة',
  unit: 'وحدة',
  office: 'مكتب',
};

const classificationMap: Record<string, string> = {
  labor: 'عمالية',
  professional: 'مهنية',
  employers: 'أصحاب أعمال',
  charity: 'خيرية',
  social: 'اجتماعية',
  cultural: 'ثقافية',
  sports: 'رياضية',
  other: 'أخرى',
};

const entityStatusMap: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقف',
  inactive: 'متوقف',
  dissolved: 'منحل',
  under_review: 'تحت المراجعة',
};

const memberStatusMap: Record<string, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  suspended: 'معلق',
  withdrawn: 'منسحب',
  deceased: 'متوفى',
};

const activityStatusMap: Record<string, string> = {
  planned: 'مخطط',
  ongoing: 'جاري',
  completed: 'منتهي',
  cancelled: 'ملغي',
  postponed: 'مؤجل',
};

const serviceRequestStatusMap: Record<string, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد المعالجة',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
  completed: 'مكتمل',
};

const reverse = (map: Record<string, string>): Record<string, string> =>
  Object.entries(map).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
  }, {} as Record<string, string>);

const reverseUnionTypeMap = reverse(unionTypeMap);
const reverseClassificationMap = reverse(classificationMap);
const reverseEntityStatusMap = reverse(entityStatusMap);
const reverseMemberStatusMap = reverse(memberStatusMap);
const reverseActivityStatusMap = reverse(activityStatusMap);
const reverseServiceRequestStatusMap = reverse(serviceRequestStatusMap);

function toArabicValue(value: string, map: Record<string, string>) {
  if (!value) return value;
  return map[value] ?? value;
}

function toEnglishValue(value: string, reverseMap: Record<string, string>) {
  if (!value) return value;
  return reverseMap[value] ?? value;
}

function toISODate(date: string | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

function mapEntityToUnion(entity: any) {
  return {
    id: entity.entity_id,
    unionNumber: entity.unified_code || entity.registration_number,
    nameAr: entity.name_ar,
    nameEn: entity.name_en,
    type: toArabicValue(entity.classification, classificationMap),
    structure: toArabicValue(entity.entity_type, unionTypeMap),
    establishDate: entity.establishment_date ? entity.establishment_date.toISOString?.().split('T')[0] || entity.establishment_date : null,
    province: entity.governorate || entity.city || null,
    status: toArabicValue(entity.status, entityStatusMap),
    phone: entity.phone,
    email: entity.email,
    address: [entity.governorate, entity.city, entity.district, entity.street].filter(Boolean).join(' - ') || null,
    website: entity.website,
    description: entity.description,
    totalMembers: entity.total_members || null,
    licenseNumber: entity.license_number,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
    deletedAt: entity.deleted_at,
    metadata: entity.metadata || {},
    version: 1,
  };
}

function mapMemberRecord(member: any, unionNumber?: string) {
  return {
    id: member.id,
    nationalId: member.national_id,
    fullName: member.full_name,
    gender: member.gender === 'female' ? 'أنثى' : 'ذكر',
    birthDate: member.birth_date ? member.birth_date.toISOString?.().split('T')[0] || member.birth_date : null,
    unionNumber: unionNumber || null,
    profession: member.profession,
    status: toArabicValue(member.status, memberStatusMap),
    phone: member.phone,
    email: member.email,
    address: [member.governorate, member.city, member.district, member.street].filter(Boolean).join(' - ') || null,
    joinDate: member.join_date ? member.join_date.toISOString?.().split('T')[0] || member.join_date : null,
    membershipNumber: member.member_number,
    membershipType: member.membership_type,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
    metadata: member.metadata || {},
    version: 1,
  };
}

function mapActivityRecord(activity: any, unionNumber?: string) {
  return {
    id: activity.id,
    unionNumber: unionNumber || null,
    title: activity.activity_name,
    type: activity.activity_type,
    description: activity.description,
    startDate: activity.start_date ? activity.start_date.toISOString?.().split('T')[0] || activity.start_date : null,
    endDate: activity.end_date ? activity.end_date.toISOString?.split('T')[0] || activity.end_date : null,
    location: activity.location,
    status: toArabicValue(activity.status, activityStatusMap),
    beneficiaries: activity.actual_participants || activity.planned_participants || null,
    createdAt: activity.created_at,
    updatedAt: activity.updated_at,
    metadata: activity.metadata || {},
    version: 1,
  };
}

function mapServiceRequestRecord(request: any, unionNumber?: string, serviceName?: string) {
  return {
    id: request.id,
    unionNumber: unionNumber || null,
    serviceType: serviceName || null,
    requestNumber: request.request_number,
    status: toArabicValue(request.status, serviceRequestStatusMap),
    submissionDate: request.submission_date ? request.submission_date.toISOString?.split('T')[0] || request.submission_date : null,
    expectedDate: request.expected_date ? request.expected_date.toISOString?.split('T')[0] || request.expected_date : null,
    completionDate: request.completion_date ? request.completion_date.toISOString?.split('T')[0] || request.completion_date : null,
    notes: request.notes,
    rejectionReason: request.rejection_reason,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    metadata: {},
    version: 1,
  };
}

function prepareUnionInsert(payload: any) {
  return {
    unified_code: payload.unionNumber?.trim(),
    registration_number: payload.unionNumber?.trim(),
    entity_type: toEnglishValue(payload.structure, reverseUnionTypeMap) || 'union',
    classification: toEnglishValue(payload.type, reverseClassificationMap) || 'professional',
    name_ar: payload.nameAr?.trim(),
    name_en: payload.nameEn?.trim() || null,
    establishment_date: toISODate(payload.establishDate),
    governorate: payload.province?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    website: payload.website?.trim() || null,
    description: payload.description?.trim() || null,
    status: toEnglishValue(payload.status, reverseEntityStatusMap) || 'active',
    metadata: payload.metadata || {},
  };
}

function prepareMemberInsert(payload: any, entityId: string) {
  return {
    entity_id: entityId,
    national_id: payload.nationalId?.trim(),
    full_name: payload.fullName?.trim(),
    gender: payload.gender === 'أنثى' ? 'female' : 'male',
    birth_date: toISODate(payload.birthDate),
    profession: payload.profession?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    governorate: payload.address || null,
    join_date: toISODate(payload.joinDate) || new Date().toISOString().split('T')[0],
    member_number: payload.membershipNumber || null,
    membership_type: payload.membershipType || null,
    status: toEnglishValue(payload.status, reverseMemberStatusMap) || 'active',
    metadata: payload.metadata || {},
  };
}

function prepareActivityInsert(payload: any, entityId: string) {
  return {
    entity_id: entityId,
    activity_number: payload.activityNumber || `ACT-${Date.now()}`,
    activity_name: payload.title?.trim() || payload.activityName?.trim() || 'نشاط',
    activity_type: payload.type || 'other',
    description: payload.description?.trim() || null,
    start_date: toISODate(payload.startDate) || new Date().toISOString().split('T')[0],
    end_date: toISODate(payload.endDate),
    location: payload.location?.trim() || null,
    status: toEnglishValue(payload.status, reverseActivityStatusMap) || 'planned',
    metadata: payload.metadata || {},
  };
}

async function resolveEntityIdByUnionNumber(unionNumber: string) {
  const code = unionNumber?.trim();
  if (!code) return null;

  const { data, error } = await supabase
    .from('organizational_entities')
    .select('entity_id')
    .or(`unified_code.eq.${code},registration_number.eq.${code}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.entity_id || null;
}

async function ensureServiceType(serviceType: string) {
  const code = serviceType?.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 50) || 'general-service';
  const name = serviceType?.trim() || 'Service';

  const { data: existing, error: selectError } = await supabase
    .from('services')
    .select('*')
    .eq('service_code', code)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from('services')
    .insert({
      service_code: code,
      service_name: name,
      category: 'general',
      description: `خدمة ${name}`,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getEntitiesByIds(entityIds: string[]) {
  if (entityIds.length === 0) return [];
  const { data, error } = await supabase
    .from('organizational_entities')
    .select('entity_id, unified_code')
    .in('entity_id', entityIds);
  if (error) throw error;
  return data || [];
}

export async function getUnions() {
  const { data, error } = await supabase
    .from('organizational_entities')
    .select('*')
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return (data || []).map(mapEntityToUnion);
}

export async function createUnion(payload: any) {
  const unionData = prepareUnionInsert(payload);
  const { data, error } = await supabase
    .from('organizational_entities')
    .insert(unionData)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapEntityToUnion(data);
}

export async function updateUnion(unionNumber: string, payload: any) {
  const existingId = await resolveEntityIdByUnionNumber(unionNumber);
  if (!existingId) {
    return null;
  }

  const unionData = prepareUnionInsert(payload);
  const { data, error } = await supabase
    .from('organizational_entities')
    .update(unionData)
    .eq('entity_id', existingId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return mapEntityToUnion(data);
}

export async function getMembers() {
  const { data, error } = await supabase.from('members').select('*');
  if (error) throw error;

  const entityIds = Array.from(new Set((data || []).map((member: any) => member.entity_id).filter(Boolean)));
  const entities = await getEntitiesByIds(entityIds);
  const entityMap = entities.reduce((acc: Record<string, string>, item: any) => {
    acc[item.entity_id] = item.unified_code;
    return acc;
  }, {});

  return (data || []).map((member: any) => mapMemberRecord(member, entityMap[member.entity_id]));
}

export async function createMember(payload: any) {
  const entityId = await resolveEntityIdByUnionNumber(payload.unionNumber);
  if (!entityId) {
    throw new Error('لم يتم العثور على النقابة المرتبطة');
  }

  const memberData = prepareMemberInsert(payload, entityId);
  const { data, error } = await supabase
    .from('members')
    .insert(memberData)
    .select()
    .maybeSingle();

  if (error) throw error;
  return mapMemberRecord(data, payload.unionNumber);
}

export async function getActivities() {
  const { data, error } = await supabase.from('activities').select('*');
  if (error) throw error;

  const entityIds = Array.from(new Set((data || []).map((activity: any) => activity.entity_id).filter(Boolean)));
  const entities = await getEntitiesByIds(entityIds);
  const entityMap = entities.reduce((acc: Record<string, string>, item: any) => {
    acc[item.entity_id] = item.unified_code;
    return acc;
  }, {});

  return (data || []).map((activity: any) => mapActivityRecord(activity, entityMap[activity.entity_id]));
}

export async function createActivity(payload: any) {
  const entityId = await resolveEntityIdByUnionNumber(payload.unionNumber);
  if (!entityId) {
    throw new Error('لم يتم العثور على النقابة المرتبطة');
  }

  const activityData = prepareActivityInsert(payload, entityId);
  const { data, error } = await supabase
    .from('activities')
    .insert(activityData)
    .select()
    .maybeSingle();

  if (error) throw error;
  return mapActivityRecord(data, payload.unionNumber);
}

export async function getServiceRequests() {
  const { data, error } = await supabase.from('service_requests').select('*');
  if (error) throw error;

  const entityIds = Array.from(new Set((data || []).map((item: any) => item.entity_id).filter(Boolean)));
  const serviceIds = Array.from(new Set((data || []).map((item: any) => item.service_id).filter(Boolean)));
  const [entities, services] = await Promise.all([
    getEntitiesByIds(entityIds),
    serviceIds.length > 0
      ? supabase.from('services').select('id, service_name').in('id', serviceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const entityMap = (entities || []).reduce((acc: Record<string, string>, item: any) => {
    acc[item.entity_id] = item.unified_code;
    return acc;
  }, {});

  const serviceMap = ((services as any)?.data || []).reduce((acc: Record<string, string>, item: any) => {
    acc[item.id] = item.service_name;
    return acc;
  }, {});

  return (data || []).map((request: any) =>
    mapServiceRequestRecord(request, entityMap[request.entity_id], serviceMap[request.service_id])
  );
}

export async function createServiceRequest(payload: any) {
  const entityId = await resolveEntityIdByUnionNumber(payload.unionNumber);
  if (!entityId) {
    throw new Error('لم يتم العثور على النقابة المرتبطة');
  }

  const service = await ensureServiceType(payload.serviceType || 'عام');
  const requestData = {
    entity_id: entityId,
    service_id: service.id,
    request_number: payload.requestNumber || `SR-${Date.now()}`,
    status: toEnglishValue(payload.status || 'قيد الانتظار', reverseServiceRequestStatusMap) || 'pending',
    submission_date: toISODate(payload.submissionDate) || new Date().toISOString().split('T')[0],
    expected_date: toISODate(payload.expectedDate),
    completion_date: toISODate(payload.completionDate),
    notes: payload.notes?.trim() || null,
    rejection_reason: payload.rejectionReason?.trim() || null,
    metadata: payload.metadata || {},
  };

  const { data, error } = await supabase
    .from('service_requests')
    .insert(requestData)
    .select()
    .maybeSingle();

  if (error) throw error;
  return mapServiceRequestRecord(data, payload.unionNumber, service.service_name);
}

export async function createProfile(profile: any) {
  const profileData = {
    id: profile.id,
    email: profile.email,
    full_name: profile.name,
    role: profile.role,
    entity_id: profile.organizationId || null,
    is_active: true,
    metadata: profile.metadata || {},
  };

  const { data, error } = await supabase.from('profiles').upsert(profileData).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function initializeSampleData() {
  const entities = [
    {
      unified_code: 'YE-2024-001',
      registration_number: 'YE-2024-001',
      entity_type: 'union',
      classification: 'professional',
      legal_form: 'syndicate',
      establishment_date: '1990-01-15',
      registration_date: '1990-01-15',
      governorate: 'صنعاء',
      name_ar: 'نقابة المهندسين اليمنية',
      name_en: 'Yemen Engineers Syndicate',
      status: 'active',
    },
    {
      unified_code: 'YE-2024-002',
      registration_number: 'YE-2024-002',
      entity_type: 'union',
      classification: 'labor',
      legal_form: 'syndicate',
      establishment_date: '1995-03-20',
      registration_date: '1995-03-20',
      governorate: 'عدن',
      name_ar: 'نقابة عمال البناء',
      name_en: 'Construction Workers Union',
      status: 'active',
    },
    {
      unified_code: 'YE-2024-003',
      registration_number: 'YE-2024-003',
      entity_type: 'union',
      classification: 'professional',
      legal_form: 'syndicate',
      establishment_date: '1985-11-05',
      registration_date: '1985-11-05',
      governorate: 'صنعاء',
      name_ar: 'نقابة الأطباء اليمنيين',
      name_en: 'Doctors Syndicate',
      status: 'active',
    },
  ];

  const { error: entityError } = await supabase.from('organizational_entities').upsert(entities, { onConflict: ['unified_code'] });
  if (entityError) throw entityError;

  const entityList = await supabase
    .from('organizational_entities')
    .select('entity_id, unified_code')
    .in('unified_code', ['YE-2024-001', 'YE-2024-002', 'YE-2024-003']);

  if (entityList.error) throw entityList.error;

  const entityIdMap = (entityList.data || []).reduce((acc: Record<string, string>, item: any) => {
    acc[item.unified_code] = item.entity_id;
    return acc;
  }, {});

  const members = [
    {
      entity_id: entityIdMap['YE-2024-001'],
      national_id: '01011234567',
      full_name: 'أحمد محمد علي',
      gender: 'male',
      profession: 'مهندس مدني',
      status: 'active',
      join_date: new Date().toISOString().split('T')[0],
    },
    {
      entity_id: entityIdMap['YE-2024-003'],
      national_id: '01021234568',
      full_name: 'فاطمة أحمد حسن',
      gender: 'female',
      profession: 'طبيبة',
      status: 'active',
      join_date: new Date().toISOString().split('T')[0],
    },
  ];

  const { error: memberError } = await supabase.from('members').upsert(members, { onConflict: ['entity_id', 'national_id'] });
  if (memberError) throw memberError;

  await ensureServiceType('خدمة عامة');

  return true;
}
