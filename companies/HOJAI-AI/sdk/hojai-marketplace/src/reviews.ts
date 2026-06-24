/**
 * BAM Reviews Client
 *
 * Wraps the reviews endpoints of marketplace-listings (port 4250). One
 * review per (tenant, listing) pair. Dimensions are optional 1-5 ratings
 * across easeOfUse, documentation, support, valueForMoney.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface ReviewDimensions {
  easeOfUse?: number;
  documentation?: number;
  support?: number;
  valueForMoney?: number;
}

export interface Review {
  id: string;
  tenantId: string;
  listingId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
  dimensions: ReviewDimensions;
  status: 'published' | 'hidden' | 'flagged' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export interface AddOrUpdateReviewRequest {
  rating: number;
  title?: string;
  body?: string;
  dimensions?: ReviewDimensions;
}

export interface AddOrUpdateReviewResult {
  review: Review;
  /** Denormalized listing with recomputed averageRating + reviewCount */
  listing: { listingId: string; averageRating: number; reviewCount: number };
  created: boolean;
}

export interface ListReviewsRequest {
  status?: 'published' | 'hidden' | 'flagged' | 'removed';
  limit?: number;
  offset?: number;
}

export interface ListReviewsResult {
  items: Review[];
  total: number;
  limit: number;
  offset: number;
}

export class ReviewsClient {
  constructor(private config: HojaiConfig) {}

  /** Add or update my review for a listing (PUT semantics — one review per tenant+listing). */
  async addOrUpdate(listingId: string, input: AddOrUpdateReviewRequest): Promise<AddOrUpdateReviewResult> {
    return request<AddOrUpdateReviewResult>(
      this.config,
      'PUT',
      `/api/listings/${encodeURIComponent(listingId)}/reviews`,
      input,
    );
  }

  /** List reviews for a listing. */
  async list(listingId: string, input: ListReviewsRequest = {}): Promise<ListReviewsResult> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<ListReviewsResult>(
      this.config,
      'GET',
      `/api/listings/${encodeURIComponent(listingId)}/reviews${qs}`,
    );
  }

  /** Hide a review (owner only — sets status='hidden'). */
  async hide(reviewId: string): Promise<{ hidden: boolean; reviewId: string }> {
    return request<{ hidden: boolean; reviewId: string }>(
      this.config,
      'DELETE',
      `/api/reviews/${encodeURIComponent(reviewId)}`,
    );
  }

  /** Get the current caller's review for a listing, if any. */
  async getMine(listingId: string): Promise<Review | null> {
    const res = await request<{ review: Review | null }>(
      this.config,
      'GET',
      `/api/my-reviews?listingId=${encodeURIComponent(listingId)}`,
    );
    return res.review;
  }
}
