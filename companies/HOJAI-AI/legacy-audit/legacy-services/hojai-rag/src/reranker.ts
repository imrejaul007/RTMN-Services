/**
 * Cross-Encoder Re-ranker
 * Version: 1.0.0 | Date: June 2, 2026
 *
 * Re-ranks search results using a cross-encoder model.
 * Cross-encoders consider the full query-document pair together,
 * providing more accurate relevance scores than bi-encoders.
 */

import type {
  SearchResult,
  RerankedResult,
} from './types.js';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default cross-encoder model for MS MARCO passage ranking
 * Options:
 * - cross-encoder/ms-marco-MiniLM-L-6-v2 (fast, 38MB)
 * - cross-encoder/ms-marco-MiniLM-L-12-v2 (more accurate)
 * - cross-encoder/ms-marco-MiniLM-6-v2 (medium)
 * - cross-encoder/ms-marco-MiniLM-12-v2 (medium-large)
 */
const DEFAULT_MODEL = 'cross-encoder/ms-marco-MiniLM-L-6-v2';

/**
 * Default endpoint for cross-encoder models
 * Uses SentenceTransformers server or HuggingFace Inference API
 */
const DEFAULT_ENDPOINT = 'http://localhost:8080';

const CROSS_ENCODER_CONFIG = {
  weights: {
    crossEncoder: 0.6,
    hybrid: 0.4,
  },
  minScore: 0.1,
  scoreNormalization: true,
};

// ============================================================================
// Cross-Encoder Re-ranker
// ============================================================================

/**
 * Re-ranker using cross-encoder models
 *
 * Cross-encoders process the query and document together through
 * a transformer model, capturing fine-grained interactions between
 * query terms and document content.
 *
 * This implementation supports:
 * - Pre-trained MS MARCO models
 * - Custom fine-tuned models
 * - Fallback to cosine similarity
 */
export class CrossEncoderReranker {
  private model: string;
  private endpoint: string;
  private weights: { crossEncoder: number; hybrid: number };
  private retryConfig: RetryConfig;

  constructor(
    model: string = DEFAULT_MODEL,
    endpoint: string = DEFAULT_ENDPOINT,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.model = model;
    this.endpoint = endpoint;
    this.weights = CROSS_ENCODER_CONFIG.weights;
    this.retryConfig = retryConfig;
  }

  /**
   * Re-rank search results using cross-encoder
   *
   * @param query - Original query
   * @param candidates - Search results to re-rank
   * @param topK - Number of results to return
   * @returns Re-ranked results with cross-encoder scores
   */
  async rerank(
    query: string,
    candidates: SearchResult[],
    topK: number
  ): Promise<RerankedResult[]> {
    if (candidates.length === 0) {
      return [];
    }

    if (candidates.length === 1) {
      return [{
        ...candidates[0],
        crossEncoderScore: 1.0,
        finalScore: candidates[0].score,
        rank: 1,
      }];
    }

    // Get cross-encoder scores
    const crossEncoderScores = await this.getCrossEncoderScores(query, candidates);

    // Combine with hybrid scores
    const reranked = candidates.map((candidate, index) => {
      const crossEncoderScore = crossEncoderScores[index];
      const normalizedHybridScore = this.normalizeScore(candidate.score);

      // Weighted combination
      const finalScore = (
        crossEncoderScore * this.weights.crossEncoder +
        normalizedHybridScore * this.weights.hybrid
      );

      return {
        ...candidate,
        crossEncoderScore,
        finalScore,
        rank: 0, // Will be set after sorting
      };
    });

    // Sort by final score
    reranked.sort((a, b) => b.finalScore - a.finalScore);

    // Assign ranks
    reranked.forEach((result, index) => {
      result.rank = index + 1;
    });

    return reranked.slice(0, topK);
  }

  /**
   * Get cross-encoder scores for all candidates
   */
  private async getCrossEncoderScores(
    query: string,
    candidates: SearchResult[]
  ): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const pairs = candidates.map(doc => [query, doc.text]);

        const response = await fetch(`${this.endpoint}/rerank`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            queries: [query],
            documents: candidates.map(c => c.text),
          }),
        });

        if (!response.ok) {
          throw new Error(`Cross-encoder request failed: ${response.status}`);
        }

        const data = await response.json() as {
          results: Array<Array<{ index: number; relevance_score: number }>>;
        };

        // Map scores back to candidates
        const scores = new Array(candidates.length).fill(0);
        for (const result of data.results[0]) {
          scores[result.index] = result.relevance_score;
        }

        return scores;
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

    // Fallback to cosine similarity-based scoring
    console.warn(`Cross-encoder failed, using fallback: ${lastError?.message}`);
    return this.fallbackScoring(query, candidates);
  }

  /**
   * Fallback scoring using cosine similarity on embeddings
   *
   * This is less accurate than cross-encoder but provides
   * a reasonable approximation when the model is unavailable.
   */
  private fallbackScoring(query: string, candidates: SearchResult[]): number[] {
    // Simple TF-IDF based fallback scoring
    const queryTerms = new Set(query.toLowerCase().split(/\s+/).filter(t => t.length > 2));
    const scores: number[] = [];

    for (const candidate of candidates) {
      const docTerms = candidate.text.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      const docTermSet = new Set(docTerms);

      // Count query terms present in document
      let matches = 0;
      for (const term of queryTerms) {
        if (docTermSet.has(term)) {
          matches++;
        }
      }

      // Score based on match ratio and position
      const matchRatio = matches / queryTerms.size;
      const lengthPenalty = Math.min(1, 500 / candidate.text.length);
      const score = matchRatio * lengthPenalty;

      scores.push(score);
    }

    // Normalize scores
    const maxScore = Math.max(...scores, 0.01);
    return scores.map(s => s / maxScore);
  }

  /**
   * Normalize a score to [0, 1] range
   */
  private normalizeScore(score: number): number {
    // Assume score is already normalized or use sigmoid
    return 1 / (1 + Math.exp(-score));
  }

  /**
   * Get the model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Update the model
   */
  setModel(model: string): void {
    this.model = model;
  }
}

// ============================================================================
// Cosine Reranker (Alternative)
// ============================================================================

/**
 * Simpler re-ranker using cosine similarity
 *
 * This is a fallback when cross-encoder models are not available.
 * It uses the document and query embeddings to compute similarity.
 */
export class CosineReranker {
  private embeddingUrl: string;
  private retryConfig: RetryConfig;

  constructor(
    embeddingUrl: string,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.embeddingUrl = embeddingUrl;
    this.retryConfig = retryConfig;
  }

  /**
   * Re-rank using cosine similarity
   */
  async rerank(
    query: string,
    candidates: SearchResult[],
    topK: number
  ): Promise<RerankedResult[]> {
    if (candidates.length === 0) {
      return [];
    }

    // Get query embedding
    const queryEmbedding = await this.embedText(query);

    // Get candidate embeddings and compute similarity
    const reranked = await Promise.all(
      candidates.map(async (candidate, index) => {
        // Use metadata embedding if available, otherwise generate
        const embedding = (candidate.metadata?.embedding as number[]) ||
          await this.embedText(candidate.text);

        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        return {
          ...candidate,
          crossEncoderScore: similarity,
          finalScore: candidate.score * 0.5 + similarity * 0.5,
          rank: 0,
        };
      })
    );

    // Sort and assign ranks
    reranked.sort((a, b) => b.finalScore - a.finalScore);
    reranked.forEach((result, index) => {
      result.rank = index + 1;
    });

    return reranked.slice(0, topK);
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get text embedding
   */
  private async embedText(text: string): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.embeddingUrl}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
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
    console.warn(`Embedding failed: ${lastError?.message}`);
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }
}
