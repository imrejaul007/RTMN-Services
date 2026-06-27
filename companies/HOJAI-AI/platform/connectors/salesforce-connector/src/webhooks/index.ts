/**
 * Salesforce Webhook Handlers
 * Handles incoming webhooks from Salesforce for real-time updates
 */

import * as crypto from 'crypto';
import type { SalesforceWebhookPayload, SalesforceWebhookEvent, ObserverEvent } from '../types/index.js';

// Event handlers registry
type WebhookHandler = (event: SalesforceWebhookEvent) => Promise<void>;
const eventHandlers = new Map<string, WebhookHandler[]>();

// Observer events storage for TwinOS
const observerEvents: ObserverEvent[] = [];

/**
 * Verify Salesforce webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  consumerSecret?: string
): boolean {
  const secret = consumerSecret || process.env.SF_WEBHOOK_SECRET || '';
  if (!secret) {
    console.warn('SF_WEBHOOK_SECRET not configured, skipping signature verification');
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Salesforce sends signature with timestamp prefix
  const [timestamp, hash] = signature.split(',');
  if (!timestamp || !hash) {
    return false;
  }

  const [, timestampValue] = timestamp.split('=');
  const [, signatureValue] = hash.split('=');

  // Verify timestamp is not too old (5 minute window)
  const now = Math.floor(Date.now() / 1000);
  const timestampNum = parseInt(timestampValue, 10);
  if (Math.abs(now - timestampNum) > 300) {
    console.warn('Webhook timestamp too old, rejecting');
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signatureValue),
    Buffer.from(expectedSignature)
  );
}

/**
 * Register event handler
 */
export function on(eventType: string, handler: WebhookHandler): void {
  const handlers = eventHandlers.get(eventType) || [];
  handlers.push(handler);
  eventHandlers.set(eventType, handlers);
}

/**
 * Unregister event handler
 */
export function off(eventType: string, handler: WebhookHandler): void {
  const handlers = eventHandlers.get(eventType) || [];
  const index = handlers.indexOf(handler);
  if (index > -1) {
    handlers.splice(index, 1);
    eventHandlers.set(eventType, handlers);
  }
}

/**
 * Process incoming webhook
 */
export async function handleWebhook(
  body: Record<string, unknown>,
  signature?: string,
  rawBody?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify signature if provided
    if (signature && rawBody) {
      if (!verifySignature(rawBody, signature)) {
        return { success: false, error: 'Invalid signature' };
      }
    }

    // Parse event type from body
    const payload = body.payload as Record<string, unknown>;
    const eventType = payload?.changeType as string || body.type as string;

    if (!eventType) {
      return { success: false, error: 'Unknown event type' };
    }

    const webhookEvent: SalesforceWebhookEvent = {
      type: eventType,
      payload: {
        id: payload?.id as string || '',
        entity: payload?.sobjectType as string || '',
        changeType: payload?.changeType as 'CREATE' | 'UPDATE' | 'DELETE',
        fieldsChanged: payload?.changedFields as string[],
        record: payload?.new as Record<string, unknown>,
        previousRecord: payload?.old as Record<string, unknown>,
      },
      timestamp: new Date().toISOString(),
    };

    // Store observer event for TwinOS
    if (webhookEvent.payload.record) {
      const observerEvent: ObserverEvent = {
        source: 'salesforce',
        type: eventType,
        employeeId: (webhookEvent.payload.record as Record<string, unknown>).OwnerId as string || '',
        timestamp: webhookEvent.timestamp,
        data: {
          entity: webhookEvent.payload.entity,
          recordId: webhookEvent.payload.id,
          fieldsChanged: webhookEvent.payload.fieldsChanged,
        },
      };
      observerEvents.push(observerEvent);
    }

    // Call registered handlers
    const handlers = eventHandlers.get(eventType) || [];
    const allHandlers = eventHandlers.get('*') || [];
    const toCall = [...handlers, ...allHandlers];

    await Promise.all(toCall.map(handler => handler(webhookEvent)));

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get observer events for TwinOS
 */
export function getObserverEvents(
  employeeId?: string,
  days: number = 7
): ObserverEvent[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return observerEvents.filter(event => {
    if (new Date(event.timestamp) < cutoff) {
      return false;
    }
    if (employeeId && event.employeeId !== employeeId) {
      return false;
    }
    return true;
  });
}

/**
 * Clear observer events (for testing)
 */
export function clearObserverEvents(): void {
  observerEvents.length = 0;
}

// Convenience methods for common events
export function onLeadCreated(handler: (lead: Record<string, unknown>) => Promise<void>): void {
  on('CREATE', async (event) => {
    if (event.payload.entity === 'Lead') {
      await handler(event.payload.record || {});
    }
  });
}

export function onLeadUpdated(handler: (lead: Record<string, unknown>, changes: string[]) => Promise<void>): void {
  on('UPDATE', async (event) => {
    if (event.payload.entity === 'Lead') {
      await handler(event.payload.record || {}, event.payload.fieldsChanged || []);
    }
  });
}

export function onOpportunityStageChanged(
  handler: (opp: Record<string, unknown>, oldStage: string, newStage: string) => Promise<void>
): void {
  on('UPDATE', async (event) => {
    if (event.payload.entity === 'Opportunity' && event.payload.fieldsChanged?.includes('StageName')) {
      const newRecord = event.payload.record || {};
      const oldRecord = event.payload.previousRecord || {};
      await handler(newRecord, oldRecord.StageName as string, newRecord.StageName as string);
    }
  });
}

export function onContactCreated(handler: (contact: Record<string, unknown>) => Promise<void>): void {
  on('CREATE', async (event) => {
    if (event.payload.entity === 'Contact') {
      await handler(event.payload.record || {});
    }
  });
}

export const webhooks = {
  verifySignature,
  on,
  off,
  handleWebhook,
  getObserverEvents,
  clearObserverEvents,
  onLeadCreated,
  onLeadUpdated,
  onOpportunityStageChanged,
  onContactCreated,
};

export default webhooks;