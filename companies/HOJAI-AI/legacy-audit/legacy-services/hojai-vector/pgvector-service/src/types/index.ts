/**
 * HOJAI pgvector Service - Type Definitions
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Vector storage and similarity search types
 */

// ============================================================================
// Vector Record Types
// ============================================================================

export interface VectorRecord {
  id: string;
  namespace: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface VectorInsert {
  id?: string;
  namespace: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorUpdate {
  namespace?: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchRequest {
  embedding: number[];
  limit?: number;
  threshold?: number;
  namespace?: string;
  includeMetadata?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  namespace: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: number[];
  total: number;
  took_ms: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    [key: string]: unknown;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks?: Record<string, HealthCheckResult>;
}

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'degraded';
  latency_ms?: number;
  message?: string;
}

// ============================================================================
// Namespace Types
// ============================================================================

export interface NamespaceStats {
  namespace: string;
  count: number;
  dimensions: number;
  created_at: string;
  last_updated: string;
}

export interface NamespaceListResponse {
  namespaces: NamespaceStats[];
  total: number;
}

// ============================================================================
// Batch Operation Types
// ============================================================================

export interface BatchInsertRequest {
  vectors: VectorInsert[];
  namespace?: string;
}

export interface BatchInsertResponse {
  inserted: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
  ids: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type EmbeddingVector = number[];

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ListVectorsParams extends PaginationParams {
  namespace?: string;
  includeMetadata?: boolean;
}

// Validation constants
export const EMBEDDING_DIMENSIONS = {
  OPENAI_ADA_002: 1536,
  OPENAI_TEXT_EMBEDDING_3_LARGE: 3072,
  COHERE_EMBED_EN: 1024,
  DEFAULT: 1536,
} as const;

export const VECTOR_LIMITS = {
  MAX_DIMENSIONS: 16384,
  MIN_DIMENSIONS: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 1000,
} as const;

export const SIMILARITY_METRICS = {
  COSINE: 'cosine',
  EUCLIDEAN: 'euclidean',
  DOT_PRODUCT: 'dot_product',
} as const;

export type SimilarityMetric = typeof SIMILARITY_METRICS[keyof typeof SIMILARITY_METRICS];
