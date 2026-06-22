/**
 * RTMN Partner Twin Service
 * Digital twin service for managing business partners
 * Version: 2.0.0
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';

import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
// TwinOS Shared imports
import {
  optionalAuth,
  preventPrototypePollution,
  sanitizeSearchInput,
  sanitizeObject,
  defaultLimiter,
  strictLimiter,
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
const PORT = process.env.PORT || 4892;
const SERVICE_NAME = '@rtmn/partner-twin';

// ============ IN-MEMORY STORES ============
const partners = new PersistentStore('partners', { serviceName: 'partner-twin' });
const relationships = new PersistentStore('relationships', { serviceName: 'partner-twin' });

// ============ BUSINESS SCOPE VALIDATION ============
const BUSINESS_SCOPES = ['foundation', 'commerce', 'healthcare', 'hospitality', 'manufacturing', 'finance', 'hr', 'marketing', 'operations', 'ai', 'personal', 'retail', 'logistics', 'technology'];
const PARTNER_TYPES = ['vendor', 'customer', 'partner', 'supplier', 'distributor'];
const PARTNER_STATUSES = ['active', 'inactive', 'archived', 'pending'];

// ============ ALLOWED FIELDS FOR UPDATES ============
const ALLOWED_UPDATE_FIELDS = ['name', 'type', 'category', 'status', 'contact', 'rating', 'metadata', 'address', 'taxId', 'paymentTerms', 'creditLimit'];

// ============ SAMPLE DATA ============
const samplePartners = [
  {
    id: 'part-001',
    name: 'TechSupply Co',
    type: 'vendor',
    category: 'technology',
    businessScope: 'foundation',
    status: 'active',
    contact: {
      email: 'sales@techsupply.com',
      phone: '+1-555-0100',
      address: '123 Tech Street, Silicon Valley, CA'
    },
    rating: 4.5,
    totalRevenue: 500000,
    totalOrders: 150,
    relationshipSince: '2022-01-15',
    createdAt: '2022-01-15T00:00:00.000Z',
    updatedAt: '2022-01-15T00:00:00.000Z'
  },
  {
    id: 'part-002',
    name: 'Global Logistics',
    type: 'vendor',
    category: 'logistics',
    businessScope: 'foundation',
    status: 'active',
    contact: {
      email: 'ops@globallog.com',
      phone: '+1-555-0200'
    },
    rating: 4.2,
    totalRevenue: 250000,
    totalOrders: 85,
    relationshipSince: '2023-03-01',
    createdAt: '2023-03-01T00:00:00.000Z',
    updatedAt: '2023-03-01T00:00:00.000Z'
  },
  {
    id: 'part-003',
    name: 'Enterprise Corp',
    type: 'customer',
    category: 'enterprise',
    businessScope: 'commerce',
    status: 'active',
    contact: {
      email: 'buyer@enterprise.com',
      phone: '+1-555-0300'
    },
    rating: 4.8,
    totalRevenue: 1000000,
    totalOrders: 320,
    relationshipSince: '2021-06-01',
    createdAt: '2021-06-01T00:00:00.000Z',
    updatedAt: '2021-06-01T00:00:00.000Z'
  },
  {
    id: 'part-004',
    name: 'Quality Supplies Ltd',
    type: 'supplier',
    category: 'general',
    businessScope: 'manufacturing',
    status: 'active',
    contact: {
      email: 'orders@qualitysupplies.com'
    },
    rating: 4.0,
    totalRevenue: 180000,
    totalOrders: 65,
    relationshipSince: '2023-08-15',
    createdAt: '2023-08-15T00:00:00.000Z',
    updatedAt: '2023-08-15T00:00:00.000Z'
  },
  {
    id: 'part-005',
    name: 'Digital Solutions Inc',
    type: 'partner',
    category: 'technology',
    businessScope: 'ai',
    status: 'inactive',
    contact: {
      email: 'partnership@digitalsol.com'
    },
    rating: 3.5,
    totalRevenue: 75000,
    totalOrders: 25,
    relationshipSince: '2022-11-01',
    createdAt: '2022-11-01T00:00:00.000Z',
    updatedAt: '2024-02-15T00:00:00.000Z'
  }
];

// Initialize sample data
samplePartners.forEach(p => partners.set(p.id, p));

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(requestId);
app.use(requestLogger);

// Apply default rate limiter to all routes
app.use(defaultLimiter);

// Morgan logging format
morgan.token('request-id', (req) => req.id);
morgan.token('user-id', (req) => req.user?.id || 'anonymous');
app.use(morgan(':request-id :method :url :status :response-time ms - :user-id'));

// ============ HELPER FUNCTIONS ============

/**
 * Validate numeric value
 */
function validateNumeric(value, fieldName, min = 0, max = Infinity) {
  if (value === undefined || value === null) return true;
  const num = Number(value);
  if (isNaN(num) || typeof num !== 'number') {
    return `${fieldName} must be a valid number`;
  }
  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (num > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return true;
}

/**
 * Validate business scope
 */
function validateBusinessScope(scope) {
  if (!scope) return true;
  return BUSINESS_SCOPES.includes(scope) || `Invalid business scope. Must be one of: ${BUSINESS_SCOPES.join(', ')}`;
}

/**
 * Apply pagination to results
 */
function applyPagination(items, page = 1, limit = 20) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;

  return {
    items: items.slice(startIndex, endIndex),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: items.length,
      totalPages: Math.ceil(items.length / limitNum),
      hasNext: endIndex < items.length,
      hasPrev: pageNum > 1
    }
  };
}

// ============ HEALTH ENDPOINTS ============

/**
 * Basic health check
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness check
 */
app.get('/ready', (req, res) => {
  res.json({
    success: true,
    status: 'ready',
    service: SERVICE_NAME,
    version: '2.0.0',
    partners: partners.size,
    timestamp: new Date().toISOString()
  });
});

// ============ PARTNERS CRUD ============

/**
 * List all partners with filtering, search, and pagination
 * GET /api/partners
 */
app.get('/api/partners', optionalAuth, (req, res, next) => {
  try {
    const { type, category, status, businessScope, search, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 20 } = req.query;

    let result = Array.from(partners.values());

    // Apply filters
    if (type) {
      result = result.filter(p => p.type === type);
    }
    if (category) {
      result = result.filter(p => p.category === category);
    }
    if (status) {
      result = result.filter(p => p.status === status);
    }
    if (businessScope) {
      result = result.filter(p => p.businessScope === businessScope);
    }

    // Search by name
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      result = result.filter(p =>
        p.name.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
        (p.contact?.email && p.contact.email.toLowerCase().includes(sanitizedSearch.toLowerCase()))
      );
    }

    // Sort results
    const validSortFields = ['name', 'rating', 'totalRevenue', 'relationshipSince', 'createdAt', 'type', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order * aVal.localeCompare(bVal);
      }
      return order * ((aVal || 0) - (bVal || 0));
    });

    // Apply pagination
    const { items, pagination } = applyPagination(result, page, limit);

    logger.info('Partners listed', { requestId: req.id, userId: req.user?.id, total: result.length });

    res.json({
      success: true,
      partners: items,
      pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get partner by ID
 * GET /api/partners/:id
 */
app.get('/api/partners/:id', optionalAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const partner = partners.get(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found'
        }
      });
    }

    logger.info('Partner retrieved', { requestId: req.id, userId: req.user?.id, partnerId: id });

    res.json({
      success: true,
      twin: partner
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new partner
 * POST /api/partners
 */
app.post('/api/partners',requireAuth,  strictLimiter, async (req, res, next) => {
  try {
    // Sanitize input to prevent prototype pollution
    const rawBody = preventPrototypePollution(req.body);

    const { name, type, category, businessScope, status, contact, address, taxId, paymentTerms, creditLimit } = rawBody;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name is required and must be a non-empty string'
        }
      });
    }

    if (name.length > 200) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name must be at most 200 characters'
        }
      });
    }

    // Validate type
    const partnerType = type || 'vendor';
    if (!PARTNER_TYPES.includes(partnerType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid partner type. Must be one of: ${PARTNER_TYPES.join(', ')}`
        }
      });
    }

    // Validate business scope
    const scopeValidation = validateBusinessScope(businessScope);
    if (scopeValidation !== true) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: scopeValidation
        }
      });
    }

    // Validate numeric fields
    const ratingValidation = validateNumeric(creditLimit, 'creditLimit', 0, 1000000);
    if (ratingValidation !== true) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: ratingValidation
        }
      });
    }

    const now = new Date().toISOString();
    const partner = {
      id: `part-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      type: partnerType,
      category: category || 'general',
      businessScope: businessScope || 'foundation',
      status: status || 'active',
      contact: contact || {},
      address: address || null,
      taxId: taxId || null,
      paymentTerms: paymentTerms || 'net-30',
      creditLimit: creditLimit ? Number(creditLimit) : 0,
      rating: 0,
      totalRevenue: 0,
      totalOrders: 0,
      relationshipSince: now.split('T')[0],
      metadata: {},
      createdAt: now,
      updatedAt: now
    };

    await partners.set(partner.id, partner);

    // Platform integration
    platform.bridge.autoBind(partner.id, 'episodic');
    platform.memory.recordEvent('partner.created', { partnerId: partner.id, name: partner.name, type: partner.type }, partner.id);
    platform.policy.audit('create', 'partner', { partnerId: partner.id });
    publishAsync('partner.partner.created', { id: partner.id, name: partner.name });

    logger.info('Partner created', { requestId: req.id, userId: req.user?.id, partnerId: partner.id });

    res.status(201).json({
      success: true,
      twin: partner
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update partner (with whitelist to prevent mass assignment)
 * PUT /api/partners/:id
 */
app.put('/api/partners/:id',requireAuth,  strictLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingPartner = partners.get(id);

    if (!existingPartner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found'
        }
      });
    }

    // Sanitize and whitelist input to prevent mass assignment
    const rawBody = preventPrototypePollution(req.body);
    const updates = sanitizeObject(rawBody, ALLOWED_UPDATE_FIELDS);

    // Validate type if provided
    if (updates.type && !PARTNER_TYPES.includes(updates.type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid partner type. Must be one of: ${PARTNER_TYPES.join(', ')}`
        }
      });
    }

    // Validate status if provided
    if (updates.status && !PARTNER_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${PARTNER_STATUSES.join(', ')}`
        }
      });
    }

    // Validate rating if provided
    const ratingValidation = validateNumeric(updates.rating, 'rating', 0, 5);
    if (ratingValidation !== true) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: ratingValidation
        }
      });
    }

    // Validate numeric fields
    const creditValidation = validateNumeric(updates.creditLimit, 'creditLimit', 0, 1000000);
    if (creditValidation !== true) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: creditValidation
        }
      });
    }

    // Apply updates
    const updatedPartner = {
      ...existingPartner,
      ...updates,
      rating: updates.rating !== undefined ? Number(updates.rating) : existingPartner.rating,
      creditLimit: updates.creditLimit !== undefined ? Number(updates.creditLimit) : existingPartner.creditLimit,
      updatedAt: new Date().toISOString()
    };

    await partners.set(id, updatedPartner);

    // Platform integration: publish update event
    publishAsync('partner.partner.updated', { id });

    logger.info('Partner updated', { requestId: req.id, userId: req.user?.id, partnerId: id });

    res.json({
      success: true,
      twin: updatedPartner
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete partner
 * DELETE /api/partners/:id
 */
app.delete('/api/partners/:id',requireAuth,  strictLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!partners.has(id)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found'
        }
      });
    }

    // Cascade-delete any relationships belonging to this partner.
    // Collect deletes first, then run in parallel to minimise latency.
    const deleteOps = [partners.delete(id)];
    if (relationships.has(id)) {
      deleteOps.push(relationships.delete(id));
    }
    await Promise.all(deleteOps);

    // Platform integration: publish delete event
    publishAsync('partner.partner.deleted', { id });

    logger.info('Partner deleted', { requestId: req.id, userId: req.user?.id, partnerId: id });

    res.json({
      success: true,
      message: 'Partner deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============ PARTNER ANALYTICS ============

/**
 * Get partner analytics
 * GET /api/partners/:id/analytics
 */
app.get('/api/partners/:id/analytics', optionalAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const partner = partners.get(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found'
        }
      });
    }

    // Calculate analytics
    const analytics = {
      partnerId: partner.id,
      partnerName: partner.name,
      type: partner.type,
      totalRevenue: partner.totalRevenue,
      totalOrders: partner.totalOrders || 0,
      averageOrderValue: partner.totalOrders > 0 ? partner.totalRevenue / partner.totalOrders : 0,
      rating: partner.rating,
      relationshipSince: partner.relationshipSince,
      relationshipDurationDays: Math.floor((Date.now() - new Date(partner.relationshipSince).getTime()) / (1000 * 60 * 60 * 24)),
      status: partner.status,
      businessScope: partner.businessScope,
      performance: {
        revenuePercentile: calculatePercentile(partner.totalRevenue),
        orderVolumeScore: Math.min(5, Math.ceil((partner.totalOrders || 0) / 20)),
        engagementScore: calculateEngagementScore(partner)
      }
    };

    logger.info('Partner analytics retrieved', { requestId: req.id, userId: req.user?.id, partnerId: id });

    res.json({
      success: true,
      twin: analytics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate revenue percentile
 */
function calculatePercentile(revenue) {
  const allRevenues = Array.from(partners.values()).map(p => p.totalRevenue).sort((a, b) => a - b);
  const rank = allRevenues.filter(r => r <= revenue).length;
  return Math.round((rank / allRevenues.length) * 100);
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(partner) {
  let score = 0;
  if (partner.status === 'active') score += 2;
  if (partner.rating >= 4) score += 2;
  if (partner.totalOrders > 50) score += 1;
  return Math.min(5, score);
}

// ============ RELATIONSHIPS ============

/**
 * List relationships for a partner
 * GET /api/partners/:id/relationships
 */
app.get('/api/partners/:id/relationships', optionalAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const partner = partners.get(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found'
        }
      });
    }

    const partnerRelationships = relationships.get(id) || [];

    logger.info('Partner relationships retrieved', { requestId: req.id, userId: req.user?.id, partnerId: id });

    res.json({
      success: true,
      relationships: partnerRelationships,
      total: partnerRelationships.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add relationship
 * POST /api/partners/:id/relationships
 */
app.post('/api/partners/:id/relationships',requireAuth,  strictLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const partner = partners.get(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Partner not found'
        }
      });
    }

    const rawBody = preventPrototypePollution(req.body);
    const { relatedPartnerId, relationshipType, strength, notes } = rawBody;

    if (!relatedPartnerId || !relationshipType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'relatedPartnerId and relationshipType are required'
        }
      });
    }

    if (!partners.has(relatedPartnerId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Related partner not found'
        }
      });
    }

    const relationship = {
      id: `rel-${uuidv4().slice(0, 8)}`,
      fromPartnerId: id,
      toPartnerId: relatedPartnerId,
      type: relationshipType,
      strength: strength || 'medium',
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    if (!relationships.has(id)) {
      await relationships.set(id, []);
    }
    const partnerRelationships = relationships.get(id);
    partnerRelationships.push(relationship);
    await relationships.set(id, partnerRelationships);

    // Platform integration: publish relationship-created event
    publishAsync('partner.relationship.created', { partnerId: id, relatedPartnerId, type: relationship.type });

    logger.info('Relationship created', { requestId: req.id, userId: req.user?.id, partnerId: id });

    res.status(201).json({
      success: true,
      twin: relationship
    });
  } catch (error) {
    next(error);
  }
});

// ============ STATISTICS ============

/**
 * Get overall statistics
 * GET /api/statistics
 */
app.get('/api/statistics', optionalAuth, (req, res, next) => {
  try {
    const all = Array.from(partners.values());

    const stats = {
      totalPartners: all.length,
      byType: {
        vendor: all.filter(p => p.type === 'vendor').length,
        customer: all.filter(p => p.type === 'customer').length,
        partner: all.filter(p => p.type === 'partner').length,
        supplier: all.filter(p => p.type === 'supplier').length,
        distributor: all.filter(p => p.type === 'distributor').length
      },
      byStatus: {
        active: all.filter(p => p.status === 'active').length,
        inactive: all.filter(p => p.status === 'inactive').length,
        archived: all.filter(p => p.status === 'archived').length,
        pending: all.filter(p => p.status === 'pending').length
      },
      byCategory: {},
      financial: {
        totalRevenue: all.reduce((sum, p) => sum + (p.totalRevenue || 0), 0),
        averageRevenue: all.length > 0 ? all.reduce((sum, p) => sum + (p.totalRevenue || 0), 0) / all.length : 0,
        totalOrders: all.reduce((sum, p) => sum + (p.totalOrders || 0), 0)
      },
      quality: {
        averageRating: all.length > 0 ? all.reduce((sum, p) => sum + (p.rating || 0), 0) / all.length : 0,
        highPerformers: all.filter(p => p.rating >= 4).length,
        atRisk: all.filter(p => p.status === 'inactive' && p.rating < 3).length
      }
    };

    // Count by category
    const categories = [...new Set(all.map(p => p.category))];
    categories.forEach(cat => {
      stats.byCategory[cat] = all.filter(p => p.category === cat).length;
    });

    logger.info('Statistics retrieved', { requestId: req.id, userId: req.user?.id });

    res.json({
      success: true,
      twin: stats
    });
  } catch (error) {
    next(error);
  }
});

// ============ SEARCH ============

/**
 * Global search across partners
 * GET /api/search
 */
app.get('/api/search', optionalAuth, (req, res, next) => {
  try {
    const { q, type, status, minRevenue, maxRevenue } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query must be at least 2 characters'
        }
      });
    }

    const sanitizedQuery = sanitizeSearchInput(q);
    let results = Array.from(partners.values());

    // Text search
    results = results.filter(p =>
      p.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
      (p.contact?.email && p.contact.email.toLowerCase().includes(sanitizedQuery.toLowerCase())) ||
      (p.contact?.phone && p.contact.phone.includes(sanitizedQuery)) ||
      p.category.toLowerCase().includes(sanitizedQuery.toLowerCase())
    );

    // Apply filters
    if (type) {
      results = results.filter(p => p.type === type);
    }
    if (status) {
      results = results.filter(p => p.status === status);
    }
    if (minRevenue) {
      results = results.filter(p => (p.totalRevenue || 0) >= Number(minRevenue));
    }
    if (maxRevenue) {
      results = results.filter(p => (p.totalRevenue || 0) <= Number(maxRevenue));
    }

    // Apply pagination
    const { items, pagination } = applyPagination(results, req.query.page, req.query.limit);

    logger.info('Search completed', { requestId: req.id, userId: req.user?.id, query: sanitizedQuery, results: results.length });

    res.json({
      success: true,
      query: sanitizedQuery,
      twins: items,
      pagination
    });
  } catch (error) {
    next(error);
  }
});

// ============ ERROR HANDLING ============

// 404 handler
// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'partner',
  store: typeof partners !== 'undefined' ? partners : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: partners.size }),
})

app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============ START SERVER ============


;
const server = app.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} started`, {
    port: PORT,
    version: '2.0.0',
    partners: partners.size
  });
  console.log(`${SERVICE_NAME} running on port ${PORT}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
