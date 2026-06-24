/**
 * Skill Marketplace Client (port 4120) — discovery + install for marketplace skills.
 *
 * A separate, public-facing marketplace layer on top of SkillOS.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Skill, SkillMarketplaceListing } from './types.js';

export class SkillMarketplaceClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4120` }; }

  async list(input: { category?: string; minRating?: number; free?: boolean; limit?: number } = {}): Promise<SkillMarketplaceListing[]> {
    return request<SkillMarketplaceListing[]>(this.config, 'GET', `/api/skills/marketplace${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(skillId: string): Promise<SkillMarketplaceListing> {
    return request<SkillMarketplaceListing>(this.config, 'GET', `/api/skills/marketplace/${encodeURIComponent(skillId)}`);
  }
  async publish(input: { skillId: string; publisher: string; price?: { amount: number; currency: string } }): Promise<SkillMarketplaceListing> {
    return request<SkillMarketplaceListing>(this.config, 'POST', '/api/skills/marketplace', input);
  }
  async install(skillId: string): Promise<{ installed: boolean; skillId: string; installedAt: string }> {
    return request(this.config, 'POST', `/api/skills/marketplace/${encodeURIComponent(skillId)}/install`);
  }
  async uninstall(skillId: string): Promise<{ uninstalled: boolean; skillId: string }> {
    return request(this.config, 'DELETE', `/api/skills/marketplace/${encodeURIComponent(skillId)}/install`);
  }
  async review(skillId: string, input: { rating: number; text?: string }): Promise<{ reviewId: string }> {
    return request<{ reviewId: string }>(this.config, 'POST', `/api/skills/marketplace/${encodeURIComponent(skillId)}/reviews`, input);
  }
  /** Featured skills (curated by editors). */
  async featured(limit = 10): Promise<SkillMarketplaceListing[]> {
    return request<SkillMarketplaceListing[]>(this.config, 'GET', `/api/skills/marketplace/featured?limit=${limit}`);
  }
  /** Trending this week. */
  async trending(limit = 10): Promise<SkillMarketplaceListing[]> {
    return request<SkillMarketplaceListing[]>(this.config, 'GET', `/api/skills/marketplace/trending?limit=${limit}`);
  }
}
