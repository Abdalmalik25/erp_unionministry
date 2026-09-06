// server/middleware/mitreAttackEngine.js — MITRE ATT&CK Detection Engine
// Maps observed behaviors to MITRE ATT&CK TTPs (Tactics, Techniques, Procedures)
// Enterprise Matrix v15.1 + Mobile + ICS — Real-time detection with confidence scoring

import { pool } from './shared.js';
import { auditLog } from './shared.js';

// ===================== MITRE ATT&CK TACTICS (Enterprise) =====================
export const MITRE_TACTICS = {
  TA0043: { id: 'TA0043', name: 'Reconnaissance', nameAr: 'الاستطلاع', short: 'RECON' },
  TA0042: { id: 'TA0042', name: 'Resource Development', nameAr: 'تطوير الموارد', short: 'RESDEV' },
  TA0001: { id: 'TA0001', name: 'Initial Access', nameAr: 'الوصول الأولي', short: 'INITIAL' },
  TA0002: { id: 'TA0002', name: 'Execution', nameAr: 'التنفيذ', short: 'EXEC' },
  TA0003: { id: 'TA0003', name: 'Persistence', nameAr: 'الثبات', short: 'PERSIST' },
  TA0004: { id: 'TA0004', name: 'Privilege Escalation', nameAr: 'تصعيد الصلاحيات', short: 'PRIVESC' },
  TA0005: { id: 'TA0005', name: 'Defense Evasion', nameAr: 'التهرب من الدفاع', short: 'EVASION' },
  TA0006: { id: 'TA0006', name: 'Credential Access', nameAr: 'الوصول للبيانات', short: 'CREDACCESS' },
  TA0007: { id: 'TA0007', name: 'Discovery', nameAr: 'الاكتشاف', short: 'DISCOVERY' },
  TA0008: { id: 'TA0008', name: 'Lateral Movement', nameAr: 'الحركة الجانبية', short: 'LATERAL' },
  TA0009: { id: 'TA0009', name: 'Collection', nameAr: 'التجميع', short: 'COLLECTION' },
  TA0011: { id: 'TA0011', name: 'Command and Control', nameAr: 'القيادة والتحكم', short: 'C2' },
  TA0010: { id: 'TA0010', name: 'Exfiltration', nameAr: 'التهريب', short: 'EXFIL' },
  TA0040: { id: 'TA0040', name: 'Impact', nameAr: 'التأثير', short: 'IMPACT' },
};

// ===================== KEY TECHNIQUES MAPPED TO OBSERVABLES =====================
export const TECHNIQUE_DETECTORS = {
  // RECONNAISSANCE
  'T1590': { // Active Scanning
    tactic: 'TA0043',
    name: 'Active Scanning',
    nameAr: 'المسح النشط',
    indicators: [
      { type: 'behavioral', pattern: 'path-scanning', weight: 0.8, threshold: 50 },
      { type: 'behavioral', pattern: 'endpoint-flood', weight: 0.6, threshold: 30 },
      { type: 'signature', pattern: '/api/.*/\\d+', weight: 0.4 }, // ID enumeration
    ],
    mitigation: ['Rate limiting', 'WAF rules', 'IP reputation'],
  },
  'T1595': { // Active Directory Reconnaissance (adapted for our system)
    tactic: 'TA0043',
    name: 'Active Directory Reconnaissance',
    nameAr: 'استطلاع دليل النشاط',
    indicators: [
      { type: 'query', pattern: 'SELECT.*FROM.*users|sectors|entities', weight: 0.7 },
      { type: 'endpoint', pattern: '/api/(entities|workers|members)/list', weight: 0.5 },
    ],
  },
  
  // INITIAL ACCESS
  'T1190': { // Exploit Public-Facing Application
    tactic: 'TA0001',
    name: 'Exploit Public-Facing Application',
    nameAr: 'استغلال التطبيقات العامة',
    indicators: [
      { type: 'signature', category: 'sqli', weight: 0.9 },
      { type: 'signature', category: 'rce', weight: 0.95 },
      { type: 'signature', category: 'deserialization', weight: 0.9 },
      { type: 'behavioral', pattern: 'endpoint-flood', weight: 0.4 },
    ],
    mitigation: ['WAF', 'Input validation', 'Patch management'],
  },
  'T1110': { // Brute Force
    tactic: 'TA0001',
    name: 'Brute Force',
    nameAr: 'القوة الغاشمة',
    indicators: [
      { type: 'event', pattern: 'LOGIN_FAILED', weight: 0.8, threshold: 5 },
      { type: 'event', pattern: 'MFA_INVALID', weight: 0.7, threshold: 3 },
      { type: 'behavioral', pattern: 'rapid-login', weight: 0.6 },
    ],
    mitigation: ['Account lockout', 'MFA', 'Rate limiting', 'CAPTCHA'],
  },
  'T1566': { // Phishing (credential harvesting via fake login)
    tactic: 'TA0001',
    name: 'Phishing',
    nameAr: 'التصيد الاحتيالي',
    indicators: [
      { type: 'anomaly', pattern: 'credential-reuse', weight: 0.7 },
      { type: 'geo', pattern: 'impossible-travel', weight: 0.6 },
    ],
  },
  'T1078': { // Valid Accounts (credential stuffing, account takeover)
    tactic: 'TA0001',
    name: 'Valid Accounts',
    nameAr: 'حسابات صالحة',
    indicators: [
      { type: 'anomaly', pattern: 'new-device', weight: 0.6 },
      { type: 'anomaly', pattern: 'new-country', weight: 0.7 },
      { type: 'anomaly', pattern: 'impossible-travel', weight: 0.9 },
      { type: 'behavioral', pattern: 'session-hijack', weight: 0.8 },
    ],
  },
  
  // EXECUTION
  'T1059': { // Command and Scripting Interpreter
    tactic: 'TA0002',
    name: 'Command and Scripting Interpreter',
    nameAr: 'مفسر الأوامر والنصوص',
    indicators: [
      { type: 'signature', category: 'rce', weight: 0.95 },
      { type: 'signature', pattern: '(bash|sh|cmd|powershell|python|perl)\\b', weight: 0.9 },
    ],
  },
  'T1203': { // Exploitation for Client Execution
    tactic: 'TA0002',
    name: 'Exploitation for Client Execution',
    nameAr: 'استغلال لتنفيذ العميل',
    indicators: [
      { type: 'signature', category: 'xss', weight: 0.8 },
      { type: 'signature', category: 'deserialization', weight: 0.85 },
    ],
  },
  
  // PERSISTENCE
  'T1556': { // Modify Authentication Process
    tactic: 'TA0003',
    name: 'Modify Authentication Process',
    nameAr: 'تعديل عملية المصادقة',
    indicators: [
      { type: 'event', pattern: 'MFA_DISABLE', weight: 0.8 },
      { type: 'event', pattern: 'PASSWORD_RESET', weight: 0.6 },
      { type: 'audit', pattern: 'UPDATE.*sector_users.*mfa', weight: 0.7 },
    ],
  },
  'T1505': { // Server Software Component (Web Shell)
    tactic: 'TA0003',
    name: 'Server Software Component',
    nameAr: 'مكون برمجي للخادم',
    indicators: [
      { type: 'signature', category: 'rce', weight: 0.9 },
      { type: 'file', pattern: '\\.(php|jsp|asp|aspx|php\\d?)$', weight: 0.7 },
    ],
  },
  
  // PRIVILEGE ESCALATION
  'T1068': { // Exploitation for Privilege Escalation
    tactic: 'TA0004',
    name: 'Exploitation for Privilege Escalation',
    nameAr: 'استغلال لتصعيد الصلاحيات',
    indicators: [
      { type: 'audit', pattern: 'UPDATE.*role.*super_admin|ministry_admin', weight: 0.8 },
      { type: 'audit', pattern: 'INSERT.*sector_users.*role.*admin', weight: 0.7 },
    ],
  },
  'T1548': { // Abuse Elevation Control Mechanism
    tactic: 'TA0004',
    name: 'Abuse Elevation Control Mechanism',
    nameAr: 'إساءة استخدام آلية التحكم بالتصعيد',
    indicators: [
      { type: 'audit', pattern: 'UPDATE.*permissions.*', weight: 0.7 },
      { type: 'audit', pattern: 'INSERT.*role_permissions.*', weight: 0.6 },
    ],
  },
  
  // DEFENSE EVASION
  'T1070': { // Indicator Removal
    tactic: 'TA0005',
    name: 'Indicator Removal',
    nameAr: 'إزالة المؤشرات',
    indicators: [
      { type: 'audit', pattern: 'DELETE.*audit_log|security_events|login_attempts', weight: 0.9 },
      { type: 'audit', pattern: 'UPDATE.*audit_log.*', weight: 0.95 }, // Should be impossible
    ],
  },
  'T1562': { // Impair Defenses
    tactic: 'TA0005',
    name: 'Impair Defenses',
    nameAr: 'إضعاف الدفاعات',
    indicators: [
      { type: 'audit', pattern: 'UPDATE.*system_settings.*(rate_limit|waf|block)', weight: 0.8 },
      { type: 'event', pattern: 'CONFIG_CHANGE_DISABLE_SECURITY', weight: 0.9 },
    ],
  },
  'T1027': { // Obfuscated/Stored Files
    tactic: 'TA0005',
    name: 'Obfuscated/Stored Files',
    nameAr: 'ملفات مشفرة/مخزنة',
    indicators: [
      { type: 'signature', category: 'deserialization', weight: 0.7 },
      { type: 'upload', pattern: 'double-extension|polyglot', weight: 0.8 },
    ],
  },
  
  // CREDENTIAL ACCESS
  'T1003': { // OS Credential Dumping (adapted: DB credential access)
    tactic: 'TA0006',
    name: 'Credential Dumping',
    nameAr: 'تفريغ البيانات',
    indicators: [
      { type: 'audit', pattern: 'SELECT.*password_hash|salt|mfa_secret', weight: 0.95 },
      { type: 'audit', pattern: 'SELECT.*FROM.*sector_users.*WHERE.*id.*IN', weight: 0.7 },
    ],
  },
  'T1110.004': { // Credential Stuffing
    tactic: 'TA0006',
    name: 'Credential Stuffing',
    nameAr: 'حشو البيانات',
    indicators: [
      { type: 'event', pattern: 'LOGIN_FAILED', weight: 0.7, threshold: 10 },
      { type: 'anomaly', pattern: 'multiple-emails-same-ip', weight: 0.8 },
    ],
  },
  'T1555': { // Credentials from Password Stores
    tactic: 'TA0006',
    name: 'Credentials from Password Stores',
    nameAr: 'بيانات من مخازن كلمات المرور',
    indicators: [
      { type: 'audit', pattern: 'SELECT.*FROM.*login_attempts', weight: 0.6 },
    ],
  },
  
  // DISCOVERY
  'T1087': { // Account Discovery
    tactic: 'TA0007',
    name: 'Account Discovery',
    nameAr: 'اكتشاف الحسابات',
    indicators: [
      { type: 'endpoint', pattern: '/api/(users|sector-users)/list', weight: 0.6 },
      { type: 'query', pattern: 'SELECT.*FROM.*sector_users', weight: 0.7 },
    ],
  },
  'T1083': { // File and Directory Discovery
    tactic: 'TA0007',
    name: 'File and Directory Discovery',
    nameAr: 'اكتشاف الملفات والمجلدات',
    indicators: [
      { type: 'signature', category: 'lfi', weight: 0.8 },
      { type: 'signature', category: 'pathTraversal', weight: 0.85 },
    ],
  },
  'T1018': { // Remote System Discovery
    tactic: 'TA0007',
    name: 'Remote System Discovery',
    nameAr: 'اكتشاف الأنظمة البعيدة',
    indicators: [
      { type: 'endpoint', pattern: '/api/(health|version|system/)', weight: 0.4 },
      { type: 'query', pattern: 'SELECT.*version|SELECT.*current_database', weight: 0.5 },
    ],
  },
  'T1069': { // Permission Groups Discovery
    tactic: 'TA0007',
    name: 'Permission Groups Discovery',
    nameAr: 'اكتشاف مجموعات الصلاحيات',
    indicators: [
      { type: 'endpoint', pattern: '/api/rbac|permissions|roles', weight: 0.6 },
    ],
  },
  
  // LATERAL MOVEMENT
  'T1021': { // Remote Services (session hijacking, token reuse)
    tactic: 'TA0008',
    name: 'Remote Services',
    nameAr: 'الخدمات البعيدة',
    indicators: [
      { type: 'anomaly', pattern: 'session-reuse', weight: 0.8 },
      { type: 'anomaly', pattern: 'token-replay', weight: 0.9 },
    ],
  },
  'T1550': { // Use Alternate Authentication Material
    tactic: 'TA0008',
    name: 'Use Alternate Authentication Material',
    nameAr: 'استخدام مادة مصادقة بديلة',
    indicators: [
      { type: 'anomaly', pattern: 'jwt-replay', weight: 0.85 },
      { type: 'audit', pattern: 'SELECT.*FROM.*user_sessions', weight: 0.7 },
    ],
  },
  
  // COLLECTION
  'T1005': { // Data from Local System (API data harvesting)
    tactic: 'TA0009',
    name: 'Data from Local System',
    nameAr: 'بيانات من النظام المحلي',
    indicators: [
      { type: 'behavioral', pattern: 'mass-download', weight: 0.7, threshold: 100 },
      { type: 'endpoint', pattern: '/api/(export|download|report)', weight: 0.5 },
      { type: 'audit', pattern: 'SELECT.*LIMIT\\s+(1000|5000|10000)', weight: 0.6 },
    ],
  },
  'T1530': { // Data from Cloud Storage (S3, backups)
    tactic: 'TA0009',
    name: 'Data from Cloud Storage',
    nameAr: 'بيانات من التخزين السحابي',
    indicators: [
      { type: 'audit', pattern: 'SELECT.*FROM.*backups|backup_registry', weight: 0.7 },
      { type: 'endpoint', pattern: '/api/backups/(download|list)', weight: 0.6 },
    ],
  },
  
  // COMMAND AND CONTROL
  'T1071': { // Application Layer Protocol (WebSocket, HTTP polling)
    tactic: 'TA0011',
    name: 'Application Layer Protocol',
    nameAr: 'بروتوكول طبقة التطبيق',
    indicators: [
      { type: 'behavioral', pattern: 'long-polling', weight: 0.5 },
      { type: 'behavioral', pattern: 'heartbeat-abuse', weight: 0.6 },
    ],
  },
  'T1105': { // Ingress Tool Transfer (file upload)
    tactic: 'TA0011',
    name: 'Ingress Tool Transfer',
    nameAr: 'نقل أدوات الدخول',
    indicators: [
      { type: 'upload', pattern: 'executable|script|archive', weight: 0.7 },
      { type: 'signature', category: 'rce', weight: 0.8 },
    ],
  },
  'T1573': { // Encrypted Channel (TLS to hide C2)
    tactic: 'TA0011',
    name: 'Encrypted Channel',
    nameAr: 'قناة مشفرة',
    indicators: [
      { type: 'anomaly', pattern: 'unusual-encryption', weight: 0.4 },
    ],
  },
  
  // EXFILTRATION
  'T1041': { // Exfiltration Over C2 Channel
    tactic: 'TA0010',
    name: 'Exfiltration Over C2 Channel',
    nameAr: 'التهريب عبر قناة C2',
    indicators: [
      { type: 'behavioral', pattern: 'large-upload', weight: 0.6 },
      { type: 'anomaly', pattern: 'data-hoarding', weight: 0.7 },
    ],
  },
  'T1020': { // Automated Exfiltration
    tactic: 'TA0010',
    name: 'Automated Exfiltration',
    nameAr: 'التهريب الآلي',
    indicators: [
      { type: 'behavioral', pattern: 'scheduled-export', weight: 0.7 },
      { type: 'audit', pattern: 'INSERT.*exports.*automated', weight: 0.6 },
    ],
  },
  'T1567': { // Exfiltration Over Web Service (API)
    tactic: 'TA0010',
    name: 'Exfiltration Over Web Service',
    nameAr: 'التهريب عبر خدمة الويب',
    indicators: [
      { type: 'endpoint', pattern: '/api/webhooks|integrations|callbacks', weight: 0.5 },
      { type: 'audit', pattern: 'INSERT.*external_integrations.*webhook', weight: 0.6 },
    ],
  },
  
  // IMPACT
  'T1485': { // Data Destruction
    tactic: 'TA0040',
    name: 'Data Destruction',
    nameAr: 'تدمير البيانات',
    indicators: [
      { type: 'audit', pattern: 'DELETE.*FROM.*(organizational_entities|members|workers)', weight: 0.9 },
      { type: 'event', pattern: 'MASS_DELETE', weight: 0.95 },
    ],
  },
  'T1486': { // Data Encrypted for Impact (Ransomware)
    tactic: 'TA0040',
    name: 'Data Encrypted for Impact',
    nameAr: 'تشفير البيانات للتأثير',
    indicators: [
      { type: 'audit', pattern: 'UPDATE.*SET.*encrypted.*true', weight: 0.8 },
      { type: 'event', pattern: 'RANSOMWARE_INDICATOR', weight: 0.95 },
    ],
  },
  'T1499': { // Endpoint Denial of Service
    tactic: 'TA0040',
    name: 'Endpoint Denial of Service',
    nameAr: 'حجب الخدمة عن النقاط النهائية',
    indicators: [
      { type: 'behavioral', pattern: 'endpoint-flood', weight: 0.7, threshold: 100 },
      { type: 'rate', pattern: 'RATE_LIMIT_EXCEEDED', weight: 0.6, threshold: 50 },
    ],
  },
};

// ===================== DETECTION ENGINE =====================
class MitreAttackDetector {
  constructor() {
    this.detections = new Map(); // sessionId -> { techniqueId, confidence, evidence[], firstSeen, lastSeen }
    this.attackChains = new Map(); // ip -> { techniques: Set, tactics: Set, score, startTime }
    this.confidenceThresholds = {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      critical: 0.85,
    };
  }

  // Analyze request and return detected techniques
  analyzeRequest(req, context = {}) {
    const detections = [];
    const ip = context.ip || req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const userId = context.userId || req.user?.id;
    const sessionId = context.sessionId || req.user?.sid || req.headers['x-session-id'];
    
    // 1. Signature-based detection (WAF patterns)
    const sigDetections = this.detectSignatures(req);
    detections.push(...sigDetections);
    
    // 2. Behavioral detection
    const behDetections = this.detectBehavioral(req, context);
    detections.push(...behDetections);
    
    // 3. Anomaly-based detection
    const anomDetections = this.detectAnomalies(req, context);
    detections.push(...anomDetections);
    
    // 4. Audit log analysis
    const auditDetections = this.detectFromAudit(req, context);
    detections.push(...auditDetections);
    
    // 5. Event-based detection (login failures, etc.)
    const eventDetections = this.detectFromEvents(context);
    detections.push(...eventDetections);
    
    // Aggregate by technique
    const techniqueMap = new Map();
    for (const d of detections) {
      const existing = techniqueMap.get(d.techniqueId) || { 
        techniqueId: d.techniqueId, 
        tactic: d.tactic,
        name: d.name,
        nameAr: d.nameAr,
        confidence: 0,
        evidence: [],
        indicators: [],
      };
      existing.confidence = Math.max(existing.confidence, d.confidence);
      existing.evidence.push(...d.evidence);
      existing.indicators.push(...d.indicators);
      techniqueMap.set(d.techniqueId, existing);
    }
    
    // Update attack chains
    if (ip && techniqueMap.size > 0) {
      this.updateAttackChain(ip, techniqueMap);
    }
    
    // Persist high-confidence detections
    for (const [techId, detection] of techniqueMap) {
      if (detection.confidence >= this.confidenceThresholds.medium) {
        this.persistDetection(detection, ip, userId, sessionId);
      }
    }
    
    return Array.from(techniqueMap.values())
      .filter(d => d.confidence >= this.confidenceThresholds.low)
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  detectSignatures(req) {
    const detections = [];
    const { THREAT_PATTERNS } = require('./securityHeaders.js');
    
    // Check all threat pattern categories
    const checkTarget = (val, category) => {
      if (typeof val !== 'string') return;
      const patterns = THREAT_PATTERNS[category];
      if (!patterns) return;
      for (const pattern of patterns) {
        if (pattern.test(val)) {
          // Map pattern category to MITRE techniques
          const techMap = {
            sqli: ['T1190'],
            xss: ['T1203', 'T1059'],
            rce: ['T1190', 'T1059'],
            lfi: ['T1083'],
            ssrf: ['T1018'],
            deserialization: ['T1027', 'T1203'],
            pathTraversal: ['T1083'],
            headerInjection: ['T1190'],
          };
          for (const techId of techMap[category] || []) {
            const tech = TECHNIQUE_DETECTORS[techId];
            if (tech) {
              detections.push({
                techniqueId: techId,
                tactic: tech.tactic,
                name: tech.name,
                nameAr: tech.nameAr,
                confidence: 0.85,
                evidence: [`Signature match: ${category}`, `Pattern: ${pattern.source.slice(0, 50)}`],
                indicators: ['signature', category],
              });
            }
          }
          break;
        }
      }
    };
    
    // Check query params, body, headers
    for (const [k, v] of Object.entries(req.query || {})) {
      checkTarget(k, 'pathTraversal');
      checkTarget(String(v), 'xss');
      checkTarget(String(v), 'sqli');
      checkTarget(String(v), 'lfi');
      checkTarget(String(v), 'ssrf');
    }
    
    if (req.body && typeof req.body === 'object') {
      const walk = (obj, depth = 0) => {
        if (depth > 3) return;
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === 'string') {
            for (const cat of ['xss', 'sqli', 'lfi', 'rce', 'deserialization']) {
              checkTarget(v, cat);
            }
          } else if (typeof v === 'object' && v !== null) {
            walk(v, depth + 1);
          }
        }
      };
      walk(req.body);
    }
    
    return detections;
  }
  
  detectBehavioral(req, context) {
    const detections = [];
    const ip = context.ip;
    const history = context.requestHistory || [];
    
    // Path scanning
    const uniquePaths = new Set(history.map(h => h.path));
    if (uniquePaths.size > 50) {
      detections.push({
        techniqueId: 'T1590',
        tactic: 'TA0043',
        name: TECHNIQUE_DETECTORS['T1590'].name,
        nameAr: TECHNIQUE_DETECTORS['T1590'].nameAr,
        confidence: Math.min(0.5 + uniquePaths.size / 200, 0.9),
        evidence: [`${uniquePaths.size} unique paths accessed`],
        indicators: ['behavioral', 'path-scanning'],
      });
    }
    
    // Endpoint flooding
    const endpointCounts = {};
    for (const h of history) {
      endpointCounts[h.path] = (endpointCounts[h.path] || 0) + 1;
    }
    for (const [path, count] of Object.entries(endpointCounts)) {
      if (count > 30) {
        detections.push({
          techniqueId: 'T1590',
          tactic: 'TA0043',
          name: TECHNIQUE_DETECTORS['T1590'].name,
          nameAr: TECHNIQUE_DETECTORS['T1590'].nameAr,
          confidence: Math.min(0.4 + count / 100, 0.85),
          evidence: [`Endpoint ${path} accessed ${count} times`],
          indicators: ['behavioral', 'endpoint-flood'],
        });
      }
    }
    
    // Mass data access (exfiltration prep)
    const dataEndpoints = history.filter(h => 
      h.path.includes('/export') || h.path.includes('/download') || h.path.includes('/report')
    ).length;
    if (dataEndpoints > 20) {
      detections.push({
        techniqueId: 'T1005',
        tactic: 'TA0009',
        name: TECHNIQUE_DETECTORS['T1005'].name,
        nameAr: TECHNIQUE_DETECTORS['T1005'].nameAr,
        confidence: Math.min(0.3 + dataEndpoints / 50, 0.8),
        evidence: [`${dataEndpoints} data export endpoints accessed`],
        indicators: ['behavioral', 'mass-download'],
      });
    }
    
    return detections;
  }
  
  detectAnomalies(req, context) {
    const detections = [];
    const { userId, ip, deviceFingerprint, country } = context;
    
    // Impossible travel
    if (context.impossibleTravel) {
      detections.push({
        techniqueId: 'T1078',
        tactic: 'TA0001',
        name: TECHNIQUE_DETECTORS['T1078'].name,
        nameAr: TECHNIQUE_DETECTORS['T1078'].nameAr,
        confidence: 0.9,
        evidence: [`Impossible travel: ${context.impossibleTravel}`],
        indicators: ['anomaly', 'impossible-travel'],
      });
    }
    
    // New country
    if (context.newCountry) {
      detections.push({
        techniqueId: 'T1078',
        tactic: 'TA0001',
        name: TECHNIQUE_DETECTORS['T1078'].name,
        nameAr: TECHNIQUE_DETECTORS['T1078'].nameAr,
        confidence: 0.7,
        evidence: [`Login from new country: ${country}`],
        indicators: ['anomaly', 'new-country'],
      });
    }
    
    // New device
    if (context.newDevice) {
      detections.push({
        techniqueId: 'T1078',
        tactic: 'TA0001',
        name: TECHNIQUE_DETECTORS['T1078'].name,
        nameAr: TECHNIQUE_DETECTORS['T1078'].nameAr,
        confidence: 0.6,
        evidence: ['Login from new device fingerprint'],
        indicators: ['anomaly', 'new-device'],
      });
    }
    
    // Session anomalies
    if (context.sessionAnomaly) {
      detections.push({
        techniqueId: 'T1550',
        tactic: 'TA0008',
        name: TECHNIQUE_DETECTORS['T1550'].name,
        nameAr: TECHNIQUE_DETECTORS['T1550'].nameAr,
        confidence: 0.85,
        evidence: [context.sessionAnomaly],
        indicators: ['anomaly', 'session-hijack'],
      });
    }
    
    return detections;
  }
  
  detectFromEvents(context) {
    const detections = [];
    const { recentEvents } = context;
    
    if (!recentEvents) return detections;
    
    // Brute force detection
    const failedLogins = recentEvents.filter(e => e.action === 'LOGIN_FAILED').length;
    if (failedLogins >= 5) {
      detections.push({
        techniqueId: 'T1110',
        tactic: 'TA0001',
        name: TECHNIQUE_DETECTORS['T1110'].name,
        nameAr: TECHNIQUE_DETECTORS['T1110'].nameAr,
        confidence: Math.min(0.5 + failedLogins * 0.05, 0.95),
        evidence: [`${failedLogins} failed login attempts`],
        indicators: ['event', 'brute-force'],
      });
    }
    
    // Credential stuffing (many emails from same IP)
    const uniqueEmails = new Set(recentEvents.filter(e => e.action === 'LOGIN_FAILED').map(e => e.details?.email)).size;
    if (uniqueEmails > 10) {
      detections.push({
        techniqueId: 'T1110.004',
        tactic: 'TA0006',
        name: TECHNIQUE_DETECTORS['T1110.004'].name,
        nameAr: TECHNIQUE_DETECTORS['T1110.004'].nameAr,
        confidence: Math.min(0.4 + uniqueEmails * 0.03, 0.9),
        evidence: [`${uniqueEmails} unique emails attempted from same IP`],
        indicators: ['event', 'credential-stuffing'],
      });
    }
    
    // MFA bypass attempts
    const mfaFailures = recentEvents.filter(e => e.action === 'MFA_INVALID' || e.action === 'MFA_FAILED').length;
    if (mfaFailures >= 3) {
      detections.push({
        techniqueId: 'T1110',
        tactic: 'TA0001',
        name: TECHNIQUE_DETECTORS['T1110'].name,
        nameAr: TECHNIQUE_DETECTORS['T1110'].nameAr,
        confidence: Math.min(0.6 + mfaFailures * 0.1, 0.95),
        evidence: [`${mfaFailures} MFA failures`],
        indicators: ['event', 'mfa-bypass'],
      });
    }
    
    return detections;
  }
  
  detectFromAudit(req, context) {
    const detections = [];
    // This would analyze recent audit_log entries
    // Implemented in the persistence layer
    return detections;
  }
  
  updateAttackChain(ip, techniqueMap) {
    let chain = this.attackChains.get(ip);
    if (!chain) {
      chain = { 
        techniques: new Set(), 
        tactics: new Set(), 
        score: 0, 
        startTime: Date.now(),
        detections: [],
      };
      this.attackChains.set(ip, chain);
    }
    
    for (const [techId, detection] of techniqueMap) {
      if (detection.confidence >= this.confidenceThresholds.medium) {
        chain.techniques.add(techId);
        chain.tactics.add(detection.tactic);
        chain.score += detection.confidence * 10;
        chain.detections.push({ techId, confidence: detection.confidence, time: Date.now() });
      }
    }
    
    // Clean old chains (24h)
    const now = Date.now();
    for (const [chainIp, c] of this.attackChains) {
      if (now - c.startTime > 24 * 60 * 60 * 1000) {
        this.attackChains.delete(chainIp);
      }
    }
  }
  
  async persistDetection(detection, ip, userId, sessionId) {
    try {
      await pool.query(`
        INSERT INTO mitre_attack_detections 
        (technique_id, tactic, name, name_ar, confidence, evidence, indicators, source_ip, user_id, session_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        detection.techniqueId,
        detection.tactic,
        detection.name,
        detection.nameAr,
        detection.confidence,
        JSON.stringify(detection.evidence),
        JSON.stringify(detection.indicators),
        ip,
        userId,
        sessionId,
      ]);
    } catch (e) {
      console.error('[MITRE] Persist detection failed:', e.message);
    }
  }
  
  // Get attack chain for IP
  getAttackChain(ip) {
    return this.attackChains.get(ip) || null;
  }
  
  // Get all active attack chains
  getAllAttackChains() {
    const chains = [];
    for (const [ip, chain] of this.attackChains) {
      chains.push({
        ip,
        techniques: Array.from(chain.techniques),
        tactics: Array.from(chain.tactics),
        score: Math.round(chain.score),
        detectionCount: chain.detections.length,
        duration: Date.now() - chain.startTime,
        severity: this.calculateSeverity(chain),
      });
    }
    return chains.sort((a, b) => b.score - a.score);
  }
  
  calculateSeverity(chain) {
    if (chain.score >= 100) return 'critical';
    if (chain.score >= 50) return 'high';
    if (chain.score >= 20) return 'medium';
    return 'low';
  }
  
  // Get MITRE heatmap data
  getHeatmap() {
    const heatmap = {};
    for (const [ip, chain] of this.attackChains) {
      for (const techId of chain.techniques) {
        if (!heatmap[techId]) heatmap[techId] = { count: 0, ips: new Set() };
        heatmap[techId].count++;
        heatmap[techId].ips.add(ip);
      }
    }
    const result = {};
    for (const [techId, data] of Object.entries(heatmap)) {
      const tech = TECHNIQUE_DETECTORS[techId];
      result[techId] = {
        technique: techId,
        tactic: tech?.tactic,
        name: tech?.name,
        nameAr: tech?.nameAr,
        count: data.count,
        uniqueIPs: data.ips.size,
      };
    }
    return result;
  }
  
  // Generate MITRE Navigator layer JSON
  generateNavigatorLayer() {
    const heatmap = this.getHeatmap();
    const techniques = [];
    
    for (const [techId, data] of Object.entries(heatmap)) {
      const tech = TECHNIQUE_DETECTORS[techId];
      if (!tech) continue;
      
      techniques.push({
        techniqueID: techId,
        tactic: tech.tactic.replace('TA', '').toLowerCase(),
        score: Math.min(data.count * 10, 100),
        color: this.scoreToColor(Math.min(data.count * 10, 100)),
        comment: `Detected ${data.count} times from ${data.uniqueIPs} IPs`,
        enabled: true,
        metadata: [
          { name: 'Detections', value: data.count.toString() },
          { name: 'Unique IPs', value: data.uniqueIPs.toString() },
        ],
      });
    }
    
    return {
      name: 'UnionMinistry ATT&CK Heatmap',
      version: '4.5',
      domain: 'enterprise-attack',
      description: 'Real-time MITRE ATT&CK detection heatmap from Nuclear Shield WAF',
      gradient: {
        colors: ['#ffffff', '#ffeb3b', '#ff9800', '#f44336', '#b71c1c'],
        minValue: 0,
        maxValue: 100,
      },
      techniques,
      layout: {
        layout: 'side',
        showName: true,
        showID: true,
        aggregateFunction: 'max',
      },
    };
  }
  
  scoreToColor(score) {
    if (score >= 80) return '#b71c1c';
    if (score >= 60) return '#f44336';
    if (score >= 40) return '#ff9800';
    if (score >= 20) return '#ffeb3b';
    return '#ffffff';
  }
}

// Singleton instance
export const mitreDetector = new MitreAttackDetector();

// ===================== MIDDLEWARE INTEGRATION =====================
export function mitreAttackMiddleware(req, res, next) {
  // Skip health checks
  if (req.path.startsWith('/api/health')) return next();
  
  const context = {
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
    userId: req.user?.id,
    sessionId: req.user?.sid || req.headers['x-session-id'],
    deviceFingerprint: req.headers['x-device-fingerprint'],
    country: req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'],
    // These would come from anomaly detection
    impossibleTravel: req.impossibleTravel,
    newCountry: req.newCountry,
    newDevice: req.newDevice,
    sessionAnomaly: req.sessionAnomaly,
    recentEvents: req.recentSecurityEvents,
  };
  
  const detections = mitreDetector.analyzeRequest(req, context);
  
  // Attach to request for downstream use
  req.mitreDetections = detections;
  req.mitreAttackChain = mitreDetector.getAttackChain(context.ip);
  
  // Log high-confidence detections
  for (const d of detections) {
    if (d.confidence >= 0.7) {
      console.warn('[MITRE][HIGH]', {
        technique: d.techniqueId,
        tactic: d.tactic,
        name: d.name,
        confidence: d.confidence,
        ip: context.ip,
        user: context.userId,
        path: req.path,
      });
    }
  }
  
  next();
}

// ===================== API ENDPOINTS =====================
export async function getMitreDashboard(req, res) {
  if (!req.user || !['super_admin', 'ministry_admin', 'supervisory_director'].includes(req.user.role)) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  
  try {
    const chains = mitreDetector.getAllAttackChains();
    const heatmap = mitreDetector.getHeatmap();
    const navigatorLayer = mitreDetector.generateNavigatorLayer();
    
    // Get recent detections from DB
    const recent = await pool.query(`
      SELECT technique_id, tactic, name, name_ar, confidence, evidence, source_ip, user_id, created_at
      FROM mitre_attack_detections
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY confidence DESC, created_at DESC
      LIMIT 100
    `);
    
    // Tactic summary
    const tacticSummary = {};
    for (const chain of chains) {
      for (const tactic of chain.tactics) {
        if (!tacticSummary[tactic]) tacticSummary[tactic] = { count: 0, maxSeverity: 'low' };
        tacticSummary[tactic].count++;
        if (chain.severity === 'critical') tacticSummary[tactic].maxSeverity = 'critical';
        else if (chain.severity === 'high' && tacticSummary[tactic].maxSeverity !== 'critical') tacticSummary[tactic].maxSeverity = 'high';
        else if (chain.severity === 'medium' && !['critical','high'].includes(tacticSummary[tactic].maxSeverity)) tacticSummary[tactic].maxSeverity = 'medium';
      }
    }
    
    res.json({
      summary: {
        activeChains: chains.length,
        totalTechniquesDetected: Object.keys(heatmap).length,
        criticalChains: chains.filter(c => c.severity === 'critical').length,
        highChains: chains.filter(c => c.severity === 'high').length,
        last24h: recent.rows.length,
      },
      attackChains: chains.slice(0, 20),
      heatmap,
      tacticSummary,
      recentDetections: recent.rows,
      navigatorLayer,
      tactics: MITRE_TACTICS,
    });
  } catch (e) {
    console.error('[MITRE] Dashboard error:', e.message);
    res.status(500).json({ error: 'فشل جلب لوحة MITRE' });
  }
}

export async function getMitreTechniqueDetails(req, res) {
  const { techniqueId } = req.params;
  const tech = TECHNIQUE_DETECTORS[techniqueId];
  
  if (!tech) {
    return res.status(404).json({ error: 'Technique not found' });
  }
  
  const detections = await pool.query(`
    SELECT * FROM mitre_attack_detections
    WHERE technique_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [techniqueId]);
  
  res.json({
    technique: tech,
    tactic: MITRE_TACTICS[tech.tactic],
    recentDetections: detections.rows,
    mitigation: tech.mitigation || [],
  });
}

// ===================== EXPORTS =====================
export { TECHNIQUE_DETECTORS as techniques };
export { MITRE_TACTICS as tactics };
export { mitreDetector as detector };
export { mitreAttackMiddleware as middleware };
export { getMitreDashboard as dashboard };
export { getMitreTechniqueDetails as techniqueDetails };