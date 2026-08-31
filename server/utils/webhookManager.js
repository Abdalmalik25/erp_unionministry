// server/utils/webhookManager.js
// Webhook delivery with retry, backoff, signature verification, and logging

import crypto from 'crypto';
import { pool } from '../middleware/shared.js';

// In-memory queue — in production, use a persistent queue (Redis, BullMQ, etc.)
const queue = [];
let processing = false;
const PROCESS_INTERVAL_MS = 5000;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

/**
 * Register a webhook endpoint for an event type
 */
export async function registerWebhook(eventType, webhookUrl, opts = {}) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO webhook_subscriptions (id, event_type, target_url, secret, is_active, created_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (event_type, target_url) DO UPDATE SET is_active=true, updated_at=NOW()`,
    [id, eventType, webhookUrl, opts.secret || crypto.randomUUID(), true],
  );
  return id;
}

/**
 * Unregister a webhook
 */
export async function unregisterWebhook(eventType, webhookUrl) {
  await pool.query(
    `UPDATE webhook_subscriptions SET is_active=false WHERE event_type=$1 AND target_url=$2`,
    [eventType, webhookUrl],
  );
}

/**
 * Enqueue event for webhook delivery
 */
export function enqueueWebhook(eventType, payload, metadata = {}) {
  queue.push({
    id: crypto.randomUUID(),
    eventType,
    payload,
    metadata,
    attempts: 0,
    nextAttempt: Date.now(),
    lastError: null,
  });
  // Kick off processor if not running
  if (!processing) scheduleProcessor();
}

/**
 * Compute HMAC-SHA256 signature for webhook payload
 */
export function signPayload(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function processWebhook(item) {
  const { eventType, payload, metadata } = item;

  // Load subscriptions for this event type
  let subs;
  try {
    const res = await pool.query(
      `SELECT id, target_url, secret FROM webhook_subscriptions
       WHERE event_type=$1 AND is_active=true`,
      [eventType],
    );
    subs = res.rows;
  } catch (e) {
    console.error('[Webhook] failed to load subscriptions:', e);
    return;
  }

  if (!subs.length) return;

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': item.id,
        'X-Webhook-Timestamp': metadata.timestamp || new Date().toISOString(),
      };

      if (sub.secret) {
        headers['X-Webhook-Signature'] = `sha256=${signPayload(payload, sub.secret)}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await fetch(sub.target_url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ event: eventType, data: payload, metadata }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          await logDelivery(sub.id, item.id, res.status, null);
          return { url: sub.target_url, status: res.status, ok: true };
        } else {
          const err = `HTTP ${res.status}: ${await res.text().catch(() => '')}`;
          await logDelivery(sub.id, item.id, res.status, err);
          return { url: sub.target_url, status: res.status, ok: false, error: err };
        }
      } catch (e) {
        clearTimeout(timeout);
        const err = e.message;
        await logDelivery(sub.id, item.id, 0, err);
        return { url: sub.target_url, ok: false, error: err };
      }
    }),
  );

  // Determine if this item should be retried
  const allFailed = results.every((r) => !r.ok);
  if (allFailed) {
    item.attempts++;
    item.lastError = results.map((r) => r.error).join('; ');
    if (item.attempts < MAX_RETRIES) {
      item.nextAttempt = Date.now() + BASE_BACKOFF_MS * 2 ** item.attempts;
      queue.push(item);
    } else {
      console.error(`[Webhook] permanently failed after ${MAX_RETRIES} attempts:`, item);
    }
  }
}

async function logDelivery(subId, eventId, statusCode, error) {
  try {
    await pool.query(
      `INSERT INTO webhook_deliveries (subscription_id, event_id, status_code, error_message, delivered_at)
       VALUES ($1,$2,$3,$4,NOW())`,
      [subId, eventId, statusCode, error],
    );
  } catch (e) {
    console.error('[Webhook] logging failed:', e);
  }
}

function scheduleProcessor() {
  processing = true;
  setInterval(async () => {
    const now = Date.now();
    const ready = queue.splice(0, queue.length, ...queue.filter((i) => i.nextAttempt > now));
    if (ready.length) {
      for (const item of ready) {
        await processWebhook(item);
      }
    }
    if (!queue.length) processing = false;
  }, PROCESS_INTERVAL_MS);
}

// Auto-register core event types on startup
export async function initWebhookManager() {
  // Ensure tables exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_subscriptions (
      id uuid PRIMARY KEY,
      event_type text NOT NULL,
      target_url text NOT NULL,
      secret text,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz,
      UNIQUE(event_type, target_url)
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id serial PRIMARY KEY,
      subscription_id uuid REFERENCES webhook_subscriptions(id),
      event_id uuid,
      status_code int,
      error_message text,
      delivered_at timestamptz DEFAULT NOW()
    );
  `);
  console.info('[Webhook] manager initialized');
}

// Convenience facade used by route handlers (e.g. disputes.js calls
// webhookManager.trigger('dispute.resolved', {...}))
export const webhookManager = {
  trigger: (eventType, payload, metadata = {}) =>
    enqueueWebhook(eventType, payload, metadata),
  register: registerWebhook,
  unregister: unregisterWebhook,
  enqueue: enqueueWebhook,
};
