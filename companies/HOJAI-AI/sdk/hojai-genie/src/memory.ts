/**
 * Genie Memory Client
 *
 * Wraps genie-memory-inbox (port 4736) + genie-memory-graph (port 4717).
 * Captures memories, retrieves by type, semantic search, and
 * smart-forgetting (auto-archive expired/duplicates).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type MemoryType =
  | 'general'
  | 'note'
  | 'contact'
  | 'event'
  | 'idea'
  | 'task'
  | 'place'
  | 'preference'
  | 'quote'
  | 'media';

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
  capturedAt: string;
  expiresAt?: string | null;
  archivedAt?: string | null;
}

export interface CaptureMemoryRequest {
  userId: string;
  type?: MemoryType;
  content: string;
  tags?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
  /** TTL in seconds; default never expires */
  ttlSeconds?: number;
}

export interface SearchMemoryRequest {
  q: string;
  userId: string;
  type?: MemoryType;
  limit?: number;
  semantic?: boolean;
}

export interface SmartForgetRequest {
  userId: string;
  /** 'expired' = auto-archive expired, 'duplicates' = collapse near-duplicates, 'all' = both */
  strategy: 'expired' | 'duplicates' | 'all';
  dryRun?: boolean;
}

export interface MemorySmartForgetResult {
  archived: number;
  duplicatesCollapsed: number;
  remainingCount: number;
  dryRun: boolean;
}

export class MemoryClient {
  constructor(private config: HojaiConfig) {}

  /** Capture a memory (auth required). */
  async capture(input: CaptureMemoryRequest): Promise<Memory> {
    return request<Memory>(this.config, 'POST', '/api/memory', input);
  }

  /** List memories for a user (newest first). */
  async list(userId: string, input: { type?: MemoryType; limit?: number; includeArchived?: boolean } = {}): Promise<{ memories: Memory[]; count: number }> {
    return request(this.config, 'GET', `/api/memory/${encodeURIComponent(userId)}${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Get a single memory by id. */
  async get(memoryId: string): Promise<Memory> {
    return request<Memory>(this.config, 'GET', `/api/memory/${encodeURIComponent(memoryId)}`);
  }

  /** Search memories (full-text or semantic). */
  async search(input: SearchMemoryRequest): Promise<{ results: Memory[]; total: number }> {
    return request(this.config, 'GET', `/api/search/memories${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  /** Delete a memory (soft delete — archived, not purged). */
  async remove(memoryId: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/memory/${encodeURIComponent(memoryId)}`);
  }

  /** Trigger smart-forgetting for a user. */
  async smartForget(input: SmartForgetRequest): Promise<MemorySmartForgetResult> {
    return request<MemorySmartForgetResult>(this.config, 'POST', '/api/memory/smart-forget', input);
  }
}
