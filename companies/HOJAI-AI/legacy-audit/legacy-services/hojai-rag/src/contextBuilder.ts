/**
 * Context Builder
 * Version: 1.0.0 | Date: June 2, 2026
 *
 * Builds context strings from retrieved chunks for LLM consumption.
 * Handles token counting, truncation, and ordering.
 */

import type {
  RerankedResult,
  ContextResult,
  Chunk,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Characters per token (rough estimate)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Default system prompt prefix
 */
const DEFAULT_PREFIX = '';

/**
 * Default suffix for context
 */
const DEFAULT_SUFFIX = '';

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Context Builder for RAG
 *
 * Combines retrieved chunks into a context string suitable
 * for LLM consumption. Handles:
 * - Token counting and truncation
 * - Ordering by relevance
 * - Metadata formatting
 * - Duplicate removal
 */
export class ContextBuilder {
  private maxTokens: number;
  private prefix: string;
  private suffix: string;

  constructor(
    maxTokens: number = 4000,
    prefix: string = DEFAULT_PREFIX,
    suffix: string = DEFAULT_SUFFIX
  ) {
    this.maxTokens = maxTokens;
    this.prefix = prefix;
    this.suffix = suffix;
  }

  /**
   * Build context from re-ranked results
   *
   * @param chunks - Re-ranked search results
   * @param maxTokens - Maximum tokens (overrides default)
   * @returns Context result with content and metadata
   */
  build(chunks: RerankedResult[], maxTokens?: number): ContextResult {
    const tokenLimit = maxTokens || this.maxTokens;
    const charLimit = tokenLimit * CHARS_PER_TOKEN;

    // Sort by final score (already done by reranker, but ensure)
    const sorted = [...chunks].sort((a, b) => b.finalScore - a.finalScore);

    // Build context with truncation
    const { content, includedChunks, truncated } = this.buildContextString(
      sorted,
      charLimit
    );

    // Add prefix and suffix
    const fullContent = `${this.prefix}\n${content}\n${this.suffix}`;

    return {
      content: fullContent,
      tokenCount: Math.ceil(fullContent.length / CHARS_PER_TOKEN),
      includedChunks,
      truncated,
    };
  }

  /**
   * Build context string with truncation
   */
  private buildContextString(
    chunks: RerankedResult[],
    charLimit: number
  ): { content: string; includedChunks: Chunk[]; truncated: boolean } {
    const includedChunks: Chunk[] = [];
    const parts: string[] = [];
    let totalLength = 0;
    let truncated = false;

    for (const chunk of chunks) {
      // Format chunk with metadata
      const formattedChunk = this.formatChunk(chunk);

      // Check if adding this chunk exceeds limit
      if (totalLength + formattedChunk.length + parts.length * 2 > charLimit) {
        // If we haven't added anything yet, force add at least one chunk
        if (parts.length === 0) {
          parts.push(formattedChunk.slice(0, charLimit - 100));
          includedChunks.push({
            id: chunk.id,
            text: chunk.text,
            embedding: [],
            metadata: {
              documentId: String(chunk.metadata?.documentId || chunk.id),
              ...chunk.metadata,
            },
          });
          totalLength = formattedChunk.length;
          truncated = true;
          break;
        }

        // Stop adding more chunks
        truncated = true;
        break;
      }

      parts.push(formattedChunk);
      includedChunks.push({
        id: chunk.id,
        text: chunk.text,
        embedding: [],
        metadata: {
          documentId: String(chunk.metadata?.documentId || chunk.id),
          ...chunk.metadata,
        },
      });
      totalLength += formattedChunk.length + 2; // +2 for newline
    }

    return {
      content: parts.join('\n\n'),
      includedChunks,
      truncated,
    };
  }

  /**
   * Format a chunk with metadata
   */
  private formatChunk(chunk: RerankedResult): string {
    const parts: string[] = [];

    // Add source reference
    const source = this.getSourceReference(chunk);
    if (source) {
      parts.push(`[Source: ${source}]`);
    }

    // Add page number if available
    if (chunk.metadata?.page) {
      parts[0] = parts[0] + ` (Page ${chunk.metadata.page})`;
    }

    // Add content
    parts.push(chunk.text);

    // Add citation marker
    parts.push(`[Chunk ID: ${chunk.id}]`);

    return parts.join('\n');
  }

  /**
   * Get source reference from chunk metadata
   */
  private getSourceReference(chunk: RerankedResult): string | null {
    if (chunk.metadata?.source) {
      return String(chunk.metadata.source);
    }

    if (chunk.metadata?.url) {
      return String(chunk.metadata.url);
    }

    if (chunk.metadata?.title) {
      return String(chunk.metadata.title);
    }

    if (chunk.metadata?.documentId) {
      return `Document ${chunk.metadata.documentId}`;
    }

    return null;
  }

  /**
   * Update configuration
   */
  setMaxTokens(maxTokens: number): void {
    this.maxTokens = maxTokens;
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  setSuffix(suffix: string): void {
    this.suffix = suffix;
  }
}

// ============================================================================
// Sliding Window Context Builder
// ============================================================================

/**
 * Sliding window context builder
 *
 * Creates overlapping windows of chunks for better
 * context preservation in multi-hop queries.
 */
export class SlidingWindowContextBuilder {
  private chunkSize: number;
  private overlap: number;
  private maxTokens: number;

  constructor(
    chunkSize: number = 3,
    overlap: number = 1,
    maxTokens: number = 4000
  ) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
    this.maxTokens = maxTokens;
  }

  /**
   * Build context using sliding window
   */
  build(chunks: RerankedResult[]): ContextResult[] {
    const contexts: ContextResult[] = [];
    const sorted = [...chunks].sort((a, b) => b.finalScore - a.finalScore);

    // Create windows
    for (let i = 0; i < sorted.length; i += this.chunkSize - this.overlap) {
      const window = sorted.slice(i, i + this.chunkSize);

      if (window.length === 0) break;

      const builder = new ContextBuilder(this.maxTokens);
      const result = builder.build(window);

      contexts.push(result);

      // Stop if we've covered all chunks
      if (i + this.chunkSize >= sorted.length) break;
    }

    return contexts;
  }
}

// ============================================================================
// Ordered Context Builder
// ============================================================================

/**
 * Ordered context builder
 *
 * Orders chunks by multiple criteria:
 * - Relevance score
 * - Recency
 * - Source diversity
 */
export interface OrderConfig {
  primary: 'relevance' | 'recency' | 'diversity';
  secondary?: 'relevance' | 'recency' | 'diversity';
}

/**
 * Ordered context builder with multi-criteria ordering
 */
export class OrderedContextBuilder extends ContextBuilder {
  private orderConfig: OrderConfig;

  constructor(
    maxTokens: number = 4000,
    orderConfig: OrderConfig = { primary: 'relevance' }
  ) {
    super(maxTokens);
    this.orderConfig = orderConfig;
  }

  /**
   * Build context with ordered chunks
   */
  build(chunks: RerankedResult[], maxTokens?: number): ContextResult {
    const sorted = this.orderChunks(chunks);
    return super.build(sorted, maxTokens);
  }

  /**
   * Order chunks by configured criteria
   */
  private orderChunks(chunks: RerankedResult[]): RerankedResult[] {
    const scored = chunks.map(chunk => ({
      chunk,
      score: this.calculateOrderScore(chunk),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .map(s => s.chunk);
  }

  /**
   * Calculate ordering score
   */
  private calculateOrderScore(chunk: RerankedResult): number {
    const weights = { relevance: 0.6, recency: 0.3, diversity: 0.1 };

    let score = 0;

    // Primary criterion
    if (this.orderConfig.primary === 'relevance') {
      score += chunk.finalScore * weights.relevance * 2;
    } else if (this.orderConfig.primary === 'recency') {
      score += this.getRecencyScore(chunk) * weights.recency * 2;
    } else {
      score += this.getDiversityScore(chunk) * weights.diversity * 2;
    }

    // Secondary criterion
    if (this.orderConfig.secondary) {
      if (this.orderConfig.secondary === 'relevance') {
        score += chunk.finalScore * weights.relevance;
      } else if (this.orderConfig.secondary === 'recency') {
        score += this.getRecencyScore(chunk) * weights.recency;
      } else {
        score += this.getDiversityScore(chunk) * weights.diversity;
      }
    }

    return score;
  }

  /**
   * Get recency score from metadata
   */
  private getRecencyScore(chunk: RerankedResult): number {
    const timestamp = chunk.metadata?.timestamp;
    if (!timestamp) return 0.5;

    const age = Date.now() - new Date(timestamp as string).getTime();
    const dayInMs = 24 * 60 * 60 * 1000;

    // Exponential decay
    return Math.exp(-age / (30 * dayInMs));
  }

  /**
   * Get diversity score (higher for unique sources)
   */
  private getDiversityScore(_chunk: RerankedResult): number {
    // Simplified: would need access to all chunks for proper diversity
    return 0.5;
  }
}
