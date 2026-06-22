/**
 * RTMN Product Twin Service v2.0.0
 * Digital twin for products and inventory management
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// RTMN TwinOS Shared imports
import {
  optionalAuth,
  defaultLimiter,
  strictLimiter,
  preventPrototypePollution,
  sanitizeObject,
  sanitizeSearchInput,
  asyncHandler,
  notFoundHandler,
  errorHandler,
  requestId,
  requestLogger,
  logger,
  platform,
  publishAsync,
  installPhase5
} from '@rtmn/twinos-shared';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4720;

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(requestId);
app.use(requestLogger);

// Apply rate limiting globally
app.use(defaultLimiter);

// ============ PERSISTENT STORAGE ============
// File-backed JSON stores that survive restarts. Sync reads, async writes.

const STORE_OPTS = { serviceName: 'product-twin' };
const products = new PersistentStore('products', STORE_OPTS);
const categories = new PersistentStore('categories', STORE_OPTS);
const inventory = new PersistentStore('inventory', STORE_OPTS);
const variants = new PersistentStore('variants', STORE_OPTS);
const syncEvents = new PersistentStore('sync-events', STORE_OPTS);

// Idempotency store for inventory reservations (in-memory cache with TTL-style cleanup)
const reservationIdempotency = new Map();

// ============ SAMPLE DATA INITIALIZATION ============

const sampleProducts = [
  {
    id: 'prod-1',
    name: 'Enterprise CRM Suite',
    sku: 'CRM-ENT-001',
    type: 'software',
    category: 'Sales Software',
    description: 'Full-featured CRM for enterprise sales teams',
    price: 999.99,
    cost: 200,
    currency: 'USD',
    status: 'active',
    features: ['Contact Management', 'Deal Tracking', 'Sales Analytics', 'Automation'],
    specifications: { users: 'Unlimited', storage: '100GB' },
    images: ['crm-enterprise.png'],
    metadata: { vendor: 'RTMN', version: '3.0' },
    stats: { sold: 1250, rating: 4.5, reviews: 234 },
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-06-15').toISOString()
  },
  {
    id: 'prod-2',
    name: 'Marketing Automation Pro',
    sku: 'MKT-PRO-002',
    type: 'software',
    category: 'Marketing Software',
    description: 'AI-powered marketing automation platform',
    price: 799.99,
    cost: 150,
    currency: 'USD',
    status: 'active',
    features: ['Email Campaigns', 'Lead Nurturing', 'A/B Testing', 'Analytics'],
    specifications: { users: 'Up to 50', storage: '50GB' },
    images: ['mkt-pro.png'],
    metadata: { vendor: 'RTMN', version: '2.5' },
    stats: { sold: 890, rating: 4.7, reviews: 156 },
    createdAt: new Date('2025-02-01').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString()
  },
  {
    id: 'prod-3',
    name: 'AI Agent Bundle',
    sku: 'AI-BND-001',
    type: 'bundle',
    category: 'AI Solutions',
    description: 'Bundle of 10 AI agents for business automation',
    price: 4999.99,
    cost: 1500,
    currency: 'USD',
    status: 'active',
    features: ['10 AI Agents', 'Priority Support', 'Custom Training', 'API Access'],
    specifications: { agents: 10, languages: 'Multi-language' },
    images: ['ai-bundle.png'],
    metadata: { vendor: 'RTMN', version: '1.0' },
    stats: { sold: 156, rating: 4.9, reviews: 42 },
    createdAt: new Date('2025-03-01').toISOString(),
    updatedAt: new Date('2025-06-01').toISOString()
  }
];

sampleProducts.forEach(p => products.set(p.id, p));

const sampleInventory = [
  { id: 'inv-1', productId: 'prod-1', warehouseId: 'wh-1', quantity: 1000, reserved: 50, available: 950, reorderPoint: 100, status: 'in_stock' },
  { id: 'inv-2', productId: 'prod-2', warehouseId: 'wh-1', quantity: 500, reserved: 25, available: 475, reorderPoint: 50, status: 'in_stock' },
  { id: 'inv-3', productId: 'prod-3', warehouseId: 'wh-2', quantity: 100, reserved: 5, available: 95, reorderPoint: 10, status: 'in_stock' }
];

sampleInventory.forEach(i => inventory.set(i.id, i));

// ============ VALIDATION HELPERS ============

/**
 * Custom validation error
 */
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = 'VALIDATION_ERROR';
    this.field = field;
  }
}

/**
 * Validate numeric input is positive
 */
function validatePositiveNumber(value, fieldName, max = Infinity) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${fieldName} must be a positive number`, fieldName);
  }
  if (num > max) {
    throw new ValidationError(`${fieldName} exceeds maximum allowed value of ${max}`, fieldName);
  }
  return num;
}

/**
 * Validate inventory quantity
 */
function validateInventoryQuantity(quantity) {
  const MAX_QUANTITY = 10000000; // 10 million max
  return validatePositiveNumber(quantity, 'Quantity', MAX_QUANTITY);
}

/**
 * Validate price/cost
 */
function validatePrice(value) {
  if (value === undefined || value === null) return undefined;
  return validatePositiveNumber(value, 'Price', 999999999);
}

/**
 * Validate status value
 */
function validateStatus(status, allowedValues) {
  if (status && !allowedValues.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${allowedValues.join(', ')}`, 'status');
  }
  return status;
}

/**
 * Whitelist allowed fields for update operations
 */
const ALLOWED_PRODUCT_FIELDS = ['name', 'sku', 'type', 'category', 'description', 'price', 'cost', 'status', 'features', 'specifications', 'images', 'metadata'];
const ALLOWED_INVENTORY_FIELDS = ['warehouseId', 'quantity', 'reserved', 'reorderPoint'];

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: '@rtmn/product-twin',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    counts: {
      products: products.size,
      inventory: inventory.size,
      variants: variants.size,
      categories: categories.size
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    service: '@rtmn/product-twin',
    version: '2.0.0'
  });
});

// ============ PRODUCTS API ============

// Get all products (with pagination and filtering)
app.get('/api/products', optionalAuth, asyncHandler(async (req, res) => {
  const {
    category, type, status,
    search, minPrice, maxPrice,
    page = 1, limit = 50
  } = req.query;

  let result = Array.from(products.values());

  // Apply filters
  if (category) result = result.filter(p => p.category === category);
  if (type) result = result.filter(p => p.type === type);
  if (status) result = result.filter(p => p.status === status);

  // Search validation
  if (search) {
    const safeSearch = sanitizeSearchInput(search);
    result = result.filter(p =>
      p.name.toLowerCase().includes(safeSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(safeSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(safeSearch.toLowerCase())
    );
  }

  // Price range validation
  if (minPrice) {
    const min = validatePrice(minPrice);
    result = result.filter(p => p.price >= min);
  }
  if (maxPrice) {
    const max = validatePrice(maxPrice);
    result = result.filter(p => p.price <= max);
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedResult = result.slice(startIndex, endIndex);

  logger.info('Products listed', {
    requestId: req.id,
    filters: { category, type, status, search, minPrice, maxPrice },
    total: result.length,
    returned: paginatedResult.length,
    page: pageNum
  });

  res.json({
    success: true,
    twin: paginatedResult,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: result.length,
      pages: Math.ceil(result.length / limitNum)
    }
  });
}));

// Get single product
app.get('/api/products/:id', optionalAuth, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  logger.info('Product retrieved', { requestId: req.id, productId: req.params.id });

  res.json({
    success: true,
    twin: product
  });
}));

// Create product
app.post('/api/products',requireAuth,  strictLimiter, asyncHandler(async (req, res) => {
  // Sanitize input to prevent prototype pollution
  const rawBody = preventPrototypePollution(req.body);

  const { name, sku, type, category, description, price, cost } = rawBody;

  if (!name || !sku) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Name and SKU are required' }
    });
  }

  // Validate price and cost
  const validatedPrice = validatePrice(price);
  const validatedCost = validatePrice(cost);
  const validatedType = validateStatus(type, ['standard', 'software', 'bundle', 'subscription', 'service']);
  const validatedStatus = validateStatus(rawBody.status, ['draft', 'active', 'inactive', 'archived']);

  const product = {
    id: `prod-${uuidv4().slice(0, 8)}`,
    name: String(name).slice(0, 200),
    sku: String(sku).slice(0, 100),
    type: validatedType || 'standard',
    category: category ? String(category).slice(0, 100) : 'General',
    description: description ? String(description).slice(0, 2000) : '',
    price: validatedPrice || 0,
    cost: validatedCost || 0,
    currency: 'USD',
    status: validatedStatus || 'draft',
    features: Array.isArray(rawBody.features) ? rawBody.features.slice(0, 50) : [],
    specifications: typeof rawBody.specifications === 'object' && rawBody.specifications !== null
      ? preventPrototypePollution(rawBody.specifications)
      : {},
    images: Array.isArray(rawBody.images) ? rawBody.images.slice(0, 20) : [],
    metadata: typeof rawBody.metadata === 'object' && rawBody.metadata !== null
      ? preventPrototypePollution(rawBody.metadata)
      : {},
    stats: { sold: 0, rating: 0, reviews: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await products.set(product.id, product);

  // Platform integration
  platform.bridge.autoBind(product.id, 'episodic');
  platform.memory.recordEvent('product.created', { productId: product.id, name: product.name, sku: product.sku }, product.id);
  platform.policy.audit('create', 'product', { productId: product.id });
  publishAsync('product.product.created', { id: product.id, name: product.name, sku: product.sku });

  logger.info('Product created', { requestId: req.id, productId: product.id });

  res.status(201).json({
    success: true,
    twin: product
  });
}));

// Update product (with field whitelisting)
app.put('/api/products/:id',requireAuth,  strictLimiter, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  // Sanitize and whitelist fields to prevent mass assignment
  const rawBody = preventPrototypePollution(req.body);
  const updates = sanitizeObject(rawBody, ALLOWED_PRODUCT_FIELDS);

  // Validate numeric fields
  if (updates.price !== undefined) {
    updates.price = validatePrice(updates.price);
  }
  if (updates.cost !== undefined) {
    updates.cost = validatePrice(updates.cost);
  }
  if (updates.status) {
    updates.status = validateStatus(updates.status, ['draft', 'active', 'inactive', 'archived']);
  }
  if (updates.type) {
    updates.type = validateStatus(updates.type, ['standard', 'software', 'bundle', 'subscription', 'service']);
  }

  // Apply whitelisted updates
  Object.assign(product, updates);
  product.updatedAt = new Date().toISOString();

  await products.set(product.id, product);

  // Platform integration: publish update event
  publishAsync('product.product.updated', { id: product.id });

  logger.info('Product updated', { requestId: req.id, productId: product.id });

  res.json({
    success: true,
    twin: product
  });
}));

// Delete product
app.delete('/api/products/:id',requireAuth,  strictLimiter, asyncHandler(async (req, res) => {
  if (!products.has(req.params.id)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  await products.delete(req.params.id);

  logger.info('Product deleted', { requestId: req.id, productId: req.params.id });

  res.json({
    success: true,
    twin: { id: req.params.id, deleted: true }
  });
}));

// ============ INVENTORY API ============

// Get product inventory
app.get('/api/products/:id/inventory', optionalAuth, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  const { warehouseId } = req.query;
  let productInventory = Array.from(inventory.values()).filter(i => i.productId === req.params.id);

  if (warehouseId) {
    productInventory = productInventory.filter(i => i.warehouseId === warehouseId);
  }

  logger.info('Inventory retrieved', { requestId: req.id, productId: req.params.id });

  res.json({
    success: true,
    twin: productInventory,
    pagination: {
      total: productInventory.length
    }
  });
}));

// Update inventory
app.put('/api/products/:id/inventory',requireAuth,  strictLimiter, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  // Sanitize input
  const rawBody = preventPrototypePollution(req.body);
  const updates = sanitizeObject(rawBody, ALLOWED_INVENTORY_FIELDS);

  // Validate numeric fields
  if (updates.quantity !== undefined) {
    updates.quantity = validateInventoryQuantity(updates.quantity);
  }
  if (updates.reserved !== undefined) {
    updates.reserved = validateInventoryQuantity(updates.reserved);
  }
  if (updates.reorderPoint !== undefined) {
    updates.reorderPoint = validateInventoryQuantity(updates.reorderPoint);
  }

  // Find existing inventory record
  let inv = Array.from(inventory.values()).find(i =>
    i.productId === req.params.id && (!updates.warehouseId || i.warehouseId === updates.warehouseId)
  );

  if (!inv) {
    // Create new inventory record
    inv = {
      id: `inv-${uuidv4().slice(0, 8)}`,
      productId: req.params.id,
      warehouseId: updates.warehouseId || 'wh-1',
      quantity: updates.quantity || 0,
      reserved: updates.reserved || 0,
      available: 0,
      reorderPoint: updates.reorderPoint || 10,
      status: 'out_of_stock'
    };
  } else {
    // Apply updates
    if (updates.quantity !== undefined) inv.quantity = updates.quantity;
    if (updates.reserved !== undefined) inv.reserved = updates.reserved;
    if (updates.reorderPoint !== undefined) inv.reorderPoint = updates.reorderPoint;
  }

  // Recalculate available
  inv.available = Math.max(0, inv.quantity - inv.reserved);

  // Update status based on availability
  if (inv.available > inv.reorderPoint) {
    inv.status = 'in_stock';
  } else if (inv.available > 0) {
    inv.status = 'low_stock';
  } else {
    inv.status = 'out_of_stock';
  }

  await inventory.set(inv.id, inv);

  // Platform integration: publish inventory-updated event
  publishAsync('product.inventory.updated', { id: inv.id, productId: req.params.id, available: inv.available, status: inv.status });

  logger.info('Inventory updated', { requestId: req.id, productId: req.params.id, inventoryId: inv.id });

  res.json({
    success: true,
    twin: inv
  });
}));

// Reserve inventory (with idempotency)
app.post('/api/products/:id/inventory/reserve',requireAuth,  strictLimiter, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  // Sanitize input
  const rawBody = preventPrototypePollution(req.body);
  const { quantity, orderId, idempotencyKey } = rawBody;

  if (!quantity) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Quantity is required' }
    });
  }

  // Validate quantity
  const validatedQuantity = validateInventoryQuantity(quantity);

  // Idempotency check
  if (idempotencyKey) {
    const existingReservation = reservationIdempotency.get(idempotencyKey);
    if (existingReservation) {
      logger.info('Returning cached reservation', { requestId: req.id, idempotencyKey });
      return res.json({
        success: true,
        twin: existingReservation,
        idempotent: true
      });
    }
  }

  // Find inventory with available stock
  const inv = Array.from(inventory.values()).find(i =>
    i.productId === req.params.id && i.available >= validatedQuantity
  );

  if (!inv) {
    return res.status(400).json({
      success: false,
      error: { code: 'INSUFFICIENT_INVENTORY', message: 'Insufficient inventory available' }
    });
  }

  const reservationId = `res-${uuidv4().slice(0, 8)}`;
  inv.reserved += validatedQuantity;
  inv.available -= validatedQuantity;

  if (inv.available <= inv.reorderPoint) {
    inv.status = 'low_stock';
  }

  await inventory.set(inv.id, inv);

  // Platform integration: publish inventory-reserved event
  publishAsync('product.inventory.reserved', { productId: req.params.id, reservationId, quantity: validatedQuantity });

  const reservation = {
    reservationId,
    productId: req.params.id,
    orderId,
    quantity: validatedQuantity,
    remainingAvailable: inv.available,
    warehouseId: inv.warehouseId,
    createdAt: new Date().toISOString()
  };

  // Store for idempotency
  if (idempotencyKey) {
    reservationIdempotency.set(idempotencyKey, reservation);
    // Clean up old entries (keep last 10000)
    if (reservationIdempotency.size > 10000) {
      const firstKey = reservationIdempotency.keys().next().value;
      reservationIdempotency.delete(firstKey);
    }
  }

  logger.info('Inventory reserved', { requestId: req.id, productId: req.params.id, reservationId });

  res.json({
    success: true,
    twin: reservation
  });
}));

// ============ VARIANTS API ============

// Get product variants
app.get('/api/products/:id/variants', optionalAuth, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  const productVariants = Array.from(variants.values()).filter(v => v.productId === req.params.id);

  res.json({
    success: true,
    twin: productVariants,
    pagination: { total: productVariants.length }
  });
}));

// Create variant
app.post('/api/products/:id/variants',requireAuth,  strictLimiter, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  // Sanitize input
  const rawBody = preventPrototypePollution(req.body);
  const { name, sku, price, attributes } = rawBody;

  if (!name || !sku) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Name and SKU are required' }
    });
  }

  // Validate price
  const validatedPrice = validatePrice(price);

  const variant = {
    id: `var-${uuidv4().slice(0, 8)}`,
    productId: req.params.id,
    name: String(name).slice(0, 200),
    sku: String(sku).slice(0, 100),
    price: validatedPrice || product.price,
    attributes: typeof attributes === 'object' && attributes !== null
      ? preventPrototypePollution(attributes)
      : {},
    status: 'active',
    createdAt: new Date().toISOString()
  };

  await variants.set(variant.id, variant);

  // Platform integration: publish variant-created event
  publishAsync('product.variant.created', { id: variant.id, productId: req.params.id, sku: variant.sku });

  logger.info('Variant created', { requestId: req.id, productId: req.params.id, variantId: variant.id });

  res.status(201).json({
    success: true,
    twin: variant
  });
}));

// ============ ANALYTICS API ============

// Get product analytics
app.get('/api/products/:id/analytics', optionalAuth, asyncHandler(async (req, res) => {
  const product = products.get(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' }
    });
  }

  const productInventory = Array.from(inventory.values()).filter(i => i.productId === req.params.id);

  const totalQuantity = productInventory.reduce((sum, i) => sum + i.quantity, 0);
  const totalAvailable = productInventory.reduce((sum, i) => sum + i.available, 0);
  const totalReserved = productInventory.reduce((sum, i) => sum + i.reserved, 0);

  const revenue = product.stats.sold * product.price;
  const profit = revenue - (product.stats.sold * product.cost);
  const margin = product.price > 0 ? ((product.price - product.cost) / product.price * 100).toFixed(1) : 0;
  const markup = product.cost > 0 ? ((product.price - product.cost) / product.cost * 100).toFixed(1) : 0;

  logger.info('Analytics retrieved', { requestId: req.id, productId: req.params.id });

  res.json({
    success: true,
    twin: {
      productId: product.id,
      sales: {
        unitsSold: product.stats.sold,
        revenue: Math.round(revenue * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: `${margin}%`,
        rating: product.stats.rating,
        reviews: product.stats.reviews
      },
      inventory: {
        totalQuantity,
        available: totalAvailable,
        reserved: totalReserved,
        value: Math.round(totalQuantity * product.cost * 100) / 100
      },
      pricing: {
        price: product.price,
        cost: product.cost,
        markup: `${markup}%`
      }
    }
  });
}));

// ============ COMPARISON API ============

app.post('/api/compare',requireAuth,  asyncHandler(async (req, res) => {
  // Sanitize input
  const rawBody = preventPrototypePollution(req.body);
  const { productIds } = rawBody;

  if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'At least 2 product IDs required for comparison' }
    });
  }

  const prods = productIds.map(id => products.get(id)).filter(Boolean);

  if (prods.length < 2) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'At least 2 valid product IDs required' }
    });
  }

  logger.info('Products compared', { requestId: req.id, count: prods.length });

  res.json({
    success: true,
    twin: prods.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      cost: p.cost,
      type: p.type,
      category: p.category,
      stats: p.stats
    }))
  });
}));

// ============ STATISTICS API ============

app.get('/api/statistics', optionalAuth, asyncHandler(async (req, res) => {
  const allProducts = Array.from(products.values());

  const stats = {
    total: allProducts.length,
    byCategory: {},
    byType: {},
    byStatus: {},
    totalRevenue: 0,
    totalUnitsSold: 0,
    avgPrice: 0,
    topProducts: []
  };

  allProducts.forEach(product => {
    stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;
    stats.byType[product.type] = (stats.byType[product.type] || 0) + 1;
    stats.byStatus[product.status] = (stats.byStatus[product.status] || 0) + 1;
    stats.totalUnitsSold += product.stats.sold;
    stats.totalRevenue += product.stats.sold * product.price;
  });

  stats.avgPrice = allProducts.length > 0
    ? parseFloat((allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length).toFixed(2))
    : 0;
  stats.totalRevenue = Math.round(stats.totalRevenue * 100) / 100;

  stats.topProducts = allProducts
    .filter(p => p.stats.sold > 0)
    .sort((a, b) => b.stats.sold - a.stats.sold)
    .slice(0, 5)
    .map(p => ({ id: p.id, name: p.name, sold: p.stats.sold, revenue: Math.round(p.stats.sold * p.price * 100) / 100 }));

  logger.info('Statistics retrieved', { requestId: req.id });

  res.json({
    success: true,
    twin: stats
  });
}));

// ============ CATEGORIES API ============

app.get('/api/categories', optionalAuth, asyncHandler(async (req, res) => {
  // Extract unique categories from products
  const categoryStats = new Map();

  products.forEach(product => {
    const current = categoryStats.get(product.category) || { count: 0, totalRevenue: 0 };
    current.count++;
    current.totalRevenue += product.stats.sold * product.price;
    categoryStats.set(product.category, current);
  });

  const categoriesList = Array.from(categoryStats.entries()).map(([name, data]) => ({
    name,
    productCount: data.count,
    totalRevenue: Math.round(data.totalRevenue * 100) / 100
  }));

  res.json({
    success: true,
    twin: categoriesList,
    pagination: { total: categoriesList.length }
  });
}));

// ============ SEARCH API ============

app.get('/api/search', optionalAuth, asyncHandler(async (req, res) => {
  const { q, type, category } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Search query (q) is required' }
    });
  }

  const safeSearch = sanitizeSearchInput(q);
  let results = Array.from(products.values());

  // Apply filters
  if (type) results = results.filter(p => p.type === type);
  if (category) results = results.filter(p => p.category === category);

  // Search in name, description, and SKU
  results = results.filter(p =>
    p.name.toLowerCase().includes(safeSearch.toLowerCase()) ||
    p.description.toLowerCase().includes(safeSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(safeSearch.toLowerCase())
  );

  // Pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const startIndex = (page - 1) * limit;

  const paginatedResults = results.slice(startIndex, startIndex + limit);

  logger.info('Search performed', { requestId: req.id, query: safeSearch, results: results.length });

  res.json({
    success: true,
    twin: paginatedResults,
    pagination: {
      page,
      limit,
      total: results.length,
      pages: Math.ceil(results.length / limit)
    }
  });
}));

// ============ ERROR HANDLING ============

// 404 handler
// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'product',
  store: typeof products !== 'undefined' ? products : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: products.size }),
})

app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============ START SERVER ============


;
const server = app.listen(PORT, () => {
  console.log(`Product Twin Service v2.0.0 running on port ${PORT}`);
  console.log(`  Products: ${products.size}`);
  console.log(`  Inventory Records: ${inventory.size}`);
  console.log(`  Variants: ${variants.size}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
