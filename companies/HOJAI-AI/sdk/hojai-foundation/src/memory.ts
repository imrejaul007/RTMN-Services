/**
 * MemoryOS Module
 *
 * Persistent memory for AI agents. 15 memory types including:
 * preferences, conversation history, operational events, agent learnings,
 * domain knowledge, episodic, semantic, procedural, working, etc.
 */

import type { HojaiConfig } from './config.js';
import { request, buildUrl } from './utils.js';

export type MemoryType =
  | 'preferences'
  | 'conversation'
  | 'operational'
  | 'agent_learning'
  | 'domain_knowledge'
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'working'
  | 'short_term'
  | 'long_term'
  | 'factual'
  | 'contextual'
  | 'reflective'
  | 'task_specific';

export interface Memory {
  id: string;
  type: MemoryType;
  scope: { ownerId: string; ownerType: 'agent' | 'user' | 'company' | 'session' };
  content: Record<string, unknown>;
  confidence: number; // 0..1
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  source?: string;
  relatedIds?: string[];
}

export interface WriteMemoryRequest {
  type: MemoryType;
  scope: { ownerId: string; ownerType: 'agent' | 'user' | 'company' | 'session' };
  content: Record<string, unknown>;
  confidence?: number;
  ttlSeconds?: number;
}

export interface SearchMemoryRequest {
  type?: MemoryType;
  scope?: { ownerId?: string; ownerType?: string };
  query?: string;
  limit?: number;
  minConfidence?: number;
  relatedTo?: string;
}

export class MemoryClient {
  constructor(private config: HojaiConfig) {}

  /**
   * Write a memory
   */
  async write(input: WriteMemoryRequest): Promise<Memory> {
    return request<Memory>(this.config, 'POST', '/api/v1/memory', input);
  }

  /**
   * Read a memory by id
   */
  async read(id: string): Promise<Memory> {
    return request<Memory>(this.config, 'GET', `/api/v1/memory/${encodeURIComponent(id)}`);
  }

  /**
   * Read multiple memories by ids
   */
  async readMany(ids: string[]): Promise<Memory[]> {
    return request<Memory[]>(this.config, 'POST', '/api/v1/memory/batch', { ids });
  }

  /**
   * Search memories
   */
  async search(input: SearchMemoryRequest): Promise<Memory[]> {
    return request<Memory[]>(this.config, 'POST', '/api/v1/memory/search', input);
  }

  /**
   * Update a memory
   */
  async update(id: string, content: Record<string, unknown>, confidence?: number): Promise<Memory> {
    return request<Memory>(this.config, 'PATCH', `/api/v1/memory/${encodeURIComponent(id)}`, { content, confidence });
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    await request<void>(this.config, 'DELETE', `/api/v1/memory/${encodeURIComponent(id)}`);
  }
}
