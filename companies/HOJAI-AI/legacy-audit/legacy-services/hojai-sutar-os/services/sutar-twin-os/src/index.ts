// ============================================================================
// SUTAR Twin OS - Digital Twin Management Service
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import {
  Twin,
  TwinType,
  TwinStatus,
  TwinProperty,
  TwinRelationship,
  StateChange,
  SyncStatus,
  CreateTwinRequest,
  UpdateTwinRequest,
  AddPropertyRequest,
  CreateRelationshipRequest,
  SyncRequest,
  ApiResponse,
  PaginatedResponse,
} from './types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4142;
const START_TIME = Date.now();
const ENVIRONMENT = process.env.NODE_ENV || 'development';

const MEMORY_BRIDGE_URL = process.env.MEMORY_BRIDGE_URL || 'http://localhost:4143';
const IDENTITY_OS_URL = process.env.IDENTITY_OS_URL || 'http://localhost:4147';

// ============================================================================
// In-Memory Storage
// ============================================================================

const twins = new Map<string, Twin>();
const stateHistoryIndex = new Map<string, StateChange[]>();

// ============================================================================
// Validation Schemas
// ============================================================================

const twinTypeSchema = z.enum(['employee', 'customer', 'company', 'merchant']);
const twinStatusSchema = z.enum(['active', 'inactive', 'suspended', 'archived']);
const relationshipTypeSchema = z.enum(['owns', 'manages', 'belongs_to', 'related_to', 'reports_to', 'partners_with']);

const createTwinSchema = z.object({
  type: twinTypeSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  properties: z.record(z.object({
    value: z.unknown(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'date']).optional(),
    source: z.string().optional(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const updateTwinSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: twinStatusSchema.optional(),
  properties: z.record(z.object({
    value: z.unknown(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'date']).optional(),
    source: z.string().optional(),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const addPropertySchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'date']).optional(),
  source: z.string().optional(),
});

const createRelationshipSchema = z.object({
  targetTwinId: z.string().min(1),
  type: relationshipTypeSchema,
  metadata: z.record(z.unknown()).optional(),
});

const syncRequestSchema = z.object({
  source: z.string().min(1),
  force: z.boolean().optional(),
  properties: z.array(z.string()).optional(),
});

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests' },
});
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Too many write requests' },
});

app.use('/api/', generalLimiter);

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${_res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================================================
// Helper Functions
// ============================================================================

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

const inferPropertyType = (value: unknown): TwinProperty['type'] => {
  if (typeof value === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{4}-\d{2}-\d{2}T/;
    if (dateRegex.test(value) || !isNaN(Date.parse(value as string))) return 'date';
    return 'string';
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
};

const computeChecksum = (twin: Twin): string => {
  const data = JSON.stringify({
    type: twin.type,
    name: twin.name,
    status: twin.status,
    properties: twin.properties,
    version: twin.version,
  });
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
};

const recordStateChange = (twin: Twin, previousState: Record<string, unknown>, newState: Record<string, unknown>, changedFields: string[], trigger: StateChange['trigger'], source: string): StateChange => {
  const change: StateChange = {
    id: `change-${uuidv4()}`,
    timestamp: new Date().toISOString(),
    previousState,
    newState,
    changedFields,
    trigger,
    source,
  };

  twin.stateHistory.push(change);

  // Keep only last 100 state changes
  if (twin.stateHistory.length > 100) {
    twin.stateHistory = twin.stateHistory.slice(-100);
  }

  // Update index
  const index = stateHistoryIndex.get(twin.id) || [];
  index.push(change);
  if (index.length > 100) stateHistoryIndex.set(twin.id, index.slice(-100));
  else stateHistoryIndex.set(twin.id, index);

  return change;
};

const syncWithMemoryBridge = async (twin: Twin, action: 'create' | 'update' | 'delete'): Promise<boolean> => {
  try {
    const endpoint = action === 'delete' ? `/api/v1/memories?entityId=${twin.id}` : '/api/v1/memories';
    const method = action === 'delete' ? 'GET' : 'POST';

    const body = action !== 'delete' ? JSON.stringify({
      entityId: twin.id,
      type: 'context',
      content: `Digital Twin: ${twin.name} (${twin.type}) - Status: ${twin.status}`,
      metadata: {
        twinType: twin.type,
        twinStatus: twin.status,
        twinVersion: twin.version,
        syncedAt: new Date().toISOString(),
      },
      tags: [twin.type, twin.status, ...twin.tags],
    }) : undefined;

    const response = await fetch(`${MEMORY_BRIDGE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (response.ok) {
      console.log(`[MEMORY-BRIDGE] ${action} sync successful for twin ${twin.id}`);
      return true;
    }
    console.warn(`[MEMORY-BRIDGE] ${action} sync failed: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`[MEMORY-BRIDGE] ${action} sync error:`, error);
    return false;
  }
};

const syncWithIdentityOs = async (twin: Twin, action: 'create' | 'update' | 'delete'): Promise<boolean> => {
  try {
    const response = await fetch(`${IDENTITY_OS_URL}/api/v1/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: `twin.${action}`,
        payload: {
          twinId: twin.id,
          twinType: twin.type,
          twinName: twin.name,
          status: twin.status,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (response.ok) {
      console.log(`[IDENTITY-OS] ${action} notification sent for twin ${twin.id}`);
      return true;
    }
    console.warn(`[IDENTITY-OS] ${action} notification failed: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`[IDENTITY-OS] ${action} notification error:`, error);
    return false;
  }
};

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    status: 'healthy',
    service: 'sutar-twin-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  }));
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { ready: true, twinsCount: twins.size }));
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { alive: true }));
});

// ============================================================================
// Info Endpoint
// ============================================================================

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-twin-os',
    description: 'Digital Twin OS - Entity state management and synchronization',
    version: '1.0.0',
    features: [
      'Digital Twin creation (Employee, Customer, Company, Merchant)',
      'Twin state management',
      'Twin properties and attributes',
      'Twin relationships',
      'State change history',
      'Twin synchronization',
      'Memory Bridge integration',
      'Identity OS integration',
    ],
    configuration: {
      memoryBridgeUrl: MEMORY_BRIDGE_URL,
      identityOsUrl: IDENTITY_OS_URL,
      environment: ENVIRONMENT,
    },
  }));
});

// ============================================================================
// Twin CRUD Endpoints
// ============================================================================

// Create Twin
app.post('/api/v1/twins', writeLimiter, async (req: Request, res: Response) => {
  try {
    const validation = createTwinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error.errors[0].message));
      return;
    }

    const body = validation.data as CreateTwinRequest;
    const id = `twin-${uuidv4()}`;
    const now = new Date().toISOString();

    const properties: Record<string, TwinProperty> = {};
    if (body.properties) {
      for (const [key, prop] of Object.entries(body.properties)) {
        properties[key] = {
          key,
          value: prop.value,
          type: prop.type || inferPropertyType(prop.value),
          lastUpdated: now,
          source: prop.source || 'system',
        };
      }
    }

    const twin: Twin = {
      id,
      type: body.type,
      name: body.name,
      description: body.description,
      status: 'active',
      properties,
      relationships: [],
      stateHistory: [],
      syncStatus: {
        lastSyncedAt: now,
        status: 'pending',
        source: 'system',
        version: 1,
      },
      metadata: body.metadata || {},
      tags: body.tags || [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    twins.set(id, twin);
    stateHistoryIndex.set(id, []);

    // Record initial state
    recordStateChange(twin, {}, { status: 'active', version: 1 }, ['status', 'version'], 'system', 'creation');

    // Sync with external services
    await Promise.allSettled([
      syncWithMemoryBridge(twin, 'create'),
      syncWithIdentityOs(twin, 'create'),
    ]);

    console.log(`[TWIN] Created: ${id} (${body.type}) - ${body.name}`);
    res.status(201).json(apiResponse(true, twin, undefined, (req as any).requestId));
  } catch (error) {
    console.error('[TWIN] Create error:', error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// List Twins
app.get('/api/v1/twins', (req: Request, res: Response) => {
  try {
    const { type, status, tags, limit = 50, offset = 0 } = req.query;

    let result = Array.from(twins.values()).filter(t => t.status !== 'archived');

    if (type) result = result.filter(t => t.type === type);
    if (status) result = result.filter(t => t.status === status);
    if (tags) {
      const tagList = String(tags).split(',');
      result = result.filter(t => tagList.some(tag => t.tags.includes(tag)));
    }

    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = result.length;
    const paginatedResult = result.slice(Number(offset), Number(offset) + Number(limit));

    const response: PaginatedResponse<Twin> = {
      items: paginatedResult,
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + Number(limit) < total,
    };

    res.json(apiResponse(true, response));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Get Twin by ID
app.get('/api/v1/twins/:id', (req: Request, res: Response) => {
  try {
    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }
    res.json(apiResponse(true, twin));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Update Twin
app.put('/api/v1/twins/:id', writeLimiter, async (req: Request, res: Response) => {
  try {
    const validation = updateTwinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error.errors[0].message));
      return;
    }

    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    const body = validation.data as UpdateTwinRequest;
    const previousState: Record<string, unknown> = {
      name: twin.name,
      description: twin.description,
      status: twin.status,
      metadata: { ...twin.metadata },
      tags: [...twin.tags],
      version: twin.version,
    };

    const changedFields: string[] = [];

    if (body.name !== undefined && body.name !== twin.name) {
      twin.name = body.name;
      changedFields.push('name');
    }
    if (body.description !== undefined) {
      twin.description = body.description;
      changedFields.push('description');
    }
    if (body.status !== undefined && body.status !== twin.status) {
      twin.status = body.status;
      changedFields.push('status');
    }
    if (body.metadata) {
      twin.metadata = { ...twin.metadata, ...body.metadata };
      changedFields.push('metadata');
    }
    if (body.tags) {
      twin.tags = body.tags;
      changedFields.push('tags');
    }

    if (body.properties) {
      const now = new Date().toISOString();
      for (const [key, prop] of Object.entries(body.properties)) {
        twin.properties[key] = {
          key,
          value: prop.value,
          type: prop.type || inferPropertyType(prop.value),
          lastUpdated: now,
          source: prop.source || 'update',
        };
        changedFields.push(`properties.${key}`);
      }
    }

    twin.updatedAt = new Date().toISOString();
    twin.version++;
    twin.syncStatus = {
      lastSyncedAt: twin.updatedAt,
      status: 'pending',
      source: 'update',
      version: twin.version,
      checksum: computeChecksum(twin),
    };

    if (changedFields.length > 0) {
      const newState: Record<string, unknown> = {
        name: twin.name,
        description: twin.description,
        status: twin.status,
        metadata: twin.metadata,
        tags: twin.tags,
        version: twin.version,
      };
      recordStateChange(twin, previousState, newState, changedFields, 'update', 'api');
    }

    twins.set(twin.id, twin);

    // Sync with external services
    await Promise.allSettled([
      syncWithMemoryBridge(twin, 'update'),
      syncWithIdentityOs(twin, 'update'),
    ]);

    console.log(`[TWIN] Updated: ${twin.id} - Changed: ${changedFields.join(', ')}`);
    res.json(apiResponse(true, twin, undefined, (req as any).requestId));
  } catch (error) {
    console.error('[TWIN] Update error:', error);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Delete Twin
app.delete('/api/v1/twins/:id', writeLimiter, async (req: Request, res: Response) => {
  try {
    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    // Soft delete - archive the twin
    const previousState: Record<string, unknown> = { status: twin.status };
    twin.status = 'archived';
    twin.updatedAt = new Date().toISOString();
    twin.version++;

    recordStateChange(twin, previousState, { status: 'archived' }, ['status'], 'manual', 'delete');

    twins.set(twin.id, twin);

    // Sync with external services
    await Promise.allSettled([
      syncWithMemoryBridge(twin, 'delete'),
      syncWithIdentityOs(twin, 'delete'),
    ]);

    console.log(`[TWIN] Archived: ${twin.id}`);
    res.json(apiResponse(true, { deleted: twin.id, archived: true }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Property Management
// ============================================================================

// Add Property to Twin
app.post('/api/v1/twins/:id/properties', writeLimiter, async (req: Request, res: Response) => {
  try {
    const validation = addPropertySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error.errors[0].message));
      return;
    }

    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    const body = validation.data as AddPropertyRequest;
    const now = new Date().toISOString();

    const previousValue = twin.properties[body.key]?.value;
    twin.properties[body.key] = {
      key: body.key,
      value: body.value,
      type: body.type || inferPropertyType(body.value),
      lastUpdated: now,
      source: body.source || 'api',
    };

    twin.updatedAt = now;
    twin.version++;
    twin.syncStatus = {
      lastSyncedAt: now,
      status: 'pending',
      source: 'property_add',
      version: twin.version,
      checksum: computeChecksum(twin),
    };

    recordStateChange(
      twin,
      { [body.key]: previousValue },
      { [body.key]: body.value },
      [`properties.${body.key}`],
      'manual',
      'add_property'
    );

    twins.set(twin.id, twin);

    console.log(`[TWIN] Property added: ${twin.id}.${body.key}`);
    res.json(apiResponse(true, twin, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Delete Property from Twin
app.delete('/api/v1/twins/:id/properties/:key', writeLimiter, async (req: Request, res: Response) => {
  try {
    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    const { key } = req.params;
    if (!twin.properties[key]) {
      res.status(404).json(apiResponse(false, undefined, 'Property not found'));
      return;
    }

    const previousValue = twin.properties[key].value;
    delete twin.properties[key];

    twin.updatedAt = new Date().toISOString();
    twin.version++;

    recordStateChange(
      twin,
      { [key]: previousValue },
      { [key]: undefined },
      [`properties.${key}`],
      'manual',
      'delete_property'
    );

    twins.set(twin.id, twin);

    console.log(`[TWIN] Property deleted: ${twin.id}.${key}`);
    res.json(apiResponse(true, twin));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Relationship Management
// ============================================================================

// Create Relationship
app.post('/api/v1/twins/:id/relationships', writeLimiter, async (req: Request, res: Response) => {
  try {
    const validation = createRelationshipSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error.errors[0].message));
      return;
    }

    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    const targetTwin = twins.get(req.body.targetTwinId);
    if (!targetTwin) {
      res.status(404).json(apiResponse(false, undefined, 'Target twin not found'));
      return;
    }

    const body = validation.data as CreateRelationshipRequest;

    // Check for duplicate relationship
    const existingRelationship = twin.relationships.find(r => r.targetTwinId === body.targetTwinId && r.type === body.type);
    if (existingRelationship) {
      res.status(409).json(apiResponse(false, undefined, 'Relationship already exists'));
      return;
    }

    const relationship: TwinRelationship = {
      id: `rel-${uuidv4()}`,
      targetTwinId: body.targetTwinId,
      type: body.type,
      metadata: body.metadata,
      createdAt: new Date().toISOString(),
    };

    twin.relationships.push(relationship);
    twin.updatedAt = new Date().toISOString();
    twin.version++;

    recordStateChange(
      twin,
      { relationships: twin.relationships.length - 1 },
      { relationships: twin.relationships.length },
      ['relationships'],
      'manual',
      'add_relationship'
    );

    twins.set(twin.id, twin);

    console.log(`[TWIN] Relationship created: ${twin.id} -> ${body.targetTwinId} (${body.type})`);
    res.json(apiResponse(true, twin));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// Delete Relationship
app.delete('/api/v1/twins/:id/relationships/:relId', writeLimiter, async (req: Request, res: Response) => {
  try {
    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    const relIndex = twin.relationships.findIndex(r => r.id === req.params.relId);
    if (relIndex === -1) {
      res.status(404).json(apiResponse(false, undefined, 'Relationship not found'));
      return;
    }

    const removedRel = twin.relationships.splice(relIndex, 1)[0];
    twin.updatedAt = new Date().toISOString();
    twin.version++;

    recordStateChange(
      twin,
      { relationships: twin.relationships.length + 1 },
      { relationships: twin.relationships.length },
      ['relationships'],
      'manual',
      'remove_relationship'
    );

    twins.set(twin.id, twin);

    console.log(`[TWIN] Relationship removed: ${twin.id} -> ${removedRel.targetTwinId}`);
    res.json(apiResponse(true, twin));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// State History
// ============================================================================

// Get State History
app.get('/api/v1/twins/:id/history', (req: Request, res: Response) => {
  try {
    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    const { limit = 50, offset = 0, trigger } = req.query;
    let history = twin.stateHistory;

    if (trigger) {
      history = history.filter(h => h.trigger === trigger);
    }

    history = history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = history.length;
    const paginatedHistory = history.slice(Number(offset), Number(offset) + Number(limit));

    res.json(apiResponse(true, {
      twinId: twin.id,
      history: paginatedHistory,
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + Number(limit) < total,
    }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Twin Synchronization
// ============================================================================

// Sync Twin
app.post('/api/v1/twins/:id/sync', writeLimiter, async (req: Request, res: Response) => {
  try {
    const validation = syncRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(apiResponse(false, undefined, validation.error.errors[0].message));
      return;
    }

    const twin = twins.get(req.params.id);
    if (!twin) {
      res.status(404).json(apiResponse(false, undefined, 'Twin not found'));
      return;
    }

    const body = validation.data as SyncRequest;
    const now = new Date().toISOString();

    const previousState: Record<string, unknown> = {
      syncStatus: { ...twin.syncStatus },
    };

    // Check for conflicts if not forced
    if (!body.force && twin.syncStatus.status === 'conflict') {
      res.status(409).json(apiResponse(false, {
        conflict: true,
        currentChecksum: twin.syncStatus.checksum,
        lastSyncedAt: twin.syncStatus.lastSyncedAt,
      }, 'Sync conflict detected. Use force=true to override.'));
      return;
    }

    // Simulate sync process
    const syncResult = await Promise.allSettled([
      syncWithMemoryBridge(twin, 'update'),
      syncWithIdentityOs(twin, 'update'),
    ]);

    const memoryBridgeSuccess = syncResult[0].status === 'fulfilled';
    const identityOsSuccess = syncResult[1].status === 'fulfilled';

    twin.syncStatus = {
      lastSyncedAt: now,
      status: memoryBridgeSuccess && identityOsSuccess ? 'synced' : 'failed',
      source: body.source,
      version: twin.version,
      checksum: computeChecksum(twin),
    };

    recordStateChange(
      twin,
      previousState,
      { syncStatus: twin.syncStatus },
      ['syncStatus'],
      'sync',
      body.source
    );

    twins.set(twin.id, twin);

    console.log(`[TWIN] Synced: ${twin.id} - Status: ${twin.syncStatus.status}`);
    res.json(apiResponse(true, {
      twinId: twin.id,
      syncStatus: twin.syncStatus,
      details: {
        memoryBridge: memoryBridgeSuccess ? 'success' : 'failed',
        identityOs: identityOsSuccess ? 'success' : 'failed',
      },
    }));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Batch Operations
// ============================================================================

// Batch create twins
app.post('/api/v1/twins/batch', writeLimiter, async (req: Request, res: Response) => {
  try {
    const { twins: twinsToCreate } = req.body;

    if (!Array.isArray(twinsToCreate) || twinsToCreate.length === 0) {
      res.status(400).json(apiResponse(false, undefined, 'twins array is required'));
      return;
    }

    if (twinsToCreate.length > 100) {
      res.status(400).json(apiResponse(false, undefined, 'Maximum 100 twins per batch'));
      return;
    }

    const results: { success: Twin[]; failed: { index: number; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (let i = 0; i < twinsToCreate.length; i++) {
      const validation = createTwinSchema.safeParse(twinsToCreate[i]);
      if (!validation.success) {
        results.failed.push({ index: i, error: validation.error.errors[0].message });
        continue;
      }

      const body = validation.data as CreateTwinRequest;
      const id = `twin-${uuidv4()}`;
      const now = new Date().toISOString();

      const properties: Record<string, TwinProperty> = {};
      if (body.properties) {
        for (const [key, prop] of Object.entries(body.properties)) {
          properties[key] = {
            key,
            value: prop.value,
            type: prop.type || inferPropertyType(prop.value),
            lastUpdated: now,
            source: prop.source || 'system',
          };
        }
      }

      const twin: Twin = {
        id,
        type: body.type,
        name: body.name,
        description: body.description,
        status: 'active',
        properties,
        relationships: [],
        stateHistory: [],
        syncStatus: {
          lastSyncedAt: now,
          status: 'pending',
          source: 'system',
          version: 1,
        },
        metadata: body.metadata || {},
        tags: body.tags || [],
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      twins.set(id, twin);
      stateHistoryIndex.set(id, []);
      recordStateChange(twin, {}, { status: 'active', version: 1 }, ['status', 'version'], 'system', 'batch_creation');

      results.success.push(twin);
    }

    console.log(`[TWIN] Batch created: ${results.success.length} success, ${results.failed.length} failed`);
    res.status(201).json(apiResponse(true, results));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Statistics Endpoint
// ============================================================================

app.get('/api/v1/stats', (req: Request, res: Response) => {
  try {
    const allTwins = Array.from(twins.values());

    const stats = {
      total: allTwins.length,
      byType: {
        employee: allTwins.filter(t => t.type === 'employee').length,
        customer: allTwins.filter(t => t.type === 'customer').length,
        company: allTwins.filter(t => t.type === 'company').length,
        merchant: allTwins.filter(t => t.type === 'merchant').length,
      },
      byStatus: {
        active: allTwins.filter(t => t.status === 'active').length,
        inactive: allTwins.filter(t => t.status === 'inactive').length,
        suspended: allTwins.filter(t => t.status === 'suspended').length,
        archived: allTwins.filter(t => t.status === 'archived').length,
      },
      syncStatus: {
        synced: allTwins.filter(t => t.syncStatus.status === 'synced').length,
        pending: allTwins.filter(t => t.syncStatus.status === 'pending').length,
        failed: allTwins.filter(t => t.syncStatus.status === 'failed').length,
        conflict: allTwins.filter(t => t.syncStatus.status === 'conflict').length,
      },
      totalRelationships: allTwins.reduce((sum, t) => sum + t.relationships.length, 0),
      totalStateChanges: allTwins.reduce((sum, t) => sum + t.stateHistory.length, 0),
    };

    res.json(apiResponse(true, stats));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Intent & Event Handlers
// ============================================================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);

    // Handle specific intent types
    if (type === 'twin.create') {
      const twin = twins.get(payload.twinId);
      if (twin) {
        twin.status = payload.status || twin.status;
        twins.set(twin.id, twin);
      }
    }

    res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);

    // Handle state change events
    if (type === 'twin.state_changed' && data.twinId) {
      const twin = twins.get(data.twinId);
      if (twin) {
        recordStateChange(
          twin,
          data.previousState || {},
          data.newState || {},
          data.changedFields || [],
          'system',
          'event'
        );
      }
    }

    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error('[ERROR]', err);
  res.status(500).json(apiResponse(false, undefined, err.message));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, closing gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, closing gracefully...');
  process.exit(0);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  SUTAR TWIN OS`);
  console.log(`  Digital Twin Management Service`);
  console.log(`========================================`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Environment: ${ENVIRONMENT}`);
  console.log(`  Memory Bridge: ${MEMORY_BRIDGE_URL}`);
  console.log(`  Identity OS: ${IDENTITY_OS_URL}`);
  console.log(`========================================\n`);
});

export default app;
