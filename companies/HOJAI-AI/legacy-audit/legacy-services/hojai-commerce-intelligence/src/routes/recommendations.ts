/**
 * HOJAI Commerce Intelligence - Recommendation Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { recommendationService } from '../services/recommendationService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const RecommendationRequestSchema = z.object({
  type: z.enum(['personalized', 'trending', 'similar', 'frequently_bought', 'complementary', 'cross_sell', 'upsell']),
  productId: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
  context: z.object({
    trigger: z.enum(['home', 'product', 'cart', 'checkout', 'search', 'wishlist']).optional(),
    category: z.string().optional()
  }).optional()
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/recommendations/:userId
 * Get personalized recommendations for a user
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;
    const type = (req.query.type as string) || 'personalized';
    const limit = parseInt(req.query.limit as string) || 10;
    const trigger = req.query.trigger as string | undefined;

    const validTypes = ['personalized', 'trending', 'similar', 'frequently_bought', 'complementary', 'cross_sell', 'upsell'];
    if (!validTypes.includes(type)) {
      return res.status(400).json(createErrorResponse(
        'INVALID_TYPE',
        `Recommendation type must be one of: ${validTypes.join(', ')}`
      ));
    }

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: type as any,
      limit,
      context: trigger ? { trigger: trigger as any } : undefined
    });

    res.json(createResponse({
      userId,
      type,
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:userId/personalized
 * Get personalized recommendations
 */
router.get('/:userId/personalized', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const trigger = req.query.trigger as string | undefined;
    const category = req.query.category as string | undefined;

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: 'personalized',
      limit,
      context: { trigger: trigger as any, category }
    });

    res.json(createResponse({
      userId,
      type: 'personalized',
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:userId/trending
 * Get trending products
 */
router.get('/:userId/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string | undefined;

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: 'trending',
      limit,
      context: { trigger: 'home', category }
    });

    res.json(createResponse({
      userId,
      type: 'trending',
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:userId/similar/:productId
 * Get similar products
 */
router.get('/:userId/similar/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId, productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: 'similar',
      productId,
      limit
    });

    res.json(createResponse({
      userId,
      productId,
      type: 'similar',
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:userId/frequently-bought/:productId
 * Get frequently bought together products
 */
router.get('/:userId/frequently-bought/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId, productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: 'frequently_bought',
      productId,
      limit
    });

    res.json(createResponse({
      userId,
      productId,
      type: 'frequently_bought',
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:userId/complementary/:productId
 * Get complementary products
 */
router.get('/:userId/complementary/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId, productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: 'complementary',
      productId,
      limit
    });

    res.json(createResponse({
      userId,
      productId,
      type: 'complementary',
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:userId/cross-sell
 * Get cross-sell recommendations
 */
router.get('/:userId/cross-sell', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: 'cross_sell',
      limit
    });

    res.json(createResponse({
      userId,
      type: 'cross_sell',
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:userId/upsell
 * Get upsell recommendations
 */
router.get('/:userId/upsell', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getRecommendations({
      tenantId,
      userId,
      type: 'upsell',
      limit
    });

    res.json(createResponse({
      userId,
      type: 'upsell',
      count: recommendations.length,
      recommendations
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/recommendations/products/:productId/related
 * Update product related products
 */
router.post('/products/:productId/related', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { productId } = req.params;

    const { relatedProducts, frequentlyBoughtTogether, similarProducts, complementaryProducts } = req.body;

    if (!relatedProducts && !frequentlyBoughtTogether && !similarProducts && !complementaryProducts) {
      return res.status(400).json(createErrorResponse(
        'MISSING_DATA',
        'At least one product relationship array is required'
      ));
    }

    await recommendationService.updateProductRecommendations(tenantId, productId, {
      relatedProducts,
      frequentlyBoughtTogether,
      similarProducts,
      complementaryProducts
    });

    res.json(createResponse({
      productId,
      updated: true
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
