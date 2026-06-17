import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { DecisionMaker } from '../services/decisionMaker';
import { DecisionRequest, DecisionType, PriorityLevel, CustomerTier, ApiResponse, DecisionResult, BatchDecisionRequest, BatchDecisionResult } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const CustomerSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tier: z.enum(['standard', 'silver', 'gold', 'platinum', 'vip']),
  lifetimeValue: z.number().min(0),
  accountAge: z.number().min(0),
  previousInteractions: z.number().min(0),
  previousRefunds: z.number().min(0),
  previousDisputes: z.number().min(0),
  satisfactionScore: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional()
});

const TransactionSchema = z.object({
  id: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  type: z.string(),
  date: z.string().datetime().or(z.date()),
  items: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
    category: z.string().optional()
  })).optional(),
  metadata: z.record(z.unknown()).optional()
});

const ContextSchema = z.object({
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  channel: z.enum(['web', 'mobile', 'phone', 'in_store', 'api']).optional(),
  agentId: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional()
});

const DecisionRequestSchema = z.object({
  tenantId: z.string().min(1),
  type: z.enum(['refund', 'cancel', 'discount', 'escalate', 'policy_exception']),
  customer: CustomerSchema,
  transaction: TransactionSchema.optional(),
  reason: z.string().min(1).max(1000),
  requestedAmount: z.number().min(0).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent', 'critical']).default('normal'),
  factors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['customer', 'transaction', 'history', 'business', 'risk', 'value']),
    weight: z.number().min(0).max(100),
    value: z.union([z.number(), z.string(), z.boolean()]),
    score: z.number().optional(),
    metadata: z.record(z.unknown()).optional()
  })).optional(),
  context: ContextSchema.optional(),
  metadata: z.record(z.unknown()).optional()
});

const BatchDecisionRequestSchema = z.object({
  tenantId: z.string().min(1),
  requests: z.array(DecisionRequestSchema.omit({ tenantId: true })).min(1).max(100),
  strategy: z.enum(['parallel', 'sequential']).default('parallel'),
  failFast: z.boolean().default(false)
});

/**
 * POST /api/decide
 * Make a single decision
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // Validate request
    const validationResult = DecisionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.issues
        },
        meta: {
          timestamp: new Date(),
          requestId
        }
      };
      return res.status(400).json(response);
    }

    const request: DecisionRequest = validationResult.data;

    logger.info(`Received decision request`, {
      requestId,
      tenantId: request.tenantId,
      type: request.type
    });

    // Create decision maker and make decision
    const decisionMaker = new DecisionMaker(request.tenantId);
    const result = await decisionMaker.makeDecision(request);

    const totalTime = Date.now() - startTime;
    logger.info(`Decision completed`, {
      requestId,
      outcome: result.outcome,
      processingTime: result.processingTime,
      totalTime
    });

    const response: ApiResponse<DecisionResult> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        requestId
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Decision request failed`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DECISION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to make decision'
      },
      meta: {
        timestamp: new Date(),
        requestId
      }
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/decide/batch
 * Make multiple decisions
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  const batchId = uuidv4();
  const startTime = Date.now();

  try {
    // Validate request
    const validationResult = BatchDecisionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.issues
        },
        meta: {
          timestamp: new Date(),
          requestId: batchId
        }
      };
      return res.status(400).json(response);
    }

    const batchRequest: BatchDecisionRequest = validationResult.data;

    logger.info(`Received batch decision request`, {
      batchId,
      tenantId: batchRequest.tenantId,
      requestCount: batchRequest.requests.length,
      strategy: batchRequest.strategy
    });

    const results: DecisionResult[] = [];
    let failed = 0;

    if (batchRequest.strategy === 'parallel') {
      // Process in parallel
      const promises = batchRequest.requests.map(async (request) => {
        try {
          const decisionMaker = new DecisionMaker(batchRequest.tenantId);
          const fullRequest: DecisionRequest = {
            ...request,
            tenantId: batchRequest.tenantId
          };
          return await decisionMaker.makeDecision(fullRequest);
        } catch (error) {
          failed++;
          if (batchRequest.failFast) {
            throw error;
          }
          return null;
        }
      });

      const resolved = await Promise.all(promises);
      results.push(...resolved.filter((r): r is DecisionResult => r !== null));

    } else {
      // Process sequentially
      for (const request of batchRequest.requests) {
        try {
          const decisionMaker = new DecisionMaker(batchRequest.tenantId);
          const fullRequest: DecisionRequest = {
            ...request,
            tenantId: batchRequest.tenantId
          };
          const result = await decisionMaker.makeDecision(fullRequest);
          results.push(result);

          if (batchRequest.failFast && result.outcome === 'denied') {
            logger.info(`Fail-fast triggered`, { batchId });
            break;
          }
        } catch (error) {
          failed++;
          if (batchRequest.failFast) {
            logger.error(`Sequential fail-fast triggered`, {
              batchId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            break;
          }
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const batchResult: BatchDecisionResult = {
      batchId,
      results,
      summary: {
        total: batchRequest.requests.length,
        successful: results.length,
        failed,
        processingTime: totalTime
      }
    };

    logger.info(`Batch decision completed`, {
      batchId,
      successful: results.length,
      failed,
      totalTime
    });

    const response: ApiResponse<BatchDecisionResult> = {
      success: true,
      data: batchResult,
      meta: {
        timestamp: new Date(),
        requestId: batchId
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Batch decision request failed`, {
      batchId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'BATCH_DECISION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process batch'
      },
      meta: {
        timestamp: new Date(),
        requestId: batchId
      }
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/decide/simulate
 * Simulate a decision without persisting
 */
router.post('/simulate', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const validationResult = DecisionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.issues
        },
        meta: {
          timestamp: new Date(),
          requestId
        }
      };
      return res.status(400).json(response);
    }

    const request: DecisionRequest = validationResult.data;

    logger.info(`Simulating decision`, {
      requestId,
      tenantId: request.tenantId,
      type: request.type
    });

    // Create decision maker and simulate
    const decisionMaker = new DecisionMaker(request.tenantId);
    const result = await decisionMaker.makeDecision(request);

    // Mark as simulation in metadata
    result.metadata = {
      ...result.metadata,
      simulated: true
    };

    const response: ApiResponse<DecisionResult> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        requestId
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Simulation request failed`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SIMULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to simulate decision'
      },
      meta: {
        timestamp: new Date(),
        requestId
      }
    };

    res.status(500).json(response);
  }
});

export default router;
