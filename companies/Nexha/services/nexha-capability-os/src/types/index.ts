/**
 * CapabilityOS — Type definitions
 *
 * A capability is anything a Nexha offers to the federation:
 * skills, services, products, agents, data feeds, etc.
 */

/** Top-level categories of capabilities a Nexha can offer. */
export type CapabilityCategory =
  | 'skill'           // executable SkillOS skill
  | 'service'         // B2B service (consulting, fulfillment, support)
  | 'product'         // tangible good or SKU
  | 'agent'           // SUTAR agent that can be invoked cross-Nexha
  | 'data'            // data feed (prices, inventory, ratings)
  | 'workflow'        // multi-step workflow template
  | 'integration'     // connector to external API (CRM, ERP, etc.)
  | 'content';        // content (article, video, course)

/** Capability shape — what a Nexha offers. */
export interface Capability {
  id: string;
  /** Owning Nexha (federation participant) */
  nexhaId: string;
  /** Owning entity within the Nexha (optional) */
  ownerId?: string;
  /** Display name */
  name: string;
  /** Short description (1-2 sentences) */
  description: string;
  /** Long description (markdown OK) */
  longDescription?: string;
  /** Category */
  category: CapabilityCategory;
  /** Tags for matching */
  tags: string[];
  /** Pricing model */
  pricing: {
    model: 'free' | 'per-call' | 'per-hour' | 'per-transaction' | 'subscription' | 'quote';
    amount?: number;
    currency?: string;
    unit?: string;
  };
  /** Trust signals */
  trust: {
    verified: boolean;
    kycLevel: 'none' | 'basic' | 'full';
    insurance?: number;
  };
  /** Geographic coverage (ISO country codes) */
  regions: string[];
  /** Languages supported (ISO 639-1 codes) */
  languages: string[];
  /** SLA — expected response time in ms */
  slaMs?: number;
  /** Status */
  status: 'active' | 'draft' | 'deprecated';
  /** Created / updated */
  createdAt: string;
  updatedAt: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** Capability query — what a consumer needs. */
export interface CapabilityQuery {
  /** Free-text search */
  q?: string;
  /** Filter by category */
  category?: CapabilityCategory;
  /** Filter by tags (must have ALL) */
  tags?: string[];
  /** Filter by Nexha */
  nexhaId?: string;
  /** Filter by region */
  region?: string;
  /** Filter by language */
  language?: string;
  /** Max price (when pricing.amount is set) */
  maxPrice?: number;
  /** Currency for maxPrice */
  currency?: string;
  /** Only verified */
  verifiedOnly?: boolean;
  /** Min trust level (numeric score 0-100, if computed externally) */
  minTrust?: number;
  /** Pagination */
  limit?: number;
  offset?: number;
}

/** Capability match result. */
export interface CapabilityMatch {
  capability: Capability;
  /** Match score 0-1 (higher = better match) */
  score: number;
  /** Why this matched (for explainability) */
  reasons: string[];
}

/** Search response. */
export interface CapabilitySearchResult {
  matches: CapabilityMatch[];
  total: number;
  query: CapabilityQuery;
  took_ms: number;
}

/** Statistics for a Nexha's capability catalog. */
export interface NexhaCapabilityStats {
  nexhaId: string;
  totalCapabilities: number;
  byCategory: Record<CapabilityCategory, number>;
  byStatus: Record<Capability['status'], number>;
  verifiedCount: number;
  lastUpdated?: string;
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  capabilities: number;
  timestamp: string;
}