// ============================================================================
// SUTAR Discovery Engine - Type Definitions
// ============================================================================

// Entity Types
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type EntityCategory = 'agent' | 'service' | 'product' | 'solution' | 'provider';
export type AgentCapability = 'reasoning' | 'execution' | 'analysis' | 'creation' | 'communication' | 'coordination' | 'automation' | 'learning';
export type TrustLevel = 'verified' | 'trusted' | 'standard' | 'new' | 'unverified';
export type SortOrder = 'asc' | 'desc';
export type RankingCriteria = 'trust' | 'rating' | 'price' | 'relevance' | 'activity';

// Entity Interface
export interface Entity {
  id: string;
  name: string;
  type: EntityCategory;
  description: string;
  capabilities: AgentCapability[];
  skills: string[];
  category: string;
  subcategory?: string;
  tags: string[];
  status: EntityStatus;
  location?: Location;
  trustLevel: TrustLevel;
  trustScore: number;
  rating: number;
  reviewCount: number;
  priceRange?: PriceRange;
  hourlyRate?: number;
  subscriptionPrice?: number;
  completedTasks: number;
  successRate: number;
  responseTime?: number;
  availability?: string;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastActive: string;
  verifiedAt?: string;
}

// Location
export interface Location {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Price Range
export interface PriceRange {
  min: number;
  max: number;
  currency: string;
  unit?: 'hourly' | 'daily' | 'monthly' | 'per-task' | 'subscription';
}

// Search Request/Response
export interface SearchRequest {
  query: string;
  categories?: EntityCategory[];
  capabilities?: AgentCapability[];
  location?: Partial<Location>;
  priceRange?: PriceRange;
  minRating?: number;
  trustLevel?: TrustLevel[];
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: RankingCriteria;
  sortOrder?: SortOrder;
}

export interface SearchResult {
  entities: Entity[];
  total: number;
  limit: number;
  offset: number;
  query: string;
  facets: SearchFacets;
}

export interface SearchFacets {
  categories: Record<string, number>;
  capabilities: Record<string, number>;
  locations: Record<string, number>;
  priceRanges: Record<string, number>;
  trustLevels: Record<string, number>;
}

// Discover Request/Response
export interface DiscoverRequest {
  category?: EntityCategory;
  capabilities?: AgentCapability[];
  location?: Partial<Location>;
  limit?: number;
  offset?: number;
  featured?: boolean;
  trending?: boolean;
}

export interface DiscoverResult {
  entities: Entity[];
  total: number;
  category: string;
  featured?: Entity[];
  trending?: Entity[];
}

// Match Request/Response
export interface MatchRequest {
  requiredCapabilities: AgentCapability[];
  preferredCapabilities?: AgentCapability[];
  skills?: string[];
  location?: Partial<Location>;
  maxPrice?: number;
  minRating?: number;
  limit?: number;
}

export interface MatchResult {
  matches: MatchedEntity[];
  total: number;
  matchCriteria: {
    requiredCapabilities: AgentCapability[];
    preferredCapabilities?: AgentCapability[];
    skills?: string[];
  };
}

export interface MatchedEntity extends Entity {
  matchScore: number;
  capabilityMatch: number;
  skillMatch: number;
  priceMatch: number;
  locationMatch: number;
  reason: string;
}

// Rank Request/Response
export interface RankRequest {
  entityIds: string[];
  criteria: RankingCriteria[];
  weights?: Record<RankingCriteria, number>;
}

export interface RankResult {
  rankings: RankedEntity[];
}

export interface RankedEntity extends Entity {
  scores: Record<RankingCriteria, number>;
  totalScore: number;
  rank: number;
}

// Suggest Request/Response
export interface SuggestRequest {
  query?: string;
  context?: string;
  history?: string[];
  limit?: number;
  type?: 'search' | 'category' | 'capability' | 'location';
}

export interface SuggestResult {
  suggestions: Suggestion[];
  type: string;
}

export interface Suggestion {
  type: 'entity' | 'category' | 'capability' | 'location' | 'tag';
  value: string;
  label: string;
  count?: number;
  score?: number;
}

// Config
export interface Config {
  port: number;
  environment: string;
  logLevel: string;
  agentNetworkUrl: string;
  trustEngineUrl: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

// Health Response
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  dependencies: DependencyHealth[];
}

export interface DependencyHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  error?: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Integration Types
export interface AgentNetworkAgent {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: AgentCapability[];
  skills: string[];
  status: string;
  rating: number;
  completedTasks: number;
  successRate: number;
  hourlyRate?: number;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastActive: string;
}

export interface TrustProfile {
  entityId: string;
  trustScore: number;
  trustLevel: TrustLevel;
  verificationStatus: string;
  riskLevel: string;
  lastVerified: string;
}
