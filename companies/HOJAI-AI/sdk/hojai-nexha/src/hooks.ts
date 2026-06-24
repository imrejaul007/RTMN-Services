/**
 * Nexha Hooks SDK Client
 *
 * Wraps nexha-hooks-sdk: webhook subscriptions, event delivery,
 * signature verification.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Subscription {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string;
  failureCount: number;
}

export interface SubscriptionInput {
  url: string;
  events: string[];
  secret?: string;
  metadata?: Record<string, unknown>;
}

export interface Delivery {
  id: string;
  subscriptionId: string;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
  status: 'pending' | 'success' | 'failed';
  httpStatus?: number;
  deliveredAt?: string;
  errorMessage?: string;
}

export interface SignRequest {
  payload: string;
  secret: string;
  algorithm?: 'sha256' | 'sha512';
}

export interface SignResult {
  signature: string;
  algorithm: string;
  timestamp: string;
}

export interface VerifyRequest {
  payload: string;
  signature: string;
  secret: string;
  timestamp?: string;
  toleranceSeconds?: number;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export class HooksClient {
  constructor(private config: HojaiConfig) {}

  // ── Subscriptions ─────────────────────────────────────────
  async createSubscription(input: SubscriptionInput): Promise<Subscription> {
    return request<Subscription>(this.config, 'POST', '/api/subscriptions', input);
  }

  async listSubscriptions(input: { status?: Subscription['status']; event?: string } = {}): Promise<Subscription[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Subscription[]>(this.config, 'GET', `/api/subscriptions?${params.toString()}`);
  }

  async getSubscription(id: string): Promise<Subscription> {
    return request<Subscription>(this.config, 'GET', `/api/subscriptions/${encodeURIComponent(id)}`);
  }

  async updateSubscription(id: string, patch: Partial<SubscriptionInput>): Promise<Subscription> {
    return request<Subscription>(this.config, 'PATCH', `/api/subscriptions/${encodeURIComponent(id)}`, patch);
  }

  async disableSubscription(id: string): Promise<Subscription> {
    return request<Subscription>(this.config, 'POST', `/api/subscriptions/${encodeURIComponent(id)}/disable`);
  }

  async enableSubscription(id: string): Promise<Subscription> {
    return request<Subscription>(this.config, 'POST', `/api/subscriptions/${encodeURIComponent(id)}/enable`);
  }

  async deleteSubscription(id: string): Promise<{ deleted: boolean }> {
    return request(this.config, 'DELETE', `/api/subscriptions/${encodeURIComponent(id)}`);
  }

  async rotateSecret(id: string): Promise<Subscription> {
    return request<Subscription>(this.config, 'POST', `/api/subscriptions/${encodeURIComponent(id)}/rotate-secret`);
  }

  // ── Events & Deliveries ───────────────────────────────────
  async emitEvent(input: { event: string; payload: Record<string, unknown>; tenantId?: string }): Promise<{ emitted: boolean; matchedSubscriptions: number }> {
    return request(this.config, 'POST', '/api/events', input);
  }

  async processDeliveries(input: { batchSize?: number } = {}): Promise<{ processed: number; succeeded: number; failed: number }> {
    return request(this.config, 'POST', '/api/deliveries/process', input);
  }

  async listDeliveries(input: { subscriptionId?: string; status?: Delivery['status']; limit?: number } = {}): Promise<Delivery[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Delivery[]>(this.config, 'GET', `/api/deliveries?${params.toString()}`);
  }

  async getDelivery(id: string): Promise<Delivery> {
    return request<Delivery>(this.config, 'GET', `/api/deliveries/${encodeURIComponent(id)}`);
  }

  // ── Signing & Verification ────────────────────────────────
  async sign(input: SignRequest): Promise<SignResult> {
    return request<SignResult>(this.config, 'POST', '/api/sign', input);
  }

  async verify(input: VerifyRequest): Promise<VerifyResult> {
    return request<VerifyResult>(this.config, 'POST', '/api/verify', input);
  }

  // ── Stats ─────────────────────────────────────────────────
  async stats(): Promise<{ totalSubscriptions: number; activeDeliveries: number; failureRate: number }> {
    return request(this.config, 'GET', '/api/stats');
  }
}