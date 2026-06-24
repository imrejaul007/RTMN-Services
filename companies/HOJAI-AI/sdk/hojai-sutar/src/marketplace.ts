/**
 * SUTAR Marketplace Client
 *
 * SUTAR agent marketplace: discover, install, rate agents.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface AgentListing {
  id: string;
  agentId: string;
  name: string;
  description: string;
  category: string;
  publisher: string;
  version: string;
  rating: number;
  ratingCount: number;
  installs: number;
  price: { model: 'free' | 'subscription' | 'usage'; amount?: number; currency?: string };
  capabilities: string[];
  industries: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface InstallRequest {
  listingId: string;
  orgCorpId: string;
  config?: Record<string, unknown>;
}

export interface InstallResult {
  installId: string;
  listingId: string;
  orgCorpId: string;
  installedAt: string;
  config: Record<string, unknown>;
  status: 'active' | 'pending' | 'failed';
}

export interface ReviewRequest {
  listingId: string;
  rating: number; // 1-5
  text?: string;
}

export class MarketplaceClient {
  constructor(private config: HojaiConfig) {}

  async search(input: { query?: string; category?: string; industry?: string; maxPrice?: number; minRating?: number; limit?: number }): Promise<AgentListing[]> {
    return request<AgentListing[]>(this.config, 'POST', '/api/v1/marketplace/search', input);
  }

  async get(id: string): Promise<AgentListing> {
    return request<AgentListing>(this.config, 'GET', `/api/v1/marketplace/listings/${encodeURIComponent(id)}`);
  }

  async install(input: InstallRequest): Promise<InstallResult> {
    return request<InstallResult>(this.config, 'POST', '/api/v1/marketplace/install', input);
  }

  async uninstall(orgCorpId: string, listingId: string): Promise<{ uninstalled: boolean }> {
    return request<{ uninstalled: boolean }>(this.config, 'DELETE', `/api/v1/marketplace/install?orgCorpId=${encodeURIComponent(orgCorpId)}&listingId=${encodeURIComponent(listingId)}`);
  }

  async listInstalled(orgCorpId: string): Promise<InstallResult[]> {
    return request<InstallResult[]>(this.config, 'GET', `/api/v1/marketplace/installed?orgCorpId=${encodeURIComponent(orgCorpId)}`);
  }

  async review(input: ReviewRequest): Promise<{ reviewId: string }> {
    return request<{ reviewId: string }>(this.config, 'POST', '/api/v1/marketplace/reviews', input);
  }

  async publish(input: { name: string; description: string; category: string; version: string; capabilities: string[]; industries: string[]; price: AgentListing['price'] }): Promise<AgentListing> {
    return request<AgentListing>(this.config, 'POST', '/api/v1/marketplace/listings', input);
  }
}
