/**
 * SkillOS — Reviews + reputation unit tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReview, aggregateReviews, sortReviews, setPublisherResponse,
  applyVote, flagReview, REVIEW_STATUSES, VALID_RATINGS,
} from '../../src/services/reviews.js';
import {
  buildReputation, buildLeaderboard, BADGES,
} from '../../src/services/reputation.js';

test('skill-os reviews — buildReview', async (t) => {
  await t.test('creates a review with required fields', () => {
    const r = buildReview({ assetId: 'a-1', reviewerId: 'u-1', rating: 5, title: 'Great' });
    assert.equal(r.rating, 5);
    assert.equal(r.status, 'published');
    assert.equal(r.helpful, 0);
    assert.equal(r.assetId, 'a-1');
    assert.ok(r.id.startsWith('rev-'));
  });

  await t.test('rejects rating outside 1..5', () => {
    assert.throws(() => buildReview({ assetId: 'a', reviewerId: 'u', rating: 0 }), /1\.\.5/);
    assert.throws(() => buildReview({ assetId: 'a', reviewerId: 'u', rating: 6 }), /1\.\.5/);
    assert.throws(() => buildReview({ assetId: 'a', reviewerId: 'u', rating: 'five' }), /1\.\.5/);
  });

  await t.test('verifiedPurchase set when installId is provided', () => {
    const r = buildReview({ assetId: 'a', reviewerId: 'u', rating: 4, installId: 'ins-1' });
    assert.equal(r.verifiedPurchase, true);
    assert.equal(r.installId, 'ins-1');
  });
});

test('skill-os reviews — aggregateReviews', async (t) => {
  await t.test('computes average and distribution', () => {
    const agg = aggregateReviews([
      { rating: 5, status: 'published' },
      { rating: 4, status: 'published' },
      { rating: 3, status: 'published' },
      { rating: 1, status: 'published' },
      { rating: 5, status: 'flagged' }, // excluded
    ]);
    assert.equal(agg.count, 4);
    assert.equal(agg.average, 3.25);
    assert.equal(agg.distribution[5], 1);
    assert.equal(agg.distribution[4], 1);
    assert.equal(agg.distribution[3], 1);
    assert.equal(agg.distribution[1], 1);
  });

  await t.test('handles empty input', () => {
    const agg = aggregateReviews([]);
    assert.equal(agg.count, 0);
    assert.equal(agg.average, 0);
  });
});

test('skill-os reviews — sortReviews', async (t) => {
  const reviews = [
    { id: 'r1', rating: 5, helpful: 5, unhelpful: 1, createdAt: '2026-01-01' },
    { id: 'r2', rating: 3, helpful: 10, unhelpful: 0, createdAt: '2026-02-01' },
    { id: 'r3', rating: 4, helpful: 2, unhelpful: 1, createdAt: '2026-03-01' },
  ];
  await t.test('sort=helpful ranks by net helpful', () => {
    const s = sortReviews(reviews, 'helpful');
    assert.equal(s[0].id, 'r2'); // net 10
  });
  await t.test('sort=recent ranks by createdAt desc', () => {
    const s = sortReviews(reviews, 'recent');
    assert.equal(s[0].id, 'r3');
  });
  await t.test('sort=rating-desc', () => {
    const s = sortReviews(reviews, 'rating-desc');
    assert.equal(s[0].id, 'r1');
  });
});

test('skill-os reviews — voting + flagging + response', async (t) => {
  await t.test('applyVote increments counter', () => {
    const r = buildReview({ assetId: 'a', reviewerId: 'u', rating: 5 });
    const v = applyVote(r, 'helpful');
    assert.equal(v.helpful, 1);
  });

  await t.test('flagReview changes status', () => {
    const r = buildReview({ assetId: 'a', reviewerId: 'u', rating: 5 });
    const f = flagReview(r, 'spam');
    assert.equal(f.status, 'flagged');
    assert.equal(f.flagReason, 'spam');
  });

  await t.test('setPublisherResponse is one-shot', () => {
    const r = buildReview({ assetId: 'a', reviewerId: 'u', rating: 5 });
    const with1 = setPublisherResponse(r, 'thanks');
    assert.equal(with1.publisherResponse, 'thanks');
    assert.throws(() => setPublisherResponse(with1, 'again'), /already responded/);
  });
});

test('skill-os reputation — buildReputation', async (t) => {
  await t.test('computes a profile from data', () => {
    const rep = buildReputation('hojai', {
      assets: [{ id: 'a-1', publisher: 'hojai', totalDownloads: 100, category: 'sales' }],
      reviews: [
        { rating: 5, status: 'published', assetId: 'a-1' },
        { rating: 4, status: 'published', assetId: 'a-1' },
        { rating: 5, status: 'published', assetId: 'a-1' },
      ],
      transactions: [
        { publisherId: 'hojai', tenantId: 't-1', amount: 29, platformFee: 4.35, publisherNet: 24.65, status: 'completed', kind: 'subscription', createdAt: '2026-06-01' },
      ],
      installs: [{ assetId: 'a-1', status: 'installed' }],
      avgResponseHours: 2,
      avgUpdateDays: 7,
    });
    assert.equal(rep.creatorId, 'hojai');
    assert.ok(rep.trustScore > 0);
    assert.equal(rep.totalReviews, 3);
    assert.equal(rep.averageRating, 4.67);
    assert.equal(rep.totalDownloads, 100);
    assert.equal(rep.activeInstalls, 1);
    assert.equal(rep.enterpriseCustomers, 0);
    assert.ok(rep.badges.includes('verified'));
    assert.ok(rep.badges.includes('fast-responder'));
  });

  await t.test('trust score weights sum to 100', () => {
    const rep = buildReputation('p', {
      assets: [{ id: 'a', publisher: 'p' }],
      reviews: [{ rating: 5, status: 'published' }],
      transactions: [], installs: [],
    });
    const sub = rep._subscores;
    assert.ok(sub.rating >= 0 && sub.rating <= 100);
    assert.ok(sub.volume >= 0 && sub.volume <= 100);
    assert.ok(sub.updateFreq >= 0 && sub.updateFreq <= 100);
    assert.ok(sub.responsiveness >= 0 && sub.responsiveness <= 100);
    assert.ok(sub.enterprise >= 0 && sub.enterprise <= 100);
  });

  await t.test('handles empty data', () => {
    const rep = buildReputation('empty');
    assert.equal(rep.creatorId, 'empty');
    assert.equal(rep.totalReviews, 0);
    assert.equal(rep.trustScore, 0);
  });
});

test('skill-os reputation — buildLeaderboard', async (t) => {
  await t.test('ranks and limits', () => {
    const profiles = [
      { creatorId: 'a', trustScore: 80, primaryCategory: 'sales' },
      { creatorId: 'b', trustScore: 90, primaryCategory: 'sales' },
      { creatorId: 'c', trustScore: 70, primaryCategory: 'healthcare' },
    ];
    const board = buildLeaderboard(profiles, { limit: 10 });
    assert.equal(board[0].creatorId, 'b');
    assert.equal(board[0].rank, 1);
    assert.equal(board[1].rank, 2);
  });

  await t.test('filters by category', () => {
    const profiles = [
      { creatorId: 'a', trustScore: 80, primaryCategory: 'sales' },
      { creatorId: 'c', trustScore: 70, primaryCategory: 'healthcare' },
    ];
    const board = buildLeaderboard(profiles, { category: 'sales' });
    assert.equal(board.length, 1);
    assert.equal(board[0].creatorId, 'a');
  });
});
