import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { tenantManager } from '../services/tenant/tenantManager.js';
import { rbacService } from '../services/rbac/rbacService.js';
import { tenantManager as TenantManager } from '../../services/tenant/tenantManager.js';
import { TenantType, TenantTier, TenantStatus } from '../../types/index.js';

const router = express.Router();

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.nativeEnum(TenantType),
  tier: z.nativeEnum(TenantTier).optional(),
  namespace: z.string().regex(/^[a-z0-9-]+$/).optional(),
  features: z.object({
    eventIngestion: z.boolean().optional(),
    memoryStorage: z.boolean().optional(),
    vectorSearch: z.boolean().optional(),
    workflowRuntime: z.boolean().optional(),
    agentRuntime: z.boolean().optional(),
    whatsappAI: z.boolean().optional(),
    hyperlocal: z.boolean().optional()
  }).optional()
});

const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  tier: z.nativeEnum(TenantTier).optional(),
  status: z.nativeEnum(TenantStatus).optional()
});

// ============================================================================
// TENANT ROUTES
// ============================================================================

/**
 * POST /api/tenants
 * Create a new tenant
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateTenantSchema.parse(req.body);

    const tenant = await tenantManager.createTenant({
      name: validated.name,
      type: validated.type,
      tier: validated.tier ?? TenantTier.FREE,
      namespace: validated.namespace,
      features: validated.features
    });

    // Initialize RBAC roles for the tenant
    await rbacService.initializeTenantRoles(tenant.id);

    res.status(201).json({
      success: true,
      data: tenant
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    if (error.message.includes('already exists')) {
      res.status(409).json({
        success: false,
        error: error.message
      });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/tenants
 * List all tenants (admin only)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, tier, limit, offset } = req.query;

    const result = await tenantManager.listTenants({
      type: type as TenantType,
      status: status as TenantStatus,
      tier: tier as TenantTier,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({
      success: true,
      data: result.tenants,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:id
 * Get tenant by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenant = await tenantManager.getTenant(id);

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
      return;
    }

    // Include namespace map
    const namespaceMap = tenantManager.buildNamespaceMap(tenant);

    res.json({
      success: true,
      data: {
        ...tenant,
        namespaceMap
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/namespace/:namespace
 * Get tenant by namespace
 */
router.get(
  '/namespace/:namespace',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { namespace } = req.params;
      const tenant = await tenantManager.getTenantByNamespace(namespace);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/tenants/:id
 * Update tenant
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = UpdateTenantSchema.parse(req.body);

    const tenant = await tenantManager.updateTenant(id, validated);

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
      return;
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/tenants/:id/suspend
 * Suspend tenant
 */
router.post(
  '/:id/suspend',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const tenant = await tenantManager.suspendTenant(id, reason);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant suspended'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/tenants/:id/activate
 * Activate tenant
 */
router.post(
  '/:id/activate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const tenant = await tenantManager.activateTenant(id);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant activated'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/tenants/:id/tier
 * Update tenant tier
 */
router.post(
  '/:id/tier',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { tier } = req.body;

      if (!tier || !Object.values(TenantTier).includes(tier)) {
        res.status(400).json({
          success: false,
          error: 'Invalid tier'
        });
        return;
      }

      const tenant = await tenantManager.updateTier(id, tier);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      res.json({
        success: true,
        data: tenant,
        message: `Tier updated to ${tier}`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tenants/:id/quota
 * Check tenant quota
 */
router.get(
  '/:id/quota/:metric',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, metric } = req.params;
      const { value } = req.query;

      const allowedMetrics = [
        'eventsPerMonth',
        'memoryStorageMB',
        'apiCallsPerDay',
        'workflows',
        'agents',
        'users'
      ];

      if (!allowedMetrics.includes(metric)) {
        res.status(400).json({
          success: false,
          error: `Invalid metric. Allowed: ${allowedMetrics.join(', ')}`
        });
        return;
      }

      const result = await tenantManager.checkQuota(
        id,
        metric as any,
        parseInt(value as string) || 0
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
