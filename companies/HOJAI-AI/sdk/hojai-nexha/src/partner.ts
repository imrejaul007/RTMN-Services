/**
 * Nexha Partner Graph Client
 *
 * Wraps nexha-partner-graph: partner relationships, interactions,
 * partner recommendations.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type RelationshipType = 'supplier' | 'distributor' | 'customer' | 'investor' | 'partner' | 'competitor';

export interface Partner {
  id: string;
  tenantId: string;
  partnerRef: string;
  name: string;
  relationshipType: RelationshipType;
  capabilities: string[];
  industries: string[];
  trustScore: number;
  interactionCount: number;
  lastInteractionAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Interaction {
  id: string;
  tenantId: string;
  partnerRef: string;
  type: 'rfq' | 'order' | 'message' | 'meeting' | 'contract' | 'payment';
  direction: 'inbound' | 'outbound';
  outcome?: 'positive' | 'neutral' | 'negative';
  notes?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface InteractionInput {
  partnerRef: string;
  type: Interaction['type'];
  direction: Interaction['direction'];
  outcome?: Interaction['outcome'];
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface RecommendRequest {
  tenantId: string;
  requiredCapabilities: string[];
  industries?: string[];
  relationshipType?: RelationshipType;
  limit?: number;
}

export interface RecommendResult {
  partnerRef: string;
  name: string;
  matchScore: number;
  reasons: string[];
}

export class PartnerClient {
  constructor(private config: HojaiConfig) {}

  async recordInteraction(input: InteractionInput): Promise<Interaction> {
    return request<Interaction>(this.config, 'POST', '/api/interactions', input);
  }

  async listInteractions(input: { partnerRef?: string; type?: Interaction['type']; limit?: number } = {}): Promise<Interaction[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Interaction[]>(this.config, 'GET', `/api/interactions?${params.toString()}`);
  }

  async listPartners(input: { relationshipType?: RelationshipType; capability?: string; limit?: number } = {}): Promise<Partner[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Partner[]>(this.config, 'GET', `/api/partners?${params.toString()}`);
  }

  async listPartnersByType(relationshipType: RelationshipType): Promise<Partner[]> {
    return request<Partner[]>(this.config, 'GET', `/api/partners/by-type/${encodeURIComponent(relationshipType)}`);
  }

  async getPartner(partnerRef: string): Promise<Partner> {
    return request<Partner>(this.config, 'GET', `/api/partners/${encodeURIComponent(partnerRef)}`);
  }

  async recommend(input: RecommendRequest): Promise<RecommendResult[]> {
    return request<RecommendResult[]>(this.config, 'POST', '/api/recommend', input);
  }

  async stats(): Promise<{ totalPartners: number; totalInteractions: number; byType: Record<RelationshipType, number> }> {
    return request(this.config, 'GET', '/api/stats');
  }
}