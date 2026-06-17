import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Policy } from '../models/Policy';
import { Factor } from '../models/Factor';
import { ApiResponse, Policy as PolicyType, DecisionType, PaginationParams, PaginatedResponse } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const CreatePolicySchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  type: z.array(z.enum(['refund', 'cancel', 'discount', 'escalate', 'policy_exception'])).min(1),
  priority: z.number().min(1).max(100).default(50),
  isActive: z.boolean().default(true),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'exists']),
    value: z.unknown(),
    group: z.string().optional()
  })).default([]),
  constraints: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['amount', 'count', 'time', 'frequency']),
    operator: z.enum(['lte', 'gte', 'eq', 'between']),
    value: z.union([z.number(), z.array(z.number())]),
    period: z.string().optional()
  })).default([]),
  outcomes: z.array(z.object({
    condition: z.string(),
    outcome: z.enum(['approved', 'denied', 'escalated', 'partial', 'requires_review']),
    amount: z.union([z.number(), z.object({ min: z.number(), max: z.number() })]).optional(),
    reasoning: z.string().min(1)
  })).default([]),
  allowOverride: z.boolean().default(true),
  overrideRoles: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional()
});

const UpdatePolicySchema = CreatePolicySchema.partial().omit({ tenantId: true });

/**
 * GET /api/policies
 * List all policies for a tenant
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'MISSING_TENANT', message: 'tenantId is required' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as DecisionType | undefined;
    const isActive = req.query.isActive !== 'false';

    // Build query
    const query: Record<string, unknown> = { tenantId, isActive };
    if (type) {
      query.type = type;
    }

    // Execute query
    const skip = (page - 1) * limit;
    const [policies, total] = await Promise.all([
      Policy.find(query).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit),
      Policy.countDocuments(query)
    ]);

    const response: ApiResponse<PaginatedResponse<PolicyType>> = {
      success: true,
      data: {
        items: policies.map(p => p.toObject() as PolicyType),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to list policies`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list policies'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/policies/:policyId
 * Get a specific policy
 */
router.get('/:policyId', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const { policyId } = req.params;
    const tenantId = req.query.tenantId as string;

    const policy = await Policy.findOne({ policyId, tenantId });

    if (!policy) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<PolicyType> = {
      success: true,
      data: policy.toObject() as PolicyType,
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to get policy`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get policy'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/policies
 * Create a new policy
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const validationResult = CreatePolicySchema.safeParse(req.body);
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.issues
        },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const data = validationResult.data;
    const policyId = `${data.tenantId}:${uuidv4()}`;

    const policy = new Policy({
      ...data,
      policyId,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
      createdBy: req.headers['x-user-id'] as string || 'system'
    });

    await policy.save();

    logger.info(`Policy created`, {
      requestId,
      policyId,
      tenantId: data.tenantId,
      name: data.name
    });

    const response: ApiResponse<PolicyType> = {
      success: true,
      data: policy.toObject() as PolicyType,
      meta: { timestamp: new Date(), requestId }
    };

    res.status(201).json(response);

  } catch (error) {
    logger.error(`Failed to create policy`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create policy'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * PUT /api/policies/:policyId
 * Update a policy
 */
router.put('/:policyId', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const { policyId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'MISSING_TENANT', message: 'tenantId is required' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const validationResult = UpdatePolicySchema.safeParse(req.body);
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.issues
        },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const existingPolicy = await Policy.findOne({ policyId, tenantId });
    if (!existingPolicy) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(404).json(response);
    }

    // Store previous version
    const previousVersion = existingPolicy.version;

    // Update fields
    Object.assign(existingPolicy, validationResult.data);
    existingPolicy.previousVersion = `${policyId}:v${previousVersion}`;
    existingPolicy.updatedBy = req.headers['x-user-id'] as string || 'system';

    await existingPolicy.save();

    logger.info(`Policy updated`, {
      requestId,
      policyId,
      tenantId,
      newVersion: existingPolicy.version
    });

    const response: ApiResponse<PolicyType> = {
      success: true,
      data: existingPolicy.toObject() as PolicyType,
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to update policy`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update policy'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * DELETE /api/policies/:policyId
 * Delete a policy (soft delete by deactivating)
 */
router.delete('/:policyId', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const { policyId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'MISSING_TENANT', message: 'tenantId is required' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const policy = await Policy.findOneAndUpdate(
      { policyId, tenantId },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!policy) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(404).json(response);
    }

    logger.info(`Policy deactivated`, {
      requestId,
      policyId,
      tenantId
    });

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Policy deactivated successfully' },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to delete policy`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete policy'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/policies/:policyId/activate
 * Activate a policy
 */
router.post('/:policyId/activate', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const { policyId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'MISSING_TENANT', message: 'tenantId is required' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const policy = await Policy.findOneAndUpdate(
      { policyId, tenantId },
      { isActive: true, updatedAt: new Date() },
      { new: true }
    );

    if (!policy) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(404).json(response);
    }

    logger.info(`Policy activated`, {
      requestId,
      policyId,
      tenantId
    });

    const response: ApiResponse<PolicyType> = {
      success: true,
      data: policy.toObject() as PolicyType,
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to activate policy`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'ACTIVATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to activate policy'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/policies/seed
 * Seed default policies for a tenant
 */
router.post('/seed', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const tenantId = req.body.tenantId as string;
    if (!tenantId) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'MISSING_TENANT', message: 'tenantId is required' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    // Seed default policies
    const defaultPolicies = createDefaultPolicies(tenantId);

    for (const policyData of defaultPolicies) {
      const existingPolicy = await Policy.findOne({ policyId: policyData.policyId });
      if (!existingPolicy) {
        const policy = new Policy(policyData);
        await policy.save();
      }
    }

    // Seed default factors
    await Factor.seedDefaults(tenantId);

    logger.info(`Default policies seeded`, {
      requestId,
      tenantId,
      policyCount: defaultPolicies.length
    });

    const response: ApiResponse<{ message: string; policiesCreated: number }> = {
      success: true,
      data: {
        message: 'Default policies and factors seeded successfully',
        policiesCreated: defaultPolicies.length
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(201).json(response);

  } catch (error) {
    logger.error(`Failed to seed policies`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SEED_ERROR',
        message: error instanceof Error ? error.message : 'Failed to seed policies'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * Create default policies for a new tenant
 */
function createDefaultPolicies(tenantId: string) {
  return [
    {
      policyId: `${tenantId}:default-refund-policy`,
      tenantId,
      name: 'Standard Refund Policy',
      description: 'Default refund policy for all refund requests',
      type: ['refund'] as DecisionType[],
      priority: 50,
      isActive: true,
      conditions: [],
      constraints: [
        {
          name: 'Time Since Transaction',
          type: 'time',
          operator: 'lte' as const,
          value: 30,
          period: 'days'
        },
        {
          name: 'Amount Limit',
          type: 'amount',
          operator: 'lte' as const,
          value: 50000
        }
      ],
      outcomes: [
        {
          condition: '{}',
          outcome: 'approved' as const,
          reasoning: 'Meets all standard refund criteria'
        }
      ],
      allowOverride: true,
      createdBy: 'system',
      tags: ['default', 'refund']
    },
    {
      policyId: `${tenantId}:vip-refund-policy`,
      tenantId,
      name: 'VIP Customer Refund Policy',
      description: 'Expedited refund processing for VIP and platinum customers',
      type: ['refund'] as DecisionType[],
      priority: 80,
      isActive: true,
      conditions: [
        {
          field: 'customer.tier',
          operator: 'in' as const,
          value: ['platinum', 'vip']
        }
      ],
      constraints: [
        {
          name: 'Amount Limit',
          type: 'amount',
          operator: 'lte' as const,
          value: 100000
        }
      ],
      outcomes: [
        {
          condition: '{}',
          outcome: 'approved' as const,
          reasoning: 'VIP customer - automatic approval within limits'
        }
      ],
      allowOverride: true,
      createdBy: 'system',
      tags: ['vip', 'refund', 'premium']
    },
    {
      policyId: `${tenantId}:high-risk-refund-policy`,
      tenantId,
      name: 'High Risk Refund Policy',
      description: 'Additional review for high-risk refund requests',
      type: ['refund'] as DecisionType[],
      priority: 70,
      isActive: true,
      conditions: [
        {
          field: 'computed.isHighValue',
          operator: 'eq' as const,
          value: true
        }
      ],
      constraints: [
        {
          name: 'Amount Limit',
          type: 'amount',
          operator: 'gt' as const,
          value: 50000
        }
      ],
      outcomes: [
        {
          condition: '{}',
          outcome: 'escalated' as const,
          reasoning: 'High-value transaction requires manager approval'
        }
      ],
      allowOverride: true,
      createdBy: 'system',
      tags: ['high-risk', 'refund']
    },
    {
      policyId: `${tenantId}:default-discount-policy`,
      tenantId,
      name: 'Standard Discount Policy',
      description: 'Default policy for discount requests',
      type: ['discount'] as DecisionType[],
      priority: 50,
      isActive: true,
      conditions: [],
      constraints: [
        {
          name: 'Discount Amount',
          type: 'amount',
          operator: 'lte' as const,
          value: 10000
        }
      ],
      outcomes: [
        {
          condition: '{}',
          outcome: 'approved' as const,
          reasoning: 'Within standard discount limits'
        }
      ],
      allowOverride: true,
      createdBy: 'system',
      tags: ['default', 'discount']
    },
    {
      policyId: `${tenantId}:escalation-policy`,
      tenantId,
      name: 'Escalation Policy',
      description: 'Default policy for escalation requests',
      type: ['escalate'] as DecisionType[],
      priority: 90,
      isActive: true,
      conditions: [],
      constraints: [],
      outcomes: [
        {
          condition: '{}',
          outcome: 'escalated' as const,
          reasoning: 'Escalation requests always go to supervisor review'
        }
      ],
      allowOverride: false,
      createdBy: 'system',
      tags: ['escalation', 'default']
    }
  ];
}

export default router;
