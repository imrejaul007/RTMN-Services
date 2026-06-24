/**
 * SkillOS SDK — Client for HOJAI SkillOS (port 4743).
 *
 * Skill registry + execution + composition + marketplace + training.
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { request } from './utils.js';

export type SkillStatus = 'active' | 'draft' | 'deprecated' | 'archived';
export type SkillCategory = string;

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  tags: string[];
  version: string;
  status: SkillStatus;
  inputs: { name: string; type: string; required: boolean; description?: string }[];
  outputs: { name: string; type: string; description?: string }[];
  pricing: { model: 'free' | 'per-call' | 'subscription'; amount?: number; currency?: string };
  rating: number;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCategory_ {
  id: string;
  name: string;
  description: string;
  skillCount: number;
}

export interface SkillExecution {
  id: string;
  skillId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export class SkillOsClient {
  constructor(private config: HojaiConfig) {}

  /** List skills (filterable). */
  async listSkills(filter: { category?: string; tag?: string; status?: string } = {}): Promise<Skill[]> {
    const qs = new URLSearchParams();
    if (filter.category) qs.set('category', filter.category);
    if (filter.tag) qs.set('tag', filter.tag);
    if (filter.status) qs.set('status', filter.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const r = await request<{ success?: boolean; data?: { skills?: Skill[] } | Skill[] }>(
      this.config, 'GET', `/api/skills${suffix}`
    );
    // Handle both wrapped + unwrapped response
    if (Array.isArray(r)) return r as unknown as Skill[];
    if (r.data) {
      if (Array.isArray(r.data)) return r.data;
      if ('skills' in r.data) return (r.data as { skills: Skill[] }).skills;
    }
    return [];
  }

  /** Get a single skill. */
  async getSkill(id: string): Promise<Skill> {
    const r = await request<{ success?: boolean; data?: Skill }>(this.config, 'GET', `/api/skills/${encodeURIComponent(id)}`);
    if (r && 'data' in r && r.data) return r.data as Skill;
    return r as unknown as Skill;
  }

  /** Create a new skill. */
  async createSkill(input: Omit<Skill, 'id' | 'rating' | 'executionCount' | 'createdAt' | 'updatedAt'>): Promise<Skill> {
    const r = await request<{ success: boolean; data: Skill }>(this.config, 'POST', '/api/skills', input);
    return r.data;
  }

  /** Update a skill. */
  async updateSkill(id: string, patch: Partial<Omit<Skill, 'id' | 'createdAt'>>): Promise<Skill> {
    const r = await request<{ success: boolean; data: Skill }>(this.config, 'PUT', `/api/skills/${encodeURIComponent(id)}`, patch);
    return r.data;
  }

  /** List categories. */
  async listCategories(): Promise<SkillCategory_[]> {
    const r = await request<{ success: boolean; data: SkillCategory_[] }>(this.config, 'GET', '/api/skills/categories');
    return r.data;
  }

  /** Discover skills via text/tag/category. */
  async discover(filter: { q?: string; category?: string; tag?: string; semantic?: boolean } = {}): Promise<Skill[]> {
    const qs = new URLSearchParams();
    if (filter.q) qs.set('q', filter.q);
    if (filter.category) qs.set('category', filter.category);
    if (filter.tag) qs.set('tag', filter.tag);
    if (filter.semantic) qs.set('semantic', 'true');
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const r = await request<{ success: boolean; data: Skill[] }>(this.config, 'GET', `/api/skills/discover${suffix}`);
    return r.data;
  }

  /** Semantic vector search. */
  async semanticSearch(q: string, k: number = 10, type?: string): Promise<Array<{ id: string; score: number; skill?: Skill }>> {
    const qs = new URLSearchParams({ q, k: String(k) });
    if (type) qs.set('type', type);
    const r = await request<{ success: boolean; data: Array<{ id: string; score: number; skill?: Skill }> }>(
      this.config, 'GET', `/api/discover/semantic?${qs.toString()}`
    );
    return r.data;
  }

  /** Get personalized recommendations. */
  async recommend(filter: { userId?: string; context?: Record<string, unknown> } = {}): Promise<Skill[]> {
    const qs = new URLSearchParams();
    if (filter.userId) qs.set('userId', filter.userId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const r = await request<{ success: boolean; data: Skill[] }>(this.config, 'GET', `/api/recommend${suffix}`);
    return r.data;
  }

  /** Marketplace: list skills for sale. */
  async marketplaceList(filter: { category?: string; minPrice?: number; maxPrice?: number } = {}): Promise<Skill[]> {
    const qs = new URLSearchParams();
    if (filter.category) qs.set('category', filter.category);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const r = await request<{ success: boolean; data: Skill[] }>(this.config, 'GET', `/api/skills/marketplace${suffix}`);
    return r.data;
  }
}

export class SkillOs {
  readonly skill: SkillOsClient;
  readonly config: ReturnType<typeof resolveConfig>;
  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.skill = new SkillOsClient(resolved);
  }
}

export { HojaiConfig, resolveConfig } from './foundation-config.js';
export { request, HttpError } from './utils.js';
export { HttpError as SkillOsHttpError } from './utils.js';
export default SkillOs;