/**
 * Nexha Tenant Summary Client
 *
 * Wraps nexha-tenant-summary: aggregated tenant-level view that fans out
 * to all upstream Nexha services and returns a unified summary.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface SummarySource {
  key: string;
  label: string;
  service: string;
  path: string;
}

export interface TenantSummary {
  tenantId: string;
  sections: Record<string, { ok: boolean; data: Record<string, unknown>; error?: string }>;
  generatedAt: string;
}

export interface UpstreamHealth {
  total: number;
  healthy: number;
  unhealthy: number;
  details: Array<{ service: string; ok: boolean; latencyMs?: number; error?: string }>;
}

export class TenantClient {
  constructor(private config: HojaiConfig) {}

  async listSources(): Promise<{ sources: SummarySource[]; total: number }> {
    return request(this.config, 'GET', '/api/sources');
  }

  async getSummary(tenantId: string): Promise<TenantSummary> {
    return request<TenantSummary>(this.config, 'GET', `/api/tenants/${encodeURIComponent(tenantId)}/summary`);
  }

  async getSection(tenantId: string, section: string): Promise<{ ok: boolean; data: Record<string, unknown>; error?: string }> {
    return request(this.config, 'GET', `/api/tenants/${encodeURIComponent(tenantId)}/summary/${encodeURIComponent(section)}`);
  }

  async checkUpstreams(): Promise<UpstreamHealth> {
    return request<UpstreamHealth>(this.config, 'GET', '/api/health/upstreams');
  }
}