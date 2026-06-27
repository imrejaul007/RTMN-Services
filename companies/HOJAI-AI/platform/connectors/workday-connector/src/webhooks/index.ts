/**
 * Workday Webhook Handlers
 *
 * Handles incoming webhook events from Workday:
 * - Worker events (hire, termination, update)
 * - Time off events (submitted, approved, denied, cancelled)
 * - Organization events
 * - Payroll events
 * - Benefit events
 * - Compensation events
 *
 * Supports HMAC signature verification for security.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkdayWebhookEvent,
  WorkdayEventType,
  WorkdayChangeData,
  WebhookHandlerConfig
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Event Type to Handler Mapping
// ============================================================================

export const WORKDAY_EVENT_TYPES: Record<string, WorkdayEventType> = {
  'WORKER_HIRED': 'worker.hired',
  'WORKER_TERMINATED': 'worker.terminated',
  'WORKER_REHIRED': 'worker.rehired',
  'WORKER_UPDATED': 'worker.updated',
  'TIME_OFF_SUBMITTED': 'worker.time_off_submitted',
  'TIME_OFF_APPROVED': 'worker.time_off_approved',
  'TIME_OFF_DENIED': 'worker.time_off_denied',
  'TIME_OFF_CANCELLED': 'worker.time_off_cancelled',
  'ORGANIZATION_UPDATED': 'organization.updated',
  'ORGANIZATION_CREATED': 'organization.created',
  'PAYROLL_PROCESSED': 'payroll.processed',
  'BENEFIT_ENROLLMENT_CHANGED': 'benefit.enrollment_changed',
  'COMPENSATION_UPDATED': 'compensation.updated'
};

// ============================================================================
// Webhook Handler
// ============================================================================

export class WebhookHandler {
  private config: WebhookHandlerConfig;
  private eventHistory: Map<string, WorkdayWebhookEvent> = new Map();
  private maxHistorySize: number = 1000;

  constructor(config: Partial<WebhookHandlerConfig> = {}) {
    this.config = {
      verifySignature: config.verifySignature ?? true,
      signatureHeader: config.signatureHeader ?? 'x-workday-signature',
      secret: config.secret ?? process.env.WEBHOOK_SECRET ?? '',
      handlers: config.handlers ?? {}
    };
  }

  /**
   * Process an incoming webhook event
   * @param body - Raw webhook body
   * @param headers - Request headers
   */
  async handleWebhook(
    body: unknown,
    headers: Record<string, string | undefined>
  ): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Parse and validate the webhook payload
      const event = this.parseWebhookPayload(body, headers);

      if (!event) {
        return {
          success: false,
          error: 'Invalid webhook payload'
        };
      }

      // Verify signature if configured
      if (this.config.verifySignature) {
        const signature = headers[this.config.signatureHeader.toLowerCase()];
        if (!signature) {
          logger.warn('Webhook missing signature', {
            eventType: event.eventType,
            tenantId: event.tenantId
          });
          return {
            success: false,
            error: 'Missing signature header'
          };
        }

        if (!this.verifySignature(body, signature)) {
          logger.warn('Webhook signature verification failed', {
            eventType: event.eventType,
            eventId: event.eventId
          });
          return {
            success: false,
            error: 'Invalid signature'
          };
        }
      }

      // Store event in history
      this.addToHistory(event);

      // Log the event
      logger.info('Processing webhook event', {
        eventId: event.eventId,
        eventType: event.eventType,
        tenantId: event.tenantId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        duration: Date.now() - startTime
      });

      // Call registered handler for this event type
      const handler = this.config.handlers[event.eventType];
      if (handler) {
        await handler(event);
      } else {
        logger.debug('No handler registered for event type', {
          eventType: event.eventType
        });
      }

      return {
        success: true,
        eventId: event.eventId
      };
    } catch (error) {
      logger.error('Webhook processing failed', {
        error: (error as Error).message,
        duration: Date.now() - startTime
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Parse the webhook payload into a WorkdayWebhookEvent
   */
  private parseWebhookPayload(
    body: unknown,
    headers: Record<string, string | undefined>
  ): WorkdayWebhookEvent | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const payload = body as Record<string, unknown>;

    // Handle both Workday native format and normalized format
    const eventType = this.normalizeEventType(
      String(payload.eventType || payload.event_type || headers['x-workday-event-type'] || '')
    );

    if (!eventType) {
      logger.warn('Unknown event type in webhook', { payload });
      return null;
    }

    return {
      eventId: String(
        payload.eventId ||
        payload.event_id ||
        payload.id ||
        uuidv4()
      ),
      eventType,
      eventTimestamp: new Date(
        payload.eventTimestamp ||
        payload.event_timestamp ||
        payload.created ||
        payload.createdAt ||
        Date.now()
      ),
      tenantId: String(
        payload.tenantId ||
        payload.tenant_id ||
        payload.wdTenantId ||
        headers['x-workday-tenant'] ||
        ''
      ),
      userId: String(
        payload.userId ||
        payload.user_id ||
        payload.workerId ||
        ''
      ),
      resourceType: String(payload.resourceType || payload.resource_type || 'Unknown'),
      resourceId: String(payload.resourceId || payload.resource_id || ''),
      changeData: payload.changeData
        ? this.parseChangeData(payload.changeData as Record<string, unknown>)
        : undefined
    };
  }

  /**
   * Normalize event type string to our internal type
   */
  private normalizeEventType(rawType: string): WorkdayEventType | null {
    // Try direct match
    if (WORKDAY_EVENT_TYPES[rawType]) {
      return WORKDAY_EVENT_TYPES[rawType];
    }

    // Try case-insensitive match
    const upperType = rawType.toUpperCase();
    for (const [key, value] of Object.entries(WORKDAY_EVENT_TYPES)) {
      if (key.toUpperCase() === upperType) {
        return value;
      }
    }

    // Try partial match
    for (const [key, value] of Object.entries(WORKDAY_EVENT_TYPES)) {
      if (key.toUpperCase().includes(upperType) || upperType.includes(key.toUpperCase())) {
        return value;
      }
    }

    return null;
  }

  /**
   * Parse change data from webhook
   */
  private parseChangeData(data: Record<string, unknown>): WorkdayChangeData {
    return {
      changedFields: Array.isArray(data.changedFields)
        ? data.changedFields.map(String)
        : Array.isArray(data.changed_fields)
          ? data.changed_fields.map(String)
          : [],
      previousValues: data.previousValues as Record<string, unknown> || data.previous_values as Record<string, unknown>,
      newValues: data.newValues as Record<string, unknown> || data.new_values as Record<string, unknown>
    };
  }

  /**
   * Verify HMAC signature
   * @param body - Raw request body
   * @param signature - Signature from header
   */
  verifySignature(body: unknown, signature: string): boolean {
    if (!this.config.secret) {
      logger.warn('Webhook signature verification skipped - no secret configured');
      return true;
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(bodyString)
      .digest('hex');

    // Support both raw hex and prefixed signatures
    const cleanSignature = signature.replace(/^sha256=/, '');

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate HMAC signature for testing/debugging
   * @param body - Request body
   */
  generateSignature(body: unknown): string {
    if (!this.config.secret) {
      throw new Error('Cannot generate signature without secret');
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return `sha256=${crypto
      .createHmac('sha256', this.config.secret)
      .update(bodyString)
      .digest('hex')}`;
  }

  /**
   * Store event in history for debugging/auditing
   */
  private addToHistory(event: WorkdayWebhookEvent): void {
    // Remove oldest if at capacity
    if (this.eventHistory.size >= this.maxHistorySize) {
      const oldestKey = this.eventHistory.keys().next().value;
      if (oldestKey) {
        this.eventHistory.delete(oldestKey);
      }
    }

    this.eventHistory.set(event.eventId, event);
  }

  /**
   * Get an event from history
   * @param eventId - Event ID
   */
  getEvent(eventId: string): WorkdayWebhookEvent | undefined {
    return this.eventHistory.get(eventId);
  }

  /**
   * Get recent events
   * @param limit - Maximum number of events to return
   */
  getRecentEvents(limit: number = 100): WorkdayWebhookEvent[] {
    return Array.from(this.eventHistory.values())
      .sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get events by type
   * @param eventType - Event type filter
   * @param limit - Maximum number of events
   */
  getEventsByType(eventType: WorkdayEventType, limit: number = 100): WorkdayWebhookEvent[] {
    return Array.from(this.eventHistory.values())
      .filter(e => e.eventType === eventType)
      .sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Register a handler for an event type
   * @param eventType - Event type
   * @param handler - Handler function
   */
  on(eventType: WorkdayEventType, handler: (event: WorkdayWebhookEvent) => Promise<void>): void {
    this.config.handlers[eventType] = handler;
  }

  /**
   * Remove a handler for an event type
   * @param eventType - Event type
   */
  off(eventType: WorkdayEventType): void {
    delete this.config.handlers[eventType];
  }

  /**
   * Get statistics about processed events
   */
  getStats(): {
    totalEvents: number;
    byType: Record<string, number>;
    lastEventTime: Date | null;
  } {
    const events = Array.from(this.eventHistory.values());
    const byType: Record<string, number> = {};

    for (const event of events) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    }

    const sorted = events.sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime());

    return {
      totalEvents: events.length,
      byType,
      lastEventTime: sorted[0]?.eventTimestamp || null
    };
  }
}

// ============================================================================
// Pre-built Event Handlers
// ============================================================================

/**
 * Create a handler that logs all events
 */
export function createLoggingHandler(eventType: WorkdayEventType) {
  return async (event: WorkdayWebhookEvent) => {
    logger.info(`Webhook event received: ${eventType}`, {
      eventId: event.eventId,
      resourceId: event.resourceId,
      timestamp: event.eventTimestamp.toISOString()
    });
  };
}

/**
 * Create a handler that transforms events to Observer events
 */
export function createObserverHandler(
  sendEvent: (event: {
    userId: string;
    eventType: string;
    timestamp: Date;
    source: string;
    data: Record<string, unknown>;
  }) => Promise<void>
) {
  return async (event: WorkdayWebhookEvent) => {
    await sendEvent({
      userId: event.userId,
      eventType: `workday.${event.eventType}`,
      timestamp: event.eventTimestamp,
      source: 'workday',
      data: {
        eventId: event.eventId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        changeData: event.changeData
      }
    });
  };
}

// ============================================================================
// Factory Function
// ============================================================================

let webhookHandlerInstance: WebhookHandler | null = null;

/**
 * Get or create a singleton WebhookHandler instance
 */
export function getWebhookHandler(config?: Partial<WebhookHandlerConfig>): WebhookHandler {
  if (!webhookHandlerInstance) {
    webhookHandlerInstance = new WebhookHandler(config);
  }
  return webhookHandlerInstance;
}

/**
 * Reset the webhook handler instance (for testing)
 */
export function resetWebhookHandler(): void {
  webhookHandlerInstance = null;
}

export default WebhookHandler;