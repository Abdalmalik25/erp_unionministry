// server/utils/eventBus.js
// Event-driven architecture: publish/subscribe for domain events
// Enables webhooks, audit trails, notifications, and cross-cutting concerns

import { auditLog } from '../middleware/shared.js';

// Domain event types
export const EventType = {
  // Entity events
  ENTITY_CREATED: 'entity.created',
  ENTITY_UPDATED: 'entity.updated',
  ENTITY_DELETED: 'entity.deleted',
  ENTITY_STATUS_CHANGED: 'entity.status_changed',

  // Member/Worker events
  MEMBER_REGISTERED: 'member.registered',
  MEMBER_UPDATED: 'member.updated',
  WORKER_REGISTERED: 'worker.registered',
  WORKER_CONTRACT_SIGNED: 'worker.contract_signed',

  // Compliance events
  VIOLATION_REGISTERED: 'violation.registered',
  INSPECTION_COMPLETED: 'inspection.completed',
  COMPLIANCE_ALERT: 'compliance.alert',

  // License events
  LICENSE_ISSUED: 'license.issued',
  LICENSE_EXPIRED: 'license.expired',
  LICENSE_REVOKED: 'license.revoked',

  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_OVERDUE: 'payment.overdue',

  // System events
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_MFA_ENABLED: 'user.mfa_enabled',
  DATA_EXPORTED: 'data.exported',
  SETTINGS_CHANGED: 'settings.changed',

  // Integration events
  WEBHOOK_DELIVERED: 'webhook.delivered',
  WEBHOOK_FAILED: 'webhook.failed',
};

// Event subscriber definition
export class EventBus {
  #subscribers = new Map(); // eventType -> Set<subscriber>
  #webhookQueue = [];       // pending webhook deliveries
  #maxQueueSize = 1000;

  /**
   * Subscribe to one or more event types
   * @param {string|string[]} eventTypes
   * @param {Function} handler (event) => Promise<void>
   * @returns {Function} unsubscribe function
   */
  subscribe(eventTypes, handler) {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    types.forEach((type) => {
      if (!this.#subscribers.has(type)) {
        this.#subscribers.set(type, new Set());
      }
      this.#subscribers.get(type).add(handler);
    });
    return () => {
      types.forEach((type) => {
        this.#subscribers.get(type)?.delete(handler);
      });
    };
  }

  /**
   * Publish an event to all subscribers
   * @param {string} eventType
   * @param {Object} payload
   * @param {Object} metadata
   */
  async publish(eventType, payload = {}, metadata = {}) {
    const timestamp = new Date().toISOString();
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      payload,
      metadata: {
        timestamp,
        source: 'server',
        ...metadata,
      },
    };

    // Log to audit trail
    try {
      await auditLog(eventType, payload?.resource || eventType, metadata?.userId || 'system', {
        event_id: event.id,
        payload: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('[EventBus] auditLog failed:', e);
    }

    // Notify subscribers
    const handlers = this.#subscribers.get(eventType) || new Set();
    const promises = [...handlers].map(async (handler) => {
      try {
        await handler(event);
      } catch (e) {
        console.error(`[EventBus] handler error for ${eventType}:`, e);
      }
    });

    await Promise.allSettled(promises);
    return event;
  }

  /**
   * Enqueue a webhook delivery (non-blocking)
   */
  enqueueWebhook(webhookUrl, event, options = {}) {
    if (this.#webhookQueue.length >= this.#maxQueueSize) {
      console.warn('[EventBus] webhook queue full, dropping event');
      return;
    }
    this.#webhookQueue.push({
      webhookUrl,
      event,
      options,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      backoff: options.backoff || 1000,
    });
  }

  /**
   * Get pending webhook count
   */
  get queueSize() {
    return this.#webhookQueue.length;
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Convenience: publish helpers for common domain events
export async function publishEntityEvent(type, entity, userId, pool) {
  return eventBus.publish(type, {
    resource: 'entity',
    entity_id: entity.id,
    entity_name_ar: entity.name_ar,
    entity_type: entity.entity_type,
    status: entity.status,
    governorate: entity.governorate,
  }, { userId });
}

export async function publishViolationEvent(violation, pool, userId) {
  return eventBus.publish(EventType.VIOLATION_REGISTERED, {
    resource: 'violation',
    violation_id: violation.id,
    entity_id: violation.entity_id,
    severity: violation.severity,
    description: violation.description,
  }, { userId });
}

export async function publishLicenseEvent(type, license, userId) {
  return eventBus.publish(type, {
    resource: 'license',
    license_id: license.id,
    license_number: license.license_number,
    entity_id: license.entity_id,
    expiry_date: license.expiry_date,
  }, { userId });
}
