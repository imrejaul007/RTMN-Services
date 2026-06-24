/**
 * Discovery SDK — Client for Nexha DiscoveryOS (port 4272).
 *
 * Federated search across CapabilityOS + ReputationOS with trust-boost ranking.
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

/** Mirrors Nexha DiscoveryOS Capability shape. */
export interface Capability {
  id: string;
  nexhaId: string;
  ownerId?: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  pricing: { model: string; amount?: number; currency?: string };
  trust: { verified: boolean; kycLevel: string; insurance?: number };
  regions: string[];
  languages: string[];
  slaMs?: number;
  status: string;
}

export interface TrustScore {
  subjectId: string;
  aci: number;
  band: string;
}

export interface DiscoveryQuery {
  q?: string;
  category?: string;
  tags?: string[];
  nexhaId?: string;
  region?: string;
  language?: string;
  minAciBand?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted' | 'any';
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
  trustBoost?: number;
}

export interface DiscoveryResult {
  capability: Capability;
  matchScore: number;
  aci: number | null;
  band: string;
  finalScore: number;
  reasons: string[];
}

export interface DiscoveryResponse {
  results: DiscoveryResult[];
  total: number;
  query: DiscoveryQuery;
  tookMs: number;
  searchedNexhas: string[];
  cached: boolean;
}

export class DiscoveryClient {
  constructor(private config: HojaiConfig) {}

  /** Search for capabilities (POST body). */
  async discover(query: DiscoveryQuery): Promise<DiscoveryResponse> {
    const response = await request<{ success: boolean; data: DiscoveryResponse }>(
      this.config, 'POST', '/api/v1/discover', query
    );
    return response.data;
  }

  /** Index/refresh a single capability in the discovery service. */
  async index(capability: Capability, trust: TrustScore | null): Promise<{ indexed: boolean; capabilityId: string }> {
    const response = await request<{ success: boolean; data: { indexed: boolean; capabilityId: string } }>(
      this.config, 'POST', '/api/v1/index', { capability, trust }
    );
    return response.data;
  }

  /** Bulk index (max 500). */
  async bulkIndex(entries: Array<{ capability: Capability; trust: TrustScore | null }>): Promise<{ indexed: number }> {
    const response = await request<{ success: boolean; data: { indexed: number } }>(
      this.config, 'POST', '/api/v1/index/bulk', { entries }
    );
    return response.data;
  }

  /** Get one indexed capability. */
  async getIndexed(capabilityId: string): Promise<Capability & { trust: TrustScore | null; indexedAt: string }> {
    const response = await request<{ success: boolean; data: Capability & { trust: TrustScore | null; indexedAt: string } }>(
      this.config, 'GET', `/api/v1/index/${encodeURIComponent(capabilityId)}`
    );
    return response.data;
  }

  /** Remove a capability from the index. */
  async remove(capabilityId: string): Promise<{ removed: boolean }> {
    const response = await request<{ success: boolean; data: { removed: boolean } }>(
      this.config, 'DELETE', `/api/v1/index/${encodeURIComponent(capabilityId)}`
    );
    return response.data;
  }

  /** Get index stats. */
  async stats(): Promise<{ capabilities: number; nexhas: number; scored: number }> {
    const response = await request<{ success: boolean; data: { capabilities: number; nexhas: number; scored: number } }>(
      this.config, 'GET', '/api/v1/stats'
    );
    return response.data;
  }
}

export class Discovery {
  readonly discovery: DiscoveryClient;
  readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.discovery = new DiscoveryClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as DiscoveryHttpError } from './utils.js';
export default Discovery;