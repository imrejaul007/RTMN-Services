/**
 * RTMN Organization Twin Service v2.0.0
 * Digital twin for companies and organizations
 * ES Module with JWT authentication and security hardening
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

// RTMN TwinOS Shared imports - individual imports to avoid circular deps
import { requireAuth, optionalAuth } from '@rtmn/twinos-shared/src/middleware/auth.js';
import { preventPrototypePollution, sanitizeObject } from '@rtmn/twinos-shared/src/middleware/validation.js';
import { defaultLimiter, strictLimiter } from '@rtmn/twinos-shared/src/middleware/rateLimit.js';
import { notFoundHandler, errorHandler, asyncHandler, requestId, requestLogger, logger } from '@rtmn/twinos-shared/src/middleware/errors.js';

const app = express();
const PORT = process.env.PORT || 4710;

// ==================== MIDDLEWARE ====================

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(requestId);
app.use(requestLogger);
app.use(express.json({ limit: '10kb' }));

// Logging (morgan format)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Rate limiting - global default limiter
app.use(defaultLimiter);

// ==================== IN-MEMORY STORAGE ====================

const organizations = new Map();
const departments = new Map();
const locations = new Map();
const relationships = new Map();
const syncEvents = new Map();

// ==================== SAMPLE DATA ====================

const sampleOrgs = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    legalName: 'Acme Corporation Inc.',
    type: 'enterprise',
    industry: 'Technology',
    size: 'enterprise',
    website: 'https://acme.example.com',
    founded: '2010-01-15',
    headquarters: { city: 'San Francisco', state: 'CA', country: 'USA' },
    taxId: 'XX-XXXXXXX',
    status: 'active',
    branding: { primaryColor: '#0066CC', logo: 'acme-logo.png' },
    social: { linkedin: 'acme-corp', twitter: '@acmecorp' },
    health: {
      overall: 85,
      financial: 90,
      operational: 80,
      customer: 85,
      employee: 88
    },
    kpis: {
      revenue: 50000000,
      employees: 500,
      customers: 1000,
      growth: 25
    },
    metadata: {},
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-06-15').toISOString()
  },
  {
    id: 'org-2',
    name: 'Global Tech Solutions',
    legalName: 'Global Tech Solutions LLC',
    type: 'enterprise',
    industry: 'IT Services',
    size: 'large',
    website: 'https://globaltech.example.com',
    founded: '2015-03-20',
    headquarters: { city: 'New York', state: 'NY', country: 'USA' },
    taxId: 'XX-YYYYYYY',
    status: 'active',
    branding: { primaryColor: '#FF6600', logo: 'gt-logo.png' },
    social: { linkedin: 'globaltech', twitter: '@globaltech' },
    health: {
      overall: 78,
      financial: 82,
      operational: 75,
      customer: 80,
      employee: 76
    },
    kpis: {
      revenue: 25000000,
      employees: 250,
      customers: 500,
      growth: 18
    },
    metadata: {},
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString()
  }
];

sampleOrgs.forEach(o => organizations.set(o.id, o));

const sampleDepts = [
  { id: 'dept-1', orgId: 'org-1', name: 'Engineering', headcount: 150, budget: 5000000, status: 'active', createdAt: new Date('2025-01-01').toISOString() },
  { id: 'dept-2', orgId: 'org-1', name: 'Sales', headcount: 80, budget: 3000000, status: 'active', createdAt: new Date('2025-01-01').toISOString() },
  { id: 'dept-3', orgId: 'org-1', name: 'Marketing', headcount: 40, budget: 2000000, status: 'active', createdAt: new Date('2025-01-01').toISOString() },
  { id: 'dept-4', orgId: 'org-1', name: 'HR', headcount: 15, budget: 500000, status: 'active', createdAt: new Date('2025-01-01').toISOString() }
];

sampleDepts.forEach(d => departments.set(d.id, d));

// ==================== VALIDATION HELPERS ====================

const VALID_ORG_TYPES = ['startup', 'small', 'medium', 'large', 'enterprise', 'government', 'nonprofit'];
const VALID_ORG_SIZES = ['micro', 'small', 'medium', 'large', 'enterprise'];
const VALID_ORG_STATUSES = ['active', 'inactive', 'pending', 'archived'];
const VALID_INDUSTRIES = ['Technology', 'IT Services', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Media', 'Hospitality', 'Legal', 'Real Estate', 'Automotive', 'Aerospace', 'Energy', 'Telecommunications', 'Agriculture', 'Construction', 'Transportation', 'Consulting', 'General'];

const VALID_HEALTH_METRICS = ['overall', 'financial', 'operational', 'customer', 'employee'];
const VALID_RELATIONSHIP_TYPES = ['partner', 'supplier', 'customer', 'subsidiary', 'parent', 'competitor', 'affiliate'];

/**
 * Validate health metric value (0-100 range)
 */
function validateHealthMetric(value, name) {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 100) {
    throw new Error(`${name} must be a number between 0 and 100`);
  }
  return num;
}

/**
 * Validate business scope string
 */
function validateBusinessScope(scope) {
  if (scope && typeof scope !== 'string') {
    throw new Error('Business scope must be a string');
  }
  return scope?.slice(0, 500) || '';
}

// ==================== HEALTH ENDPOINTS ====================

/**
 * @route GET /health
 * @desc Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'organization-twin',
    version: '2.0.0',
    port: PORT,
    counts: {
      organizations: organizations.size,
      departments: departments.size,
      relationships: relationships.size
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /ready
 * @desc Readiness check endpoint
 */
app.get('/ready', (req, res) => {
  const isReady = organizations.size > 0;
  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? 'ready' : 'initializing',
    service: 'organization-twin',
    timestamp: new Date().toISOString()
  });
});

// ==================== ORGANIZATIONS API ====================

/**
 * @route GET /api/organizations
 * @desc List all organizations with pagination and filters
 * @access Public (optional auth for future use)
 */
app.get('/api/organizations', optionalAuth, (req, res) => {
  const { industry, size, status, search, page = 1, limit = 20 } = req.query;

  let result = Array.from(organizations.values());

  // Filters
  if (industry) result = result.filter(o => o.industry === industry);
  if (size) result = result.filter(o => o.size === size);
  if (status) result = result.filter(o => o.status === status);
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(o =>
      o.name.toLowerCase().includes(searchLower) ||
      (o.legalName && o.legalName.toLowerCase().includes(searchLower))
    );
  }

  // Pagination
  const total = result.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedResult = result.slice(startIndex, startIndex + limitNum);

  res.json({
    success: true,
    organizations: paginatedResult,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * @route GET /api/organizations/:id
 * @desc Get single organization by ID
 * @access Public
 */
app.get('/api/organizations/:id', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  res.json({ success: true, twin: org });
});

/**
 * @route POST /api/organizations
 * @desc Create new organization
 * @access Private (requires auth)
 */
app.post('/api/organizations', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  // Sanitize input to prevent prototype pollution
  const sanitizedBody = preventPrototypePollution(req.body);

  const {
    name,
    legalName,
    type,
    industry,
    size,
    website,
    headquarters,
    founded,
    taxId,
    branding,
    social,
    scope
  } = sanitizedBody;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Organization name is required' }
    });
  }

  if (name.length > 200) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Organization name must be 200 characters or less' }
    });
  }

  // Validate enums
  if (type && !VALID_ORG_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid organization type. Must be one of: ${VALID_ORG_TYPES.join(', ')}` }
    });
  }

  if (size && !VALID_ORG_SIZES.includes(size)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid organization size. Must be one of: ${VALID_ORG_SIZES.join(', ')}` }
    });
  }

  if (industry && !VALID_INDUSTRIES.includes(industry)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}` }
    });
  }

  const now = new Date().toISOString();
  const org = {
    id: `org-${uuidv4().slice(0, 8)}`,
    name: name.trim(),
    legalName: legalName?.trim() || name.trim(),
    type: type || 'business',
    industry: industry || 'General',
    size: size || 'medium',
    website: website || '',
    founded: founded || null,
    headquarters: typeof headquarters === 'object' ? headquarters : {},
    taxId: taxId || '',
    status: 'active',
    branding: typeof branding === 'object' ? preventPrototypePollution(branding) : { primaryColor: '#333333', logo: '' },
    social: typeof social === 'object' ? preventPrototypePollution(social) : {},
    scope: validateBusinessScope(scope),
    health: { overall: 100, financial: 100, operational: 100, customer: 100, employee: 100 },
    kpis: { revenue: 0, employees: 0, customers: 0, growth: 0 },
    metadata: {},
    createdAt: now,
    updatedAt: now
  };

  organizations.set(org.id, org);

  logger.info('Organization created', { orgId: org.id, createdBy: req.user?.id });

  res.status(201).json({ success: true, twin: org });
}));

/**
 * @route PUT /api/organizations/:id
 * @desc Update organization (whitelist fields to prevent mass assignment)
 * @access Private
 */
app.put('/api/organizations/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  // Sanitize and whitelist allowed fields (prevent mass assignment)
  const sanitizedBody = preventPrototypePollution(req.body);
  const allowedFields = ['name', 'legalName', 'type', 'industry', 'size', 'website', 'headquarters', 'branding', 'social', 'status', 'founded', 'taxId'];
  const updates = sanitizeObject(sanitizedBody, allowedFields);

  // Validate enum fields if present
  if (updates.type && !VALID_ORG_TYPES.includes(updates.type)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid organization type. Must be one of: ${VALID_ORG_TYPES.join(', ')}` }
    });
  }

  if (updates.size && !VALID_ORG_SIZES.includes(updates.size)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid organization size. Must be one of: ${VALID_ORG_SIZES.join(', ')}` }
    });
  }

  if (updates.status && !VALID_ORG_STATUSES.includes(updates.status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid status. Must be one of: ${VALID_ORG_STATUSES.join(', ')}` }
    });
  }

  if (updates.industry && !VALID_INDUSTRIES.includes(updates.industry)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}` }
    });
  }

  // Apply updates
  for (const [field, value] of Object.entries(updates)) {
    if (field === 'branding' || field === 'social' || field === 'headquarters') {
      org[field] = preventPrototypePollution(value);
    } else if (field === 'name' && typeof value === 'string') {
      org[field] = value.trim().slice(0, 200);
    } else {
      org[field] = value;
    }
  }

  org.updatedAt = new Date().toISOString();

  logger.info('Organization updated', { orgId: org.id, updatedBy: req.user?.id, fields: Object.keys(updates) });

  res.json({ success: true, twin: org });
}));

/**
 * @route DELETE /api/organizations/:id
 * @desc Delete organization
 * @access Private (admin only in production)
 */
app.delete('/api/organizations/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  if (!organizations.has(req.params.id)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  const orgId = req.params.id;
  organizations.delete(orgId);

  // Clean up related data
  for (const [deptId, dept] of departments.entries()) {
    if (dept.orgId === orgId) departments.delete(deptId);
  }
  for (const [relId, rel] of relationships.entries()) {
    if (rel.fromOrgId === orgId || rel.toOrgId === orgId) relationships.delete(relId);
  }

  logger.info('Organization deleted', { orgId, deletedBy: req.user?.id });

  res.json({ success: true, message: 'Organization deleted successfully' });
}));

// ==================== DEPARTMENTS API ====================

/**
 * @route GET /api/organizations/:id/departments
 * @desc Get organization departments with pagination
 * @access Public
 */
app.get('/api/organizations/:id/departments', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  const { page = 1, limit = 20 } = req.query;
  let result = Array.from(departments.values()).filter(d => d.orgId === req.params.id);

  const total = result.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedResult = result.slice(startIndex, startIndex + limitNum);

  res.json({
    success: true,
    departments: paginatedResult,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  });
});

/**
 * @route POST /api/organizations/:id/departments
 * @desc Create department for organization
 * @access Private
 */
app.post('/api/organizations/:id/departments', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  const sanitizedBody = preventPrototypePollution(req.body);
  const { name, headcount, budget } = sanitizedBody;

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Department name is required' }
    });
  }

  const dept = {
    id: `dept-${uuidv4().slice(0, 8)}`,
    orgId: req.params.id,
    name: name.trim().slice(0, 100),
    headcount: Math.max(0, parseInt(headcount, 10) || 0),
    budget: Math.max(0, parseFloat(budget) || 0),
    status: 'active',
    createdAt: new Date().toISOString()
  };

  departments.set(dept.id, dept);

  logger.info('Department created', { deptId: dept.id, orgId: org.id });

  res.status(201).json({ success: true, department: dept });
}));

/**
 * @route PUT /api/departments/:id
 * @desc Update department
 * @access Private
 */
app.put('/api/departments/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const dept = departments.get(req.params.id);

  if (!dept) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Department not found' }
    });
  }

  const sanitizedBody = preventPrototypePollution(req.body);
  const allowedFields = ['name', 'headcount', 'budget', 'status'];
  const updates = sanitizeObject(sanitizedBody, allowedFields);

  for (const [field, value] of Object.entries(updates)) {
    if (field === 'name' && typeof value === 'string') {
      dept[field] = value.trim().slice(0, 100);
    } else if (field === 'headcount') {
      dept[field] = Math.max(0, parseInt(value, 10) || 0);
    } else if (field === 'budget') {
      dept[field] = Math.max(0, parseFloat(value) || 0);
    } else {
      dept[field] = value;
    }
  }

  res.json({ success: true, department: dept });
}));

/**
 * @route DELETE /api/departments/:id
 * @desc Delete department
 * @access Private
 */
app.delete('/api/departments/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  if (!departments.has(req.params.id)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Department not found' }
    });
  }

  departments.delete(req.params.id);
  res.json({ success: true, message: 'Department deleted successfully' });
}));

// ==================== HEALTH API ====================

/**
 * @route GET /api/organizations/:id/health
 * @desc Get organization health metrics
 * @access Public
 */
app.get('/api/organizations/:id/health', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  res.json({
    success: true,
    twin: {
      organizationId: org.id,
      overall: org.health.overall,
      dimensions: {
        financial: org.health.financial,
        operational: org.health.operational,
        customer: org.health.customer,
        employee: org.health.employee
      },
      updatedAt: org.updatedAt
    }
  });
});

/**
 * @route PUT /api/organizations/:id/health
 * @desc Update health metrics (validated 0-100 range)
 * @access Private
 */
app.put('/api/organizations/:id/health', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  const sanitizedBody = preventPrototypePollution(req.body);

  try {
    if (sanitizedBody.overall !== undefined) {
      org.health.overall = validateHealthMetric(sanitizedBody.overall, 'overall');
    }
    if (sanitizedBody.financial !== undefined) {
      org.health.financial = validateHealthMetric(sanitizedBody.financial, 'financial');
    }
    if (sanitizedBody.operational !== undefined) {
      org.health.operational = validateHealthMetric(sanitizedBody.operational, 'operational');
    }
    if (sanitizedBody.customer !== undefined) {
      org.health.customer = validateHealthMetric(sanitizedBody.customer, 'customer');
    }
    if (sanitizedBody.employee !== undefined) {
      org.health.employee = validateHealthMetric(sanitizedBody.employee, 'employee');
    }
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message }
    });
  }

  org.updatedAt = new Date().toISOString();

  logger.info('Health metrics updated', { orgId: org.id, metrics: sanitizedBody });

  res.json({ success: true, twin: org.health });
}));

// ==================== KPIs API ====================

/**
 * @route GET /api/organizations/:id/kpis
 * @desc Get organization KPIs
 * @access Public
 */
app.get('/api/organizations/:id/kpis', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  res.json({
    success: true,
    twin: {
      organizationId: org.id,
      kpis: org.kpis,
      updatedAt: org.updatedAt
    }
  });
});

/**
 * @route PUT /api/organizations/:id/kpis
 * @desc Update KPIs
 * @access Private
 */
app.put('/api/organizations/:id/kpis', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  const sanitizedBody = preventPrototypePollution(req.body);
  const { revenue, employees, customers, growth } = sanitizedBody;

  if (revenue !== undefined) {
    org.kpis.revenue = Math.max(0, parseFloat(revenue) || 0);
  }
  if (employees !== undefined) {
    org.kpis.employees = Math.max(0, parseInt(employees, 10) || 0);
  }
  if (customers !== undefined) {
    org.kpis.customers = Math.max(0, parseInt(customers, 10) || 0);
  }
  if (growth !== undefined) {
    org.kpis.growth = Math.max(-100, Math.min(100, parseFloat(growth) || 0));
  }

  org.updatedAt = new Date().toISOString();

  res.json({ success: true, twin: org.kpis });
}));

// ==================== RELATIONSHIPS API ====================

/**
 * @route GET /api/organizations/:id/relationships
 * @desc Get organization relationships
 * @access Public
 */
app.get('/api/organizations/:id/relationships', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  const orgRelationships = Array.from(relationships.values())
    .filter(r => r.fromOrgId === req.params.id || r.toOrgId === req.params.id);

  res.json({
    success: true,
    relationships: orgRelationships,
    total: orgRelationships.length
  });
});

/**
 * @route POST /api/organizations/:id/relationships
 * @desc Create relationship between organizations
 * @access Private
 */
app.post('/api/organizations/:id/relationships', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const sanitizedBody = preventPrototypePollution(req.body);
  const { toOrgId, type, description } = sanitizedBody;

  if (!toOrgId || !type) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Target organization and relationship type required' }
    });
  }

  if (!VALID_RELATIONSHIP_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid relationship type. Must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}` }
    });
  }

  if (toOrgId === req.params.id) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Cannot create relationship with self' }
    });
  }

  const targetOrg = organizations.get(toOrgId);
  if (!targetOrg) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Target organization not found' }
    });
  }

  const relationship = {
    id: `rel-${uuidv4().slice(0, 8)}`,
    fromOrgId: req.params.id,
    toOrgId,
    type,
    description: description?.trim().slice(0, 500) || '',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  relationships.set(relationship.id, relationship);

  logger.info('Relationship created', { relId: relationship.id, from: req.params.id, to: toOrgId });

  res.status(201).json({ success: true, relationship });
}));

/**
 * @route DELETE /api/relationships/:id
 * @desc Delete relationship
 * @access Private
 */
app.delete('/api/relationships/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  if (!relationships.has(req.params.id)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Relationship not found' }
    });
  }

  relationships.delete(req.params.id);
  res.json({ success: true, message: 'Relationship deleted successfully' });
}));

// ==================== SYNC EVENTS API ====================

/**
 * @route GET /api/organizations/:id/sync
 * @desc Get sync history for organization
 * @access Public
 */
app.get('/api/organizations/:id/sync', (req, res) => {
  const { limit = 50 } = req.query;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const events = Array.from(syncEvents.values())
    .filter(e => e.entityType === 'organization' && e.entityId === req.params.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limitNum);

  res.json({
    success: true,
    events,
    count: events.length
  });
});

/**
 * @route POST /api/organizations/:id/sync
 * @desc Trigger sync event for organization
 * @access Private
 */
app.post('/api/organizations/:id/sync', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Organization not found' }
    });
  }

  const event = {
    id: `sync-${uuidv4().slice(0, 8)}`,
    entityType: 'organization',
    entityId: org.id,
    action: 'sync',
    status: 'completed',
    changes: {},
    timestamp: new Date().toISOString()
  };

  syncEvents.set(event.id, event);

  // Update organization timestamp
  org.updatedAt = new Date().toISOString();

  logger.info('Sync triggered', { orgId: org.id, syncId: event.id });

  res.json({ success: true, message: 'Sync completed', event });
}));

// ==================== COMPARISON API ====================

/**
 * @route POST /api/compare
 * @desc Compare multiple organizations
 * @access Public
 */
app.post('/api/compare', (req, res) => {
  const sanitizedBody = preventPrototypePollution(req.body);
  const { organizationIds } = sanitizedBody;

  if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length < 2) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'At least 2 organization IDs required' }
    });
  }

  if (organizationIds.length > 10) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Maximum 10 organizations can be compared at once' }
    });
  }

  const orgs = organizationIds
    .map(id => organizations.get(id))
    .filter(Boolean);

  if (orgs.length < 2) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Not enough valid organizations found' }
    });
  }

  const comparison = {
    organizations: orgs.map(o => ({
      id: o.id,
      name: o.name,
      industry: o.industry,
      size: o.size,
      status: o.status
    })),
    health: orgs.map(o => o.health),
    kpis: orgs.map(o => o.kpis),
    comparisonDate: new Date().toISOString()
  };

  res.json({ success: true, comparison });
});

// ==================== STATISTICS API ====================

/**
 * @route GET /api/statistics
 * @desc Get organization statistics
 * @access Public
 */
app.get('/api/statistics', (req, res) => {
  const allOrgs = Array.from(organizations.values());

  const stats = {
    total: allOrgs.length,
    byIndustry: {},
    bySize: {},
    byStatus: {},
    byType: {},
    avgHealth: {
      overall: 0,
      financial: 0,
      operational: 0,
      customer: 0,
      employee: 0
    },
    totalDepartments: departments.size,
    totalRelationships: relationships.size
  };

  if (allOrgs.length > 0) {
    allOrgs.forEach(org => {
      stats.byIndustry[org.industry] = (stats.byIndustry[org.industry] || 0) + 1;
      stats.bySize[org.size] = (stats.bySize[org.size] || 0) + 1;
      stats.byStatus[org.status] = (stats.byStatus[org.status] || 0) + 1;
      stats.byType[org.type] = (stats.byType[org.type] || 0) + 1;

      stats.avgHealth.overall += org.health.overall;
      stats.avgHealth.financial += org.health.financial;
      stats.avgHealth.operational += org.health.operational;
      stats.avgHealth.customer += org.health.customer;
      stats.avgHealth.employee += org.health.employee;
    });

    const count = allOrgs.length;
    stats.avgHealth.overall = Math.round(stats.avgHealth.overall / count);
    stats.avgHealth.financial = Math.round(stats.avgHealth.financial / count);
    stats.avgHealth.operational = Math.round(stats.avgHealth.operational / count);
    stats.avgHealth.customer = Math.round(stats.avgHealth.customer / count);
    stats.avgHealth.employee = Math.round(stats.avgHealth.employee / count);
  }

  res.json({ success: true, statistics: stats });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🏢 Organization Twin Service v2.0.0 running on port ${PORT}`);
  console.log(`   Organizations: ${organizations.size}`);
  console.log(`   Departments: ${departments.size}`);
  console.log(`   Relationships: ${relationships.size}`);
});

export default app;
