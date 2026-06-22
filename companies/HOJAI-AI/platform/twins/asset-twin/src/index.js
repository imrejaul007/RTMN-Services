/**
 * RTMN Asset Twin Service v2.0.0
 * Digital twin for business assets with CRUD operations
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

// TwinOS Shared imports
import {
  requireAuth,
  optionalAuth,
  requireBusiness,
  preventPrototypePollution,
  sanitizeObject,
  sanitizeSearchInput,
  defaultLimiter,
  strictLimiter,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  requestId,
  requestLogger,
  logger,
  Errors,
  PAGINATION,
  platform,
  publishAsync,
  installPhase5
} from '@rtmn/twinos-shared';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4890;

// ============ PERSISTENT DATA STORES ============
// File-backed JSON stores that survive restarts. Sync reads, async writes.

const STORE_OPTS = { serviceName: 'asset-twin' };
const assets = new PersistentStore('assets', STORE_OPTS);
const categories = new PersistentStore('categories', STORE_OPTS);
const maintenance = new PersistentStore('maintenance', STORE_OPTS);

// ============ SAMPLE DATA ============

const sampleAssets = [
  {
    id: 'asset-1',
    name: 'Office Building A',
    type: 'property',
    category: 'real_estate',
    value: 5000000,
    status: 'active',
    location: { address: '123 Main St', city: 'San Francisco' },
    owner: 'org-1',
    depreciation: 2.5,
    createdAt: new Date('2024-01-15').toISOString()
  },
  {
    id: 'asset-2',
    name: 'Dell Server Cluster',
    type: 'equipment',
    category: 'it',
    value: 250000,
    status: 'active',
    location: { address: 'Data Center 1' },
    owner: 'org-1',
    depreciation: 20,
    nextMaintenance: '2025-07-01',
    createdAt: new Date('2024-02-20').toISOString()
  },
  {
    id: 'asset-3',
    name: 'Fleet Vehicle #15',
    type: 'vehicle',
    category: 'transport',
    value: 45000,
    status: 'active',
    location: { address: 'Warehouse' },
    owner: 'org-1',
    depreciation: 15,
    mileage: 45000,
    createdAt: new Date('2024-03-10').toISOString()
  },
  {
    id: 'asset-4',
    name: 'Customer Database',
    type: 'digital',
    category: 'software',
    value: 100000,
    status: 'active',
    owner: 'org-1',
    depreciation: 0,
    licenseKey: 'XXXX-XXXX-XXXX',
    createdAt: new Date('2024-04-05').toISOString()
  }
];

const sampleCategories = [
  { id: 'cat-1', name: 'Real Estate', types: ['property', 'land'] },
  { id: 'cat-2', name: 'IT Equipment', types: ['servers', 'computers', 'network'] },
  { id: 'cat-3', name: 'Vehicles', types: ['cars', 'trucks', 'vans'] },
  { id: 'cat-4', name: 'Digital Assets', types: ['software', 'domains', 'patents'] }
];

// Initialize sample data
sampleAssets.forEach(a => assets.set(a.id, a));
sampleCategories.forEach(c => categories.set(c.id, c));

// ============ ALLOWED FIELDS FOR UPDATES ============

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'type',
  'category',
  'value',
  'status',
  'location',
  'depreciation',
  'nextMaintenance',
  'mileage',
  'licenseKey',
  'description',
  'notes'
];

const ALLOWED_CREATE_FIELDS = [
  'name',
  'type',
  'category',
  'value',
  'location',
  'owner',
  'depreciation',
  'nextMaintenance',
  'mileage',
  'licenseKey',
  'description',
  'notes'
];

// ============ VALIDATION HELPERS ============

function validateNumericInput(value, fieldName, min = 0, max = Infinity) {
  if (value !== undefined && value !== null) {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      throw Errors.VALIDATION(`${fieldName} must be a number between ${min} and ${max}`);
    }
    return num;
  }
  return value;
}

function validateAssetType(type) {
  const validTypes = ['property', 'equipment', 'vehicle', 'digital', 'land', 'furniture', 'machinery'];
  if (type && !validTypes.includes(type)) {
    throw Errors.VALIDATION(`Invalid asset type. Must be one of: ${validTypes.join(', ')}`);
  }
  return type;
}

function validateAssetStatus(status) {
  const validStatuses = ['active', 'inactive', 'maintenance', 'disposed', 'archived'];
  if (status && !validStatuses.includes(status)) {
    throw Errors.VALIDATION(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
  return status;
}

// ============ CALCULATIONS ============

function calculateCurrentValue(asset) {
  const originalValue = Number(asset.value) || 0;
  const depreciationRate = Number(asset.depreciation) || 0;
  const age = asset.createdAt
    ? Math.max(0, (Date.now() - new Date(asset.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;

  const totalDepreciation = depreciationRate * age;
  const currentValue = originalValue * (1 - totalDepreciation / 100);

  return {
    originalValue,
    currentValue: Math.max(0, Math.round(currentValue * 100) / 100),
    totalDepreciation: Math.round(totalDepreciation * 100) / 100,
    depreciationRate
  };
}

// ============ MIDDLEWARE ============

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request tracking and logging
app.use(requestId);
app.use(requestLogger);

// Morgan logging format
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting
app.use(defaultLimiter);

// ============ HEALTH ENDPOINTS ============

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'asset-twin',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    assets: assets.size,
    categories: categories.size
  });
});

app.get('/ready', (req, res) => {
  const checks = {
    assets: assets.size >= 0,
    categories: categories.size >= 0
  };

  const isReady = Object.values(checks).every(Boolean);

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? 'ready' : 'not_ready',
    service: 'asset-twin',
    checks
  });
});

// ============ ASSETS CRUD ============

// List all assets with pagination and filtering
app.get('/api/assets',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      type,
      category,
      status,
      search,
      owner,
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT
    } = req.query;

    let result = Array.from(assets.values());

    // Filter by type
    if (type) {
      result = result.filter(a => a.type === type);
    }

    // Filter by category
    if (category) {
      result = result.filter(a => a.category === category);
    }

    // Filter by status
    if (status) {
      result = result.filter(a => a.status === status);
    }

    // Filter by owner
    if (owner) {
      result = result.filter(a => a.owner === owner);
    }

    // Search by name
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      result = result.filter(a =>
        a.name.toLowerCase().includes(sanitizedSearch.toLowerCase())
      );
    }

    // Business scope filtering
    if (req.user && req.user.businessId) {
      result = result.filter(a => a.owner === req.user.businessId);
    }

    // Sort by creation date (newest first)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || PAGINATION.DEFAULT_PAGE);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || PAGINATION.DEFAULT_LIMIT), PAGINATION.MAX_LIMIT);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResult = result.slice(startIndex, endIndex);

    res.json({
      success: true,
      twin: {
        assets: paginatedResult,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.length,
          totalPages: Math.ceil(result.length / limitNum),
          hasNext: endIndex < result.length,
          hasPrev: pageNum > 1
        }
      }
    });
  })
);

// Get single asset
app.get('/api/assets/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const asset = assets.get(req.params.id);

    if (!asset) {
      throw Errors.NOT_FOUND(`Asset ${req.params.id} not found`);
    }

    // Business scope validation
    if (req.user?.businessId && asset.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this asset');
    }

    const currentValue = calculateCurrentValue(asset);

    res.json({
      success: true,
      twin: {
        ...asset,
        currentValue
      }
    });
  })
);

// Create asset
app.post('/api/assets',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    const {
      name,
      type,
      category,
      value,
      location,
      depreciation,
      nextMaintenance,
      mileage,
      licenseKey,
      description,
      notes
    } = sanitizedBody;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw Errors.VALIDATION('Asset name is required');
    }

    // Validate numeric inputs
    const validatedValue = value !== undefined ? validateNumericInput(value, 'value', 0) : 0;
    const validatedDepreciation = depreciation !== undefined
      ? validateNumericInput(depreciation, 'depreciation', 0, 100)
      : 0;
    const validatedMileage = mileage !== undefined
      ? validateNumericInput(mileage, 'mileage', 0)
      : undefined;

    // Validate type
    const validatedType = validateAssetType(type || 'equipment');

    // Create asset
    const asset = {
      id: `asset-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      type: validatedType,
      category: category || 'general',
      value: validatedValue,
      status: 'active',
      location: typeof location === 'object' ? preventPrototypePollution(location) : {},
      owner: req.user.businessId,
      depreciation: validatedDepreciation,
      nextMaintenance,
      mileage: validatedMileage,
      licenseKey,
      description: description?.trim(),
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await assets.set(asset.id, asset);

    // Platform integration: bind to memory, record event, audit, publish
    platform.bridge.autoBind(asset.id, 'episodic');
    platform.memory.recordEvent('asset.created', { assetId: asset.id, name: asset.name, category: asset.category }, asset.id);
    platform.policy.audit('create', 'asset', { assetId: asset.id, name: asset.name });
    publishAsync('asset.asset.created', { id: asset.id, name: asset.name, category: asset.category });

    logger.info('Asset created', {
      requestId: req.id,
      assetId: asset.id,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.status(201).json({
      success: true,
      twin: asset
    });
  })
);

// Update asset
app.put('/api/assets/:id',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const asset = assets.get(req.params.id);

    if (!asset) {
      throw Errors.NOT_FOUND(`Asset ${req.params.id} not found`);
    }

    // Business scope validation
    if (asset.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this asset');
    }

    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    // Whitelist allowed fields to prevent mass assignment
    const updates = sanitizeObject(sanitizedBody, ALLOWED_UPDATE_FIELDS);

    // Validate numeric inputs if present
    if (updates.value !== undefined) {
      updates.value = validateNumericInput(updates.value, 'value', 0);
    }
    if (updates.depreciation !== undefined) {
      updates.depreciation = validateNumericInput(updates.depreciation, 'depreciation', 0, 100);
    }
    if (updates.mileage !== undefined) {
      updates.mileage = validateNumericInput(updates.mileage, 'mileage', 0);
    }

    // Validate type and status
    if (updates.type) {
      updates.type = validateAssetType(updates.type);
    }
    if (updates.status) {
      updates.status = validateAssetStatus(updates.status);
    }

    // Validate location object
    if (updates.location && typeof updates.location === 'object') {
      updates.location = preventPrototypePollution(updates.location);
    }

    // Apply updates
    Object.assign(asset, updates, {
      updatedAt: new Date().toISOString()
    });

    // Persist the mutated record (silent-mutation fix: Object.assign above
    // mutates the in-memory object but PersistentStore requires explicit set
    // to write through to disk).
    await assets.set(asset.id, asset);

    // Platform integration: record update event and publish
    platform.memory.recordEvent('asset.updated', { assetId: asset.id, fields: Object.keys(updates) }, asset.id);
    platform.policy.audit('update', 'asset', { assetId: asset.id, fields: Object.keys(updates) });
    publishAsync('asset.asset.updated', { id: asset.id, fields: Object.keys(updates) });

    logger.info('Asset updated', {
      requestId: req.id,
      assetId: asset.id,
      updatedFields: Object.keys(updates),
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.json({
      success: true,
      twin: asset
    });
  })
);

// Delete asset
app.delete('/api/assets/:id',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const asset = assets.get(req.params.id);

    if (!asset) {
      throw Errors.NOT_FOUND(`Asset ${req.params.id} not found`);
    }

    // Business scope validation
    if (asset.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this asset');
    }

    await assets.delete(req.params.id);

    // Platform integration: record delete event and publish
    platform.memory.recordEvent('asset.deleted', { assetId: req.params.id }, req.params.id);
    platform.policy.audit('delete', 'asset', { assetId: req.params.id });
    publishAsync('asset.asset.deleted', { id: req.params.id });

    logger.info('Asset deleted', {
      requestId: req.id,
      assetId: req.params.id,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.json({
      success: true,
      twin: { id: req.params.id, deleted: true }
    });
  })
);

// ============ ASSET VALUE ENDPOINT ============

app.get('/api/assets/:id/value',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const asset = assets.get(req.params.id);

    if (!asset) {
      throw Errors.NOT_FOUND(`Asset ${req.params.id} not found`);
    }

    // Business scope validation
    if (req.user?.businessId && asset.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this asset');
    }

    const valueData = calculateCurrentValue(asset);

    res.json({
      success: true,
      twin: {
        assetId: asset.id,
        assetName: asset.name,
        ...valueData,
        lastUpdated: asset.updatedAt || asset.createdAt
      }
    });
  })
);

// ============ CATEGORIES ENDPOINTS ============

// List categories
app.get('/api/categories',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { type } = req.query;

    let result = Array.from(categories.values());

    if (type) {
      result = result.filter(c => c.types.includes(type));
    }

    res.json({
      success: true,
      twin: {
        categories: result,
        total: result.length
      }
    });
  })
);

// Create category
app.post('/api/categories',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const sanitizedBody = preventPrototypePollution(req.body);

    const { name, types } = sanitizedBody;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw Errors.VALIDATION('Category name is required');
    }

    if (types && !Array.isArray(types)) {
      throw Errors.VALIDATION('Types must be an array');
    }

    const category = {
      id: `cat-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      types: types || [],
      owner: req.user.businessId,
      createdAt: new Date().toISOString()
    };

    await categories.set(category.id, category);

    // Platform integration: publish event
    publishAsync('asset.category.created', { id: category.id, name: category.name });

    res.status(201).json({
      success: true,
      twin: category
    });
  })
);

// ============ MAINTENANCE ENDPOINTS ============

// Schedule maintenance for asset
app.post('/api/assets/:id/maintenance',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const asset = assets.get(req.params.id);

    if (!asset) {
      throw Errors.NOT_FOUND(`Asset ${req.params.id} not found`);
    }

    if (asset.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this asset');
    }

    const sanitizedBody = preventPrototypePollution(req.body);
    const { scheduledDate, description, cost } = sanitizedBody;

    if (!scheduledDate) {
      throw Errors.VALIDATION('Scheduled date is required');
    }

    const maintenanceRecord = {
      id: `maint-${uuidv4().slice(0, 8)}`,
      assetId: asset.id,
      scheduledDate,
      description: description?.trim(),
      cost: cost !== undefined ? validateNumericInput(cost, 'cost', 0) : 0,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    await maintenance.set(maintenanceRecord.id, maintenanceRecord);

    // Update asset with next maintenance date
    asset.nextMaintenance = scheduledDate;
    asset.updatedAt = new Date().toISOString();

    // Platform integration: publish maintenance event
    publishAsync('asset.maintenance.scheduled', { id: maintenanceRecord.id, assetId: asset.id, type: maintenanceRecord.type });

    // Persist the mutated asset record (silent-mutation fix).
    await assets.set(asset.id, asset);

    res.status(201).json({
      success: true,
      twin: maintenanceRecord
    });
  })
);

// Get maintenance history for asset
app.get('/api/assets/:id/maintenance',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const asset = assets.get(req.params.id);

    if (!asset) {
      throw Errors.NOT_FOUND(`Asset ${req.params.id} not found`);
    }

    if (req.user?.businessId && asset.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this asset');
    }

    const records = Array.from(maintenance.values())
      .filter(m => m.assetId === req.params.id)
      .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

    res.json({
      success: true,
      twin: {
        assetId: req.params.id,
        maintenance: records,
        total: records.length
      }
    });
  })
);

// ============ STATISTICS ENDPOINT ============

app.get('/api/statistics',
  optionalAuth,
  asyncHandler(async (req, res) => {
    let all = Array.from(assets.values());

    // Business scope filtering
    if (req.user?.businessId) {
      all = all.filter(a => a.owner === req.user.businessId);
    }

    // Calculate statistics
    const totalAssets = all.length;
    const totalValue = all.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const activeAssets = all.filter(a => a.status === 'active').length;
    const maintenanceAssets = all.filter(a => a.status === 'maintenance').length;

    // By type
    const byType = {};
    all.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1;
    });

    // By category
    const byCategory = {};
    all.forEach(a => {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    });

    // By status
    const byStatus = {};
    all.forEach(a => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });

    // Total depreciation
    const totalDepreciation = all.reduce((sum, a) => {
      const valueData = calculateCurrentValue(a);
      return sum + (valueData.originalValue - valueData.currentValue);
    }, 0);

    // Value by type
    const valueByType = {};
    all.forEach(a => {
      if (!valueByType[a.type]) {
        valueByType[a.type] = 0;
      }
      valueByType[a.type] += Number(a.value) || 0;
    });

    res.json({
      success: true,
      twin: {
        totalAssets,
        totalValue: Math.round(totalValue * 100) / 100,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        netValue: Math.round((totalValue - totalDepreciation) * 100) / 100,
        activeAssets,
        maintenanceAssets,
        byType,
        byCategory,
        byStatus,
        valueByType
      }
    });
  })
);

// ============ SEARCH ENDPOINT ============

app.get('/api/search',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q, type, category } = req.query;

    if (!q) {
      throw Errors.VALIDATION('Search query is required');
    }

    const sanitizedQuery = sanitizeSearchInput(q);
    let results = Array.from(assets.values());

    // Apply filters
    if (type) {
      results = results.filter(a => a.type === type);
    }
    if (category) {
      results = results.filter(a => a.category === category);
    }

    // Search in name and description
    results = results.filter(a =>
      a.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(sanitizedQuery.toLowerCase())) ||
      (a.notes && a.notes.toLowerCase().includes(sanitizedQuery.toLowerCase()))
    );

    // Business scope filtering
    if (req.user?.businessId) {
      results = results.filter(a => a.owner === req.user.businessId);
    }

    res.json({
      success: true,
      twin: {
        query: sanitizedQuery,
        results,
        total: results.length
      }
    });
  })
);

// ============ ERROR HANDLERS ============

// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'asset',
  store: typeof assets !== 'undefined' ? assets : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: assets.size }),
})

app.use(notFoundHandler);
app.use(errorHandler);

// ============ SERVER START ============


;
const server = app.listen(PORT, () => {
  logger.info(`Asset Twin service started on port ${PORT}`, {
    version: '2.0.0',
    port: PORT,
    assets: assets.size,
    categories: categories.size
  });
  console.log(`Asset Twin v2.0.0 running on port ${PORT}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
