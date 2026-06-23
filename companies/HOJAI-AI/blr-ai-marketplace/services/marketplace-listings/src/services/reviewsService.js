/**
 * Reviews service — add / list / hide reviews for a listing.
 *
 * Per ADR-0010 Phase 5 (2026-06-22): per-tenant reviews, one per (tenant, listing).
 * Updating the listing's denormalized `averageRating` and `reviewCount` is
 * the responsibility of this service (not a Mongoose hook) so we have
 * explicit control over the math.
 */

import { randomUUID } from 'node:crypto';
import { Review, REVIEW_STATUS } from '../models/Review.js';
import { Listing } from '../models/Listing.js';
import { NotFoundError, ValidationError, ConflictError } from './listingsService.js';

export { REVIEW_STATUS };

export class ValidationErrorReviews extends Error {
  constructor(message, issues) {
    let fullMessage = message;
    if (issues && typeof issues === 'object') {
      const details = Object.entries(issues)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      if (details) fullMessage = `${message}: ${details}`;
    }
    super(fullMessage);
    this.name = 'ValidationErrorReviews';
    this.status = 400;
    this.code = 'MARKETPLACE_REVIEW_VALIDATION';
    this.issues = issues;
  }
}

function validateReviewBody(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationErrorReviews('Body required');
  }
  const issues = {};
  if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
    issues.rating = 'rating must be a number between 1 and 5';
  }
  if (body.title !== undefined && typeof body.title !== 'string') {
    issues.title = 'title must be a string';
  }
  if (body.body !== undefined && typeof body.body !== 'string') {
    issues.body = 'body must be a string';
  }
  if (body.dimensions !== undefined) {
    if (typeof body.dimensions !== 'object' || body.dimensions === null || Array.isArray(body.dimensions)) {
      issues.dimensions = 'dimensions must be an object';
    } else {
      const allowed = ['easeOfUse', 'documentation', 'support', 'valueForMoney'];
      for (const [k, v] of Object.entries(body.dimensions)) {
        if (!allowed.includes(k)) {
          issues.dimensions = `unknown dimension: ${k}`;
        } else if (typeof v !== 'number' || v < 1 || v > 5) {
          issues.dimensions = `dimension ${k} must be between 1 and 5`;
        }
      }
    }
  }
  if (Object.keys(issues).length) {
    throw new ValidationErrorReviews('Invalid review body', issues);
  }
}

/**
 * Compute the new averageRating for a listing from all published reviews.
 * Returns { averageRating, reviewCount }.
 */
async function recomputeRating(listingId) {
  const agg = await Review.aggregate([
    { $match: { listingId, status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  const avg = agg.length ? Math.round(agg[0].avg * 100) / 100 : 0;
  const n = agg.length ? agg[0].n : 0;
  await Listing.updateOne({ listingId }, { $set: { averageRating: avg, reviewCount: n } });
  return { averageRating: avg, reviewCount: n };
}

/**
 * Add or update a review. One per (tenant, listing) — re-reviewing replaces
 * the old one (the review body is editable until the tenant changes it).
 */
export async function addOrUpdateReview(tenantId, listingId, body) {
  validateReviewBody(body);
  const listing = await Listing.findOne({ listingId });
  if (!listing) throw new NotFoundError(`Listing not found: ${listingId}`);

  // The listing must be published OR owned by the reviewer to be reviewable.
  if (listing.status !== 'PUBLISHED' && listing.tenantId !== tenantId) {
    throw new ValidationError('Cannot review an unpublished listing from another tenant');
  }

  const existing = await Review.findOne({ tenantId, listingId });
  if (existing) {
    // Edit
    existing.rating = body.rating;
    existing.title = body.title || '';
    existing.body = body.body || '';
    existing.reviewerId = body.reviewerId || existing.reviewerId;
    existing.reviewerName = body.reviewerName || existing.reviewerName;
    if (body.dimensions) existing.dimensions = body.dimensions;
    existing.status = 'published';
    await existing.save();
    const summary = await recomputeRating(listingId);
    return { review: existing.toObject(), listing: summary, created: false };
  }

  const review = await Review.create({
    tenantId,
    reviewId: randomUUID(),
    listingId,
    listingTenantId: listing.tenantId,
    reviewerId: body.reviewerId || 'anonymous',
    reviewerName: body.reviewerName || 'Anonymous',
    rating: body.rating,
    title: body.title || '',
    body: body.body || '',
    dimensions: body.dimensions || undefined,
    metadata: body.metadata || {},
  });
  const summary = await recomputeRating(listingId);
  return { review: review.toObject(), listing: summary, created: true };
}

/**
 * List reviews for a listing. Default: published only.
 * Options: { status, limit, offset, includeUnpublished (only by listing owner) }
 */
export async function listReviews(listingId, options = {}) {
  const { status = 'published', limit = 50, offset = 0 } = options;
  const cap = Math.min(Math.max(limit, 1), 200);
  const filter = { listingId, status };
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(Math.max(offset, 0)).limit(cap),
    Review.countDocuments(filter),
  ]);
  return { items: items.map((d) => d.toObject()), total, limit: cap, offset: Math.max(offset, 0) };
}

/**
 * Hide a review. Only the listing owner (publisher) or the review's tenant can hide it.
 */
export async function hideReview(tenantId, reviewId) {
  const review = await Review.findOne({ reviewId });
  if (!review) throw new NotFoundError(`Review not found: ${reviewId}`);
  if (review.tenantId !== tenantId) {
    // Check if caller owns the listing
    const listing = await Listing.findOne({ listingId: review.listingId });
    if (!listing || listing.tenantId !== tenantId) {
      throw new ValidationError('Only the reviewer or the listing publisher can hide a review');
    }
  }
  review.status = 'hidden';
  await review.save();
  const summary = await recomputeRating(review.listingId);
  return { review: review.toObject(), listing: summary };
}

/**
 * Get the review left by a specific tenant for a listing (or null).
 */
export async function getMyReview(tenantId, listingId) {
  const r = await Review.findOne({ tenantId, listingId });
  return r ? r.toObject() : null;
}
