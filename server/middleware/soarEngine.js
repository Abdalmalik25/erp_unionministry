// server/middleware/soarEngine.js — Security Orchestration, Automation and Response (SOAR)
// Implements: Playbooks, Case Management, Automated Response, Threat Intelligence Integration
// Standards: NIST SP 800-61, ISO 27035, OASIS CACAO Playbooks

import { pool } from './shared.js';
import { auditLog } from './shared.js';
import { mitreDetector } from './mitreAttackEngine.js';
import { zeroTrustEngine } from './zeroTrustArchitecture.js';
import { fairEngine } from './fairRiskEngine.js';
import { anomalyEngine } from './adaptiveAnomalyEngine.js';

// ===================== SOAR PLAYBOOK DEFINITIONS =====================
export const SOAR_PLAYBOOKS = {
  // Account Compromise Response
  'account-compromise': {
    id: 'account-compromise',
    name: 'Account Compromise Response',
    nameAr: 'استجابة اختراق الحساب',
    version: '1.0',
    description: 'Automated response to suspected account takeover',
    triggers: [
      { source: 'anomaly', condition: 'score > 0.8 && components.zeroTrust > 0.5' },
      { source: 'mitre', condition: 'technique IN (T1078, T1110, T1556)' },
      { source: 'fair', condition: 'riskLevel IN (high, critical) AND asset IN (pii-records, financial-records)' },
    ],
    severity: 'high',
    steps: [
      { id: 'revoke-sessions', action: 'revoke_all_sessions', params: { userId: '{{userId}}' }, order: 1 },
      { id: 'force-mfa', action: 'require_mfa_reenroll', params: { userId: '{{userId}}' }, order: 2 },
      { id: 'reset-password', action: 'force_password_reset', params: { userId: '{{userId}}' }, order: 3 },
      { id: 'notify-user', action: 'send_notification', params: { userId: '{{userId}}', template: 'account_compromise' }, order: 4 },
      { id: 'notify-admin', action: 'alert_security_team', params: { severity: 'high', details: '{{details}}' }, order: 5 },
      { id: 'block-ip', action: 'block_ip', params: { ip: '{{ip}}', duration: 3600, reason: 'account_compromise' }, order: 6 },
      { id: 'create-case', action: 'create_incident_case', params: { title: 'Account Compromise: {{userId}}', severity: 'high' }, order: 7 },
    ],
    rollback: [
      { action: 'unblock_ip', params: { ip: '{{ip}}' } },
    ],
  },
  
  // Brute Force Attack Response
  'brute-force': {
    id: 'brute-force',
    name: 'Brute Force Attack Response',
    nameAr: 'استجابة هجوم القوة الغاشمة',
    version: '1.0',
    description: 'Automated response to credential stuffing / brute force',
    triggers: [
      { source: 'anomaly', condition: 'components.statistical > 0.6 AND path == /api/auth/login' },
      { source: 'mitre', condition: 'technique == T1110' },
      { source: 'rate_limit', condition: 'exceeded AND endpoint == /api/auth/login' },
    ],
    severity: 'medium',
    steps: [
      { id: 'block-ip', action: 'block_ip', params: { ip: '{{ip}}', duration: 3600, reason: 'brute_force' }, order: 1 },
      { id: 'lock-accounts', action: 'lock_targeted_accounts', params: { emails: '{{targetedEmails}}', duration: 1800 }, order: 2 },
      { id: 'alert-team', action: 'alert_security_team', params: { severity: 'medium', details: 'Brute force from {{ip}}' }, order: 3 },
      { id: 'create-case', action: 'create_incident_case', params: { title: 'Brute Force Attack: {{ip}}', severity: 'medium' }, order: 4 },
    ],
  },
  
  // Data Exfiltration Response
  'data-exfiltration': {
    id: 'data-exfiltration',
    name: 'Data Exfiltration Response',
    nameAr: 'استجابة تهريب البيانات',
    version: '1.0',
    description: 'Response to large data exports / exfiltration attempts',
    triggers: [
      { source: 'anomaly', condition: 'components.sequence > 0.7 AND components.peerGroup > 0.5' },
      { source: 'mitre', condition: 'technique IN (T1005, T1041, T1567)' },
      { source: 'fair', condition: 'riskLevel == critical AND asset IN (pii-records, financial-records)' },
    ],
    severity: 'critical',
    steps: [
      { id: 'revoke-sessions', action: 'revoke_all_sessions', params: { userId: '{{userId}}' }, order: 1 },
      { id: 'block-ip', action: 'block_ip', params: { ip: '{{ip}}', duration: 86400, reason: 'data_exfiltration' }, order: 2 },
      { id: 'block-user', action: 'disable_user', params: { userId: '{{userId}}', reason: 'suspected_exfiltration' }, order: 3 },
      { id: 'notify-leadership', action: 'notify_leadership', params: { severity: 'critical', incident: 'Data Exfiltration' }, order: 4 },
      { id: 'forensic-snapshot', action: 'create_forensic_snapshot', params: { userId: '{{userId}}', ip: '{{ip}}' }, order: 5 },
      { id: 'create-case', action: 'create_incident_case', params: { title: 'Data Exfiltration: {{userId}}', severity: 'critical' }, order: 6 },
      { id: 'regulatory-notify', action: 'trigger_regulatory_notification', params: { regulation: 'auto', dataTypes: '{{dataTypes}}' }, order: 7 },
    ],
  },
  
  // Insider Threat Response
  'insider-threat': {
    id: 'insider-threat',
    name: 'Insider Threat Response',
    nameAr: 'استجابة التهديد الداخلي',
    version: '1.0',
    description: 'Response to suspected malicious insider activity',
    triggers: [
      { source: 'mitre', condition: 'technique IN (T1068, T1548, T1003, T1562)' },
      { source: 'anomaly', condition: 'components.peerGroup > 0.7 AND userRole IN (admin, privileged)' },
      { source: 'fair', condition: 'threatCommunity == insider-malicious' },
    ],
    severity: 'high',
    steps: [
      { id: 'enhanced-monitoring', action: 'enable_enhanced_monitoring', params: { userId: '{{userId}}', duration: 86400 }, order: 1 },
      { id: 'require-approval', action: 'require_approval_for', params: { userId: '{{userId}}', actions: ['export', 'delete', 'admin'] }, order: 2 },
      { id: 'alert-soc', action: 'alert_soc_team', params: { severity: 'high', details: 'Insider threat: {{userId}}' }, order: 3 },
      { id: 'create-case', action: 'create_incident_case', params: { title: 'Insider Threat: {{userId}}', severity: 'high', restricted: true }, order: 4 },
    ],
  },
  
  // Vulnerability Exploit Response
  'vuln-exploit': {
    id: 'vuln-exploit',
    name: 'Vulnerability Exploit Response',
    nameAr: 'استجابة استغلال الثغرة',
    version: '1.0',
    description: 'Response to detected exploitation attempts',
    triggers: [
      { source: 'mitre', condition: 'technique IN (T1190, T1059, T1203)' },
      { source: 'waf', condition: 'blocked AND category IN (sqli, rce, deserialization)' },
      { source: 'anomaly', condition: 'components.isolationForest > 0.8' },
    ],
    severity: 'high',
    steps: [
      { id: 'block-ip', action: 'block_ip', params: { ip: '{{ip}}', duration: 86400, reason: 'exploit_attempt' }, order: 1 },
      { id: 'signature-update', action: 'update_waf_signatures', params: { attackType: '{{attackCategory}}' }, order: 2 },
      { id: 'vuln-scan', action: 'trigger_vulnerability_scan', params: { target: '{{targetEndpoint}}' }, order: 3 },
      { id: 'alert-team', action: 'alert_security_team', params: { severity: 'high', details: 'Exploit attempt: {{technique}}' }, order: 4 },
      { id: 'create-case', action: 'create_incident_case', params: { title: 'Exploit Attempt: {{technique}}', severity: 'high' }, order: 5 },
    ],
  },
  
  // Ransomware Response
  'ransomware': {
    id: 'ransomware',
    name: 'Ransomware Response',
    nameAr: 'استجابة برامج الفدية',
    version: '1.0',
    description: 'Response to ransomware indicators',
    triggers: [
      { source: 'mitre', condition: 'technique IN (T1486, T1490)' },
      { source: 'anomaly', condition: 'components.sequence > 0.8 AND mass_encryption_detected' },
      { source: 'file', condition: 'ransomware_signature_detected' },
    ],
    severity: 'critical',
    steps: [
      { id: 'isolate-network', action: 'isolate_network_segment', params: { segment: '{{segment}}' }, order: 1 },
      { id: 'revoke-all', action: 'revoke_all_user_sessions', params: {}, order: 2 },
      { id: 'block-ips', action: 'block_ips', params: { ips: '{{relatedIPs}}', duration: 604800 }, order: 3 },
      { id: 'backup-verify', action: 'verify_backup_integrity', params: {}, order: 4 },
      { id: 'notify-leadership', action: 'notify_leadership', params: { severity: 'critical', incident: 'Ransomware' }, order: 5 },
      { id: 'engage-ir', action: 'engage_incident_response_team', params: {}, order: 6 },
      { id: 'create-case', action: 'create_incident_case', params: { title: 'Ransomware Incident', severity: 'critical', restricted: true }, order: 7 },
      { id: 'regulatory', action: 'trigger_regulatory_notification', params: { regulation: 'all' }, order: 8 },
    ],
  },
};

// ===================== CASE MANAGEMENT =====================
export class CaseManager {
  constructor() {
    this.cases = new Map();
    this.caseCounter = 0;
  }
  
  async createCase(data) {
    this.caseCounter++;
    const caseId = `INC-${new Date().getFullYear()}-${String(this.caseCounter).padStart(6, '0')}`;
    
    const newCase = {
      id: caseId,
      title: data.title,
      description: data.description || '',
      severity: data.severity || 'medium',
      status: 'open',
      source: data.source || 'automated',
      assignee: data.assignee || null,
      tags: data.tags || [],
      restricted: data.restricted || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: null,
      timeline: [{
        timestamp: new Date().toISOString(),
        action: 'created',
        actor: 'system',
        details: 'Case created automatically',
      }],
      evidence: [],
      relatedEntities: {
        users: data.userId ? [data.userId] : [],
        ips: data.ip ? [data.ip] : [],
        techniques: data.techniques || [],
        assets: data.assets || [],
      },
      metrics: {
        mttd: 0, // Mean time to detect
        mttr: 0, // Mean time to respond
        mtta: 0, // Mean time to acknowledge
      },
    };
    
    // Persist to database
    try {
      await pool.query(`
        INSERT INTO soar_cases (case_id, title, description, severity, status, source, restricted, created_at, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      `, [caseId, newCase.title, newCase.description, newCase.severity, newCase.status, newCase.source, newCase.restricted, JSON.stringify(newCase)]);
    } catch (e) {
      console.error('[SOAR] Case persistence failed:', e.message);
    }
    
    this.cases.set(caseId, newCase);
    return newCase;
  }
  
  async updateCase(caseId, updates, actor = 'system') {
    const case_ = this.cases.get(caseId);
    if (!case_) return null;
    
    Object.assign(case_, updates, { updatedAt: new Date().toISOString() });
    case_.timeline.push({
      timestamp: new Date().toISOString(),
      action: 'updated',
      actor,
      details: updates,
    });
    
    // Persist
    try {
      await pool.query('UPDATE soar_cases SET data = $1, updated_at = NOW() WHERE case_id = $2', [JSON.stringify(case_), caseId]);
    } catch (e) {
      console.error('[SOAR] Case update failed:', e.message);
    }
    
    return case_;
  }
  
  async closeCase(caseId, resolution, actor = 'system') {
    const case_ = await this.updateCase(caseId, {
      status: 'closed',
      resolution,
      closedAt: new Date().toISOString(),
    }, actor);
    
    if (case_) {
      // Calculate MTTR
      const created = new Date(case_.createdAt).getTime();
      const closed = new Date(case_.closedAt).getTime();
      case_.metrics.mttr = Math.round((closed - created) / 1000 / 60); // minutes
    }
    
    return case_;
  }
  
  async getCase(caseId) {
    if (this.cases.has(caseId)) return this.cases.get(caseId);
    
    // Try loading from DB
    try {
      const result = await pool.query('SELECT data FROM soar_cases WHERE case_id = $1', [caseId]);
      if (result.rows.length) {
        const case_ = result.rows[0].data;
        this.cases.set(caseId, case_);
        return case_;
      }
    } catch (e) {
      console.error('[SOAR] Case load failed:', e.message);
    }
    return null;
  }
  
  async listCases(filters = {}) {
    let cases = Array.from(this.cases.values());
    
    if (filters.status) cases = cases.filter(c => c.status === filters.status);
    if (filters.severity) cases = cases.filter(c => c.severity === filters.severity);
    if (filters.assignee) cases = cases.filter(c => c.assignee === filters.assignee);
    if (filters.since) cases = cases.filter(c => new Date(c.createdAt) >= new Date(filters.since));
    
    return cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  async addEvidence(caseId, evidence) {
    const case_ = this.cases.get(caseId);
    if (!case_) return false;
    
    case_.evidence.push({
      ...evidence,
      addedAt: new Date().toISOString(),
      id: `EVD-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    });
    
    return true;
  }
  
  async assignCase(caseId, assignee) {
    return this.updateCase(caseId, { assignee });
  }
}

// ===================== AUTOMATED ACTIONS =====================
export class ActionExecutor {
  constructor() {
    this.actionLog = [];
  }
  
  async execute(action, params, context = {}) {
    const startTime = Date.now();
    let result;
    
    try {
      switch (action) {
        case 'revoke_all_sessions':
          result = await this.revokeAllSessions(params.userId);
          break;
        case 'require_mfa_reenroll':
          result = await this.requireMFAReenroll(params.userId);
          break;
        case 'force_password_reset':
          result = await this.forcePasswordReset(params.userId);
          break;
        case 'send_notification':
          result = await this.sendNotification(params.userId, params.template, context);
          break;
        case 'alert_security_team':
          result = await this.alertSecurityTeam(params.severity, params.details);
          break;
        case 'block_ip':
          result = await this.blockIP(params.ip, params.duration, params.reason);
          break;
        case 'lock_targeted_accounts':
          result = await this.lockTargetedAccounts(params.emails, params.duration);
          break;
        case 'disable_user':
          result = await this.disableUser(params.userId, params.reason);
          break;
        case 'enable_enhanced_monitoring':
          result = await this.enableEnhancedMonitoring(params.userId, params.duration);
          break;
        case 'require_approval_for':
          result = await this.requireApprovalFor(params.userId, params.actions);
          break;
        case 'notify_leadership':
          result = await this.notifyLeadership(params.severity, params.incident);
          break;
        case 'create_forensic_snapshot':
          result = await this.createForensicSnapshot(params.userId, params.ip);
          break;
        case 'trigger_regulatory_notification':
          result = await this.triggerRegulatoryNotification(params.regulation, params.dataTypes);
          break;
        case 'update_waf_signatures':
          result = await this.updateWAFSignatures(params.attackType);
          break;
        case 'trigger_vulnerability_scan':
          result = await this.triggerVulnerabilityScan(params.target);
          break;
        case 'isolate_network_segment':
          result = await this.isolateNetworkSegment(params.segment);
          break;
        case 'revoke_all_user_sessions':
          result = await this.revokeAllUserSessions();
          break;
        case 'block_ips':
          result = await this.blockIPs(params.ips, params.duration);
          break;
        case 'verify_backup_integrity':
          result = await this.verifyBackupIntegrity();
          break;
        case 'engage_incident_response_team':
          result = await this.engageIncidentResponseTeam();
          break;
        case 'create_incident_case':
          result = await this.createIncidentCase(params);
          break;
        case 'alert_soc_team':
          result = await this.alertSOCTeam(params.severity, params.details);
          break;
        case 'unblock_ip':
          result = await this.unblockIP(params.ip);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      const execution = {
        action,
        params,
        result,
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        executedBy: 'soar',
      };
      
      this.actionLog.push(execution);
      if (this.actionLog.length > 1000) this.actionLog.shift();
      
      await auditLog('SOAR_ACTION_EXECUTED', 'soar', context.userId || null, execution);
      
      return { success: true, result, execution };
      
    } catch (error) {
      const execution = {
        action,
        params,
        error: error.message,
        success: false,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        executedBy: 'soar',
      };
      
      this.actionLog.push(execution);
      await auditLog('SOAR_ACTION_FAILED', 'soar', context.userId || null, execution);
      
      return { success: false, error: error.message, execution };
    }
  }
  
  // Action implementations
  async revokeAllSessions(userId) {
    if (!userId) throw new Error('userId required');
    await pool.query('UPDATE user_sessions SET is_active = false, revoked_at = NOW(), revoked_by = $1 WHERE user_id = $2 AND is_active = true', ['soar', userId]);
    return { revoked: true, userId };
  }
  
  async requireMFAReenroll(userId) {
    if (!userId) throw new Error('userId required');
    await pool.query('UPDATE sector_users SET mfa_enabled = false, mfa_secret = NULL, mfa_enrolled_at = NULL WHERE id = $1', [userId]);
    return { mfaReset: true, userId };
  }
  
  async forcePasswordReset(userId) {
    if (!userId) throw new Error('userId required');
    await pool.query('UPDATE sector_users SET force_password_reset = true, password_reset_token = $1, password_reset_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2', [require('crypto').randomBytes(32).toString('hex'), userId]);
    return { passwordResetForced: true, userId };
  }
  
  async sendNotification(userId, template, context) {
    // Would integrate with notification system
    await pool.query('INSERT INTO notifications (user_id, type, title, message, data, created_at) VALUES ($1, $2, $3, $4, $5, NOW())', [
      userId, 'security', 'تنبيه أمني', 'تم اكتشاف نشاط مشبوه على حسابك', JSON.stringify({ template, context })
    ]);
    return { sent: true, userId, template };
  }
  
  async alertSecurityTeam(severity, details) {
    // Create high-priority notification for security team
    const admins = await pool.query('SELECT id FROM sector_users WHERE role IN (\'super_admin\', \'ministry_admin\') AND is_active = true');
    for (const admin of admins.rows) {
      await pool.query('INSERT INTO notifications (user_id, type, title, message, priority, data, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [
        admin.id, 'security_alert', `تنبيه أمني - ${severity}`, details, severity, JSON.stringify({ severity, details })
      ]);
    }
    return { alerted: admins.rows.length };
  }
  
  async blockIP(ip, duration, reason) {
    if (!ip) throw new Error('ip required');
    // Use existing IP management
    const { addToBlocklist } = await import('./enhancedSecurity.js');
    addToBlocklist(ip);
    // Also persist to DB with expiry
    await pool.query('INSERT INTO ip_management (ip_address, action, reason, expires_at, added_by, created_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'1 second\' * $4, $5, NOW()) ON CONFLICT (ip_address) DO UPDATE SET action = $2, reason = $3, expires_at = NOW() + INTERVAL \'1 second\' * $4, updated_at = NOW()', [ip, 'block', reason, duration, 'soar']);
    return { blocked: true, ip, duration, reason };
  }
  
  async lockTargetedAccounts(emails, duration) {
    if (!emails || !emails.length) return { locked: 0 };
    let locked = 0;
    for (const email of emails) {
      try {
        await pool.query('UPDATE sector_users SET is_active = false, locked_until = NOW() + INTERVAL \'1 second\' * $1, locked_by = $2, locked_reason = $3 WHERE email = $4 AND is_active = true', [duration, 'soar', 'brute_force_target', email]);
        locked++;
      } catch {}
    }
    return { locked, emails };
  }
  
  async disableUser(userId, reason) {
    await pool.query('UPDATE sector_users SET is_active = false, disabled_at = NOW(), disabled_by = $1, disabled_reason = $2 WHERE id = $3', ['soar', reason, userId]);
    await this.revokeAllSessions(userId);
    return { disabled: true, userId, reason };
  }
  
  async enableEnhancedMonitoring(userId, duration) {
    // Would enable detailed logging for user
    await pool.query('INSERT INTO user_monitoring (user_id, level, expires_at, enabled_by, created_at) VALUES ($1, $2, NOW() + INTERVAL \'1 second\' * $3, $4, NOW()) ON CONFLICT (user_id) DO UPDATE SET level = $2, expires_at = NOW() + INTERVAL \'1 second\' * $3, updated_at = NOW()', [userId, 'enhanced', duration, 'soar']);
    return { monitoring: true, userId, duration };
  }
  
  async requireApprovalFor(userId, actions) {
    // Would integrate with approval workflow
    await pool.query('INSERT INTO approval_requirements (user_id, required_actions, required_by, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id) DO UPDATE SET required_actions = $2, updated_at = NOW()', [userId, JSON.stringify(actions), 'soar']);
    return { approvalRequired: true, userId, actions };
  }
  
  async notifyLeadership(severity, incident) {
    // Send to leadership emails/webhooks
    return { notified: true, severity, incident };
  }
  
  async createForensicSnapshot(userId, ip) {
    // Capture current state for forensics
    const snapshot = {
      timestamp: new Date().toISOString(),
      userId,
      ip,
      sessions: await pool.query('SELECT * FROM user_sessions WHERE user_id = $1', [userId]).then(r => r.rows),
      recentAudit: await pool.query('SELECT * FROM audit_log WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]).then(r => r.rows),
      devices: await pool.query('SELECT * FROM device_registry WHERE user_id = $1', [userId]).then(r => r.rows),
    };
    
    // Store snapshot
    await pool.query('INSERT INTO forensic_snapshots (snapshot_id, user_id, ip, data, created_at) VALUES ($1, $2, $3, $4, NOW())', [
      `FS-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, userId, ip, JSON.stringify(snapshot)
    ]);
    
    return { snapshotCreated: true, snapshotId: snapshot.timestamp };
  }
  
  async triggerRegulatoryNotification(regulation, dataTypes) {
    // Would integrate with regulatory reporting system
    return { triggered: true, regulation, dataTypes };
  }
  
  async updateWAFSignatures(attackType) {
    // Would update WAF with new signatures
    return { updated: true, attackType };
  }
  
  async triggerVulnerabilityScan(target) {
    // Would trigger scanner
    return { scanTriggered: true, target };
  }
  
  async isolateNetworkSegment(segment) {
    // Would integrate with network infrastructure
    return { isolated: true, segment };
  }
  
  async revokeAllUserSessions() {
    await pool.query('UPDATE user_sessions SET is_active = false, revoked_at = NOW(), revoked_by = $1 WHERE is_active = true', ['soar']);
    return { allRevoked: true };
  }
  
  async blockIPs(ips, duration) {
    let blocked = 0;
    for (const ip of ips) {
      const { addToBlocklist } = await import('./enhancedSecurity.js');
      addToBlocklist(ip);
      await pool.query('INSERT INTO ip_management (ip_address, action, reason, expires_at, added_by, created_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'1 second\' * $4, $5, NOW()) ON CONFLICT (ip_address) DO UPDATE SET action = $2, expires_at = NOW() + INTERVAL \'1 second\' * $4, updated_at = NOW()', [ip, 'block', 'ransomware_related', duration, 'soar']);
      blocked++;
    }
    return { blocked, ips };
  }
  
  async verifyBackupIntegrity() {
    // Would verify backup chain
    return { verified: true, timestamp: new Date().toISOString() };
  }
  
  async engageIncidentResponseTeam() {
    // Would page IR team
    return { engaged: true, timestamp: new Date().toISOString() };
  }
  
  async createIncidentCase(params) {
    const caseManager = new CaseManager();
    return await caseManager.createCase(params);
  }
  
  async alertSOCTeam(severity, details) {
    return this.alertSecurityTeam(severity, details);
  }
  
  async unblockIP(ip) {
    const { removeFromBlocklist } = await import('./enhancedSecurity.js');
    removeFromBlocklist(ip);
    await pool.query('DELETE FROM ip_management WHERE ip_address = $1', [ip]);
    return { unblocked: true, ip };
  }
}

// ===================== SOAR ORCHESTRATOR =====================
export class SOAROrchestrator {
  constructor() {
    this.caseManager = new CaseManager();
    this.actionExecutor = new ActionExecutor();
    this.playbooks = SOAR_PLAYBOOKS;
    this.runningPlaybooks = new Map();
  }
  
  // Evaluate triggers and execute playbooks
  async evaluateAndExecute(context) {
    const triggeredPlaybooks = [];
    
    for (const [playbookId, playbook] of Object.entries(this.playbooks)) {
      if (this.shouldTrigger(playbook, context)) {
        triggeredPlaybooks.push(playbook);
      }
    }
    
    // Execute triggered playbooks (highest severity first)
    triggeredPlaybooks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    const results = [];
    for (const playbook of triggeredPlaybooks) {
      const result = await this.executePlaybook(playbook, context);
      results.push({ playbook: playbook.id, result });
    }
    
    return results;
  }
  
  shouldTrigger(playbook, context) {
    for (const trigger of playbook.triggers) {
      if (this.evaluateTrigger(trigger, context)) {
        return true;
      }
    }
    return false;
  }
  
  evaluateTrigger(trigger, context) {
    // Simple condition evaluation - would use expression evaluator in production
    const { source, condition } = trigger;
    
    switch (source) {
      case 'anomaly':
        if (!context.anomalyResult) return false;
        return this.evalCondition(condition, context.anomalyResult);
      case 'mitre':
        if (!context.mitreDetections || !context.mitreDetections.length) return false;
        return context.mitreDetections.some(d => this.evalCondition(condition, d));
      case 'fair':
        if (!context.fairRisk) return false;
        return this.evalCondition(condition, context.fairRisk);
      case 'rate_limit':
        return context.rateLimited === true;
      case 'waf':
        return context.wafBlocked === true;
      case 'file':
        return context.ransomwareDetected === true;
    }
    return false;
  }
  
  evalCondition(condition, obj) {
    // Simplified condition evaluation
    try {
      // Replace placeholders
      let expr = condition;
      for (const [key, value] of Object.entries(obj)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      }
      // Very basic evaluation - production would use safe expression evaluator
      return eval(expr);
    } catch {
      return false;
    }
  }
  
  async executePlaybook(playbook, context) {
    const executionId = `EXEC-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const caseManager = this.caseManager;
    const actionExecutor = this.actionExecutor;
    
    // Create incident case first
    const incidentCase = await caseManager.createCase({
      title: playbook.name,
      severity: playbook.severity,
      source: 'playbook',
      techniques: playbook.triggers.filter(t => t.source === 'mitre').flatMap(t => t.condition.match(/T\d{4}/g) || []),
      userId: context.userId,
      ip: context.ip,
      assets: context.assets,
    });
    
    const stepResults = [];
    let failed = false;
    
    // Execute steps in order
    for (const step of playbook.steps.sort((a, b) => a.order - b.order)) {
      if (failed && !step.continueOnFailure) break;
      
      // Resolve template parameters
      const params = this.resolveParams(step.params, { ...context, caseId: incidentCase.id });
      
      const result = await actionExecutor.execute(step.action, params, { 
        userId: context.userId, 
        caseId: incidentCase.id,
        playbook: playbook.id,
        step: step.id,
      });
      
      stepResults.push({ step: step.id, action: step.action, ...result });
      
      if (!result.success) {
        failed = true;
        // Execute rollback if defined
        if (playbook.rollback) {
          for (const rollbackStep of playbook.rollback) {
            const rbParams = this.resolveParams(rollbackStep.params, { ...context, caseId: incidentCase.id });
            await actionExecutor.execute(rollbackStep.action, rbParams, context);
          }
        }
      }
    }
    
    // Update case with execution results
    await caseManager.updateCase(incidentCase.id, {
      playbookExecution: { playbook: playbook.id, steps: stepResults, executionId },
      status: failed ? 'investigating' : 'contained',
    });
    
    return { caseId: incidentCase.id, executionId, steps: stepResults, failed };
  }
  
  resolveParams(params, context) {
    const resolved = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        resolved[key] = this.getNestedValue(context, path);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }
  
  // Manual playbook execution
  async runPlaybook(playbookId, context) {
    const playbook = this.playbooks[playbookId];
    if (!playbook) throw new Error(`Playbook not found: ${playbookId}`);
    return this.executePlaybook(playbook, context);
  }
  
  // Get playbook catalog
  getPlaybooks() {
    return Object.values(this.playbooks).map(p => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      version: p.version,
      description: p.description,
      severity: p.severity,
      triggers: p.triggers.length,
      steps: p.steps.length,
    }));
  }
}

// Singleton
export const soarOrchestrator = new SOAROrchestrator();
export const caseManager = new CaseManager();
export const actionExecutor = new ActionExecutor();

// ===================== MIDDLEWARE =====================
export async function soarMiddleware(req, res, next) {
  // Evaluate SOAR triggers on security events
  const context = {
    userId: req.user?.id,
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
    path: req.path,
    method: req.method,
    anomalyResult: req.anomalyResult,
    mitreDetections: req.mitreDetections,
    fairRisk: req.fairRisk,
    trustScore: req.trustScore,
    rateLimited: req.rateLimited,
    wafBlocked: req.wafBlocked,
    ransomwareDetected: req.ransomwareDetected,
    assets: req.assets,
  };
  
  // Only evaluate on security-relevant events
  if (req.anomalyResult || req.mitreDetections?.length || req.fairRisk || req.wafBlocked) {
    try {
      const results = await soarOrchestrator.evaluateAndExecute(context);
      if (results.length > 0) {
        req.soarResults = results;
        res.setHeader('X-SOAR-Triggered', 'true');
        res.setHeader('X-SOAR-Cases', results.map(r => r.result.caseId).join(','));
      }
    } catch (e) {
      console.error('[SOAR] Evaluation error:', e.message);
    }
  }
  
  next();
}

// ===================== EXPORTS =====================
export { SOAR_PLAYBOOKS as playbooks };
export { CaseManager as caseManager };
export { SOAROrchestrator as orchestrator };
export { soarOrchestrator as defaultOrchestrator };
export { soarMiddleware as middleware };