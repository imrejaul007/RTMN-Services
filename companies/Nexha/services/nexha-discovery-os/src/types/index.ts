/**
 * DiscoveryOS — Type definitions
 *
 * A discovery query searches across federated Nexhas. Results combine
 * capability matching (from CapabilityOS) with trust scoring (from ReputationOS).
 */

/** Capability — local mirror of CapabilityOS shape. */
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

/** Trust score — local mirror of ReputationOS ACI. */
export interface TrustScore {
  subjectId: string;
  aci: number;        // 0-1000
  band: string;       // platinum/gold/silver/bronze/iron/restricted
}

/** Discovery query — what a consumer wants. */
export interface DiscoveryQuery {
  q?: string;
  category?: string;
  tags?: string[];
  nexhaId?: string;
  region?: string;
  language?: string;
  /** Max ACI trust band required (gold = 800+, silver = 700+, etc.) */
  minAciBand?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted' | 'any';
  /** Only verified capabilities */
  verifiedOnly?: boolean;
  /** Pagination */
  limit?: number;
  offset?: number;
  /** Boost trusted results by this factor (default 0.3 = +30% boost) */
  trustBoost?: number;
}

/** Discovery result — capability + trust + final score. */
export interface DiscoveryResult {
  capability: Capability;
  /** Raw capability match score (0-1) */
  matchScore: number;
  /** ACI trust score (0-1000), or null if unknown */
  aci: number | null;
  /** Trust band */
  band: string;
  /** Final ranking score = matchScore × (1 + trustBoost × aci/1000) */
  finalScore: number;
  /** Explainability */
  reasons: string[];
}

/** Discovery response. */
export interface DiscoveryResponse {
  results: DiscoveryResult[];
  total: number;
  query: DiscoveryQuery;
  tookMs: number;
  /** Which Nexhas were searched */
  searchedNexhas: string[];
  /** Cache hit indicator */
  cached: boolean;
}

/** Indexed capability + trust — internal cache shape. */
export interface IndexedCapability {
  capability: Capability;
  trust: TrustScore | null;
  indexedAt: string;
}

/** Discovery source — which backend provided this data. */
export type DiscoverySource = 'capability-os' | 'reputation-os' | 'local-cache' | 'federated';

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  indexedCapabilities: number;
  cachedNexhas: number;
  timestamp: string;
}