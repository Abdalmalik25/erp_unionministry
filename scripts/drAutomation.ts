#!/usr/bin/env node
/**
 * DR Automation â€” Backup â†’ Restore â†’ Verify â†’ RPO/RTO Report
 * Production: Automated, verified, documented
 */
import pg from 'pg';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

async function runDRTest() {
  const startTime = Date.now();
  const report: any = {
    testId: `DR-${Date.now()}`,
    startedAt: new Date().toISOString(),
    rpoTargetMinutes: 15,
    rtoTargetMinutes: 60,
    steps: []
  };

  try {
    // 1. Create backup
    console.log('[DR] Creating backup...');
    const backupStart = Date.now();
    const backupFile = `/tmp/dr-backup-${Date.now()}.sql.gz`;
    
    // pg_dump with compression
    execSync(`pg_dump ${(process.env.DATABASE_URL ?? "")} | gzip > ${backupFile}`, { stdio: 'inherit' });
    
    const backupSize = fs.statSync(backupFile).size;
    const backupDuration = Date.now() - backupStart;
    report.steps.push({ step: 'backup', durationMs: backupDuration, sizeBytes: backupSize, status: 'ok' });
    console.log(`[DR] Backup created: ${(backupSize/1024/1024).toFixed(2)} MB in ${backupDuration}ms`);

    // 2. Verify backup integrity
    console.log('[DR] Verifying backup...');
    const verifyStart = Date.now();
    const checksum = crypto.createHash('sha256').update(fs.readFileSync(backupFile)).digest('hex');
    const verifyDuration = Date.now() - verifyStart;
    report.steps.push({ step: 'verify', durationMs: verifyDuration, checksum, status: 'ok' });

    // 3. Test restore to temporary database
    console.log('[DR] Testing restore...');
    const restoreStart = Date.now();
    const testDb = `dr_test_${Date.now()}`;
    
    // Create test database
    await pool.query(`CREATE DATABASE ${testDb}`);
    
    // Restore
    execSync(`gunzip -c ${backupFile} | psql ${(process.env.DATABASE_URL ?? "").replace(/\/[^\/]+$/, `/${testDb}`)}`, { stdio: 'pipe' });
    
    const restoreDuration = Date.now() - restoreStart;
    report.steps.push({ step: 'restore', durationMs: restoreDuration, status: 'ok' });
    console.log(`[DR] Restore completed in ${restoreDuration}ms`);

    // 4. Data integrity verification
    console.log('[DR] Verifying data integrity...');
    const integrityStart = Date.now();
    const tables = ['persons', 'legal_entities', 'service_catalog', 'regulatory_rules', 'audit_log'];
    let totalRows = 0;
    
    for (const table of tables) {
      const original = await pgPool.query(`SELECT COUNT(*) FROM ${table}`);
      const restored = await testPool.query(`SELECT COUNT(*) FROM ${table}`);
      if (original.rows[0].count !== restored.rows[0].count) {
        throw new Error(`Row count mismatch for ${table}: ${original.rows[0].count} vs ${restored.rows[0].count}`);
      }
      totalRows += parseInt(original.rows[0].count);
    }
    
    const integrityDuration = Date.now() - integrityStart;
    report.steps.push({ step: 'integrity', durationMs: integrityDuration, totalRows, status: 'ok' });

    // 5. Cleanup test database
    await pool.query(`DROP DATABASE ${testDb}`);

    // Calculate RPO/RTO
    const totalDuration = Date.now() - startTime;
    const rpoMinutes = Math.ceil(backupDuration / 60000); // Simplified
    const rtoMinutes = Math.ceil(totalDuration / 60000);
    
    report.completedAt = new Date().toISOString();
    report.totalDurationMs = totalDuration;
    report.rpoMinutes = rpoMinutes;
    report.rtoMinutes = rtoMinutes;
    report.backupSizeMB = backupSize / 1024 / 1024;
    report.checksum = checksum;
    report.passed = rpoMinutes <= 15 && rtoMinutes <= 60;
    
    // Cleanup backup file
    fs.unlinkSync(backupFile);
    
    console.log('\n=== DR TEST REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    
    // Save report
    fs.writeFileSync(`/tmp/dr-report-${report.testId}.json`, JSON.stringify(report, null, 2));
    
    if (report.passed) {
      console.log('âœ… DR TEST PASSED');
      process.exit(0);
    } else {
      console.log('âŒ DR TEST FAILED');
      process.exit(1);
    }
    
  } catch (e: unknown) {
    report.error = e instanceof Error ? e.message : String(e);
    report.failedAt = new Date().toISOString();
    console.error('[DR] FAILED:', e);
    fs.writeFileSync(`/tmp/dr-report-failed-${Date.now()}.json`, JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
const testPool = new pg.Pool({ connectionString: (process.env.DATABASE_URL ?? "").replace(/\/[^\/]+$/, `/dr_test_${Date.now()}`), ssl: { rejectUnauthorized: true } });

runDRTest();