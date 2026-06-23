/**
 * Marketplace Review — a tenant's review of a listing.
 *
 * Per ADR-0010 Phase 5 (2026-06-22): per-tenant reviews. A tenant can leave
 * at most one review per listing (so we keep a unique compound index).
 * Reviews contribute to `Listing.averageRating` and `Listing.reviewCount`
 * (denormalized for fast list reads).
 *
 * Reviews are immutable once posted. A review can be marked `hidden` by
 * the publisher (or by an admin) but cannot be edited.
 *
 * Note: we intentionally do NOT allow reviews on PRIVATE listings to be
 * visible to other tenants — see `Review.visibleTo` logic in the service.
 */

import mongoose from 'mongoose';

export const REVIEW_STATUS = ['published', 'hidden', 'flagged', 'removed'];

const ReviewSchema = new mongoose.Schema(
  {
    tenantId:    { type: String, required: true, index: true },
    reviewId:    { type: String, required: true },
    listingId:   { type: String, required: true, index: true },
    listingTenantId: { type: String, required: true, index: true },
    reviewerId:   { type: String, required: true },         // user id (or "anonymous")
    reviewerName: { type: String, default: 'Anonymous' },
    rating:      { type: Number, required: true, min: 1, max: 5 },
    title:       { type: String, default: '' },
    body:        { type: String, default: '' },
    // Optional structured dimensions (1-5 each)
    dimensions: {
      easeOfUse:     { type: Number, min: 1, max: 5 },
      documentation: { type: Number, min: 1, max: 5 },
      support:       { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
    },
    status:      { type: String, enum: REVIEW_STATUS, default: 'published', index: true },
    metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt:   { type: Date, default: Date.now, index: true },
    updatedAt:   { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false },
);

// One review per (tenant, listing) — so different tenants can review the same listing independently.
ReviewSchema.index({ tenantId: 1, listingId: 1 }, { unique: true });
ReviewSchema.index({ listingId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ listingTenantId: 1, status: 1, createdAt: -1 });

ReviewSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Review = mongoose.model('MarketplaceReview', ReviewSchema);
export default Review;
