import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { rankingService, RankRequest } from '../services/rankingService';
import logger from '../utils/logger';

const log = logger.child({ service: 'RankRoutes' });
const router = Router();

// Validation schemas
const rankItemSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().required(),
  score: Joi.number().min(0).max(1).optional(),
  features: Joi.object().pattern(Joi.string(), Joi.number()).default({})
});

const rankRequestSchema = Joi.object({
  experimentId: Joi.string().optional(),
  userId: Joi.string().required(),
  context: Joi.object({
    location: Joi.string().optional(),
    device: Joi.string().optional(),
    timeOfDay: Joi.string().optional()
  }).optional(),
  items: Joi.array().items(rankItemSchema).min(1).required(),
  options: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    diversity: Joi.number().min(0).max(1).default(0.3),
    personalization: Joi.number().min(0).max(1).default(0.5)
  }).optional()
});

const batchRankRequestSchema = Joi.object({
  requests: Joi.array().items(rankRequestSchema).min(1).max(50).required()
});

// Middleware for validating rank requests
const validateRankRequest = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = rankRequestSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  req.body = value;
  next();
};

const validateBatchRequest = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = batchRankRequestSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  req.body = value;
  next();
};

// POST /rank - Rank items
router.post('/rank', validateRankRequest, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const request: RankRequest = req.body;

    const result = await rankingService.rank(request);

    const latencyMs = Date.now() - startTime;

    // Log ranking request
    log.info('Rank request completed', {
      userId: request.userId,
      experimentId: request.experimentId,
      inputItems: request.items.length,
      outputItems: result.ranked.length,
      latencyMs,
      selfLatencyMs: result.latencyMs
    });

    res.json({
      success: true,
      data: result,
      meta: {
        latencyMs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Rank request failed', { error, body: req.body });
    res.status(500).json({
      error: 'Ranking failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /rank/batch - Batch ranking
router.post('/rank/batch', validateBatchRequest, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { requests } = req.body as { requests: RankRequest[] };

    const results = await rankingService.batchRank(requests);

    const latencyMs = Date.now() - startTime;

    log.info('Batch rank request completed', {
      requestCount: requests.length,
      totalItems: requests.reduce((sum, r) => sum + r.items.length, 0),
      latencyMs
    });

    res.json({
      success: true,
      data: results,
      meta: {
        latencyMs,
        requestCount: requests.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Batch rank request failed', { error });
    res.status(500).json({
      error: 'Batch ranking failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /rank/:experimentId/results - Get experiment results
router.get('/rank/:experimentId/results', async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    // This would return ranking results from a specific experiment
    // For now, return a placeholder structure
    const results = {
      experimentId,
      totalRankings: 0,
      topItems: [] as Array<{ itemId: string; avgPosition: number; impressions: number }>,
      variantPerformance: {} as Record<string, { impressions: number; ctr: number }>
    };

    res.json({
      success: true,
      data: results,
      meta: {
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('Get experiment results failed', { error, experimentId: req.params.experimentId });
    res.status(500).json({
      error: 'Failed to get experiment results',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
