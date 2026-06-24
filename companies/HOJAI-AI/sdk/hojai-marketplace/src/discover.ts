/**
 * BAM Discovery Client
 *
 * Wraps the discovery-engine service (port 4256). Universal search across
 * the BAM index — agents, twins, workflows, blueprints, integrations, etc.
 *
 * Endpoints:
 *   POST /api/index                  index a single document
 *   POST /api/index/bulk             index many documents
 *   DELETE /api/index/:id            remove from index
 *   POST /api/search                 universal search across kinds
 *   POST /api/search/:kind           search within one kind
 *   GET  /api/indexes                list registered indexes
 *   GET  /api/indexes/:kind          one index metadata
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

/**
 * Common kinds indexed by discovery-engine. The backend uses a dynamic
 * registry — these are the standard ones. New kinds can be added without
 * SDK changes.
 */
export type DiscoveryKind =
  | 'listings'
  | 'twins'
  | 'workflows'
  | 'blueprints'
  | 'integrations'
  | 'companies'
  | 'agents'
  | 'policies'
  | 'skills';

export interface IndexDocument {
  id: string;
  kind: DiscoveryKind | string;
  /** Flat searchable text fields */
  title: string;
  description?: string;
  tags?: string[];
  /** Structured metadata for filtering */
  metadata?: Record<string, unknown>;
}

export interface SearchRequest {
  q: string;
  kind?: DiscoveryKind | string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface SearchHit {
  id: string;
  kind: string;
  title: string;
  description?: string;
  score: number;
  metadata?: Record<string, unknown>;
  highlights?: Record<string, string[]>;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  limit: number;
  offset: number;
}

export interface IndexInfo {
  kind: string;
  documentCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export class DiscoverClient {
  constructor(private config: HojaiConfig) {}

  /** Index a single document. */
  async index(doc: IndexDocument): Promise<{ indexed: boolean; id: string }> {
    return request<{ indexed: boolean; id: string }>(this.config, 'POST', '/api/index', doc);
  }

  /** Bulk-index many documents. */
  async indexBulk(docs: IndexDocument[]): Promise<{ indexed: number; errors: unknown[] }> {
    return request<{ indexed: number; errors: unknown[] }>(this.config, 'POST', '/api/index/bulk', { docs });
  }

  /** Remove a document from the index. */
  async remove(id: string): Promise<{ removed: boolean; id: string }> {
    return request<{ removed: boolean; id: string }>(this.config, 'DELETE', `/api/index/${encodeURIComponent(id)}`);
  }

  /** Universal search (across all kinds or filtered by one). */
  async search(input: SearchRequest): Promise<SearchResult> {
    return request<SearchResult>(this.config, 'POST', '/api/search', input);
  }

  /** Search within one specific kind (convenience helper). */
  async searchKind(kind: DiscoveryKind | string, input: Omit<SearchRequest, 'kind'>): Promise<SearchResult> {
    return request<SearchResult>(this.config, 'POST', `/api/search/${encodeURIComponent(kind)}`, input);
  }

  /** List all registered indexes. */
  async listIndexes(): Promise<IndexInfo[]> {
    return request<IndexInfo[]>(this.config, 'GET', '/api/indexes');
  }

  /** Get one index's metadata. */
  async getIndex(kind: DiscoveryKind | string): Promise<IndexInfo> {
    return request<IndexInfo>(this.config, 'GET', `/api/indexes/${encodeURIComponent(kind)}`);
  }
}
