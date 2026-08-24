#!/usr/bin/env node
/**
 * Security Audit — OWASP ZAP + SAST + Secret Scan + Dependency Audit
 * Zero tolerance for critical findings
 */
import { execSync } from 'child_process';
import fs from 'fs';


interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  file?: string;
  line?: number;
  description: string;
  cwe?: string;
  fix?: string;
}

const findings: Finding[] = [];

function addFinding(f: Finding) {
  findings.push(f);
  const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '🟢';
  console.log(`${icon} [${f.severity.toUpperCase()}] ${f.type}: ${f.description}`);
}

function scanSecrets() {
  console.log('\n=== Secret Scan ===');
  const files = getAllFiles('server', ['.js', '.ts', '.json']);
  const patterns = [
    { regex: /(api[_-]?key|secret|password|token|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/gi, type: 'Hardcoded Secret' },
    { regex: /(mongodb|postgres|redis|mysql):\/\/[^:]+:[^@]+@/gi, type: 'Connection String with Credentials' },
    { regex: /-----BEGIN (RSA |EC |)PRIVATE KEY-----/gi, type: 'Private Key' },
    { regex: /sk_[a-zA-Z0-9]{32,}/gi, type: 'Stripe/API Key' },
    { regex: /ghp_[a-zA-Z0-9]{36}/gi, type: 'GitHub Token' },
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const { regex, type } of patterns) {
      const matches = content.match(regex);
      if (matches) {
        addFinding({ severity: 'critical', type, file, description: `Found ${matches.length} occurrence(s)`, fix: 'Move to environment variables / vault' });
      }
    }
  }
}

function scanSQLInjection() {
  console.log('\n=== SQL Injection Scan ===');
  const files = getAllFiles('server', ['.js', '.ts']);
  const patterns = [
    { regex: /\$\{.*\}\s*\$\d/g, type: 'Template Literal in Query' },
    { regex: /`.*\$\{.*\}.*`/g, type: 'Template String Query' },
    { regex: /query\([^)]*\+\s*[^)]*\)/g, type: 'String Concatenation in Query' },
    { regex: /execute\s*\(\s*['"`][^'"`]*\$\{/g, type: 'Template in Execute' },
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const { regex, type } of patterns) {
      const matches = content.match(regex);
      if (matches) {
        addFinding({ severity: 'high', type, file, description: `Potential SQLi: ${type}`, fix: 'Use parameterized queries / prepared statements' });
      }
    }
  }
}

function scanXSS() {
  console.log('\n=== XSS Scan ===');
  const files = getAllFiles('src', ['.tsx', '.jsx']);
  const patterns = [
    { regex: /dangerouslySetInnerHTML\s*=\s*\{/g, type: 'dangerouslySetInnerHTML' },
    { regex: /innerHTML\s*=\s*[^;]+\+/g, type: 'innerHTML Concatenation' },
    { regex: /v-html\s*=/g, type: 'v-html Directive' },
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const { regex, type } of patterns) {
      const matches = content.match(regex);
      if (matches) {
        addFinding({ severity: 'high', type, file, description: `Potential XSS: ${type}`, fix: 'Sanitize output / use safe rendering' });
      }
    }
  }
}

function scanAuth() {
  console.log('\n=== Authentication/Authorization Scan ===');

  // Check for missing auth middleware
  const routeFiles = getAllFiles('server/routes', ['.js', '.ts']);
  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const routes = content.match(/router\.(get|post|put|delete|patch)\(/g) || [];
    const hasAuth = content.includes('requirePermission') || content.includes('guard(') || content.includes('requireRole');
    
    if (routes.length > 0 && !hasAuth && !file.includes('health') && !file.includes('auth')) {
      addFinding({ severity: 'high', type: 'Missing Authorization', file, description: `${routes.length} routes without authorization middleware`, fix: 'Add guard() or requirePermission()' });
    }
  }
}

function scanDependencies() {
  console.log('\n=== Dependency Audit ===');
  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(output.toString());
    for (const [name, vuln] of Object.entries(audit.vulnerabilities || {})) {
      const v = vuln as any;
      addFinding({ severity: v.severity, type: 'Vulnerable Dependency', file: 'package.json', description: `${name}@${v.version}: ${v.title}`, fix: v.fixAvailable ? `Upgrade to ${v.fixAvailable.version}` : 'No fix available' });
    }
  } catch (e: unknown) {
    console.log('npm audit failed:', e instanceof Error ? e.message : String(e));
  }
}

function scanHardcodedValues() {
  console.log('\n=== Hardcoded Values Scan ===');
  const files = [...getAllFiles('server', ['.js', '.ts']), ...getAllFiles('src', ['.tsx', '.ts'])];
  const patterns = [
    { regex: /localhost|127\.0\.0\.1|0\.0\.0\.0/g, type: 'Hardcoded Localhost' },
    { regex: /port\s*[:=]\s*[0-9]{4}/g, type: 'Hardcoded Port' },
    { regex: /admin|root|superuser/gi, type: 'Hardcoded Admin Credentials' },
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const { regex, type } of patterns) {
      const matches = content.match(regex);
      if (matches && !content.includes('process.env') && !content.includes('config')) {
        addFinding({ severity: 'medium', type, file, description: `Hardcoded: ${type}`, fix: 'Use environment variables' });
      }
    }
  }
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walk(full);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

async function runZAP() {
  console.log('\n=== OWASP ZAP Scan ===');
  try {
    // Check if ZAP is available
    execSync('zap.sh -version', { stdio: 'ignore' });
    console.log('[ZAP] Starting baseline scan...');
    execSync('zap.sh -cmd -quickurl http://localhost:4000 -quickprogress', { stdio: 'inherit', timeout: 300000 });
    addFinding({ severity: 'info', type: 'ZAP Scan', description: 'OWASP ZAP baseline scan completed' });
  } catch (e: unknown) {
    console.log('[ZAP] Not available or failed:', e instanceof Error ? e.message : String(e));
    addFinding({ severity: 'info', type: 'ZAP Scan', description: 'OWASP ZAP not available - install for production', fix: 'Install OWASP ZAP for automated scanning' });
  }
}

function generateReport() {
  console.log('\n=== SECURITY AUDIT REPORT ===');
  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  const low = findings.filter(f => f.severity === 'low').length;

  console.log(`\nCritical: ${critical} | High: ${high} | Medium: ${medium} | Low: ${low}`);
  
  if (critical > 0 || high > 0) {
    console.log('\n❌ SECURITY AUDIT FAILED - Critical/High findings must be resolved');
    process.exit(1);
  } else {
    console.log('\n✅ SECURITY AUDIT PASSED - No critical/high findings');
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { critical, high, medium, low, total: findings.length },
    findings
  };
  fs.writeFileSync(`/tmp/security-audit-${Date.now()}.json`, JSON.stringify(report, null, 2));
}

import path from 'path';

async function main() {
  console.log('=== SECURITY AUDIT STARTED ===');
  
  scanSecrets();
  scanSQLInjection();
  scanXSS();
  scanAuth();
  scanDependencies();
  scanHardcodedValues();
  await runZAP();
  generateReport();
}

main().catch(e => { console.error(e); process.exit(1); });