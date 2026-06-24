/**
 * TwinOS Module
 *
 * Digital twins for every entity: customers, products, suppliers, orders,
 * machines, employees, etc. Twins track state, relationships, and history.
 */

import type { HojaiConfig } from './config.js';
import { request, buildUrl } from './utils.js';

export type TwinType = 'customer' | 'product' | 'supplier' | 'order' | 'machine' | 'employee' | 'company' | 'device' | 'invoice' | 'shipment' | 'contract';

export interface Twin {
  id: string;
  type: TwinType;
  ownerCorpId: string;
  state: Record<string, unknown>;
  attributes: Record<string, unknown>;
  relationships: { targetTwinId: string; type: string; metadata?: Record<string, unknown> }[];
  history: TwinEvent[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface TwinEvent {
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
  source?: string;
}

export interface CreateTwinRequest {
  type: TwinType;
  ownerCorpId: string;
  state?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  relatedTwinIds?: string[];
}

export interface UpdateTwinRequest {
  state?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  operation?: string;
}

export class TwinClient {
  constructor(private config: HojaiConfig) {}

  /**
   * Create a new twin
   */
  async create(input: CreateTwinRequest): Promise<Twin> {
    return request<Twin>(this.config, 'POST', '/api/v1/twins', input);
  }

  /**
   * Get a twin by id
   */
  async get(id: string): Promise<Twin> {
    return request<Twin>(this.config, 'GET', `/api/v1/twins/${encodeURIComponent(id)}`);
  }

  /**
   * Update a twin (records event in history)
   */
  async update(id: string, input: UpdateTwinRequest): Promise<Twin> {
    return request<Twin>(this.config, 'PATCH', `/api/v1/twins/${encodeURIComponent(id)}`, input);
  }

  /**
   * Link two twins together
   */
  async link(id: string, targetId: string, type: string, metadata?: Record<string, unknown>): Promise<Twin> {
    return request<Twin>(this.config, 'POST', `/api/v1/twins/${encodeURIComponent(id)}/link`, { targetId, type, metadata });
  }

  /**
   * Get twin history
   */
  async history(id: string, options: { since?: string; limit?: number } = {}): Promise<TwinEvent[]> {
    return request<TwinEvent[]>(this.config, 'GET', buildUrl(this.config.baseUrl, `/api/v1/twins/${encodeURIComponent(id)}/history`, options));
  }
}
