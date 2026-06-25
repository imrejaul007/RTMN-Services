/**
 * Product — the central entity of CatalogOS.
 *
 * State machine:
 *   draft → active → archived
 *
 * A product has:
 *   - Core fields (name, SKU, description, category)
 *   - Variants (size, color, material)
 *   - Pricing (base price, tiered pricing, MOQ, lead time)
 *   - Inventory (per warehouse)
 *   - Certifications (FSSAI, ISO, organic, etc.)
 *   - Channels (which marketplaces/portals this product is published to)
 *
 * ADR-??? Phase 1 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'];

// ── Variant ────────────────────────────────────────────────────────────────

export class Variant {
  constructor(data = {}) {
    this.variantId = data.variantId || uuidv4();
    this.sku = data.sku || '';
    this.name = data.name || '';
    this.attributes = Array.isArray(data.attributes) ? data.attributes : [];
    this.priceAdjustment = data.priceAdjustment || 0;
    this.inventory = data.inventory || 0;
    this.metadata = data.metadata || {};
  }

  static schema = {
    variantId: 'string',
    sku: 'string',
    name: 'string',
    attributes: [{ key: 'string', value: 'string' }],
    priceAdjustment: 'number',
    inventory: 'number',
    metadata: 'object',
  };
}

// ── Pricing Tier ────────────────────────────────────────────────────────────

export class PricingTier {
  constructor(data = {}) {
    this.minQty = data.minQty || 1;
    this.maxQty = data.maxQty || null;
    this.pricePerUnit = data.pricePerUnit || 0;
    this.currency = data.currency || 'USD';
  }

  static schema = {
    minQty: 'number',
    maxQty: 'number|null',
    pricePerUnit: 'number',
    currency: 'string',
  };
}

// ── Channel Reference ───────────────────────────────────────────────────────

export class ChannelRef {
  constructor(data = {}) {
    this.channelId = data.channelId || uuidv4();
    this.name = data.name || '';
    this.published = data.published || false;
    this.channelProductId = data.channelProductId || null;
    this.publishedAt = data.publishedAt || null;
    this.lastSyncedAt = data.lastSyncedAt || null;
    this.syncStatus = data.syncStatus || 'idle'; // idle | syncing | error
    this.errorMessage = data.errorMessage || null;
  }

  static schema = {
    channelId: 'string',
    name: 'string',
    published: 'boolean',
    channelProductId: 'string|null',
    publishedAt: 'string|null',
    lastSyncedAt: 'string|null',
    syncStatus: 'string',
    errorMessage: 'string|null',
  };
}

// ── Warehouse Inventory ─────────────────────────────────────────────────────

export class WarehouseInventory {
  constructor(data = {}) {
    this.warehouseRef = data.warehouseRef || '';
    this.quantity = data.quantity || 0;
    this.reserved = data.reserved || 0;
    this.available = () => Math.max(0, this.quantity - this.reserved);
  }

  static schema = {
    warehouseRef: 'string',
    quantity: 'number',
    reserved: 'number',
  };
}

// ── Product ────────────────────────────────────────────────────────────────

export class Product {
  constructor(data = {}) {
    this.productId = data.productId || uuidv4();
    this.tenantId = data.tenantId || '';
    this.sku = data.sku || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.category = data.category || 'general';
    this.images = Array.isArray(data.images) ? data.images : [];
    this.variants = (data.variants || []).map(v => new Variant(v));
    this.basePrice = data.basePrice || 0;
    this.currency = data.currency || 'USD';
    this.moq = data.moq || 1;
    this.leadTimeDays = data.leadTimeDays || 7;
    this.pricingTiers = (data.pricingTiers || []).map(p => new PricingTier(p));
    this.certifications = Array.isArray(data.certifications) ? data.certifications : [];
    this.inventory = (data.inventory || []).map(i => new WarehouseInventory(i));
    this.channels = (data.channels || []).map(c => new ChannelRef(c));
    this.status = data.status || 'draft';
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // ── State transitions ─────────────────────────────────────────────────

  canTransitionTo(newStatus) {
    const transitions = {
      draft: ['active', 'archived'],
      active: ['draft', 'archived'],
      archived: ['active'],
    };
    return transitions[this.status]?.includes(newStatus) || false;
  }

  transitionTo(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(`Illegal product transition: ${this.status} → ${newStatus}`);
    }
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  // ── Computed ──────────────────────────────────────────────────────────

  get totalInventory() {
    return this.inventory.reduce((sum, w) => sum + w.quantity, 0);
  }

  get totalReserved() {
    return this.inventory.reduce((sum, w) => sum + w.reserved, 0);
  }

  get availableInventory() {
    return this.totalInventory - this.totalReserved;
  }

  get publishedChannels() {
    return this.channels.filter(c => c.published);
  }

  // ── Serialization ────────────────────────────────────────────────────

  toJSON() {
    return {
      productId: this.productId,
      tenantId: this.tenantId,
      sku: this.sku,
      name: this.name,
      description: this.description,
      category: this.category,
      images: this.images,
      variants: this.variants,
      basePrice: this.basePrice,
      currency: this.currency,
      moq: this.moq,
      leadTimeDays: this.leadTimeDays,
      pricingTiers: this.pricingTiers,
      certifications: this.certifications,
      inventory: this.inventory,
      channels: this.channels,
      status: this.status,
      metadata: this.metadata,
      // computed
      totalInventory: this.totalInventory,
      totalReserved: this.totalReserved,
      availableInventory: this.availableInventory,
      publishedChannels: this.publishedChannels,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ── Validation ──────────────────────────────────────────────────────

  validate() {
    const errors = [];
    if (!this.tenantId) errors.push('tenantId is required');
    if (!this.sku) errors.push('sku is required');
    if (!this.name) errors.push('name is required');
    if (!PRODUCT_STATUSES.includes(this.status)) errors.push(`invalid status: ${this.status}`);
    if (this.basePrice < 0) errors.push('basePrice cannot be negative');
    if (this.moq < 1) errors.push('moq must be at least 1');
    if (this.moq > 1 && this.moq > this.basePrice) {
      // warn, not error
    }
    return errors;
  }
}

// ── In-memory store ────────────────────────────────────────────────────────

const store = new Map();

export function getStore() { return store; }

export function clearStore() { store.clear(); }

export function saveProduct(product) {
  store.set(product.productId, product);
  return product;
}

export function getProduct(id) {
  return store.get(id) || null;
}

export function listProducts(tenantId, filters = {}) {
  let products = Array.from(store.values()).filter(p => p.tenantId === tenantId);
  if (filters.category) products = products.filter(p => p.category === filters.category);
  if (filters.status) products = products.filter(p => p.status === filters.status);
  if (filters.channel) {
    products = products.filter(p => p.channels.some(c => c.name === filters.channel && c.published));
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }
  return products;
}

export function deleteProduct(id, tenantId) {
  const product = store.get(id);
  if (!product) return false;
  if (product.tenantId !== tenantId) return false;
  store.delete(id);
  return true;
}
