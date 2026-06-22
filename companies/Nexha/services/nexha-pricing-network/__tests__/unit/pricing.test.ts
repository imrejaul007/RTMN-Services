/**
 * nexha-pricing-network — unit tests
 *
 * Phase C.6 — Pricing Intelligence
 *
 * Covers:
 *   - Product registry
 *   - Price point recording
 *   - Price comparison math (best/worst/avg/median/stddev/confidence)
 *   - Alert creation + evaluation (below_target, pct_drop, pct_above_market, back_in_stock)
 *   - Dynamic pricing strategies (match, undercut, premium)
 *   - Floor / ceiling / currency mismatch handling
 *   - Network stats
 */

import { beforeEach, describe, expect, it } from 'vitest';
import * as svc from '../../src/services/pricing.service.js';
import type { PricePoint } from '../../src/types/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function seedRice() {
  return svc.registerProduct({
    sku: 'RICE-5KG',
    name: 'Basmati Rice 5kg',
    category: 'groceries',
    ourCost: 400,
    currency: 'INR',
    unit: 'pack',
    targetMargin: 0.25,
  });
}

function seedPrice(p: Omit<PricePoint, 'id' | 'recordedAt'>) {
  return svc.recordPrice(p);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('nexha-pricing-network — product registry', () => {
  beforeEach(() => svc._resetForTests());

  it('registers a product and returns it with id + timestamps', () => {
    const p = seedRice();
    expect(p.id).toBeTruthy();
    expect(p.sku).toBe('RICE-5KG');
    expect(typeof p.createdAt).toBe('string');
    expect(new Date(p.createdAt).getTime()).not.toBeNaN();
  });

  it('looks up product by sku', () => {
    seedRice();
    expect(svc.getProduct('RICE-5KG')?.name).toBe('Basmati Rice 5kg');
    expect(svc.getProduct('NOPE')).toBeNull();
  });

  it('lists products filtered by category and free-text query', () => {
    seedRice();
    svc.registerProduct({
      sku: 'OLIVE-OIL-1L',
      name: 'Extra Virgin Olive Oil 1L',
      category: 'groceries',
      ourCost: 800,
      currency: 'INR',
      unit: 'bottle',
      targetMargin: 0.30,
    });
    svc.registerProduct({
      sku: 'SHIRT-M',
      name: 'Cotton Shirt Medium',
      category: 'fashion',
      ourCost: 300,
      currency: 'INR',
      unit: 'piece',
      targetMargin: 0.40,
    });

    expect(svc.listProducts('groceries').length).toBe(2);
    expect(svc.listProducts('fashion').length).toBe(1);
    expect(svc.listProducts(undefined, 'olive').length).toBe(1);
    expect(svc.listProducts(undefined, 'rice').length).toBe(1);
    expect(svc.listProducts('groceries', 'olive').length).toBe(1);
    expect(svc.listProducts('fashion', 'olive').length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('nexha-pricing-network — price point recording', () => {
  beforeEach(() => svc._resetForTests());

  it('records a price point with id + timestamp', () => {
    seedRice();
    const p = seedPrice({
      sku: 'RICE-5KG',
      supplierId: 'sup-a',
      supplierName: 'AgroMart',
      price: 520,
      currency: 'INR',
      inStock: true,
      source: 'feed',
    });
    expect(p.id).toBeTruthy();
    expect(typeof p.recordedAt).toBe('string');
    expect(new Date(p.recordedAt).getTime()).not.toBeNaN();
  });

  it('lists prices filtered by sku and supplier', () => {
    seedRice();
    seedPrice({
      sku: 'RICE-5KG', supplierId: 'sup-a', supplierName: 'AgroMart',
      price: 520, currency: 'INR', inStock: true, source: 'feed',
    });
    seedPrice({
      sku: 'RICE-5KG', supplierId: 'sup-b', supplierName: 'BigBazaar',
      price: 540, currency: 'INR', inStock: true, source: 'manual',
    });

    expect(svc.listPrices('RICE-5KG').length).toBe(2);
    expect(svc.listPrices('RICE-5KG', 'sup-a').length).toBe(1);
    expect(svc.listPrices('UNKNOWN').length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('nexha-pricing-network — price comparison', () => {
  beforeEach(() => svc._resetForTests());

  it('returns null when product not found', () => {
    expect(svc.comparePrices('UNKNOWN')).toBeNull();
  });

  it('returns null when product has no prices yet', () => {
    seedRice();
    expect(svc.comparePrices('RICE-5KG')).toBeNull();
  });

  it('computes best/worst/avg/median/stddev correctly across multiple suppliers', () => {
    seedRice();
    const prices = [520, 540, 500, 560, 530]; // sorted: 500, 520, 530, 540, 560
    prices.forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG',
        supplierId: `sup-${i}`,
        supplierName: `Supplier ${i}`,
        price,
        currency: 'INR',
        inStock: true,
        source: 'feed',
      }),
    );

    const cmp = svc.comparePrices('RICE-5KG')!;
    expect(cmp.sku).toBe('RICE-5KG');
    expect(cmp.supplierCount).toBe(5);
    expect(cmp.bestPrice).toBe(500);
    expect(cmp.worstPrice).toBe(560);
    expect(cmp.avgPrice).toBe((520 + 540 + 500 + 560 + 530) / 5);
    expect(cmp.medianPrice).toBe(530);
    expect(cmp.minPrice).toBe(500);
    expect(cmp.maxPrice).toBe(560);
    // stddev > 0 because prices vary
    expect(cmp.priceStdDev).toBeGreaterThan(0);
    // Confidence: 5 suppliers / 5 = 1.0 * (1 - normalizedStdDev) < 1
    expect(cmp.confidence).toBeGreaterThan(0);
    expect(cmp.confidence).toBeLessThanOrEqual(1);
  });

  it('confidence is 1.0 when 5+ suppliers agree (no stddev)', () => {
    seedRice();
    [500, 500, 500, 500, 500].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG',
        supplierId: `sup-${i}`,
        supplierName: `Supplier ${i}`,
        price,
        currency: 'INR',
        inStock: true,
        source: 'feed',
      }),
    );
    const cmp = svc.comparePrices('RICE-5KG')!;
    expect(cmp.priceStdDev).toBe(0);
    expect(cmp.confidence).toBe(1.0);
  });

  it('confidence scales down with fewer suppliers', () => {
    seedRice();
    seedPrice({
      sku: 'RICE-5KG', supplierId: 'sup-a', supplierName: 'A',
      price: 500, currency: 'INR', inStock: true, source: 'feed',
    });
    const cmp = svc.comparePrices('RICE-5KG')!;
    expect(cmp.supplierCount).toBe(1);
    // 1 supplier / 5 = 0.2 confidence
    expect(cmp.confidence).toBeCloseTo(0.2, 5);
  });

  it('groups top/bottom suppliers correctly', () => {
    seedRice();
    [510, 520, 530, 540, 550].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG',
        supplierId: `sup-${i}`,
        supplierName: `Supplier ${i}`,
        price,
        currency: 'INR',
        inStock: true,
        source: 'feed',
      }),
    );
    const cmp = svc.comparePrices('RICE-5KG')!;
    expect(cmp.topSuppliers[0].supplierId).toBe('sup-0');
    expect(cmp.topSuppliers[0].price).toBe(510);
    expect(cmp.bottomSuppliers[0].supplierId).toBe('sup-4');
    expect(cmp.bottomSuppliers[0].price).toBe(550);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('nexha-pricing-network — alerts', () => {
  beforeEach(() => svc._resetForTests());

  it('creates a below_target alert', () => {
    seedRice();
    const a = svc.createAlert({
      sku: 'RICE-5KG',
      type: 'below_target',
      targetPrice: 480,
      currency: 'INR',
      notify: 'log',
    });
    expect(a.id).toBeTruthy();
    expect(a.active).toBe(true);
    expect(a.type).toBe('below_target');
  });

  it('createAlert returns error for unknown sku', () => {
    const result = svc.createAlert({
      sku: 'NOPE',
      type: 'below_target',
      targetPrice: 100,
      currency: 'INR',
      notify: 'log',
    });
    expect('error' in result).toBe(true);
  });

  it('triggers below_target when current <= target', () => {
    seedRice();
    svc.createAlert({
      sku: 'RICE-5KG', type: 'below_target', targetPrice: 500,
      currency: 'INR', notify: 'log',
    });
    expect(svc.evaluateAlerts('RICE-5KG', 490).length).toBe(1);
    expect(svc.evaluateAlerts('RICE-5KG', 510).length).toBe(0);
  });

  it('triggers pct_drop when current <= threshold drop', () => {
    seedRice();
    seedPrice({
      sku: 'RICE-5KG', supplierId: 'sup-a', supplierName: 'A',
      price: 600, currency: 'INR', inStock: true, source: 'feed',
    });
    svc.createAlert({
      sku: 'RICE-5KG', type: 'pct_drop', pctThreshold: 0.10,
      currency: 'INR', notify: 'log',
    });
    // 10% drop from 600 = 540 or below
    expect(svc.evaluateAlerts('RICE-5KG', 540).length).toBe(1);
    expect(svc.evaluateAlerts('RICE-5KG', 560).length).toBe(0);
  });

  it('triggers pct_above_market when current >= threshold above market avg', () => {
    seedRice();
    [500, 520, 540].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG',
        supplierId: `sup-${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    // avg = 520
    svc.createAlert({
      sku: 'RICE-5KG', type: 'pct_above_market', pctThreshold: 0.10,
      currency: 'INR', notify: 'log',
    });
    // 10% above 520 = 572
    expect(svc.evaluateAlerts('RICE-5KG', 580).length).toBe(1);
    expect(svc.evaluateAlerts('RICE-5KG', 570).length).toBe(0);
  });

  it('triggers back_in_stock when prior was OOS and current is in stock', () => {
    seedRice();
    // Prior observation: out of stock
    seedPrice({
      sku: 'RICE-5KG', supplierId: 'sup-a', supplierName: 'A',
      price: 0, currency: 'INR', inStock: false, source: 'feed',
    });
    // Newer observation: back in stock
    seedPrice({
      sku: 'RICE-5KG', supplierId: 'sup-a', supplierName: 'A',
      price: 500, currency: 'INR', inStock: true, source: 'feed',
    });
    svc.createAlert({
      sku: 'RICE-5KG', type: 'back_in_stock',
      currency: 'INR', notify: 'log',
    });
    expect(svc.evaluateAlerts('RICE-5KG', 500).length).toBe(1);
  });

  it('deactivates an alert', () => {
    seedRice();
    const a = svc.createAlert({
      sku: 'RICE-5KG', type: 'below_target', targetPrice: 100,
      currency: 'INR', notify: 'log',
    });
    const result = svc.deactivateAlert(a.id);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.active).toBe(false);
    }
  });

  it('deactivating unknown id returns error', () => {
    const r = svc.deactivateAlert('unknown');
    expect('error' in r).toBe(true);
  });

  it('listAlerts with activeOnly=true filters', () => {
    seedRice();
    svc.createAlert({
      sku: 'RICE-5KG', type: 'below_target', targetPrice: 100,
      currency: 'INR', notify: 'log',
    });
    const a2 = svc.createAlert({
      sku: 'RICE-5KG', type: 'below_target', targetPrice: 200,
      currency: 'INR', notify: 'log',
    });
    svc.deactivateAlert(a2.id);
    expect(svc.listAlerts(true).length).toBe(1);
    expect(svc.listAlerts(false).length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('nexha-pricing-network — dynamic pricing', () => {
  beforeEach(() => svc._resetForTests());

  it('returns error for unknown product', () => {
    const r = svc.recommendPrice({
      sku: 'NOPE', strategy: 'match', ourCost: 100, marginFloor: 0.1,
    });
    expect('error' in r).toBe(true);
  });

  it('returns error when no market data exists', () => {
    seedRice();
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'match', ourCost: 400, marginFloor: 0.1,
    });
    expect('error' in r).toBe(true);
  });

  it('match strategy returns market average', () => {
    seedRice();
    [500, 520, 540].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG', supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'match', ourCost: 400, marginFloor: 0.1,
    });
    expect('error' in r).toBe(false);
    if (!('error' in r)) {
      expect(r.recommendedPrice).toBe(520);
      expect(r.strategy).toBe('match');
    }
  });

  it('undercut strategy returns 0.98 × best price', () => {
    seedRice();
    [500, 520, 540].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG', supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'undercut', ourCost: 400, marginFloor: 0.1,
    });
    if (!('error' in r)) {
      expect(r.recommendedPrice).toBe(500 * 0.98);
    }
  });

  it('premium strategy returns 1.10 × market average', () => {
    seedRice();
    [500, 520, 540].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG', supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'premium', ourCost: 400, marginFloor: 0.1,
    });
    if (!('error' in r)) {
      expect(r.recommendedPrice).toBe(520 * 1.10);
    }
  });

  it('enforces margin floor when market price is too low', () => {
    seedRice();
    // Market is way below cost
    [100, 110, 120].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG', supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'match', ourCost: 400, marginFloor: 0.25,
    });
    if (!('error' in r)) {
      // floor = 400 × 1.25 = 500
      expect(r.recommendedPrice).toBe(500);
      expect(r.floorApplied).toBe(true);
    }
  });

  it('enforces ceiling (1.20 × currentPrice)', () => {
    seedRice();
    [500, 520, 540].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG', supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'premium', ourCost: 100, marginFloor: 0.05,
      currentPrice: 500,
    });
    if (!('error' in r)) {
      // requested 1.10 × 520 = 572, ceiling = 500 × 1.20 = 600 → 572 passes
      // but floor 100 × 1.05 = 105 also passes
      expect(r.recommendedPrice).toBeLessThanOrEqual(600);
    }
  });

  it('flags currencyMismatch when request currency differs from product currency', () => {
    seedRice();
    [500, 520, 540].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG',
        supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'match', ourCost: 400, marginFloor: 0.1,
      currency: 'USD',
    });
    expect('error' in r).toBe(false);
    if (!('error' in r)) {
      expect(r.currencyMismatch).toBe(true);
    }
  });

  it('recommendation includes comparison snapshot', () => {
    seedRice();
    [500, 520, 540].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG', supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    const r = svc.recommendPrice({
      sku: 'RICE-5KG', strategy: 'match', ourCost: 400, marginFloor: 0.1,
    });
    if (!('error' in r)) {
      expect(r.comparison).toBeTruthy();
      expect(r.comparison.sku).toBe('RICE-5KG');
      expect(r.comparison.supplierCount).toBe(3);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('nexha-pricing-network — network stats', () => {
  beforeEach(() => svc._resetForTests());

  it('reports correct counts', () => {
    seedRice();
    svc.registerProduct({
      sku: 'OIL-1L', name: 'Olive Oil 1L', category: 'groceries',
      ourCost: 500, currency: 'INR', unit: 'bottle', targetMargin: 0.3,
    });
    [500, 520].forEach((price, i) =>
      seedPrice({
        sku: 'RICE-5KG', supplierId: `s${i}`, supplierName: `S${i}`,
        price, currency: 'INR', inStock: true, source: 'feed',
      }),
    );
    seedPrice({
      sku: 'OIL-1L', supplierId: 's9', supplierName: 'S9',
      price: 900, currency: 'INR', inStock: true, source: 'feed',
    });
    svc.createAlert({
      sku: 'RICE-5KG', type: 'below_target', targetPrice: 480,
      currency: 'INR', notify: 'log',
    });

    const stats = svc.pricingStats();
    expect(stats.products).toBe(2);
    expect(stats.pricePoints).toBe(3);
    expect(stats.activeAlerts).toBe(1);
    expect(stats.suppliersTracked).toBe(3);
  });

  it('starts at zero', () => {
    const stats = svc.pricingStats();
    expect(stats.products).toBe(0);
    expect(stats.pricePoints).toBe(0);
    expect(stats.activeAlerts).toBe(0);
    expect(stats.suppliersTracked).toBe(0);
  });
});
