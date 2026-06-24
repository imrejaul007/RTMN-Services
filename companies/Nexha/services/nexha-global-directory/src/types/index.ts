/**
 * Global Directory — Type definitions
 *
 * Aggregated data from all 6 federation services into unified search results.
 * The directory is the federation's central search index.
 */

/** Listing kind — what the directory entry represents. */
export type ListingKind = 'nexha' | 'capability' | 'opportunity' | 'data-feed' | 'service';

/** Listing status. */
export type ListingStatus = 'active' | 'pending' | 'deprecated' | 'closed';

/** Trust band (matches ReputationOS). */
export type TrustBand = 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted' | 'unknown';

/** A unified directory listing (one per entity in the federation). */
export interface Listing {
  /** Listing ID (kind-prefixed: nexha-X, cap-X, opp-X, etc.) */
  id: string;
  /** Kind of listing */
  kind: ListingKind;
  /** Display name */
  name: string;
  /** Description (1-3 sentences) */
  description: string;
  /** Owning Nexha (always set) */
  nexhaId: string;
  /** Owning Nexha name (cached for display) */
  nexhaName: string;
  /** Owning Nexha tier (for ranking weight) */
  nexhaTier: 'founding' | 'strategic' | 'standard' | 'associate' | 'observer';
  /** Tags (free-text for matching) */
  tags: string[];
  /** Category (one of: agent, service, product, data, workflow, skill, etc.) */
  category: string;
  /** Region (ISO country code) */
  region: string;
  /** Languages supported (ISO 639-1 codes) */
  languages: string[];
  /** Trust score (ACI 0-1000), or null if unknown */
  aci: number | null;
  /** Trust band */
  band: TrustBand;
  /** Status */
  status: ListingStatus;
  /** Optional price snapshot (for capabilities/services) */
  price?: { amount: number; currency: string; model: string };
  /** Optional budget snapshot (for opportunities) */
  budget?: { amount: number; currency: string; type: string };
  /** Optional URL or reference (for further details) */
  href?: string;
  /** Tags for federation-managed classification */
  classification?: {
    federated: boolean;       // part of a recognized Nexha
    verified: boolean;        // passed verification
    active: boolean;          // currently active
  };
  /** Created/updated timestamps */
  createdAt: string;
  updatedAt: string;
}

/** Directory search query. */
export interface DirectoryQuery {
  /** Free-text search */
  q?: string;
  /** Filter by listing kind */
  kind?: ListingKind;
  /** Filter by category */
  category?: string;
  /** Filter by tags (ALL must match) */
  tags?: string[];
  /** Filter by Nexha */
  nexhaId?: string;
  /** Filter by region (ISO country code) */
  region?: string;
  /** Filter by language */
  language?: string;
  /** Filter by trust band (minimum) */
  minAciBand?: TrustBand;
  /** Only verified listings */
  verifiedOnly?: boolean;
  /** Only active listings */
  activeOnly?: boolean;
  /** Pagination */
  limit?: number;
  offset?: number;
  /** Search algorithm: 'relevance' (text-match) or 'trust' (sorted by ACI) */
  sort?: 'relevance' | 'trust' | 'recent';
}

/** A single search result with explanation. */
export interface DirectoryMatch {
  /** The listing */
  listing: Listing;
  /** Match score 0-1 */
  score: number;
  /** Why this matched (for explainability) */
  reasons: string[];
}

/** Directory search response. */
export interface DirectoryResponse {
  matches: DirectoryMatch[];
  total: number;
  query: DirectoryQuery;
  tookMs: number;
  /** Aggregated breakdown of what was searched */
  breakdown: {
    byKind: Record<ListingKind, number>;
    byNexha: Record<string, number>;
    averageAci: number;
  };
}

/** Federation-wide directory stats. */
export interface DirectoryStats {
  totalListings: number;
  byKind: Record<ListingKind, number>;
  byStatus: Record<ListingStatus, number>;
  byNexha: Array<{ nexhaId: string; nexhaName: string; count: number; tier: string }>;
  byRegion: Array<{ region: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  totalNexhas: number;
  averageAci: number;
  verifiedPercentage: number;
  generatedAt: string;
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  totalListings: number;
  totalNexhas: number;
  timestamp: string;
}