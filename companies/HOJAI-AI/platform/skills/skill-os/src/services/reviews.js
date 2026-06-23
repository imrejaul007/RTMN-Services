/**
 * SkillOS — Reviews and ratings
 *
 * Review CRUD, helpful votes, publisher responses, flagging.
 * Auto-computes asset-level rating aggregates on every write.
 */

import { v4 as uuidv4 } from 'uuid';

export const REVIEW_STATUSES = ['published', 'flagged', 'removed'];
export const VALID_RATINGS = [1, 2, 3, 4, 5];

/**
 * Build a new review record.
 *
 * @param {object} input
 * @param {string} input.assetId
 * @param {string} input.reviewerId
 * @param {number} input.rating — 1..5
 * @param {string} [input.title]
 * @param {string} [input.body]
 * @param {string[]} [input.pros]
 * @param {string[]} [input.cons]
 * @param {string} [input.installId] — for verified-purchase check
 */
export function buildReview(input) {
  const { assetId, reviewerId, rating } = input;
  if (!assetId) throw new Error('assetId required');
  if (!reviewerId) throw new Error('reviewerId required');
  const r = Number(rating);
  if (!Number.isInteger(r) || !VALID_RATINGS.includes(r)) {
    throw new Error(`rating must be 1..5, got ${rating}`);
  }
  return {
    id: `rev-${uuidv4().slice(0, 8)}`,
    assetId,
    reviewerId,
    rating: r,
    title: input.title || '',
    body: input.body || '',
    pros: Array.isArray(input.pros) ? input.pros : [],
    cons: Array.isArray(input.cons) ? input.cons : [],
    verifiedPurchase: !!input.installId,
    installId: input.installId || null,
    helpful: 0,
    unhelpful: 0,
    status: 'published',
    publisherResponse: null,
    publisherRespondedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compute rating aggregates from a list of reviews.
 * Returns: { count, average, distribution: {1:n, 2:n, ...} }
 */
export function aggregateReviews(reviews) {
  const arr = Array.isArray(reviews) ? reviews.filter((r) => r.status === 'published') : [];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of arr) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    sum += r.rating;
  }
  return {
    count: arr.length,
    average: arr.length > 0 ? +(sum / arr.length).toFixed(2) : 0,
    distribution,
  };
}

/**
 * Sort reviews: by helpful (default), by recent, or by rating.
 */
export function sortReviews(reviews, sort = 'helpful') {
  const arr = [...(reviews || [])];
  if (sort === 'recent') {
    arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else if (sort === 'rating-asc') {
    arr.sort((a, b) => a.rating - b.rating);
  } else if (sort === 'rating-desc') {
    arr.sort((a, b) => b.rating - a.rating);
  } else {
    // helpful: highest net helpful first
    arr.sort((a, b) => (b.helpful - b.unhelpful) - (a.helpful - a.unhelpful));
  }
  return arr;
}

/**
 * Set publisher response on a review.
 */
export function setPublisherResponse(review, response) {
  if (review.publisherResponse) {
    throw new Error('publisher has already responded to this review');
  }
  return {
    ...review,
    publisherResponse: response,
    publisherRespondedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Cast a helpful/unhelpful vote.
 * Idempotent at the call-site (we check if the voter already voted).
 */
export function applyVote(review, kind) {
  if (kind !== 'helpful' && kind !== 'unhelpful') {
    throw new Error(`invalid vote kind: ${kind}`);
  }
  return {
    ...review,
    [kind]: (review[kind] || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Flag a review for moderation.
 */
export function flagReview(review, reason) {
  if (review.status === 'removed') return review;
  return {
    ...review,
    status: 'flagged',
    flagReason: reason || 'unspecified',
    flaggedAt: new Date().toISOString(),
  };
}