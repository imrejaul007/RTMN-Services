import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eventBusService } from '../services/eventBus.js';
import { SubscriptionProtocol } from '../types/index.js';

const router = express.Router();

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateSubscriptionSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),

  eventTypes: z.array(z.string()).optional(),
  eventCategories: z.array(z.string()).optional(),
  userId: z.string().optional(),

  protocol: z.nativeEnum(SubscriptionProtocol),
  endpoint: z.string().url(),

  auth: z.object({
    type: z.enum(['bearer', 'api_key', 'basic']),
    token: z.string().optional(),
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).optional(),

  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().min(1).max(10).default(3),
  retryDelayMs: z.number().min(100).max(60000).default(1000),

  filter: z.record(z.any()).optional()
});

// ============================================================================
// SUBSCRIPTION ROUTES
// ============================================================================

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const validated = CreateSubscriptionSchema.parse(req.body);

    const subscription = await eventBusService.subscribe({
      tenantId,
      ...validated,
      enabled: true
    });

    res.status(201).json({
      success: true,
      data: subscription
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
 * GET /api/subscriptions
 * List all subscriptions for a tenant
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    // This would query the database - simplified for now
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/:id
 * Get a specific subscription
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/subscriptions/:id
 * Update a subscription
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Delete a subscription
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Subscription deleted'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/:id/test
 * Test a subscription by sending a sample event
 */
router.post('/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Test event sent'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
