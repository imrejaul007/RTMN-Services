/**
 * Catalog Service — business logic for CatalogOS.
 *
 * Handles product CRUD, variant management, pricing, inventory,
 * and channel publishing. All operations are tenant-scoped.
 *
 * ADR-??? Phase 1 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';
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
} from '../models/Product.js';

// ── Errors ─────────────────────────────────────────────────────────────────

export class CatalogError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'CatalogError';
    this.statusCode = statusCode;
  }
}

// ── Product CRUD ─────────────────────────────────────────────────────────────

export function createProduct(tenantId, data) {
  if (!tenantId) throw new CatalogError('tenantId is required', 400);

  const product = new Product({
    tenantId,
    sku: data.sku || `SKU-${uuidv4().slice(0, 8).toUpperCase()}`,
    name: data.name || '',
    description: data.description || '',
    category: data.category || 'general',
    images: data.images || [],
    variants: data.variants || [],
    basePrice: data.basePrice || 0,
    currency: data.currency || 'USD',
    moq: data.moq || 1,
    leadTimeDays: data.leadTimeDays || 7,
    pricingTiers: data.pricingTiers || [],
    certifications: data.certifications || [],
    inventory: data.inventory || [],
    channels: data.channels || [],
    status: data.status || 'draft',
    metadata: data.metadata || {},
  });

  const errors = product.validate();
  if (errors.length > 0) {
    throw new CatalogError(`Validation failed: ${errors.join(', ')}`, 400);
  }

  return saveProduct(product);
}

export function updateProduct(tenantId, productId, data) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  // Allowed field updates
  if (data.name !== undefined) product.name = data.name;
  if (data.description !== undefined) product.description = data.description;
  if (data.category !== undefined) product.category = data.category;
  if (data.images !== undefined) product.images = data.images;
  if (data.basePrice !== undefined) product.basePrice = data.basePrice;
  if (data.currency !== undefined) product.currency = data.currency;
  if (data.moq !== undefined) product.moq = data.moq;
  if (data.leadTimeDays !== undefined) product.leadTimeDays = data.leadTimeDays;
  if (data.pricingTiers !== undefined) product.pricingTiers = data.pricingTiers.map(p => new PricingTier(p));
  if (data.certifications !== undefined) product.certifications = data.certifications;
  if (data.metadata !== undefined) product.metadata = data.metadata;

  // Status transition
  if (data.status !== undefined && data.status !== product.status) {
    product.transitionTo(data.status);
  }

  product.updatedAt = new Date().toISOString();
  return saveProduct(product);
}

export function getProductDetails(tenantId, productId) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);
  return product;
}

export function listAllProducts(tenantId, filters = {}) {
  if (!tenantId) throw new CatalogError('tenantId is required', 400);
  return listProducts(tenantId, filters);
}

export function archiveProduct(tenantId, productId) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);
  product.transitionTo('archived');
  product.updatedAt = new Date().toISOString();
  return saveProduct(product);
}

export function removeProduct(tenantId, productId) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);
  const deleted = deleteProduct(productId, tenantId);
  if (!deleted) throw new CatalogError(`Failed to delete product ${productId}`, 500);
  return { deleted: true };
}

// ── Variant Management ──────────────────────────────────────────────────────

export function addVariant(tenantId, productId, data) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  const variant = new Variant({
    sku: data.sku || `${product.sku}-VAR-${product.variants.length + 1}`,
    name: data.name || '',
    attributes: data.attributes || [],
    priceAdjustment: data.priceAdjustment || 0,
    inventory: data.inventory || 0,
    metadata: data.metadata || {},
  });

  product.variants.push(variant);
  product.updatedAt = new Date().toISOString();
  return { variant, product: saveProduct(product) };
}

export function updateVariant(tenantId, productId, variantId, data) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  const variant = product.variants.find(v => v.variantId === variantId);
  if (!variant) throw new CatalogError(`Variant ${variantId} not found`, 404);

  if (data.sku !== undefined) variant.sku = data.sku;
  if (data.name !== undefined) variant.name = data.name;
  if (data.attributes !== undefined) variant.attributes = data.attributes;
  if (data.priceAdjustment !== undefined) variant.priceAdjustment = data.priceAdjustment;
  if (data.inventory !== undefined) variant.inventory = data.inventory;
  if (data.metadata !== undefined) variant.metadata = data.metadata;

  product.updatedAt = new Date().toISOString();
  return { variant, product: saveProduct(product) };
}

export function removeVariant(tenantId, productId, variantId) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  const idx = product.variants.findIndex(v => v.variantId === variantId);
  if (idx === -1) throw new CatalogError(`Variant ${variantId} not found`, 404);

  product.variants.splice(idx, 1);
  product.updatedAt = new Date().toISOString();
  return { deleted: true, product: saveProduct(product) };
}

// ── Pricing ─────────────────────────────────────────────────────────────────

export function setPricing(tenantId, productId, data) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  if (data.basePrice !== undefined) product.basePrice = data.basePrice;
  if (data.currency !== undefined) product.currency = data.currency;
  if (data.moq !== undefined) product.moq = data.moq;
  if (data.leadTimeDays !== undefined) product.leadTimeDays = data.leadTimeDays;
  if (data.pricingTiers !== undefined) {
    product.pricingTiers = data.pricingTiers.map(p => new PricingTier(p));
  }

  product.updatedAt = new Date().toISOString();
  return { pricing: getProductPricing(product), product: saveProduct(product) };
}

export function getProductPricing(product) {
  return {
    basePrice: product.basePrice,
    currency: product.currency,
    moq: product.moq,
    leadTimeDays: product.leadTimeDays,
    pricingTiers: product.pricingTiers.map(t => ({ ...t })),
  };
}

export function getPriceForQty(product, qty) {
  // Find applicable tier
  const sortedTiers = [...product.pricingTiers].sort((a, b) => b.minQty - a.minQty);
  const tier = sortedTiers.find(t => qty >= t.minQty);
  if (tier) return tier.pricePerUnit;
  return product.basePrice;
}

// ── Inventory ───────────────────────────────────────────────────────────────

export function setInventory(tenantId, productId, data) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  product.inventory = (data.warehouses || []).map(w => new WarehouseInventory(w));
  product.updatedAt = new Date().toISOString();
  return { inventory: product.inventory, product: saveProduct(product) };
}

export function reserveInventory(tenantId, productId, warehouseRef, qty) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  const wh = product.inventory.find(i => i.warehouseRef === warehouseRef);
  if (!wh) throw new CatalogError(`Warehouse ${warehouseRef} not found`, 404);

  const available = wh.quantity - wh.reserved;
  if (available < qty) {
    throw new CatalogError(`Insufficient inventory. Available: ${available}, requested: ${qty}`, 409);
  }

  wh.reserved += qty;
  product.updatedAt = new Date().toISOString();
  return { reserved: qty, available: wh.quantity - wh.reserved, product: saveProduct(product) };
}

export function releaseInventory(tenantId, productId, warehouseRef, qty) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  const wh = product.inventory.find(i => i.warehouseRef === warehouseRef);
  if (!wh) throw new CatalogError(`Warehouse ${warehouseRef} not found`, 404);

  wh.reserved = Math.max(0, wh.reserved - qty);
  product.updatedAt = new Date().toISOString();
  return { released: qty, reserved: wh.reserved, product: saveProduct(product) };
}

// ── Channel Publishing ──────────────────────────────────────────────────────

export const AVAILABLE_CHANNELS = [
  { id: 'global-nexha', name: 'Global Nexha', description: 'Publish to the Global Nexha federation' },
  { id: 'do-app', name: 'DO App', description: 'Publish to the Digital Operator mobile app' },
  { id: 'website', name: 'Website', description: 'Publish to company website' },
  { id: 'marketplace', name: 'Marketplace', description: 'Publish to company marketplace' },
];

export function publishToChannel(tenantId, productId, channelName) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);
  if (product.status !== 'active') {
    throw new CatalogError('Only active products can be published', 400);
  }

  let channel = product.channels.find(c => c.name === channelName);
  if (!channel) {
    channel = new ChannelRef({ name: channelName, published: true });
    product.channels.push(channel);
  } else {
    channel.published = true;
  }

  channel.publishedAt = new Date().toISOString();
  channel.syncStatus = 'idle';

  product.updatedAt = new Date().toISOString();
  return { channel, product: saveProduct(product) };
}

export function unpublishFromChannel(tenantId, productId, channelName) {
  const product = getProduct(productId);
  if (!product) throw new CatalogError(`Product ${productId} not found`, 404);
  if (product.tenantId !== tenantId) throw new CatalogError('Access denied', 403);

  const channel = product.channels.find(c => c.name === channelName);
  if (!channel) throw new CatalogError(`Channel ${channelName} not found`, 404);

  channel.published = false;
  product.updatedAt = new Date().toISOString();
  return { channel, product: saveProduct(product) };
}

export function getProductsOnChannel(tenantId, channelName) {
  if (!tenantId) throw new CatalogError('tenantId is required', 400);
  return listProducts(tenantId, { channel: channelName });
}

// ── Catalog Stats ────────────────────────────────────────────────────────────

export function getCatalogStats(tenantId) {
  if (!tenantId) throw new CatalogError('tenantId is required', 400);

  const products = listProducts(tenantId);
  const active = products.filter(p => p.status === 'active');
  const draft = products.filter(p => p.status === 'draft');
  const archived = products.filter(p => p.status === 'archived');

  const channelCount = {};
  for (const p of active) {
    for (const c of p.publishedChannels) {
      channelCount[c.name] = (channelCount[c.name] || 0) + 1;
    }
  }

  return {
    total: products.length,
    active: active.length,
    draft: draft.length,
    archived: archived.length,
    byCategory: active.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {}),
    byChannel: channelCount,
    totalInventoryValue: active.reduce((sum, p) => sum + p.basePrice * p.availableInventory, 0),
  };
}
