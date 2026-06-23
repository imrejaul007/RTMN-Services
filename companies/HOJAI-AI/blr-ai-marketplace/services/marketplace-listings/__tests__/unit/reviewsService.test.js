/**
 * Unit tests for reviewsService — uses listingsService to set up published listings.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import * as listings from '../../src/services/listingsService.js';
import * as reviews from '../../src/services/reviewsService.js';

let publishedListingId;
let unpublishedListingId;

beforeAll(async () => {
  await connectTestDb();
});
afterAll(async () => {
  await disconnectTestDb();
});
beforeEach(async () => {
  await clearTestDb();
  const pub = await listings.createListing('publisher-A', {
    title: 'Hotel Bot', category: 'agent', pricingModel: 'subscription', price: 99,
    status: 'PUBLISHED', publisherName: 'Acme',
  });
  publishedListingId = pub.listingId;

  const draft = await listings.createListing('publisher-A', {
    title: 'Draft Only', category: 'agent', pricingModel: 'free', publisherName: 'Acme',
  });
  unpublishedListingId = draft.listingId;
});

describe('reviewsService.addOrUpdateReview', () => {
  test('creates a review on a PUBLISHED listing', async () => {
    const result = await reviews.addOrUpdateReview('tenant-B', publishedListingId, {
      rating: 5, title: 'Great', body: 'Loved it', reviewerId: 'u1', reviewerName: 'Bob',
    });
    expect(result.created).toBe(true);
    expect(result.review.rating).toBe(5);
    expect(result.listing.averageRating).toBe(5);
    expect(result.listing.reviewCount).toBe(1);
  });

  test('updating existing review replaces rating and recomputes', async () => {
    await reviews.addOrUpdateReview('tenant-B', publishedListingId, {
      rating: 3, reviewerId: 'u1',
    });
    const update = await reviews.addOrUpdateReview('tenant-B', publishedListingId, {
      rating: 5, reviewerId: 'u1', body: 'Changed my mind',
    });
    expect(update.created).toBe(false);
    expect(update.review.rating).toBe(5);
    expect(update.review.body).toBe('Changed my mind');
    expect(update.listing.reviewCount).toBe(1);
    expect(update.listing.averageRating).toBe(5);
  });

  test('two different tenants both review the same listing (separate reviews)', async () => {
    await reviews.addOrUpdateReview('tenant-B', publishedListingId, { rating: 5, reviewerId: 'u1' });
    const second = await reviews.addOrUpdateReview('tenant-C', publishedListingId, {
      rating: 3, reviewerId: 'u2',
    });
    expect(second.created).toBe(true);
    const got = await listings.getListing('publisher-A', publishedListingId);
    expect(got.reviewCount).toBe(2);
    expect(got.averageRating).toBe(4); // (5+3)/2
  });

  test('rejects review on unpublished listing from another tenant', async () => {
    await expect(
      reviews.addOrUpdateReview('tenant-B', unpublishedListingId, { rating: 5, reviewerId: 'u1' }),
    ).rejects.toThrow(/Cannot review an unpublished listing/);
  });

  test('publisher can review their own unpublished listing', async () => {
    const result = await reviews.addOrUpdateReview('publisher-A', unpublishedListingId, {
      rating: 4, reviewerId: 'p1',
    });
    expect(result.created).toBe(true);
  });

  test('rejects invalid rating', async () => {
    await expect(
      reviews.addOrUpdateReview('tenant-B', publishedListingId, { rating: 6, reviewerId: 'u1' }),
    ).rejects.toThrow(/between 1 and 5/);
  });

  test('rejects unknown listing', async () => {
    await expect(
      reviews.addOrUpdateReview('tenant-B', 'nope', { rating: 5, reviewerId: 'u1' }),
    ).rejects.toMatchObject({ code: 'MARKETPLACE_NOT_FOUND' });
  });

  test('preserves dimensions on review', async () => {
    const result = await reviews.addOrUpdateReview('tenant-B', publishedListingId, {
      rating: 4,
      dimensions: { easeOfUse: 5, documentation: 4, support: 3, valueForMoney: 5 },
      reviewerId: 'u1',
    });
    expect(result.review.dimensions.easeOfUse).toBe(5);
    expect(result.review.dimensions.valueForMoney).toBe(5);
  });
});

describe('reviewsService.listReviews', () => {
  beforeEach(async () => {
    await reviews.addOrUpdateReview('tA', publishedListingId, { rating: 5, reviewerId: 'u1' });
    await reviews.addOrUpdateReview('tB', publishedListingId, { rating: 3, reviewerId: 'u2' });
    await reviews.addOrUpdateReview('tC', publishedListingId, { rating: 4, reviewerId: 'u3' });
  });

  test('lists all published reviews by default', async () => {
    const res = await reviews.listReviews(publishedListingId);
    expect(res.total).toBe(3);
    expect(res.items.every((r) => r.status === 'published')).toBe(true);
  });

  test('hides hidden reviews from default list', async () => {
    const reviews_list = await reviews.listReviews(publishedListingId);
    const to_hide = reviews_list.items[0];
    await reviews.hideReview(to_hide.tenantId, to_hide.reviewId);
    const after = await reviews.listReviews(publishedListingId);
    expect(after.total).toBe(2);
  });

  test('pagination works', async () => {
    const res = await reviews.listReviews(publishedListingId, { limit: 2, offset: 1 });
    expect(res.items.length).toBe(2);
    expect(res.total).toBe(3);
  });
});

describe('reviewsService.hideReview', () => {
  test('reviewer can hide their own review', async () => {
    const { review } = await reviews.addOrUpdateReview('tA', publishedListingId, {
      rating: 5, reviewerId: 'u1',
    });
    const result = await reviews.hideReview('tA', review.reviewId);
    expect(result.review.status).toBe('hidden');
  });

  test('listing publisher can hide a review left on their listing', async () => {
    const { review } = await reviews.addOrUpdateReview('tA', publishedListingId, {
      rating: 1, reviewerId: 'u1',
    });
    const result = await reviews.hideReview('publisher-A', review.reviewId);
    expect(result.review.status).toBe('hidden');
  });

  test('random other tenant cannot hide', async () => {
    const { review } = await reviews.addOrUpdateReview('tA', publishedListingId, {
      rating: 1, reviewerId: 'u1',
    });
    await expect(
      reviews.hideReview('tenant-XYZ', review.reviewId),
    ).rejects.toThrow(/Only the reviewer or the listing publisher/);
  });

  test('rejects unknown reviewId', async () => {
    await expect(
      reviews.hideReview('tA', 'nope'),
    ).rejects.toMatchObject({ code: 'MARKETPLACE_NOT_FOUND' });
  });

  test('hiding a review recomputes listing rating', async () => {
    await reviews.addOrUpdateReview('tA', publishedListingId, { rating: 5, reviewerId: 'u1' });
    await reviews.addOrUpdateReview('tB', publishedListingId, { rating: 1, reviewerId: 'u2' });
    const before = await listings.getListing('publisher-A', publishedListingId);
    expect(before.averageRating).toBe(3);
    expect(before.reviewCount).toBe(2);

    const reviews_list = await reviews.listReviews(publishedListingId);
    const low_review = reviews_list.items.find((r) => r.rating === 1);
    await reviews.hideReview('tB', low_review.reviewId);

    const after = await listings.getListing('publisher-A', publishedListingId);
    expect(after.averageRating).toBe(5);
    expect(after.reviewCount).toBe(1);
  });
});

describe('reviewsService.getMyReview', () => {
  test('returns null when no review exists', async () => {
    const r = await reviews.getMyReview('tA', publishedListingId);
    expect(r).toBeNull();
  });

  test('returns the review when one exists', async () => {
    await reviews.addOrUpdateReview('tA', publishedListingId, { rating: 4, reviewerId: 'u1' });
    const r = await reviews.getMyReview('tA', publishedListingId);
    expect(r).not.toBeNull();
    expect(r.rating).toBe(4);
  });

  test('isolated per tenant', async () => {
    await reviews.addOrUpdateReview('tA', publishedListingId, { rating: 5, reviewerId: 'u1' });
    const other = await reviews.getMyReview('tB', publishedListingId);
    expect(other).toBeNull();
  });
});