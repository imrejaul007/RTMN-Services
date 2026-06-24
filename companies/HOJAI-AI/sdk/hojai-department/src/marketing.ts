/**
 * Marketing OS SDK client (port 5500)
 *
 * Brand, campaigns, audiences, content, journeys, social, SEO, loyalty.
 * 15 AI marketing agents behind the scenes.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type CampaignChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'web' | 'social' | 'ads' | 'seo';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface Brand {
  id: string;
  name: string;
  voice?: string;
  tone?: string;
  logoUrl?: string;
  colors?: Record<string, string>;
  guidelines?: string;
  healthScore?: number; // 0-100
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  budget: { amount: number; currency: string };
  spent?: { amount: number; currency: string };
  audienceId?: string;
  startAt?: string;
  endAt?: string;
  metrics?: { impressions: number; clicks: number; conversions: number; ctr: number; cpa: number };
  createdAt: string;
}

export interface Audience {
  id: string;
  name: string;
  description?: string;
  /** Segment criteria */
  filters: Record<string, unknown>;
  size?: number; // estimated reach
  createdAt: string;
}

export interface Content {
  id: string;
  title: string;
  kind: 'blog' | 'social-post' | 'email' | 'landing-page' | 'video-script' | 'ad-copy';
  body: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  tags?: string[];
  createdAt: string;
}

export interface Journey {
  id: string;
  name: string;
  description?: string;
  /** Ordered steps */
  steps: Array<{ id: string; channel: CampaignChannel; templateId?: string; delayMinutes?: number }>;
  trigger: 'signup' | 'purchase' | 'abandon-cart' | 'inactivity' | 'manual';
  active: boolean;
}

export class MarketingClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5500` };
  }

  // ─── Brand ───

  async listBrands(): Promise<Brand[]> {
    return request<Brand[]>(this.config, 'GET', '/api/brand');
  }

  async getBrand(id: string): Promise<Brand> {
    return request<Brand>(this.config, 'GET', `/api/brand/${encodeURIComponent(id)}`);
  }

  async createBrand(input: { name: string; voice?: string; tone?: string; logoUrl?: string; colors?: Record<string, string>; guidelines?: string }): Promise<Brand> {
    return request<Brand>(this.config, 'POST', '/api/brand', input);
  }

  async updateBrand(id: string, patch: Partial<Brand>): Promise<Brand> {
    return request<Brand>(this.config, 'PATCH', `/api/brand/${encodeURIComponent(id)}`, patch);
  }

  async getBrandHealth(id: string): Promise<{ score: number; signals: Array<{ name: string; value: number }> }> {
    return request(this.config, 'GET', `/api/brand/${encodeURIComponent(id)}/health`);
  }

  // ─── Campaigns ───

  async listCampaigns(input: { channel?: CampaignChannel; status?: CampaignStatus; limit?: number } = {}): Promise<Campaign[]> {
    return request<Campaign[]>(this.config, 'GET', `/api/campaigns${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getCampaign(id: string): Promise<Campaign> {
    return request<Campaign>(this.config, 'GET', `/api/campaigns/${encodeURIComponent(id)}`);
  }

  async createCampaign(input: { name: string; channel: CampaignChannel; budget: { amount: number; currency: string }; audienceId?: string; startAt?: string; endAt?: string }): Promise<Campaign> {
    return request<Campaign>(this.config, 'POST', '/api/campaigns', input);
  }

  async launchCampaign(id: string): Promise<Campaign> {
    return request<Campaign>(this.config, 'POST', `/api/campaigns/${encodeURIComponent(id)}/launch`);
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    return request<Campaign>(this.config, 'POST', `/api/campaigns/${encodeURIComponent(id)}/pause`);
  }

  // ─── Audiences ───

  async listAudiences(input: { limit?: number } = {}): Promise<Audience[]> {
    return request<Audience[]>(this.config, 'GET', `/api/audiences${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createAudience(input: { name: string; description?: string; filters: Record<string, unknown> }): Promise<Audience> {
    return request<Audience>(this.config, 'POST', '/api/audiences', input);
  }

  // ─── Content ───

  async listContent(input: { kind?: Content['kind']; status?: Content['status']; limit?: number } = {}): Promise<Content[]> {
    return request<Content[]>(this.config, 'GET', `/api/content${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createContent(input: { title: string; kind: Content['kind']; body: string; tags?: string[] }): Promise<Content> {
    return request<Content>(this.config, 'POST', '/api/content', input);
  }

  // ─── Journeys ───

  async listJourneys(): Promise<Journey[]> {
    return request<Journey[]>(this.config, 'GET', '/api/journeys');
  }

  async createJourney(input: { name: string; description?: string; steps: Journey['steps']; trigger: Journey['trigger'] }): Promise<Journey> {
    return request<Journey>(this.config, 'POST', '/api/journeys', input);
  }
}
