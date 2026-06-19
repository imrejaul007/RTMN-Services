/**
 * RTMN Lead Twin - Leads Router v2.0
 * Lead management with security fixes and pagination
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  sanitizeObject,
  preventPrototypePollution,
  sanitizeSearchInput,
  logger
} from '@rtmn/twinos-shared';
import { PAGINATION } from '@rtmn/twinos-shared';
import { leads } from '../services/store.js';

const router = Router();

// ============ CONSTANTS ============

// Allowed fields for PATCH updates (whitelist for mass assignment protection)
const ALLOWED_UPDATE_FIELDS = [
  'name',
  'email',
  'company',
  'phone',
  'industry',
  'type',
  'score',
  'status',
  'notes',
  'tags',
  'source',
  'owner',
  'metadata'
];

// Valid lead types
const VALID_TYPES = ['hot', 'warm', 'cold'];

// Valid industries
const VALID_INDUSTRIES = [
  'Technology',
  'Retail',
  'SaaS',
  'Enterprise',
  'Healthcare',
  'Finance',
  'Marketing',
  'Logistics',
  'Analytics',
  'Sales',
  'Other'
];

// Valid statuses
const VALID_STATUSES = ['active', 'inactive', 'archived', 'converted'];

// ============ HELPER FUNCTIONS ============

/**
 * Validate numeric score (0-100)
 */
function validateScore(score) {
  if (score === undefined || score === null) return true;
  const num = Number(score);
  return !isNaN(num) && num >= 0 && num <= 100;
}

/**
 * Get pagination parameters
 */
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT), PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Apply business scope filter
 */
function filterByBusinessScope(leadResults, user) {
  // Admin users can see all leads
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    return leadResults;
  }
  // Regular users only see their business leads
  return leadResults.filter(l => !l.businessId || l.businessId === user?.businessId);
}

// ============ ROUTES ============

/**
 * GET /leads - List leads with filtering, search, and pagination
 */
router.get('/', (req, res, next) => {
  try {
    const { q, type, industry, status, page, limit, sortBy, sortOrder } = req.query;

    // Get pagination
    const { page: currentPage, limit: pageLimit, skip } = getPagination(req.query);

    // Sanitize search input
    const searchQuery = q ? sanitizeSearchInput(q) : null;

    // Filter leads based on query params
    let results = Array.from(leads.values());

    // Apply business scope
    results = filterByBusinessScope(results, req.user);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(l =>
        l.name?.toLowerCase().includes(query) ||
        l.company?.toLowerCase().includes(query) ||
        l.email?.toLowerCase().includes(query) ||
        l.notes?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
          }
        });
      }
      results = results.filter(l => l.type === type);
    }

    // Apply industry filter
    if (industry) {
      if (!VALID_INDUSTRIES.includes(industry)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}`
          }
        });
      }
      results = results.filter(l => l.industry === industry);
    }

    // Apply status filter
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
          }
        });
      }
      results = results.filter(l => l.status === status);
    }

    // Sort results
    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    results.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });

    // Calculate pagination
    const total = results.length;
    const totalPages = Math.ceil(total / pageLimit);
    const paginatedResults = results.slice(skip, skip + pageLimit);

    // Log the request
    logger.info('Leads listed', {
      userId: req.user?.id,
      filters: { q, type, industry, status },
      pagination: { page: currentPage, limit: pageLimit },
      total,
      requestId: req.id
    });

    res.json({
      success: true,
      twin: {
        leads: paginatedResults,
        pagination: {
          page: currentPage,
          limit: pageLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      },
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /leads/:id - Get single lead by ID
 */
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = leads.get(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    // Check business scope
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      if (lead.businessId && lead.businessId !== req.user?.businessId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'BUSINESS_SCOPE',
            message: 'Access denied to this lead'
          }
        });
      }
    }

    logger.info('Lead retrieved', {
      leadId: id,
      userId: req.user?.id,
      requestId: req.id
    });

    res.json({
      success: true,
      twin: lead,
      data: lead
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /leads - Create new lead
 */
router.post('/', (req, res, next) => {
  try {
    const { name, email, company, phone, industry, type, score, notes, tags, source, owner } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and email are required'
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format'
        }
      });
    }

    // Validate type
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
        }
      });
    }

    // Validate industry
    if (industry && !VALID_INDUSTRIES.includes(industry)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}`
        }
      });
    }

    // Validate score
    if (score !== undefined && !validateScore(score)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Score must be a number between 0 and 100'
        }
      });
    }

    // Check for duplicate email
    const existingLead = Array.from(leads.values()).find(l => l.email === email);
    if (existingLead) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A lead with this email already exists'
        }
      });
    }

    const id = `lead_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const lead = {
      id,
      name,
      email,
      company: company || null,
      phone: phone || null,
      industry: industry || 'Other',
      type: type || 'cold',
      score: typeof score === 'number' ? score : 50,
      status: 'active',
      notes: notes || null,
      tags: Array.isArray(tags) ? tags : [],
      source: source || null,
      owner: owner || null,
      metadata: {},
      businessId: req.user?.businessId || null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      createdBy: req.user?.id || null
    };

    leads.set(id, lead);

    logger.info('Lead created', {
      leadId: id,
      userId: req.user?.id,
      businessId: req.user?.businessId,
      requestId: req.id
    });

    res.status(201).json({
      success: true,
      twin: lead,
      data: lead
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /leads/:id - Update lead with whitelist protection
 */
router.patch('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = leads.get(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    // Check business scope
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      if (lead.businessId && lead.businessId !== req.user?.businessId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'BUSINESS_SCOPE',
            message: 'Access denied to this lead'
          }
        });
      }
    }

    // Prevent prototype pollution on body
    const sanitizedBody = preventPrototypePollution(req.body);

    // Whitelist allowed fields (prevent mass assignment)
    const updates = sanitizeObject(sanitizedBody, ALLOWED_UPDATE_FIELDS);

    // Validate score if present
    if (updates.score !== undefined && !validateScore(updates.score)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Score must be a number between 0 and 100'
        }
      });
    }

    // Validate type if present
    if (updates.type && !VALID_TYPES.includes(updates.type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
        }
      });
    }

    // Validate industry if present
    if (updates.industry && !VALID_INDUSTRIES.includes(updates.industry)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}`
        }
      });
    }

    // Validate status if present
    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
        }
      });
    }

    // Prevent modification of immutable fields
    delete updates.id;
    delete updates.businessId;
    delete updates.createdAt;
    delete updates.createdBy;

    const updated = {
      ...lead,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.id || null
    };

    leads.set(id, updated);

    logger.info('Lead updated', {
      leadId: id,
      userId: req.user?.id,
      updatedFields: Object.keys(updates),
      requestId: req.id
    });

    res.json({
      success: true,
      twin: updated,
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /leads/:id - Delete lead
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = leads.get(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lead not found'
        }
      });
    }

    // Check business scope
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      if (lead.businessId && lead.businessId !== req.user?.businessId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'BUSINESS_SCOPE',
            message: 'Access denied to this lead'
          }
        });
      }
    }

    leads.delete(id);

    logger.info('Lead deleted', {
      leadId: id,
      userId: req.user?.id,
      requestId: req.id
    });

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /leads/stats/summary - Get lead statistics
 */
router.get('/stats/summary', (req, res, next) => {
  try {
    let results = Array.from(leads.values());

    // Apply business scope
    results = filterByBusinessScope(results, req.user);

    // Calculate statistics
    const stats = {
      total: results.length,
      byType: {
        hot: results.filter(l => l.type === 'hot').length,
        warm: results.filter(l => l.type === 'warm').length,
        cold: results.filter(l => l.type === 'cold').length
      },
      byStatus: {
        active: results.filter(l => l.status === 'active').length,
        inactive: results.filter(l => l.status === 'inactive').length,
        archived: results.filter(l => l.status === 'archived').length,
        converted: results.filter(l => l.status === 'converted').length
      },
      byIndustry: {},
      averageScore: 0,
      topLeads: []
    };

    // Calculate industry breakdown
    results.forEach(l => {
      stats.byIndustry[l.industry] = (stats.byIndustry[l.industry] || 0) + 1;
    });

    // Calculate average score
    if (results.length > 0) {
      const totalScore = results.reduce((sum, l) => sum + (l.score || 0), 0);
      stats.averageScore = Math.round(totalScore / results.length);
    }

    // Get top 5 leads by score
    stats.topLeads = [...results]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        name: l.name,
        company: l.company,
        score: l.score,
        type: l.type
      }));

    logger.info('Lead stats retrieved', {
      userId: req.user?.id,
      requestId: req.id
    });

    res.json({
      success: true,
      twin: { statistics: stats },
      data: { statistics: stats }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /leads/search - Search leads
 */
router.get('/search', (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query must be at least 2 characters'
        }
      });
    }

    const searchQuery = sanitizeSearchInput(q).toLowerCase();
    let results = Array.from(leads.values());

    // Apply business scope
    results = filterByBusinessScope(results, req.user);

    // Search across multiple fields
    results = results.filter(l =>
      l.name?.toLowerCase().includes(searchQuery) ||
      l.company?.toLowerCase().includes(searchQuery) ||
      l.email?.toLowerCase().includes(searchQuery) ||
      l.notes?.toLowerCase().includes(searchQuery) ||
      l.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
    );

    logger.info('Lead search performed', {
      userId: req.user?.id,
      query: q,
      resultsCount: results.length,
      requestId: req.id
    });

    res.json({
      success: true,
      twin: { leads: results },
      data: { leads: results },
      total: results.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
