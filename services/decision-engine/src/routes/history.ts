import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Decision } from '../models/Decision';
import { ApiResponse, DecisionStats, DecisionOutcome, DecisionType, RiskLevel, CustomerTier, PaginatedResponse } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const QuerySchema = z.object({
  tenantId: z.string().min(1),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sortBy: z.enum(['createdAt', 'riskScore', 'valueScore', 'amount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  type: z.enum(['refund', 'cancel', 'discount', 'escalate', 'policy_exception']).optional(),
  outcome: z.enum(['approved', 'denied', 'escalated', 'partial', 'requires_review']).optional(),
  customerId: z.string().optional(),
  transactionId: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  approvalRequired: z.enum(['true', 'false']).optional()
});

/**
 * GET /api/history
 * Get decision history with filtering and pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const validationResult = QuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationResult.error.issues
        },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const params = validationResult.data;
    const page = Math.max(1, params.page);
    const limit = Math.min(Math.max(1, params.limit), 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = { tenantId: params.tenantId };

    if (params.type) {
      query.type = params.type;
    }

    if (params.outcome) {
      query.outcome = params.outcome;
    }

    if (params.customerId) {
      query.customerId = params.customerId;
    }

    if (params.transactionId) {
      query.transactionId = params.transactionId;
    }

    if (params.riskLevel) {
      query.riskLevel = params.riskLevel;
    }

    if (params.approvalRequired !== undefined) {
      query.approvalRequired = params.approvalRequired === 'true';
    }

    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(params.endDate);
      }
    }

    // Execute query
    const [decisions, total] = await Promise.all([
      Decision.find(query)
        .sort({ [params.sortBy]: params.sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Decision.countDocuments(query)
    ]);

    const response: ApiResponse<PaginatedResponse<typeof decisions>> = {
      success: true,
      data: {
        items: decisions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to get decision history`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'QUERY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get history'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/history/:decisionId
 * Get a specific decision
 */
router.get('/:decisionId', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const { decisionId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'MISSING_TENANT', message: 'tenantId is required' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(400).json(response);
    }

    const decision = await Decision.findOne({ tenantId }).or([
      { requestId: decisionId },
      { _id: decisionId }
    ]).lean();

    if (!decision) {
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Decision not found' },
        meta: { timestamp: new Date(), requestId }
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof decision> = {
      success: true,
      data: decision,
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to get decision`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get decision'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/history/stats
 * Get decision statistics
 */
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
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

    // Parse date range
    const days = parseInt(req.query.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Aggregate statistics
    const stats = await Decision.aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                approved: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'approved'] }, 1, 0] }
                },
                denied: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'denied'] }, 1, 0] }
                },
                escalated: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'escalated'] }, 1, 0] }
                },
                partial: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'partial'] }, 1, 0] }
                },
                avgProcessingTime: { $avg: '$processingTime' }
              }
            }
          ],
          byType: [
            {
              $group: {
                _id: '$type',
                total: { $sum: 1 },
                approved: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'approved'] }, 1, 0] }
                },
                denied: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'denied'] }, 1, 0] }
                },
                avgAmount: { $avg: '$amount' }
              }
            }
          ],
          byOutcome: [
            {
              $group: {
                _id: '$outcome',
                count: { $sum: 1 }
              }
            }
          ],
          riskDistribution: [
            {
              $group: {
                _id: '$riskLevel',
                count: { $sum: 1 }
              }
            }
          ],
          tierDistribution: [
            {
              $group: {
                _id: '$customerTier',
                count: { $sum: 1 },
                avgValue: { $avg: '$valueScore' }
              }
            }
          ],
          daily: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                decisions: { $sum: 1 },
                approved: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'approved'] }, 1, 0] }
                },
                denied: {
                  $sum: { $cond: [{ $eq: ['$outcome', 'denied'] }, 1, 0] }
                }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);

    const result = stats[0];

    // Format response
    const totals = result.totals[0] || {
      total: 0,
      approved: 0,
      denied: 0,
      escalated: 0,
      partial: 0,
      avgProcessingTime: 0
    };

    const formattedStats: DecisionStats = {
      period: { start: startDate, end: endDate },
      totals: {
        decisions: totals.total,
        approved: totals.approved,
        denied: totals.denied,
        escalated: totals.escalated,
        partial: totals.partial
      },
      byType: {} as Record<DecisionType, { total: number; approved: number; denied: number; averageAmount?: number }>,
      byOutcome: {} as Record<DecisionOutcome, number>,
      averageProcessingTime: Math.round(totals.avgProcessingTime || 0),
      riskDistribution: {} as Record<RiskLevel, number>,
      customerTierDistribution: {} as Record<CustomerTier, number>
    };

    // Format by type
    for (const typeStat of result.byType) {
      formattedStats.byType[typeStat._id as DecisionType] = {
        total: typeStat.total,
        approved: typeStat.approved,
        denied: typeStat.denied,
        averageAmount: typeStat.avgAmount
      };
    }

    // Format by outcome
    for (const outcomeStat of result.byOutcome) {
      formattedStats.byOutcome[outcomeStat._id as DecisionOutcome] = outcomeStat.count;
    }

    // Format risk distribution
    for (const riskStat of result.riskDistribution) {
      formattedStats.riskDistribution[riskStat._id as RiskLevel] = riskStat.count;
    }

    // Format tier distribution
    for (const tierStat of result.tierDistribution) {
      formattedStats.customerTierDistribution[tierStat._id as CustomerTier] = tierStat.count;
    }

    const response: ApiResponse<DecisionStats> = {
      success: true,
      data: formattedStats,
      meta: {
        timestamp: new Date(),
        requestId
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to get statistics`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get statistics'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/history/pending
 * Get pending approvals
 */
router.get('/approvals/pending', async (req: Request, res: Response, next: NextFunction) => {
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

    const route = req.query.route as string | undefined;

    const pending = await Decision.findPendingApprovals(tenantId, route as any)
      .sort({ priority: -1, createdAt: 1 })
      .limit(50)
      .lean();

    const response: ApiResponse<typeof pending> = {
      success: true,
      data: pending,
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to get pending approvals`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'QUERY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get pending approvals'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/history/customer/:customerId
 * Get decisions for a specific customer
 */
router.get('/customer/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();

  try {
    const { customerId } = req.params;
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

    const [decisions, total] = await Promise.all([
      Decision.findByCustomer(tenantId, customerId, page, limit).lean(),
      Decision.countDocuments({ tenantId, customerId })
    ]);

    const response: ApiResponse<PaginatedResponse<typeof decisions>> = {
      success: true,
      data: {
        items: decisions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error(`Failed to get customer decisions`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'QUERY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get customer decisions'
      },
      meta: { timestamp: new Date(), requestId }
    };

    res.status(500).json(response);
  }
});

export default router;
