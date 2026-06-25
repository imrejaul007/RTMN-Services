/**
 * TwinOS Module
 *
 * Wraps TwinOS Hub (port 4705) via Hub /api/twins/* routes.
 * Uses PUT for updates (not PATCH — TwinOS Hub uses PUT).
 * Links use /api/relationships (not /api/twins/:id/link).
 */

import type { HojaiConfig } from './config.js';
import { request, type AuthState, type HojaiClientConfig } from './utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TwinType =
  | 'customer' | 'product' | 'order' | 'employee'
  | 'device' | 'location' | 'campaign' | 'asset'
  | 'service_instance' | 'organization';

export interface Twin {
  id: string;
  name: string;
  service?: string;
  type: string;
  category?: string;
  port?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  businessId?: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  state?: Record<string, unknown>;
}

export interface CreateTwinRequest {
  type: TwinType;
  name: string;
  attributes?: Record<string, unknown>;
  tags?: string[];
  category?: string;
  service?: string;
  port?: number;
}

export interface UpdateTwinRequest {
  name?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  state?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// TwinOS client
// ---------------------------------------------------------------------------

export class TwinClient {
  private readonly cfg: HojaiClientConfig;
  constructor(config: HojaiConfig, authState: AuthState) {
    this.cfg = { ...config, authState };
  }

  async create(input: CreateTwinRequest): Promise<Twin> {
    const body = {
      id: `twin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name,
      type: input.type,
      category: input.category,
      service: input.service,
      port: input.port,
      metadata: input.attributes ?? {},
      tags: input.tags ?? []
    };
    return request<Twin>(this.cfg, 'POST', '/api/twins', body);
  }

  async get(id: string): Promise<Twin> {
    return request<Twin>(this.cfg, 'GET', `/api/twins/${encodeURIComponent(id)}`);
  }

  async update(id: string, input: UpdateTwinRequest): Promise<Twin> {
    if (input.state !== undefined) {
      return request<Twin>(this.cfg, 'PUT', `/api/twins/${encodeURIComponent(id)}/state`, { data: input.state });
    }
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.metadata !== undefined) body.metadata = input.metadata;
    if (input.tags !== undefined) body.tags = input.tags;
    return request<Twin>(this.cfg, 'PUT', `/api/twins/${encodeURIComponent(id)}`, body);
  }

  async getState(id: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(this.cfg, 'GET', `/api/twins/${encodeURIComponent(id)}/state`);
  }

  async history(id: string): Promise<unknown[]> {
    return request<unknown[]>(this.cfg, 'GET', `/api/twins/sync/history?twinId=${encodeURIComponent(id)}`);
  }

  async link(sourceId: string, targetId: string, type: string): Promise<unknown> {
    return request(this.cfg, 'POST', '/api/twins/relationships', { sourceId, targetId, type });
  }

  async delete(id: string): Promise<void> {
    return request<void>(this.cfg, 'DELETE', `/api/twins/${encodeURIComponent(id)}`);
  }
}
