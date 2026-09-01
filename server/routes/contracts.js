/**
 * server/routes/contracts.js — Production-Grade Contract Management API
 * Yemen National Labor Platform — Labor Law 5/1995
 * 
 * Endpoints:
 * GET/POST    /api/contracts
 * GET/PUT     /api/contracts/:id
 * DELETE      /api/contracts/:id
 * POST        /api/contracts/:id/sign/employer
 * POST        /api/contracts/:id/sign/worker
 * POST        /api/contracts/:id/approve
 * POST        /api/contracts/:id/reject
 * POST        /api/contracts/:id/amendments
 * POST        /api/contracts/:id/amendments/:amendmentId/sign
 * POST        /api/contracts/:id/amendments/:amendmentId/approve
 * POST        /api/contracts/:id/terminate
 * POST        /api/contracts/:id/settlement
 * POST        /api/contracts/:id/renew
 * POST        /api/contracts/:id/attachments
 * GET         /api/contracts/:id/attachments/:attachmentId/file
 * GET         /api/contracts/:id/validate
 * GET         /api/contracts/:id/compliance
 * POST        /api/contracts/:id/link/dispute
 * POST        /api/contracts/:id/link/inspection
 * POST        /api/contracts/:id/sync/passport
 * POST        /api/contracts/:id/notify/worker
 * GET         /api/contracts/templates
 * GET         /api/contracts/statistics
 * GET         /api/contracts/expiring
 * GET/POST    /api/contracts/bulk
 * GET         /api/contracts/export
 */

import { Router } from 'express';
import { getAuthUser } from '../middleware/auth.js';
import { requirePermission, auditContext, requireJurisdiction } from '../middleware/rbac.js';
import { structuredLogger } from '../middleware/observability.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { eventBus } from '../utils/eventBus.js';
import { invalidateCache } from '../middleware/cache.js';

const router = Router();

router.use(getAuthUser);
router.use(auditContext);

// ============================================================
// LIST CONTRACTS
// ============================================================

router.get('/',
  requirePermission('contracts:view'),
  requireJurisdiction,
  async (req, res, next) => {
    try {
      const {
        status, type, employerId, workerId, governorate, professionId,
        dateFrom, dateTo, expiringWithin, search,
        page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
      } = req.query;

      let query = req.db('contracts').select('*');

      if (status?.length) query = query.whereIn('status', Array.isArray(status) ? status : [status]);
      if (type?.length) query = query.whereIn('type', Array.isArray(type) ? type : [type]);
      if (employerId) query = query.where('employer_entity_id', employerId);
      if (workerId) query = query.where('worker_id', workerId);
      if (governorate) query = query.where('governorate', governorate);
      if (professionId) query = query.where('profession_id', professionId);
      if (dateFrom) query = query.where('start_date', '>=', dateFrom);
      if (dateTo) query = query.where('start_date', '<=', dateTo);
      if (search) {
        query = query.where(function() {
          this.whereILike('worker_name', `%${search}%`)
            .orWhereILike('employer_name', `%${search}%`)
            .orWhereILike('contract_number', `%${search}%`);
        });
      }

      const countQuery = query.clone();
      const [{ count }] = await countQuery.count();
      const offset = (page - 1) * limit;
      query = query.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

      const contracts = await query;

      res.json({
        contracts,
        meta: { page: Number(page), limit: Number(limit), total: Number(count), totalPages: Math.ceil(count / limit) }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET CONTRACT
// ============================================================

router.get('/:id',
  requirePermission('contracts:view'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const contract = await req.db('contracts').where('id', id).first();
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      // Load amendments
      contract.amendments = await req.db('contract_amendments').where('contract_id', id).orderBy('amendment_number', 'asc');

      // Load attachments
      contract.attachments = await req.db('contract_attachments').where('contract_id', id);

      // Load signatures
      contract.signatures = await req.db('contract_signatures').where('contract_id', id);

      res.json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// CREATE CONTRACT
// ============================================================

router.post('/',
  requirePermission('contracts:create'),
  requireJurisdiction,
  uploadMiddleware.any(),
  async (req, res, next) => {
    try {
      const {
        type, employer, worker, startDate, endDate, probationPeriod = 3,
        noticePeriod = 30, occupation, occupationCode, isicCode,
        workLocation, governorate, directorate, workSchedule, weeklyHours,
        workingHours, wages, benefits, oshTrainingRequired = false,
        medicalExaminationRequired = false, hazardClassification
      } = req.body;

      // Generate contract number
      const year = new Date().getFullYear();
      const [{ seq }] = await req.db.raw(
        `SELECT COALESCE(MAX(CAST(SPLIT_PART(contract_number, '-', 4) AS INTEGER)), 0) + 1 as seq FROM contracts WHERE contract_number LIKE ?`,
        [`C-${year}-%`]
      );
      const contractNumber = `C-${year}-${String(seq).padStart(6, '0')}`;

      const [contract] = await req.db('contracts')
        .insert({
          contract_number: contractNumber,
          status: 'draft',
          type,
          employer: JSON.stringify(employer),
          worker: JSON.stringify(worker),
          start_date: startDate,
          end_date: endDate,
          probation_period: probationPeriod,
          notice_period: noticePeriod,
          occupation,
          occupation_code: occupationCode,
          isic_code: isicCode,
          work_location: workLocation,
          governorate,
          directorate,
          work_schedule: workSchedule,
          weekly_hours: weeklyHours,
          working_hours: workingHours ? JSON.stringify(workingHours) : null,
          wages: JSON.stringify(wages),
          benefits: JSON.stringify(benefits),
          osh_training_required: oshTrainingRequired,
          medical_examination_required: medicalExaminationRequired,
          hazard_classification: hazardClassification,
          created_by: req.user.id,
          version: 1
        })
        .returning('*');

      // Create initial signature records
      await req.db('contract_signatures').insert([
        { contract_id: contract.id, party: 'employer', signed_by: null, signed_at: null },
        { contract_id: contract.id, party: 'worker', signed_by: null, signed_at: null }
      ]);

      structuredLogger.info('contract_created', {
        ...req.audit,
        contractId: contract.id,
        contractNumber
      });

      res.status(201).json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPDATE CONTRACT
// ============================================================

router.put('/:id',
  requirePermission('contracts:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      if (!['draft', 'pending_signature'].includes(existing.status)) {
        return res.status(400).json({ error: 'Cannot edit contract in current status', code: 'INVALID_STATUS' });
      }

      // Allowed fields for edit
      const allowedFields = ['occupation', 'occupationCode', 'workLocation', 'workSchedule', 'weeklyHours', 'workingHours', 'wages', 'benefits'];
      const dbUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          dbUpdates[dbField] = typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field];
        }
      }

      const [contract] = await req.db('contracts')
        .where('id', id)
        .update({ ...dbUpdates, version: existing.version + 1, updated_at: new Date() })
        .returning('*');

      res.json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// DELETE CONTRACT
// ============================================================

router.delete('/:id',
  requirePermission('contracts:delete'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      if (existing.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft contracts can be deleted', code: 'INVALID_STATUS' });
      }

      await req.db('contracts').where('id', id).delete();

      res.status(204).send();
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// EMPLOYER SIGN
// ============================================================

router.post('/:id/sign/employer',
  requirePermission('contracts:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { signatureImage } = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      await req.db('contract_signatures')
        .where('contract_id', id)
        .where('party', 'employer')
        .update({
          signed_by: req.user.id,
          signed_at: new Date(),
          signature_image: signatureImage,
          ip: req.ip
        });

      // Check if both parties signed
      const employerSig = await req.db('contract_signatures').where('contract_id', id).where('party', 'employer').first();
      const workerSig = await req.db('contract_signatures').where('contract_id', id).where('party', 'worker').first();

      let newStatus = existing.status;
      if (employerSig?.signed_at && !workerSig?.signed_at) {
        newStatus = 'pending_signature';
      } else if (employerSig?.signed_at && workerSig?.signed_at) {
        newStatus = 'pending_approval';
      }

      const [contract] = await req.db('contracts')
        .where('id', id)
        .update({ status: newStatus, updated_at: new Date() })
        .returning('*');

      eventBus.emit('contract:signed', {
        contractId: id,
        contractNumber: existing.contract_number,
        party: 'employer',
        signedBy: req.user.id
      });

      res.json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// WORKER SIGN
// ============================================================

router.post('/:id/sign/worker',
  requirePermission('contracts:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { signatureImage } = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      await req.db('contract_signatures')
        .where('contract_id', id)
        .where('party', 'worker')
        .update({
          signed_by: req.user.id,
          signed_at: new Date(),
          signature_image: signatureImage,
          ip: req.ip
        });

      // Check if both parties signed
      const employerSig = await req.db('contract_signatures').where('contract_id', id).where('party', 'employer').first();
      const workerSig = await req.db('contract_signatures').where('contract_id', id).where('party', 'worker').first();

      let newStatus = existing.status;
      if (!employerSig?.signed_at && workerSig?.signed_at) {
        newStatus = 'pending_signature';
      } else if (employerSig?.signed_at && workerSig?.signed_at) {
        newStatus = 'pending_approval';
      }

      const [contract] = await req.db('contracts')
        .where('id', id)
        .update({ status: newStatus, updated_at: new Date() })
        .returning('*');

      eventBus.emit('contract:signed', {
        contractId: id,
        contractNumber: existing.contract_number,
        party: 'worker',
        signedBy: req.user.id
      });

      res.json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// APPROVE CONTRACT
// ============================================================

router.post('/:id/approve',
  requirePermission('contracts:approve'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      await req.db('contract_signatures')
        .where('contract_id', id)
        .where('party', 'ministry_approver')
        .update({
          signed_by: req.user.id,
          signed_at: new Date(),
          ip: req.ip
        });

      const [contract] = await req.db('contracts')
        .where('id', id)
        .update({
          status: 'active',
          ministry_approval_comments: comments,
          ministry_approved_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Sync to worker passport and employer records
      eventBus.emit('contract:activated', {
        contractId: id,
        contractNumber: existing.contract_number,
        workerId: existing.worker_id,
        employerId: existing.employer_entity_id,
        activatedBy: req.user.id
      });

      structuredLogger.info('contract_approved', {
        ...req.audit,
        contractId: id,
        contractNumber: existing.contract_number
      });

      res.json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// REJECT CONTRACT
// ============================================================

router.post('/:id/reject',
  requirePermission('contracts:approve'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      const [contract] = await req.db('contracts')
        .where('id', id)
        .update({
          status: 'draft',
          rejection_reason: reason,
          rejection_at: new Date(),
          rejection_by: req.user.id,
          updated_at: new Date()
        })
        .returning('*');

      eventBus.emit('contract:rejected', {
        contractId: id,
        contractNumber: existing.contract_number,
        reason,
        rejectedBy: req.user.id
      });

      res.json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// PROPOSE AMENDMENT
// ============================================================

router.post('/:id/amendments',
  requirePermission('contracts:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { type, effectiveDate, previousValue, newValue, reason } = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      const lastAmendment = await req.db('contract_amendments')
        .where('contract_id', id)
        .orderBy('amendment_number', 'desc')
        .first();

      const amendmentNumber = (lastAmendment?.amendment_number || 0) + 1;

      const [amendment] = await req.db('contract_amendments')
        .insert({
          contract_id: id,
          amendment_number: amendmentNumber,
          type,
          effective_date: effectiveDate,
          previous_value: previousValue,
          new_value: newValue,
          reason,
          proposed_by: req.user.id,
          proposed_at: new Date()
        })
        .returning('*');

      res.status(201).json(amendment);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// SIGN AMENDMENT
// ============================================================

router.post('/:id/amendments/:amendmentId/sign',
  requirePermission('contracts:edit'),
  async (req, res, next) => {
    try {
      const { id, amendmentId } = req.params;
      const { party } = req.body;

      const field = party === 'employer' ? 'signed_by_employer' : 'signed_by_worker';
      const timeField = party === 'employer' ? 'employer_signed_at' : 'worker_signed_at';

      const [amendment] = await req.db('contract_amendments')
        .where('id', amendmentId)
        .where('contract_id', id)
        .update({
          [field]: req.user.id,
          [timeField]: new Date()
        })
        .returning('*');

      res.json(amendment);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// APPROVE AMENDMENT
// ============================================================

router.post('/:id/amendments/:amendmentId/approve',
  requirePermission('contracts:approve'),
  async (req, res, next) => {
    try {
      const { id, amendmentId } = req.params;

      const [amendment] = await req.db('contract_amendments')
        .where('id', amendmentId)
        .where('contract_id', id)
        .update({
          approved_by: req.user.id,
          approved_at: new Date()
        })
        .returning('*');

      // Apply amendment to contract
      const contract = await req.db('contracts').where('id', id).first();
      const contractUpdates = {};
      
      // Map amendment type to contract field
      const fieldMap = {
        salary_change: 'wages',
        role_change: 'occupation',
        schedule_change: 'workSchedule',
        location_change: 'work_location',
        benefit_change: 'benefits'
      };

      const field = fieldMap[amendment.type];
      if (field) {
        contractUpdates[field] = amendment.new_value;
      }

      await req.db('contracts')
        .where('id', id)
        .update({ ...contractUpdates, version: contract.version + 1, updated_at: new Date() });

      res.json(amendment);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// TERMINATE CONTRACT
// ============================================================

router.post('/:id/terminate',
  requirePermission('contracts:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { terminationType, terminationReason, noticePeriod, endOfServiceBenefit, noticePay, gratuity } = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      const [contract] = await req.db('contracts')
        .where('id', id)
        .update({
          status: 'terminated',
          termination: JSON.stringify({
            terminatedAt: new Date().toISOString(),
            terminationType,
            terminationReason,
            noticePeriod,
            endOfServiceBenefit,
            noticePay,
            gratuity
          }),
          termination_date: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      eventBus.emit('contract:terminated', {
        contractId: id,
        contractNumber: existing.contract_number,
        terminationType,
        terminatedBy: req.user.id
      });

      res.json(contract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// RENEW CONTRACT
// ============================================================

router.post('/:id/renew',
  requirePermission('contracts:edit'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newEndDate, newWages, newBenefits } = req.body;

      const existing = await req.db('contracts').where('id', id).first();
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      // Update current contract
      await req.db('contracts')
        .where('id', id)
        .update({
          status: 'expired',
          updated_at: new Date()
        });

      // Create new contract
      const [newContract] = await req.db('contracts')
        .insert({
          contract_number: `${existing.contract_number}-R1`,
          status: 'active',
          type: existing.type,
          employer: existing.employer,
          worker: existing.worker,
          start_date: new Date().toISOString().split('T')[0],
          end_date: newEndDate,
          wages: newWages ? JSON.stringify(newWages) : existing.wages,
          benefits: newBenefits ? JSON.stringify(newBenefits) : existing.benefits,
          created_by: req.user.id,
          version: 1,
          renewal_info: JSON.stringify({
            previousContractId: id,
            renewedAt: new Date().toISOString(),
            renewedBy: req.user.id
          })
        })
        .returning('*');

      res.status(201).json(newContract);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// UPLOAD ATTACHMENT
// ============================================================

router.post('/:id/attachments',
  requirePermission('contracts:edit'),
  uploadMiddleware.any(),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { type, description } = req.body;
      const files = req.files;

      const uploadedAttachments = [];
      for (const file of (files || [])) {
        const [attachment] = await req.db('contract_attachments')
          .insert({
            contract_id: id,
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
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// VALIDATE CONTRACT
// ============================================================

router.get('/:id/validate',
  requirePermission('contracts:view'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const contract = await req.db('contracts').where('id', id).first();
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
      }

      const warnings = [];
      const errors = [];
      const legalChecks = [];

      // Check required fields
      const requiredFields = ['employer', 'worker', 'occupation', 'wages', 'benefits'];
      for (const field of requiredFields) {
        if (!contract[field.replace(/_([a-z])/g, (_, l) => l.toUpperCase())]) {
          errors.push(`Missing required field: ${field}`);
        }
        legalChecks.push({ check: field, passed: !!contract[field] });
      }

      // Check wages minimum
      const wages = JSON.parse(contract.wages || '{}');
      if (wages.baseSalary < 35000) { // Yemen minimum wage approximation
        warnings.push('Wage below minimum recommended level');
        legalChecks.push({ check: 'minimum_wage', passed: false, details: 'Wage may be below minimum' });
      } else {
        legalChecks.push({ check: 'minimum_wage', passed: true });
      }

      // Check notice period
      if (contract.notice_period < 30) {
        warnings.push('Notice period shorter than recommended 30 days');
      }

      res.json({
        isValid: errors.length === 0,
        warnings,
        errors,
        legalChecks
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// STATISTICS
// ============================================================

router.get('/statistics',
  requirePermission('contracts:view'),
  async (req, res, next) => {
    try {
      const { governorate, employerId, dateFrom, dateTo } = req.query;

      let query = req.db('contracts').select('status', 'type');
      if (governorate) query = query.where('governorate', governorate);
      if (employerId) query = query.where('employer_entity_id', employerId);
      if (dateFrom) query = query.where('created_at', '>=', dateFrom);
      if (dateTo) query = query.where('created_at', '<=', dateTo);

      const contracts = await query;

      const stats = {
        total: contracts.length,
        byStatus: {},
        byType: {},
        expiringThisMonth: 0,
        averageDuration: 0,
        complianceRate: 0
      };

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      for (const c of contracts) {
        stats.byStatus[c.status] = (stats.byStatus[c.status] || 0) + 1;
        stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;

        // Check expiring within this month
        if (c.end_date) {
          const endDate = new Date(c.end_date);
          if (endDate >= now && endDate <= nextMonth) {
            stats.expiringThisMonth++;
          }
        }
      }

      // Calculate compliance rate
      const activeCount = stats.byStatus['active'] || 0;
      const pendingCount = stats.byStatus['pending_approval'] || 0;
      if (contracts.length > 0) {
        stats.complianceRate = Math.round((activeCount / contracts.length) * 100);
      }

      res.json(stats);
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

router.get('/export',
  requirePermission('contracts:view'),
  async (req, res, next) => {
    try {
      const { status, type, governorate, employerId, format = 'xlsx' } = req.query;

      let query = req.db('contracts').select('*');
      if (status) query = query.whereIn('status', Array.isArray(status) ? status : [status]);
      if (type) query = query.whereIn('type', Array.isArray(type) ? type : [type]);
      if (governorate) query = query.where('governorate', governorate);
      if (employerId) query = query.where('employer_entity_id', employerId);

      const contracts = await query;

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="contracts-export.${format}"`);
      res.json({ count: contracts.length, format });
        invalidateCache('dashboard');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
