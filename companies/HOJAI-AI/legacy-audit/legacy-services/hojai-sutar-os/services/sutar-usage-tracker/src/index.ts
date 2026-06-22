// ============================================================================
// SUTAR Usage Tracker - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import http from 'http';

// Types
import type {
  UsageEvent,
  UsageQuota,
  CostConfig,
  ResourceConsumption,
  UsageReport,
  RateLimitStatus,
  UsageEventType,
  QuotaPeriod,
  ApiResponse,
  TrackUsageRequest,
  UpdateQuotaRequest,
  HealthResponse,
  EconomyOSConfig,
  ContractOSConfig,
} from './types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4253;
const START_TIME = Date.now();

const ECONOMY_OS_URL = process.env.ECONOMY_OS_URL || 'http://localhost:4251';
const CONTRACT_OS_URL = process.env.CONTRACT_OS_URL || 'http://localhost:4190';

// ============================================================================
// In-Memory Stores
// ============================================================================

const usageEvents = new Map<string, UsageEvent[]>();
const entityQuotas = new Map<string, UsageQuota>();
const entityConsumption = new Map<string, ResourceConsumption>();
const rateLimitStatus = new Map<string, RateLimitStatus>();

// ============================================================================
// Cost Configuration (Default Pricing)
// ============================================================================

const defaultCostConfig: CostConfig = {
  pricing: {
    api_call: { pricePerUnit: 0.001, unit: 'call' },
    storage: { pricePerUnit: 0.0001, unit: 'MB' },
    bandwidth: { pricePerUnit: 0.0005, unit: 'MB' },
    compute: { pricePerUnit: 0.01, unit: 'cpu-second' },
    memory: { pricePerUnit: 0.0002, unit: 'MB-hour' },
    requests: { pricePerUnit: 0.0001, unit: 'request' },
    custom: { pricePerUnit: 0.001, unit: 'unit' },
  },
  discounts: {
    volumeTiers: [
      { threshold: 10000, discountPercent: 5 },
      { threshold: 100000, discountPercent: 10 },
      { threshold: 1000000, discountPercent: 20 },
    ],
    loyaltyDiscounts: {},
  },
  billingCycle: 'monthly',
};

// ============================================================================
// Validation Schemas
// ============================================================================

const trackUsageSchema = z.object({
  entityId: z.string().min(1, 'entityId is required'),
  service: z.string().min(1, 'service is required'),
  eventType: z.enum(['api_call', 'storage', 'bandwidth', 'compute', 'memory', 'requests', 'custom']),
  quantity: z.number().positive('quantity must be positive'),
  unit: z.string().min(1, 'unit is required'),
  metadata: z.record(z.any()).optional(),
  skipCostCalculation: z.boolean().optional(),
});

const updateQuotaSchema = z.object({
  quotas: z.object({
    apiCalls: z.object({ limit: z.number().positive(), used: z.number().min(0), period: z.string() }).optional(),
    storage: z.object({ limit: z.number().positive(), used: z.number().min(0), period: z.string() }).optional(),
    bandwidth: z.object({ limit: z.number().positive(), used: z.number().min(0), period: z.string() }).optional(),
    compute: z.object({ limit: z.number().positive(), used: z.number().min(0), period: z.string() }).optional(),
    memory: z.object({ limit: z.number().positive(), used: z.number().min(0), period: z.string() }).optional(),
    custom: z.record(z.object({ limit: z.number().positive(), used: z.number().min(0), period: z.string() })).optional(),
  }).optional(),
  rateLimits: z.object({
    requestsPerMinute: z.number().positive().optional(),
    requestsPerHour: z.number().positive().optional(),
    requestsPerDay: z.number().positive().optional(),
  }).optional(),
});

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting (global)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId: (req as any).requestId,
    };
    console.log(JSON.stringify(logEntry));
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

const getPeriodBounds = (period: QuotaPeriod): { start: string; end: string } => {
  const now = new Date();
  let start: Date;
  const end = new Date(now);

  switch (period) {
    case 'hourly':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
      end.setHours(start.getHours() + 1);
      break;
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end.setDate(start.getDate() + 1);
      break;
    case 'weekly':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 7);
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end.setMonth(start.getMonth() + 1);
      break;
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1);
      end.setFullYear(start.getFullYear() + 1);
      break;
  }

  return { start: start.toISOString(), end: end.toISOString() };
};

const calculateCost = (eventType: UsageEventType, quantity: number, entityId: string): number => {
  const pricing = defaultCostConfig.pricing[eventType];
  if (!pricing) return 0;

  let cost = pricing.pricePerUnit * quantity;

  // Apply volume discount
  const totalQuantity = getTotalQuantityForEntity(entityId);
  for (const tier of defaultCostConfig.discounts.volumeTiers) {
    if (totalQuantity >= tier.threshold) {
      cost *= (1 - tier.discountPercent / 100);
    }
  }

  // Apply loyalty discount
  const loyaltyDiscount = defaultCostConfig.discounts.loyaltyDiscounts[entityId] || 0;
  cost *= (1 - loyaltyDiscount / 100);

  return Math.round(cost * 10000) / 10000; // Round to 4 decimal places
};

const getTotalQuantityForEntity = (entityId: string): number => {
  const events = usageEvents.get(entityId) || [];
  return events.reduce((sum, e) => sum + e.quantity, 0);
};

const getOrCreateQuota = (entityId: string): UsageQuota => {
  if (!entityQuotas.has(entityId)) {
    entityQuotas.set(entityId, {
      entityId,
      quotas: {
        apiCalls: { limit: 10000, used: 0, period: 'daily' },
        storage: { limit: 1024, used: 0, period: 'monthly' },
        bandwidth: { limit: 10240, used: 0, period: 'monthly' },
        compute: { limit: 3600, used: 0, period: 'hourly' },
        memory: { limit: 512, used: 0, period: 'hourly' },
      },
      rateLimits: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return entityQuotas.get(entityId)!;
};

const getOrCreateConsumption = (entityId: string, service: string): ResourceConsumption => {
  const key = `${entityId}:${service}`;
  if (!entityConsumption.has(key)) {
    const { start, end } = getPeriodBounds('hourly');
    entityConsumption.set(key, {
      entityId,
      service,
      resources: {
        apiCalls: 0,
        storage: 0,
        bandwidth: 0,
        compute: 0,
        memory: 0,
        requests: 0,
      },
      period: 'hourly',
      periodStart: start,
      periodEnd: end,
      lastUpdated: new Date().toISOString(),
    });
  }
  return entityConsumption.get(key)!;
};

const checkRateLimit = (entityId: string): { allowed: boolean; status: RateLimitStatus } => {
  const quota = getOrCreateQuota(entityId);
  const now = Date.now();

  let status = rateLimitStatus.get(entityId);
  if (!status || now > new Date(status.resetAt).getTime()) {
    status = {
      entityId,
      currentRate: 0,
      limit: quota.rateLimits.requestsPerMinute || 100,
      windowMs: 60000,
      remainingRequests: quota.rateLimits.requestsPerMinute || 100,
      resetAt: new Date(now + 60000).toISOString(),
      blocked: false,
    };
    rateLimitStatus.set(entityId, status);
  }

  status.currentRate++;
  status.remainingRequests = Math.max(0, status.remainingRequests - 1);

  if (status.remainingRequests <= 0) {
    status.blocked = true;
    return { allowed: false, status };
  }

  return { allowed: true, status };
};

const updateConsumptionFromEvent = (event: UsageEvent): void => {
  const consumption = getOrCreateConsumption(event.entityId, event.service);
  const resourceKey = event.eventType === 'api_call' ? 'apiCalls' :
    event.eventType === 'bandwidth' ? 'bandwidth' :
    event.eventType === 'compute' ? 'compute' :
    event.eventType === 'memory' ? 'memory' :
    event.eventType === 'requests' ? 'requests' :
    event.eventType === 'storage' ? 'storage' : 'requests';

  if (resourceKey in consumption.resources) {
    (consumption.resources as any)[resourceKey] += event.quantity;
  }
  consumption.lastUpdated = new Date().toISOString();
  entityConsumption.set(`${event.entityId}:${event.service}`, consumption);
};

const updateQuotaUsage = (event: UsageEvent): void => {
  const quota = getOrCreateQuota(event.entityId);
  const resourceKey = event.eventType === 'api_call' ? 'apiCalls' :
    event.eventType === 'bandwidth' ? 'bandwidth' :
    event.eventType === 'compute' ? 'compute' :
    event.eventType === 'memory' ? 'memory' :
    event.eventType === 'requests' ? 'apiCalls' :
    event.eventType === 'storage' ? 'storage' : 'apiCalls';

  if (quota.quotas[resourceKey as keyof typeof quota.quotas]) {
    (quota.quotas[resourceKey as keyof typeof quota.quotas] as any).used += event.quantity;
  }
  quota.updatedAt = new Date().toISOString();
  entityQuotas.set(event.entityId, quota);
};

// ============================================================================
// External Service Integrations
// ============================================================================

const checkServiceHealth = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};

const notifyEconomyOS = async (entityId: string, cost: number, eventType: UsageEventType): Promise<void> => {
  try {
    await fetch(`${ECONOMY_OS_URL}/api/v1/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'usage_tracked',
        data: { entityId, cost, eventType, timestamp: new Date().toISOString() },
      }),
    });
  } catch (error) {
    console.warn(`[ECONOMY_OS] Failed to notify: ${error}`);
  }
};

const notifyContractOS = async (entityId: string, usageDelta: number): Promise<void> => {
  try {
    await fetch(`${CONTRACT_OS_URL}/api/v1/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'usage_update',
        data: { entityId, usageDelta, timestamp: new Date().toISOString() },
      }),
    });
  } catch (error) {
    console.warn(`[CONTRACT_OS] Failed to notify: ${error}`);
  }
};

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const economyOSConnected = await checkServiceHealth(ECONOMY_OS_URL);
  const contractOSConnected = await checkServiceHealth(CONTRACT_OS_URL);

  const health: HealthResponse = {
    status: 'healthy',
    service: 'sutar-usage-tracker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    integrations: {
      economyOS: { connected: economyOSConnected, url: ECONOMY_OS_URL },
      contractOS: { connected: contractOSConnected, url: CONTRACT_OS_URL },
    },
  };
  res.json(apiResponse(true, health));
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { ready: true }));
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { alive: true }));
});

// ============================================================================
// Info Endpoint
// ============================================================================

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-usage-tracker',
    description: 'Usage Tracking Service',
    version: '1.0.0',
    features: [
      'API usage tracking',
      'Resource consumption monitoring',
      'Usage quotas and limits',
      'Usage reporting',
      'Cost calculation',
      'Usage by service/entity',
      'Rate limiting based on usage',
      'Economy OS integration',
      'Contract OS integration',
    ],
  }));
});

// ============================================================================
// POST /api/v1/track - Track Usage Event
// ============================================================================

app.post('/api/v1/track', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = trackUsageSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        (req as any).requestId
      ));
      return;
    }

    const { entityId, service, eventType, quantity, unit, metadata, skipCostCalculation } = validationResult.data;

    // Check rate limit
    const { allowed, status: rateLimitStatusResult } = checkRateLimit(entityId);
    if (!allowed) {
      res.status(429).json(apiResponse(
        false,
        { rateLimit: rateLimitStatusResult },
        'Rate limit exceeded',
        (req as any).requestId
      ));
      return;
    }

    // Check quota
    const quota = getOrCreateQuota(entityId);
    const resourceKey = eventType === 'api_call' ? 'apiCalls' :
      eventType === 'bandwidth' ? 'bandwidth' :
      eventType === 'compute' ? 'compute' :
      eventType === 'memory' ? 'memory' :
      eventType === 'requests' ? 'apiCalls' :
      eventType === 'storage' ? 'storage' : 'apiCalls';

    const quotaResource = quota.quotas[resourceKey as keyof typeof quota.quotas] as { limit: number; used: number } | undefined;
    if (quotaResource && quotaResource.used + quantity > quotaResource.limit) {
      res.status(403).json(apiResponse(
        false,
        { quota: quotaResource, eventType },
        'Quota exceeded',
        (req as any).requestId
      ));
      return;
    }

    // Calculate cost
    const cost = skipCostCalculation ? 0 : calculateCost(eventType, quantity, entityId);

    // Get period bounds
    const { start, end } = getPeriodBounds('hourly');

    // Create usage event
    const event: UsageEvent = {
      id: `usage-${uuidv4()}`,
      entityId,
      service,
      eventType,
      quantity,
      unit,
      cost,
      metadata,
      timestamp: new Date().toISOString(),
      periodStart: start,
      periodEnd: end,
    };

    // Store event
    const events = usageEvents.get(entityId) || [];
    events.push(event);
    usageEvents.set(entityId, events);

    // Update consumption and quota
    updateConsumptionFromEvent(event);
    updateQuotaUsage(event);

    // Notify external services asynchronously
    if (cost > 0) {
      notifyEconomyOS(entityId, cost, eventType);
    }
    notifyContractOS(entityId, quantity);

    console.log(`[TRACK] ${entityId}/${service}: ${eventType} ${quantity} ${unit} (cost: ${cost})`);

    res.status(201).json(apiResponse(true, {
      event,
      rateLimit: rateLimitStatusResult,
      quota: getOrCreateQuota(entityId),
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[TRACK] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// GET /api/v1/usage/:entityId - Get Usage for Entity
// ============================================================================

app.get('/api/v1/usage/:entityId', (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    let events = usageEvents.get(entityId) || [];

    // Filter by date range if provided
    if (startDate || endDate) {
      events = events.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        if (startDate && eventTime < new Date(startDate as string).getTime()) return false;
        if (endDate && eventTime > new Date(endDate as string).getTime()) return false;
        return true;
      });
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    const limitedEvents = events.slice(0, Number(limit));

    // Calculate summary
    const summary = {
      totalEvents: events.length,
      totalCost: events.reduce((sum, e) => sum + (e.cost || 0), 0),
      totalQuantity: events.reduce((sum, e) => sum + e.quantity, 0),
      byService: {} as Record<string, { events: number; cost: number; quantity: number }>,
      byType: {} as Record<string, { events: number; cost: number; quantity: number }>,
    };

    for (const event of events) {
      if (!summary.byService[event.service]) {
        summary.byService[event.service] = { events: 0, cost: 0, quantity: 0 };
      }
      summary.byService[event.service].events++;
      summary.byService[event.service].cost += event.cost || 0;
      summary.byService[event.service].quantity += event.quantity;

      if (!summary.byType[event.eventType]) {
        summary.byType[event.eventType] = { events: 0, cost: 0, quantity: 0 };
      }
      summary.byType[event.eventType].events++;
      summary.byType[event.eventType].cost += event.cost || 0;
      summary.byType[event.eventType].quantity += event.quantity;
    }

    res.json(apiResponse(true, {
      entityId,
      events: limitedEvents,
      total: events.length,
      summary,
      quota: getOrCreateQuota(entityId),
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[USAGE] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// GET /api/v1/usage/:entityId/service/:service - Usage by Service
// ============================================================================

app.get('/api/v1/usage/:entityId/service/:service', (req: Request, res: Response) => {
  try {
    const { entityId, service } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    let events = (usageEvents.get(entityId) || []).filter(e => e.service === service);

    // Filter by date range if provided
    if (startDate || endDate) {
      events = events.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        if (startDate && eventTime < new Date(startDate as string).getTime()) return false;
        if (endDate && eventTime > new Date(endDate as string).getTime()) return false;
        return true;
      });
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    const limitedEvents = events.slice(0, Number(limit));

    // Calculate summary
    const summary = {
      totalEvents: events.length,
      totalCost: events.reduce((sum, e) => sum + (e.cost || 0), 0),
      totalQuantity: events.reduce((sum, e) => sum + e.quantity, 0),
      byType: {} as Record<string, { events: number; cost: number; quantity: number }>,
    };

    for (const event of events) {
      if (!summary.byType[event.eventType]) {
        summary.byType[event.eventType] = { events: 0, cost: 0, quantity: 0 };
      }
      summary.byType[event.eventType].events++;
      summary.byType[event.eventType].cost += event.cost || 0;
      summary.byType[event.eventType].quantity += event.quantity;
    }

    res.json(apiResponse(true, {
      entityId,
      service,
      events: limitedEvents,
      total: events.length,
      summary,
      consumption: getOrCreateConsumption(entityId, service),
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[USAGE/SERVICE] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// GET /api/v1/quota/:entityId - Get Quotas
// ============================================================================

app.get('/api/v1/quota/:entityId', (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const quota = getOrCreateQuota(entityId);

    // Calculate usage percentages
    const usagePercentages: Record<string, number> = {};
    for (const [key, value] of Object.entries(quota.quotas)) {
      if (value && typeof value === 'object' && 'limit' in value) {
        const q = value as { limit: number; used: number };
        usagePercentages[key] = Math.round((q.used / q.limit) * 10000) / 100;
      }
    }

    res.json(apiResponse(true, {
      ...quota,
      usagePercentages,
      availableQuota: {
        apiCalls: quota.quotas.apiCalls ? quota.quotas.apiCalls.limit - quota.quotas.apiCalls.used : undefined,
        storage: quota.quotas.storage ? quota.quotas.storage.limit - quota.quotas.storage.used : undefined,
        bandwidth: quota.quotas.bandwidth ? quota.quotas.bandwidth.limit - quota.quotas.bandwidth.used : undefined,
        compute: quota.quotas.compute ? quota.quotas.compute.limit - quota.quotas.compute.used : undefined,
        memory: quota.quotas.memory ? quota.quotas.memory.limit - quota.quotas.memory.used : undefined,
      },
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[QUOTA] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// PUT /api/v1/quota/:entityId - Update Quotas
// ============================================================================

app.put('/api/v1/quota/:entityId', (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Validate request body
    const validationResult = updateQuotaSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        (req as any).requestId
      ));
      return;
    }

    const { quotas, rateLimits } = validationResult.data;
    const quota = getOrCreateQuota(entityId);

    // Update quotas if provided
    if (quotas) {
      if (quotas.apiCalls && quota.quotas.apiCalls) {
        quota.quotas.apiCalls = { ...quota.quotas.apiCalls, ...quotas.apiCalls, period: (quotas.apiCalls.period as QuotaPeriod) || quota.quotas.apiCalls.period };
      }
      if (quotas.storage && quota.quotas.storage) {
        quota.quotas.storage = { ...quota.quotas.storage, ...quotas.storage, period: (quotas.storage.period as QuotaPeriod) || quota.quotas.storage.period };
      }
      if (quotas.bandwidth && quota.quotas.bandwidth) {
        quota.quotas.bandwidth = { ...quota.quotas.bandwidth, ...quotas.bandwidth, period: (quotas.bandwidth.period as QuotaPeriod) || quota.quotas.bandwidth.period };
      }
      if (quotas.compute && quota.quotas.compute) {
        quota.quotas.compute = { ...quota.quotas.compute, ...quotas.compute, period: (quotas.compute.period as QuotaPeriod) || quota.quotas.compute.period };
      }
      if (quotas.memory && quota.quotas.memory) {
        quota.quotas.memory = { ...quota.quotas.memory, ...quotas.memory, period: (quotas.memory.period as QuotaPeriod) || quota.quotas.memory.period };
      }
      if (quotas.custom) {
        const customQuotas: Record<string, { limit: number; used: number; period: QuotaPeriod }> = { ...quota.quotas.custom };
        for (const [key, value] of Object.entries(quotas.custom)) {
          customQuotas[key] = { ...value, period: value.period as QuotaPeriod };
        }
        quota.quotas.custom = customQuotas;
      }
    }

    // Update rate limits if provided
    if (rateLimits) {
      if (rateLimits.requestsPerMinute) quota.rateLimits.requestsPerMinute = rateLimits.requestsPerMinute;
      if (rateLimits.requestsPerHour) quota.rateLimits.requestsPerHour = rateLimits.requestsPerHour;
      if (rateLimits.requestsPerDay) quota.rateLimits.requestsPerDay = rateLimits.requestsPerDay;
    }

    quota.updatedAt = new Date().toISOString();
    entityQuotas.set(entityId, quota);

    console.log(`[QUOTA] Updated for ${entityId}`);

    res.json(apiResponse(true, quota, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[QUOTA/UPDATE] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// GET /api/v1/cost/:entityId - Cost Calculation
// ============================================================================

app.get('/api/v1/cost/:entityId', (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { startDate, endDate, period = 'monthly' } = req.query;

    const events = usageEvents.get(entityId) || [];

    // Filter by date range if provided
    let filteredEvents = events;
    if (startDate || endDate) {
      filteredEvents = events.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        if (startDate && eventTime < new Date(startDate as string).getTime()) return false;
        if (endDate && eventTime > new Date(endDate as string).getTime()) return false;
        return true;
      });
    }

    // Calculate costs by event type
    const costsByType: Record<string, { quantity: number; baseCost: number; discount: number; finalCost: number }> = {};
    let totalBaseCost = 0;

    for (const event of filteredEvents) {
      const pricing = defaultCostConfig.pricing[event.eventType];
      if (!pricing) continue;

      const baseCost = pricing.pricePerUnit * event.quantity;
      totalBaseCost += baseCost;

      if (!costsByType[event.eventType]) {
        costsByType[event.eventType] = { quantity: 0, baseCost: 0, discount: 0, finalCost: 0 };
      }
      costsByType[event.eventType].quantity += event.quantity;
      costsByType[event.eventType].baseCost += baseCost;
    }

    // Apply volume discounts
    const totalQuantity = filteredEvents.reduce((sum, e) => sum + e.quantity, 0);
    let volumeDiscountPercent = 0;
    for (const tier of defaultCostConfig.discounts.volumeTiers) {
      if (totalQuantity >= tier.threshold) {
        volumeDiscountPercent = tier.discountPercent;
      }
    }

    // Apply loyalty discount
    const loyaltyDiscountPercent = defaultCostConfig.discounts.loyaltyDiscounts[entityId] || 0;
    const totalDiscountPercent = volumeDiscountPercent + loyaltyDiscountPercent;

    // Calculate final costs
    for (const type of Object.keys(costsByType)) {
      costsByType[type].discount = costsByType[type].baseCost * (totalDiscountPercent / 100);
      costsByType[type].finalCost = costsByType[type].baseCost - costsByType[type].discount;
    }

    const totalDiscount = totalBaseCost * (totalDiscountPercent / 100);
    const totalCost = totalBaseCost - totalDiscount;

    res.json(apiResponse(true, {
      entityId,
      period: period as string,
      dateRange: { start: startDate || 'all', end: endDate || 'all' },
      totalQuantity,
      totalBaseCost: Math.round(totalBaseCost * 10000) / 10000,
      totalDiscount: Math.round(totalDiscount * 10000) / 10000,
      totalDiscountPercent,
      totalCost: Math.round(totalCost * 10000) / 10000,
      currency: 'INR',
      breakdown: {
        byType: costsByType,
        volumeDiscountApplied: volumeDiscountPercent > 0,
        loyaltyDiscountApplied: loyaltyDiscountPercent > 0,
      },
      pricingConfig: defaultCostConfig.pricing,
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[COST] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// GET /api/v1/reports/summary - Usage Summary Report
// ============================================================================

app.get('/api/v1/reports/summary', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, entityId } = req.query;

    // Get all events or filter by entity
    let allEvents: UsageEvent[] = [];
    if (entityId) {
      allEvents = usageEvents.get(entityId as string) || [];
    } else {
      for (const events of usageEvents.values()) {
        allEvents.push(...events);
      }
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      allEvents = allEvents.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        if (startDate && eventTime < new Date(startDate as string).getTime()) return false;
        if (endDate && eventTime > new Date(endDate as string).getTime()) return false;
        return true;
      });
    }

    // Calculate summary statistics
    const totalEvents = allEvents.length;
    const totalCost = allEvents.reduce((sum, e) => sum + (e.cost || 0), 0);
    const totalQuantity = allEvents.reduce((sum, e) => sum + e.quantity, 0);

    // By service
    const byService: Record<string, { events: number; cost: number; quantity: number }> = {};
    for (const event of allEvents) {
      if (!byService[event.service]) {
        byService[event.service] = { events: 0, cost: 0, quantity: 0 };
      }
      byService[event.service].events++;
      byService[event.service].cost += event.cost || 0;
      byService[event.service].quantity += event.quantity;
    }

    // By type
    const byType: Record<string, { events: number; cost: number; quantity: number }> = {};
    for (const event of allEvents) {
      if (!byType[event.eventType]) {
        byType[event.eventType] = { events: 0, cost: 0, quantity: 0 };
      }
      byType[event.eventType].events++;
      byType[event.eventType].cost += event.cost || 0;
      byType[event.eventType].quantity += event.quantity;
    }

    // By entity
    const byEntity: Record<string, { events: number; cost: number; quantity: number }> = {};
    for (const event of allEvents) {
      if (!byEntity[event.entityId]) {
        byEntity[event.entityId] = { events: 0, cost: 0, quantity: 0 };
      }
      byEntity[event.entityId].events++;
      byEntity[event.entityId].cost += event.cost || 0;
      byEntity[event.entityId].quantity += event.quantity;
    }

    // Top entities
    const topEntities = Object.entries(byEntity)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([id, stats]) => ({ entityId: id, ...stats }));

    res.json(apiResponse(true, {
      reportType: 'summary',
      generatedAt: new Date().toISOString(),
      dateRange: { start: startDate || 'all', end: endDate || 'all' },
      totalEvents,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalQuantity,
      byService,
      byType,
      byEntity: Object.keys(byEntity).length,
      topEntities,
      totalQuotas: entityQuotas.size,
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[REPORT/SUMMARY] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// GET /api/v1/reports/detailed - Detailed Report
// ============================================================================

app.get('/api/v1/reports/detailed', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, entityId, service, limit = 500 } = req.query;

    // Get all events or filter by entity
    let allEvents: UsageEvent[] = [];
    if (entityId) {
      allEvents = usageEvents.get(entityId as string) || [];
    } else {
      for (const events of usageEvents.values()) {
        allEvents.push(...events);
      }
    }

    // Filter by service if provided
    if (service) {
      allEvents = allEvents.filter(e => e.service === service);
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      allEvents = allEvents.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        if (startDate && eventTime < new Date(startDate as string).getTime()) return false;
        if (endDate && eventTime > new Date(endDate as string).getTime()) return false;
        return true;
      });
    }

    // Sort by timestamp descending
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    const limitedEvents = allEvents.slice(0, Number(limit));

    // Build detailed report
    const report: UsageReport = {
      entityId: entityId as string || 'all',
      period: {
        start: startDate as string || 'all',
        end: endDate as string || 'all',
      },
      summary: {
        totalEvents: allEvents.length,
        totalCost: allEvents.reduce((sum, e) => sum + (e.cost || 0), 0),
        totalQuantity: allEvents.reduce((sum, e) => sum + e.quantity, 0),
        byService: {},
        byType: {} as any,
      },
      quotas: getOrCreateQuota((entityId as string) || 'default'),
      consumption: getOrCreateConsumption((entityId as string) || 'default', (service as string) || 'default'),
    };

    // Calculate by service
    for (const event of allEvents) {
      if (!report.summary.byService[event.service]) {
        report.summary.byService[event.service] = { events: 0, cost: 0, quantity: 0 };
      }
      report.summary.byService[event.service].events++;
      report.summary.byService[event.service].cost += event.cost || 0;
      report.summary.byService[event.service].quantity += event.quantity;

      const byTypeKey = event.eventType;
      if (!report.summary.byType[byTypeKey]) {
        report.summary.byType[byTypeKey] = { events: 0, cost: 0, quantity: 0 };
      }
      report.summary.byType[byTypeKey].events++;
      report.summary.byType[byTypeKey].cost += event.cost || 0;
      report.summary.byType[byTypeKey].quantity += event.quantity;
    }

    res.json(apiResponse(true, {
      ...report,
      events: limitedEvents,
      limit: Number(limit),
      hasMore: allEvents.length > Number(limit),
    }, undefined, (req as any).requestId));
  } catch (error) {
    console.error(`[REPORT/DETAILED] Error: ${error}`);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Intent/Event Endpoints (Legacy Support)
// ============================================================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);
    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Rate Limit Status Endpoint
// ============================================================================

app.get('/api/v1/ratelimit/:entityId', (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { allowed, status } = checkRateLimit(entityId);
    res.json(apiResponse(true, { allowed, status }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Stats Endpoint
// ============================================================================

app.get('/api/v1/stats', (req: Request, res: Response) => {
  try {
    let totalEvents = 0;
    let totalCost = 0;
    for (const events of usageEvents.values()) {
      totalEvents += events.length;
      totalCost += events.reduce((sum, e) => sum + (e.cost || 0), 0);
    }

    res.json(apiResponse(true, {
      totalEntities: usageEvents.size,
      totalEvents,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalQuotas: entityQuotas.size,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
    }, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// 404 & Error Handlers
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json(apiResponse(false, undefined, 'Internal server error'));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════╗
║        SUTAR USAGE TRACKER v1.0.0                    ║
║═══════════════════════════════════════════════════════║
║  Port:          ${PORT}                                   ║
║  Economy OS:    ${ECONOMY_OS_URL}  ║
║  Contract OS:   ${CONTRACT_OS_URL}  ║
║  Status:        RUNNING                               ║
╚═══════════════════════════════════════════════════════╝`);
});

export default app;
