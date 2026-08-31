// server/middleware/crossPortal.js
// Cross-portal data sharing policies
// Defines what data each user type can share across the 4 portals:
// Ministry ↔ Organization ↔ Employer ↔ Worker

export const PORTALS = {
  MINISTRY: 'ministry',     // sector_users, ministry staff
  ORGANIZATION: 'organization', // union/association admin
  EMPLOYER: 'employer',     // commercial entity admin
  WORKER: 'worker',         // individual worker
};

// Map role → portal
export const ROLE_PORTAL = {
  super_admin: PORTALS.MINISTRY,
  ministry_admin: PORTALS.MINISTRY,
  deputy_minister: PORTALS.MINISTRY,
  ministry_staff: PORTALS.MINISTRY,
  supervisory_director: PORTALS.MINISTRY,
  legal_counsel: PORTALS.MINISTRY,
  labor_inspector: PORTALS.MINISTRY,
  compliance_officer: PORTALS.MINISTRY,
  registry_officer: PORTALS.MINISTRY,
  reports_viewer: PORTALS.MINISTRY,
  union_president: PORTALS.ORGANIZATION,
  employer_admin: PORTALS.EMPLOYER,
  hr_officer: PORTALS.EMPLOYER,
  financial_officer: PORTALS.EMPLOYER,
  worker: PORTALS.WORKER,
};

// Data sharing policies per portal pair
// Each policy defines what fields can be shared and in which direction
export const SHARING_POLICIES = {
  // Ministry ↔ Organization: Mutual visibility of regulatory + organizational data
  [`${PORTALS.MINISTRY}->${PORTALS.ORGANIZATION}`]: {
    read: ['entity_name', 'entity_type', 'status', 'registration_date', 'governorate', 'member_count'],
    write: ['regulatory_status', 'inspection_results', 'compliance_alerts'],
    fields: { sensitive_pii: false, financial: false },
  },
  [`${PORTALS.ORGANIZATION}->${PORTALS.MINISTRY}`]: {
    read: ['entity_name', 'members_count', 'activities', 'financial_summary'],
    write: ['member_registrations', 'activity_reports', 'election_results'],
    fields: { sensitive_pii: true, financial: true },
  },

  // Ministry ↔ Employer: Compliance + license data
  [`${PORTALS.MINISTRY}->${PORTALS.EMPLOYER}`]: {
    read: ['license_status', 'inspection_results', 'violation_records', 'compliance_score'],
    write: ['license_issuance', 'inspection_orders', 'compliance_requirements'],
    fields: { sensitive_pii: false, financial: false },
  },
  [`${PORTALS.EMPLOYER}->${PORTALS.MINISTRY}`]: {
    read: ['entity_name', 'license_number', 'license_type', 'expiry_date'],
    write: ['employee_registrations', 'contract_filings', 'incident_reports'],
    fields: { sensitive_pii: true, financial: true },
  },

  // Ministry ↔ Worker: Passport + contract visibility
  [`${PORTALS.MINISTRY}->${PORTALS.WORKER}`]: {
    read: ['passport_status', 'contract_status', 'license_expiry'],
    write: ['passport_issuance', 'contract_registration', 'rights_alerts'],
    fields: { sensitive_pii: false, financial: false },
  },
  [`${PORTALS.WORKER}->${PORTALS.MINISTRY}`]: {
    read: ['personal_id', 'employment_status'],
    write: ['complaint_filings', 'grievance_reports'],
    fields: { sensitive_pii: true, financial: false },
  },

  // Organization ↔ Employer: Cooperative + sector data
  [`${PORTALS.ORGANIZATION}->${PORTALS.EMPLOYER}`]: {
    read: ['membership_status', 'sector_classification', 'collective_agreements'],
    write: ['membership_invitations', 'training_programs'],
    fields: { sensitive_pii: false, financial: false },
  },
  [`${PORTALS.EMPLOYER}->${PORTALS.ORGANIZATION}`]: {
    read: ['employer_profile', 'sector_data'],
    write: ['membership_applications'],
    fields: { sensitive_pii: true, financial: false },
  },

  // Employer ↔ Worker: Employment relationship data
  [`${PORTALS.EMPLOYER}->${PORTALS.WORKER}`]: {
    read: ['employment_status', 'contract_terms', 'salary_records', 'leave_balance'],
    write: ['employment_offers', 'contract_signing', 'performance_reviews'],
    fields: { sensitive_pii: true, financial: true },
  },
  [`${PORTALS.WORKER}->${PORTALS.EMPLOYER}`]: {
    read: ['employer_profile', 'workplace_safety'],
    write: ['job_applications', 'resignation_notices'],
    fields: { sensitive_pii: true, financial: false },
  },

  // Organization ↔ Worker: Membership data
  [`${PORTALS.ORGANIZATION}->${PORTALS.WORKER}`]: {
    read: ['member_id', 'union_dues_status'],
    write: ['membership_offers', 'training_invitations'],
    fields: { sensitive_pii: false, financial: false },
  },
  [`${PORTALS.WORKER}->${PORTALS.ORGANIZATION}`]: {
    read: ['union_benefits', 'collective_agreements'],
    write: ['membership_applications', 'grievance_filings'],
    fields: { sensitive_pii: true, financial: false },
  },
};

/**
 * Filter data fields based on sharing policy
 * @param {string} sourcePortal
 * @param {string} targetPortal
 * @param {object} data
 * @returns {object} filtered data
 */
export function applySharingPolicy(sourcePortal, targetPortal, data) {
  if (!data) return data;
  const key = `${sourcePortal}->${targetPortal}`;
  const policy = SHARING_POLICIES[key];
  if (!policy) return data;

  if (Array.isArray(data)) {
    return data.map((item) => filterFields(item, policy.read));
  }
  return filterFields(data, policy.read);
}

function filterFields(obj, allowedFields) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const key of allowedFields) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Middleware: enforce cross-portal data sharing
 */
export function enforceCrossPortalPolicy(getSourcePortal) {
  return (req, res, next) => {
    const sourcePortal = getSourcePortal(req);
    const targetPortal = req.portalContext || sourcePortal;

    if (sourcePortal !== targetPortal) {
      const key = `${sourcePortal}->${targetPortal}`;
      if (!SHARING_POLICIES[key]) {
        return res.status(403).json({
          error: 'لا توجد سياسة مشاركة بيانات بين هذه البوابات',
          code: 'NO_SHARING_POLICY',
          source: sourcePortal,
          target: targetPortal,
        });
      }
    }

    req.sharingContext = { sourcePortal, targetPortal };
    next();
  };
}

/**
 * Express middleware wrapper for response filtering
 */
export function withCrossPortalFilter(getSourcePortal) {
  return (req, res, next) => {
    const sourcePortal = getSourcePortal(req);
    const targetPortal = req.portalContext || sourcePortal;

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (sourcePortal === targetPortal) return originalJson(data);
      const filtered = applySharingPolicy(sourcePortal, targetPortal, data);
      return originalJson(filtered);
    };
    next();
  };
}
