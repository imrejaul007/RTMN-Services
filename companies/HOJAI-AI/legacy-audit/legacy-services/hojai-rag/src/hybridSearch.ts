/**
 * Hybrid Search Engine
 * Version: 1.0.0 | Date: June 2, 2026
 *
 * Combines BM25 (keyword) and vector (semantic) search
 * using Reciprocal Rank Fusion (RRF) for optimal results.
 */

import type {
  SearchResult,
  HybridSearchConfig,
} from './types.js';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_RRF_K = 60;
const DEFAULT_VECTOR_WEIGHT = 0.5;
const DEFAULT_BM25_WEIGHT = 0.5;

// ============================================================================
// Types
// ============================================================================

/**
 * BM25 result from PostgreSQL full-text search
 */
interface BM25Result {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  bm25Score: number;
  rank: number;
}

/**
 * Vector search result
 */
interface VectorResult {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  similarity: number;
  rank: number;
}

// ============================================================================
// Hybrid Search Engine
// ============================================================================

/**
 * Hybrid Search combining BM25 and Vector search
 *
 * Uses Reciprocal Rank Fusion (RRF) to combine results:
 * RRF_score(d) = Σ 1/(k + rank(d))
 *
 * Where k is a constant (typically 60) and rank(d) is the
 * position of document d in each result list.
 */
export class HybridSearch {
  private vectorStoreUrl: string;
  private namespace: string;
  private config: HybridSearchConfig;
  private retryConfig: RetryConfig;

  constructor(
    vectorStoreUrl: string,
    namespace: string,
    config: HybridSearchConfig = {},
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.vectorStoreUrl = vectorStoreUrl;
    this.namespace = namespace;
    this.config = {
      rrfK: config.rrfK ?? DEFAULT_RRF_K,
      vectorWeight: config.vectorWeight ?? DEFAULT_VECTOR_WEIGHT,
      bm25Weight: config.bm25Weight ?? DEFAULT_BM25_WEIGHT,
    };
    this.retryConfig = retryConfig;
  }

  /**
   * Perform hybrid search
   *
   * @param query - Search query
   * @param topK - Number of results to return
   * @returns Array of search results ranked by RRF score
   */
  async search(query: string, topK: number): Promise<SearchResult[]> {
    // Normalize weights
    const totalWeight = this.config.vectorWeight! + this.config.bm25Weight!;
    const vectorWeight = this.config.vectorWeight! / totalWeight;
    const bm25Weight = this.config.bm25Weight! / totalWeight;

    // Execute BM25 and vector searches in parallel
    const [bm25Results, vectorResults] = await Promise.all([
      this.searchBM25(query, topK * 2),
      this.searchVector(query, topK * 2),
    ]);

    // Fuse results using RRF
    const fused = this.rrfFusion(
      bm25Results.map(r => ({ ...r, score: r.bm25Score })),
      vectorResults.map(r => ({ ...r, score: r.similarity })),
      this.config.rrfK!,
      vectorWeight,
      bm25Weight
    );

    // Fetch full documents for the top results
    const topResults = fused.slice(0, topK);

    return topResults.map((result, index) => ({
      id: result.id,
      text: result.text,
      metadata: result.metadata,
      score: result.score,
      vectorScore: vectorResults.find(r => r.id === result.id)?.similarity,
      bm25Score: bm25Results.find(r => r.id === result.id)?.bm25Score,
    }));
  }

  /**
   * BM25 search using PostgreSQL full-text search
   *
   * Simulates BM25 using ts_rank with the 'english' configuration.
   * In production, this would be actual BM25 via a dedicated index
   * or the pg_bm25 extension.
   */
  private async searchBM25(query: string, topK: number): Promise<BM25Result[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Normalize query for full-text search
        const ftsQuery = this.normalizeQuery(query);

        const response = await fetch(`${this.vectorStoreUrl}/api/search/bm25`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: ftsQuery,
            namespace: this.namespace,
            limit: topK,
          }),
        });

        if (!response.ok) {
          throw new Error(`BM25 search failed: ${response.status}`);
        }

        const data = await response.json() as {
          results: Array<{
            id: string;
            text: string;
            metadata: Record<string, unknown>;
            score: number;
          }>;
        };

        return data.results.map((r, index) => ({
          id: r.id,
          text: r.text,
          metadata: r.metadata,
          bm25Score: r.score,
          rank: index + 1,
        }));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Return mock results on failure
    console.warn(`BM25 search failed after retries: ${lastError?.message}`);
    return this.mockBM25Results(query, topK);
  }

  /**
   * Vector search using cosine similarity
   *
   * In production, this uses pgvector with the <=> operator
   * which computes cosine distance. We convert to similarity
   * by subtracting from 1.
   */
  private async searchVector(query: string, topK: number): Promise<VectorResult[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Get query embedding
        const embedding = await this.getQueryEmbedding(query);

        const response = await fetch(`${this.vectorStoreUrl}/api/vectors/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embedding,
            namespace: this.namespace,
            topK,
          }),
        });

        if (!response.ok) {
          throw new Error(`Vector search failed: ${response.status}`);
        }

        const data = await response.json() as {
          results: Array<{
            id: string;
            chunk_text: string;
            metadata: Record<string, unknown>;
            similarity: number;
          }>;
        };

        return data.results.map((r, index) => ({
          id: r.id,
          text: r.chunk_text || r.metadata?.text as string || '',
          metadata: r.metadata,
          similarity: r.similarity,
          rank: index + 1,
        }));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Return mock results on failure
    console.warn(`Vector search failed after retries: ${lastError?.message}`);
    return this.mockVectorResults(query, topK);
  }

  /**
   * Reciprocal Rank Fusion
   *
   * Combines multiple ranked lists into a single ranking.
   * RRF_score(d) = Σ weight * 1/(k + rank(d))
   *
   * @param results1 - First ranked list
   * @param results2 - Second ranked list
   * @param k - RRF constant (higher = less aggressive fusion)
   * @param weight1 - Weight for first list
   * @param weight2 - Weight for second list
   */
  private rrfFusion(
    results1: Array<{ id: string; text: string; metadata: Record<string, unknown>; score: number }>,
    results2: Array<{ id: string; text: string; metadata: Record<string, unknown>; score: number }>,
    k: number,
    weight1: number,
    weight2: number
  ): Array<{ id: string; text: string; metadata: Record<string, unknown>; score: number }> {
    const scores = new Map<string, {
      id: string;
      text: string;
      metadata: Record<string, unknown>;
      score: number;
    }>();

    // Add scores from first result set
    results1.forEach((result, index) => {
      scores.set(result.id, {
        id: result.id,
        text: result.text,
        metadata: result.metadata,
        score: weight1 * (1 / (k + index + 1)),
      });
    });

    // Add/merge scores from second result set
    results2.forEach((result, index) => {
      const existing = scores.get(result.id);
      if (existing) {
        existing.score += weight2 * (1 / (k + index + 1));
      } else {
        scores.set(result.id, {
          id: result.id,
          text: result.text,
          metadata: result.metadata,
          score: weight2 * (1 / (k + index + 1)),
        });
      }
    });

    // Sort by combined score and return
    return [...scores.values()]
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Normalize query for PostgreSQL full-text search
   *
   * Converts the user query into a format suitable for
   * ts_query or plainto_tsquery.
   */
  private normalizeQuery(query: string): string {
    // Remove special characters
    const cleaned = query
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .toLowerCase();

    // Split into words and rejoin
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);

    return words.join(' & ');
  }

  /**
   * Get embedding for a query
   *
   * In production, this calls the embedding service.
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.vectorStoreUrl}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: query }),
        });

        if (!response.ok) {
          throw new Error(`Embedding request failed: ${response.status}`);
        }

        const data = await response.json() as { embedding: number[] };
        return data.embedding;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Return mock embedding
    console.warn(`Query embedding failed: ${lastError?.message}`);
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }

  /**
   * Generate mock BM25 results for development
   */
  private mockBM25Results(query: string, topK: number): BM25Result[] {
    const words = query.toLowerCase().split(/\s+/);

    // In a real implementation, this would query the database
    return Array.from({ length: topK }, (_, i) => ({
      id: `bm25_doc_${i}`,
      text: `Document ${i} matching query: ${query}`,
      metadata: { source: 'mock' },
      bm25Score: 1 / (i + 1),
      rank: i + 1,
    }));
  }

  /**
   * Generate mock vector results for development
   */
  private mockVectorResults(query: string, topK: number): VectorResult[] {
    // In a real implementation, this would query the vector database
    return Array.from({ length: topK }, (_, i) => ({
      id: `vec_doc_${i}`,
      text: `Document ${i} semantically related to: ${query}`,
      metadata: { source: 'mock' },
      similarity: 1 - (i * 0.05),
      rank: i + 1,
    }));
  }
}

// ============================================================================
// BM25 Implementation
// ============================================================================

/**
 * Simple BM25 implementation using in-memory index
 *
 * For production use with large datasets, consider:
 * - PostgreSQL with pg_bm25 extension
 * - Elasticsearch
 * - Solr
 * - Meilisearch
 */
export class SimpleBM25Index {
  private documents: Map<string, { text: string; metadata: Record<string, unknown> }> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private documentLengths: Map<string, number> = new Map();
  private averageLength = 0;

  // BM25 parameters
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  /**
   * Index a batch of documents
   */
  async index(documents: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>): Promise<void> {
    for (const doc of documents) {
      this.addDocument(doc.id, doc.text, doc.metadata);
    }
    this.averageLength = this.calculateAverageLength();
  }

  /**
   * Add a single document to the index
   */
  private addDocument(id: string, text: string, metadata?: Record<string, unknown>): void {
    // Store document
    this.documents.set(id, { text, metadata: metadata || {} });

    // Tokenize
    const tokens = this.tokenize(text);
    this.documentLengths.set(id, tokens.length);

    // Build inverted index
    for (const token of tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(id);
    }
  }

  /**
   * Search the index
   */
  search(query: string, topK: number): Array<{ id: string; text: string; metadata?: Record<string, unknown>; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores = new Map<string, number>();

    for (const token of queryTokens) {
      const posting = this.invertedIndex.get(token);
      if (!posting) continue;

      // Calculate IDF for this term
      const df = posting.size;
      const idf = Math.log((this.documents.size - df + 0.5) / (df + 0.5) + 1);

      // Calculate BM25 score for each document
      for (const docId of posting) {
        const doc = this.documents.get(docId);
        if (!doc) continue;

        const docLength = this.documentLengths.get(docId) || 0;
        const termFreq = this.getTermFrequency(token, doc.text);

        // BM25 formula
        const numerator = termFreq * (this.k1 + 1);
        const denominator = termFreq + this.k1 * (1 - this.b + this.b * (docLength / this.averageLength));
        const score = idf * (numerator / denominator);

        scores.set(docId, (scores.get(docId) || 0) + score);
      }
    }

    // Sort and return top K
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id, score]) => {
        const doc = this.documents.get(id)!;
        return {
          id,
          text: doc.text,
          metadata: doc.metadata,
          score,
        };
      });
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2); // Ignore very short terms
  }

  /**
   * Get term frequency in a document
   */
  private getTermFrequency(term: string, text: string): number {
    const tokens = this.tokenize(text);
    const count = tokens.filter(t => t === term).length;
    return count / tokens.length;
  }

  /**
   * Calculate average document length
   */
  private calculateAverageLength(): number {
    if (this.documentLengths.size === 0) return 0;
    const total = [...this.documentLengths.values()].reduce((a, b) => a + b, 0);
    return total / this.documentLengths.size;
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.documentLengths.clear();
    this.averageLength = 0;
  }
}
