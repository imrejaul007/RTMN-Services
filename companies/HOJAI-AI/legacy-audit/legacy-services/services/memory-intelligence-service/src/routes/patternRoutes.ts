// Pattern Routes - Pattern detection

import { Router, Request, Response, NextFunction } from 'express';
import { patternDetectionService } from '../services/patternDetectionService.js';
import { customerMemoryService } from '../services/customerMemoryService.js';
import { logger } from '../utils/logger.js';

export const patternRoutes = Router();

/**
 * GET /api/patterns/:customerId - Detect patterns
 */
patternRoutes.get('/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { days = 90, domains } = req.query;

    // Get customer events
    const journey = await customerMemoryService.getCustomerJourney(customerId, {
      startDate: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000),
      domains: domains ? (domains as string).split(',') : undefined,
      limit: 500,
    });

    const patterns = await patternDetectionService.detectPatterns(customerId, journey.events);

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/patterns/:customerId/predict - Predict next action
 */
patternRoutes.get('/:customerId/predict', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;

    const journey = await customerMemoryService.getCustomerJourney(customerId, { limit: 50 });

    const prediction = await patternDetectionService.predictNextAction(customerId, journey.events);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/patterns/analyze - Analyze multiple patterns
 */
patternRoutes.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, events } = req.body;

    if (!customerId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'customerId is required' },
      });
      return;
    }

    const patterns = await patternDetectionService.detectPatterns(customerId, events || []);

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    next(error);
  }
});
