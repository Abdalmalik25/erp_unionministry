import { neon } from "npm:@neondatabase/serverless";

const connectionString = Deno.env.get('NEON_DATABASE_URL');
if (!connectionString) {
  throw new Error('NEON_DATABASE_URL is not configured in environment variables.');
}

const sql = neon(connectionString);

const statusMap: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقف',
  inactive: 'موقف',
  dissolved: 'محذوف',
  under_review: 'تحت المراجعة',
};

const reverseStatusMap: Record<string, string> = {
  'نشط': 'active',
  'موقف': 'suspended',
  'محذوف': 'dissolved',
  'تحت المراجعة': 'under_review',
};

const typeMap: Record<string, string> = {
  labor: 'عمالية',
  professional: 'مهنية',
  employers: 'أصحاب أعمال',
};

const reverseTypeMap: Record<string, string> = {
  'عمالية': 'labor',
  'مهنية': 'professional',
  'أصحاب أعمال': 'employers',
};

function mapUnion(raw: any) {
  const metadata = raw.metadata || {};
  const addressParts = [raw.street, raw.district, raw.city, raw.governorate].filter(Boolean);

  return {
    id: raw.entity_id,
    unionNumber: raw.unified_code || raw.registration_number,
    nameAr: raw.name_ar,
    nameEn: raw.name_en,
    type: typeMap[raw.classification] || 'مهنية',
    structure: metadata.structure || 'نقابة',
    establishDate: raw.establishment_date ? raw.establishment_date.toISOString().slice(0, 10) : null,
    province: raw.governorate || '',
    district: raw.district || '',
    status: statusMap[raw.status] || 'نشط',
    phone: raw.phone || '',
    email: raw.email || '',
    address: addressParts.join(', '),
    website: raw.website || '',
    description: raw.description || '',
    objectives: raw.mission || '',
    totalMembers: raw.member_count || 0,
    licenseNumber: raw.license_number || '',
    licenseDate: raw.registration_date ? raw.registration_date.toISOString().slice(0, 10) : null,
    createdAt: raw.created_at ? raw.created_at.toISOString() : null,
    updatedAt: raw.updated_at ? raw.updated_at.toISOString() : null,
    createdBy: raw.created_by || null,
    updatedBy: raw.updated_by || null,
    deletedAt: raw.deleted_at ? raw.deleted_at.toISOString() : null,
    deletedBy: raw.deleted_by || null,
    metadata,
    version: raw.version || 1,
  };
}

function mapMember(raw: any) {
  const addressParts = [raw.street, raw.district, raw.city, raw.governorate].filter(Boolean);
  let statusLabel = 'نشط';

  if (raw.status === 'inactive') statusLabel = 'موقف';
  else if (raw.status === 'withdrawn') statusLabel = 'مفصول';
  else if (raw.status === 'deceased') statusLabel = 'متوفى';

  return {
    id: raw.id,
    nationalId: raw.national_id,
    fullName: raw.full_name,
    gender: raw.gender === 'female' ? 'أنثى' : 'ذكر',
    birthDate: raw.birth_date ? raw.birth_date.toISOString().slice(0, 10) : null,
    unionId: raw.entity_id,
    unionNumber: raw.unified_code || raw.registration_number || '',
    profession: raw.profession || '',
    status: statusLabel,
    phone: raw.phone || raw.mobile || '',
    email: raw.email || '',
    address: addressParts.join(', '),
    joinDate: raw.join_date ? raw.join_date.toISOString().slice(0, 10) : null,
    membershipNumber: raw.member_number || '',
    membershipType: raw.membership_type || 'عادي',
    createdAt: raw.created_at ? raw.created_at.toISOString() : null,
    updatedAt: raw.updated_at ? raw.updated_at.toISOString() : null,
    createdBy: raw.created_by || null,
    updatedBy: raw.updated_by || null,
    metadata: raw.metadata ?? {},
    version: raw.version || 1,
  };
}

function mapActivity(raw: any) {
  return {
    id: raw.id,
    unionId: raw.entity_id,
    unionNumber: raw.unified_code || raw.registration_number || '',
    title: raw.activity_name,
    type: raw.activity_type || 'other',
    description: raw.description || '',
    startDate: raw.start_date ? raw.start_date.toISOString().slice(0, 10) : null,
    endDate: raw.end_date ? raw.end_date.toISOString().slice(0, 10) : null,
    location: raw.location || '',
    beneficiaries: raw.actual_participants || raw.planned_participants || 0,
    budget: raw.budget || 0,
    status: raw.status || 'مخطط',
    createdAt: raw.created_at ? raw.created_at.toISOString() : null,
    updatedAt: raw.updated_at ? raw.updated_at.toISOString() : null,
    createdBy: raw.created_by || null,
    version: raw.version || 1,
  };
}

function mapServiceRequest(raw: any) {
  return {
    id: raw.id,
    unionId: raw.entity_id,
    unionNumber: raw.unified_code || raw.registration_number || '',
    serviceId: raw.service_id,
    serviceType: raw.service_name || raw.service_code || '',
    requestNumber: raw.request_number,
    status: raw.status || 'pending',
    description: raw.notes || '',
    submissionDate: raw.submission_date ? raw.submission_date.toISOString().slice(0, 10) : null,
    expectedDate: raw.expected_date ? raw.expected_date.toISOString().slice(0, 10) : null,
    completionDate: raw.completion_date ? raw.completion_date.toISOString().slice(0, 10) : null,
    rejectionReason: raw.rejection_reason || '',
    createdAt: raw.created_at ? raw.created_at.toISOString() : null,
    updatedAt: raw.updated_at ? raw.updated_at.toISOString() : null,
    createdBy: raw.created_by || null,
    updatedBy: raw.updated_by || null,
  };
}

function normalizeUnionId(id: string) {
  return id.trim();
}

export class NeonDatabase {
  async health() {
    const result = await sql`SELECT 1 as ok`;
    return result?.[0] || { ok: 1 };
  }

  async getUnions() {
    const rows = await sql`
      SELECT e.*
      FROM organizational_entities e
      WHERE e.entity_type = 'union' AND e.deleted_at IS NULL
      ORDER BY e.created_at DESC
    `;
    return rows.map(mapUnion);
  }

  async getUnionById(id: string) {
    const normalized = normalizeUnionId(id);
    const rows = await sql`
      SELECT e.*
      FROM organizational_entities e
      WHERE e.entity_type = 'union'
        AND (e.entity_id = ${normalized} OR e.unified_code = ${normalized} OR e.registration_number = ${normalized})
      LIMIT 1
    `;
    const row = rows?.[0];
    return row ? mapUnion(row) : null;
  }

  async findUnionEntityIdByCode(code: string) {
    const normalized = normalizeUnionId(code);
    const rows = await sql`
      SELECT e.entity_id, e.unified_code, e.registration_number
      FROM organizational_entities e
      WHERE e.entity_type = 'union'
        AND (e.entity_id = ${normalized} OR e.unified_code = ${normalized} OR e.registration_number = ${normalized})
      LIMIT 1
    `;
    return rows?.[0] || null;
  }

  async createUnion(data: any) {
    const status = reverseStatusMap[data.status] || 'active';
    const classification = reverseTypeMap[data.type] || 'labor';
    const metadata = Object.assign({}, data.metadata ?? {}, { structure: data.structure || 'نقابة' });

    const [row] = await sql`
      INSERT INTO organizational_entities (
        unified_code,
        registration_number,
        entity_type,
        classification,
        status,
        governorate,
        city,
        district,
        name_ar,
        name_en,
        phone,
        email,
        street,
        description,
        mission,
        metadata,
        establishment_date,
        registration_date
      ) VALUES (
        ${data.unionNumber},
        ${data.unionNumber},
        'union',
        ${classification},
        ${status},
        ${data.province || null},
        ${data.city || null},
        ${data.district || null},
        ${data.nameAr || null},
        ${data.nameEn || null},
        ${data.phone || null},
        ${data.email || null},
        ${data.address || null},
        ${data.description || null},
        ${data.objectives || null},
        ${metadata},
        ${data.establishDate ? new Date(data.establishDate) : null},
        ${data.establishDate ? new Date(data.establishDate) : null}
      ) RETURNING *
    `;

    return mapUnion(row);
  }

  async updateUnion(id: string, data: any) {
    const existing = await this.getUnionById(id);
    if (!existing) return null;

    const status = reverseStatusMap[data.status] || reverseStatusMap[existing.status] || 'active';
    const classification = reverseTypeMap[data.type] || reverseTypeMap[existing.type] || 'labor';
    const metadata = Object.assign({}, existing.metadata ?? {}, data.metadata ?? {}, { structure: data.structure || existing.structure || 'نقابة' });

    const [row] = await sql`
      UPDATE organizational_entities
      SET
        classification = ${classification},
        status = ${status},
        name_ar = ${data.nameAr ?? existing.nameAr},
        name_en = ${data.nameEn ?? existing.nameEn},
        governorate = ${data.province ?? existing.province},
        city = ${data.city ?? null},
        district = ${data.district ?? existing.district},
        phone = ${data.phone ?? existing.phone},
        email = ${data.email ?? existing.email},
        street = ${data.address ?? null},
        description = ${data.description ?? existing.description},
        mission = ${data.objectives ?? existing.objectives},
        metadata = ${metadata},
        updated_at = NOW()
      WHERE entity_id = ${existing.id}
      RETURNING *
    `;

    return row ? mapUnion(row) : null;
  }

  async getMembers() {
    const rows = await sql`
      SELECT m.*, e.unified_code, e.registration_number
      FROM members m
      JOIN organizational_entities e ON m.entity_id = e.entity_id
      ORDER BY m.created_at DESC
    `;
    return rows.map(mapMember);
  }

  async createMember(data: any) {
    const union = await this.findUnionEntityIdByCode(data.unionNumber);
    if (!union) {
      throw new Error('Union not found');
    }

    const status = reverseStatusMap[data.status] || 'active';

    const [row] = await sql`
      INSERT INTO members (
        entity_id,
        national_id,
        full_name,
        gender,
        birth_date,
        profession,
        phone,
        email,
        governorate,
        city,
        member_number,
        join_date,
        status,
        created_at,
        updated_at,
        metadata
      ) VALUES (
        ${union.entity_id},
        ${data.nationalId},
        ${data.fullName},
        ${data.gender === 'أنثى' ? 'female' : 'male'},
        ${data.birthDate ? new Date(data.birthDate) : null},
        ${data.profession || null},
        ${data.phone || null},
        ${data.email || null},
        ${data.province || null},
        ${data.city || null},
        ${data.membershipNumber || null},
        ${data.joinDate ? new Date(data.joinDate) : new Date()},
        ${status},
        NOW(),
        NOW(),
        ${data.metadata || {}}
      ) RETURNING *
    `;

    return mapMember({ ...row, unified_code: union.unified_code, registration_number: union.registration_number });
  }

  async getActivities() {
    const rows = await sql`
      SELECT a.*, e.unified_code, e.registration_number
      FROM activities a
      JOIN organizational_entities e ON a.entity_id = e.entity_id
      ORDER BY a.created_at DESC
    `;
    return rows.map(mapActivity);
  }

  async createActivity(data: any) {
    const union = await this.findUnionEntityIdByCode(data.unionNumber);
    if (!union) {
      throw new Error('Union not found');
    }

    const [row] = await sql`
      INSERT INTO activities (
        entity_id,
        activity_number,
        activity_name,
        activity_type,
        status,
        start_date,
        end_date,
        location,
        description,
        budget,
        created_at,
        updated_at,
        metadata
      ) VALUES (
        ${union.entity_id},
        ${data.activityNumber || `ACT-${Date.now()}`},
        ${data.title},
        ${data.type || 'other'},
        ${data.status || 'planned'},
        ${data.startDate ? new Date(data.startDate) : null},
        ${data.endDate ? new Date(data.endDate) : null},
        ${data.location || null},
        ${data.description || null},
        ${data.budget || null},
        NOW(),
        NOW(),
        ${data.metadata || {}}
      ) RETURNING *
    `;

    return mapActivity({ ...row, unified_code: union.unified_code, registration_number: union.registration_number });
  }

  async getServiceRequests() {
    const rows = await sql`
      SELECT sr.*, s.service_code, s.service_name, e.unified_code, e.registration_number
      FROM service_requests sr
      JOIN services s ON sr.service_id = s.id
      JOIN organizational_entities e ON sr.entity_id = e.entity_id
      ORDER BY sr.created_at DESC
    `;
    return rows.map((row: any) => mapServiceRequest({
      ...row,
      service_name: row.service_name,
      service_code: row.service_code,
    }));
  }

  async createServiceRequest(data: any) {
    const union = await this.findUnionEntityIdByCode(data.unionNumber);
    if (!union) {
      throw new Error('Union not found');
    }

    const serviceType = data.serviceType || 'general';
    const [service] = await sql`
      INSERT INTO services (
        service_code,
        service_name,
        category,
        created_at
      ) VALUES (
        ${serviceType},
        ${serviceType},
        ${data.serviceCategory || 'عام'},
        NOW()
      ) ON CONFLICT (service_code) DO UPDATE SET service_name = EXCLUDED.service_name
      RETURNING *
    `;

    const [row] = await sql`
      INSERT INTO service_requests (
        entity_id,
        service_id,
        request_number,
        status,
        submission_date,
        expected_date,
        completion_date,
        notes,
        rejection_reason,
        created_at,
        updated_at
      ) VALUES (
        ${union.entity_id},
        ${service.id},
        ${data.requestNumber || `SR-${Date.now()}`},
        ${data.status || 'pending'},
        ${data.submissionDate ? new Date(data.submissionDate) : new Date()},
        ${data.expectedDate ? new Date(data.expectedDate) : null},
        ${data.completionDate ? new Date(data.completionDate) : null},
        ${data.description || null},
        ${data.rejectionReason || null},
        NOW(),
        NOW()
      ) RETURNING *
    `;

    return mapServiceRequest({
      ...row,
      service_name: service.service_name,
      service_code: service.service_code,
      unified_code: union.unified_code,
      registration_number: union.registration_number,
    });
  }
}
