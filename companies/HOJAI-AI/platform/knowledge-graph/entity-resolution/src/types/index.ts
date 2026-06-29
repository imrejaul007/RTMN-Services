/**
 * Entity Resolution Service - Type Definitions
 * Master record management with intelligent entity matching
 */

// Entity Types
export type EntityType = 'person' | 'organization' | 'location' | 'product' | 'event' | 'custom';

export type EntityStatus = 'active' | 'merged' | 'split' | 'archived';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'uncertain';

export type SourceReliability = 'verified' | 'trusted' | 'standard' | 'unverified';

// Core Entity Interfaces
export interface EntityAttribute {
  key: string;
  value: string | number | boolean | string[];
  confidence: number;
  sourceId: string;
  updatedAt: Date;
}

export interface EntitySource {
  sourceId: string;
  sourceName: string;
  reliability: SourceReliability;
  contributedAt: Date;
  lastSyncedAt: Date;
  recordCount: number;
}

export interface EntityAlias {
  aliasId: string;
  canonicalId: string;
  alias: string;
  type: 'exact' | 'fuzzy' | 'phonetic' | 'abbreviation' | 'language_variant';
  confidence: number;
  createdAt: Date;
}

export interface EntityMergeRecord {
  mergeId: string;
  sourceIds: string[];
  targetId: string;
  mergedAt: Date;
  mergedBy: string;
  reason: string;
}

export interface EntityLink {
  linkId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  confidence: number;
  sourceId: string;
  createdAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface Entity {
  id: string;
  canonicalId: string;
  type: EntityType;
  primaryName: string;
  attributes: Record<string, EntityAttribute>;
  aliases: string[];
  sources: string[];
  status: EntityStatus;
  confidence: number;
  reviewStatus: 'approved' | 'pending_review' | 'needs_review';
  linkedEntities: EntityLink[];
  mergedFrom?: string[];
  mergedInto?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// Resolution Request/Response Types
export interface ResolveRequest {
  name: string;
  type?: EntityType;
  attributes?: Record<string, string>;
  sourceId?: string;
  confidenceThreshold?: number;
  blockingStrategy?: BlockingStrategy;
}

export interface ResolveResult {
  resolved: boolean;
  entityId?: string;
  canonicalId?: string;
  confidence: number;
  matchType: MatchConfidence;
  candidateEntities?: CandidateEntity[];
  newEntity?: Partial<Entity>;
}

export interface CandidateEntity {
  entityId: string;
  canonicalId: string;
  primaryName: string;
  similarityScore: number;
  matchDetails: MatchDetails;
}

export interface MatchDetails {
  stringSimilarity: number;
  phoneticSimilarity: number;
  attributeOverlap: number;
  blockingKey: string;
  matchReasons: string[];
}

export interface BatchResolveRequest {
  entities: ResolveRequest[];
  mode?: 'create' | 'link' | 'both';
  confidenceThreshold?: number;
}

export interface BatchResolveResult {
  results: ResolveResult[];
  summary: {
    total: number;
    resolved: number;
    new: number;
    ambiguous: number;
  };
}

// Link Request/Response Types
export interface LinkRequest {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  confidence?: number;
  sourceId?: string;
}

export interface LinkResult {
  linked: boolean;
  linkId?: string;
  confidence: number;
  requiresReview: boolean;
}

// Review Queue Types
export interface ReviewQueueItem {
  id: string;
  type: 'merge_candidate' | 'link_candidate' | 'split_candidate' | 'low_confidence';
  priority: 'high' | 'medium' | 'low';
  entityIds: string[];
  confidence: number;
  reason: string;
  suggestedAction?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

// Algorithm Types
export type BlockingStrategy = 'none' | 'soundex' | 'metaphone' | 'first_n_chars' | 'last_n_chars' | 'token_set';

export interface BlockingKey {
  strategy: BlockingStrategy;
  key: string;
  entityId: string;
}

export interface SimilarityResult {
  score: number;
  algorithm: string;
  details?: Record<string, unknown>;
}

// Configuration Types
export interface ResolutionConfig {
  confidenceThreshold: {
    high: number;
    medium: number;
    low: number;
  };
  algorithmWeights: {
    jaroWinkler: number;
    levenshtein: number;
    jaccard: number;
    soundex: number;
    metaphone: number;
  };
  blockingStrategies: BlockingStrategy[];
  maxCandidates: number;
  reviewThreshold: number;
}

// Database Types
export interface DbEntity {
  id: string;
  canonical_id: string;
  type: string;
  primary_name: string;
  attributes: EntityAttribute[];
  aliases: string[];
  sources: string[];
  status: string;
  confidence: number;
  review_status: string;
  linked_entities: EntityLink[];
  merged_from: string[];
  merged_into: string | null;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, unknown>;
}

export interface DbReviewItem {
  id: string;
  type: string;
  priority: string;
  entity_ids: string[];
  confidence: number;
  reason: string;
  suggested_action: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  status: string;
  notes: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth Types
export interface JwtPayload {
  userId: string;
  role: string;
  permissions: string[];
  exp?: number;
  iat?: number;
}

export interface AuthRequest {
  user?: JwtPayload;
}

// Source tracking
export interface SourceContribution {
  sourceId: string;
  entityId: string;
  field: string;
  value: string;
  contributedAt: Date;
  reliability: SourceReliability;
}

// Statistics
export interface ResolutionStats {
  totalEntities: number;
  byType: Record<EntityType, number>;
  byConfidenceLevel: Record<MatchConfidence, number>;
  pendingReviews: number;
  averageConfidence: number;
  topSources: { sourceId: string; count: number }[];
}