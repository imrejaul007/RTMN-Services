/**
 * MemoryOS Module
 *
 * Wraps MemoryOS (port 4703) via Hub /api/memory/* routes.
 * MemoryOS uses plural paths: /api/memories (not /api/memory).
 * The SDK developer API uses singular: /api/memory (for ergonomics).
 * The request() call rewrites to /api/memories on the wire.
 */

import type { HojaiConfig } from './config.js';
import { request, type AuthState, type HojaiClientConfig } from './utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemoryType =
  | 'preference' | 'fact' | 'goal' | 'intent'
  | 'skill' | 'preference_set' | 'interaction' | 'insight'
  | 'policy' | 'plan' | 'learning' | 'context' | 'profile' | 'kb';

export interface MemoryScope {
  ownerId: string;
  ownerType: string;
}

export interface Memory {
  id: string;
  twinId?: string;
  type: MemoryType;
  content: Record<string, unknown>;
  tags?: string[];
  visibility?: string;
  metadata?: Record<string, unknown>;
  importance?: number;
  ttl?: number;
  lifecycleStage?: string;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WriteMemoryRequest {
  /** Memory type (preference, fact, goal, intent, etc.) */
  type: MemoryType;
  /** Owner identity */
  scope: MemoryScope;
  /** Memory content (free-form) */
  content: Record<string, unknown>;
  /** Confidence 0-1 (default: 1.0) */
  confidence?: number;
  /** Time-to-live in seconds (default: none) */
  ttlSeconds?: number;
  /** Tags for filtering */
  tags?: string[];
  /** Visibility: public, private, team (default: private) */
  visibility?: string;
  /** Twin ID to attach this memory to */
  twinId?: string;
  /** Importance 0-10 (default: 5) */
  importance?: number;
}

export interface SearchMemoryRequest {
  /** Full-text query */
  query?: string;
  /** Filter by type */
  type?: MemoryType;
  /** Filter by owner */
  scope?: MemoryScope;
  /** Filter by tags */
  tags?: string[];
  /** Minimum confidence (0-1) */
  minConfidence?: number;
  /** Sort by: createdAt | updatedAt | importance (default: createdAt) */
  sortBy?: 'createdAt' | 'updatedAt' | 'importance';
  /** Sort direction (default: desc) */
  sortDir?: 'asc' | 'desc';
  /** Pagination */
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// MemoryOS client
// ---------------------------------------------------------------------------

export class MemoryClient {
  private readonly cfg: HojaiClientConfig;
  constructor(config: HojaiConfig, authState: AuthState) {
    this.cfg = { ...config, authState };
  }

  /**
   * Write a memory to the store.
   * POST /api/memories
   */
  async write(input: WriteMemoryRequest): Promise<Memory> {
    const body = {
      type: input.type,
      content: input.content,
      visibility: input.visibility ?? 'private',
      metadata: {
        ownerId: input.scope.ownerId,
        ownerType: input.scope.ownerType,
        confidence: input.confidence ?? 1.0,
        importance: input.importance ?? 5,
        ttl: input.ttlSeconds,
        tags: input.tags ?? []
      },
      twinId: input.twinId,
      importance: input.importance ?? 5,
      ttl: input.ttlSeconds,
      tags: input.tags ?? []
    };
    return request<Memory>(this.cfg, 'POST', '/api/memory/memories', body);
  }

  /**
   * Get a memory by ID.
   * GET /api/memories/:id
   */
  async get(id: string): Promise<Memory> {
    return request<Memory>(this.cfg, 'GET', `/api/memory/memories/${encodeURIComponent(id)}`);
  }

  /**
   * Search memories by query + filters.
   * POST /api/memories/search
   */
  async search(input: SearchMemoryRequest): Promise<Memory[]> {
    const body = {
      query: input.query,
      type: input.type,
      ownerId: input.scope?.ownerId,
      ownerType: input.scope?.ownerType,
      tags: input.tags ?? [],
      minConfidence: input.minConfidence,
      sortBy: input.sortBy ?? 'createdAt',
      sortDir: input.sortDir ?? 'desc',
      limit: input.limit ?? 20,
      offset: input.offset ?? 0
    };
    return request<Memory[]>(this.cfg, 'POST', '/api/memory/memories/search', body);
  }

  /**
   * Update a memory's content / metadata.
   * PATCH /api/memories/:id
   */
  async update(id: string, partial: { content?: Record<string, unknown>; tags?: string[]; importance?: number }): Promise<Memory> {
    const body: Record<string, unknown> = {};
    if (partial.content !== undefined) body.content = partial.content;
    if (partial.tags !== undefined) body.tags = partial.tags;
    if (partial.importance !== undefined) body.importance = partial.importance;
    return request<Memory>(this.cfg, 'PATCH', `/api/memory/memories/${encodeURIComponent(id)}`, body);
  }

  /**
   * Delete a memory by ID.
   * DELETE /api/memories/:id
   */
  async delete(id: string): Promise<void> {
    return request<void>(this.cfg, 'DELETE', `/api/memory/memories/${encodeURIComponent(id)}`);
  }

  /**
   * Get a timeline of memories for an owner.
   * GET /api/memories/timeline?ownerId=&limit=
   */
  async timeline(ownerId: string, params?: { limit?: number; type?: MemoryType }): Promise<Memory[]> {
    const query = new URLSearchParams({ ownerId });
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    return request<Memory[]>(this.cfg, 'GET', `/api/memory/memories/timeline?${query}`);
  }
}
