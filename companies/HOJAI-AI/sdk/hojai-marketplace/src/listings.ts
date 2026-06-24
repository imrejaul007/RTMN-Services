/**
 * BAM Listings Client
 *
 * Wraps the marketplace-listings service (port 4250). Provides CRUD over
 * per-tenant listings — AI agents, services, twins, workflows, data, etc.
 *
 * Every listing is tenant-scoped and has a controlled-vocabulary category
 * (8 values), pricing model (5 values), and status (5 values). Each listing
 * links to nexha-business-directory via `directoryCompanyId` for trust.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type ListingCategory =
  | 'agent'
  | 'service'
  | 'twin'
  | 'workflow'
  | 'data'
  | 'integration'
  | 'consulting'
  | 'training';

export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'SUSPENDED' | 'ARCHIVED';

export type ListingVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

export type PricingModel = 'free' | 'one-time' | 'subscription' | 'usage-based' | 'quote-only';

export interface Listing {
  tenantId: string;
  listingId: string;
  title: string;
  description: string;
  shortDescription: string;
  category: ListingCategory;
  tags: string[];
  pricingModel: PricingModel;
  /** Price in minor units (cents/paise) */
  price: number;
  currency: string;
  visibility: ListingVisibility;
  status: ListingStatus;
  directoryCompanyId?: string | null;
  directoryAgentId?: string | null;
  /** 0-100, denormalized from SADA */
  trustScore?: number | null;
  reviewCount: number;
  averageRating: number;
  installCount: number;
  viewCount: number;
  publisherName: string;
  publisherUrl?: string;
  sampleData: Record<string, unknown>;
  assets: string[];
  metadata: Record<string, unknown>;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingRequest {
  title: string;
  description?: string;
  shortDescription?: string;
  category: ListingCategory;
  tags?: string[];
  pricingModel?: PricingModel;
  /** Required for paid pricing models */
  price?: number;
  currency?: string;
  visibility?: ListingVisibility;
  status?: ListingStatus;
  directoryCompanyId?: string;
  directoryAgentId?: string;
  trustScore?: number;
  publisherName: string;
  publisherUrl?: string;
  sampleData?: Record<string, unknown>;
  assets?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchListingsRequest {
  q?: string;
  category?: ListingCategory;
  tag?: string;
  pricingModel?: PricingModel;
  minRating?: number;
  directoryCompanyId?: string;
  directoryAgentId?: string;
  publisherName?: string;
  /** Internal callers only — cross-tenant filter */
  tenantId?: string;
  visibility?: ListingVisibility;
  status?: ListingStatus;
  sort?: 'recent' | 'rating' | 'popular';
  limit?: number;
  offset?: number;
}

export interface SearchListingsResult {
  items: Listing[];
  total: number;
  limit: number;
  offset: number;
}

export class ListingsClient {
  constructor(private config: HojaiConfig) {}

  /** Create a new listing (returns 201). Requires auth. */
  async create(input: CreateListingRequest): Promise<Listing> {
    return request<Listing>(this.config, 'POST', '/api/listings', input);
  }

  /** Search + filter + sort listings (public-by-default). */
  async search(input: SearchListingsRequest = {}): Promise<SearchListingsResult> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<SearchListingsResult>(this.config, 'GET', `/api/listings${qs}`);
  }

  /** Get a single listing by listingId (visibility-checked). */
  async get(listingId: string): Promise<Listing> {
    return request<Listing>(this.config, 'GET', `/api/listings/${encodeURIComponent(listingId)}`);
  }

  /** Update a listing (owner only). */
  async update(listingId: string, patch: Partial<CreateListingRequest>): Promise<Listing> {
    return request<Listing>(this.config, 'PATCH', `/api/listings/${encodeURIComponent(listingId)}`, patch);
  }

  /** Publish a listing — sets status=PUBLISHED and stamps publishedAt. */
  async publish(listingId: string): Promise<Listing> {
    return request<Listing>(this.config, 'POST', `/api/listings/${encodeURIComponent(listingId)}/publish`);
  }

  /** Unpublish a listing — sets status=UNPUBLISHED. */
  async unpublish(listingId: string): Promise<Listing> {
    return request<Listing>(this.config, 'POST', `/api/listings/${encodeURIComponent(listingId)}/unpublish`);
  }

  /** Record a view (no auth required). */
  async recordView(listingId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(this.config, 'POST', `/api/listings/${encodeURIComponent(listingId)}/view`);
  }

  /** Record an install (returns 201). */
  async recordInstall(listingId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(this.config, 'POST', `/api/listings/${encodeURIComponent(listingId)}/install`);
  }

  /** Lint a listing payload without persisting it (no auth required). */
  async validate(input: CreateListingRequest): Promise<{ valid: boolean; listing: CreateListingRequest }> {
    return request<{ valid: boolean; listing: CreateListingRequest }>(this.config, 'POST', '/api/validate', input);
  }

  /** Get per-tenant stats (requires auth). */
  async stats(): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>(this.config, 'GET', '/api/stats');
  }
}
