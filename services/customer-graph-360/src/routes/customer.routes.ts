import { Router, Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service.js';
import { cache } from '../utils/redis.js';
import { logger } from '../utils/logger.js';
import type { AuthenticatedRequest } from '../middleware/index.js';
import { config } from '../config/index.js';

const router = Router();

// Validation helper
function validateUserId(req: Request, res: Response, next: NextFunction): void {
  const { userId } = req.params;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'Invalid userId parameter',
    });
    return;
  }

  next();
}

/**
 * GET /api/customer/:userId
 * Get 360 customer view
 */
router.get(
  '/:userId',
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const useCache = config.features.enableCache;

      // Try cache first
      if (useCache) {
        const cached = await cache.get(`customer:${userId}`);
        if (cached) {
          res.json({
            success: true,
            data: cached,
            cached: true,
          });
          return;
        }
      }

      // Get from service
      const customer = await customerService.getCustomer360(userId);

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
        return;
      }

      // Cache the result
      if (useCache) {
        await cache.set(`customer:${userId}`, customer, config.cache.ttl);
      }

      res.json({
        success: true,
        data: customer,
        cached: false,
      });
    } catch (error) {
      logger.error('Error getting customer:', error);
      next(error);
    }
  }
);

/**
 * POST /api/customer/:userId/sync
 * Sync customer data from all sources
 */
router.post(
  '/:userId/sync',
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      logger.info(`Starting sync for user ${userId}`);

      const result = await customerService.syncFromSources(userId);

      // Invalidate cache
      if (config.features.enableCache) {
        await cache.del(`customer:${userId}`);
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error syncing customer:', error);
      next(error);
    }
  }
);

/**
 * GET /api/customer/:userId/interactions
 * Get all interactions
 */
router.get(
  '/:userId/interactions',
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const useCache = config.features.enableCache;

      // Try cache first
      if (useCache) {
        const cached = await cache.get(`interactions:${userId}`);
        if (cached) {
          res.json({
            success: true,
            data: cached,
            cached: true,
          });
          return;
        }
      }

      const interactions = await customerService.getInteractions(userId);

      // Cache the result
      if (useCache) {
        await cache.set(`interactions:${userId}`, interactions, config.cache.ttl);
      }

      res.json({
        success: true,
        data: interactions,
        cached: false,
      });
    } catch (error) {
      logger.error('Error getting interactions:', error);
      next(error);
    }
  }
);

/**
 * GET /api/customer/:userId/purchases
 * Get purchase history
 */
router.get(
  '/:userId/purchases',
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      const purchases = await customerService.getPurchases(userId);

      // Apply pagination
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      res.json({
        success: true,
        data: {
          orders: purchases.orders.slice(offsetNum, offsetNum + limitNum),
          total: purchases.total,
          totalSpent: purchases.totalSpent,
          limit: limitNum,
          offset: offsetNum,
        },
      });
    } catch (error) {
      logger.error('Error getting purchases:', error);
      next(error);
    }
  }
);

/**
 * GET /api/customer/:userId/preferences
 * Get preferences
 */
router.get(
  '/:userId/preferences',
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const preferences = await customerService.getPreferences(userId);

      if (!preferences) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
        return;
      }

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Error getting preferences:', error);
      next(error);
    }
  }
);

/**
 * GET /api/customer/:userId/segments
 * Get segment memberships
 */
router.get(
  '/:userId/segments',
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      const segments = await customerService.getSegments(userId);

      if (!segments) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
        return;
      }

      res.json({
        success: true,
        data: segments,
      });
    } catch (error) {
      logger.error('Error getting segments:', error);
      next(error);
    }
  }
);

/**
 * POST /api/customer/:userId/enrich
 * Enrich customer data with predictions
 */
router.post(
  '/:userId/enrich',
  validateUserId,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      logger.info(`Enriching customer data for user ${userId}`);

      const result = await customerService.enrichCustomerData(userId);

      // Invalidate cache after enrichment
      if (config.features.enableCache) {
        await cache.del(`customer:${userId}`);
      }

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      logger.error('Error enriching customer:', error);
      next(error);
    }
  }
);

export default router;