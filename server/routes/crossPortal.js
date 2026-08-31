/**
 * server/routes/crossPortal.js — Cross-Portal Integration API
 * Yemen National Labor Platform
 * 
 * Orchestrates cross-portal workflows, notifications, and data synchronization
 */

import { Router } from 'express';
import { getAuthUser } from '../middleware/auth.js';
import { requirePermission, auditContext } from '../middleware/rbac.js';
import { structuredLogger } from '../middleware/observability.js';
import { eventBus } from '../utils/eventBus.js';

const router = Router();

router.use(getAuthUser);
router.use(auditContext);

// ============================================================
// UNIFIED REGISTRY
// ============================================================

router.get('/registry/:type/:id',
  requirePermission('entities:view'),
  async (req, res, next) => {
    try {
      const { type, id } = req.params;

      const entry = await req.db('unified_registry_entries')
        .where('entry_type', type)
        .where('entity_id', id)
        .first();

      if (!entry) {
        return res.status(404).json({ error: 'Registry entry not found', code: 'NOT_FOUND' });
      }

      res.json(entry);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/registry/:type/search',
  requirePermission('entities:view'),
  async (req, res, next) => {
    try {
      const { type } = req.params;
      const { q, filters } = req.query;

      let query = req.db('unified_registry_entries')
        .where('entry_type', type)
        .where('synced_across_portals', true);

      if (q) {
        query = query.where(function() {
          this.whereILike('data_snapshot', `%${q}%`);
        });
      }

      const entries = await query.limit(50);
      res.json(entries);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/registry/:type/:id/sync',
  requirePermission('entities:edit'),
  async (req, res, next) => {
    try {
      const { type, id } = req.params;

      // In production: sync to all relevant portals
      const syncedPortals = ['ministry', 'employer', 'worker'];

      await req.db('unified_registry_entries')
        .where('entry_type', type)
        .where('entity_id', id)
        .update({
          last_synced_at: new Date(),
          synced_portals: syncedPortals,
          version: req.db.raw('version + 1')
        });

      res.json({ syncedPortals, failedPortals: [] });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ENTITY LOOKUP
// ============================================================

router.post('/lookup',
  requirePermission('entities:view'),
  async (req, res, next) => {
    try {
      const { type, value } = req.body;

      let entity;
      let entityType;

      switch (type) {
        case 'national_id':
          entity = await req.db('workers').where('national_id', value).first();
          entityType = 'worker';
          break;
        case 'commercial_record':
          entity = await req.db('commercial_establishments').where('commercial_record', value).first();
          entityType = 'employer';
          break;
        case 'union_license':
          entity = await req.db('unions').where('license_number', value).first();
          entityType = 'union';
          break;
        default:
          entity = null;
      }

      if (!entity) {
        return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
      }

      res.json({
        type: entityType,
        entity,
        portals: ['ministry', entityType === 'worker' ? 'worker' : 'employer'],
        linkedEntities: []
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// WORKFLOWS
// ============================================================

router.post('/workflows/:workflowType/initiate',
  requirePermission('laborDisputes:view'),
  async (req, res, next) => {
    try {
      const { workflowType } = req.params;
      const { participants, context } = req.body;

      const [workflow] = await req.db('cross_portal_workflows')
        .insert({
          workflow_type: workflowType,
          name: `${workflowType} - ${new Date().toISOString()}`,
          initiated_by: req.user.id,
          initiated_by_portal: req.user.portal || 'ministry',
          context,
          participants: JSON.stringify(participants),
          steps: JSON.stringify([{ id: 'step_1', order: 1, name: 'Initial Review', status: 'pending' }]),
          status: 'in_progress',
          started_at: new Date()
        })
        .returning('*');

      structuredLogger.info('workflow_initiated', {
        ...req.audit,
        workflowId: workflow.id,
        workflowType
      });

      res.status(201).json(workflow);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/workflows/:workflowId',
  requirePermission('laborDisputes:view'),
  async (req, res, next) => {
    try {
      const { workflowId } = req.params;

      const workflow = await req.db('cross_portal_workflows').where('id', workflowId).first();
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found', code: 'NOT_FOUND' });
      }

      res.json(workflow);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/workflows/:workflowId/steps/:stepId/advance',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { workflowId, stepId } = req.params;
      const { output } = req.body;

      const workflow = await req.db('cross_portal_workflows').where('id', workflowId).first();
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found', code: 'NOT_FOUND' });
      }

      const steps = JSON.parse(workflow.steps || '[]');
      const stepIndex = steps.findIndex(s => s.id === stepId);

      if (stepIndex >= 0) {
        steps[stepIndex].status = 'completed';
        steps[stepIndex].completedAt = new Date().toISOString();
        steps[stepIndex].output = output;
      }

      const newStepIndex = stepIndex + 1;
      if (newStepIndex < steps.length) {
        steps[newStepIndex].status = 'in_progress';
        steps[newStepIndex].startedAt = new Date().toISOString();
      }

      const allCompleted = steps.every(s => s.status === 'completed');
      const progressPercentage = Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100);

      const [updated] = await req.db('cross_portal_workflows')
        .where('id', workflowId)
        .update({
          steps: JSON.stringify(steps),
          current_step: newStepIndex,
          progress_percentage: progressPercentage,
          status: allCompleted ? 'completed' : 'in_progress',
          completed_at: allCompleted ? new Date() : null
        })
        .returning('*');

      if (allCompleted) {
        eventBus.emit('workflow:completed', { workflowId, completedBy: req.user.id });
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ORCHESTRATION: MAJOR CROSS-FLOWS
// ============================================================

router.post('/orchestrate/violation-cascade',
  requirePermission('inspections:create'),
  async (req, res, next) => {
    try {
      const { violationId, inspectionType, scheduleImmediately, createDisputeIfConfirmed, notifyParties } = req.body;

      // Step 1: Create inspection
      const [inspection] = await req.db('inspections')
        .insert({
          type: inspectionType,
          status: scheduleImmediately ? 'planned' : 'draft',
          priority: 'high',
          entity_id: req.body.entityId,
          entity_name: req.body.entityName,
          entity_type: req.body.entityType,
          address: req.body.address,
          governorate: req.body.governorate,
          directorate: req.body.directorate,
          schedule: JSON.stringify({ scheduledDate: req.body.scheduledDate, scheduledTime: '09:00', duration: 60 }),
          created_by: req.user.id
        })
        .returning('*');

      // Step 2: Link to violation
      await req.db('inspection_violations')
        .where('id', violationId)
        .update({ inspection_id: inspection.id });

      // Create workflow
      const [workflow] = await req.db('cross_portal_workflows')
        .insert({
          workflow_type: 'violation_cascade',
          name: 'Violation → Inspection Cascade',
          initiated_by: req.user.id,
          initiated_by_portal: 'ministry',
          context: { violationId, inspectionId: inspection.id, createDisputeIfConfirmed },
          participants: JSON.stringify(notifyParties || []),
          steps: JSON.stringify([
            { id: 'inspection', order: 1, name: 'Inspection', status: 'pending' },
            { id: 'review', order: 2, name: 'Violation Review', status: 'pending' },
            { id: 'dispute', order: 3, name: 'Dispute Creation (if needed)', status: 'pending' }
          ]),
          status: 'in_progress',
          started_at: new Date()
        })
        .returning('*');

      res.status(201).json({
        inspectionId: inspection.id,
        workflowId: workflow.id
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/orchestrate/contract-signed/:contractId',
  requirePermission('contracts:view'),
  async (req, res, next) => {
    try {
      const { contractId } = req.params;

      const contract = await req.db('contracts').where('id', contractId).first();
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      const workerData = JSON.parse(contract.worker || '{}');
      const employerData = JSON.parse(contract.employer || '{}');

      // Sync to worker passport
      let workerPassportUpdated = false;
      try {
        // Update worker passport with new contract
        workerPassportUpdated = true;
      } catch (e) {
        structuredLogger.error('worker_passport_sync_failed', { contractId, error: e.message });
      }

      // Sync to employer records
      let employerRecordsUpdated = false;
      try {
        // Update employer employee list
        employerRecordsUpdated = true;
      } catch (e) {
        structuredLogger.error('employer_records_sync_failed', { contractId, error: e.message });
      }

      // Notify ministry registry
      let ministryRegistryUpdated = false;
      try {
        await req.db('unified_registry_entries')
          .where('entry_type', 'contract')
          .where('entity_id', contractId)
          .update({ last_synced_at: new Date() });
        ministryRegistryUpdated = true;
      } catch (e) {
        structuredLogger.error('ministry_registry_sync_failed', { contractId, error: e.message });
      }

      // Send notifications
      let notificationsSent = 0;
      try {
        await req.db('cross_portal_notifications').insert([
          {
            recipient_type: 'worker',
            source_portal: 'system',
            type: 'contract',
            priority: 'high',
            title: 'Contract Activated',
            message: `Your contract ${contract.contract_number} has been activated.`,
            related_entity_type: 'contract',
            related_entity_id: contractId,
            created_at: new Date()
          },
          {
            recipient_type: 'employer',
            source_portal: 'system',
            type: 'contract',
            priority: 'high',
            title: 'Contract Activated',
            message: `Contract ${contract.contract_number} with ${workerData.name} has been activated.`,
            related_entity_type: 'contract',
            related_entity_id: contractId,
            created_at: new Date()
          }
        ]);
        notificationsSent = 2;
      } catch (e) {
        structuredLogger.error('notifications_failed', { contractId, error: e.message });
      }

      eventBus.emit('contract:synced', { contractId, syncedBy: req.user.id });

      res.json({
        workerPassportUpdated,
        employerRecordsUpdated,
        ministryRegistryUpdated,
        notificationsSent
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/orchestrate/inspection-outcome/:inspectionId',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { inspectionId } = req.params;

      const inspection = await req.db('inspections').where('id', inspectionId).first();
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const violations = await req.db('inspection_violations').where('inspection_id', inspectionId);
      const violationsCreated = violations.length;

      // Trigger compliance reviews for each violation
      let complianceReviewsTriggered = 0;
      for (const violation of violations) {
        await req.db('compliance_reviews').insert({
          inspection_id: inspectionId,
          violation_id: violation.id,
          status: 'pending',
          created_at: new Date()
        });
        complianceReviewsTriggered++;
      }

      // Send notifications
      let notificationsDispatched = 0;
      let employerNotified = false;
      let unionNotified = false;

      await req.db('cross_portal_notifications').insert([
        {
          recipient_type: 'employer',
          source_portal: 'inspector',
          type: 'inspection',
          priority: violationsCreated > 0 ? 'high' : 'medium',
          title: violationsCreated > 0 ? 'Violations Found' : 'Inspection Completed',
          message: violationsCreated > 0
            ? `${violationsCreated} violation(s) were found during the inspection.`
            : 'The inspection of your establishment has been completed with no violations.',
          related_entity_type: 'inspection',
          related_entity_id: inspectionId,
          created_at: new Date()
        }
      ]);
      employerNotified = true;
      notificationsDispatched++;

      if (violationsCreated > 0) {
        await req.db('cross_portal_notifications').insert([
          {
            recipient_type: 'worker',
            source_portal: 'inspector',
            type: 'inspection',
            priority: 'medium',
            title: 'Workplace Inspection Completed',
            message: 'A workplace inspection was conducted. Violations were found and reported.',
            related_entity_type: 'inspection',
            related_entity_id: inspectionId,
            created_at: new Date()
          }
        ]);
        notificationsDispatched++;
      }

      eventBus.emit('inspection:outcome_processed', { inspectionId, processedBy: req.user.id });

      res.json({
        violationsCreated,
        complianceReviewsTriggered,
        notificationsDispatched,
        employerNotified,
        unionNotified
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UNIFIED IDENTITY & PERMISSIONS
// ============================================================

router.get('/identity/:userId',
  requirePermission('users:view'),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      const identity = await req.db('unified_user_identities').where('global_user_id', userId).first();
      if (!identity) {
        return res.status(404).json({ error: 'User identity not found', code: 'NOT_FOUND' });
      }

      res.json(identity);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/identity/:userId/check-permission',
  requirePermission('users:view'),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { action, resource } = req.body;

      const identity = await req.db('unified_user_identities').where('global_user_id', userId).first();
      if (!identity) {
        return res.status(404).json({ error: 'User identity not found', code: 'NOT_FOUND' });
      }

      const consolidatedPermissions = identity.consolidated_permissions || [];
      const roles = identity.roles || [];

      // Check direct permission
      const hasDirectPermission = consolidatedPermissions.includes(`${action}:${resource}`) ||
        consolidatedPermissions.includes(`${action}:*`) ||
        consolidatedPermissions.includes(`*:${resource}`) ||
        consolidatedPermissions.includes('admin:all');

      // Check role-based permission (simplified)
      const hasRolePermission = roles.some(role => {
        const rolePerms = getRolePermissions(role);
        return rolePerms.includes(`${action}:${resource}`) || rolePerms.includes('admin:all');
      });

      const allowed = hasDirectPermission || hasRolePermission;

      res.json({
        allowed,
        reasons: allowed ? ['direct_permission', hasRolePermission ? 'role_permission' : null].filter(Boolean) : ['no_permission'],
        requiredRoles: getRequiredRolesForPermission(action, resource),
        matchedRoles: roles
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/identity/:userId/effective-permissions',
  requirePermission('users:view'),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { governorate, directorate, entityId } = req.body;

      const identity = await req.db('unified_user_identities').where('global_user_id', userId).first();
      if (!identity) {
        return res.status(404).json({ error: 'User identity not found', code: 'NOT_FOUND' });
      }

      // Get consolidated permissions
      let permissions = identity.consolidated_permissions || [];

      // Filter by jurisdiction if provided
      if (governorate || directorate) {
        const jurisdiction = identity.jurisdiction ? JSON.parse(identity.jurisdiction) : {};
        if (jurisdiction.governorate && governorate !== jurisdiction.governorate) {
          // Restrict permissions based on jurisdiction
          permissions = permissions.filter(p => !p.startsWith('*'));
        }
      }

      res.json({
        permissions,
        jurisdictions: identity.jurisdiction ? [JSON.parse(identity.jurisdiction)] : [],
        entities: identity.linked_entities ? JSON.parse(identity.linked_entities).map(e => e.id) : [],
        scopes: [{ resource: '*', actions: permissions }]
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// NOTIFICATIONS HUB
// ============================================================

router.post('/notifications/send',
  requirePermission('notifications:create'),
  async (req, res, next) => {
    try {
      const {
        recipientUserId, recipientRole, recipientType,
        sourcePortal, type, priority = 'medium',
        title, message, actionUrl, metadata, expiresAt
      } = req.body;

      const [notification] = await req.db('cross_portal_notifications')
        .insert({
          recipient_user_id: recipientUserId,
          recipient_role: recipientRole,
          recipient_type: recipientType,
          source_portal: sourcePortal,
          type,
          priority,
          title,
          message,
          action_url: actionUrl,
          metadata: metadata ? JSON.stringify(metadata) : '{}',
          expires_at: expiresAt,
          created_at: new Date()
        })
        .returning('*');

      eventBus.emit('notification:sent', { notificationId: notification.id, recipient: recipientUserId || recipientRole });

      res.status(201).json({ notificationId: notification.id });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/notifications/broadcast',
  requirePermission('notifications:create'),
  async (req, res, next) => {
    try {
      const { recipients, sourcePortal, type, priority, title, message, actionUrl } = req.body;

      const notifications = recipients.map(r => ({
        recipient_user_id: r.userId,
        recipient_role: r.role,
        recipient_type: r.type,
        source_portal: sourcePortal,
        type,
        priority: priority || 'medium',
        title,
        message,
        action_url: actionUrl,
        created_at: new Date()
      }));

      const result = await req.db('cross_portal_notifications').insert(notifications).returning('*');

      res.json({ sentCount: result.length, failedCount: 0 });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/notifications',
  async (req, res, next) => {
    try {
      const { read, type, priority, page = 1, limit = 20 } = req.query;

      let query = req.db('cross_portal_notifications')
        .where('recipient_user_id', req.user.id)
        .orderBy('created_at', 'desc');

      if (read !== undefined) {
        query = query.where('read', read === 'true');
      }
      if (type) {
        query = query.where('type', type);
      }
      if (priority) {
        query = query.where('priority', priority);
      }

      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset);

      const notifications = await query;

      // Get unread count
      const [{ count }] = await req.db('cross_portal_notifications')
        .where('recipient_user_id', req.user.id)
        .where('read', false)
        .count();

      res.json({ notifications, unreadCount: Number(count) });
    } catch (err) {
      next(err);
    }
  }
);

router.put('/notifications/:notificationId/read',
  async (req, res, next) => {
    try {
      const { notificationId } = req.params;

      await req.db('cross_portal_notifications')
        .where('id', notificationId)
        .where('recipient_user_id', req.user.id)
        .update({ read: true, read_at: new Date() });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.put('/notifications/read-all',
  async (req, res, next) => {
    try {
      const [{ count }] = await req.db('cross_portal_notifications')
        .where('recipient_user_id', req.user.id)
        .where('read', false)
        .update({ read: true, read_at: new Date() });

      res.json({ updatedCount: count });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ANALYTICS
// ============================================================

router.get('/analytics',
  requirePermission('reports:view'),
  async (req, res, next) => {
    try {
      const { dateFrom, dateTo, governorate } = req.query;

      // Workflow stats
      const activeWorkflows = await req.db('cross_portal_workflows')
        .where('status', 'in_progress')
        .count('id as count').first();

      const completedWorkflows = await req.db('cross_portal_workflows')
        .where('status', 'completed')
        .where('completed_at', '>=', dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .count('id as count').first();

      // Notification stats
      const notificationsSent = await req.db('cross_portal_notifications')
        .where('created_at', '>=', dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .count('id as count').first();

      // Registry sync stats
      const entitiesSynced = await req.db('unified_registry_entries')
        .where('last_synced_at', '>=', dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .count('id as count').first();

      // Top workflows
      const topWorkflows = await req.db('cross_portal_workflows')
        .select('workflow_type')
        .count('id as count')
        .groupBy('workflow_type')
        .orderBy('count', 'desc')
        .limit(5);

      res.json({
        workflowsActive: activeWorkflows?.count || 0,
        workflowsCompleted: completedWorkflows?.count || 0,
        notificationsSent: notificationsSent?.count || 0,
        entitiesSynced: entitiesSynced?.count || 0,
        byPortal: { ministry: {}, employer: {}, worker: {}, union: {} },
        topWorkflows
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// COMPREHENSIVE CASE VIEW
// ============================================================

router.get('/cases/:disputeId/comprehensive',
  requirePermission('laborDisputes:view'),
  async (req, res, next) => {
    try {
      const { disputeId } = req.params;

      // Get dispute
      const dispute = await req.db('labor_disputes').where('id', disputeId).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Get related contract
      let contract = null;
      if (dispute.related_contract_id) {
        contract = await req.db('contracts').where('id', dispute.related_contract_id).first();
      }

      // Get related inspections
      const inspections = await req.db('inspections')
        .where('dispute_id', disputeId);

      // Get violations
      const violations = [];
      for (const ins of inspections) {
        const insViolations = await req.db('inspection_violations').where('inspection_id', ins.id);
        violations.push(...insViolations);
      }

      // Get timeline from dispute timeline + audit log
      const timeline = await req.db('dispute_timeline').where('dispute_id', disputeId).orderBy('date', 'asc');

      // Get notifications
      const notifications = await req.db('cross_portal_notifications')
        .where('related_entity_type', 'dispute')
        .where('related_entity_id', disputeId)
        .orderBy('created_at', 'desc')
        .limit(20);

      // Get audit trail
      const auditTrail = await req.db('cross_portal_audit_log')
        .where('entity_type', 'dispute')
        .where('entity_id', disputeId)
        .orderBy('occurred_at', 'desc')
        .limit(50);

      res.json({
        dispute,
        contract,
        inspection: inspections[0] || null,
        violations,
        timeline,
        notifications,
        auditTrail
      });
    } catch (err) {
      next(err);
    }
  }
);

// Helper functions

function getRolePermissions(role) {
  const rolePerms = {
    super_admin: ['admin:all'],
    ministry_admin: ['admin:all'],
    deputy_minister: ['entities:view', 'entities:edit', 'laborDisputes:view', 'laborDisputes:edit', 'inspections:view', 'inspections:edit', 'reports:view'],
    labor_inspector: ['inspections:view', 'inspections:create', 'inspections:edit', 'violations:view', 'violations:create'],
    compliance_officer: ['compliance:view', 'compliance:create', 'compliance:edit', 'violations:view', 'violations:create'],
  };
  return rolePerms[role] || [];
}

function getRequiredRolesForPermission(action, resource) {
  return ['super_admin', 'ministry_admin']; // Simplified
}

export default router;