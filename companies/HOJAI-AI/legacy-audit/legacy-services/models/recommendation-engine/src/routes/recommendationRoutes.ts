/**
 * HOJAI AI Recommendation Engine - API Routes
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import {
  getRecommendationsByType,
  getSimilarItems,
  getTrendingRecommendations,
  getPersonalizedRecommendations,
  recordUserPurchase,
} from '../services/recommendationService.js';
import { getDataStats } from '../services/dataStore.js';
import { logger } from '../utils/logger.js';
import type {
  RecommendationType,
  RecommendationResponse,
  ApiResponse,
  HealthResponse,
} from '../types/index.js';

// Create router
const router = Router();

// Request validation schemas
const recommendationRequestSchema = z.object({
  userId: z.string().optional(),
  productId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  type: z.enum(['personalized', 'trending', 'similar', 'frequently-bought']).optional().default('personalized'),
});

const similarItemsRequestSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const trendingRequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  category: z.string().optional(),
  timeframe: z.coerce.number().int().min(1).max(30).optional().default(7),
});

const purchaseRequestSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  productId: z.string().min(1, 'productId is required'),
  quantity: z.coerce.number().int().min(1).optional().default(1),
});

/**
 * POST /api/recommend
 * Get recommendations based on request parameters
 */
router.post('/recommend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = recommendationRequestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map(e => e.message).join(', '),
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>);
      return;
    }

    const { userId, productId, limit, type } = validation.data;

    const items = await getRecommendationsByType(
      type as RecommendationType,
      userId,
      productId,
      limit
    );

    const response: RecommendationResponse = {
      items,
      type: type as RecommendationType,
      generatedAt: new Date().toISOString(),
    };

    logger.info(`Generated ${items.length} recommendations of type ${type}`);

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<RecommendationResponse>);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommend/:userId
 * Get personalized recommendations for a specific user
 */
router.get('/recommend/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const type = (req.query.type as RecommendationType) || 'personalized';

    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userId is required',
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>);
      return;
    }

    let items;

    if (type === 'trending') {
      items = await getTrendingRecommendations(limit);
    } else if (type === 'personalized') {
      items = await getPersonalizedRecommendations(userId, limit);
    } else {
      items = await getRecommendationsByType(type, userId, undefined, limit);
    }

    const response: RecommendationResponse = {
      items,
      type,
      generatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<RecommendationResponse>);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/trending
 * Get trending items
 */
router.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = trendingRequestSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map(e => e.message).join(', '),
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>);
      return;
    }

    const { limit, category } = validation.data;

    const items = await getTrendingRecommendations(limit, category);

    const response: RecommendationResponse = {
      items,
      type: 'trending',
      generatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<RecommendationResponse>);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/similar
 * Get similar items for a product
 */
router.post('/similar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = similarItemsRequestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map(e => e.message).join(', '),
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>);
      return;
    }

    const { productId, limit } = validation.data;

    const items = await getSimilarItems(productId, limit);

    const response: RecommendationResponse = {
      items,
      type: 'similar',
      generatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<RecommendationResponse>);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/purchase
 * Record a purchase (for training the recommendation model)
 */
router.post('/purchase', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = purchaseRequestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map(e => e.message).join(', '),
        },
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<never>);
      return;
    }

    const { userId, productId, quantity } = validation.data;

    recordUserPurchase(userId, productId, quantity);

    res.json({
      success: true,
      data: {
        message: 'Purchase recorded successfully',
        userId,
        productId,
        quantity,
      },
      timestamp: new Date().toISOString(),
    } satisfies ApiResponse<{ message: string; userId: string; productId: string; quantity: number }>);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stats
 * Get data store statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  const stats = getDataStats();

  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse<ReturnType<typeof getDataStats>>);
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  const health: HealthResponse = {
    status: 'healthy',
    version: '1.0.0',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    checks: {
      memory: memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9,
      data: true,
    },
  };

  // Mark as unhealthy if memory is critically low
  if (memoryUsage.heapUsed > memoryUsage.heapTotal * 0.9) {
    health.status = 'unhealthy';
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

export default router;
