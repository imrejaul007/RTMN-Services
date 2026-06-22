/**
 * HOJAI Embedding Service - Type Definitions
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: OpenAI embeddings integration for HOJAI Vector
 */

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Single embedding request
 */
export interface EmbedRequest {
  text: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
}

/**
 * Single embedding response
 */
export interface EmbedResponse {
  embedding: number[];
  model: string;
  tokens: number;
}

/**
 * Batch embedding request
 */
export interface BatchEmbedRequest {
  texts: string[];
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
}

/**
 * Batch embedding response
 */
export interface BatchEmbedResponse {
  embeddings: number[][];
  model: string;
  totalTokens: number;
}

/**
 * Available embedding model info
 */
export interface EmbeddingModel {
  id: string;
  name: string;
  dimensions: number;
  description: string;
  maxTokens: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ResponseMeta;
}

/**
 * API error details
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  duration?: number;
}

/**
 * Models list response
 */
export interface ModelsResponse {
  models: EmbeddingModel[];
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * OpenAI embedding result
 */
export interface OpenAIEmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

/**
 * Batch OpenAI embedding result
 */
export interface OpenAIBatchResult {
  embeddings: number[][];
  totalTokens: number;
  model: string;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  port: number;
  openaiApiKey: string;
  nodeEnv: string;
  serviceName: string;
  serviceVersion: string;
  corsOrigins: string[];
}

// ============================================================================
// Validation Schemas (Zod)
// ============================================================================

export const EMBED_MODEL_IDS = ['text-embedding-3-small', 'text-embedding-3-large'] as const;
export type EmbedModelId = typeof EMBED_MODEL_IDS[number];

/**
 * Validation schema for single embed request
 */
export const embedRequestSchema = {
  text: {
    type: 'string' as const,
    minLength: 1,
    maxLength: 8192,
    description: 'Text to embed (max 8192 characters)',
  },
  model: {
    type: 'string' as const,
    enum: EMBED_MODEL_IDS,
    default: 'text-embedding-3-small' as const,
    description: 'Embedding model to use',
  },
};

/**
 * Validation schema for batch embed request
 */
export const batchEmbedRequestSchema = {
  texts: {
    type: 'array' as const,
    minItems: 1,
    maxItems: 100,
    description: 'Array of texts to embed (max 100 items)',
  },
  model: {
    type: 'string' as const,
    enum: EMBED_MODEL_IDS,
    default: 'text-embedding-3-small' as const,
    description: 'Embedding model to use',
  },
};
