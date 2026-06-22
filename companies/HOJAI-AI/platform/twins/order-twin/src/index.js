/**
 * RTMN Order Twin Service
 * Manages the complete order lifecycle: cart → checkout → order → shipment → delivery → return/refund
 *
 * Twin Types:
 * - Cart Twin: Shopping cart state
 * - Checkout Twin: Checkout session state
 * - Order Twin: Order state
 * - Shipment Twin: Shipping/delivery state
 * - Return Twin: Return/refund state
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import {
  requireAuth,
  optionalAuth,
  preventPrototypePollution,
  sanitizeSearchInput,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  authLimiter,
  strictLimiter,
  installPhase5
} from '@rtmn/twinos-shared';
import { publish, publishAsync } from '@rtmn/twinos-shared/src/event-publisher.js';
import { platform } from '@rtmn/twinos-shared/src/platform-client.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 5310;
const SERVICE_NAME = 'order-twin';

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// ============ PERSISTENT STORAGE ============
// File-backed JSON stores that survive restarts. Sync reads, async writes.

const STORE_OPTS = { serviceName: 'order-twin' };
const orders = new PersistentStore('orders', STORE_OPTS);
const carts = new PersistentStore('carts', STORE_OPTS);
const checkouts = new PersistentStore('checkouts', STORE_OPTS);
const shipments = new PersistentStore('shipments', STORE_OPTS);
const returns = new PersistentStore('returns', STORE_OPTS);
const orderItems = new PersistentStore('order-items', STORE_OPTS);

// Idempotency tracking for operations (in-memory TTL cache, not a data store)
const idempotencyKeys = new Map();

// ============ TWIN STATE MACHINE ============

const ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

const SHIPMENT_STATUS = {
  PENDING: 'pending',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  FAILED: 'failed'
};

const RETURN_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  RECEIVED: 'received',
  INSPECTING: 'inspecting',
  REFUNDED: 'refunded',
  REJECTED: 'rejected'
};

// ============ TWIN FACTORY ============

function createTwin(type, data) {
  const now = new Date().toISOString();
  return {
    id: `${type}-${uuidv4().slice(0, 8)}`,
    type,
    ...data,
    status: data.status || 'active',
    health: 'healthy',
    version: 1,
    createdAt: now,
    updatedAt: now,
    _metadata: {
      service: SERVICE_NAME,
      twinVersion: '1.0.0'
    }
  };
}

// ============ CART TWIN ENDPOINTS ============

/**
 * GET /api/twins/cart/:id
 * Get cart twin by ID
 */
app.get('/api/twins/cart/:id', requireAuth, asyncHandler(async (req, res) => {
  const cart = carts.get(req.params.id);

  if (!cart) {
    return res.status(404).json({
      success: false,
      error: { code: 'CART_NOT_FOUND', message: 'Cart not found' }
    });
  }

  // Check business scope
  if (cart.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  res.json({
    success: true,
    twin: cart
  });
}));

/**
 * POST /api/twins/cart
 * Create new cart twin
 */
app.post('/api/twins/cart', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { customerId, items = [] } = preventPrototypePollution(req.body);

  if (!customerId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Customer ID required' }
    });
  }

  const cart = createTwin('cart', {
    customerId,
    businessId: req.user.businessId,
    items,
    itemCount: items.length,
    subtotal: 0,
    tax: 0,
    total: 0,
    currency: 'USD',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  });

  // Calculate totals
  calculateCartTotals(cart);

  await carts.set(cart.id, cart);

  logger.info('Cart twin created', { twinId: cart.id, customerId, businessId: req.user.businessId });

  res.status(201).json({
    success: true,
    twin: cart
  });
}));

/**
 * PUT /api/twins/cart/:id/items
 * Add/update items in cart
 */
app.put('/api/twins/cart/:id/items', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const cart = carts.get(req.params.id);

  if (!cart) {
    return res.status(404).json({
      success: false,
      error: { code: 'CART_NOT_FOUND', message: 'Cart not found' }
    });
  }

  const { items, idempotencyKey } = preventPrototypePollution(req.body);

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  cart.items = items || [];
  cart.itemCount = cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  cart.updatedAt = new Date().toISOString();

  calculateCartTotals(cart);

  await carts.set(cart.id, cart);

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, cart);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  res.json({
    success: true,
    twin: cart
  });
}));

/**
 * DELETE /api/twins/cart/:id
 * Delete/abandon cart
 */
app.delete('/api/twins/cart/:id', requireAuth, asyncHandler(async (req, res) => {
  const cart = carts.get(req.params.id);

  if (!cart) {
    return res.status(404).json({
      success: false,
      error: { code: 'CART_NOT_FOUND', message: 'Cart not found' }
    });
  }

  carts.delete(req.params.id);

  logger.info('Cart twin deleted', { twinId: req.params.id });

  res.json({
    success: true,
    message: 'Cart deleted'
  });
}));

// ============ CHECKOUT TWIN ENDPOINTS ============

/**
 * POST /api/twins/checkout
 * Create checkout session twin
 */
app.post('/api/twins/checkout', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { cartId, shippingAddress, billingAddress, paymentMethod } = preventPrototypePollution(req.body);

  const cart = carts.get(cartId);
  if (!cart) {
    return res.status(404).json({
      success: false,
      error: { code: 'CART_NOT_FOUND', message: 'Cart not found' }
    });
  }

  const checkout = createTwin('checkout', {
    cartId,
    customerId: cart.customerId,
    businessId: req.user.businessId,
    shippingAddress,
    billingAddress,
    paymentMethod,
    status: 'in_progress',
    completedAt: null,
    orderId: null
  });

  res.status(201).json({
    success: true,
    twin: checkout
  });
}));

/**
 * PUT /api/twins/checkout/:id/complete
 * Complete checkout and create order
 */
app.put('/api/twins/checkout/:id/complete', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { idempotencyKey } = preventPrototypePollution(req.body);

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyKeys.get(idempotencyKey);
    if (cached) {
      return res.json({ success: true, twin: cached, idempotent: true });
    }
  }

  const checkout = Array.from(carts.values()).find(c => c.type === 'checkout' && c.id === req.params.id);

  if (!checkout) {
    return res.status(404).json({
      success: false,
      error: { code: 'CHECKOUT_NOT_FOUND', message: 'Checkout session not found' }
    });
  }

  const cart = carts.get(checkout.cartId);
  if (!cart) {
    return res.status(400).json({
      success: false,
      error: { code: 'CART_EXPIRED', message: 'Cart has expired' }
    });
  }

  // Create order twin
  const order = createOrderFromCart(cart, checkout, req.user);

  // Mark checkout as complete
  checkout.status = 'completed';
  checkout.completedAt = new Date().toISOString();
  checkout.orderId = order.id;
  checkout.updatedAt = new Date().toISOString();

  // Cache idempotency result
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, order);
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  }

  logger.info('Order twin created from checkout', { orderId: order.id, checkoutId: checkout.id });

  res.status(201).json({
    success: true,
    twin: order
  });
}));

// ============ ORDER TWIN ENDPOINTS ============

/**
 * GET /api/twins/orders
 * List orders with pagination and filtering
 */
app.get('/api/twins/orders', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, customerId, search } = req.query;
  const businessId = req.user.businessId;

  let results = Array.from(orders.values())
    .filter(o => o.businessId === businessId);

  // Apply filters
  if (status) {
    results = results.filter(o => o.status === status);
  }
  if (customerId) {
    results = results.filter(o => o.customerId === customerId);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(o =>
      o.id.includes(query) ||
      o.orderNumber?.includes(query)
    );
  }

  // Sort by createdAt desc
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  });
}));

/**
 * GET /api/twins/order/:id
 * Get order twin by ID
 */
app.get('/api/twins/order/:id', requireAuth, asyncHandler(async (req, res) => {
  const order = orders.get(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
    });
  }

  // Check business scope
  if (order.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Get related twins
  const items = Array.from(orderItems.values()).filter(i => i.orderId === order.id);
  const shipment = Array.from(shipments.values()).find(s => s.orderId === order.id);

  res.json({
    success: true,
    twin: {
      ...order,
      items,
      shipment
    }
  });
}));

/**
 * POST /api/twins/order
 * Create order twin directly (for admin/back-office)
 */
app.post('/api/twins/order', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { customerId, items, shippingAddress, billingAddress, notes } = preventPrototypePollution(req.body);

  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Customer ID and items required' }
    });
  }

  const cart = {
    customerId,
    businessId: req.user.businessId,
    items,
    itemCount: items.length
  };
  calculateCartTotals(cart);

  const order = createTwin('order', {
    customerId,
    businessId: req.user.businessId,
    items,
    subtotal: cart.subtotal,
    tax: cart.tax,
    total: cart.total,
    currency: cart.currency,
    shippingAddress,
    billingAddress,
    status: ORDER_STATUS.PENDING,
    orderNumber: generateOrderNumber(),
    notes,
    createdBy: req.user.id
  });

  // Store items
  items.forEach(item => {
    const orderItem = createTwin('order_item', {
      ...item,
      orderId: order.id
    });
    orderItems.set(orderItem.id, orderItem);
  });

  order.items = items.length;

  await orders.set(order.id, order);

  // Platform integration: bind to memory, record event, audit, publish (all non-blocking)
  platform.bridge.autoBind(order.id, 'transactional');
  platform.memory.recordEvent('order.created', { orderId: order.id, customerId, amount: order.total }, order.id);
  platform.policy.audit('create', 'order', { orderId: order.id, amount: order.total });
  publishAsync('order.order.created', { id: order.id, customerId, amount: order.total, status: order.status });

  logger.info('Order twin created', { orderId: order.id, orderNumber: order.orderNumber });

  res.status(201).json({
    success: true,
    twin: order
  });
}));

/**
 * PUT /api/twins/order/:id/status
 * Update order status (with state machine validation)
 */
app.put('/api/twins/order/:id/status', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { status, notes } = preventPrototypePollution(req.body);

  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
    });
  }

  // Validate state transition
  if (!isValidStatusTransition(order.status, status)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from ${order.status} to ${status}`
      }
    });
  }

  const previousStatus = order.status;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({
    from: previousStatus,
    to: status,
    changedBy: req.user.id,
    changedAt: order.updatedAt,
    notes
  });

  // Platform integration: publish status change (non-blocking)
  publishAsync('order.status.changed', { orderId: order.id, newStatus: status, oldStatus: previousStatus });

  // If transitioned to cancelled, emit additional cancel-specific events
  if (status === ORDER_STATUS.CANCELLED) {
    platform.memory.recordEvent('order.cancelled', { orderId: order.id, reason: notes }, order.id);
    publishAsync('order.order.cancelled', { orderId: order.id, reason: notes });
  }

  logger.info('Order status updated', {
    orderId: order.id,
    from: previousStatus,
    to: status,
    by: req.user.id
  });

  res.json({
    success: true,
    twin: order
  });
}));

// ============ SHIPMENT TWIN ENDPOINTS ============

/**
 * POST /api/twins/shipment
 * Create shipment twin for order
 */
app.post('/api/twins/shipment', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { orderId, carrier, trackingNumber, estimatedDelivery } = preventPrototypePollution(req.body);

  const order = orders.get(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
    });
  }

  const shipment = createTwin('shipment', {
    orderId,
    customerId: order.customerId,
    businessId: req.user.businessId,
    carrier,
    trackingNumber,
    estimatedDelivery,
    status: SHIPMENT_STATUS.PENDING,
    events: [{
      status: SHIPMENT_STATUS.PENDING,
      timestamp: new Date().toISOString(),
      description: 'Shipment created'
    }]
  });

  shipments.set(shipment.id, shipment);

  // Update order status
  order.status = ORDER_STATUS.SHIPPED;
  order.updatedAt = new Date().toISOString();
  order.shipmentId = shipment.id;

  logger.info('Shipment twin created', { shipmentId: shipment.id, orderId });

  res.status(201).json({
    success: true,
    twin: shipment
  });
}));

/**
 * PUT /api/twins/shipment/:id/track
 * Add tracking event to shipment
 */
app.put('/api/twins/shipment/:id/track', requireAuth, asyncHandler(async (req, res) => {
  const { status, location, description } = preventPrototypePollution(req.body);

  const shipment = shipments.get(req.params.id);
  if (!shipment) {
    return res.status(404).json({
      success: false,
      error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found' }
    });
  }

  shipment.events = shipment.events || [];
  shipment.events.push({
    status,
    location,
    description,
    timestamp: new Date().toISOString()
  });
  shipment.status = status;
  shipment.updatedAt = new Date().toISOString();

  // If delivered, update order
  if (status === SHIPMENT_STATUS.DELIVERED) {
    const order = orders.get(shipment.orderId);
    if (order) {
      order.status = ORDER_STATUS.DELIVERED;
      order.deliveredAt = new Date().toISOString();
      order.updatedAt = new Date().toISOString();
    }
  }

  res.json({
    success: true,
    twin: shipment
  });
}));

// ============ RETURN TWIN ENDPOINTS ============

/**
 * POST /api/twins/return
 * Create return request twin
 */
app.post('/api/twins/return', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { orderId, items, reason, notes } = preventPrototypePollution(req.body);

  const order = orders.get(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
    });
  }

  if (order.status !== ORDER_STATUS.DELIVERED) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATE', message: 'Only delivered orders can be returned' }
    });
  }

  const returnTwin = createTwin('return', {
    orderId,
    customerId: order.customerId,
    businessId: req.user.businessId,
    items,
    reason,
    notes,
    status: RETURN_STATUS.REQUESTED,
    refundAmount: calculateRefundAmount(order, items)
  });

  returns.set(returnTwin.id, returnTwin);

  logger.info('Return twin created', { returnId: returnTwin.id, orderId });

  res.status(201).json({
    success: true,
    twin: returnTwin
  });
}));

/**
 * PUT /api/twins/return/:id/status
 * Update return status
 */
app.put('/api/twins/return/:id/status', requireAuth, asyncHandler(async (req, res) => {
  const { status, refundAmount } = preventPrototypePollution(req.body);

  const returnTwin = returns.get(req.params.id);
  if (!returnTwin) {
    return res.status(404).json({
      success: false,
      error: { code: 'RETURN_NOT_FOUND', message: 'Return not found' }
    });
  }

  returnTwin.status = status;
  returnTwin.updatedAt = new Date().toISOString();

  if (status === RETURN_STATUS.REFUNDED) {
    returnTwin.refundedAt = new Date().toISOString();

    // Update order status
    const order = orders.get(returnTwin.orderId);
    if (order) {
      order.status = ORDER_STATUS.REFUNDED;
      order.updatedAt = new Date().toISOString();
      order.refundId = returnTwin.id;
    }
  }

  res.json({
    success: true,
    twin: returnTwin
  });
}));

// ============ ANALYTICS ENDPOINTS ============

/**
 * GET /api/analytics/orders
 * Get order analytics
 */
app.get('/api/analytics/orders', requireAuth, asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const allOrders = Array.from(orders.values()).filter(o => o.businessId === businessId);

  const analytics = {
    totalOrders: allOrders.length,
    totalRevenue: allOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    averageOrderValue: allOrders.length > 0
      ? allOrders.reduce((sum, o) => sum + (o.total || 0), 0) / allOrders.length
      : 0,
    byStatus: {},
    byMonth: {},
    topCustomers: {}
  };

  allOrders.forEach(order => {
    // By status
    analytics.byStatus[order.status] = (analytics.byStatus[order.status] || 0) + 1;

    // By month
    const month = new Date(order.createdAt).toISOString().slice(0, 7);
    if (!analytics.byMonth[month]) {
      analytics.byMonth[month] = { count: 0, revenue: 0 };
    }
    analytics.byMonth[month].count++;
    analytics.byMonth[month].revenue += order.total || 0;

    // Top customers
    if (!analytics.topCustomers[order.customerId]) {
      analytics.topCustomers[order.customerId] = { orders: 0, revenue: 0 };
    }
    analytics.topCustomers[order.customerId].orders++;
    analytics.topCustomers[order.customerId].revenue += order.total || 0;
  });

  res.json({
    success: true,
    analytics
  });
}));

// ============ HELPER FUNCTIONS ============

function calculateCartTotals(cart) {
  cart.subtotal = cart.items.reduce((sum, item) => {
    return sum + ((item.price || 0) * (item.quantity || 1));
  }, 0);
  cart.tax = cart.subtotal * 0.1; // 10% tax
  cart.total = cart.subtotal + cart.tax + (cart.shipping || 0);
}

function createOrderFromCart(cart, checkout, user) {
  const order = createTwin('order', {
    customerId: cart.customerId,
    businessId: user.businessId,
    items: cart.items,
    subtotal: cart.subtotal,
    tax: cart.tax,
    total: cart.total,
    currency: cart.currency,
    shippingAddress: checkout.shippingAddress,
    billingAddress: checkout.billingAddress,
    status: ORDER_STATUS.PENDING,
    orderNumber: generateOrderNumber(),
    createdBy: user.id
  });

  // Store items
  cart.items.forEach(item => {
    const orderItem = createTwin('order_item', {
      ...item,
      orderId: order.id
    });
    orderItems.set(orderItem.id, orderItem);
  });

  order.items = cart.items.length;

  orders.set(order.id, order);

  // Delete cart
  carts.delete(cart.id);

  return order;
}

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}-${random}`;
}

function isValidStatusTransition(current, next) {
  const transitions = {
    [ORDER_STATUS.DRAFT]: [ORDER_STATUS.PENDING],
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.REFUNDED]: []
  };

  return transitions[current]?.includes(next) || false;
}

function calculateRefundAmount(order, returnItems) {
  // Simplified - in reality would calculate based on returned items
  return order.total * (returnItems.length / order.items);
}

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      orders: orders.size,
      carts: carts.size,
      shipments: shipments.size,
      returns: returns.size
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// ============ ERROR HANDLING ============

// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'order',
  store: typeof orders !== 'undefined' ? orders : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: orders.size }),
})

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START SERVER ============


;
const server = app.listen(PORT, () => {
  logger.info(`🛒 Order Twin Service running on port ${PORT}`);
  logger.info(`   Managing ${orders.size} orders`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
