/**
 * Nexha Supplier Network Client
 *
 * Wraps nexha-supplier-network: supplier discovery, registration,
 * capability matching for B2B procurement.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  capabilities: string[];
  industries: string[];
  location?: { country: string; city?: string };
  rating: number;
  trustScore: number;
  metadata?: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierInput {
  tenantId?: string;
  name: string;
  category: string;
  capabilities: string[];
  industries: string[];
  location?: { country: string; city?: string };
  metadata?: Record<string, unknown>;
}

export class SupplierClient {
  constructor(private config: HojaiConfig) {}

  async search(input: { query?: string; category?: string; industry?: string; capability?: string; country?: string; limit?: number }): Promise<Supplier[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Supplier[]>(this.config, 'GET', `/api/v1/suppliers?${params.toString()}`);
  }

  async get(id: string): Promise<Supplier> {
    return request<Supplier>(this.config, 'GET', `/api/v1/suppliers/${encodeURIComponent(id)}`);
  }

  async register(input: SupplierInput): Promise<Supplier> {
    return request<Supplier>(this.config, 'POST', '/api/v1/suppliers', input);
  }

  async update(id: string, patch: Partial<SupplierInput>): Promise<Supplier> {
    return request<Supplier>(this.config, 'PATCH', `/api/v1/suppliers/${encodeURIComponent(id)}`, patch);
  }

  async deactivate(id: string): Promise<Supplier> {
    return request<Supplier>(this.config, 'DELETE', `/api/v1/suppliers/${encodeURIComponent(id)}`);
  }
}