import crypto from 'crypto';
import { Webhook, WebhookEventModel, EventPayload } from '../models/Webhook';
import { signatureService } from './signature';
import logger from './logger';

export type DeliveryStatus = 'pending' | 'delivering' | 'delivered' | 'failed' | 'retrying';

export interface DeliveryPayload {
  id: string;
  event_type: string;
  timestamp: string;
  data: EventPayload;
}

export interface DeliveryLog {
  id: string;
  webhookId: string;
  eventId: string;
  status: DeliveryStatus;
  requestPayload: object;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  attempts: number;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  signature?: string;
}

export interface DeliveryOptions {
  webhook: Webhook;
  event: WebhookEventModel | { type: string; payload: EventPayload; source: string };
}

export interface DeliveryResult {
  success: boolean;
  deliveryId: string;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attempts: number;
  durationMs?: number;
}

export interface DeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  totalDeliveryTime: number;
  totalRetries: number;
  byStatus: Record<DeliveryStatus, number>;
  byWebhook: Record<string, { total: number; success: number; failed: number }>;
}

// In-memory delivery log store
export const deliveryStore = new Map<string, DeliveryLog>();
export const eventDeliveries = new Map<string, Set<string>>(); // eventId -> deliveryIds
export const webhookDeliveries = new Map<string, Set<string>>(); // webhookId -> deliveryIds

class DeliveryService {
  private readonly defaultTimeout = parseInt(process.env.DELIVERY_TIMEOUT_MS || '30000');

  async deliver(options: DeliveryOptions): Promise<DeliveryResult> {
    const { webhook, event } = options;
    const eventId = 'id' in event ? event.id : `evt_${Date.now()}`;
    const deliveryId = this.generateDeliveryId();

    // Create delivery log
    const deliveryLog: DeliveryLog = {
      id: deliveryId,
      webhookId: webhook.id,
      eventId,
      status: 'pending',
      requestPayload: {},
      attempts: 0,
      startedAt: new Date(),
    };

    // Track delivery
    this.trackDelivery(deliveryLog);

    // Build payload
    const payload: DeliveryPayload = {
      id: deliveryId,
      event_type: event.type,
      timestamp: new Date().toISOString(),
      data: event.payload,
    };

    deliveryLog.requestPayload = payload;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'RTMN-Webhook-Manager/1.0',
      'X-Webhook-ID': webhook.id,
      'X-Delivery-ID': deliveryId,
      'X-Event-Type': event.type,
    };

    // Add custom headers
    if (webhook.headers) {
      for (const header of webhook.headers) {
        headers[header.key] = header.value;
      }
    }

    // Generate signature
    const signature = signatureService.generateSignature(payload, webhook.secret);
    headers['X-Webhook-Signature'] = signature;
    deliveryLog.signature = signature;

    try {
      deliveryLog.status = 'delivering';
      deliveryLog.attempts++;

      logger.info(`Attempting delivery ${deliveryId} to ${webhook.url}`, {
        webhookId: webhook.id,
        eventId,
        attempt: deliveryLog.attempts,
      });

      const startTime = Date.now();

      // Perform the HTTP request
      const response = await this.performRequest(webhook.url, payload, headers);

      const durationMs = Date.now() - startTime;
      deliveryLog.durationMs = durationMs;
      deliveryLog.responseStatus = response.status;
      deliveryLog.responseBody = response.body;
      deliveryLog.completedAt = new Date();

      // Check for successful response (2xx status codes)
      if (response.status >= 200 && response.status < 300) {
        deliveryLog.status = 'delivered';
        logger.info(`Delivery ${deliveryId} successful`, {
          statusCode: response.status,
          durationMs,
        });

        return {
          success: true,
          deliveryId,
          statusCode: response.status,
          responseBody: response.body,
          attempts: deliveryLog.attempts,
          durationMs,
        };
      } else {
        deliveryLog.status = 'failed';
        deliveryLog.error = `HTTP ${response.status}: ${response.body}`;

        logger.error(`Delivery ${deliveryId} failed`, {
          statusCode: response.status,
          responseBody: response.body,
        });

        return {
          success: false,
          deliveryId,
          statusCode: response.status,
          responseBody: response.body,
          error: deliveryLog.error,
          attempts: deliveryLog.attempts,
          durationMs,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      deliveryLog.status = 'failed';
      deliveryLog.error = errorMessage;
      deliveryLog.completedAt = new Date();

      logger.error(`Delivery ${deliveryId} error`, { error: errorMessage });

      return {
        success: false,
        deliveryId,
        error: errorMessage,
        attempts: deliveryLog.attempts,
      };
    }
  }

  private async performRequest(
    url: string,
    payload: DeliveryPayload,
    headers: Record<string, string>
  ): Promise<{ status: number; body: string }> {
    // Use native fetch for HTTP requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let body = '';
      try {
        body = await response.text();
      } catch {
        body = '';
      }

      return {
        status: response.status,
        body,
      };
    } catch (error: any) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new Error('Delivery timeout');
      }
      throw error;
    }
  }

  private generateDeliveryId(): string {
    return `del_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private trackDelivery(delivery: DeliveryLog): void {
    deliveryStore.set(delivery.id, delivery);

    // Track by event
    if (!eventDeliveries.has(delivery.eventId)) {
      eventDeliveries.set(delivery.eventId, new Set());
    }
    eventDeliveries.get(delivery.eventId)!.add(delivery.id);

    // Track by webhook
    if (!webhookDeliveries.has(delivery.webhookId)) {
      webhookDeliveries.set(delivery.webhookId, new Set());
    }
    webhookDeliveries.get(delivery.webhookId)!.add(delivery.id);
  }

  async retryDelivery(deliveryId: string): Promise<DeliveryResult> {
    const delivery = deliveryStore.get(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    const { getWebhookById } = await import('../models/Webhook');
    const { getEventById } = await import('../models/Event');

    const webhook = getWebhookById(delivery.webhookId);
    const event = getEventById(delivery.eventId);

    if (!webhook) {
      throw new Error(`Webhook ${delivery.webhookId} not found`);
    }

    if (!event) {
      throw new Error(`Event ${delivery.eventId} not found`);
    }

    return this.deliver({ webhook, event });
  }
}

export const deliveryService = new DeliveryService();

// Query helpers
export function getDeliveryById(id: string): DeliveryLog | undefined {
  return deliveryStore.get(id);
}

export function getAllDeliveries(filters?: {
  status?: DeliveryStatus;
  limit?: number;
  offset?: number;
}): DeliveryLog[] {
  let deliveries = Array.from(deliveryStore.values());

  if (filters?.status) {
    deliveries = deliveries.filter(d => d.status === filters.status);
  }

  // Sort by startedAt descending
  deliveries.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  const offset = filters?.offset || 0;
  const limit = filters?.limit || 100;

  return deliveries.slice(offset, offset + limit);
}

export function getDeliveriesByWebhook(webhookId: string): DeliveryLog[] {
  const deliveryIds = webhookDeliveries.get(webhookId);
  if (!deliveryIds) return [];

  return Array.from(deliveryIds)
    .map(id => deliveryStore.get(id))
    .filter((d): d is DeliveryLog => d !== undefined)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export function getDeliveriesByEvent(eventId: string): DeliveryLog[] {
  const deliveryIds = eventDeliveries.get(eventId);
  if (!deliveryIds) return [];

  return Array.from(deliveryIds)
    .map(id => deliveryStore.get(id))
    .filter((d): d is DeliveryLog => d !== undefined)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export function getDeliveryStats(): DeliveryStats {
  const deliveries = Array.from(deliveryStore.values());

  const stats: DeliveryStats = {
    totalDeliveries: deliveries.length,
    successfulDeliveries: deliveries.filter(d => d.status === 'delivered').length,
    failedDeliveries: deliveries.filter(d => d.status === 'failed').length,
    pendingDeliveries: deliveries.filter(d => d.status === 'pending' || d.status === 'delivering').length,
    totalDeliveryTime: 0,
    totalRetries: 0,
    byStatus: {
      pending: 0,
      delivering: 0,
      delivered: 0,
      failed: 0,
      retrying: 0,
    },
    byWebhook: {},
  };

  for (const delivery of deliveries) {
    stats.byStatus[delivery.status]++;

    if (delivery.durationMs) {
      stats.totalDeliveryTime += delivery.durationMs;
    }

    if (delivery.attempts > 1) {
      stats.totalRetries += delivery.attempts - 1;
    }

    if (!stats.byWebhook[delivery.webhookId]) {
      stats.byWebhook[delivery.webhookId] = { total: 0, success: 0, failed: 0 };
    }
    stats.byWebhook[delivery.webhookId].total++;
    if (delivery.status === 'delivered') {
      stats.byWebhook[delivery.webhookId].success++;
    } else if (delivery.status === 'failed') {
      stats.byWebhook[delivery.webhookId].failed++;
    }
  }

  return stats;
}
