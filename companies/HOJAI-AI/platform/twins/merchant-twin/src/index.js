/**
 * RTMN Merchant Twin Service
 * Comprehensive merchant digital twin with stores, offers, staff, settlements
 *
 * Twin Types:
 * - Merchant: Store/business profile
 * - Store: Physical/virtual store
 * - Offer: Special deals/promotions
 * - Staff: Employee management
 * - Settlement: Financial settlements
 *
 * Features:
 * - Merchant profile CRUD
 * - Store management
 * - Offer/deal management
 * - Staff management
 * - Settlement tracking
 * - Ratings & reviews
 * - Business hours
 * - Location management
 * - Merchant analytics
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
  preventPrototypePollution,
  sanitizeSearchInput,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  strictLimiter,
  platform,
  publishAsync,
  installPhase5
} from '@rtmn/twinos-shared';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4888;
const SERVICE_NAME = 'merchant-twin';

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// ============ IN-MEMORY STORAGE ============

const merchants = new PersistentStore('merchants', { serviceName: 'merchant-twin' });
const stores = new PersistentStore('stores', { serviceName: 'merchant-twin' });
const offers = new PersistentStore('offers', { serviceName: 'merchant-twin' });
const staffMembers = new PersistentStore('staff-members', { serviceName: 'merchant-twin' });
const settlements = new PersistentStore('settlements', { serviceName: 'merchant-twin' });
const reviews = new PersistentStore('reviews', { serviceName: 'merchant-twin' });

// Index maps for fast lookups
const byMerchantId = new Map();
const byStoreId = new Map();
const byOfferId = new Map();
const byStaffId = new Map();
const bySettlementId = new Map();
const byCategory = new Map();
const byStatus = new Map();

// ============ TWIN FACTORY FUNCTIONS ============

function createMerchantTwin(data) {
  const now = new Date().toISOString();
  return {
    id: `mer-${uuidv4().slice(0, 8)}`,
    type: 'merchant',
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

function createStoreTwin(merchantId, data) {
  const now = new Date().toISOString();
  return {
    id: `sto-${uuidv4().slice(0, 8)}`,
    merchantId,
    type: 'store',
    ...data,
    status: data.status || 'active',
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

function createOfferTwin(merchantId, data) {
  const now = new Date().toISOString();
  return {
    id: `off-${uuidv4().slice(0, 8)}`,
    merchantId,
    type: 'offer',
    ...data,
    status: data.status || 'active',
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

function createStaffTwin(merchantId, data) {
  const now = new Date().toISOString();
  return {
    id: `stf-${uuidv4().slice(0, 8)}`,
    merchantId,
    type: 'staff',
    ...data,
    status: data.status || 'active',
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

function createSettlementTwin(merchantId, data) {
  const now = new Date().toISOString();
  return {
    id: `set-${uuidv4().slice(0, 8)}`,
    merchantId,
    type: 'settlement',
    ...data,
    status: data.status || 'pending',
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

function createReviewTwin(merchantId, storeId, data) {
  const now = new Date().toISOString();
  return {
    id: `rev-${uuidv4().slice(0, 8)}`,
    merchantId,
    storeId,
    type: 'review',
    ...data,
    status: 'published',
    createdAt: now,
    updatedAt: now
  };
}

// ============ MERCHANT TWIN ENDPOINTS ============

/**
 * GET /api/twins/merchants
 * List merchants with filtering
 */
app.get('/api/twins/merchants', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, status, search, businessId } = req.query;
  const userBusinessId = businessId || req.user.businessId;

  let results = Array.from(merchants.values())
    .filter(m => m.businessId === userBusinessId);

  if (category) {
    results = results.filter(m => m.category === category);
  }
  if (status) {
    results = results.filter(m => m.status === status);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(m =>
      m.businessName?.toLowerCase().includes(query) ||
      m.ownerName?.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query) ||
      m.id.includes(query)
    );
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages }
  });
}));

/**
 * POST /api/twins/merchants
 * Create new merchant twin
 */
app.post('/api/twins/merchants', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const {
    businessName, ownerName, email, phone, address,
    category, businessType, taxId, licenseNumber, metadata
  } = data;

  if (!businessName || !ownerName) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Business name and owner name are required' }
    });
  }

  // Validate business scope
  const allowedCategories = [
    'restaurant', 'retail', 'hotel', 'healthcare', 'beauty', 'fitness',
    'fashion', 'automotive', 'entertainment', 'travel', 'education', 'other'
  ];
  if (category && !allowedCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CATEGORY', message: 'Invalid business category' }
    });
  }

  const merchant = createMerchantTwin({
    businessName,
    ownerName,
    email: email?.toLowerCase(),
    phone,
    address,
    category: category || 'other',
    businessType: businessType || 'sole_proprietorship',
    taxId,
    licenseNumber,
    businessId: req.user.businessId,
    rating: 0,
    totalRatings: 0,
    totalReviews: 0,
    storeCount: 0,
    staffCount: 0,
    totalRevenue: 0,
    pendingSettlements: 0,
    metadata: metadata || {}
  });

  await merchants.set(merchant.id, merchant);

  // Update indexes
  if (category) {
    if (!byCategory.has(category)) byCategory.set(category, new Set());
    byCategory.get(category).add(merchant.id);
  }
  if (!byStatus.has('active')) byStatus.set('active', new Set());
  byStatus.get('active').add(merchant.id);

  // Platform integration
  platform.bridge.autoBind(merchant.id, 'episodic');
  platform.memory.recordEvent('merchant.created', { merchantId: merchant.id, name: merchant.name, category: merchant.category }, merchant.id);
  platform.policy.audit('create', 'merchant', { merchantId: merchant.id });
  publishAsync('merchant.merchant.created', { id: merchant.id, name: merchant.name, category: merchant.category });

  logger.info('Merchant twin created', { merchantId: merchant.id, businessId: req.user.businessId });

  res.status(201).json({
    success: true,
    twin: merchant
  });
}));

/**
 * GET /api/twins/merchant/:id
 * Get merchant twin with all related twins
 */
app.get('/api/twins/merchant/:id', requireAuth, asyncHandler(async (req, res) => {
  const merchant = merchants.get(req.params.id);

  if (!merchant) {
    return res.status(404).json({
      success: false,
      error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' }
    });
  }

  // Business scope validation
  if (merchant.businessId !== req.user.businessId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Gather related twins
  const related = {
    stores: Array.from(stores.values()).filter(s => s.merchantId === merchant.id),
    staff: Array.from(staffMembers.values()).filter(s => s.merchantId === merchant.id),
    activeOffers: Array.from(offers.values()).filter(o => o.merchantId === merchant.id && o.status === 'active'),
    recentSettlements: Array.from(settlements.values())
      .filter(s => s.merchantId === merchant.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
  };

  res.json({
    success: true,
    twin: {
      ...merchant,
      related
    }
  });
}));

/**
 * PUT /api/twins/merchant/:id
 * Update merchant twin
 */
app.put('/api/twins/merchant/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const merchant = merchants.get(req.params.id);

  if (!merchant) {
    return res.status(404).json({
      success: false,
      error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' }
    });
  }

  const data = preventPrototypePollution(req.body);
  const allowedFields = [
    'businessName', 'ownerName', 'email', 'phone', 'address',
    'category', 'businessType', 'taxId', 'licenseNumber', 'status', 'metadata'
  ];

  // Field whitelisting
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      merchant[field] = data[field];
    }
  });

  merchant.updatedAt = new Date().toISOString();
  merchant.version++;

  await merchants.set(merchant.id, merchant);

  // Platform integration: publish update event
  publishAsync('merchant.merchant.updated', { id: merchant.id });

  logger.info('Merchant twin updated', { merchantId: merchant.id });

  res.json({ success: true, twin: merchant });
}));

/**
 * DELETE /api/twins/merchant/:id
 * Archive merchant twin
 */
app.delete('/api/twins/merchant/:id', requireAuth, asyncHandler(async (req, res) => {
  const merchant = merchants.get(req.params.id);

  if (!merchant) {
    return res.status(404).json({
      success: false,
      error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' }
    });
  }

  merchant.status = 'archived';
  merchant.archivedAt = new Date().toISOString();
  merchant.updatedAt = new Date().toISOString();

  await merchants.set(merchant.id, merchant);

  // Platform integration: publish archived event
  publishAsync('merchant.merchant.archived', { id: merchant.id });

  logger.info('Merchant twin archived', { merchantId: merchant.id });

  res.json({ success: true, message: 'Merchant archived' });
}));

// ============ STORE TWIN ENDPOINTS ============

/**
 * GET /api/twins/stores
 * List stores with filtering
 */
app.get('/api/twins/stores', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, merchantId, status, search } = req.query;

  let results = Array.from(stores.values());

  if (merchantId) {
    results = results.filter(s => s.merchantId === merchantId);
  }
  if (status) {
    results = results.filter(s => s.status === status);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(s =>
      s.name?.toLowerCase().includes(query) ||
      s.id.includes(query)
    );
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages }
  });
}));

/**
 * POST /api/twins/stores
 * Create new store twin
 */
app.post('/api/twins/stores', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const {
    merchantId, name, type, address, location,
    businessHours, contact, capacity, features
  } = data;

  if (!merchantId || !name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Merchant ID and store name are required' }
    });
  }

  // Verify merchant exists
  const merchant = merchants.get(merchantId);
  if (!merchant) {
    return res.status(404).json({
      success: false,
      error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' }
    });
  }

  const store = createStoreTwin(merchantId, {
    name,
    type: type || 'physical', // physical, virtual, hybrid
    address,
    location, // { lat, lng }
    businessHours: businessHours || {
      monday: { open: '09:00', close: '21:00', closed: false },
      tuesday: { open: '09:00', close: '21:00', closed: false },
      wednesday: { open: '09:00', close: '21:00', closed: false },
      thursday: { open: '09:00', close: '21:00', closed: false },
      friday: { open: '09:00', close: '22:00', closed: false },
      saturday: { open: '10:00', close: '22:00', closed: false },
      sunday: { open: '10:00', close: '20:00', closed: false }
    },
    contact: contact || {},
    capacity,
    features: features || [],
    rating: 0,
    totalRatings: 0,
    dailyVisits: 0,
    totalOrders: 0
  });

  await stores.set(store.id, store);

  // Platform integration: publish store-created event
  publishAsync('merchant.store.created', { id: store.id, merchantId: store.merchantId, name: store.name });

  // Update merchant store count
  merchant.storeCount++;
  merchant.updatedAt = new Date().toISOString();
  await merchants.set(merchant.id, merchant);

  logger.info('Store twin created', { storeId: store.id, merchantId });

  res.status(201).json({
    success: true,
    twin: store
  });
}));

/**
 * GET /api/twins/store/:id
 * Get store twin
 */
app.get('/api/twins/store/:id', requireAuth, asyncHandler(async (req, res) => {
  const store = stores.get(req.params.id);

  if (!store) {
    return res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' }
    });
  }

  res.json({ success: true, twin: store });
}));

/**
 * PUT /api/twins/store/:id
 * Update store twin
 */
app.put('/api/twins/store/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const store = stores.get(req.params.id);

  if (!store) {
    return res.status(404).json({
      success: false,
      error: { code: 'STORE_NOT_FOUND', message: 'Store not found' }
    });
  }

  const data = preventPrototypePollution(req.body);
  const allowedFields = [
    'name', 'type', 'address', 'location', 'businessHours',
    'contact', 'capacity', 'features', 'status'
  ];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      store[field] = data[field];
    }
  });

  store.updatedAt = new Date().toISOString();
  store.version++;

  await stores.set(store.id, store);

  // Platform integration: publish store-updated event
  publishAsync('merchant.store.updated', { id: store.id });

  res.json({ success: true, twin: store });
}));

// ============ OFFER TWIN ENDPOINTS ============

/**
 * GET /api/twins/offers
 * List offers with filtering
 */
app.get('/api/twins/offers', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, merchantId, storeId, type, status, search } = req.query;

  let results = Array.from(offers.values());

  if (merchantId) {
    results = results.filter(o => o.merchantId === merchantId);
  }
  if (storeId) {
    results = results.filter(o => o.storeId === storeId);
  }
  if (type) {
    results = results.filter(o => o.offerType === type);
  }
  if (status) {
    results = results.filter(o => o.status === status);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(o =>
      o.title?.toLowerCase().includes(query) ||
      o.description?.toLowerCase().includes(query) ||
      o.id.includes(query)
    );
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages }
  });
}));

/**
 * POST /api/twins/offers
 * Create new offer twin
 */
app.post('/api/twins/offers', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const {
    merchantId, storeId, title, description, offerType,
    discount, conditions, startDate, endDate, usageLimit, metadata
  } = data;

  if (!merchantId || !title) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Merchant ID and title are required' }
    });
  }

  const offer = createOfferTwin(merchantId, {
    storeId,
    title,
    description,
    offerType: offerType || 'discount', // discount, bogo, cashback, freebie, bundle
    discount: discount || { type: 'percentage', value: 0 },
    conditions: conditions || [],
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    usageLimit,
    usedCount: 0,
    metadata: metadata || {}
  });

  await offers.set(offer.id, offer);

  // Platform integration: publish offer-created event
  publishAsync('merchant.offer.created', { id: offer.id, merchantId, title: offer.title });

  logger.info('Offer twin created', { offerId: offer.id, merchantId });

  res.status(201).json({
    success: true,
    twin: offer
  });
}));

/**
 * PUT /api/twins/offer/:id
 * Update offer twin
 */
app.put('/api/twins/offer/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const offer = offers.get(req.params.id);

  if (!offer) {
    return res.status(404).json({
      success: false,
      error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' }
    });
  }

  const data = preventPrototypePollution(req.body);
  const allowedFields = [
    'title', 'description', 'offerType', 'discount',
    'conditions', 'startDate', 'endDate', 'usageLimit', 'status'
  ];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      offer[field] = data[field];
    }
  });

  offer.updatedAt = new Date().toISOString();
  offer.version++;

  await offers.set(offer.id, offer);

  res.json({ success: true, twin: offer });
}));

/**
 * POST /api/twins/offer/:id/redeem
 * Redeem offer
 */
app.post('/api/twins/offer/:id/redeem', requireAuth, asyncHandler(async (req, res) => {
  const offer = offers.get(req.params.id);

  if (!offer) {
    return res.status(404).json({
      success: false,
      error: { code: 'OFFER_NOT_FOUND', message: 'Offer not found' }
    });
  }

  if (offer.status !== 'active') {
    return res.status(400).json({
      success: false,
      error: { code: 'OFFER_INACTIVE', message: 'Offer is not active' }
    });
  }

  if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
    return res.status(400).json({
      success: false,
      error: { code: 'OFFER_EXHAUSTED', message: 'Offer usage limit reached' }
    });
  }

  offer.usedCount++;
  offer.updatedAt = new Date().toISOString();

  if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
    offer.status = 'exhausted';
  }

  await offers.set(offer.id, offer);

  res.json({ success: true, twin: offer });
}));

// ============ STAFF TWIN ENDPOINTS ============

/**
 * GET /api/twins/staff
 * List staff with filtering
 */
app.get('/api/twins/staff', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, merchantId, storeId, role, status, search } = req.query;

  let results = Array.from(staffMembers.values());

  if (merchantId) {
    results = results.filter(s => s.merchantId === merchantId);
  }
  if (storeId) {
    results = results.filter(s => s.storeId === storeId);
  }
  if (role) {
    results = results.filter(s => s.role === role);
  }
  if (status) {
    results = results.filter(s => s.status === status);
  }
  if (search) {
    const query = sanitizeSearchInput(search);
    results = results.filter(s =>
      s.name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.id.includes(query)
    );
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages }
  });
}));

/**
 * POST /api/twins/staff
 * Create new staff twin
 */
app.post('/api/twins/staff', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const {
    merchantId, storeId, name, email, phone, role,
    department, permissions, schedule, metadata
  } = data;

  if (!merchantId || !name || !role) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Merchant ID, name, and role are required' }
    });
  }

  const staff = createStaffTwin(merchantId, {
    storeId,
    name,
    email: email?.toLowerCase(),
    phone,
    role, // manager, cashier, server, cook, etc.
    department,
    permissions: permissions || [],
    schedule: schedule || {},
    hireDate: new Date().toISOString(),
    performance: {
      rating: 0,
      completedTasks: 0,
      attendance: 100
    },
    metadata: metadata || {}
  });

  await staffMembers.set(staff.id, staff);

  // Update merchant staff count
  const merchant = merchants.get(merchantId);
  if (merchant) {
    merchant.staffCount++;
    merchant.updatedAt = new Date().toISOString();
    await merchants.set(merchant.id, merchant);
  }

  logger.info('Staff twin created', { staffId: staff.id, merchantId });

  res.status(201).json({
    success: true,
    twin: staff
  });
}));

/**
 * PUT /api/twins/staff/:id
 * Update staff twin
 */
app.put('/api/twins/staff/:id', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const staff = staffMembers.get(req.params.id);

  if (!staff) {
    return res.status(404).json({
      success: false,
      error: { code: 'STAFF_NOT_FOUND', message: 'Staff not found' }
    });
  }

  const data = preventPrototypePollution(req.body);
  const allowedFields = [
    'name', 'email', 'phone', 'role', 'storeId',
    'department', 'permissions', 'schedule', 'status', 'performance'
  ];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      staff[field] = data[field];
    }
  });

  staff.updatedAt = new Date().toISOString();
  staff.version++;

  await staffMembers.set(staff.id, staff);

  res.json({ success: true, twin: staff });
}));

/**
 * DELETE /api/twins/staff/:id
 * Archive staff twin
 */
app.delete('/api/twins/staff/:id', requireAuth, asyncHandler(async (req, res) => {
  const staff = staffMembers.get(req.params.id);

  if (!staff) {
    return res.status(404).json({
      success: false,
      error: { code: 'STAFF_NOT_FOUND', message: 'Staff not found' }
    });
  }

  staff.status = 'archived';
  staff.archivedAt = new Date().toISOString();
  staff.updatedAt = new Date().toISOString();

  await staffMembers.set(staff.id, staff);

  // Update merchant staff count
  const merchant = merchants.get(staff.merchantId);
  if (merchant) {
    merchant.staffCount = Math.max(0, merchant.staffCount - 1);
    merchant.updatedAt = new Date().toISOString();
    await merchants.set(merchant.id, merchant);
  }

  res.json({ success: true, message: 'Staff archived' });
}));

// ============ SETTLEMENT TWIN ENDPOINTS ============

/**
 * GET /api/twins/settlements
 * List settlements with filtering
 */
app.get('/api/twins/settlements', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, merchantId, status, startDate, endDate } = req.query;

  let results = Array.from(settlements.values());

  if (merchantId) {
    results = results.filter(s => s.merchantId === merchantId);
  }
  if (status) {
    results = results.filter(s => s.status === status);
  }
  if (startDate) {
    results = results.filter(s => new Date(s.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    results = results.filter(s => new Date(s.createdAt) <= new Date(endDate));
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages }
  });
}));

/**
 * POST /api/twins/settlements
 * Create new settlement twin
 */
app.post('/api/twins/settlements', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const {
    merchantId, period, grossAmount, commission, netAmount,
    transactionCount, details
  } = data;

  if (!merchantId || netAmount === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Merchant ID and net amount are required' }
    });
  }

  const settlement = createSettlementTwin(merchantId, {
    period: period || {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    },
    grossAmount: grossAmount || 0,
    commission: commission || 0,
    netAmount,
    transactionCount: transactionCount || 0,
    details: details || [],
    processedAt: null,
    paidAt: null
  });

  await settlements.set(settlement.id, settlement);

  // Update merchant pending settlements
  const merchant = merchants.get(merchantId);
  if (merchant) {
    merchant.pendingSettlements = (merchant.pendingSettlements || 0) + netAmount;
    merchant.updatedAt = new Date().toISOString();
    await merchants.set(merchant.id, merchant);
  }

  logger.info('Settlement twin created', { settlementId: settlement.id, merchantId });

  res.status(201).json({
    success: true,
    twin: settlement
  });
}));

/**
 * PUT /api/twins/settlement/:id/process
 * Process settlement
 */
app.put('/api/twins/settlement/:id/process', requireAuth, asyncHandler(async (req, res) => {
  const settlement = settlements.get(req.params.id);

  if (!settlement) {
    return res.status(404).json({
      success: false,
      error: { code: 'SETTLEMENT_NOT_FOUND', message: 'Settlement not found' }
    });
  }

  if (settlement.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Settlement is not in pending status' }
    });
  }

  settlement.status = 'processed';
  settlement.processedAt = new Date().toISOString();
  settlement.updatedAt = new Date().toISOString();

  await settlements.set(settlement.id, settlement);

  res.json({ success: true, twin: settlement });
}));

/**
 * PUT /api/twins/settlement/:id/pay
 * Mark settlement as paid
 */
app.put('/api/twins/settlement/:id/pay', requireAuth, asyncHandler(async (req, res) => {
  const settlement = settlements.get(req.params.id);

  if (!settlement) {
    return res.status(404).json({
      success: false,
      error: { code: 'SETTLEMENT_NOT_FOUND', message: 'Settlement not found' }
    });
  }

  if (settlement.status !== 'processed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Settlement must be processed before payment' }
    });
  }

  settlement.status = 'paid';
  settlement.paidAt = new Date().toISOString();
  settlement.updatedAt = new Date().toISOString();

  await settlements.set(settlement.id, settlement);

  // Update merchant pending settlements
  const merchant = merchants.get(settlement.merchantId);
  if (merchant) {
    merchant.pendingSettlements = Math.max(0, (merchant.pendingSettlements || 0) - settlement.netAmount);
    merchant.totalRevenue = (merchant.totalRevenue || 0) + settlement.netAmount;
    merchant.updatedAt = new Date().toISOString();
    await merchants.set(merchant.id, merchant);
  }

  res.json({ success: true, twin: settlement });
}));

// ============ REVIEW TWIN ENDPOINTS ============

/**
 * POST /api/twins/reviews
 * Create new review twin
 */
app.post('/api/twins/reviews', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const data = preventPrototypePollution(req.body);
  const { merchantId, storeId, customerId, rating, comment, tags } = data;

  if (!merchantId || !rating) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Merchant ID and rating are required' }
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5' }
    });
  }

  const review = createReviewTwin(merchantId, storeId, {
    customerId,
    rating,
    comment,
    tags: tags || [],
    helpful: 0
  });

  await reviews.set(review.id, review);

  // Update merchant rating
  const merchant = merchants.get(merchantId);
  if (merchant) {
    const totalRating = (merchant.rating * merchant.totalRatings) + rating;
    merchant.totalRatings++;
    merchant.rating = totalRating / merchant.totalRatings;
    merchant.totalReviews++;
    merchant.updatedAt = new Date().toISOString();
    await merchants.set(merchant.id, merchant);
  }

  // Update store rating if applicable
  if (storeId) {
    const store = stores.get(storeId);
    if (store) {
      const totalRating = (store.rating * store.totalRatings) + rating;
      store.totalRatings++;
      store.rating = totalRating / store.totalRatings;
      store.updatedAt = new Date().toISOString();
      await stores.set(store.id, store);
    }
  }

  res.status(201).json({ success: true, twin: review });
}));

/**
 * GET /api/twins/merchant/:id/reviews
 * Get merchant reviews
 */
app.get('/api/twins/merchant/:id/reviews', requireAuth, asyncHandler(async (req, res) => {
  const merchantId = req.params.id;
  const { page = 1, limit = 20 } = req.query;

  let results = Array.from(reviews.values())
    .filter(r => r.merchantId === merchantId);

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    success: true,
    twins: results.slice(start, start + parseInt(limit)),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages }
  });
}));

// ============ ANALYTICS ENDPOINTS ============

/**
 * GET /api/analytics/merchants
 * Get merchant analytics
 */
app.get('/api/analytics/merchants', requireAuth, asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const businessMerchants = Array.from(merchants.values())
    .filter(m => m.businessId === businessId);

  const analyticsData = {
    totalMerchants: businessMerchants.length,
    activeMerchants: businessMerchants.filter(m => m.status === 'active').length,
    totalStores: 0,
    totalStaff: 0,
    totalRevenue: 0,
    totalSettlements: settlements.size,
    pendingSettlements: 0,
    totalReviews: reviews.size,
    averageRating: 0,
    byCategory: {},
    topMerchants: []
  };

  let totalRating = 0;

  businessMerchants.forEach(m => {
    analyticsData.totalStores += m.storeCount || 0;
    analyticsData.totalStaff += m.staffCount || 0;
    analyticsData.totalRevenue += m.totalRevenue || 0;
    analyticsData.pendingSettlements += m.pendingSettlements || 0;
    totalRating += m.rating || 0;

    analyticsData.byCategory[m.category] = (analyticsData.byCategory[m.category] || 0) + 1;
  });

  if (businessMerchants.length > 0) {
    analyticsData.averageRating = totalRating / businessMerchants.length;
  }

  // Get top merchants by revenue
  analyticsData.topMerchants = businessMerchants
    .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
    .slice(0, 10)
    .map(m => ({
      id: m.id,
      businessName: m.businessName,
      totalRevenue: m.totalRevenue,
      rating: m.rating,
      storeCount: m.storeCount,
      staffCount: m.staffCount
    }));

  res.json({ success: true, analytics: analyticsData });
}));

/**
 * GET /api/analytics/merchant/:id
 * Get specific merchant analytics
 */
app.get('/api/analytics/merchant/:id', requireAuth, asyncHandler(async (req, res) => {
  const merchant = merchants.get(req.params.id);

  if (!merchant) {
    return res.status(404).json({
      success: false,
      error: { code: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' }
    });
  }

  const merchantStores = Array.from(stores.values()).filter(s => s.merchantId === merchant.id);
  const merchantStaff = Array.from(staffMembers.values()).filter(s => s.merchantId === merchant.id);
  const merchantOffers = Array.from(offers.values()).filter(o => o.merchantId === merchant.id);
  const merchantSettlements = Array.from(settlements.values()).filter(s => s.merchantId === merchant.id);
  const merchantReviews = Array.from(reviews.values()).filter(r => r.merchantId === merchant.id);

  const merchantAnalytics = {
    merchant: {
      id: merchant.id,
      businessName: merchant.businessName,
      rating: merchant.rating,
      totalReviews: merchant.totalReviews
    },
    stores: {
      total: merchantStores.length,
      active: merchantStores.filter(s => s.status === 'active').length,
      byType: merchantStores.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {})
    },
    staff: {
      total: merchantStaff.length,
      active: merchantStaff.filter(s => s.status === 'active').length,
      byRole: merchantStaff.reduce((acc, s) => {
        acc[s.role] = (acc[s.role] || 0) + 1;
        return acc;
      }, {})
    },
    offers: {
      total: merchantOffers.length,
      active: merchantOffers.filter(o => o.status === 'active').length,
      totalRedemptions: merchantOffers.reduce((sum, o) => sum + (o.usedCount || 0), 0)
    },
    settlements: {
      total: merchantSettlements.length,
      pending: merchantSettlements.filter(s => s.status === 'pending').length,
      processed: merchantSettlements.filter(s => s.status === 'processed').length,
      paid: merchantSettlements.filter(s => s.status === 'paid').length,
      totalAmount: merchantSettlements.reduce((sum, s) => sum + (s.netAmount || 0), 0)
    },
    reviews: {
      total: merchantReviews.length,
      averageRating: merchantReviews.length > 0
        ? merchantReviews.reduce((sum, r) => sum + r.rating, 0) / merchantReviews.length
        : 0,
      ratingDistribution: merchantReviews.reduce((acc, r) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
      }, {})
    }
  };

  res.json({ success: true, analytics: merchantAnalytics });
}));

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      merchants: merchants.size,
      stores: stores.size,
      offers: offers.size,
      staff: staffMembers.size,
      settlements: settlements.size,
      reviews: reviews.size
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: SERVICE_NAME });
});

// ============ ERROR HANDLING ============

// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'merchant',
  store: typeof merchants !== 'undefined' ? merchants : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: merchants.size }),
})

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START ============


;
const server = app.listen(PORT, () => {
  logger.info(`Merchant Twin Service running on port ${PORT}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
