/**
 * Customer Twin Client (port 4895) — Customer, LTV, Churn, Segments.
 *
 * Specialized surface on top of the generic twin — adds LTV, churn
 * prediction, segments, behavior tracking, and event recording.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface CustomerTwin {
  id: string;
  corpId: string;
  name: string;
  email?: string;
  /** Lifetime value in minor units */
  ltv: { amount: number; currency: string };
  /** 0-100 churn probability */
  churnRisk: number;
  /** Segment ids */
  segments: string[];
  /** Recent behavior summary */
  behavior: Record<string, unknown>;
  lastEventAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  /** Customer count in segment */
  size: number;
  criteria: Record<string, unknown>;
}

export interface CustomerEvent {
  type: string;
  properties: Record<string, unknown>;
  occurredAt: string;
}

export class CustomerTwinClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4895` }; }

  async listCustomers(input: { segmentId?: string; minChurnRisk?: number; minLtv?: number; limit?: number } = {}): Promise<CustomerTwin[]> {
    return request<CustomerTwin[]>(this.config, 'GET', `/api/twins/customers${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getCustomer(id: string): Promise<CustomerTwin> {
    return request<CustomerTwin>(this.config, 'GET', `/api/twins/customer/${encodeURIComponent(id)}`);
  }
  async createCustomer(input: { corpId: string; name: string; email?: string; ltv?: { amount: number; currency: string }; segments?: string[] }): Promise<CustomerTwin> {
    return request<CustomerTwin>(this.config, 'POST', '/api/twins/customer', input);
  }
  async updateCustomer(id: string, patch: Partial<CustomerTwin>): Promise<CustomerTwin> {
    return request<CustomerTwin>(this.config, 'PUT', `/api/twins/customer/${encodeURIComponent(id)}`, patch);
  }
  async deleteCustomer(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/twins/customer/${encodeURIComponent(id)}`);
  }
  async setBehavior(id: string, behavior: Record<string, unknown>): Promise<CustomerTwin> {
    return request<CustomerTwin>(this.config, 'PUT', `/api/twins/customer/${encodeURIComponent(id)}/behavior`, behavior);
  }
  async recordEvent(id: string, event: CustomerEvent): Promise<CustomerTwin> {
    return request<CustomerTwin>(this.config, 'POST', `/api/twins/customer/${encodeURIComponent(id)}/event`, event);
  }
  async setSegment(id: string, segmentId: string): Promise<CustomerTwin> {
    return request<CustomerTwin>(this.config, 'PUT', `/api/twins/customer/${encodeURIComponent(id)}/segment`, { segmentId });
  }
  async getLtv(id: string): Promise<{ current: { amount: number; currency: string }; predicted: { amount: number; currency: string } }> {
    return request(this.config, 'GET', `/api/twins/customer/${encodeURIComponent(id)}/ltv`);
  }
  async listSegments(): Promise<CustomerSegment[]> {
    return request<CustomerSegment[]>(this.config, 'GET', '/api/segments');
  }
}
