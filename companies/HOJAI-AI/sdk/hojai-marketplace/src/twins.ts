/**
 * BAM Twin Marketplace Client
 *
 * Wraps the twin-marketplace service (port 4146). Buy, sell, install and
 * rent digital twins — pre-built schemas for customers, orders, products,
 * suppliers, rooms, patients, etc. Twin schemas are the data layer for
 * every TwinOS application; this marketplace lets companies acquire new
 * twin types instead of building them.
 *
 * Endpoints:
 *   GET    /api/categories                list twin categories
 *   POST   /api/categories                create category (auth)
 *   GET    /api/listings                  list twin listings
 *   GET    /api/listings/featured         curated featured twins
 *   GET    /api/listings/trending         trending twins
 *   GET    /api/listings/:id              get twin listing
 *   POST   /api/listings                  publish twin (auth)
 *   PATCH  /api/listings/:id              update twin (auth)
 *   DELETE /api/listings/:id              remove twin (auth)
 *   POST   /api/listings/:id/reviews      review a twin (auth)
 *   GET    /api/listings/:id/reviews      list reviews
 *   POST   /api/purchases                 buy a twin (auth)
 *   GET    /api/purchases                 my purchases
 *   POST   /api/installs                  install a purchased twin (auth)
 *   GET    /api/installs                  my installs
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface TwinCategory {
  id: string;
  name: string;
  description?: string;
  /** e.g. 'commerce', 'healthcare', 'hospitality', 'manufacturing' */
  domain: string;
  /** Count of listings in this category */
  listingCount?: number;
}

export interface TwinListing {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  schema: Record<string, unknown>;
  /** Sample data seeded on install */
  sampleData?: Record<string, unknown>;
  pricingModel: 'free' | 'one-time' | 'subscription' | 'usage-based';
  price: number;
  currency: string;
  publisherName: string;
  installCount: number;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TwinPurchase {
  id: string;
  listingId: string;
  buyerOrgCorpId: string;
  price: number;
  currency: string;
  purchasedAt: string;
  status: 'pending' | 'completed' | 'refunded' | 'disputed';
}

export interface TwinInstall {
  id: string;
  listingId: string;
  orgCorpId: string;
  /** Which TwinOS namespace the twin was bound to */
  namespace: string;
  installedAt: string;
  status: 'active' | 'paused' | 'uninstalled';
}

export class TwinsClient {
  constructor(private config: HojaiConfig) {}

  /** List twin categories. */
  async categories(): Promise<TwinCategory[]> {
    return request<TwinCategory[]>(this.config, 'GET', '/api/categories');
  }

  /** List twin listings, filtered by category or publisher. */
  async listings(input: { categoryId?: string; publisherName?: string; limit?: number; offset?: number } = {}): Promise<TwinListing[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<TwinListing[]>(this.config, 'GET', `/api/listings${qs}`);
  }

  /** Get curated featured twins (top of the storefront). */
  async featured(): Promise<TwinListing[]> {
    return request<TwinListing[]>(this.config, 'GET', '/api/listings/featured');
  }

  /** Get trending twins (most installs in last 7 days). */
  async trending(): Promise<TwinListing[]> {
    return request<TwinListing[]>(this.config, 'GET', '/api/listings/trending');
  }

  /** Get a single twin listing. */
  async get(id: string): Promise<TwinListing> {
    return request<TwinListing>(this.config, 'GET', `/api/listings/${encodeURIComponent(id)}`);
  }

  /** Publish a twin listing (auth required). */
  async publish(input: Omit<TwinListing, 'id' | 'installCount' | 'averageRating' | 'reviewCount' | 'createdAt' | 'updatedAt'>): Promise<TwinListing> {
    return request<TwinListing>(this.config, 'POST', '/api/listings', input);
  }

  /** Buy a twin (auth required). */
  async purchase(input: { listingId: string; orgCorpId: string }): Promise<TwinPurchase> {
    return request<TwinPurchase>(this.config, 'POST', '/api/purchases', input);
  }

  /** Install a purchased twin into a TwinOS namespace (auth required). */
  async install(input: { listingId: string; orgCorpId: string; namespace: string }): Promise<TwinInstall> {
    return request<TwinInstall>(this.config, 'POST', '/api/installs', input);
  }

  /** List my purchases. */
  async listPurchases(input: { orgCorpId?: string; limit?: number } = {}): Promise<TwinPurchase[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<TwinPurchase[]>(this.config, 'GET', `/api/purchases${qs}`);
  }

  /** List my installed twins. */
  async listInstalls(input: { orgCorpId?: string; namespace?: string } = {}): Promise<TwinInstall[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<TwinInstall[]>(this.config, 'GET', `/api/installs${qs}`);
  }
}
