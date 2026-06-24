/**
 * SkillOS Client (port 4743) — capability registry + skill execution.
 *
 * The core skill runtime. CRUD over skills, semantic discovery,
 * recommendation, composition, and execution.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Skill, SkillCategory, SkillExecutionResult } from './types.js';

export class SkillOsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4743` }; }

  // ─── Skills CRUD ───
  async list(input: { category?: string; tag?: string; public?: boolean; limit?: number } = {}): Promise<Skill[]> {
    return request<Skill[]>(this.config, 'GET', `/api/skills${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(id: string): Promise<Skill> {
    return request<Skill>(this.config, 'GET', `/api/skills/${encodeURIComponent(id)}`);
  }
  async create(input: { name: string; description: string; category: string; tags?: string[]; inputs: Skill['inputs']; outputs: Skill['outputs']; version?: string; public?: boolean; author?: string }): Promise<Skill> {
    return request<Skill>(this.config, 'POST', '/api/skills', input);
  }
  async update(id: string, patch: Partial<Skill>): Promise<Skill> {
    return request<Skill>(this.config, 'PUT', `/api/skills/${encodeURIComponent(id)}`, patch);
  }
  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/skills/${encodeURIComponent(id)}`);
  }
  // ─── Categories ───
  async listCategories(): Promise<SkillCategory[]> {
    return request<SkillCategory[]>(this.config, 'GET', '/api/skills/categories');
  }
  async createCategory(input: { name: string; description?: string; parentId?: string }): Promise<SkillCategory> {
    return request<SkillCategory>(this.config, 'POST', '/api/skills/categories', input);
  }
  // ─── Discovery + recommendation ───
  async discover(input: { q: string; category?: string; limit?: number }): Promise<Skill[]> {
    return request<Skill[]>(this.config, 'GET', `/api/skills/discover${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async semanticSearch(input: { q: string; limit?: number }): Promise<Array<{ skill: Skill; relevance: number }>> {
    return request(this.config, 'GET', `/api/discover/semantic${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async recommend(input: { context: string; limit?: number }): Promise<Skill[]> {
    return request<Skill[]>(this.config, 'GET', `/api/recommend${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  // ─── Execute + compose + learn ───
  async execute(id: string, input: Record<string, unknown>): Promise<SkillExecutionResult> {
    return request<SkillExecutionResult>(this.config, 'POST', `/api/skills/${encodeURIComponent(id)}/execute`, { input });
  }
  async compose(input: { goal: string; skills: string[]; input: Record<string, unknown> }): Promise<{ composed: SkillExecutionResult; steps: Array<{ skillId: string; output: Record<string, unknown> }> }> {
    return request(this.config, 'POST', '/api/skills/compose', input);
  }
  async learn(id: string, input: { input: Record<string, unknown>; output: Record<string, unknown>; success: boolean }): Promise<{ learned: boolean }> {
    return request<{ learned: boolean }>(this.config, 'POST', `/api/skills/${encodeURIComponent(id)}/learn`, input);
  }
}
