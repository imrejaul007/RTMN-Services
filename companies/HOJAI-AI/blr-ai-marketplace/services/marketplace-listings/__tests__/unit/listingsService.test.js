/**
 * Unit tests for listingsService — pure service layer with an in-memory Mongo.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import * as svc from '../../src/services/listingsService.js';

beforeAll(async () => {
  await connectTestDb();
});
afterAll(async () => {
  await disconnectTestDb();
});
beforeEach(async () => {
  await clearTestDb();
});

describe('listingsService.createListing', () => {
  test('creates a DRAFT listing when no status supplied', async () => {
    const created = await svc.createListing('tenant-A', {
      title: 'My Agent',
      category: 'agent',
      pricingModel: 'subscription',
      price: 99,
      publisherName: 'Acme',
    });
    expect(created.tenantId).toBe('tenant-A');
    expect(created.status).toBe('DRAFT');
    expect(created.visibility).toBe('PUBLIC');
    expect(created.title).toBe('My Agent');
    expect(created.publishedAt).toBeNull();
  });

  test('creates PUBLISHED immediately if status=PUBLISHED requested', async () => {
    const created = await svc.createListing('tenant-A', {
      title: 'Live Agent',
      category: 'service',
      pricingModel: 'free',
      status: 'PUBLISHED',
      publisherName: 'Acme',
    });
    expect(created.status).toBe('PUBLISHED');
    expect(created.publishedAt).toBeInstanceOf(Date);
  });

  test('rejects unknown category', async () => {
    await expect(
      svc.createListing('t1', { title: 'x', category: 'unknown', publisherName: 'p' }),
    ).rejects.toThrow(/category must be one of/);
  });

  test('rejects negative price', async () => {
    await expect(
      svc.createListing('t1', {
        title: 'x', category: 'agent', pricingModel: 'one-time', price: -5, publisherName: 'p',
      }),
    ).rejects.toThrow(/non-negative/);
  });
});

describe('listingsService.publishListing / unpublishListing', () => {
  test('publish transitions DRAFT → PUBLISHED and sets publishedAt', async () => {
    const created = await svc.createListing('t1', {
      title: 'A', category: 'agent', pricingModel: 'free', publisherName: 'p',
    });
    const pub = await svc.publishListing('t1', created.listingId);
    expect(pub.status).toBe('PUBLISHED');
    expect(pub.publishedAt).toBeInstanceOf(Date);
  });

  test('unpublish transitions PUBLISHED → UNPUBLISHED', async () => {
    const created = await svc.createListing('t1', {
      title: 'A', category: 'agent', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'p',
    });
    const unpub = await svc.unpublishListing('t1', created.listingId);
    expect(unpub.status).toBe('UNPUBLISHED');
  });

  test('publish of unknown listing throws NotFoundError', async () => {
    await expect(svc.publishListing('t1', 'nope')).rejects.toMatchObject({ code: 'MARKETPLACE_NOT_FOUND' });
  });
});

describe('listingsService.updateListing', () => {
  test('updates allowed fields', async () => {
    const created = await svc.createListing('t1', {
      title: 'A', category: 'agent', pricingModel: 'free', publisherName: 'p',
    });
    const updated = await svc.updateListing('t1', created.listingId, {
      title: 'A Renamed', price: 0, tags: ['ai', 'bot'],
    });
    expect(updated.title).toBe('A Renamed');
    expect(updated.tags).toEqual(['ai', 'bot']);
  });

  test('rejects unknown listing', async () => {
    await expect(svc.updateListing('t1', 'nope', { title: 'x' })).rejects.toMatchObject({
      code: 'MARKETPLACE_NOT_FOUND',
    });
  });

  test('rejects invalid category on update', async () => {
    const created = await svc.createListing('t1', {
      title: 'A', category: 'agent', pricingModel: 'free', publisherName: 'p',
    });
    await expect(
      svc.updateListing('t1', created.listingId, { category: 'nope' }),
    ).rejects.toThrow(/category/);
  });
});

describe('listingsService.getListing', () => {
  test('returns PUBLIC + PUBLISHED listing to any tenant', async () => {
    const created = await svc.createListing('tenant-A', {
      title: 'Public Listing', category: 'service', pricingModel: 'free',
      status: 'PUBLISHED', publisherName: 'Acme',
    });
    const got = await svc.getListing('tenant-B', created.listingId);
    expect(got.listingId).toBe(created.listingId);
  });

  test('returns DRAFT only to owner', async () => {
    const created = await svc.createListing('tenant-A', {
      title: 'Draft', category: 'service', pricingModel: 'free', publisherName: 'Acme',
    });
    const got = await svc.getListing('tenant-A', created.listingId);
    expect(got.listingId).toBe(created.listingId);
    await expect(svc.getListing('tenant-B', created.listingId)).rejects.toMatchObject({
      code: 'MARKETPLACE_NOT_FOUND',
    });
  });

  test('returns PRIVATE only to owner', async () => {
    const created = await svc.createListing('tenant-A', {
      title: 'Private', category: 'service', pricingModel: 'free',
      status: 'PUBLISHED', visibility: 'PRIVATE', publisherName: 'Acme',
    });
    await expect(svc.getListing('tenant-B', created.listingId)).rejects.toMatchObject({
      code: 'MARKETPLACE_NOT_FOUND',
    });
    const got = await svc.getListing('tenant-A', created.listingId);
    expect(got.listingId).toBe(created.listingId);
  });

  test('UNLISTED is hidden even from public search', async () => {
    const created = await svc.createListing('tenant-A', {
      title: 'Unlisted', category: 'service', pricingModel: 'free',
      status: 'PUBLISHED', visibility: 'UNLISTED', publisherName: 'Acme',
    });
    // Owner can still see it
    const got = await svc.getListing('tenant-A', created.listingId, { includeUnlisted: true });
    expect(got.listingId).toBe(created.listingId);
    // Non-owner cannot see UNLISTED
    await expect(
      svc.getListing('tenant-B', created.listingId, { includeUnlisted: false }),
    ).rejects.toMatchObject({ code: 'MARKETPLACE_NOT_FOUND' });
  });
});

describe('listingsService.searchListings', () => {
  beforeEach(async () => {
    // Seed: 4 listings across two tenants
    await svc.createListing('tenant-A', {
      title: 'Hotel Bot', category: 'agent', pricingModel: 'subscription', price: 99,
      status: 'PUBLISHED', publisherName: 'Acme', tags: ['hotel', 'booking'],
    });
    await svc.createListing('tenant-A', {
      title: 'Restaurant Twin', category: 'twin', pricingModel: 'one-time', price: 199,
      status: 'PUBLISHED', publisherName: 'Acme', tags: ['restaurant'],
    });
    await svc.createListing('tenant-B', {
      title: 'Pricing Optimizer', category: 'service', pricingModel: 'usage-based', price: 5,
      status: 'PUBLISHED', publisherName: 'Beta', tags: ['pricing', 'ml'],
    });
    await svc.createListing('tenant-B', {
      title: 'Private Beta', category: 'agent', pricingModel: 'free',
      status: 'PUBLISHED', visibility: 'PRIVATE', publisherName: 'Beta',
    });
  });

  test('public search returns PUBLIC + PUBLISHED listings', async () => {
    const res = await svc.searchListings({}, 'tenant-X', false);
    expect(res.total).toBe(3); // excludes tenant-B's PRIVATE
    expect(res.items.every((l) => l.visibility === 'PUBLIC' && l.status === 'PUBLISHED')).toBe(true);
  });

  test('free-text search matches title', async () => {
    const res = await svc.searchListings({ q: 'hotel' }, 'tenant-X', false);
    expect(res.total).toBe(1);
    expect(res.items[0].title).toBe('Hotel Bot');
  });

  test('category filter', async () => {
    const res = await svc.searchListings({ category: 'twin' }, 'tenant-X', false);
    expect(res.total).toBe(1);
    expect(res.items[0].title).toBe('Restaurant Twin');
  });

  test('tag filter', async () => {
    const res = await svc.searchListings({ tag: 'pricing' }, 'tenant-X', false);
    expect(res.total).toBe(1);
    expect(res.items[0].title).toBe('Pricing Optimizer');
  });

  test('pricingModel filter', async () => {
    const res = await svc.searchListings({ pricingModel: 'subscription' }, 'tenant-X', false);
    expect(res.total).toBe(1);
    expect(res.items[0].title).toBe('Hotel Bot');
  });

  test('non-internal caller cannot filter by other tenantId', async () => {
    await expect(
      svc.searchListings({ tenantId: 'tenant-A' }, 'tenant-B', false),
    ).rejects.toThrow(/Cannot filter by another tenantId/);
  });

  test('internal caller can filter by any tenantId', async () => {
    const res = await svc.searchListings({ tenantId: 'tenant-A' }, 'tenant-X', true);
    expect(res.total).toBe(2);
    expect(res.items.every((l) => l.tenantId === 'tenant-A')).toBe(true);
  });

  test('sort by recent (default) uses publishedAt desc', async () => {
    const res = await svc.searchListings({}, 'tenant-X', false);
    expect(res.items.length).toBe(3);
    // Just verify it returns sorted items, not specific order
    for (let i = 1; i < res.items.length; i++) {
      expect(res.items[i - 1].publishedAt >= res.items[i].publishedAt).toBe(true);
    }
  });

  test('pagination (limit + offset)', async () => {
    const res = await svc.searchListings({ limit: 2, offset: 1 }, 'tenant-X', false);
    expect(res.items.length).toBe(2);
    expect(res.total).toBe(3);
    expect(res.limit).toBe(2);
    expect(res.offset).toBe(1);
  });
});

describe('listingsService.recordView / recordInstall', () => {
  test('recordView increments viewCount', async () => {
    const created = await svc.createListing('t1', {
      title: 'A', category: 'agent', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'p',
    });
    expect(created.viewCount).toBe(0);
    await svc.recordView(created.listingId);
    await svc.recordView(created.listingId);
    const got = await svc.getListing('t1', created.listingId);
    expect(got.viewCount).toBe(2);
  });

  test('recordInstall returns false for unknown listing', async () => {
    const ok = await svc.recordInstall('nope');
    expect(ok).toBe(false);
  });

  test('recordInstall returns true and increments', async () => {
    const created = await svc.createListing('t1', {
      title: 'A', category: 'agent', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'p',
    });
    const ok = await svc.recordInstall(created.listingId);
    expect(ok).toBe(true);
    const got = await svc.getListing('t1', created.listingId);
    expect(got.installCount).toBe(1);
  });
});

describe('listingsService.getStats', () => {
  test('aggregates by status + category for a tenant', async () => {
    await svc.createListing('t1', {
      title: 'A', category: 'agent', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'p',
    });
    await svc.createListing('t1', {
      title: 'B', category: 'twin', pricingModel: 'free', status: 'DRAFT', publisherName: 'p',
    });
    await svc.createListing('t2', {
      title: 'C', category: 'agent', pricingModel: 'free', status: 'PUBLISHED', publisherName: 'p',
    });
    const stats = await svc.getStats('t1');
    expect(stats.total).toBe(2);
    expect(stats.byStatus.PUBLISHED).toBe(1);
    expect(stats.byStatus.DRAFT).toBe(1);
    expect(stats.byCategory.agent).toBe(1);
    expect(stats.byCategory.twin).toBe(1);
  });
});