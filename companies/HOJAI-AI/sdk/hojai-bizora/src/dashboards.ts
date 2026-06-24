/**
 * Bizora Dashboards client.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Dashboard } from './types.js';

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  widgetIds?: string[];
  public?: boolean;
}

export class DashboardsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4874` }; }

  async list(input: { ownerId?: string; public?: boolean; limit?: number } = {}): Promise<Dashboard[]> {
    return request<Dashboard[]>(this.config, 'GET', `/api/dashboards${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async get(id: string): Promise<Dashboard> {
    return request<Dashboard>(this.config, 'GET', `/api/dashboards/${encodeURIComponent(id)}`);
  }

  async create(input: CreateDashboardRequest): Promise<Dashboard> {
    return request<Dashboard>(this.config, 'POST', '/api/dashboards', input);
  }

  async update(id: string, patch: Partial<Dashboard>): Promise<Dashboard> {
    return request<Dashboard>(this.config, 'PUT', `/api/dashboards/${encodeURIComponent(id)}`, patch);
  }

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/dashboards/${encodeURIComponent(id)}`);
  }
}
