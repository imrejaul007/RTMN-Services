/**
 * Unit tests for partnerService — recording interactions, deriving
 * partnerships on both sides, recommendations, and stats.
 */

import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import * as svc from '../../src/services/partnerService.js';
import { Partnership } from '../../src/models/Partnership.js';
import { Interaction } from '../../src/models/Interaction.js';

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

// -----------------------------------------------------------------------------
// recordInteraction
// -----------------------------------------------------------------------------

describe('recordInteraction', () => {
  test('creates the interaction and updates both sides of the partnership', async () => {
    const i = await svc.recordInteraction('tenant-a', {
      partnerRef: 'tenant-b',
      partnerType: 'tenant',
      type: 'transaction',
      direction: 'outgoing',
      value: 1000,
    });
    expect(i.tenantId).toBe('tenant-a');
    expect(i.partnerRef).toBe('tenant-b');
    expect(i.value).toBe(1000);

    const aToB = await Partnership.findOne({ tenantId: 'tenant-a', partnerRef: 'tenant-b' });
    expect(aToB).toBeTruthy();
    expect(aToB.transactionCount).toBe(1);
    expect(aToB.totalGmv).toBe(1000);

    const bToA = await Partnership.findOne({ tenantId: 'tenant-b', partnerRef: 'tenant-a' });
    expect(bToA).toBeTruthy();
    expect(bToA.transactionCount).toBe(1);
    expect(bToA.totalGmv).toBe(1000);
  });

  test('rejects missing partnerRef', async () => {
    await expect(svc.recordInteraction('t', { partnerType: 'tenant', type: 'transaction', direction: 'outgoing' }))
      .rejects.toThrow(/partnerRef/);
  });

  test('rejects invalid type', async () => {
    await expect(svc.recordInteraction('t', {
      partnerRef: 'p', partnerType: 'tenant', type: 'BAD', direction: 'outgoing',
    })).rejects.toThrow(/type/);
  });

  test('rejects invalid direction', async () => {
    await expect(svc.recordInteraction('t', {
      partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'sideways',
    })).rejects.toThrow(/direction/);
  });

  test('rejects negative value', async () => {
    await expect(svc.recordInteraction('t', {
      partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: -100,
    })).rejects.toThrow(/value/);
  });

  test('rejects rating out of 0-5', async () => {
    await expect(svc.recordInteraction('t', {
      partnerRef: 'p', partnerType: 'tenant', type: 'review', direction: 'outgoing', rating: 7,
    })).rejects.toThrow(/rating/);
  });

  test('multiple interactions accumulate count + gmv', async () => {
    await svc.recordInteraction('tenant-a', {
      partnerRef: 'tenant-b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100,
    });
    await svc.recordInteraction('tenant-a', {
      partnerRef: 'tenant-b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 250,
    });
    await svc.recordInteraction('tenant-a', {
      partnerRef: 'tenant-b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 50,
    });
    const p = await Partnership.findOne({ tenantId: 'tenant-a', partnerRef: 'tenant-b' });
    expect(p.transactionCount).toBe(3);
    expect(p.totalGmv).toBe(400);
  });

  test('strength grows with more interactions + recency', async () => {
    // First interaction: weak
    await svc.recordInteraction('tenant-a', {
      partnerRef: 'tenant-b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100,
    });
    const p1 = await Partnership.findOne({ tenantId: 'tenant-a', partnerRef: 'tenant-b' });
    const s1 = p1.strength;

    // Many more + ratings: stronger
    for (let i = 0; i < 10; i++) {
      await svc.recordInteraction('tenant-a', {
        partnerRef: 'tenant-b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5,
      });
    }
    const p2 = await Partnership.findOne({ tenantId: 'tenant-a', partnerRef: 'tenant-b' });
    expect(p2.strength).toBeGreaterThan(s1);
    // 10 of 11 interactions had rating=5, 1 had no rating (counted as 0 in the average)
    expect(p2.averageRating).toBeCloseTo(50 / 11, 1);
  });

  test('rating runs as a true average', async () => {
    await svc.recordInteraction('t', { partnerRef: 'p', partnerType: 'tenant', type: 'review', direction: 'outgoing', rating: 3 });
    await svc.recordInteraction('t', { partnerRef: 'p', partnerType: 'tenant', type: 'review', direction: 'outgoing', rating: 5 });
    const p = await Partnership.findOne({ tenantId: 't', partnerRef: 'p' });
    expect(p.averageRating).toBe(4);
  });

  test('relationshipType hint sets the relationship', async () => {
    await svc.recordInteraction('t', {
      partnerRef: 'sup-1', partnerType: 'company', type: 'transaction', direction: 'outgoing', value: 100,
      relationshipType: 'supplier',
    });
    const p = await Partnership.findOne({ tenantId: 't', partnerRef: 'sup-1' });
    expect(p.relationshipType).toBe('supplier');
  });

  test('relationshipType hint is ignored if unknown', async () => {
    await svc.recordInteraction('t', {
      partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100,
      relationshipType: 'mystery',
    });
    const p = await Partnership.findOne({ tenantId: 't', partnerRef: 'p' });
    expect(p.relationshipType).toBe('unknown');
  });

  test('persists interaction in DB', async () => {
    await svc.recordInteraction('t', {
      partnerRef: 'p', partnerType: 'tenant', type: 'negotiation', direction: 'outgoing',
    });
    const count = await Interaction.countDocuments({});
    expect(count).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// listPartnerships / getPartnership
// -----------------------------------------------------------------------------

describe('listPartnerships / getPartnership', () => {
  test('listPartnerships returns all for tenant sorted by strength', async () => {
    await svc.recordInteraction('t', { partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await svc.recordInteraction('t', { partnerRef: 'b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    // Bump up b's strength
    for (let i = 0; i < 5; i++) {
      await svc.recordInteraction('t', { partnerRef: 'b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100, rating: 5 });
    }
    const result = await svc.listPartnerships('t', {});
    expect(result.total).toBe(2);
    expect(result.items[0].partnerRef).toBe('b'); // stronger
  });

  test('listPartnerships is per-tenant', async () => {
    await svc.recordInteraction('tenant-a', { partnerRef: 'x', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await svc.recordInteraction('tenant-b', { partnerRef: 'y', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const a = await svc.listPartnerships('tenant-a', {});
    const b = await svc.listPartnerships('tenant-b', {});
    expect(a.total).toBe(1);
    expect(b.total).toBe(1);
    expect(a.items[0].partnerRef).toBe('x');
    expect(b.items[0].partnerRef).toBe('y');
  });

  test('listPartnerships filters by relationshipType', async () => {
    await svc.recordInteraction('t', { partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100, relationshipType: 'supplier' });
    await svc.recordInteraction('t', { partnerRef: 'b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100, relationshipType: 'customer' });
    const suppliers = await svc.listPartnerships('t', { relationshipType: 'supplier' });
    expect(suppliers.total).toBe(1);
    expect(suppliers.items[0].partnerRef).toBe('a');
  });

  test('listPartnerships filters by minStrength', async () => {
    await svc.recordInteraction('t', { partnerRef: 'weak', partnerType: 'tenant', type: 'inquiry', direction: 'outgoing' });
    for (let i = 0; i < 10; i++) {
      await svc.recordInteraction('t', { partnerRef: 'strong', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5 });
    }
    const result = await svc.listPartnerships('t', { minStrength: 0.3 });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items.every((i) => i.strength >= 0.3)).toBe(true);
  });

  test('listPartnerships respects limit/offset', async () => {
    for (let i = 0; i < 5; i++) {
      await svc.recordInteraction('t', { partnerRef: `p${i}`, partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    }
    const page = await svc.listPartnerships('t', { limit: 2, offset: 1 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
  });

  test('listPartnerships supports sort=recent', async () => {
    await svc.recordInteraction('t', { partnerRef: 'old', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    // Simulate old timestamp
    await Partnership.updateOne({ tenantId: 't', partnerRef: 'old' }, { $set: { lastInteractionAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    await svc.recordInteraction('t', { partnerRef: 'new', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const result = await svc.listPartnerships('t', { sort: 'recent' });
    expect(result.items[0].partnerRef).toBe('new');
  });

  test('getPartnership returns one', async () => {
    await svc.recordInteraction('t', { partnerRef: 'p', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const p = await svc.getPartnership('t', 'p');
    expect(p.partnerRef).toBe('p');
  });

  test('getPartnership throws NotFoundError for missing', async () => {
    await expect(svc.getPartnership('t', 'nope')).rejects.toThrow(/not found/i);
  });

  test('listByType wraps listPartnerships', async () => {
    await svc.recordInteraction('t', { partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100, relationshipType: 'supplier' });
    const suppliers = await svc.listByType('t', 'supplier');
    expect(suppliers.total).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// recommendPartners
// -----------------------------------------------------------------------------

describe('recommendPartners', () => {
  test('returns top existing partnerships sorted by composite score', async () => {
    await svc.recordInteraction('t', { partnerRef: 'weak', partnerType: 'tenant', type: 'inquiry', direction: 'outgoing' });
    for (let i = 0; i < 10; i++) {
      await svc.recordInteraction('t', { partnerRef: 'strong', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5 });
    }
    const result = await svc.recommendPartners('t', { limit: 5 });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items[0].partnerRef).toBe('strong');
    expect(result.items[0].existing).toBe(true);
    expect(result.items[0].score).toBeGreaterThan(0);
  });

  test('scores candidate list against existing partnerships', async () => {
    await svc.recordInteraction('t', { partnerRef: 'known', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 1000, rating: 5 });
    const result = await svc.recommendPartners('t', {
      candidates: [
        { partnerRef: 'known', partnerType: 'tenant', trustScore: 90 },
        { partnerRef: 'unknown', partnerType: 'company', trustScore: 50 },
      ],
    });
    expect(result.items.length).toBe(2);
    // known should outrank unknown (existing partnership strength)
    expect(result.items[0].partnerRef).toBe('known');
    expect(result.items[0].existing).toBe(true);
    expect(result.items[1].partnerRef).toBe('unknown');
    expect(result.items[1].existing).toBe(false);
  });

  test('respects minStrength filter', async () => {
    await svc.recordInteraction('t', { partnerRef: 'weak', partnerType: 'tenant', type: 'inquiry', direction: 'outgoing' });
    const result = await svc.recommendPartners('t', { minStrength: 0.5 });
    expect(result.items.every((i) => i.score >= 0.5)).toBe(true);
  });

  test('respects limit', async () => {
    for (let i = 0; i < 5; i++) {
      await svc.recordInteraction('t', { partnerRef: `p${i}`, partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    }
    const result = await svc.recommendPartners('t', { limit: 2 });
    expect(result.items.length).toBe(2);
  });

  test('empty recommendations when no partnerships', async () => {
    const result = await svc.recommendPartners('t', {});
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// getStats
// -----------------------------------------------------------------------------

describe('getStats', () => {
  test('returns counts and totals', async () => {
    await svc.recordInteraction('t', { partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await svc.recordInteraction('t', { partnerRef: 'b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 200, relationshipType: 'supplier' });
    const stats = await svc.getStats('t');
    expect(stats.totalPartners).toBe(2);
    expect(stats.totalInteractions).toBe(2);
    expect(stats.totalGmv).toBe(300);
    expect(stats.byRelationshipType.supplier).toBe(1);
    expect(stats.byRelationshipType.unknown).toBe(1);
  });

  test('avgStrength returns 0 for no partnerships', async () => {
    const stats = await svc.getStats('t');
    expect(stats.avgStrength).toBe(0);
    expect(stats.totalPartners).toBe(0);
  });

  test('is per-tenant', async () => {
    await svc.recordInteraction('tenant-a', { partnerRef: 'x', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await svc.recordInteraction('tenant-b', { partnerRef: 'y', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const a = await svc.getStats('tenant-a');
    const b = await svc.getStats('tenant-b');
    expect(a.totalPartners).toBe(1);
    expect(b.totalPartners).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// listInteractions
// -----------------------------------------------------------------------------

describe('listInteractions', () => {
  test('returns interactions for tenant', async () => {
    await svc.recordInteraction('t', { partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await svc.recordInteraction('t', { partnerRef: 'b', partnerType: 'tenant', type: 'negotiation', direction: 'outgoing' });
    const result = await svc.listInteractions('t', {});
    expect(result.total).toBe(2);
  });

  test('filters by partnerRef', async () => {
    await svc.recordInteraction('t', { partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await svc.recordInteraction('t', { partnerRef: 'b', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const result = await svc.listInteractions('t', { partnerRef: 'a' });
    expect(result.total).toBe(1);
    expect(result.items[0].partnerRef).toBe('a');
  });

  test('filters by type', async () => {
    await svc.recordInteraction('t', { partnerRef: 'a', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    await svc.recordInteraction('t', { partnerRef: 'b', partnerType: 'tenant', type: 'negotiation', direction: 'outgoing' });
    const result = await svc.listInteractions('t', { type: 'negotiation' });
    expect(result.total).toBe(1);
  });

  test('is per-tenant', async () => {
    await svc.recordInteraction('tenant-a', { partnerRef: 'x', partnerType: 'tenant', type: 'transaction', direction: 'outgoing', value: 100 });
    const a = await svc.listInteractions('tenant-a', {});
    const b = await svc.listInteractions('tenant-b', {});
    expect(a.total).toBe(1);
    expect(b.total).toBe(0);
  });
});