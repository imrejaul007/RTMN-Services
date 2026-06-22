import { createLogger } from '@rtmn/shared/lib/logger';

const logger = createLogger('sada-os-trust');
/**
 * SADA - Trust Service Module
 *
 * Comprehensive trust tracking with behavioral analysis
 */

import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { TrustScore, TrustHistory, TrustRelationship } from '../models/trustScore.js';

const router = Router();

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'TR'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

/**
 * Calculate trust score from history
 */
function calculateTrustScore(history: any): any {
  const { totalTransactions, successfulTransactions, failedTransactions, disputedTransactions } = history;
  const total = totalTransactions || 0;
  const successful = successfulTransactions || 0;
  const failed = failedTransactions || 0;
  const disputed = disputedTransactions || 0;

  // Success rate
  const successRate = total > 0 ? successful / total : 0.5;

  // Reliability dimension (based on success rate)
  const reliability = Math.round(successRate * 100);

  // Quality dimension (based on dispute rate)
  const disputeRate = total > 0 ? disputed / total : 0;
  const quality = Math.round((1 - disputeRate * 5) * 100);

  // Compliance dimension (based on failures)
  const failureRate = total > 0 ? failed / total : 0;
  const compliance = Math.round((1 - failureRate * 3) * 100);

  // Overall score
  const overall = Math.round(
    reliability * 0.35 +
    quality * 0.25 +
    compliance * 0.2 +
    50 * 0.2 // Base score contribution
  );

  return {
    reliability: Math.max(0, Math.min(100, reliability)),
    quality: Math.max(0, Math.min(100, quality)),
    compliance: Math.max(0, Math.min(100, compliance)),
    overall: Math.max(0, Math.min(100, overall)),
  };
}

/**
 * Determine risk level from scores
 */
function determineRiskLevel(overallScore: number): string {
  if (overallScore >= 80) return 'LOW';
  if (overallScore >= 60) return 'MEDIUM';
  if (overallScore >= 40) return 'HIGH';
  return 'CRITICAL';
}

// ============================================================================
// TRUST ENDPOINTS
// ============================================================================

/**
 * Create or get trust score
 * POST /trust
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, initialScore } = req.body;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'entityId required' },
      });
    }

    // Check existing
    let trust = await TrustScore.findOne({ entityId }).lean();

    if (!trust) {
      // Create new
      trust = new TrustScore({
        trustId: generateId('TRUST'),
        entityId,
        entityType: entityType || 'HUMAN',
        overallScore: initialScore || 50,
        dimensions: {
          reliability: initialScore || 50,
          quality: initialScore || 50,
          responsiveness: initialScore || 50,
          safety: initialScore || 50,
          compliance: initialScore || 50,
          financial: 50,
          technical: 50,
          social: 50,
        },
        history: {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          disputedTransactions: 0,
          totalVolume: 0,
          avgResponseTime: 0,
          lastActivity: new Date(),
          firstActivity: new Date(),
        },
        riskLevel: 'MEDIUM',
        status: 'ACTIVE',
      });
      await trust.save();
    }

    res.json({
      success: true,
      data: trust,
    });
  } catch (error: any) {
    logger.error('Trust creation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get trust score
 * GET /trust/:entityId
 */
router.get('/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    const trust = await TrustScore.findOne({ entityId }).lean();

    if (!trust) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trust score not found' },
      });
    }

    res.json({
      success: true,
      data: trust,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Record activity and update trust
 * POST /trust/:entityId/activity
 */
router.post('/:entityId/activity', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { type, success, amount, responseTime, quality } = req.body;

    const trust = await TrustScore.findOne({ entityId });
    if (!trust) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trust score not found' },
      });
    }

    // Update history
    trust.history.totalTransactions++;
    if (success) {
      trust.history.successfulTransactions++;
    } else {
      trust.history.failedTransactions++;
    }
    if (amount) trust.history.totalVolume += amount;
    if (responseTime) {
      trust.history.avgResponseTime =
        (trust.history.avgResponseTime * (trust.history.totalTransactions - 1) + responseTime) /
        trust.history.totalTransactions;
    }
    trust.history.lastActivity = new Date();

    // Recalculate dimensions
    const scores = calculateTrustScore(trust.history);
    trust.dimensions.reliability = scores.reliability;
    trust.dimensions.quality = scores.quality;
    trust.dimensions.compliance = scores.compliance;
    trust.overallScore = scores.overall;
    trust.riskLevel = determineRiskLevel(scores.overall);

    // Update responsiveness based on response time
    if (responseTime) {
      if (responseTime < 1000) trust.dimensions.responsiveness = 90;
      else if (responseTime < 5000) trust.dimensions.responsiveness = 75;
      else if (responseTime < 30000) trust.dimensions.responsiveness = 60;
      else trust.dimensions.responsiveness = 40;
    }

    // Update quality dimension if provided
    if (quality !== undefined) {
      trust.dimensions.quality = Math.round(
        trust.dimensions.quality * 0.9 + quality * 10
      );
    }

    await trust.save();

    // Record in history
    const historyEntry = new TrustHistory({
      historyId: generateId('THIST'),
      trustId: trust.trustId,
      entityId,
      overallScore: trust.overallScore,
      dimensions: trust.dimensions,
      riskLevel: trust.riskLevel,
      event: {
        type: 'TRANSACTION',
        transactionId: generateId('TXN'),
        previousScore: trust.overallScore - 1,
        newScore: trust.overallScore,
        reason: success ? 'Successful transaction' : 'Failed transaction',
      },
    });
    await historyEntry.save();

    res.json({
      success: true,
      data: {
        entityId,
        overallScore: trust.overallScore,
        riskLevel: trust.riskLevel,
        history: trust.history,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get trust history
 * GET /trust/:entityId/history
 */
router.get('/:entityId/history', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { limit = 50 } = req.query;

    const history = await TrustHistory.find({ entityId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json({
      success: true,
      data: {
        items: history,
        total: history.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get trust trends
 * GET /trust/:entityId/trends
 */
router.get('/:entityId/trends', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get last 30 days of history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const history = await TrustHistory.find({
      entityId,
      createdAt: { $gte: thirtyDaysAgo },
    }).sort({ createdAt: 1 }).lean();

    // Calculate trends
    const trend = {
      overall: {
        start: history[0]?.overallScore || 50,
        end: history[history.length - 1]?.overallScore || 50,
        change: (history[history.length - 1]?.overallScore || 50) - (history[0]?.overallScore || 50),
      },
      dataPoints: history.length,
      direction: 'stable' as string,
    };

    if (trend.overall.change > 5) trend.direction = 'improving';
    else if (trend.overall.change < -5) trend.direction = 'declining';

    // Calculate volatility
    if (history.length > 1) {
      const scores = history.map(h => h.overallScore);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
      trend.direction = Math.sqrt(variance) > 10 ? 'volatile' : trend.direction;
    }

    res.json({
      success: true,
      data: trend,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Bulk update trust scores
 * POST /trust/bulk
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'updates array required' },
      });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    for (const update of updates) {
      try {
        const trust = await TrustScore.findOne({ entityId: update.entityId });
        if (!trust) {
          results.skipped++;
          continue;
        }

        // Apply updates
        if (update.overallScore !== undefined) trust.overallScore = update.overallScore;
        if (update.dimensions) Object.assign(trust.dimensions, update.dimensions);
        if (update.riskLevel) trust.riskLevel = update.riskLevel;

        await trust.save();
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get trust leaderboard
 * GET /trust/leaderboard
 */
router.get('/leaderboard/all', async (req: Request, res: Response) => {
  try {
    const { entityType, limit = 20 } = req.query;

    const filter: any = { status: 'ACTIVE' };
    if (entityType) filter.entityType = entityType;

    const leaders = await TrustScore.find(filter)
      .sort({ overallScore: -1 })
      .limit(parseInt(limit as string))
      .select('entityId entityType overallScore riskLevel verification.level')
      .lean();

    res.json({
      success: true,
      data: {
        items: leaders,
        total: leaders.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Update trust dimensions
 * PATCH /trust/:entityId/dimensions
 */
router.patch('/:entityId/dimensions', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const dimensions = req.body;

    const trust = await TrustScore.findOneAndUpdate(
      { entityId },
      {
        $set: {
          dimensions: { ...dimensions },
          'metadata.lastCalculation': new Date(),
        },
      },
      { new: true }
    );

    if (!trust) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trust score not found' },
      });
    }

    // Recalculate overall
    trust.overallScore = Math.round(
      (trust.dimensions.reliability * 0.35 +
       trust.dimensions.quality * 0.25 +
       trust.dimensions.responsiveness * 0.15 +
       trust.dimensions.safety * 0.1 +
       trust.dimensions.compliance * 0.15)
    );
    trust.riskLevel = determineRiskLevel(trust.overallScore);

    await trust.save();

    res.json({
      success: true,
      data: trust,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Suspend trust score
 * POST /trust/:entityId/suspend
 */
router.post('/:entityId/suspend', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { reason } = req.body;

    const trust = await TrustScore.findOneAndUpdate(
      { entityId },
      {
        $set: {
          'status': 'SUSPENDED',
          'metadata.suspensionReason': reason,
          'metadata.suspendedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!trust) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trust score not found' },
      });
    }

    res.json({
      success: true,
      data: { entityId, status: 'SUSPENDED' },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Reactivate trust score
 * POST /trust/:entityId/reactivate
 */
router.post('/:entityId/reactivate', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    const trust = await TrustScore.findOneAndUpdate(
      { entityId },
      {
        $set: {
          'status': 'ACTIVE',
          'metadata.reactivatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!trust) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trust score not found' },
      });
    }

    res.json({
      success: true,
      data: { entityId, status: 'ACTIVE' },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

export { router as trustRouter };
export {
  calculateTrustScore,
  determineRiskLevel,
  generateId,
};
export default router;