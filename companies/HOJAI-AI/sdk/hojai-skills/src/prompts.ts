/**
 * Prompt Manager Client (port 4771) — versioned prompt templates.
 *
 * CRUD over prompt templates with versioning support. Used by every
 * AI agent / skill to manage prompt content and A/B test variants.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface PromptTemplate {
  id: string;
  slug: string;
  name: string;
  description?: string;
  /** Current latest version number */
  version: number;
  /** Active version's content */
  content: string;
  /** Variables the template accepts */
  variables: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  templateId: string;
  version: number;
  content: string;
  variables: string[];
  createdAt: string;
  notes?: string;
}

export class PromptManagerClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4771` }; }

  async list(input: { tag?: string; limit?: number } = {}): Promise<PromptTemplate[]> {
    return request<PromptTemplate[]>(this.config, 'GET', `/api/templates${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(idOrSlug: string): Promise<PromptTemplate> {
    return request<PromptTemplate>(this.config, 'GET', `/api/templates/${encodeURIComponent(idOrSlug)}`);
  }
  async create(input: { slug: string; name: string; description?: string; content: string; variables: string[]; tags?: string[] }): Promise<PromptTemplate> {
    return request<PromptTemplate>(this.config, 'POST', '/api/templates', input);
  }
  async update(idOrSlug: string, patch: Partial<PromptTemplate>): Promise<PromptTemplate> {
    return request<PromptTemplate>(this.config, 'PATCH', `/api/templates/${encodeURIComponent(idOrSlug)}`, patch);
  }
  async remove(idOrSlug: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/templates/${encodeURIComponent(idOrSlug)}`);
  }
  /** Publish a new version of a template. */
  async publishVersion(idOrSlug: string, input: { content: string; variables?: string[]; notes?: string }): Promise<PromptVersion> {
    return request<PromptVersion>(this.config, 'POST', `/api/templates/${encodeURIComponent(idOrSlug)}/versions`, input);
  }
  async listVersions(idOrSlug: string): Promise<PromptVersion[]> {
    return request<PromptVersion[]>(this.config, 'GET', `/api/templates/${encodeURIComponent(idOrSlug)}/versions`);
  }
  async getVersion(idOrSlug: string, version: number): Promise<PromptVersion> {
    return request<PromptVersion>(this.config, 'GET', `/api/templates/${encodeURIComponent(idOrSlug)}/versions/${version}`);
  }
  /** Render a template by substituting variables. */
  async render(idOrSlug: string, variables: Record<string, string>): Promise<{ rendered: string }> {
    return request(this.config, 'POST', `/api/templates/${encodeURIComponent(idOrSlug)}/render`, { variables });
  }
  async getStats(): Promise<{ templateCount: number; totalVersions: number; rendersToday: number }> {
    return request(this.config, 'GET', '/api/stats');
  }
}
