/**
 * RTMN Inventory Twin Service v1.0.0
 * Digital twin for inventory management with stock levels, warehouses, transfers, and adjustments
 *
 * Twin Types:
 * - Inventory: Stock levels
 * - Warehouse: Storage locations
 * - Transfer: Stock movements
 * - Adjustment: Inventory corrections
 * - Forecast: Demand prediction
 */

import express from 'express';
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
  PAGINATION
} from '@rtmn/twinos-shared';

const app = express();
const PORT = process.env.PORT || 4887;

// ============ IN-MEMORY DATA STORES ============

const inventory = new Map();        // Inventory items
const warehouses = new Map();       // Warehouse locations
const transfers = new Map();        // Stock transfers
const adjustments = new Map();      // Inventory adjustments
const suppliers = new Map();         // Supplier management
const lowStockAlerts = new Map();   // Low stock alerts

// Idempotency cache for write operations
const idempotencyCache = new Map();

// ============ CONSTANTS ============

const TWIN_TYPES = {
  INVENTORY: 'inventory',
  WAREHOUSE: 'warehouse',
  TRANSFER: 'transfer',
  ADJUSTMENT: 'adjustment',
  FORECAST: 'forecast'
};

const ADJUSTMENT_REASONS = [
  'damaged',
  'expired',
  'theft',
  'count_correction',
  'system_error',
  'returned',
  'seasonal',
  'other'
];

const TRANSFER_STATUS = [
  'pending',
  'in_transit',
  'completed',
  'cancelled'
];

const INVENTORY_STATUS = [
  'active',
  'low_stock',
  'out_of_stock',
  'discontinued',
  'archived'
];

// ============ SAMPLE DATA ============

const sampleWarehouses = [
  {
    id: 'wh-1',
    name: 'Main Distribution Center',
    code: 'MDC-01',
    type: 'distribution',
    address: {
      street: '123 Industrial Blvd',
      city: 'San Francisco',
      state: 'CA',
      zip: '94107',
      country: 'USA'
    },
    capacity: 50000,
    currentUtilization: 65,
    manager: 'John Smith',
    contact: { phone: '555-0100', email: 'mdc@company.com' },
    status: 'active',
    owner: 'org-1',
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'wh-2',
    name: 'East Coast Warehouse',
    code: 'ECW-01',
    type: 'storage',
    address: {
      street: '456 Commerce Dr',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA'
    },
    capacity: 30000,
    currentUtilization: 42,
    manager: 'Sarah Johnson',
    contact: { phone: '555-0200', email: 'ecw@company.com' },
    status: 'active',
    owner: 'org-1',
    createdAt: new Date('2024-02-15').toISOString()
  },
  {
    id: 'wh-3',
    name: 'West Coast Fulfillment',
    code: 'WCF-01',
    type: 'fulfillment',
    address: {
      street: '789 Logistics Way',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
      country: 'USA'
    },
    capacity: 25000,
    currentUtilization: 78,
    manager: 'Mike Chen',
    contact: { phone: '555-0300', email: 'wcf@company.com' },
    status: 'active',
    owner: 'org-1',
    createdAt: new Date('2024-03-01').toISOString()
  }
];

const sampleSuppliers = [
  {
    id: 'sup-1',
    name: 'Acme Manufacturing',
    code: 'ACM-001',
    contactPerson: 'Jane Doe',
    email: 'jane@acme.com',
    phone: '555-1000',
    address: {
      street: '100 Factory Rd',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      country: 'USA'
    },
    categories: ['electronics', 'components'],
    rating: 4.5,
    leadTimeDays: 7,
    minimumOrder: 500,
    paymentTerms: 'net_30',
    status: 'active',
    owner: 'org-1',
    createdAt: new Date('2024-01-15').toISOString()
  },
  {
    id: 'sup-2',
    name: 'Global Parts Co',
    code: 'GPC-002',
    contactPerson: 'Bob Wilson',
    email: 'bob@globalparts.com',
    phone: '555-2000',
    address: {
      street: '200 Supplier Ave',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      country: 'USA'
    },
    categories: ['raw_materials', 'packaging'],
    rating: 4.2,
    leadTimeDays: 14,
    minimumOrder: 1000,
    paymentTerms: 'net_45',
    status: 'active',
    owner: 'org-1',
    createdAt: new Date('2024-02-01').toISOString()
  }
];

const sampleInventory = [
  {
    id: 'inv-1',
    sku: 'SKU-LAPTOP-001',
    name: 'Business Laptop Pro 15',
    description: 'High-performance business laptop with 16GB RAM',
    category: 'electronics',
    warehouseId: 'wh-1',
    quantity: 150,
    minimumStock: 20,
    maximumStock: 500,
    reorderPoint: 50,
    unitCost: 899.99,
    unitPrice: 1299.99,
    supplierId: 'sup-1',
    location: { aisle: 'A', rack: '12', shelf: '3' },
    batchNumber: 'BATCH-2024-001',
    expiryDate: '2027-12-31',
    status: 'active',
    owner: 'org-1',
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-06-01').toISOString()
  },
  {
    id: 'inv-2',
    sku: 'SKU-MONITOR-001',
    name: '27" 4K Monitor',
    description: 'Ultra HD 4K monitor with USB-C',
    category: 'electronics',
    warehouseId: 'wh-1',
    quantity: 85,
    minimumStock: 15,
    maximumStock: 300,
    reorderPoint: 30,
    unitCost: 299.99,
    unitPrice: 449.99,
    supplierId: 'sup-1',
    location: { aisle: 'A', rack: '14', shelf: '1' },
    batchNumber: 'BATCH-2024-002',
    expiryDate: '2028-06-30',
    status: 'active',
    owner: 'org-1',
    createdAt: new Date('2024-02-10').toISOString(),
    updatedAt: new Date('2024-06-05').toISOString()
  },
  {
    id: 'inv-3',
    sku: 'SKU-PACKAGING-001',
    name: 'Shipping Boxes (Medium)',
    description: '12x12x8 inch corrugated boxes',
    category: 'packaging',
    warehouseId: 'wh-2',
    quantity: 12,
    minimumStock: 100,
    maximumStock: 2000,
    reorderPoint: 200,
    unitCost: 1.50,
    unitPrice: 3.99,
    supplierId: 'sup-2',
    location: { aisle: 'C', rack: '1', shelf: '5' },
    batchNumber: 'BATCH-2024-003',
    expiryDate: '2026-06-30',
    status: 'low_stock',
    owner: 'org-1',
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date('2024-06-10').toISOString()
  },
  {
    id: 'inv-4',
    sku: 'SKU-CHAIR-001',
    name: 'Ergonomic Office Chair',
    description: 'Adjustable ergonomic chair with lumbar support',
    category: 'furniture',
    warehouseId: 'wh-3',
    quantity: 0,
    minimumStock: 10,
    maximumStock: 100,
    reorderPoint: 20,
    unitCost: 199.99,
    unitPrice: 399.99,
    supplierId: 'sup-1',
    location: { aisle: 'D', rack: '2', shelf: '1' },
    batchNumber: 'BATCH-2024-004',
    expiryDate: '2029-01-01',
    status: 'out_of_stock',
    owner: 'org-1',
    createdAt: new Date('2024-03-15').toISOString(),
    updatedAt: new Date('2024-06-12').toISOString()
  }
];

const sampleTransfers = [
  {
    id: 'tr-1',
    referenceNumber: 'TRF-2024-001',
    fromWarehouseId: 'wh-1',
    toWarehouseId: 'wh-2',
    items: [
      { inventoryId: 'inv-2', quantity: 20 }
    ],
    status: 'completed',
    initiatedBy: 'user-1',
    initiatedAt: new Date('2024-05-15').toISOString(),
    completedAt: new Date('2024-05-17').toISOString(),
    notes: 'Quarterly stock rebalancing',
    owner: 'org-1',
    createdAt: new Date('2024-05-15').toISOString()
  },
  {
    id: 'tr-2',
    referenceNumber: 'TRF-2024-002',
    fromWarehouseId: 'wh-1',
    toWarehouseId: 'wh-3',
    items: [
      { inventoryId: 'inv-1', quantity: 30 }
    ],
    status: 'in_transit',
    initiatedBy: 'user-2',
    initiatedAt: new Date('2024-06-10').toISOString(),
    notes: 'Fulfillment center restocking',
    owner: 'org-1',
    createdAt: new Date('2024-06-10').toISOString()
  }
];

const sampleAdjustments = [
  {
    id: 'adj-1',
    inventoryId: 'inv-1',
    adjustmentType: 'reduction',
    quantity: 5,
    reason: 'damaged',
    notes: 'Units damaged during handling',
    adjustedBy: 'user-1',
    adjustedAt: new Date('2024-05-20').toISOString(),
    owner: 'org-1',
    createdAt: new Date('2024-05-20').toISOString()
  },
  {
    id: 'adj-2',
    inventoryId: 'inv-3',
    adjustmentType: 'addition',
    quantity: 50,
    reason: 'count_correction',
    notes: 'Physical count reconciliation',
    adjustedBy: 'user-2',
    adjustedAt: new Date('2024-06-01').toISOString(),
    owner: 'org-1',
    createdAt: new Date('2024-06-01').toISOString()
  }
];

// Initialize sample data
sampleWarehouses.forEach(w => warehouses.set(w.id, w));
sampleSuppliers.forEach(s => suppliers.set(s.id, s));
sampleInventory.forEach(i => inventory.set(i.id, i));
sampleTransfers.forEach(t => transfers.set(t.id, t));
sampleAdjustments.forEach(a => adjustments.set(a.id, a));

// Generate initial low stock alerts
inventory.forEach((item, id) => {
  if (item.quantity <= item.reorderPoint) {
    lowStockAlerts.set(id, {
      inventoryId: id,
      sku: item.sku,
      name: item.name,
      currentQuantity: item.quantity,
      reorderPoint: item.reorderPoint,
      shortage: item.reorderPoint - item.quantity,
      severity: item.quantity === 0 ? 'critical' : 'warning',
      createdAt: new Date().toISOString()
    });
  }
});

// ============ ALLOWED FIELDS FOR UPDATES ============

const ALLOWED_INVENTORY_CREATE = [
  'sku',
  'name',
  'description',
  'category',
  'warehouseId',
  'quantity',
  'minimumStock',
  'maximumStock',
  'reorderPoint',
  'unitCost',
  'unitPrice',
  'supplierId',
  'location',
  'batchNumber',
  'expiryDate'
];

const ALLOWED_INVENTORY_UPDATE = [
  'name',
  'description',
  'category',
  'warehouseId',
  'minimumStock',
  'maximumStock',
  'reorderPoint',
  'unitCost',
  'unitPrice',
  'supplierId',
  'location',
  'batchNumber',
  'expiryDate',
  'status'
];

const ALLOWED_WAREHOUSE_CREATE = [
  'name',
  'code',
  'type',
  'address',
  'capacity',
  'manager',
  'contact'
];

const ALLOWED_WAREHOUSE_UPDATE = [
  'name',
  'type',
  'address',
  'capacity',
  'manager',
  'contact',
  'status'
];

// ============ IDEMPOTENCY ============

function checkIdempotency(key, operation) {
  const cached = idempotencyCache.get(key);
  if (cached) {
    if (cached.operation === operation && cached.result) {
      return { idempotent: true, result: cached.result };
    }
    if (cached.operation === operation && cached.status === 'processing') {
      throw Errors.CONFLICT('Operation already in progress');
    }
  }
  return { idempotent: false };
}

function setIdempotency(key, operation, result, status = 'completed') {
  idempotencyCache.set(key, { operation, result, status, timestamp: Date.now() });
  // Clean up old entries (keep for 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [k, v] of idempotencyCache.entries()) {
    if (v.timestamp < oneHourAgo) {
      idempotencyCache.delete(k);
    }
  }
}

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

function validateWarehouseType(type) {
  const validTypes = ['distribution', 'storage', 'fulfillment', 'cross_dock', 'bonded'];
  if (type && !validTypes.includes(type)) {
    throw Errors.VALIDATION(`Invalid warehouse type. Must be one of: ${validTypes.join(', ')}`);
  }
  return type;
}

function validateInventoryStatus(status) {
  if (status && !INVENTORY_STATUS.includes(status)) {
    throw Errors.VALIDATION(`Invalid status. Must be one of: ${INVENTORY_STATUS.join(', ')}`);
  }
  return status;
}

function validateAdjustmentReason(reason) {
  if (!ADJUSTMENT_REASONS.includes(reason)) {
    throw Errors.VALIDATION(`Invalid adjustment reason. Must be one of: ${ADJUSTMENT_REASONS.join(', ')}`);
  }
  return reason;
}

function validateTransferStatus(status) {
  if (!TRANSFER_STATUS.includes(status)) {
    throw Errors.VALIDATION(`Invalid transfer status. Must be one of: ${TRANSFER_STATUS.join(', ')}`);
  }
  return status;
}

// ============ ALERT MANAGEMENT ============

function checkAndUpdateLowStockAlert(item) {
  const shouldAlert = item.quantity <= item.reorderPoint;
  const existingAlert = lowStockAlerts.get(item.id);

  if (shouldAlert && !existingAlert) {
    lowStockAlerts.set(item.id, {
      inventoryId: item.id,
      sku: item.sku,
      name: item.name,
      currentQuantity: item.quantity,
      reorderPoint: item.reorderPoint,
      shortage: item.reorderPoint - item.quantity,
      severity: item.quantity === 0 ? 'critical' : 'warning',
      createdAt: new Date().toISOString()
    });
    return { triggered: true, severity: item.quantity === 0 ? 'critical' : 'warning' };
  } else if (shouldAlert && existingAlert) {
    existingAlert.currentQuantity = item.quantity;
    existingAlert.shortage = item.reorderPoint - item.quantity;
    existingAlert.severity = item.quantity === 0 ? 'critical' : 'warning';
    return { triggered: false, updated: true };
  } else if (!shouldAlert && existingAlert) {
    lowStockAlerts.delete(item.id);
    return { triggered: false, cleared: true };
  }
  return { triggered: false };
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
    service: 'inventory-twin',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    inventory: inventory.size,
    warehouses: warehouses.size,
    transfers: transfers.size,
    adjustments: adjustments.size,
    suppliers: suppliers.size,
    alerts: lowStockAlerts.size
  });
});

app.get('/ready', (req, res) => {
  const checks = {
    inventory: inventory.size >= 0,
    warehouses: warehouses.size >= 0
  };

  const isReady = Object.values(checks).every(Boolean);

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? 'ready' : 'not_ready',
    service: 'inventory-twin',
    checks
  });
});

// ============ INVENTORY CRUD ============

// List all inventory
app.get('/api/twins/inventory',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      sku,
      category,
      warehouseId,
      supplierId,
      status,
      search,
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT
    } = req.query;

    let result = Array.from(inventory.values());

    // Filter by SKU
    if (sku) {
      result = result.filter(i => i.sku.toLowerCase().includes(sku.toLowerCase()));
    }

    // Filter by category
    if (category) {
      result = result.filter(i => i.category === category);
    }

    // Filter by warehouse
    if (warehouseId) {
      result = result.filter(i => i.warehouseId === warehouseId);
    }

    // Filter by supplier
    if (supplierId) {
      result = result.filter(i => i.supplierId === supplierId);
    }

    // Filter by status
    if (status) {
      result = result.filter(i => i.status === status);
    }

    // Search
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      result = result.filter(i =>
        i.name.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
        i.sku.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
        (i.description && i.description.toLowerCase().includes(sanitizedSearch.toLowerCase()))
      );
    }

    // Business scope filtering
    if (req.user?.businessId) {
      result = result.filter(i => i.owner === req.user.businessId);
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || PAGINATION.DEFAULT_PAGE);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || PAGINATION.DEFAULT_LIMIT), PAGINATION.MAX_LIMIT);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResult = result.slice(startIndex, endIndex);

    // Calculate totals
    const totalValue = result.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
    const totalUnits = result.reduce((sum, i) => sum + i.quantity, 0);

    res.json({
      success: true,
      twin: {
        type: TWIN_TYPES.INVENTORY,
        items: paginatedResult,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.length,
          totalPages: Math.ceil(result.length / limitNum),
          hasNext: endIndex < result.length,
          hasPrev: pageNum > 1
        },
        summary: {
          totalItems: result.length,
          totalUnits,
          totalValue: Math.round(totalValue * 100) / 100
        }
      }
    });
  })
);

// Get single inventory item
app.get('/api/twins/inventory/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const item = inventory.get(req.params.id);

    if (!item) {
      throw Errors.NOT_FOUND(`Inventory item ${req.params.id} not found`);
    }

    // Business scope validation
    if (req.user?.businessId && item.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this inventory item');
    }

    // Get related data
    const warehouse = warehouses.get(item.warehouseId);
    const supplier = suppliers.get(item.supplierId);
    const alerts = lowStockAlerts.get(item.id);

    // Calculate metrics
    const stockLevel = item.quantity / item.maximumStock * 100;
    const daysUntilExpiry = item.expiryDate
      ? Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      success: true,
      twin: {
        ...item,
        warehouse: warehouse ? { id: warehouse.id, name: warehouse.name, code: warehouse.code } : null,
        supplier: supplier ? { id: supplier.id, name: supplier.name, code: supplier.code } : null,
        metrics: {
          stockLevel: Math.round(stockLevel * 100) / 100,
          stockValue: Math.round(item.quantity * item.unitCost * 100) / 100,
          daysUntilExpiry,
          isLowStock: item.quantity <= item.reorderPoint,
          isOutOfStock: item.quantity === 0
        },
        alert: alerts || null
      }
    });
  })
);

// Create inventory item
app.post('/api/twins/inventory',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const cached = checkIdempotency(idempotencyKey, 'create-inventory');
      if (cached.idempotent) {
        return res.status(200).json(cached.result);
      }
      setIdempotency(idempotencyKey, 'create-inventory', null, 'processing');
    }

    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    const {
      sku,
      name,
      description,
      category,
      warehouseId,
      quantity,
      minimumStock,
      maximumStock,
      reorderPoint,
      unitCost,
      unitPrice,
      supplierId,
      location,
      batchNumber,
      expiryDate
    } = sanitizedBody;

    // Validate required fields
    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      throw Errors.VALIDATION('SKU is required');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw Errors.VALIDATION('Item name is required');
    }

    // Check for duplicate SKU
    const existingSku = Array.from(inventory.values()).find(i => i.sku === sku && i.owner === req.user.businessId);
    if (existingSku) {
      throw Errors.CONFLICT(`SKU ${sku} already exists`);
    }

    // Validate warehouse exists
    if (warehouseId) {
      const warehouse = warehouses.get(warehouseId);
      if (!warehouse) {
        throw Errors.VALIDATION(`Warehouse ${warehouseId} not found`);
      }
      if (warehouse.owner !== req.user.businessId) {
        throw Errors.FORBIDDEN('Access denied to this warehouse');
      }
    }

    // Validate numeric inputs
    const validatedQuantity = quantity !== undefined ? validateNumericInput(quantity, 'quantity', 0) : 0;
    const validatedMinStock = minimumStock !== undefined ? validateNumericInput(minimumStock, 'minimumStock', 0) : 10;
    const validatedMaxStock = maximumStock !== undefined ? validateNumericInput(maximumStock, 'maximumStock', validatedMinStock) : 1000;
    const validatedReorderPoint = reorderPoint !== undefined ? validateNumericInput(reorderPoint, 'reorderPoint', 0) : validatedMinStock / 2;
    const validatedUnitCost = unitCost !== undefined ? validateNumericInput(unitCost, 'unitCost', 0) : 0;
    const validatedUnitPrice = unitPrice !== undefined ? validateNumericInput(unitPrice, 'unitPrice', 0) : 0;

    // Determine status based on quantity
    let status = 'active';
    if (validatedQuantity === 0) {
      status = 'out_of_stock';
    } else if (validatedQuantity <= validatedReorderPoint) {
      status = 'low_stock';
    }

    const item = {
      id: `inv-${uuidv4().slice(0, 8)}`,
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim(),
      category: category || 'general',
      warehouseId: warehouseId || null,
      quantity: validatedQuantity,
      minimumStock: validatedMinStock,
      maximumStock: validatedMaxStock,
      reorderPoint: validatedReorderPoint,
      unitCost: validatedUnitCost,
      unitPrice: validatedUnitPrice,
      supplierId: supplierId || null,
      location: typeof location === 'object' ? preventPrototypePollution(location) : null,
      batchNumber: batchNumber?.trim(),
      expiryDate: expiryDate || null,
      status,
      owner: req.user.businessId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inventory.set(item.id, item);

    // Check for low stock alert
    const alertStatus = checkAndUpdateLowStockAlert(item);

    logger.info('Inventory item created', {
      requestId: req.id,
      inventoryId: item.id,
      sku: item.sku,
      userId: req.user.id,
      businessId: req.user.businessId,
      alertTriggered: alertStatus.triggered
    });

    const result = {
      success: true,
      twin: {
        ...item,
        alertTriggered: alertStatus.triggered,
        alertSeverity: alertStatus.severity
      }
    };

    if (idempotencyKey) {
      setIdempotency(idempotencyKey, 'create-inventory', result);
    }

    res.status(201).json(result);
  })
);

// Update inventory item
app.put('/api/twins/inventory/:id',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const item = inventory.get(req.params.id);

    if (!item) {
      throw Errors.NOT_FOUND(`Inventory item ${req.params.id} not found`);
    }

    // Business scope validation
    if (item.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this inventory item');
    }

    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);

    // Whitelist allowed fields
    const updates = sanitizeObject(sanitizedBody, ALLOWED_INVENTORY_UPDATE);

    // Validate warehouse exists
    if (updates.warehouseId) {
      const warehouse = warehouses.get(updates.warehouseId);
      if (!warehouse) {
        throw Errors.VALIDATION(`Warehouse ${updates.warehouseId} not found`);
      }
      if (warehouse.owner !== req.user.businessId) {
        throw Errors.FORBIDDEN('Access denied to this warehouse');
      }
    }

    // Validate numeric inputs
    if (updates.minimumStock !== undefined) {
      updates.minimumStock = validateNumericInput(updates.minimumStock, 'minimumStock', 0);
    }
    if (updates.maximumStock !== undefined) {
      updates.maximumStock = validateNumericInput(updates.maximumStock, 'maximumStock', updates.minimumStock || 0);
    }
    if (updates.reorderPoint !== undefined) {
      updates.reorderPoint = validateNumericInput(updates.reorderPoint, 'reorderPoint', 0);
    }
    if (updates.unitCost !== undefined) {
      updates.unitCost = validateNumericInput(updates.unitCost, 'unitCost', 0);
    }
    if (updates.unitPrice !== undefined) {
      updates.unitPrice = validateNumericInput(updates.unitPrice, 'unitPrice', 0);
    }

    // Validate status
    if (updates.status) {
      updates.status = validateInventoryStatus(updates.status);
    }

    // Validate location object
    if (updates.location && typeof updates.location === 'object') {
      updates.location = preventPrototypePollution(updates.location);
    }

    // Apply updates
    Object.assign(item, updates, {
      updatedAt: new Date().toISOString()
    });

    // Check for low stock alert
    const alertStatus = checkAndUpdateLowStockAlert(item);

    logger.info('Inventory item updated', {
      requestId: req.id,
      inventoryId: item.id,
      updatedFields: Object.keys(updates),
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.json({
      success: true,
      twin: {
        ...item,
        alertUpdated: alertStatus.updated || alertStatus.cleared,
        alertTriggered: alertStatus.triggered
      }
    });
  })
);

// Delete inventory item
app.delete('/api/twins/inventory/:id',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const item = inventory.get(req.params.id);

    if (!item) {
      throw Errors.NOT_FOUND(`Inventory item ${req.params.id} not found`);
    }

    // Business scope validation
    if (item.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this inventory item');
    }

    // Clear any alerts
    lowStockAlerts.delete(req.params.id);

    inventory.delete(req.params.id);

    logger.info('Inventory item deleted', {
      requestId: req.id,
      inventoryId: req.params.id,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.json({
      success: true,
      twin: { id: req.params.id, deleted: true }
    });
  })
);

// ============ STOCK ADJUSTMENTS ============

app.post('/api/twins/inventory/:id/adjust',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const cached = checkIdempotency(idempotencyKey, 'adjust-inventory');
      if (cached.idempotent) {
        return res.status(200).json(cached.result);
      }
      setIdempotency(idempotencyKey, 'adjust-inventory', null, 'processing');
    }

    const item = inventory.get(req.params.id);

    if (!item) {
      throw Errors.NOT_FOUND(`Inventory item ${req.params.id} not found`);
    }

    // Business scope validation
    if (item.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this inventory item');
    }

    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);
    const { adjustmentType, quantity, reason, notes } = sanitizedBody;

    // Validate required fields
    if (!adjustmentType || !['addition', 'reduction'].includes(adjustmentType)) {
      throw Errors.VALIDATION('adjustmentType must be "addition" or "reduction"');
    }

    const validatedQuantity = validateNumericInput(quantity, 'quantity', 1);
    if (!reason) {
      throw Errors.VALIDATION('Adjustment reason is required');
    }
    validateAdjustmentReason(reason);

    // Calculate new quantity
    let newQuantity;
    if (adjustmentType === 'addition') {
      newQuantity = item.quantity + validatedQuantity;
    } else {
      newQuantity = item.quantity - validatedQuantity;
      if (newQuantity < 0) {
        throw Errors.VALIDATION(`Cannot reduce by ${validatedQuantity}. Current quantity is ${item.quantity}`);
      }
    }

    // Update inventory
    item.quantity = newQuantity;
    item.updatedAt = new Date().toISOString();

    // Update status if needed
    if (newQuantity === 0) {
      item.status = 'out_of_stock';
    } else if (newQuantity <= item.reorderPoint) {
      item.status = 'low_stock';
    } else {
      item.status = 'active';
    }

    // Create adjustment record
    const adjustment = {
      id: `adj-${uuidv4().slice(0, 8)}`,
      inventoryId: item.id,
      sku: item.sku,
      adjustmentType,
      quantity: validatedQuantity,
      previousQuantity: item.quantity + (adjustmentType === 'reduction' ? validatedQuantity : -validatedQuantity),
      newQuantity,
      reason,
      notes: notes?.trim(),
      adjustedBy: req.user.id,
      adjustedAt: new Date().toISOString(),
      owner: req.user.businessId,
      createdAt: new Date().toISOString()
    };

    adjustments.set(adjustment.id, adjustment);

    // Check for low stock alert
    const alertStatus = checkAndUpdateLowStockAlert(item);

    logger.info('Inventory adjusted', {
      requestId: req.id,
      inventoryId: item.id,
      adjustmentId: adjustment.id,
      adjustmentType,
      quantity: validatedQuantity,
      newQuantity,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    const result = {
      success: true,
      twin: {
        ...adjustment,
        item: {
          id: item.id,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          status: item.status
        },
        alertTriggered: alertStatus.triggered,
        alertSeverity: alertStatus.severity
      }
    };

    if (idempotencyKey) {
      setIdempotency(idempotencyKey, 'adjust-inventory', result);
    }

    res.status(201).json(result);
  })
);

// ============ STOCK TRANSFERS ============

app.post('/api/twins/inventory/:id/transfer',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const cached = checkIdempotency(idempotencyKey, 'transfer-inventory');
      if (cached.idempotent) {
        return res.status(200).json(cached.result);
      }
      setIdempotency(idempotencyKey, 'transfer-inventory', null, 'processing');
    }

    const item = inventory.get(req.params.id);

    if (!item) {
      throw Errors.NOT_FOUND(`Inventory item ${req.params.id} not found`);
    }

    // Business scope validation
    if (item.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this inventory item');
    }

    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);
    const { toWarehouseId, quantity, notes } = sanitizedBody;

    // Validate required fields
    if (!toWarehouseId) {
      throw Errors.VALIDATION('Destination warehouse ID is required');
    }

    if (item.warehouseId === toWarehouseId) {
      throw Errors.VALIDATION('Source and destination warehouses must be different');
    }

    // Validate warehouse exists
    const toWarehouse = warehouses.get(toWarehouseId);
    if (!toWarehouse) {
      throw Errors.VALIDATION(`Warehouse ${toWarehouseId} not found`);
    }
    if (toWarehouse.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to destination warehouse');
    }

    const validatedQuantity = quantity !== undefined ? validateNumericInput(quantity, 'quantity', 1) : item.quantity;
    if (validatedQuantity > item.quantity) {
      throw Errors.VALIDATION(`Cannot transfer ${validatedQuantity} units. Only ${item.quantity} available`);
    }

    // Generate reference number
    const year = new Date().getFullYear();
    const transferCount = Array.from(transfers.values()).filter(t =>
      t.referenceNumber.startsWith(`TRF-${year}`)
    ).length + 1;
    const referenceNumber = `TRF-${year}-${String(transferCount).padStart(3, '0')}`;

    // Create transfer record
    const transfer = {
      id: `tr-${uuidv4().slice(0, 8)}`,
      referenceNumber,
      fromWarehouseId: item.warehouseId,
      fromWarehouse: warehouses.get(item.warehouseId)?.name || 'Unknown',
      toWarehouseId,
      toWarehouse: toWarehouse.name,
      items: [
        {
          inventoryId: item.id,
          sku: item.sku,
          name: item.name,
          quantity: validatedQuantity
        }
      ],
      status: 'pending',
      initiatedBy: req.user.id,
      initiatedAt: new Date().toISOString(),
      notes: notes?.trim(),
      owner: req.user.businessId,
      createdAt: new Date().toISOString()
    };

    transfers.set(transfer.id, transfer);

    // Update source inventory
    item.quantity -= validatedQuantity;
    item.updatedAt = new Date().toISOString();

    // Update status if needed
    if (item.quantity === 0) {
      item.status = 'out_of_stock';
    } else if (item.quantity <= item.reorderPoint) {
      item.status = 'low_stock';
    }

    // Check for low stock alert
    checkAndUpdateLowStockAlert(item);

    logger.info('Transfer initiated', {
      requestId: req.id,
      transferId: transfer.id,
      referenceNumber,
      inventoryId: item.id,
      quantity: validatedQuantity,
      fromWarehouseId: item.warehouseId,
      toWarehouseId,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    const result = {
      success: true,
      twin: {
        ...transfer,
        sourceInventoryUpdated: {
          id: item.id,
          sku: item.sku,
          newQuantity: item.quantity,
          status: item.status
        }
      }
    };

    if (idempotencyKey) {
      setIdempotency(idempotencyKey, 'transfer-inventory', result);
    }

    res.status(201).json(result);
  })
);

// Complete a transfer (move items to destination)
app.post('/api/twins/transfers/:id/complete',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const transfer = transfers.get(req.params.id);

    if (!transfer) {
      throw Errors.NOT_FOUND(`Transfer ${req.params.id} not found`);
    }

    // Business scope validation
    if (transfer.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this transfer');
    }

    if (transfer.status !== 'pending' && transfer.status !== 'in_transit') {
      throw Errors.VALIDATION(`Cannot complete transfer with status "${transfer.status}"`);
    }

    // Mark transfer as completed
    transfer.status = 'completed';
    transfer.completedAt = new Date().toISOString();

    logger.info('Transfer completed', {
      requestId: req.id,
      transferId: transfer.id,
      referenceNumber: transfer.referenceNumber,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.json({
      success: true,
      twin: transfer
    });
  })
);

// ============ WAREHOUSE ENDPOINTS ============

app.get('/api/twins/warehouses',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { type, status, search } = req.query;

    let result = Array.from(warehouses.values());

    // Filter by type
    if (type) {
      result = result.filter(w => w.type === type);
    }

    // Filter by status
    if (status) {
      result = result.filter(w => w.status === status);
    }

    // Search
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      result = result.filter(w =>
        w.name.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
        w.code.toLowerCase().includes(sanitizedSearch.toLowerCase())
      );
    }

    // Business scope filtering
    if (req.user?.businessId) {
      result = result.filter(w => w.owner === req.user.businessId);
    }

    // Add inventory stats for each warehouse
    const warehousesWithStats = result.map(w => {
      const warehouseInventory = Array.from(inventory.values()).filter(i => i.warehouseId === w.id);
      const totalUnits = warehouseInventory.reduce((sum, i) => sum + i.quantity, 0);
      const totalValue = warehouseInventory.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
      const itemCount = warehouseInventory.length;

      return {
        ...w,
        stats: {
          itemCount,
          totalUnits,
          totalValue: Math.round(totalValue * 100) / 100,
          utilization: w.currentUtilization
        }
      };
    });

    res.json({
      success: true,
      twin: {
        type: TWIN_TYPES.WAREHOUSE,
        warehouses: warehousesWithStats,
        total: warehousesWithStats.length
      }
    });
  })
);

app.get('/api/twins/warehouses/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const warehouse = warehouses.get(req.params.id);

    if (!warehouse) {
      throw Errors.NOT_FOUND(`Warehouse ${req.params.id} not found`);
    }

    // Business scope validation
    if (req.user?.businessId && warehouse.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this warehouse');
    }

    // Get inventory in this warehouse
    const warehouseInventory = Array.from(inventory.values())
      .filter(i => i.warehouseId === req.params.id);

    const totalUnits = warehouseInventory.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = warehouseInventory.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);

    // Get transfers involving this warehouse
    const incomingTransfers = Array.from(transfers.values())
      .filter(t => t.toWarehouseId === req.params.id);
    const outgoingTransfers = Array.from(transfers.values())
      .filter(t => t.fromWarehouseId === req.params.id);

    res.json({
      success: true,
      twin: {
        ...warehouse,
        inventory: {
          items: warehouseInventory,
          totalItems: warehouseInventory.length,
          totalUnits,
          totalValue: Math.round(totalValue * 100) / 100
        },
        transfers: {
          incoming: incomingTransfers.length,
          outgoing: outgoingTransfers.length
        }
      }
    });
  })
);

// Create warehouse
app.post('/api/twins/warehouses',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const cached = checkIdempotency(idempotencyKey, 'create-warehouse');
      if (cached.idempotent) {
        return res.status(200).json(cached.result);
      }
      setIdempotency(idempotencyKey, 'create-warehouse', null, 'processing');
    }

    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);
    const { name, code, type, address, capacity, manager, contact } = sanitizedBody;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw Errors.VALIDATION('Warehouse name is required');
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw Errors.VALIDATION('Warehouse code is required');
    }

    // Check for duplicate code
    const existingCode = Array.from(warehouses.values()).find(w =>
      w.code === code && w.owner === req.user.businessId
    );
    if (existingCode) {
      throw Errors.CONFLICT(`Warehouse code ${code} already exists`);
    }

    // Validate type
    const validatedType = validateWarehouseType(type || 'storage');

    // Validate capacity
    const validatedCapacity = capacity !== undefined
      ? validateNumericInput(capacity, 'capacity', 1)
      : 10000;

    const warehouse = {
      id: `wh-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type: validatedType,
      address: typeof address === 'object' ? preventPrototypePollution(address) : {},
      capacity: validatedCapacity,
      currentUtilization: 0,
      manager: manager?.trim(),
      contact: typeof contact === 'object' ? preventPrototypePollution(contact) : {},
      status: 'active',
      owner: req.user.businessId,
      createdAt: new Date().toISOString()
    };

    warehouses.set(warehouse.id, warehouse);

    logger.info('Warehouse created', {
      requestId: req.id,
      warehouseId: warehouse.id,
      code: warehouse.code,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    const result = {
      success: true,
      twin: warehouse
    };

    if (idempotencyKey) {
      setIdempotency(idempotencyKey, 'create-warehouse', result);
    }

    res.status(201).json(result);
  })
);

// Update warehouse
app.put('/api/twins/warehouses/:id',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const warehouse = warehouses.get(req.params.id);

    if (!warehouse) {
      throw Errors.NOT_FOUND(`Warehouse ${req.params.id} not found`);
    }

    // Business scope validation
    if (warehouse.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this warehouse');
    }

    // Prevent prototype pollution
    const sanitizedBody = preventPrototypePollution(req.body);
    const updates = sanitizeObject(sanitizedBody, ALLOWED_WAREHOUSE_UPDATE);

    // Validate type
    if (updates.type) {
      updates.type = validateWarehouseType(updates.type);
    }

    // Validate capacity
    if (updates.capacity !== undefined) {
      updates.capacity = validateNumericInput(updates.capacity, 'capacity', 1);
    }

    // Validate address object
    if (updates.address && typeof updates.address === 'object') {
      updates.address = preventPrototypePollution(updates.address);
    }

    // Validate contact object
    if (updates.contact && typeof updates.contact === 'object') {
      updates.contact = preventPrototypePollution(updates.contact);
    }

    // Apply updates
    Object.assign(warehouse, updates);

    logger.info('Warehouse updated', {
      requestId: req.id,
      warehouseId: warehouse.id,
      updatedFields: Object.keys(updates),
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.json({
      success: true,
      twin: warehouse
    });
  })
);

// ============ TRANSFERS LIST ============

app.get('/api/twins/transfers',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { status, fromWarehouseId, toWarehouseId, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;

    let result = Array.from(transfers.values());

    // Filter by status
    if (status) {
      validateTransferStatus(status);
      result = result.filter(t => t.status === status);
    }

    // Filter by warehouse
    if (fromWarehouseId) {
      result = result.filter(t => t.fromWarehouseId === fromWarehouseId);
    }
    if (toWarehouseId) {
      result = result.filter(t => t.toWarehouseId === toWarehouseId);
    }

    // Business scope filtering
    if (req.user?.businessId) {
      result = result.filter(t => t.owner === req.user.businessId);
    }

    // Sort by date (newest first)
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
        type: TWIN_TYPES.TRANSFER,
        transfers: paginatedResult,
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

// ============ ADJUSTMENTS LIST ============

app.get('/api/twins/adjustments',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { inventoryId, adjustmentType, reason, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;

    let result = Array.from(adjustments.values());

    // Filter by inventory ID
    if (inventoryId) {
      result = result.filter(a => a.inventoryId === inventoryId);
    }

    // Filter by adjustment type
    if (adjustmentType) {
      result = result.filter(a => a.adjustmentType === adjustmentType);
    }

    // Filter by reason
    if (reason) {
      result = result.filter(a => a.reason === reason);
    }

    // Business scope filtering
    if (req.user?.businessId) {
      result = result.filter(a => a.owner === req.user.businessId);
    }

    // Sort by date (newest first)
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
        type: TWIN_TYPES.ADJUSTMENT,
        adjustments: paginatedResult,
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

// ============ SUPPLIERS ENDPOINTS ============

app.get('/api/twins/suppliers',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { category, status, search } = req.query;

    let result = Array.from(suppliers.values());

    // Filter by category
    if (category) {
      result = result.filter(s => s.categories.includes(category));
    }

    // Filter by status
    if (status) {
      result = result.filter(s => s.status === status);
    }

    // Search
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      result = result.filter(s =>
        s.name.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(sanitizedSearch.toLowerCase())
      );
    }

    // Business scope filtering
    if (req.user?.businessId) {
      result = result.filter(s => s.owner === req.user.businessId);
    }

    res.json({
      success: true,
      twin: {
        suppliers: result,
        total: result.length
      }
    });
  })
);

app.get('/api/twins/suppliers/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const supplier = suppliers.get(req.params.id);

    if (!supplier) {
      throw Errors.NOT_FOUND(`Supplier ${req.params.id} not found`);
    }

    // Business scope validation
    if (req.user?.businessId && supplier.owner !== req.user.businessId) {
      throw Errors.FORBIDDEN('Access denied to this supplier');
    }

    // Get inventory from this supplier
    const supplierInventory = Array.from(inventory.values())
      .filter(i => i.supplierId === req.params.id);

    res.json({
      success: true,
      twin: {
        ...supplier,
        inventory: {
          items: supplierInventory,
          totalItems: supplierInventory.length
        }
      }
    });
  })
);

// Create supplier
app.post('/api/twins/suppliers',
  strictLimiter,
  requireAuth,
  requireBusiness,
  asyncHandler(async (req, res) => {
    const sanitizedBody = preventPrototypePollution(req.body);
    const { name, code, contactPerson, email, phone, address, categories, leadTimeDays, minimumOrder, paymentTerms } = sanitizedBody;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw Errors.VALIDATION('Supplier name is required');
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw Errors.VALIDATION('Supplier code is required');
    }

    // Check for duplicate code
    const existingCode = Array.from(suppliers.values()).find(s =>
      s.code === code && s.owner === req.user.businessId
    );
    if (existingCode) {
      throw Errors.CONFLICT(`Supplier code ${code} already exists`);
    }

    const supplier = {
      id: `sup-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      contactPerson: contactPerson?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      address: typeof address === 'object' ? preventPrototypePollution(address) : {},
      categories: Array.isArray(categories) ? categories : [],
      rating: 0,
      leadTimeDays: leadTimeDays !== undefined ? validateNumericInput(leadTimeDays, 'leadTimeDays', 1) : 7,
      minimumOrder: minimumOrder !== undefined ? validateNumericInput(minimumOrder, 'minimumOrder', 0) : 0,
      paymentTerms: paymentTerms || 'net_30',
      status: 'active',
      owner: req.user.businessId,
      createdAt: new Date().toISOString()
    };

    suppliers.set(supplier.id, supplier);

    logger.info('Supplier created', {
      requestId: req.id,
      supplierId: supplier.id,
      code: supplier.code,
      userId: req.user.id,
      businessId: req.user.businessId
    });

    res.status(201).json({
      success: true,
      twin: supplier
    });
  })
);

// ============ LOW STOCK ALERTS ============

app.get('/api/twins/alerts',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { severity } = req.query;

    let result = Array.from(lowStockAlerts.values());

    // Filter by severity
    if (severity) {
      result = result.filter(a => a.severity === severity);
    }

    // Business scope filtering
    if (req.user?.businessId) {
      const businessInventoryIds = Array.from(inventory.values())
        .filter(i => i.owner === req.user.businessId)
        .map(i => i.id);
      result = result.filter(a => businessInventoryIds.includes(a.inventoryId));
    }

    // Sort by severity (critical first) then by shortage
    result.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }
      return b.shortage - a.shortage;
    });

    const criticalCount = result.filter(a => a.severity === 'critical').length;
    const warningCount = result.filter(a => a.severity === 'warning').length;

    res.json({
      success: true,
      twin: {
        alerts: result,
        summary: {
          total: result.length,
          critical: criticalCount,
          warning: warningCount
        }
      }
    });
  })
);

// ============ EXPIRY TRACKING ============

app.get('/api/twins/expiring',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = validateNumericInput(days, 'days', 1, 365);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysNum);

    let result = Array.from(inventory.values())
      .filter(i => i.expiryDate && new Date(i.expiryDate) <= cutoffDate);

    // Business scope filtering
    if (req.user?.businessId) {
      result = result.filter(i => i.owner === req.user.businessId);
    }

    // Add days until expiry
    result = result.map(i => ({
      ...i,
      daysUntilExpiry: Math.ceil((new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
      isExpired: new Date(i.expiryDate) < new Date()
    }));

    // Sort by expiry date (soonest first)
    result.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    const expiredCount = result.filter(i => i.isExpired).length;
    const expiringSoonCount = result.length - expiredCount;

    res.json({
      success: true,
      twin: {
        type: TWIN_TYPES.FORECAST,
        items: result,
        summary: {
          total: result.length,
          expired: expiredCount,
          expiringSoon: expiringSoonCount,
          withinDays: daysNum
        }
      }
    });
  })
);

// ============ INVENTORY ANALYTICS ============

app.get('/api/analytics/inventory',
  optionalAuth,
  asyncHandler(async (req, res) => {
    let allInventory = Array.from(inventory.values());

    // Business scope filtering
    if (req.user?.businessId) {
      allInventory = allInventory.filter(i => i.owner === req.user.businessId);
    }

    // Basic metrics
    const totalItems = allInventory.length;
    const totalUnits = allInventory.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = allInventory.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
    const totalRetailValue = allInventory.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    // By category
    const byCategory = {};
    allInventory.forEach(i => {
      byCategory[i.category] = byCategory[i.category] || { count: 0, units: 0, value: 0 };
      byCategory[i.category].count++;
      byCategory[i.category].units += i.quantity;
      byCategory[i.category].value += i.quantity * i.unitCost;
    });

    // By status
    const byStatus = {};
    allInventory.forEach(i => {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    });

    // By warehouse
    const byWarehouse = {};
    allInventory.forEach(i => {
      if (i.warehouseId) {
        const wh = warehouses.get(i.warehouseId);
        const name = wh?.name || i.warehouseId;
        byWarehouse[name] = byWarehouse[name] || { count: 0, units: 0, value: 0 };
        byWarehouse[name].count++;
        byWarehouse[name].units += i.quantity;
        byWarehouse[name].value += i.quantity * i.unitCost;
      }
    });

    // Stock level distribution
    const outOfStock = allInventory.filter(i => i.quantity === 0).length;
    const lowStock = allInventory.filter(i => i.quantity > 0 && i.quantity <= i.reorderPoint).length;
    const healthy = allInventory.filter(i => i.quantity > i.reorderPoint).length;

    // Top value items
    const topValueItems = [...allInventory]
      .map(i => ({ ...i, totalValue: i.quantity * i.unitCost }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Low stock items
    const lowStockItems = allInventory
      .filter(i => i.quantity <= i.reorderPoint)
      .map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        reorderPoint: i.reorderPoint,
        shortage: i.reorderPoint - i.quantity,
        status: i.status
      }))
      .sort((a, b) => b.shortage - a.shortage)
      .slice(0, 20);

    // Expiring items (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringItems = allInventory
      .filter(i => i.expiryDate && new Date(i.expiryDate) <= thirtyDaysFromNow)
      .slice(0, 10);

    // Recent adjustments
    const recentAdjustments = Array.from(adjustments.values())
      .filter(a => req.user?.businessId ? a.owner === req.user.businessId : true)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      twin: {
        type: 'inventory-analytics',
        overview: {
          totalItems,
          totalUnits,
          totalCostValue: Math.round(totalValue * 100) / 100,
          totalRetailValue: Math.round(totalRetailValue * 100) / 100,
          potentialMargin: Math.round((totalRetailValue - totalValue) * 100) / 100
        },
        distribution: {
          byCategory: Object.entries(byCategory).map(([category, data]) => ({
            category,
            ...data,
            value: Math.round(data.value * 100) / 100
          })),
          byStatus,
          byWarehouse: Object.entries(byWarehouse).map(([warehouse, data]) => ({
            warehouse,
            ...data,
            value: Math.round(data.value * 100) / 100
          }))
        },
        stockLevels: {
          outOfStock,
          lowStock,
          healthy,
          percentage: {
            outOfStock: Math.round(outOfStock / totalItems * 100) || 0,
            lowStock: Math.round(lowStock / totalItems * 100) || 0,
            healthy: Math.round(healthy / totalItems * 100) || 0
          }
        },
        alerts: {
          lowStockCount: lowStockItems.length,
          expiringCount: expiringItems.length
        },
        topValueItems: topValueItems.map(i => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          quantity: i.quantity,
          unitCost: i.unitCost,
          totalValue: Math.round(i.totalValue * 100) / 100
        })),
        lowStockItems,
        expiringItems: expiringItems.map(i => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          expiryDate: i.expiryDate,
          quantity: i.quantity,
          daysUntilExpiry: Math.ceil((new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
        })),
        recentAdjustments
      }
    });
  })
);

// ============ ERROR HANDLERS ============

app.use(notFoundHandler);
app.use(errorHandler);

// ============ SERVER START ============

app.listen(PORT, () => {
  logger.info(`Inventory Twin service started on port ${PORT}`, {
    version: '1.0.0',
    port: PORT,
    inventory: inventory.size,
    warehouses: warehouses.size,
    suppliers: suppliers.size,
    alerts: lowStockAlerts.size
  });
  console.log(`Inventory Twin v1.0.0 running on port ${PORT}`);
});

export default app;
