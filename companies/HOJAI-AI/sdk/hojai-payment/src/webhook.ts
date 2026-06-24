/**
 * RABTUL Payment Webhook Client — webhook configuration + delivery
 * inspection for all payment services.
 *
 * Wraps the cross-service webhook management surface (configuration,
 * delivery log, signature verification helper).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookEventType =
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.refund_initiated'
  | 'settlement.created'
  | 'settlement.settled'
  | 'settlement.failed'
  | 'bill.fetched'
  | 'bill.paid'
  | 'sepa.settled'
  | 'sepa.returned'
  | 'gateway.captured'
  | 'gateway.failed';

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: WebhookEventType;
  attempt: number;
  status: 'pending' | 'succeeded' | 'failed' | 'retrying';
  responseStatus?: number;
  responseBody?: string;
  durationMs?: number;
  payload: Record<string, unknown>;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
}

export interface VerifySignatureResult {
  valid: boolean;
  timestamp?: string;
  reason?: string;
}

export class WebhookClient {
  constructor(private config: HojaiConfig) {}

  // ── Endpoints ──────────────────────────────────────────────────────
  async listEndpoints(): Promise<WebhookEndpoint[]> {
    return request<WebhookEndpoint[]>(this.config, 'GET', '/api/webhook/endpoints');
  }

  async getEndpoint(endpointId: string): Promise<WebhookEndpoint> {
    return request<WebhookEndpoint>(this.config, 'GET', `/api/webhook/endpoints/${encodeURIComponent(endpointId)}`);
  }

  async createEndpoint(req: { url: string; events: WebhookEventType[]; description?: string }): Promise<WebhookEndpoint> {
    return request<WebhookEndpoint>(this.config, 'POST', '/api/webhook/endpoints', req);
  }

  async updateEndpoint(endpointId: string, req: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'enabled' | 'description'>>): Promise<WebhookEndpoint> {
    return request<WebhookEndpoint>(this.config, 'PATCH', `/api/webhook/endpoints/${encodeURIComponent(endpointId)}`, req);
  }

  async deleteEndpoint(endpointId: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(this.config, 'DELETE', `/api/webhook/endpoints/${encodeURIComponent(endpointId)}`);
  }

  // ── Delivery log ───────────────────────────────────────────────────
  async listDeliveries(params: { endpointId?: string; eventType?: WebhookEventType; status?: WebhookDelivery['status']; from?: string; to?: string; limit?: number } = {}): Promise<WebhookDelivery[]> {
    const qs = new URLSearchParams();
    if (params.endpointId) qs.set('endpointId', params.endpointId);
    if (params.eventType) qs.set('eventType', params.eventType);
    if (params.status) qs.set('status', params.status);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<WebhookDelivery[]>(this.config, 'GET', `/api/webhook/deliveries${suffix}`);
  }

  async getDelivery(deliveryId: string): Promise<WebhookDelivery> {
    return request<WebhookDelivery>(this.config, 'GET', `/api/webhook/deliveries/${encodeURIComponent(deliveryId)}`);
  }

  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    return request<WebhookDelivery>(this.config, 'POST', `/api/webhook/deliveries/${encodeURIComponent(deliveryId)}/retry`);
  }

  // ── Signature verification (helper — server-side, not via SDK request) ─
  /**
   * Verify a Razorpay-style HMAC-SHA256 webhook signature locally.
   * Pass the raw request body (string), the X-Razorpay-Signature header,
   * and the shared webhook secret. Returns whether the signature matches.
   *
   * This is a pure helper — it does not call any service. Use it in your
   * own webhook receiver to validate payloads before processing.
   *
   * Note: uses `node:crypto` and therefore only works in Node.js, not in
   * browser-bundled environments.
   */
  static verifyRazorpaySignature(rawBody: string, signature: string, secret: string): VerifySignatureResult {
    try {
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      if (a.length !== b.length) {
        return { valid: false, reason: 'signature length mismatch' };
      }
      return { valid: timingSafeEqual(a, b) };
    } catch (err) {
      return { valid: false, reason: err instanceof Error ? err.message : 'verification failed' };
    }
  }
}
