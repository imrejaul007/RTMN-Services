/**
 * Memory Context Engine Client (port 4790) — LLM context composer.
 *
 * Smart retriever that composes LLM context windows using
 * (relevance × confidence × recency). Two endpoints: actual retrieval
 * and a preview (without persisting).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface ComposeContextRequest {
  /** Owner / twin to compose context for */
  ownerId: string;
  /** The prompt or query the context is being composed for */
  query: string;
  /** Hard cap on output token count */
  maxTokens?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Tiers to consider (default: all) */
  tiers?: Array<'personal' | 'business' | 'industry' | 'ecosystem' | 'agent'>;
  /** Memories newer than this ISO date are prioritized */
  since?: string;
}

export interface ContextItem {
  memoryId: string;
  content: string;
  /** 0-1 */
  relevance: number;
  confidence: number;
  recency: number;
  /** Final composed score: relevance × confidence × recency (× weights) */
  compositeScore: number;
  source: string;
}

export interface ComposedContext {
  ownerId: string;
  query: string;
  items: ContextItem[];
  /** Sum of token counts of items */
  totalTokens: number;
  generatedAt: string;
}

export class MemoryContextEngineClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4790` }; }

  /** Compose (and persist) the LLM context for a query. */
  async compose(input: ComposeContextRequest): Promise<ComposedContext> {
    return request<ComposedContext>(this.config, 'POST', '/api/context', input);
  }
  /** Preview the LLM context without persisting. */
  async preview(input: ComposeContextRequest): Promise<ComposedContext> {
    return request<ComposedContext>(this.config, 'POST', '/api/context/preview', input);
  }
  /** Engine stats. */
  async getStats(): Promise<{ compositionsToday: number; averageItems: number; averageTokens: number; p95Tokens: number }> {
    return request(this.config, 'GET', '/api/stats');
  }
}
