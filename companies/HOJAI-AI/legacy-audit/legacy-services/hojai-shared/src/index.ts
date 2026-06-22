/**
 * HOJAI Shared Utilities Service
 * Version: 1.1.0 | Port: 4580
 * Shared types, validation, and common utilities with MongoDB persistence
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { initGracefulShutdown, shutdownMiddleware } from '../hojai-core/shared/utils/shutdown.js';
import { createLogger } from '../hojai-core/shared/utils/logger.js';
import { getCorsOrigins } from '../hojai-core/shared/config/index.js';
import { authenticate } from '../hojai-core/shared/middleware/auth.js';

// ============================================
// CONFIGURATION
// ============================================

const PORT = parseInt(process.env.PORT || '4580', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-shared';
const SERVICE_NAME = 'hojai-shared';

// ============================================
// LOGGING
// ============================================

const logger = createLogger(SERVICE_NAME);

// ============================================
// TYPES
// ============================================

interface Tenant {
  id: string;
  name: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  quota: {
    apiCalls: number;
    storage: number;
    users: number;
  };
  usage: {
    apiCalls: number;
    storage: number;
    users: number;
  };
  status: 'active' | 'suspended' | 'trial';
  createdAt: Date;
}

interface ApiKey {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsed: Date | null;
  status: 'active' | 'revoked';
}

interface WebhookConfig {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  retries: number;
  status: 'active' | 'inactive';
}

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    logger.info('mongodb_connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

    mongoose.connection.on('error', (err) => {
      logger.error('mongodb_error', { error: err.message });
    });
  } catch (error) {
    logger.error('mongodb_connection_failed', { error: (error as Error).message });
    throw error;
  }
}

// ============================================
// MONGOOSE MODELS
// ============================================

interface TenantDoc {
  id: string;
  name: string;
  plan: string;
  quota: { api_calls: number; storage: number; users: number };
  usage: { api_calls: number; storage: number; users: number };
  status: string;
  created_at: string;
  updated_at: string;
}

interface ApiKeyDoc {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  permissions: string[];
  expires_at?: string;
  last_used?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WebhookDoc {
  id: string;
  tenant_id: string;
  url: string;
  events: string[];
  secret: string;
  retries: number;
  status: string;
  created_at: string;
  updated_at: string;
}

let TenantModel: mongoose.Model<TenantDoc>;
let ApiKeyModel: mongoose.Model<ApiKeyDoc>;
let WebhookModel: mongoose.Model<WebhookDoc>;

function getModels() {
  if (!TenantModel) {
    TenantModel = mongoose.model<TenantDoc>('Tenant', new mongoose.Schema({
      id: String,
      name: String,
      plan: String,
      quota: {
        api_calls: { type: Number, default: 1000 },
        storage: { type: Number, default: 100 },
        users: { type: Number, default: 5 }
      },
      usage: {
        api_calls: { type: Number, default: 0 },
        storage: { type: Number, default: 0 },
        users: { type: Number, default: 0 }
      },
      status: { type: String, default: 'trial' },
      created_at: String,
      updated_at: String
    }, { collection: 'shared_tenants' }));
  }

  if (!ApiKeyModel) {
    ApiKeyModel = mongoose.model<ApiKeyDoc>('ApiKey', new mongoose.Schema({
      id: String,
      tenant_id: String,
      key: String,
      name: String,
      permissions: [String],
      expires_at: String,
      last_used: String,
      status: { type: String, default: 'active' },
      created_at: String,
      updated_at: String
    }, { collection: 'shared_api_keys' }));
  }

  if (!WebhookModel) {
    WebhookModel = mongoose.model<WebhookDoc>('Webhook', new mongoose.Schema({
      id: String,
      tenant_id: String,
      url: String,
      events: [String],
      secret: String,
      retries: { type: Number, default: 3 },
      status: { type: String, default: 'active' },
      created_at: String,
      updated_at: String
    }, { collection: 'shared_webhooks' }));
  }

  return { TenantModel, ApiKeyModel, WebhookModel };
}

// ============================================
// EXPRESS APP
// ============================================

const app: Express = express();

app.use(helmet());
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id']
}));
app.use(express.json({ limit: '10kb' }));

// Shutdown middleware
app.use(shutdownMiddleware());

// Request logging with structured logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start
    });
  });
  next();
});

// ============================================
// VALIDATION UTILITIES
// ============================================

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidUuid = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const validateBody = (rules: Array<{
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
}>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (typeof value !== rule.type) {
          errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
        }

        if (rule.type === 'string') {
          if (rule.min !== undefined && value.length < rule.min) {
            errors.push(`Field '${rule.field}' must be at least ${rule.min} characters`);
          }
          if (rule.max !== undefined && value.length > rule.max) {
            errors.push(`Field '${rule.field}' must be at most ${rule.max} characters`);
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(`Field '${rule.field}' format is invalid`);
          }
        }

        if (rule.type === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
          }
          if (rule.max !== undefined && value > rule.max) {
            errors.push(`Field '${rule.field}' must be at most ${rule.max}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    next();
  };
};

// ============================================
// HEALTH CHECKS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.1.0',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  const mongoReady = mongoose.connection.readyState === 1;
  if (mongoReady) {
    res.json({ status: 'ready', checks: { mongodb: 'connected' } });
  } else {
    res.status(503).json({ status: 'not_ready', checks: { mongodb: 'disconnected' } });
  }
});

// ============================================
// TENANT MANAGEMENT (Protected Routes)
// ============================================

app.get('/api/tenants', authenticate(), async (req: Request, res: Response) => {
  try {
    const { TenantModel } = getModels();
    const tenants = await TenantModel.find({}).lean();
    res.json({ success: true, tenants, count: tenants.length });
  } catch (error) {
    logger.error('tenants_list_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' } });
  }
});

app.post('/api/tenants', authenticate(), validateBody([
  { field: 'name', type: 'string', required: true, min: 2, max: 100 },
  { field: 'plan', type: 'string', required: true }
]), async (req: Request, res: Response) => {
  try {
    const { TenantModel } = getModels();
    const { name, plan } = req.body;
    const now = new Date().toISOString();

    const tenant = {
      id: uuidv4(),
      name,
      plan: plan || 'free',
      quota: { api_calls: 1000, storage: 100, users: 5 },
      usage: { api_calls: 0, storage: 0, users: 0 },
      status: 'trial',
      created_at: now,
      updated_at: now
    };

    await TenantModel.create(tenant);
    res.status(201).json({ success: true, tenant });
  } catch (error) {
    logger.error('tenant_create_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create tenant' } });
  }
});

app.get('/api/tenants/:id', authenticate(), async (req: Request, res: Response) => {
  try {
    const { TenantModel } = getModels();
    const tenant = await TenantModel.findOne({ id: req.params.id }).lean();
    if (!tenant) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    }
    res.json({ success: true, tenant });
  } catch (error) {
    logger.error('tenant_get_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tenant' } });
  }
});

app.put('/api/tenants/:id', authenticate(), async (req: Request, res: Response) => {
  try {
    const { TenantModel } = getModels();
    const { name, plan, status, quota } = req.body;

    const tenant = await TenantModel.findOne({ id: req.params.id });
    if (!tenant) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    }

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name) update.name = name;
    if (plan) update.plan = plan;
    if (status) update.status = status;
    if (quota) update.quota = { ...tenant.quota, ...quota };

    await TenantModel.updateOne({ _id: tenant._id }, { $set: update });
    const updated = await TenantModel.findOne({ _id: tenant._id }).lean();

    res.json({ success: true, tenant: updated });
  } catch (error) {
    logger.error('tenant_update_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update tenant' } });
  }
});

app.delete('/api/tenants/:id', authenticate(), async (req: Request, res: Response) => {
  try {
    const { TenantModel } = getModels();
    const result = await TenantModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('tenant_delete_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete tenant' } });
  }
});

// ============================================
// API KEY MANAGEMENT (Protected Routes)
// ============================================

app.get('/api/apikeys', authenticate(), async (req: Request, res: Response) => {
  try {
    const { ApiKeyModel } = getModels();
    const { tenantId } = req.query;
    const filter: Record<string, any> = {};
    if (tenantId) filter.tenant_id = tenantId;

    const keys = await ApiKeyModel.find(filter).lean();
    res.json({ success: true, apiKeys: keys, count: keys.length });
  } catch (error) {
    logger.error('apikeys_list_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list API keys' } });
  }
});

app.post('/api/apikeys', authenticate(), validateBody([
  { field: 'tenantId', type: 'string', required: true },
  { field: 'name', type: 'string', required: true, min: 2, max: 50 }
]), async (req: Request, res: Response) => {
  try {
    const { ApiKeyModel } = getModels();
    const { tenantId, name, permissions } = req.body;
    const now = new Date().toISOString();

    const apiKey = {
      id: uuidv4(),
      tenant_id: tenantId,
      key: `hk_${uuidv4().replace(/-/g, '')}`,
      name,
      permissions: permissions || ['read'],
      expires_at: null,
      last_used: null,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    await ApiKeyModel.create(apiKey);
    res.status(201).json({ success: true, apiKey, secret: apiKey.key });
  } catch (error) {
    logger.error('apikey_create_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } });
  }
});

app.delete('/api/apikeys/:id', authenticate(), async (req: Request, res: Response) => {
  try {
    const { ApiKeyModel } = getModels();
    const result = await ApiKeyModel.updateOne(
      { id: req.params.id },
      { $set: { status: 'revoked', updated_at: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('apikey_revoke_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' } });
  }
});

// ============================================
// WEBHOOK MANAGEMENT (Protected Routes)
// ============================================

app.get('/api/webhooks', authenticate(), async (req: Request, res: Response) => {
  try {
    const { WebhookModel } = getModels();
    const { tenantId } = req.query;
    const filter: Record<string, any> = {};
    if (tenantId) filter.tenant_id = tenantId;

    const hooks = await WebhookModel.find(filter).lean();
    res.json({ success: true, webhooks: hooks, count: hooks.length });
  } catch (error) {
    logger.error('webhooks_list_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhooks' } });
  }
});

app.post('/api/webhooks', authenticate(), validateBody([
  { field: 'tenantId', type: 'string', required: true },
  { field: 'url', type: 'string', required: true },
  { field: 'events', type: 'array', required: true }
]), async (req: Request, res: Response) => {
  try {
    const { WebhookModel } = getModels();
    const { tenantId, url, events } = req.body;

    if (!isValidUrl(url)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_URL', message: 'Invalid URL format' } });
    }

    const now = new Date().toISOString();
    const webhook = {
      id: uuidv4(),
      tenant_id: tenantId,
      url,
      events,
      secret: `whs_${uuidv4().replace(/-/g, '')}`,
      retries: 3,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    await WebhookModel.create(webhook);
    res.status(201).json({ success: true, webhook });
  } catch (error) {
    logger.error('webhook_create_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create webhook' } });
  }
});

app.delete('/api/webhooks/:id', authenticate(), async (req: Request, res: Response) => {
  try {
    const { WebhookModel } = getModels();
    const result = await WebhookModel.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('webhook_delete_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete webhook' } });
  }
});

// ============================================
// UTILITY ENDPOINTS (Public)
// ============================================

app.post('/api/validate', (req: Request, res: Response) => {
  const { type, value } = req.body;

  let result = false;
  switch (type) {
    case 'email':
      result = isValidEmail(value);
      break;
    case 'url':
      result = isValidUrl(value);
      break;
    case 'uuid':
      result = isValidUuid(value);
      break;
    default:
      return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Invalid validation type' } });
  }

  res.json({ success: true, type, value, valid: result });
});

app.get('/api/utils/uuid', (_req: Request, res: Response) => {
  res.json({ success: true, uuid: uuidv4() });
});

app.get('/api/stats', authenticate(), async (req: Request, res: Response) => {
  try {
    const { TenantModel, ApiKeyModel } = getModels();
    const [tenantCount, keyCount] = await Promise.all([
      TenantModel.countDocuments({}),
      ApiKeyModel.countDocuments({ status: 'active' })
    ]);

    res.json({
      success: true,
      data: {
        tenants: tenantCount,
        apiKeys: keyCount
      }
    });
  } catch (error) {
    logger.error('stats_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } });
  }
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('error', { error: err.message, path: req.path });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    }
  });
});

// ============================================
// START SERVER
// ============================================

async function start() {
  try {
    await connectDatabase();

    initGracefulShutdown({
      mongooseConnection: mongoose.connection,
      serviceName: SERVICE_NAME
    });

    app.listen(PORT, () => {
      logger.info('service_started', { port: PORT, mongodb: MONGODB_URI });
      console.log(`HOJAI Shared Service v1.1.0 running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Utilities: http://localhost:${PORT}/api/utils/*`);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

start();

export default app;