// server/intelligence/crossPortalWorkflow.js
// Cross-portal workflow orchestrator for professions, inspections, evaluations
// Triggers actions across: Ministry ↔ Organization ↔ Employer ↔ Worker

import { pool } from '../middleware/shared.js';
import { publishEntityEvent, publishViolationEvent, publishLicenseEvent } from '../utils/eventBus.js';

// ===================== Cross-Portal Action Definitions =====================

export const CROSS_PORTAL_ACTIONS = {
  // Profession-related actions
  PROFESSION_CLASSIFIED: 'profession.classified',     // Ministry: Classification done
  PROFESSION_QUOTA_CHANGED: 'profession.quota.changed', // Employer: Quota adjusted
  PROFESSION_TRAINING_REQUIRED: 'profession.training.required', // Worker: Training required

  // Inspection-related actions
  INSPECTION_SCHEDULED: 'inspection.scheduled',       // All: Notify all affected portals
  INSPECTION_COMPLETED: 'inspection.completed',       // Ministry: Score published
  INSPECTION_CRITICAL: 'inspection.critical',         // Ministry: Critical failure alert
  INSPECTION_FOLLOWUP_DUE: 'inspection.followup.due',  // Employer: Followup required

  // Evaluation-related actions
  EVALUATION_COMPLETED: 'evaluation.completed',       // Ministry: Score recorded
  CERTIFICATE_ISSUED: 'certificate.issued',           // All: Certificate available
  CERTIFICATE_EXPIRING: 'certificate.expiring',       // Owner: Renewal required
  MATURITY_UPGRADED: 'maturity.upgraded',             // Ministry: Level upgrade
};

// ===================== Workflow Definitions =====================

export const WORKFLOWS = {
  INSPECTION_FLOW: {
    name_ar: 'سير عمل التفتيش',
    name_en: 'Inspection Workflow',
    steps: [
      { stage: 1, portal: 'ministry', action: 'select_entity', roles: ['ministry_admin', 'labor_inspector'] },
      { stage: 2, portal: 'ministry', action: 'compute_risk', automatic: true },
      { stage: 3, portal: 'ministry', action: 'generate_checklist', automatic: true },
      { stage: 4, portal: 'ministry', action: 'notify_employer', roles: ['employer_admin'] },
      { stage: 5, portal: 'employer', action: 'confirm_inspection', roles: ['employer_admin', 'hr_officer'] },
      { stage: 6, portal: 'ministry', action: 'conduct_inspection', roles: ['labor_inspector'] },
      { stage: 7, portal: 'ministry', action: 'compute_score', automatic: true },
      { stage: 8, portal: 'all', action: 'publish_results', automatic: true },
      { stage: 9, portal: 'employer', action: 'action_plan', conditional: 'score < 75' },
      { stage: 10, portal: 'ministry', action: 'schedule_followup', automatic: true },
    ],
  },

  EVALUATION_FLOW: {
    name_ar: 'سير عمل التقييم',
    name_en: 'Evaluation Workflow',
    steps: [
      { stage: 1, portal: 'ministry', action: 'request_evaluation', roles: ['ministry_admin'] },
      { stage: 2, portal: 'organization', action: 'submit_responses', roles: ['union_president', 'employer_admin'] },
      { stage: 3, portal: 'ministry', action: 'validate_responses', roles: ['compliance_officer'] },
      { stage: 4, portal: 'ministry', action: 'compute_score', automatic: true },
      { stage: 5, portal: 'all', action: 'publish_certificate', automatic: true },
      { stage: 6, portal: 'organization', action: 'display_certificate', automatic: true },
    ],
  },

  PROFESSION_ALLOCATION_FLOW: {
    name_ar: 'سير عمل تخصيص المهن',
    name_en: 'Profession Allocation Workflow',
    steps: [
      { stage: 1, portal: 'ministry', action: 'classify_profession', automatic: true },
      { stage: 2, portal: 'ministry', action: 'set_yemenization_target', automatic: true },
      { stage: 3, portal: 'employer', action: 'request_allocation', roles: ['employer_admin'] },
      { stage: 4, portal: 'ministry', action: 'review_quota', roles: ['ministry_admin', 'registry_officer'] },
      { stage: 5, portal: 'ministry', action: 'approve_reject', roles: ['ministry_admin'] },
      { stage: 6, portal: 'employer', action: 'receive_notification', automatic: true },
      { stage: 7, portal: 'worker', action: 'link_to_position', roles: ['worker'] },
    ],
  },
};

// ===================== Workflow Orchestrator =====================

/**
 * Trigger a cross-portal workflow step.
 * @param {string} workflowId - e.g., 'INSPECTION_FLOW'
 * @param {number} currentStage - Stage number
 * @param {object} context - { entity_id, occupation_id, inspection_id, etc. }
 */
export async function executeWorkflowStep(workflowId, currentStage, context = {}) {
  const workflow = WORKFLOWS[workflowId];
  if (!workflow) return { error: 'Workflow not found' };

  const step = workflow.steps.find(s => s.stage === currentStage);
  if (!step) return { error: 'Stage not found' };

  // Get user context for permission check
  const user = context.user;
  const userRole = user?.role || 'system';

  // Permission check
  if (step.roles && !step.roles.includes(userRole) && !step.automatic) {
    return { error: 'Permission denied', required_roles: step.roles, current_role: userRole };
  }

  // Conditional execution
  if (step.conditional && !evaluateCondition(step.conditional, context)) {
    return { skipped: true, reason: `Condition ${step.conditional} not met` };
  }

  // Execute side-effects by portal
  const sideEffects = [];
  for (const portal of step.portal.split(',')) {
    const effect = await executeSideEffect(portal.trim(), step.action, context);
    if (effect) sideEffects.push(effect);
  }

  // Publish event for downstream consumers
  if (context.entity_id) {
    try {
      await publishEntityEvent(`${workflowId.toLowerCase()}.${step.action}`, context.entity_id, {
        workflow: workflowId,
        stage: currentStage,
        step_action: step.action,
        portal: step.portal,
        user: userRole,
        side_effects: sideEffects,
      });
    } catch (e) {
      // Event bus not available — silent fail
    }
  }

  return {
    workflow: workflowId,
    stage: currentStage,
    action: step.action,
    portal: step.portal,
    automatic: !!step.automatic,
    side_effects: sideEffects,
    next_stage: currentStage < workflow.steps.length ? currentStage + 1 : null,
  };
}

function evaluateCondition(condition, context) {
  // Simple condition evaluator: "score < 75" or "score >= 90"
  const match = condition.match(/(\w+)\s*([<>=!]+)\s*(\d+)/);
  if (!match) return true;
  const [, key, op, val] = match;
  const numVal = Number(val);
  const contextVal = Number(context[key]);
  switch (op) {
    case '<': return contextVal < numVal;
    case '<=': return contextVal <= numVal;
    case '>': return contextVal > numVal;
    case '>=': return contextVal >= numVal;
    case '==': return contextVal === numVal;
    case '!=': return contextVal !== numVal;
    default: return true;
  }
}

async function executeSideEffect(portal, action, context) {
  try {
    switch (`${portal}:${action}`) {
      case 'ministry:compute_risk':
        const { computeEntityRiskScore } = await import('./inspectionEngine.js');
        return await computeEntityRiskScore(context.entity_id);
      case 'ministry:generate_checklist':
        const { generateInspectionChecklist } = await import('./inspectionEngine.js');
        const entity = await pool.query('SELECT * FROM organizational_entities WHERE entity_id = $1 OR id::text = $1', [context.entity_id]);
        return entity.rows[0] ? generateInspectionChecklist(entity.rows[0], { riskScore: context.risk_score, riskLevel: context.risk_level }) : null;
      case 'ministry:notify_employer':
        // Insert notification record
        await pool.query(
          `INSERT INTO notifications (recipient_role, type, title, body, entity_id, created_at)
           VALUES ('employer', 'inspection.scheduled', $1, $2, $3, NOW())`,
          ['تفتيش مجدول', `تم جدولة تفتيش للمنشأة. التاريخ: ${context.inspection_date || 'TBD'}`, context.entity_id]
        ).catch(() => {});
        return { notified: 'employer', channel: 'in_app' };
      case 'ministry:compute_score':
        const { computeInspectionScore } = await import('./inspectionEngine.js');
        return computeInspectionScore(context.dimensions || {});
      case 'all:publish_results':
        // Audit + publish event
        return { published: 'all_portals', timestamp: new Date().toISOString() };
      case 'employer:action_plan':
        return { action_plan_required: true, deadline_days: 30 };
      case 'ministry:schedule_followup':
        return { followup_scheduled: true, followup_days: context.recommended_next_inspection_days || 90 };
      case 'ministry:classify_profession':
        const { classifyProfession } = await import('./professionEngine.js');
        return classifyProfession(context.profession || {});
      case 'ministry:set_yemenization_target':
        return { yemenization_target: context.target_pct || 70 };
      default:
        return null;
    }
  } catch (e) {
    console.error(`[workflow] side-effect ${portal}:${action} failed:`, e.message);
    return { error: e.message };
  }
}

// ===================== Portal-Specific Queries =====================

/**
 * Get profession data view from each portal's perspective.
 */
export async function getProfessionCrossPortalView(occupationId) {
  try {
    const [profession, allocations, workers, training, yemenization] = await Promise.all([
      pool.query('SELECT * FROM professions WHERE id = $1 OR isco_code = $1', [occupationId]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT eol.*, ce.name_ar as entity_name
        FROM enterprise_occupation_links eol
        LEFT JOIN commercial_establishments ce ON eol.enterprise_id::text = ce.id::text
        WHERE (eol.occupation_id::text = $1 OR eol.isco_code = $1)
          AND eol.deleted_at IS NULL
        LIMIT 100
      `, [occupationId]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT COUNT(*)::int as total,
               COUNT(CASE WHEN nationality = 'YE' OR nationality_ar IN ('يمني','Yemeni') THEN 1 END)::int as yemeni
        FROM workers WHERE (occupation_id::text = $1 OR isco_code = $1) AND deleted_at IS NULL
      `, [occupationId]).catch(() => ({ rows: [{ total: 0, yemeni: 0 }] })),
      pool.query(`
        SELECT COUNT(*)::int as program_count
        FROM training_programs tp
        WHERE tp.occupation_id::text = $1 OR tp.isco_code = $1
      `, [occupationId]).catch(() => ({ rows: [{ program_count: 0 }] })),
      // Already computed by professionEngine
      Promise.resolve(null),
    ]);

    const w = workers.rows[0];
    return {
      profession: profession.rows[0] || null,
      ministry_view: {
        classification: profession.rows[0] ? 'YNSOC-classified' : 'unclassified',
        allocations_count: allocations.rows.length,
        total_yemeni_workers: w.yemeni,
        total_workers: w.total,
        yemenization_pct: w.total > 0 ? Math.round((w.yemeni / w.total) * 100) : 0,
      },
      organization_view: {
        sector: profession.rows[0]?.sector,
        can_train: (training.rows[0]?.program_count || 0) > 0,
        available_programs: training.rows[0]?.program_count || 0,
      },
      employer_view: {
        allocation_count: allocations.rows.length,
        active_allocations: allocations.rows.filter(a => a.status === 'active').length,
        requires_yemenization: w.total > 0 && (w.yemeni / w.total) < 0.7,
      },
      worker_view: {
        occupation: profession.rows[0]?.name_ar,
        training_programs_available: training.rows[0]?.program_count || 0,
        career_path_available: true,
      },
    };
  } catch (e) {
    console.error('[crossPortal.professionView] error:', e.message);
    return { error: e.message };
  }
}

export default {
  CROSS_PORTAL_ACTIONS,
  WORKFLOWS,
  executeWorkflowStep,
  getProfessionCrossPortalView,
};
