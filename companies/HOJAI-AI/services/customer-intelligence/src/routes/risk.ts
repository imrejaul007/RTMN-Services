import { Router, Request, Response } from 'express';
import { riskScoringService } from '../services/riskScoring';
import { Customer } from '../models/Customer';
import { RiskEvent } from '../models/RiskEvent';
import { asyncHandler } from '../utils/helpers';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/risk/score/:customerId
 * Get risk score for a customer
 */
router.get('/score/:customerId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await riskScoringService.calculateRiskScore(req.params.customerId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: (error as Error).message
    });
  }
}));

/**
 * POST /api/risk/calculate
 * Calculate risk score for a customer
 */
router.post('/calculate', asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.body;

  if (!customerId) {
    res.status(400).json({
      success: false,
      error: 'customerId is required'
    });
    return;
  }

  const result = await riskScoringService.calculateRiskScore(customerId);

  logger.info('Risk score calculated', { customerId, overall: result.overall });

  res.json({
    success: true,
    data: result
  });
}));

/**
 * POST /api/risk/batch-calculate
 * Batch calculate risk scores
 */
router.post('/batch-calculate', asyncHandler(async (req: Request, res: Response) => {
  const { customerIds } = req.body;

  if (!customerIds || !Array.isArray(customerIds)) {
    res.status(400).json({
      success: false,
      error: 'customerIds array is required'
    });
    return;
  }

  const results = await riskScoringService.batchCalculateRiskScores(customerIds);

  res.json({
    success: true,
    data: results,
    processed: results.length
  });
}));

/**
 * GET /api/risk/distribution
 * Get risk distribution across all customers
 */
router.get('/distribution', asyncHandler(async (_req: Request, res: Response) => {
  const distribution = await riskScoringService.getRiskDistribution();
  const total = distribution.critical + distribution.high +
    distribution.medium + distribution.low + distribution.unknown;

  res.json({
    success: true,
    data: {
      distribution,
      total,
      percentages: {
        critical: total > 0 ? Math.round((distribution.critical / total) * 10000) / 100 : 0,
        high: total > 0 ? Math.round((distribution.high / total) * 10000) / 100 : 0,
        medium: total > 0 ? Math.round((distribution.medium / total) * 10000) / 100 : 0,
        low: total > 0 ? Math.round((distribution.low / total) * 10000) / 100 : 0,
        unknown: total > 0 ? Math.round((distribution.unknown / total) * 10000) / 100 : 0
      }
    }
  });
}));

/**
 * GET /api/risk/high-risk
 * Get all high-risk customers
 */
router.get('/high-risk', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;

  const [critical, high] = await Promise.all([
    riskScoringService.getCustomersByRiskLevel('critical'),
    riskScoringService.getCustomersByRiskLevel('high')
  ]);

  const customers = [...critical, ...high].slice(0, limit);

  res.json({
    success: true,
    data: customers.map(c => ({
      customerId: c.customerId,
      fullName: c.getFullName(),
      email: c.email,
      riskScore: c.riskScore,
      status: c.status
    })),
    counts: {
      critical: critical.length,
      high: high.length
    }
  });
}));

/**
 * GET /api/risk/events/:customerId
 * Get risk events for a customer
 */
router.get('/events/:customerId', asyncHandler(async (req: Request, res: Response) => {
  const events = await RiskEvent.findByCustomerId(req.params.customerId);

  res.json({
    success: true,
    data: events
  });
}));

/**
 * POST /api/risk/events
 * Create a risk event
 */
router.post('/events', asyncHandler(async (req: Request, res: Response) => {
  const { customerId, eventType, severity, details, source } = req.body;

  if (!customerId || !eventType || !severity) {
    res.status(400).json({
      success: false,
      error: 'customerId, eventType, and severity are required'
    });
    return;
  }

  const event = await RiskEvent.createEvent(
    customerId,
    eventType,
    severity,
    details || {},
    source || 'api'
  );

  // Recalculate risk score
  try {
    await riskScoringService.calculateRiskScore(customerId);
  } catch (error) {
    logger.warn('Failed to recalculate risk score after event creation', {
      customerId,
      error: (error as Error).message
    });
  }

  logger.info('Risk event created', { customerId, eventType, severity });

  res.status(201).json({
    success: true,
    data: event
  });
}));

/**
 * POST /api/risk/events/:eventId/resolve
 * Resolve a risk event
 */
router.post('/events/:eventId/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { resolvedBy, resolution } = req.body;

  if (!resolvedBy || !resolution) {
    res.status(400).json({
      success: false,
      error: 'resolvedBy and resolution are required'
    });
    return;
  }

  const event = await RiskEvent.resolveEvent(req.params.eventId, resolvedBy, resolution);

  if (!event) {
    res.status(404).json({
      success: false,
      error: 'Risk event not found'
    });
    return;
  }

  logger.info('Risk event resolved', { eventId: req.params.eventId });

  res.json({
    success: true,
    data: event
  });
}));

/**
 * GET /api/risk/trends
 * Get risk event trends
 */
router.get('/trends', asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;

  const [trend, recent] = await Promise.all([
    RiskEvent.getRiskTrend(days),
    RiskEvent.getRecentHighSeverityEvents(24)
  ]);

  res.json({
    success: true,
    data: {
      trend,
      recentHighSeverity: recent
    }
  });
}));

export default router;
