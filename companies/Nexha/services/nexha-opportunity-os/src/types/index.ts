/**
 * OpportunityOS — Type definitions
 *
 * An opportunity is a demand-side posting: "I need X". OpportunityOS
 * matches opportunities against the federation's capabilities (CapabilityOS)
 * filtered by trust (ReputationOS) and membership (FederationOS).
 */

/** Opportunity lifecycle. */
export type OpportunityStatus = 'open' | 'in-progress' | 'closed' | 'cancelled' | 'expired';

/** Opportunity kind. */
export type OpportunityKind =
  | 'rfq'             // Request for Quote
  | 'job'             // One-off job / project
  | 'subscription'    // Recurring need
  | 'partnership'     // Strategic partnership
  | 'data-request'    // Data feed or analytics query
  | 'support'         // Customer support ticket
  | 'integration';    // API/tech integration

/** Priority level. */
export type OpportunityPriority = 'low' | 'normal' | 'high' | 'urgent';

/** A posted opportunity (demand). */
export interface Opportunity {
  id: string;
  /** Title (1 line) */
  title: string;
  /** Description (markdown OK) */
  description: string;
  /** What kind of opportunity */
  kind: OpportunityKind;
  /** Required capability categories (any-of) */
  requiredCategories: string[];
  /** Tags that describe the need */
  requiredTags: string[];
  /** Region (ISO country code) */
  region: string;
  /** Preferred language (ISO 639-1) */
  language?: string;
  /** Budget range */
  budget: {
    amount: number;
    currency: string;
    type: 'fixed' | 'hourly' | 'per-unit' | 'quote';
  };
  /** Priority */
  priority: OpportunityPriority;
  /** Status */
  status: OpportunityStatus;
  /** Posting Nexha (the buyer / consumer) */
  postedByNexhaId: string;
  /** Posted by entity within that Nexha (optional) */
  postedByEntityId?: string;
  /** When this opportunity closes for submissions */
  closesAt?: string;
  /** Created / updated timestamps */
  createdAt: string;
  updatedAt: string;
  /** How many bids / proposals were received */
  bidsReceived: number;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** A capability that matches an opportunity. */
export interface CapabilityMatch {
  /** Reference to the capability (id only) */
  capabilityId: string;
  /** Nexha that owns this capability */
  nexhaId: string;
  /** Nexha name (cached for display) */
  nexhaName: string;
  /** Capability name + category */
  capabilityName: string;
  capabilityCategory: string;
  /** Match score (0-1) */
  matchScore: number;
  /** Trust score of the offering Nexha (ACI 0-1000) */
  aci: number | null;
  /** Trust band */
  band: string;
  /** Final score = matchScore × (1 + trustBoost × aci/1000) */
  finalScore: number;
  /** Estimated value (budget overlap with capability pricing) */
  budgetFit: 'under' | 'within' | 'over' | 'unknown';
  /** Why this matched */
  reasons: string[];
  /** Pricing snapshot */
  pricing?: { model: string; amount?: number; currency?: string };
}

/** Match result for an opportunity. */
export interface OpportunityMatch {
  /** The opportunity */
  opportunity: Opportunity;
  /** Ranked capabilities that could fulfill it */
  matches: CapabilityMatch[];
  /** Total candidates considered */
  totalCandidates: number;
  /** How long the match took */
  tookMs: number;
}

/** Federation-wide opportunity stats. */
export interface OpportunityStats {
  totalOpportunities: number;
  byKind: Record<OpportunityKind, number>;
  byStatus: Record<OpportunityStatus, number>;
  totalBids: number;
  openCount: number;
  averageBudgetByCurrency: Record<string, number>;
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  opportunities: number;
  totalBids: number;
  timestamp: string;
}