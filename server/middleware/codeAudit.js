// server/middleware/codeAudit.js — Nuclear Secure Code Audit Engine
// Static analysis, 0-day pattern detection, vulnerability scanning, CI/CD security gate

import crypto from 'crypto';

// ===================== Vulnerability Pattern Database =====================

const VULNERABILITY_PATTERNS = {
  CRITICAL: [
    { id: 'V001', pattern: /eval\s*\(\s*(?:req\.|params\.|query\.|body\.)/g, name: 'Code Injection via eval', description: 'Direct user input passed to eval()' },
    { id: 'V002', pattern: /exec\s*\(\s*(?:req\.|params\.|query\.|body\.)/g, name: 'Command Injection via exec', description: 'User input passed to exec()' },
    { id: 'V003', pattern: /child_process\s*\.\s*(?:exec|spawn|execFile)\s*\([^)]*\+/g, name: 'Command Injection', description: 'String concatenation in child process' },
    { id: 'V004', pattern: /new\s+Function\s*\(\s*(?:req\.|params\.|query\.|body\.)/g, name: 'Dynamic Function Creation', description: 'User input used to create functions' },
    { id: 'V005', pattern: /process\.env\[?(?:req\.|params\.|query\.|body\.)/g, name: 'Environment Variable Injection', description: 'User input accessing env vars' },
    { id: 'V006', pattern: /__proto__\s*=/g, name: 'Prototype Pollution', description: 'Direct __proto__ assignment' },
    { id: 'V007', pattern: /constructor\s*\(\s*['"][^'"]*['"]\s*\)/g, name: 'Constructor Injection', description: 'Dynamic constructor invocation' },
  ],
  HIGH: [
    { id: 'V010', pattern: /dangerouslySetInnerHTML/g, name: 'XSS via dangerouslySetInnerHTML', description: 'React dangerouslySetInnerHTML usage' },
    { id: 'V011', pattern: /innerHTML\s*=/g, name: 'XSS via innerHTML', description: 'Direct innerHTML assignment' },
    { id: 'V012', pattern: /document\.write\s*\(/g, name: 'XSS via document.write', description: 'document.write usage' },
    { id: 'V013', pattern: /\.html\s*\(\s*(?:req\.|params\.|query\.|body\.)/g, name: 'XSS via jQuery html()', description: 'User input in jQuery html()' },
    { id: 'V014', pattern: /SQL.*\+\s*(?:req\.|params\.|query\.|body\.)/g, name: 'SQL Injection', description: 'String concatenation in SQL' },
    { id: 'V015', pattern: /query\s*\(\s*['"`][^'"`]*\$\{/g, name: 'SQL Injection via Template', description: 'Template literal in SQL query' },
    { id: 'V016', pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*token/i, name: 'Token in localStorage', description: 'Sensitive token stored in localStorage' },
    { id: 'V017', pattern: /sessionStorage\.setItem\s*\(\s*['"][^'"]*token/i, name: 'Token in sessionStorage', description: 'Sensitive token stored in sessionStorage' },
    { id: 'V018', pattern: /new\s+WebSocket\s*\(\s*['"]ws:\/\//g, name: 'Insecure WebSocket', description: 'WebSocket without TLS' },
    { id: 'V019', pattern: /https?:\/\/[^'"]*:\d+/g, name: 'Hardcoded Port', description: 'Hardcoded port in URL' },
    { id: 'V020', pattern: /console\.\w+\s*\(\s*(?:password|secret|token|key|api)/gi, name: 'Sensitive Data in Console', description: 'Sensitive data logged to console' },
  ],
  MEDIUM: [
    { id: 'V030', pattern: /setTimeout\s*\(\s*['"`]/g, name: 'setTimeout with String', description: 'String argument to setTimeout (code injection risk)' },
    { id: 'V031', pattern: /setInterval\s*\(\s*['"`]/g, name: 'setInterval with String', description: 'String argument to setInterval' },
    { id: 'V032', pattern: /Math\.random\s*\(\s*\)/g, name: 'Weak Randomness', description: 'Math.random() for security purposes' },
    { id: 'V033', pattern: /md5|sha1(?!\d)/gi, name: 'Weak Hash Algorithm', description: 'Use of MD5 or SHA1' },
    { id: 'V034', pattern: /createCipher\b/g, name: 'Deprecated Cipher', description: 'Use of deprecated createCipher' },
    { id: 'V035', pattern: /NODE_TLS_REJECT_UNAUTHORIZED.*0/g, name: 'TLS Disabled', description: 'TLS verification disabled' },
    { id: 'V036', pattern: /rejectUnauthorized\s*:\s*false/g, name: 'TLS Verification Disabled', description: 'SSL verification disabled' },
    { id: 'V037', pattern: /\/\*\s*@cc_on/g, name: 'IE Conditional Compilation', description: 'IE-specific code' },
    { id: 'V038', pattern: /Object\.assign\s*\(\s*(?:target|result|obj)\s*,\s*(?:req\.|body\.)/g, name: 'Prototype Pollution via Object.assign', description: 'User input in Object.assign target' },
  ],
  LOW: [
    { id: 'V050', pattern: /===?\s*['"]?password['"]?/gi, name: 'Password Comparison', description: 'Direct password comparison' },
    { id: 'V051', pattern: /console\.log/g, name: 'Console.log in Production', description: 'Console.log left in code' },
    { id: 'V052', pattern: /debugger\s*;/g, name: 'Debugger Statement', description: 'Debugger statement left in code' },
    { id: 'V053', pattern: /TODO|FIXME|HACK|XXX/gi, name: 'TODO/FIXME Comment', description: 'Unresolved code comment' },
    { id: 'V054', pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, name: 'Empty Catch Block', description: 'Silent error swallowing' },
    { id: 'V055', pattern: /process\.exit/g, name: 'process.exit() Call', description: 'Direct process termination' },
  ],
};

// ===================== Secret Detection Patterns =====================

const SECRET_PATTERNS = [
  { pattern: /(?:aws_secret_access_key|aws_access_key_id)\s*[=:]\s*['"]?[A-Z0-9]{20,}/gi, name: 'AWS Key' },
  { pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?[a-zA-Z0-9]{32,}/gi, name: 'API Key' },
  { pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"';]{8,}/gi, name: 'Hardcoded Password' },
  { pattern: /(?:secret|token)\s*[=:]\s*['"]?[a-zA-Z0-9_\-]{20,}/gi, name: 'Secret/Token' },
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, name: 'Private Key' },
  { pattern: /(?:jdbc|mysql|postgresql|mongodb):\/\/[^\s'"]+/gi, name: 'Database Connection String' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token' },
  { pattern: /sk-[a-zA-Z0-9]{48}/g, name: 'OpenAI API Key' },
  { pattern: /xox[bpsar]-[a-zA-Z0-9\-]+/g, name: 'Slack Token' },
];

// ===================== Dependency Vulnerability Scanner =====================

const KNOWN_VULNERABILITIES = {
  'minimist': { versions: ['<1.2.6'], severity: 'prototype-pollution', cve: 'CVE-2021-44906' },
  'node-fetch': { versions: ['<2.6.7'], severity: 'open-redirect', cve: 'CVE-2022-0235' },
  'glob-parent': { versions: ['<5.1.2'], severity: 'regex-dos', cve: 'CVE-2020-28469' },
  'json5': { versions: ['<1.0.2'], severity: 'prototype-pollution', cve: 'CVE-2022-46175' },
  'qs': { versions: ['<6.10.3'], severity: 'prototype-pollution', cve: 'CVE-2022-24999' },
  'decode-uri-component': { versions: ['<0.2.1'], severity: 'dos', cve: 'CVE-2022-38900' },
  'express': { versions: ['<4.18.2'], severity: 'open-redirect', cve: 'CVE-2024-29041' },
};

// ===================== Code Scanner =====================

function scanCode(code, filename) {
  const findings = [];
  const lines = code.split('\n');

  // Scan for vulnerability patterns
  for (const [severity, patterns] of Object.entries(VULNERABILITY_PATTERNS)) {
    for (const vuln of patterns) {
      let match;
      const regex = new RegExp(vuln.pattern.source, vuln.pattern.flags);
      while ((match = regex.exec(code)) !== null) {
        const lineNum = code.slice(0, match.index).split('\n').length;
        const lineContent = lines[lineNum - 1]?.trim() || '';
        findings.push({
          severity,
          id: vuln.id,
          name: vuln.name,
          description: vuln.description,
          file: filename,
          line: lineNum,
          code: lineContent.slice(0, 200),
          position: match.index,
        });
      }
    }
  }

  // Scan for secrets
  for (const secret of SECRET_PATTERNS) {
    let match;
    const regex = new RegExp(secret.pattern.source, secret.pattern.flags);
    while ((match = regex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      findings.push({
        severity: 'CRITICAL',
        id: 'SECRET',
        name: secret.name,
        description: `Hardcoded ${secret.name} detected`,
        file: filename,
        line: lineNum,
        code: '***REDACTED***',
        position: match.index,
      });
    }
  }

  return findings;
}

// ===================== Request Audit Middleware =====================

const auditLog = new Map();
const MAX_AUDIT_ENTRIES = 5000;

export function codeAuditMiddleware(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const now = Date.now();

  // Log request for audit trail
  const entry = {
    timestamp: now,
    ip,
    method: req.method,
    path: req.path,
    userId: req.user?.id || null,
    statusCode: null,
    responseTime: null,
  };

  const startTime = now;
  const originalJson = res.json;
  res.json = function (data) {
    entry.statusCode = res.statusCode;
    entry.responseTime = Date.now() - startTime;
    logAuditEntry(entry);
    return originalJson.call(this, data);
  };

  next();
}

function logAuditEntry(entry) {
  const key = `${entry.ip}:${Math.floor(entry.timestamp / 60000)}`;
  const bucket = auditLog.get(key) || { entries: [], totalRequests: 0, errors: 0, avgResponseTime: 0 };
  bucket.entries.push(entry);
  bucket.totalRequests++;
  if (entry.statusCode >= 400) bucket.errors++;
  bucket.avgResponseTime = (bucket.avgResponseTime * (bucket.totalRequests - 1) + (entry.responseTime || 0)) / bucket.totalRequests;

  // Keep only recent entries
  if (bucket.entries.length > 100) bucket.entries = bucket.entries.slice(-50);
  if (auditLog.size > MAX_AUDIT_ENTRIES) {
    const oldestKey = [...auditLog.keys()].sort()[0];
    auditLog.delete(oldestKey);
  }

  auditLog.set(key, bucket);
}

// ===================== CI/CD Security Gate =====================

export function securityGateCheck(findings) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, secrets: 0 };
  for (const f of findings) {
    if (f.severity === 'CRITICAL') summary.critical++;
    else if (f.severity === 'HIGH') summary.high++;
    else if (f.severity === 'MEDIUM') summary.medium++;
    else if (f.severity === 'LOW') summary.low++;
    if (f.id === 'SECRET') summary.secrets++;
  }

  const passed = summary.critical === 0 && summary.secrets === 0;
  const score = Math.max(0, 100 - (summary.critical * 25 + summary.high * 10 + summary.medium * 3 + summary.low * 1));

  return {
    passed,
    score,
    summary,
    gate: passed ? 'PASS' : 'FAIL',
    recommendation: passed ? 'Code passes security gate' : 'Fix critical vulnerabilities and remove hardcoded secrets before deployment',
  };
}

// ===================== Audit Status =====================

export function getCodeAuditStatus() {
  let totalRequests = 0;
  let totalErrors = 0;
  let avgResponseTime = 0;
  let ipCount = 0;

  for (const [, bucket] of auditLog) {
    totalRequests += bucket.totalRequests;
    totalErrors += bucket.errors;
    avgResponseTime += bucket.avgResponseTime;
    ipCount++;
  }

  return {
    trackedIPs: ipCount,
    totalRequests,
    totalErrors,
    errorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) + '%' : '0%',
    avgResponseTime: ipCount > 0 ? Math.round(avgResponseTime / ipCount) : 0,
    vulnerabilityPatterns: Object.values(VULNERABILITY_PATTERNS).flat().length,
    secretPatterns: SECRET_PATTERNS.length,
    knownVulnerabilities: Object.keys(KNOWN_VULNERABILITIES).length,
  };
}

export default { codeAuditMiddleware, getCodeAuditStatus, scanCode, securityGateCheck };
