/**
 * Genie Universal Search Client
 *
 * Wraps the genie-universal-search service (port 4713). Searches across
 * ALL Genie data — memories, calendar, finance, health, people, tasks,
 * twins — and returns ranked, source-tagged hits.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type SearchSource = 'memories' | 'calendar' | 'tasks' | 'people' | 'finance' | 'health' | 'twins' | 'all';

export interface SearchHit {
  id: string;
  source: SearchSource;
  title: string;
  snippet?: string;
  score: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface UniversalSearchRequest {
  q: string;
  userId?: string;
  sources?: SearchSource[];
  limit?: number;
  semantic?: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  query: string;
  sources: SearchSource[];
  createdAt: string;
}

export class SearchClient {
  constructor(private config: HojaiConfig) {}

  /** Universal search across all (or specified) sources. */
  async universal(input: UniversalSearchRequest): Promise<{ hits: SearchHit[]; total: number; query: string }> {
    return request(this.config, 'GET', `/api/search${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  /** Search just memories (sugar over universal). */
  async memories(input: { q: string; userId?: string; limit?: number; semantic?: boolean }): Promise<SearchHit[]> {
    return request<SearchHit[]>(this.config, 'GET', `/api/search/memories${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Semantic (vector) search across all sources. */
  async semantic(input: { q: string; userId?: string; limit?: number }): Promise<SearchHit[]> {
    return request<SearchHit[]>(this.config, 'GET', `/api/search/semantic${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Get the user's recent searches. */
  async recent(input: { userId: string; limit?: number }): Promise<Array<{ query: string; at: string }>> {
    return request(this.config, 'GET', `/api/search/recent${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Save a search for reuse. */
  async save(input: { userId: string; query: string; sources?: SearchSource[] }): Promise<SavedSearch> {
    return request<SavedSearch>(this.config, 'POST', '/api/search/saved', input);
  }

  /** List saved searches. */
  async listSaved(input: { userId: string; limit?: number }): Promise<SavedSearch[]> {
    return request<SavedSearch[]>(this.config, 'GET', `/api/search/saved${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Delete a saved search. */
  async unsave(savedSearchId: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/search/saved/${encodeURIComponent(savedSearchId)}`);
  }

  /** Get query suggestions for a partial input. */
  async suggestions(input: { q: string; userId?: string; limit?: number }): Promise<string[]> {
    return request<string[]>(this.config, 'GET', `/api/search/suggestions${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Get trending searches across all users. */
  async trending(input: { limit?: number } = {}): Promise<Array<{ query: string; count: number }>> {
    return request(this.config, 'GET', `/api/search/trending${buildQueryString(input as Record<string, unknown>)}`);
  }
}
