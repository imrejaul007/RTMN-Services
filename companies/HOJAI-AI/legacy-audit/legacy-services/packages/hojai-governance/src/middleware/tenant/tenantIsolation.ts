import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { TenantModel } from '../../services/tenant/tenantManager.js';
import { auditLogger, AuditLogParams } from '../../services/audit/auditLogger.js';
import { TenantType, Tenant } from '../../types/index.js';

// Redis clients for namespace isolation
const redisClients = new Map<string, Redis>();

/**
 * Get or create Redis client with tenant namespace
 */
function getRedisClient(namespace: string): Redis {
  if (!redisClients.has(namespace)) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = new Redis(redisUrl, {
      keyPrefix: `${namespace}:`,
      lazyConnect: true
    });
    redisClients.set(namespace, client);
  }
  return redisClients.get(namespace)!;
}

/**
 * Tenant Isolation Middleware
 * Ensures all data operations are scoped to the tenant's namespace
 */
export class TenantIsolation {
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  /**
   * Middleware to set up tenant context
   */
  setupTenantContext = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.tenantId) {
        next();
        return;
      }

      const tenant = await TenantModel.findById(req.tenantId);
      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // Attach tenant isolation data to request
      req.app.locals.tenantContext = {
        tenantId: tenant.id,
        namespace: tenant.namespace,
        isolation: tenant.isolation,
        type: tenant.type,
        isPrivileged: tenant.type === TenantType.REZ_ECOSYSTEM
      };

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Build MongoDB collection name with tenant prefix
   */
  getTenantCollection(collectionName: string, tenant: Tenant): string {
    return `${tenant.isolation.databaseNamespace}_${collectionName}`;
  }

  /**
   * Build Redis key with tenant prefix
   */
  getTenantKey(tenant: Tenant, key: string): string {
    return `${tenant.isolation.redisNamespace}:${key}`;
  }

  /**
   * Build vector collection name with tenant prefix
   */
  getTenantVectorCollection(tenant: Tenant, collectionName: string): string {
    return `${tenant.isolation.vectorNamespace}_${collectionName}`;
  }

  /**
   * Build event namespace for the tenant
   */
  getTenantEventNamespace(tenant: Tenant, eventType: string): string {
    return `${tenant.isolation.eventNamespace}:${eventType}`;
  }

  /**
   * Verify tenant can access a specific resource
   */
  async verifyResourceAccess(params: {
    tenantId: string;
    resourceTenantId: string;
    resourceType: string;
    action: string;
  }): Promise<boolean> {
    // Same tenant always has access
    if (params.tenantId === params.resourceTenantId) {
      return true;
    }

    // Check if requester is privileged (REZ ecosystem)
    const tenant = await TenantModel.findById(params.tenantId);
    if (tenant?.type === TenantType.REZ_ECOSYSTEM) {
      // Privileged tenants can access cross-tenant resources for specific actions
      const privilegedActions = ['admin', 'audit', 'export'];
      return privilegedActions.includes(params.action);
    }

    return false;
  }

  /**
   * Middleware to enforce tenant data boundaries
   */
  enforceTenantBoundary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantContext = req.app.locals.tenantContext;

      if (!tenantContext) {
        next();
        return;
      }

      // Inject tenant isolation into request for downstream services
      req.app.locals.isolation = {
        databasePrefix: tenantContext.isolation.databaseNamespace,
        redisPrefix: tenantContext.isolation.redisNamespace,
        vectorPrefix: tenantContext.isolation.vectorNamespace,
        eventPrefix: tenantContext.isolation.eventNamespace,
        isPrivileged: tenantContext.isPrivileged
      };

      // Log resource access
      await auditLogger.logAsync({
        tenantId: tenantContext.tenantId,
        action: 'resource:accessed' as any,
        resource: `${req.method} ${req.path}`,
        details: {
          isolation: tenantContext.isolation
        },
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get tenant-scoped Redis client
   */
  async getTenantRedis(tenantId: string): Promise<Redis> {
    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return getRedisClient(tenant.isolation.redisNamespace);
  }

  /**
   * Check if a tenant has access to privileged features
   */
  async hasPrivilegedAccess(tenantId: string): Promise<boolean> {
    const tenant = await TenantModel.findById(tenantId);
    return tenant?.type === TenantType.REZ_ECOSYSTEM;
  }

  /**
   * Validate data isolation for a query
   */
  validateQueryIsolation(
    tenant: Tenant,
    query: Record<string, unknown>
  ): Record<string, unknown> {
    // Ensure queries always include tenant ID filter
    return {
      ...query,
      tenantId: tenant.id
    };
  }

  /**
   * Sanitize response to remove cross-tenant data
   */
  sanitizeResponse<T>(tenantId: string, data: T): T {
    // Remove any data that doesn't belong to this tenant
    // This is a safety measure - actual filtering should happen at query level
    if (Array.isArray(data)) {
      return data.filter(
        (item: any) => !item.tenantId || item.tenantId === tenantId
      ) as T;
    }

    if (data && typeof data === 'object' && 'tenantId' in (data as any)) {
      if ((data as any).tenantId !== tenantId) {
        return null as T;
      }
    }

    return data;
  }
}

export const tenantIsolation = new TenantIsolation();

/**
 * Express middleware to automatically scope Redis operations to tenant
 */
export const scopeRedisToTenant = (
  tenantId: string,
  isolation: Tenant['isolation']
) => {
  return (originalMethod: (...args: any[]) => any) => {
    return async function (...args: any[]) {
      // Modify Redis key arguments to include tenant prefix
      if (args[0] && typeof args[0] === 'string') {
        args[0] = `${isolation.redisNamespace}:${args[0]}`;
      }
      return originalMethod.apply(this, args);
    };
  };
};

/**
 * Middleware to check quota before operations
 */
export const checkQuota = (metric: 'events' | 'api_calls' | 'storage') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantId) {
        next();
        return;
      }

      const tenant = await TenantModel.findById(req.tenantId);
      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // Check feature flag
      const featureMap: Record<string, keyof Tenant['features']> = {
        events: 'eventIngestion',
        api_calls: 'eventIngestion', // Reuse for now
        storage: 'memoryStorage'
      };

      const feature = featureMap[metric];
      if (feature && !tenant.features[feature]) {
        res.status(403).json({
          success: false,
          error: `Feature ${feature} not enabled for this tenant`
        });
        return;
      }

      // For now, quota checking is handled by rate limiting
      // Full quota tracking would increment usage counters here

      next();
    } catch (error) {
      next(error);
    }
  };
};
