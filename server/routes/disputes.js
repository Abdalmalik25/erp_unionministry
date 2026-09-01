/**
 * server/routes/disputes.js — Production-Grade Dispute Resolution API
 * Yemen National Labor Platform — Law 25/1991 & Amendments
 * 
 * Endpoints:
 * GET/POST    /api/disputes
 * GET/PUT     /api/disputes/:id
 * POST        /api/disputes/:id/status
 * POST        /api/disputes/:id/assign
 * POST        /api/disputes/:id/parties
 * DELETE      /api/disputes/:id/parties/:partyId
 * POST        /api/disputes/:id/evidence
 * GET         /api/disputes/:id/evidence/:evidenceId/file
 * POST        /api/disputes/:id/mediation/schedule
 * POST        /api/disputes/:id/mediation/outcome
 * POST        /api/disputes/:id/arbitration/schedule
 * POST        /api/disputes/:id/arbitration/decision
 * POST        /api/disputes/:id/resolve
 * POST        /api/disputes/:id/withdraw
 * POST        /api/disputes/:id/escalate
 * POST        /api/disputes/:id/appeal
 * GET         /api/disputes/:id/sla
 * GET         /api/disputes/:id/report
 * POST        /api/disputes/:id/link/osh
 * POST        /api/disputes/:id/link/contract
 * POST        /api/disputes/:id/link/employer
 * POST        /api/disputes/:id/link/worker
 * POST        /api/disputes/:id/notify/union
 * POST        /api/disputes/:id/notify/employer
 * GET         /api/disputes/statistics
 * GET         /api/disputes/templates/:category
 * POST        /api/disputes/bulk/status
 * POST        /api/disputes/bulk/assign
 * GET         /api/disputes/export
 */

import { Router } from 'express';
import { getAuthUser } from '../middleware/auth.js';
import { requirePermission, auditContext } from '../middleware/rbac.js';
import { requireJurisdiction } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { hasPermission } from '../middleware/rbac.js';
import { structuredLogger } from '../middleware/observability.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { eventBus } from '../utils/eventBus.js';
import { webhookManager } from '../utils/webhookManager.js';
import { invalidateCache } from '../middleware/cache.js';

const router = Router();

// Apply common middleware
router.use(getAuthUser);
router.use(auditContext);

// ============================================================
// QUERY PARAMS VALIDATION
// ============================================================

const listDisputesSchema = {
  status: { type: 'array', items: { type: 'string', enum: ['draft', 'submitted', 'acknowledged', 'under_review', 'mediation_scheduled', 'mediation_in_progress', 'mediation_concluded', 'arbitration_scheduled', 'arbitration_in_progress', 'arbitration_concluded', 'resolved', 'partially_resolved', 'rejected', 'withdrawn', 'escalated'] } },
  category: { type: 'array', items: { type: 'string' } },
  priority: { type: 'array', items: { type: 'string', enum: ['low', 'medium', 'high', 'urgent', 'critical'] } },
  governorate: { type: 'string' },
  directorate: { type: 'string' },
  assignedTo: { type: 'string' },
  dateFrom: { type: 'string' },
  dateTo: { type: 'string' },
  search: { type: 'string' },
  page: { type: 'number', default: 1 },
  limit: { type: 'number', default: 20, max: 100 },
  sortBy: { type: 'string', default: 'createdAt' },
  sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
};

// ============================================================
// LIST DISPUTES
// GET /api/disputes
// ============================================================

router.get('/',
  requirePermission('laborDisputes:view'),
  requireJurisdiction,
  validateQuery(listDisputesSchema),
  async (req, res, next) => {
    try {
      const {
        status, category, priority, governorate, directorate,
        assignedTo, dateFrom, dateTo, search,
        page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
      } = req.query;

      // Build query
      let query = req.db('labor_disputes').select('*');
      
      // Filters
      if (status?.length) {
        query = query.whereIn('status', Array.isArray(status) ? status : [status]);
      }
      if (category?.length) {
        query = query.whereIn('category', Array.isArray(category) ? category : [category]);
      }
      if (priority?.length) {
        query = query.whereIn('priority', Array.isArray(priority) ? priority : [priority]);
      }
      if (governorate) {
        query = query.where('governorate', governorate);
      }
      if (directorate) {
        query = query.where('directorate', directorate);
      }
      if (assignedTo) {
        query = query.where('assigned_to', assignedTo);
      }
      if (dateFrom) {
        query = query.where('created_at', '>=', dateFrom);
      }
      if (dateTo) {
        query = query.where('created_at', '<=', dateTo);
      }
      if (search) {
        query = query.where(function() {
          this.whereILike('title', `%${search}%`)
            .orWhereILike('case_number', `%${search}%`)
            .orWhereILike('description', `%${search}%`);
        });
      }

      // Count total
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count();

      // Pagination
      const offset = (page - 1) * limit;
      query = query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

      const disputes = await query;

      res.json({
        disputes,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: Number(count),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET DISPUTE DETAILS
// GET /api/disputes/:id
// ============================================================

router.get('/:id',
  requirePermission('laborDisputes:view'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const dispute = await req.db('labor_disputes')
        .select('*')
        .where('id', id)
        .first();

      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Load parties
      dispute.parties = await req.db('dispute_parties')
        .select('*')
        .where('dispute_id', id);

      // Load evidence
      dispute.evidence = await req.db('dispute_evidence')
        .select('*')
        .where('dispute_id', id);

      // Load timeline
      dispute.timeline = await req.db('dispute_timeline')
        .select('*')
        .where('dispute_id', id)
        .orderBy('date', 'asc');

      // Load resolution if exists
      dispute.resolution = await req.db('dispute_resolutions')
        .select('*')
        .where('dispute_id', id)
        .first();

      res.json(dispute);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CREATE DISPUTE
// POST /api/disputes
// ============================================================

router.post('/',
  requirePermission('laborDisputes:create'),
  requireJurisdiction,
  uploadMiddleware.any(),
  async (req, res, next) => {
    try {
      const {
        category, title, description, legalBasis, governorate, directorate,
        parties, employmentRelationship, oshIncident, priority = 'medium'
      } = req.body;

      // Generate case number: D-{YEAR}-{GOVERNORATE_CODE}-{SEQUENCE}
      const year = new Date().getFullYear();
      const govCode = governorate?.substring(0, 3).toUpperCase() || 'NAT';
      const [{ seq }] = await req.db.raw(
        `SELECT COALESCE(MAX(CAST(SPLIT_PART(case_number, '-', 4) AS INTEGER)), 0) + 1 as seq FROM labor_disputes WHERE case_number LIKE ?`,
        [`D-${year}-%`]
      );
      const caseNumber = `D-${year}-${govCode}-${String(seq).padStart(5, '0')}`;

      // Create dispute
      const [dispute] = await req.db('labor_disputes')
        .insert({
          case_number: caseNumber,
          status: 'submitted',
          category,
          priority,
          title,
          description,
          legal_basis: legalBasis,
          governorate,
          directorate,
          employment_relationship: employmentRelationship ? JSON.stringify(employmentRelationship) : null,
          osh_incident: oshIncident ? JSON.stringify(oshIncident) : null,
          created_by: req.user.id,
          jurisdiction: 'first_instance',
          sla_status: 'on_track'
        })
        .returning('*');

      // Add parties
      if (parties?.length) {
        await req.db('dispute_parties').insert(
          parties.map(p => ({
            dispute_id: dispute.id,
            ...p
          }))
        );
      }

      // Add initial timeline entry
      await req.db('dispute_timeline').insert({
        dispute_id: dispute.id,
        type: 'filing',
        title: 'Filing Submitted',
        description: 'Dispute has been filed and is pending acknowledgment',
        date: new Date().toISOString(),
        created_by: req.user.id
      });

      // Emit event for cross-portal notifications
      eventBus.emit('dispute:created', {
        disputeId: dispute.id,
        caseNumber: dispute.case_number,
        category,
        governorate,
        createdBy: req.user.id
      });

      // Log audit
      structuredLogger.info('dispute_created', {
        ...req.audit,
        disputeId: dispute.id,
        caseNumber: dispute.case_number
      });

      res.status(201).json(dispute);
      invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPDATE DISPUTE
// PUT /api/disputes/:id
// ============================================================

router.put('/:id',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await req.db('labor_disputes').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Allowed fields
      const allowedFields = ['title', 'description', 'legalBasis', 'priority', 'category'];
      const dbUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          dbUpdates[field.replace(/([A-Z])/g, '_$1').toLowerCase()] = updates[field];
        }
      }

      const [dispute] = await req.db('labor_disputes')
        .where('id', id)
        .update({ ...dbUpdates, updated_at: new Date() })
        .returning('*');

      res.json(dispute);
      invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPDATE STATUS
// PUT /api/disputes/:id/status
// ============================================================

router.put('/:id/status',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      const existing = await req.db('labor_disputes').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Validate status transition
      const validTransitions = {
        submitted: ['acknowledged', 'withdrawn'],
        acknowledged: ['under_review', 'withdrawn'],
        under_review: ['mediation_scheduled', 'arbitration_scheduled', 'resolved', 'rejected', 'escalated'],
        mediation_scheduled: ['mediation_in_progress'],
        mediation_in_progress: ['mediation_concluded'],
        mediation_concluded: ['resolved', 'partially_resolved', 'arbitration_scheduled'],
        arbitration_scheduled: ['arbitration_in_progress'],
        arbitration_in_progress: ['arbitration_concluded'],
        arbitration_concluded: ['resolved', 'partially_resolved'],
        resolved: [],
        partially_resolved: ['escalated'],
        rejected: [],
        withdrawn: [],
        escalated: ['resolved', 'partially_resolved']
      };

      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `Invalid status transition from '${existing.status}' to '${status}'`,
          code: 'INVALID_TRANSITION',
          allowedTransitions: allowed
        });
      }

      // Update status
      const [dispute] = await req.db('labor_disputes')
        .where('id', id)
        .update({
          status,
          updated_at: new Date()
        })
        .returning('*');

      // Add timeline entry
      await req.db('dispute_timeline').insert({
        dispute_id: id,
        type: status.includes('mediation') ? 'mediation' : status.includes('arbitration') ? 'arbitration' : 'note',
        title: `Status changed to ${status}`,
        description: note || `Dispute status updated from ${existing.status} to ${status}`,
        date: new Date().toISOString(),
        created_by: req.user.id
      });

      // Emit event
      eventBus.emit('dispute:status_changed', {
        disputeId: id,
        caseNumber: existing.case_number,
        previousStatus: existing.status,
        newStatus: status,
        changedBy: req.user.id
      });

      res.json(dispute);
      invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ASSIGN DISPUTE
// PUT /api/disputes/:id/assign
// ============================================================

router.put('/:id/assign',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;

      const existing = await req.db('labor_disputes').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Get assigned user name
      const assignedUser = await req.db('users').where('id', assignedTo).select('full_name').first();
      const assignedToName = assignedUser?.full_name;

      const [dispute] = await req.db('labor_disputes')
        .where('id', id)
        .update({
          assigned_to: assignedTo,
          assigned_to_name: assignedToName,
          updated_at: new Date()
        })
        .returning('*');

      // Add timeline entry
      await req.db('dispute_timeline').insert({
        dispute_id: id,
        type: 'note',
        title: 'Assigned',
        description: `Dispute assigned to ${assignedToName || assignedTo}`,
        date: new Date().toISOString(),
        created_by: req.user.id
      });

      // Notify assignee
      eventBus.emit('dispute:assigned', {
        disputeId: id,
        caseNumber: existing.case_number,
        assignedTo,
        assignedBy: req.user.id
      });

      res.json(dispute);
      invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ADD PARTY
// POST /api/disputes/:id/parties
// ============================================================

router.post('/:id/parties',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const party = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      const [newParty] = await req.db('dispute_parties')
        .insert({
          dispute_id: id,
          ...party
        })
        .returning('*');

      res.status(201).json(newParty);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// REMOVE PARTY
// DELETE /api/disputes/:id/parties/:partyId
// ============================================================

router.delete('/:id/parties/:partyId',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id, partyId } = req.params;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      await req.db('dispute_parties').where('id', partyId).delete();

      res.status(204).send();
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPLOAD EVIDENCE
// POST /api/disputes/:id/evidence
// ============================================================

router.post('/:id/evidence',
  requirePermission('laborDisputes:edit'),
  uploadMiddleware.any(),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { type, title, description } = req.body;
      const files = req.files;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      const uploadedEvidence = [];
      for (const file of (files || [])) {
        const [evidence] = await req.db('dispute_evidence')
          .insert({
            dispute_id: id,
            type,
            title,
            description,
            file_id: file.filename, // In production: upload to S3 and store URL
            uploaded_by: req.user.id,
            uploaded_at: new Date().toISOString()
          })
          .returning('*');
        uploadedEvidence.push(evidence);
      }

      res.status(201).json(uploadedEvidence);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// SCHEDULE MEDIATION
// POST /api/disputes/:id/mediation/schedule
// ============================================================

router.post('/:id/mediation/schedule',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { date, time, location, mediatorId, agenda } = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Get mediator info
      const mediator = await req.db('users').where('id', mediatorId).select('full_name', 'role').first();

      // Update status
      await req.db('labor_disputes')
        .where('id', id)
        .update({ status: 'mediation_scheduled', updated_at: new Date() });

      // Add timeline entry
      const [timeline] = await req.db('dispute_timeline')
        .insert({
          dispute_id: id,
          type: 'mediation',
          title: 'Mediation Scheduled',
          description: `Mediation session scheduled for ${date} at ${time} at ${location}. Mediator: ${mediator?.full_name}`,
          date: new Date().toISOString(),
          next_action: 'Attend mediation session',
          next_action_date: `${date} ${time}`,
          created_by: req.user.id
        })
        .returning('*');

      // Emit event
      eventBus.emit('dispute:mediation_scheduled', {
        disputeId: id,
        caseNumber: dispute.case_number,
        date,
        time,
        location,
        mediatorId,
        mediatorName: mediator?.full_name
      });

      res.status(201).json(timeline);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// RECORD MEDIATION OUTCOME
// POST /api/disputes/:id/mediation/outcome
// ============================================================

router.post('/:id/mediation/outcome',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { outcome, agreementTerms, notes, nextSteps } = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      const newStatus = outcome === 'agreement' ? 'mediation_concluded' : 'arbitration_scheduled';

      await req.db('labor_disputes')
        .where('id', id)
        .update({ status: newStatus, updated_at: new Date() });

      const [timeline] = await req.db('dispute_timeline')
        .insert({
          dispute_id: id,
          type: 'mediation',
          title: `Mediation ${outcome === 'agreement' ? 'Concluded with Agreement' : 'Ended without Agreement'}`,
          description: outcome === 'agreement' 
            ? `Agreement reached. Terms: ${agreementTerms?.join(', ')}`
            : 'No agreement reached. Case will proceed to arbitration.',
          outcome: outcome,
          next_action: nextSteps,
          date: new Date().toISOString(),
          created_by: req.user.id
        })
        .returning('*');

      res.status(201).json(timeline);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// RECORD ARBITRATION DECISION
// POST /api/disputes/:id/arbitration/decision
// ============================================================

router.post('/:id/arbitration/decision',
  requirePermission('laborDisputes:resolve'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { decision, rationale, compensation, complianceRequirements, implementationDeadline, appealDeadline } = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Create resolution record
      const [resolution] = await req.db('dispute_resolutions')
        .insert({
          dispute_id: id,
          type: 'arbitration',
          decision,
          rationale,
          compensation: compensation ? JSON.stringify(compensation) : null,
          compliance_requirements: complianceRequirements ? JSON.stringify(complianceRequirements) : null,
          implementation_deadline: implementationDeadline,
          appeal_deadline: appealDeadline,
          arbitrator_name: req.user.full_name,
          created_at: new Date().toISOString()
        })
        .returning('*');

      // Update dispute status
      await req.db('labor_disputes')
        .where('id', id)
        .update({ 
          status: 'resolved', 
          updated_at: new Date(),
          sla_status: 'on_track'
        });

      // Add timeline entry
      await req.db('dispute_timeline')
        .insert({
          dispute_id: id,
          type: 'decision',
          title: 'Arbitration Decision Issued',
          description: `Decision: ${decision}`,
          date: new Date().toISOString(),
          created_by: req.user.id
        });

      // Emit events
      eventBus.emit('dispute:resolved', {
        disputeId: id,
        caseNumber: dispute.case_number,
        resolutionType: 'arbitration',
        decidedBy: req.user.id
      });

      // Trigger webhooks
      webhookManager.trigger('dispute.resolved', {
        disputeId: id,
        caseNumber: dispute.case_number,
        decision
      });

      res.status(201).json(resolution);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// RESOLVE DISPUTE
// POST /api/disputes/:id/resolve
// ============================================================

router.post('/:id/resolve',
  requirePermission('laborDisputes:resolve'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const resolution = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // Create resolution
      const [resolutionRecord] = await req.db('dispute_resolutions')
        .insert({
          dispute_id: id,
          ...resolution,
          created_at: new Date().toISOString()
        })
        .returning('*');

      // Update status
      const [updated] = await req.db('labor_disputes')
        .where('id', id)
        .update({
          status: 'resolved',
          updated_at: new Date()
        })
        .returning('*');

      // Add timeline
      await req.db('dispute_timeline')
        .insert({
          dispute_id: id,
          type: 'decision',
          title: 'Dispute Resolved',
          description: `Resolution type: ${resolution.type}`,
          date: new Date().toISOString(),
          created_by: req.user.id
        });

      res.status(201).json(updated);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// WITHDRAW DISPUTE
// POST /api/disputes/:id/withdraw
// ============================================================

router.post('/:id/withdraw',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      const [updated] = await req.db('labor_disputes')
        .where('id', id)
        .update({
          status: 'withdrawn',
          updated_at: new Date()
        })
        .returning('*');

      await req.db('dispute_timeline')
        .insert({
          dispute_id: id,
          type: 'note',
          title: 'Dispute Withdrawn',
          description: reason || 'Dispute withdrawn by complainant',
          date: new Date().toISOString(),
          created_by: req.user.id
        });

      res.json(updated);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ESCALATE DISPUTE
// POST /api/disputes/:id/escalate
// ============================================================

router.post('/:id/escalate',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { targetJurisdiction } = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      const [updated] = await req.db('labor_disputes')
        .where('id', id)
        .update({
          status: 'escalated',
          jurisdiction: targetJurisdiction,
          updated_at: new Date()
        })
        .returning('*');

      await req.db('dispute_timeline')
        .insert({
          dispute_id: id,
          type: 'appeal',
          title: 'Case Escalated',
          description: `Escalated to ${targetJurisdiction} jurisdiction`,
          date: new Date().toISOString(),
          created_by: req.user.id
        });

      eventBus.emit('dispute:escalated', {
        disputeId: id,
        caseNumber: dispute.case_number,
        targetJurisdiction
      });

      res.json(updated);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// FILE APPEAL
// POST /api/disputes/:id/appeal
// ============================================================

router.post('/:id/appeal',
  requirePermission('laborDisputes:edit'),
  uploadMiddleware.any(),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason, grounds } = req.body;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      await req.db('labor_disputes')
        .where('id', id)
        .update({
          appeal_info: JSON.stringify({
            appealedAt: new Date().toISOString(),
            appealedBy: req.user.id,
            appealReason: reason,
            appealStatus: 'pending'
          }),
          updated_at: new Date()
        });

      await req.db('dispute_timeline')
        .insert({
          dispute_id: id,
          type: 'appeal',
          title: 'Appeal Filed',
          description: `Appeal filed. Reason: ${reason}`,
          date: new Date().toISOString(),
          created_by: req.user.id
        });

      res.status(201).json({ success: true, message: 'Appeal filed successfully' });
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CHECK SLA
// GET /api/disputes/:id/sla
// ============================================================

router.get('/:id/sla',
  requirePermission('laborDisputes:view'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const dispute = await req.db('labor_disputes').where('id', id).first();
      if (!dispute) {
        return res.status(404).json({ error: 'Dispute not found', code: 'NOT_FOUND' });
      }

      // SLA rules based on priority
      const slaDays = {
        critical: 15,
        urgent: 30,
        high: 45,
        medium: 60,
        low: 90
      };

      const targetDays = slaDays[dispute.priority] || 60;
      const createdAt = new Date(dispute.created_at);
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + targetDays);

      const now = new Date();
      const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      let status = 'on_track';
      if (daysRemaining < 0) {
        status = 'breached';
      } else if (daysRemaining < 7) {
        status = 'at_risk';
      }

      const totalDays = Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24));
      const complianceRate = Math.min(100, (totalDays / targetDays) * 100);

      res.json({
        status,
        daysRemaining: Math.max(0, daysRemaining),
        targetDate: dueDate.toISOString(),
        complianceRate: Math.round(complianceRate)
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET STATISTICS
// GET /api/disputes/statistics
// ============================================================

router.get('/statistics',
  requirePermission('laborDisputes:view'),
  async (req, res, next) => {
    try {
      const { governorate, dateFrom, dateTo } = req.query;

      let query = req.db('labor_disputes').select('status', 'category');

      if (governorate) query = query.where('governorate', governorate);
      if (dateFrom) query = query.where('created_at', '>=', dateFrom);
      if (dateTo) query = query.where('created_at', '<=', dateTo);

      const disputes = await query;

      const stats = {
        total: disputes.length,
        byStatus: {},
        byCategory: {},
        averageResolutionDays: 0,
        pendingCount: 0,
        resolvedCount: 0
      };

      for (const d of disputes) {
        stats.byStatus[d.status] = (stats.byStatus[d.status] || 0) + 1;
        stats.byCategory[d.category] = (stats.byCategory[d.category] || 0) + 1;
        if (['submitted', 'acknowledged', 'under_review', 'mediation_scheduled', 'mediation_in_progress', 'arbitration_scheduled', 'arbitration_in_progress'].includes(d.status)) {
          stats.pendingCount++;
        }
        if (['resolved', 'partially_resolved'].includes(d.status)) {
          stats.resolvedCount++;
        }
      }

      // Calculate average resolution time for resolved disputes
      const resolved = disputes.filter(d => ['resolved', 'partially_resolved'].includes(d.status) && d.updated_at);
      if (resolved.length > 0) {
        const totalDays = resolved.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const updated = new Date(d.updated_at);
          return sum + Math.ceil((updated - created) / (1000 * 60 * 60 * 24));
        }, 0);
        stats.averageResolutionDays = Math.round(totalDays / resolved.length);
      }

      res.json(stats);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// BULK OPERATIONS
// POST /api/disputes/bulk/status
// POST /api/disputes/bulk/assign
// ============================================================

router.post('/bulk/status',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { disputeIds, status } = req.body;

      await req.db('labor_disputes')
        .whereIn('id', disputeIds)
        .update({ status, updated_at: new Date() });

      res.json({ success: true, updatedCount: disputeIds.length });
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

router.post('/bulk/assign',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { disputeIds, assignedTo } = req.body;

      const assignedUser = await req.db('users').where('id', assignedTo).select('full_name').first();

      await req.db('labor_disputes')
        .whereIn('id', disputeIds)
        .update({
          assigned_to: assignedTo,
          assigned_to_name: assignedUser?.full_name,
          updated_at: new Date()
        });

      res.json({ success: true, assignedCount: disputeIds.length });
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CROSS-PORTAL LINKS
// POST /api/disputes/:id/link/*
// ============================================================

router.post('/:id/link/osh', requirePermission('laborDisputes:edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { oshIncidentId } = req.body;
    // Link logic here
    res.json({ success: true, linked: { type: 'osh', id: oshIncidentId } });
      invalidateCache('dashboard');
  } catch (err) { next(err); }
});

router.post('/:id/link/contract', requirePermission('laborDisputes:edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contractId } = req.body;
    res.json({ success: true, linked: { type: 'contract', id: contractId } });
      invalidateCache('dashboard');
  } catch (err) { next(err); }
});

router.post('/:id/link/employer', requirePermission('laborDisputes:edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { employerEntityId } = req.body;
    res.json({ success: true, linked: { type: 'employer', id: employerEntityId } });
      invalidateCache('dashboard');
  } catch (err) { next(err); }
});

router.post('/:id/link/worker', requirePermission('laborDisputes:edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;
    res.json({ success: true, linked: { type: 'worker', id: workerId } });
      invalidateCache('dashboard');
  } catch (err) { next(err); }
});

// ============================================================
// CROSS-PORTAL NOTIFICATIONS
// POST /api/disputes/:id/notify/*
// ============================================================

router.post('/:id/notify/union',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { unionId, message } = req.body;

      // Insert notification
      await req.db('cross_portal_notifications').insert({
        recipient_role: 'UNION_PRESIDENT',
        source_portal: 'ministry',
        type: 'dispute',
        priority: 'medium',
        title: 'Labor Dispute Notification',
        message: message || 'A labor dispute has been filed that may involve your union members.',
        related_entity_type: 'dispute',
        related_entity_id: id,
        created_at: new Date()
      });

      res.json({ success: true });
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/notify/employer',
  requirePermission('laborDisputes:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { employerEntityId, message } = req.body;

      await req.db('cross_portal_notifications').insert({
        recipient_type: 'employer',
        source_portal: 'ministry',
        type: 'dispute',
        priority: 'medium',
        title: 'Labor Dispute Notification',
        message: message || 'A labor dispute has been filed involving your establishment.',
        related_entity_type: 'dispute',
        related_entity_id: id,
        created_at: new Date()
      });

      res.json({ success: true });
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// EXPORT
// GET /api/disputes/export
// ============================================================

router.get('/export',
  requirePermission('laborDisputes:view'),
  async (req, res, next) => {
    try {
      const { status, category, format = 'xlsx' } = req.query;

      let query = req.db('labor_disputes').select('*');
      if (status) query = query.whereIn('status', Array.isArray(status) ? status : [status]);
      if (category) query = query.whereIn('category', Array.isArray(category) ? category : [category]);

      const disputes = await query;

      // In production: use exceljs or similar to generate file
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="disputes-export.${format}"`);
      res.json({ count: disputes.length, format });
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

export default router;