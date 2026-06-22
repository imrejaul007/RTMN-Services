/**
 * Shared types for HOJAI RAG pipeline
 * Version: 1.0.0 | Date: June 2, 2026
 */

/**
 * Document to be chunked and indexed
 */
export interface Document {
  /** Unique document identifier */
  id: string;
  /** Document text content */
  text: string;
  /** Document metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Chunked text segment
 */
export interface Chunk {
  /** Unique chunk identifier */
  id: string;
  /** Chunk text content */
  text: string;
  /** Embedding vector */
  embedding: number[];
  /** Chunk metadata */
  metadata: ChunkMetadata;
}

/**
 * Metadata for a chunk
 */
export interface ChunkMetadata {
  /** Source document ID */
  documentId: string;
  /** Start position in source document */
  startPosition?: number;
  /** End position in source document */
  endPosition?: number;
  /** Page number (for PDFs) */
  page?: number;
  /** Source URL or file path */
  source?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Chunking strategy options
 */
export type ChunkStrategy = 'fixed' | 'sentence' | 'paragraph' | 'semantic';

/**
 * Configuration for chunking
 */
export interface ChunkOptions {
  /** Chunking strategy */
  strategy: ChunkStrategy;
  /** Target chunk size in characters */
  chunkSize: number;
  /** Overlap between chunks */
  overlap: number;
  /** Minimum chunk size */
  minChunkSize: number;
}

/**
 * Search result from hybrid search
 */
export interface SearchResult {
  /** Unique result identifier */
  id: string;
  /** Result text content */
  text: string;
  /** Result metadata */
  metadata: Record<string, unknown>;
  /** Hybrid score (RRF combined) */
  score: number;
  /** Vector similarity score */
  vectorScore?: number;
  /** BM25 score */
  bm25Score?: number;
}

/**
 * Configuration for hybrid search
 */
export interface HybridSearchConfig {
  /** RRF k parameter */
  rrfK?: number;
  /** Weight for vector scores */
  vectorWeight?: number;
  /** Weight for BM25 scores */
  bm25Weight?: number;
}

/**
 * Re-ranked search result
 */
export interface RerankedResult extends SearchResult {
  /** Cross-encoder relevance score */
  crossEncoderScore: number;
  /** Combined final score */
  finalScore: number;
  /** Rank after re-ranking */
  rank: number;
}

/**
 * Citation for source attribution
 */
export interface Citation {
  /** Source chunk ID */
  chunkId: string;
  /** Citation text/phrase */
  text: string;
  /** Source identifier */
  source: string;
  /** Page number if applicable */
  page?: number;
  /** Start index in answer */
  startIndex: number;
  /** End index in answer */
  endIndex: number;
  /** Confidence score */
  confidence: number;
}

/**
 * Result from citation engine
 */
export interface CitationResult {
  /** Formatted answer with citations */
  formattedAnswer: string;
  /** Extracted citations */
  citations: Citation[];
  /** Unique source list */
  sources: string[];
}

/**
 * Query expansion result
 */
export interface ExpansionResult {
  /** Original query */
  originalQuery: string;
  /** Expanded queries including synonyms and related terms */
  expandedQueries: string[];
  /** LLM-generated alternative phrasings */
  alternatives?: string[];
}

/**
 * Context building result
 */
export interface ContextResult {
  /** Combined context content */
  content: string;
  /** Token count of context */
  tokenCount: number;
  /** Chunks included in context */
  includedChunks: Chunk[];
  /** Truncation indicator */
  truncated: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay in ms */
  initialDelayMs: number;
  /** Maximum delay in ms */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * LLM Provider interface for generation
 */
export interface LLMProvider {
  /**
   * Generate a chat completion
   * @param messages - Array of messages
   * @returns Generated response content
   */
  chat(messages: Array<{ role: string; content: string }>): Promise<string>;
  /**
   * Generate embeddings for text
   * @param text - Text to embed
   * @returns Embedding vector
   */
  embed(text: string): Promise<number[]>;
}
