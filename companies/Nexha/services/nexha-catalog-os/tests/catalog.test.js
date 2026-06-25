/**
 * CatalogOS Tests — Nexha Catalog Service
 *
 * ADR-??? Phase 1 (2026-06-25).
 */

import {
  Product,
  Variant,
  PricingTier,
  ChannelRef,
  WarehouseInventory,
  PRODUCT_STATUSES,
  saveProduct,
  getProduct,
  listProducts,
  deleteProduct,
  clearStore,
} from '../src/models/Product.js';

import {
  createProduct,
  updateProduct,
  getProductDetails,
  listAllProducts,
  archiveProduct,
  removeProduct,
  addVariant,
  updateVariant,
  removeVariant,
  setPricing,
  reserveInventory,
  releaseInventory,
  publishToChannel,
  unpublishFromChannel,
  getCatalogStats,
  CatalogError,
  AVAILABLE_CHANNELS,
} from '../src/services/catalog.service.js';

const TENANT = 'tenant_nike';
const OTHER_TENANT = 'tenant_adidas';

function makeProduct(overrides = {}) {
  return createProduct(TENANT, {
    name: 'Basmati Rice',
    sku: 'RICE-001',
    description: 'Premium aged basmati rice',
    category: 'food',
    basePrice: 48,
    moq: 500,
    leadTimeDays: 3,
    certifications: ['FSSAI', 'ISO-22000'],
    inventory: [{ warehouseRef: 'WH-01', quantity: 10000 }],
    ...overrides,
  });
}

beforeEach(() => {
  clearStore();
});

// ── Product Model ────────────────────────────────────────────────────────────

describe('Product Model', () => {
  test('creates product with defaults', () => {
    const p = new Product({ tenantId: TENANT, name: 'Test', sku: 'T1' });
    expect(p.status).toBe('draft');
    expect(p.variants).toEqual([]);
    expect(p.channels).toEqual([]);
    expect(p.inventory).toEqual([]);
    expect(p.createdAt).toBeTruthy();
  });

  test('state machine: draft → active → archived', () => {
    const p = new Product({ tenantId: TENANT, name: 'T', sku: 'T1' });
    expect(p.canTransitionTo('active')).toBe(true);
    expect(p.canTransitionTo('archived')).toBe(true);
    p.transitionTo('active');
    expect(p.status).toBe('active');
    p.transitionTo('archived');
    expect(p.status).toBe('archived');
  });

  test('rejects illegal transitions', () => {
    const p = new Product({ tenantId: TENANT, name: 'T', sku: 'T1' });
    expect(() => p.transitionTo('completed')).toThrow('Illegal');
    p.transitionTo('active');
    expect(() => p.transitionTo('draft')).toThrow('Illegal');
  });

  test('computed: totalInventory', () => {
    const p = new Product({
      tenantId: TENANT, name: 'T', sku: 'T1',
      inventory: [
        { warehouseRef: 'A', quantity: 100 },
        { warehouseRef: 'B', quantity: 200 },
      ],
    });
    expect(p.totalInventory).toBe(300);
    expect(p.availableInventory).toBe(300);
  });

  test('computed: totalReserved reduces available', () => {
    const inv = new WarehouseInventory({ warehouseRef: 'A', quantity: 100, reserved: 30 });
    expect(inv.quantity).toBe(100);
    expect(inv.reserved).toBe(30);
    expect(inv.quantity - inv.reserved).toBe(70);
  });
});

// ── Variant ─────────────────────────────────────────────────────────────────

describe('Variant', () => {
  test('creates variant with defaults', () => {
    const v = new Variant({ name: '5kg bag' });
    expect(v.variantId).toBeTruthy();
    expect(v.name).toBe('5kg bag');
    expect(v.priceAdjustment).toBe(0);
    expect(v.inventory).toBe(0);
  });

  test('variant with attributes', () => {
    const v = new Variant({
      name: 'Red, Large',
      attributes: [{ key: 'color', value: 'red' }, { key: 'size', value: 'large' }],
    });
    expect(v.attributes.length).toBe(2);
    expect(v.attributes[0].key).toBe('color');
  });
});

// ── PricingTier ─────────────────────────────────────────────────────────────

describe('PricingTier', () => {
  test('creates tier with defaults', () => {
    const t = new PricingTier({ minQty: 1000, pricePerUnit: 45 });
    expect(t.minQty).toBe(1000);
    expect(t.maxQty).toBeNull();
    expect(t.pricePerUnit).toBe(45);
    expect(t.currency).toBe('USD');
  });
});

// ── ChannelRef ─────────────────────────────────────────────────────────────

describe('ChannelRef', () => {
  test('creates channel ref', () => {
    const c = new ChannelRef({ name: 'Global Nexha', published: true });
    expect(c.channelId).toBeTruthy();
    expect(c.published).toBe(true);
    expect(c.syncStatus).toBe('idle');
  });
});

// ── Product CRUD ─────────────────────────────────────────────────────────────

describe('Product CRUD', () => {
  test('createProduct saves and returns product', () => {
    const p = makeProduct();
    expect(p.productId).toBeTruthy();
    expect(p.tenantId).toBe(TENANT);
    expect(p.name).toBe('Basmati Rice');
    expect(p.status).toBe('draft');
  });

  test('createProduct generates SKU if missing', () => {
    const p = createProduct(TENANT, { name: 'Test' });
    expect(p.sku).toMatch(/^SKU-/);
  });

  test('createProduct validates required fields', () => {
    expect(() => createProduct('', { name: 'Test' })).toThrow('tenantId is required');
    expect(() => createProduct(TENANT, {})).toThrow('name is required');
  });

  test('createProduct saves to store', () => {
    const p = makeProduct();
    const found = getProduct(p.productId);
    expect(found.productId).toBe(p.productId);
  });

  test('updateProduct updates fields', () => {
    const p = makeProduct({ status: 'draft' });
    const updated = updateProduct(TENANT, p.productId, { name: 'Super Rice', basePrice: 55 });
    expect(updated.name).toBe('Super Rice');
    expect(updated.basePrice).toBe(55);
    expect(updated.sku).toBe('RICE-001'); // unchanged
  });

  test('updateProduct rejects cross-tenant access', () => {
    const p = makeProduct();
    expect(() => updateProduct(OTHER_TENANT, p.productId, { name: 'Hacked' })).toThrow('Access denied');
  });

  test('updateProduct transitions status', () => {
    const p = makeProduct({ status: 'draft' });
    const updated = updateProduct(TENANT, p.productId, { status: 'active' });
    expect(updated.status).toBe('active');
  });

  test('getProductDetails returns product', () => {
    const p = makeProduct();
    const found = getProductDetails(TENANT, p.productId);
    expect(found.productId).toBe(p.productId);
  });

  test('getProductDetails rejects cross-tenant', () => {
    const p = makeProduct();
    expect(() => getProductDetails(OTHER_TENANT, p.productId)).toThrow('Access denied');
  });

  test('getProductDetails 404 for missing', () => {
    expect(() => getProductDetails(TENANT, 'nonexistent')).toThrow('not found');
  });

  test('archiveProduct transitions to archived', () => {
    const p = makeProduct({ status: 'active' });
    const archived = archiveProduct(TENANT, p.productId);
    expect(archived.status).toBe('archived');
  });

  test('removeProduct deletes from store', () => {
    const p = makeProduct();
    removeProduct(TENANT, p.productId);
    expect(getProduct(p.productId)).toBeNull();
  });
});

// ── List Products ───────────────────────────────────────────────────────────

describe('listAllProducts', () => {
  test('returns tenant-scoped products', () => {
    makeProduct({ name: 'Rice', category: 'food' });
    makeProduct({ name: 'Wheat', category: 'food' });
    createProduct(OTHER_TENANT, { name: 'Other Rice', sku: 'OR1', category: 'food' });

    const mine = listAllProducts(TENANT);
    expect(mine.length).toBe(2);
    expect(mine.every(p => p.tenantId === TENANT)).toBe(true);
  });

  test('filter by category', () => {
    makeProduct({ name: 'Rice', category: 'food' });
    makeProduct({ name: 'Shirt', category: 'apparel' });

    const food = listAllProducts(TENANT, { category: 'food' });
    expect(food.length).toBe(1);
    expect(food[0].name).toBe('Rice');
  });

  test('filter by status', () => {
    makeProduct({ name: 'Active', status: 'active' });
    makeProduct({ name: 'Draft', status: 'draft' });

    const active = listAllProducts(TENANT, { status: 'active' });
    expect(active.length).toBe(1);
    expect(active[0].name).toBe('Active');
  });

  test('filter by search', () => {
    makeProduct({ name: 'Organic Basmati Rice', sku: 'R1' });
    makeProduct({ name: 'Wheat Flour', sku: 'W1' });

    const results = listAllProducts(TENANT, { search: 'basmati' });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Organic Basmati Rice');
  });
});

// ── Variants ───────────────────────────────────────────────────────────────

describe('Variants', () => {
  let product;

  beforeEach(() => {
    product = makeProduct({ status: 'active' });
  });

  test('addVariant appends to product', () => {
    const { variant } = addVariant(TENANT, product.productId, {
      name: '5kg bag',
      sku: 'RICE-001-5KG',
      attributes: [{ key: 'size', value: '5kg' }],
      priceAdjustment: 10,
    });
    expect(variant.name).toBe('5kg bag');
    expect(product.variants.length).toBe(1);
  });

  test('updateVariant modifies variant', () => {
    const { variant: v1 } = addVariant(TENANT, product.productId, { name: '5kg' });
    const { variant: v2 } = updateVariant(TENANT, product.productId, v1.variantId, {
      priceAdjustment: 20,
    });
    expect(v2.priceAdjustment).toBe(20);
    expect(v2.name).toBe('5kg'); // unchanged
  });

  test('removeVariant deletes variant', () => {
    const { variant } = addVariant(TENANT, product.productId, { name: '5kg' });
    const { deleted } = removeVariant(TENANT, product.productId, variant.variantId);
    expect(deleted).toBe(true);
    expect(product.variants.length).toBe(0);
  });

  test('variant operations reject cross-tenant', () => {
    const { variant } = addVariant(TENANT, product.productId, { name: '5kg' });
    expect(() => addVariant(OTHER_TENANT, product.productId, { name: 'x' })).toThrow('Access denied');
    expect(() => updateVariant(OTHER_TENANT, product.productId, variant.variantId, {})).toThrow('Access denied');
    expect(() => removeVariant(OTHER_TENANT, product.productId, variant.variantId)).toThrow('Access denied');
  });
});

// ── Pricing ─────────────────────────────────────────────────────────────────

describe('Pricing', () => {
  let product;

  beforeEach(() => {
    product = makeProduct({ basePrice: 48, moq: 500 });
  });

  test('setPricing updates all pricing fields', () => {
    const { pricing } = setPricing(TENANT, product.productId, {
      basePrice: 50,
      moq: 1000,
      leadTimeDays: 5,
      pricingTiers: [
        { minQty: 5000, pricePerUnit: 44 },
        { minQty: 10000, pricePerUnit: 40 },
      ],
    });
    expect(pricing.basePrice).toBe(50);
    expect(pricing.moq).toBe(1000);
    expect(pricing.pricingTiers.length).toBe(2);
  });
});

// ── Inventory ───────────────────────────────────────────────────────────────

describe('Inventory', () => {
  let product;

  beforeEach(() => {
    product = makeProduct({
      inventory: [
        { warehouseRef: 'WH-01', quantity: 10000, reserved: 0 },
      ],
    });
  });

  test('reserveInventory decrements available', () => {
    const { available } = reserveInventory(TENANT, product.productId, 'WH-01', 500);
    expect(available).toBe(9500);
    const updated = getProduct(product.productId);
    expect(updated.inventory[0].reserved).toBe(500);
  });

  test('reserveInventory rejects over-reservation', () => {
    expect(() => reserveInventory(TENANT, product.productId, 'WH-01', 15000)).toThrow('Insufficient');
  });

  test('releaseInventory returns reserved', () => {
    reserveInventory(TENANT, product.productId, 'WH-01', 500);
    const { reserved } = releaseInventory(TENANT, product.productId, 'WH-01', 200);
    const updated = getProduct(product.productId);
    expect(updated.inventory[0].reserved).toBe(300);
  });

  test('reserveInventory rejects unknown warehouse', () => {
    expect(() => reserveInventory(TENANT, product.productId, 'UNKNOWN', 100)).toThrow('Warehouse');
  });
});

// ── Channel Publishing ──────────────────────────────────────────────────────

describe('Channel Publishing', () => {
  let product;

  beforeEach(() => {
    product = makeProduct({ status: 'active' });
  });

  test('publishToChannel adds channel', () => {
    const { channel } = publishToChannel(TENANT, product.productId, 'Global Nexha');
    expect(channel.published).toBe(true);
    expect(channel.publishedAt).toBeTruthy();
    expect(product.channels.length).toBe(1);
  });

  test('publishToChannel rejects inactive product', () => {
    const draft = makeProduct({ status: 'draft' });
    expect(() => publishToChannel(TENANT, draft.productId, 'Global Nexha')).toThrow('Only active');
  });

  test('unpublishFromChannel clears published flag', () => {
    publishToChannel(TENANT, product.productId, 'Global Nexha');
    const { channel } = unpublishFromChannel(TENANT, product.productId, 'Global Nexha');
    expect(channel.published).toBe(false);
  });

  test('AVAILABLE_CHANNELS has expected channels', () => {
    expect(AVAILABLE_CHANNELS.length).toBeGreaterThanOrEqual(3);
    expect(AVAILABLE_CHANNELS.find(c => c.id === 'global-nexha')).toBeTruthy();
  });
});

// ── Stats ──────────────────────────────────────────────────────────────────

describe('getCatalogStats', () => {
  test('returns correct counts', () => {
    makeProduct({ name: 'A', status: 'active', category: 'food' });
    makeProduct({ name: 'B', status: 'active', category: 'food' });
    makeProduct({ name: 'C', status: 'draft', category: 'apparel' });
    makeProduct({ name: 'D', status: 'archived' });

    const stats = getCatalogStats(TENANT);
    expect(stats.total).toBe(4);
    expect(stats.active).toBe(2);
    expect(stats.draft).toBe(1);
    expect(stats.archived).toBe(1);
    expect(stats.byCategory.food).toBe(2);
    expect(stats.byCategory.apparel).toBe(1);
  });

  test('byChannel counts published products', () => {
    const p1 = makeProduct({ name: 'A', status: 'active' });
    publishToChannel(TENANT, p1.productId, 'Global Nexha');
    publishToChannel(TENANT, p1.productId, 'DO App');
    const p2 = makeProduct({ name: 'B', status: 'active' });
    publishToChannel(TENANT, p2.productId, 'Global Nexha');

    const stats = getCatalogStats(TENANT);
    expect(stats.byChannel['Global Nexha']).toBe(2);
    expect(stats.byChannel['DO App']).toBe(1);
  });
});
