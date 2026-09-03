/**
 * server/routes/telemetry.js — استقبال أخطاء العميل والتتبع
 * يستقبل دفعات أخطاء من errorTracker.ts (مع keepalive لإرسال حتى بعد إغلاق الصفحة)
 */
import '../lib/loadEnv.js';
import express from 'express';
import { pool } from '../middleware/shared.js';
import { structuredLogger } from '../middleware/observability.js';

const router = express.Router();

// Public endpoint — accepts client error batches. Rate-limited at the global level.
router.post('/api/telemetry/errors', express.json({ limit: '512kb' }), async (req, res) => {
  try {
    const { errors, sentAt } = req.body || {};
    if (!Array.isArray(errors) || errors.length === 0) {
      return res.json({ ok: true, accepted: 0 });
    }
    // Bound batch size to prevent abuse
    const batch = errors.slice(0, 100);
    const cid = req.headers['x-correlation-id'] || null;

    // Log each error via structured logger (writes to stdout + audit_log when possible)
    for (const e of batch) {
      try {
        structuredLogger({
          level: e.severity === 'fatal' ? 'fatal' : e.severity === 'error' ? 'error' : 'warn',
          event: 'client_error',
          message: e.message,
          source: e.source,
          count: e.count,
          first_seen: e.firstSeen,
          last_seen: e.timestamp,
          correlation_id: e.correlationId || cid,
          url: e.url,
          user_agent: e.userAgent,
          stack: e.stack?.slice(0, 1000),
          context: e.context,
        });
      } catch { /* never break the batch */ }
    }

    // Persist to DB if table exists (best-effort; swallow errors if table is missing)
    try {
      const sql = `
        INSERT INTO client_error_log
          (id, source, severity, message, url, user_agent, stack, context, correlation_id, count, first_seen, last_seen, received_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (id) DO UPDATE SET count = EXCLUDED.count, last_seen = EXCLUDED.last_seen
      `;
      for (const e of batch) {
        await pool.query(sql, [
          e.id,
          e.source,
          e.severity,
          e.message?.slice(0, 1000),
          e.url,
          e.userAgent?.slice(0, 500),
          e.stack?.slice(0, 4000),
          e.context ? JSON.stringify(e.context) : null,
          e.correlationId || cid,
          e.count || 1,
          e.firstSeen ? new Date(e.firstSeen) : new Date(),
          e.timestamp ? new Date(e.timestamp) : new Date(),
        ]);
      }
    } catch (dbErr) {
      // Table may not exist in dev — log and continue
      console.warn('[telemetry] client_error_log table not available:', dbErr.message);
    }

    res.json({ ok: true, accepted: batch.length, sentAt: sentAt || new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'telemetry_failed' });
  }
});

// Admin-only: summary of recent client errors for the DiagnosticPanel
router.get('/api/telemetry/errors/summary', async (req, res) => {
  if (!req.user || !['super_admin', 'ministry_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'غير مصرح', code: 'FORBIDDEN' });
  }
  try {
    const r = await pool.query(`
      SELECT
        severity,
        source,
        COUNT(*) AS occurrences,
        MAX(last_seen) AS last_seen
      FROM client_error_log
      WHERE last_seen > NOW() - INTERVAL '24 hours'
      GROUP BY severity, source
      ORDER BY occurrences DESC
      LIMIT 50
    `).catch(() => ({ rows: [] }));
    res.json({ ok: true, summary: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'summary_failed' });
  }
});

export default router;
