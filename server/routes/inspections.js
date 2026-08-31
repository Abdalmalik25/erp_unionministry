/**
 * server/routes/inspections.js — Production-Grade Inspection API
 * Yemen National Labor Platform — Law 5/1995 & Law 23/1997 (OSH)
 * 
 * Endpoints:
 * GET/POST    /api/inspections
 * GET/PUT     /api/inspections/:id
 * PUT         /api/inspections/:id/assign
 * PUT         /api/inspections/:id/reassign
 * PUT         /api/inspections/:id/reschedule
 * POST        /api/inspections/:id/start
 * POST        /api/inspections/:id/findings
 * POST        /api/inspections/:id/violations
 * PUT         /api/inspections/:id/violations/:violationId
 * POST        /api/inspections/:id/attachments
 * POST        /api/inspections/:id/witnesses
 * POST        /api/inspections/:id/complete
 * POST        /api/inspections/:id/report
 * POST        /api/inspections/:id/approve
 * POST        /api/inspections/:id/revision
 * POST        /api/inspections/:id/follow-up
 * POST        /api/inspections/:id/cancel
 * POST        /api/inspections/:id/escalate
 * POST        /api/inspections/:id/link/complaint
 * POST        /api/inspections/:id/link/dispute
 * POST        /api/inspections/:id/link/osh
 * POST        /api/inspections/:id/notify/employer
 * POST        /api/inspections/:id/notify/workers
 * GET         /api/inspections/statistics
 * GET         /api/inspections/schedule/:inspectorId
 * GET         /api/inspections/checklist/:type
 * GET         /api/inspections/export
 */

import { Router } from 'express';
import { getAuthUser } from '../middleware/auth.js';
import { requirePermission, auditContext, requireJurisdiction } from '../middleware/rbac.js';
import { validateQuery } from '../middleware/validation.js';
import { structuredLogger } from '../middleware/observability.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { eventBus } from '../utils/eventBus.js';

const router = Router();

router.use(getAuthUser);
router.use(auditContext);

// ============================================================
// LIST INSPECTIONS
// ============================================================

router.get('/',
  requirePermission('inspections:view'),
  requireJurisdiction,
  async (req, res, next) => {
    try {
      const {
        type, status, priority, governorate, directorate,
        assignedInspector, dateFrom, dateTo, search,
        page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
      } = req.query;

      let query = req.db('inspections').select('*');

      if (type?.length) query = query.whereIn('type', Array.isArray(type) ? type : [type]);
      if (status?.length) query = query.whereIn('status', Array.isArray(status) ? status : [status]);
      if (priority?.length) query = query.whereIn('priority', Array.isArray(priority) ? priority : [priority]);
      if (governorate) query = query.where('governorate', governorate);
      if (directorate) query = query.where('directorate', directorate);
      if (assignedInspector) query = query.where('assigned_inspector', assignedInspector);
      if (dateFrom) query = query.where('scheduled_date', '>=', dateFrom);
      if (dateTo) query = query.where('scheduled_date', '<=', dateTo);
      if (search) {
        query = query.where(function() {
          this.whereILike('entity_name', `%${search}%`)
            .orWhereILike('case_number', `%${search}%`);
        });
      }

      const countQuery = query.clone();
      const [{ count }] = await countQuery.count();
      const offset = (page - 1) * limit;
      query = query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

      const inspections = await query;

      res.json({
        inspections,
        meta: { page: Number(page), limit: Number(limit), total: Number(count), totalPages: Math.ceil(count / limit) }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET INSPECTION DETAILS
// ============================================================

router.get('/:id',
  requirePermission('inspections:view'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const inspection = await req.db('inspections').where('id', id).first();
      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      inspection.violations = await req.db('inspection_violations').where('inspection_id', id);
      inspection.attachments = await req.db('inspection_attachments').where('inspection_id', id);
      inspection.witnesses = await req.db('inspection_witnesses').where('inspection_id', id);

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CREATE INSPECTION
// ============================================================

router.post('/',
  requirePermission('inspections:create'),
  requireJurisdiction,
  async (req, res, next) => {
    try {
      const {
        type, priority = 'medium', entityId, entityName, entityType, entityLicense,
        address, governorate, directorate, coordinates,
        scheduledDate, scheduledTime, duration = 60,
        triggerReason, complaintId, disputeId, notes
      } = req.body;

      // Generate case number: I-{YEAR}-{GOVERNORATE}-{SEQUENCE}
      const year = new Date().getFullYear();
      const govCode = governorate?.substring(0, 3).toUpperCase() || 'NAT';
      const [{ seq }] = await req.db.raw(
        `SELECT COALESCE(MAX(CAST(SPLIT_PART(case_number, '-', 4) AS INTEGER)), 0) + 1 as seq FROM inspections WHERE case_number LIKE ?`,
        [`I-${year}-%`]
      );
      const caseNumber = `I-${year}-${govCode}-${String(seq).padStart(5, '0')}`;

      const [inspection] = await req.db('inspections')
        .insert({
          case_number: caseNumber,
          type,
          status: 'planned',
          priority,
          entity_id: entityId,
          entity_name: entityName,
          entity_type: entityType,
          entity_license: entityLicense,
          address,
          governorate,
          directorate,
          coordinates: coordinates ? JSON.stringify(coordinates) : null,
          schedule: JSON.stringify({ scheduledDate, scheduledTime, duration }),
          trigger_reason: triggerReason,
          complaint_id: complaintId,
          dispute_id: disputeId,
          notes,
          created_by: req.user.id,
          sla_status: 'on_track'
        })
        .returning('*');

      // Emit event
      eventBus.emit('inspection:scheduled', {
        inspectionId: inspection.id,
        caseNumber,
        entityId,
        entityName,
        scheduledDate,
        scheduledTime,
        scheduledBy: req.user.id
      });

      structuredLogger.info('inspection_scheduled', {
        ...req.audit,
        inspectionId: inspection.id,
        caseNumber
      });

      res.status(201).json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPDATE INSPECTION
// ============================================================

router.put('/:id',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const allowedFields = ['priority', 'notes', 'address'];
      const dbUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          dbUpdates[field] = updates[field];
        }
      }

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({ ...dbUpdates, updated_at: new Date() })
        .returning('*');

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ASSIGN INSPECTOR
// ============================================================

router.put('/:id/assign',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { inspectorId } = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const inspector = await req.db('users').where('id', inspectorId).select('full_name').first();

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({
          inspector: inspectorId,
          inspector_name: inspector?.full_name,
          assigned_inspector: inspectorId,
          status: 'assigned',
          updated_at: new Date()
        })
        .returning('*');

      eventBus.emit('inspection:assigned', {
        inspectionId: id,
        caseNumber: existing.case_number,
        inspectorId,
        inspectorName: inspector?.full_name
      });

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// REASSIGN INSPECTION
// ============================================================

router.put('/:id/reassign',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newInspectorId, reason } = req.body;

      const inspector = await req.db('users').where('id', newInspectorId).select('full_name').first();

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({
          inspector: newInspectorId,
          inspector_name: inspector?.full_name,
          updated_at: new Date()
        })
        .returning('*');

      structuredLogger.info('inspection_reassigned', {
        ...req.audit,
        inspectionId: id,
        newInspectorId,
        reason
      });

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// RESCHEDULE INSPECTION
// ============================================================

router.put('/:id/reschedule',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { date, time, reason } = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const schedule = JSON.parse(existing.schedule || '{}');
      schedule.scheduledDate = date;
      schedule.scheduledTime = time;

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({
          schedule: JSON.stringify(schedule),
          updated_at: new Date()
        })
        .returning('*');

      eventBus.emit('inspection:rescheduled', {
        inspectionId: id,
        caseNumber: existing.case_number,
        newDate: date,
        newTime: time,
        reason
      });

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// START INSPECTION
// ============================================================

router.post('/:id/start',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { actualStartTime, witnessNames = [], areaInspected = [] } = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({
          status: 'in_progress',
          start_time: actualStartTime,
          area_inspected: JSON.stringify(areaInspected),
          updated_at: new Date()
        })
        .returning('*');

      eventBus.emit('inspection:started', {
        inspectionId: id,
        caseNumber: existing.case_number,
        inspectorId: req.user.id,
        startTime: actualStartTime
      });

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// RECORD FINDING
// ============================================================

router.post('/:id/findings',
  requirePermission('inspections:edit'),
  uploadMiddleware.any(),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { finding, area } = req.body;
      const files = req.files;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      // In production: store evidence files and link
      const findingId = crypto.randomUUID();

      res.status(201).json({ findingId });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ADD VIOLATION
// ============================================================

router.post('/:id/violations',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const violation = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const [newViolation] = await req.db('inspection_violations')
        .insert({
          inspection_id: id,
          ...violation,
          status: 'identified'
        })
        .returning('*');

      // Update inspection status
      await req.db('inspections')
        .where('id', id)
        .update({ status: 'violations_found', updated_at: new Date() });

      res.status(201).json(newViolation);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPDATE VIOLATION
// ============================================================

router.put('/:id/violations/:violationId',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id, violationId } = req.params;
      const updates = req.body;

      const [violation] = await req.db('inspection_violations')
        .where('id', violationId)
        .where('inspection_id', id)
        .update(updates)
        .returning('*');

      if (!violation) {
        return res.status(404).json({ error: 'Violation not found', code: 'NOT_FOUND' });
      }

      res.json(violation);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPLOAD ATTACHMENT
// ============================================================

router.post('/:id/attachments',
  requirePermission('inspections:edit'),
  uploadMiddleware.any(),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { type, description } = req.body;
      const files = req.files;

      const uploadedAttachments = [];
      for (const file of (files || [])) {
        const [attachment] = await req.db('inspection_attachments')
          .insert({
            inspection_id: id,
            type,
            filename: file.originalname,
            file_id: file.filename,
            description,
            uploaded_by: req.user.id,
            uploaded_at: new Date()
          })
          .returning('*');
        uploadedAttachments.push(attachment);
      }

      res.status(201).json(uploadedAttachments);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ADD WITNESS
// ============================================================

router.post('/:id/witnesses',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const witness = req.body;

      const [newWitness] = await req.db('inspection_witnesses')
        .insert({
          inspection_id: id,
          ...witness
        })
        .returning('*');

      res.status(201).json(newWitness);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// COMPLETE INSPECTION
// ============================================================

router.post('/:id/complete',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { endTime, actualDuration, areasNotAccessible, summary, oshContext } = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({
          status: 'completed',
          end_time: endTime,
          actual_duration: actualDuration,
          areas_not_accessible: areasNotAccessible ? JSON.stringify(areasNotAccessible) : null,
          summary,
          osh_context: oshContext ? JSON.stringify(oshContext) : null,
          updated_at: new Date()
        })
        .returning('*');

      eventBus.emit('inspection:completed', {
        inspectionId: id,
        caseNumber: existing.case_number,
        inspectorId: req.user.id,
        endTime,
        violationsCount: existing.violations?.length || 0
      });

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// SUBMIT REPORT
// ============================================================

router.post('/:id/report',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const report = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const [reportRecord] = await req.db('inspection_reports')
        .insert({
          inspection_id: id,
          ...report,
          submitted_at: new Date()
        })
        .returning('*');

      await req.db('inspections')
        .where('id', id)
        .update({ status: 'report_submitted', updated_at: new Date() });

      res.status(201).json(reportRecord);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// APPROVE REPORT
// ============================================================

router.post('/:id/approve',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      await req.db('inspection_reports')
        .where('inspection_id', id)
        .update({
          approved_at: new Date(),
          approved_by: req.user.id
        });

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({ status: 'completed', updated_at: new Date() })
        .returning('*');

      eventBus.emit('inspection:report_approved', {
        inspectionId: id,
        approvedBy: req.user.id,
        comments
      });

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// SCHEDULE FOLLOW-UP
// ============================================================

router.post('/:id/follow-up',
  requirePermission('inspections:create'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { scheduledDate, scheduledTime, focusAreas, previousInspectionId } = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      // Create new inspection as follow-up
      const year = new Date().getFullYear();
      const govCode = existing.governorate?.substring(0, 3).toUpperCase() || 'NAT';
      const [{ seq }] = await req.db.raw(
        `SELECT COALESCE(MAX(CAST(SPLIT_PART(case_number, '-', 4) AS INTEGER)), 0) + 1 as seq FROM inspections WHERE case_number LIKE ?`,
        [`I-${year}-%`]
      );
      const caseNumber = `I-${year}-${govCode}-${String(seq).padStart(5, '0')}`;

      const [newInspection] = await req.db('inspections')
        .insert({
          case_number: caseNumber,
          type: 'follow_up',
          status: 'planned',
          priority: existing.priority,
          entity_id: existing.entity_id,
          entity_name: existing.entity_name,
          entity_type: existing.entity_type,
          address: existing.address,
          governorate: existing.governorate,
          directorate: existing.directorate,
          schedule: JSON.stringify({ scheduledDate, scheduledTime, duration: 60 }),
          previous_inspection_id: previousInspectionId,
          notes: focusAreas?.join(', '),
          created_by: req.user.id
        })
        .returning('*');

      res.status(201).json(newInspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CANCEL INSPECTION
// ============================================================

router.post('/:id/cancel',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const existing = await req.db('inspections').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Inspection not found', code: 'NOT_FOUND' });
      }

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date()
        })
        .returning('*');

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// ESCALATE TO LEGAL
// ============================================================

router.post('/:id/escalate',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { escalationNote, legalTeamId } = req.body;

      const [inspection] = await req.db('inspections')
        .where('id', id)
        .update({
          status: 'escalated',
          legal_escalation_note: escalationNote,
          legal_team_id: legalTeamId,
          updated_at: new Date()
        })
        .returning('*');

      eventBus.emit('inspection:escalated_to_legal', {
        inspectionId: id,
        escalationNote,
        legalTeamId
      });

      res.json(inspection);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CROSS-PORTAL LINKS
// ============================================================

router.post('/:id/link/complaint', requirePermission('inspections:edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { complaintId } = req.body;
    await req.db('inspections').where('id', id).update({ complaint_id: complaintId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/link/dispute', requirePermission('inspections:edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { disputeId } = req.body;
    await req.db('inspections').where('id', id).update({ dispute_id: disputeId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/link/osh', requirePermission('inspections:edit'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { oshIncidentId } = req.body;
    await req.db('inspections').where('id', id).update({ osh_incident_id: oshIncidentId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// CROSS-PORTAL NOTIFICATIONS
// ============================================================

router.post('/:id/notify/employer',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { employerEntityId, notificationType } = req.body;

      const titles = {
        scheduled: 'Inspection Scheduled',
        completed: 'Inspection Completed',
        violations: 'Inspection Violations Found'
      };
      const messages = {
        scheduled: 'An inspection has been scheduled for your establishment.',
        completed: 'An inspection of your establishment has been completed.',
        violations: 'Violations were found during the inspection of your establishment.'
      };

      await req.db('cross_portal_notifications').insert({
        recipient_type: 'employer',
        source_portal: 'inspector',
        type: 'inspection',
        priority: notificationType === 'violations' ? 'high' : 'medium',
        title: titles[notificationType] || 'Inspection Update',
        message: messages[notificationType] || 'Inspection status update',
        related_entity_type: 'inspection',
        related_entity_id: id,
        created_at: new Date()
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/notify/workers',
  requirePermission('inspections:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      await req.db('cross_portal_notifications').insert({
        recipient_type: 'worker',
        source_portal: 'inspector',
        type: 'inspection',
        priority: 'medium',
        title: 'Workplace Inspection',
        message: message || 'A workplace inspection has been conducted at your workplace.',
        related_entity_type: 'inspection',
        related_entity_id: id,
        created_at: new Date()
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// STATISTICS
// ============================================================

router.get('/statistics',
  requirePermission('inspections:view'),
  async (req, res, next) => {
    try {
      const { governorate, dateFrom, dateTo } = req.query;

      let query = req.db('inspections').select('status', 'type');
      if (governorate) query = query.where('governorate', governorate);
      if (dateFrom) query = query.where('created_at', '>=', dateFrom);
      if (dateTo) query = query.where('created_at', '<=', dateTo);

      const inspections = await query;

      const stats = {
        total: inspections.length,
        byStatus: {},
        byType: {},
        violationsFound: 0,
        complianceRate: 0,
        averageDuration: 0,
        inspectorPerformance: []
      };

      for (const ins of inspections) {
        stats.byStatus[ins.status] = (stats.byStatus[ins.status] || 0) + 1;
        stats.byType[ins.type] = (stats.byType[ins.type] || 0) + 1;
      }

      // Calculate violations found
      const violationCount = await req.db('inspection_violations').count('id as count').first();
      stats.violationsFound = violationCount?.count || 0;

      // Calculate compliance rate
      const completedCount = stats.byStatus['completed'] || 0;
      const violationsCount = stats.byStatus['violations_found'] || 0;
      if (completedCount > 0) {
        stats.complianceRate = Math.round(((completedCount - violationsCount) / completedCount) * 100);
      }

      res.json(stats);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// INSPECTOR SCHEDULE
// ============================================================

router.get('/schedule/:inspectorId',
  requirePermission('inspections:view'),
  async (req, res, next) => {
    try {
      const { inspectorId } = req.params;
      const { dateFrom, dateTo } = req.query;

      const inspections = await req.db('inspections')
        .where('inspector', inspectorId)
        .where('scheduled_date', '>=', dateFrom)
        .where('scheduled_date', '<=', dateTo)
        .orderBy('scheduled_date', 'asc')
        .orderBy('scheduled_time', 'asc');

      res.json({ inspections });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CHECKLIST TEMPLATES
// ============================================================

router.get('/checklist/:type',
  requirePermission('inspections:view'),
  async (req, res, next) => {
    try {
      const { type } = req.params;

      const checklists = {
        OSH: {
          sections: [
            { title: 'OSH Governance', items: ['OSH Committee', 'OSH Representative', 'OSH Policy'] },
            { title: 'Risk Management', items: ['Risk Assessment', 'Hazard Identification', 'Emergency Plan'] },
            { title: 'Equipment & Training', items: ['PPE Availability', 'PPE Usage', 'OSH Training'] },
            { title: 'Medical', items: ['Medical Examinations', 'First Aid Kit', 'Accident Register'] }
          ]
        },
        wage_compliance: {
          sections: [
            { title: 'Wages', items: ['Minimum Wage Compliance', 'Overtime Payments', 'Payment Schedule'] },
            { title: 'Records', items: ['Payroll Records', 'Wage Slips', 'Bank Transfers'] }
          ]
        },
        scheduled: {
          sections: [
            { title: 'Compliance', items: ['Operating License', 'Working Hours', 'Worker Contracts'] },
            { title: 'Conditions', items: ['Workplace Safety', 'Sanitation', 'Rest Areas'] }
          ]
        }
      };

      res.json(checklists[type] || { sections: [] });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

router.get('/export',
  requirePermission('inspections:view'),
  async (req, res, next) => {
    try {
      const { type, status, governorate, format = 'xlsx' } = req.query;

      let query = req.db('inspections').select('*');
      if (type) query = query.whereIn('type', Array.isArray(type) ? type : [type]);
      if (status) query = query.whereIn('status', Array.isArray(status) ? status : [status]);
      if (governorate) query = query.where('governorate', governorate);

      const inspections = await query;

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="inspections-export.${format}"`);
      res.json({ count: inspections.length, format });
    } catch (err) {
      next(err);
    }
  }
);

export default router;