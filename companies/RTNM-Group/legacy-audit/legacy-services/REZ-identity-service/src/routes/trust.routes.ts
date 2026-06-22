/**
 * Trust Score Routes
 */

import { Router, Request, Response } from 'express';
import { TrustScoreService } from '../services/trustScore.service';
import { FraudDetectionService } from '../services/fraudDetection.service';

const router = Router();
const trustService = new TrustScoreService();
const fraudService = new FraudDetectionService();

// ============================================================================
// TRUST SCORE ROUTES
// ============================================================================

/**
 * GET /api/v1/identity/trust/:clusterId
 * Get trust score for a cluster
 */
router.get('/trust/:clusterId', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const trustScore = await trustService.getTrustScore(clusterId);

    if (!trustScore) {
      return res.status(404).json({
        success: false,
        error: 'Trust score not found'
      });
    }

    const benefits = trustService.getTrustLevelBenefits(trustScore.level);

    res.json({
      success: true,
      data: {
        clusterId,
        overallScore: trustScore.overallScore,
        level: trustScore.level,
        factors: Object.fromEntries(trustScore.factors),
        verifiedAt: trustScore.verifiedAt,
        benefits,
      }
    });
  } catch (error) {
    console.error('Error getting trust score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trust score'
    });
  }
});

/**
 * POST /api/v1/identity/trust/calculate
 * Calculate trust score
 */
router.post('/trust/calculate', async (req: Request, res: Response) => {
  try {
    const {
      clusterId,
      identityVerified,
      accountAgeDays,
      transactionCount,
      successfulTransactions,
      deviceCount,
      verifiedDevices,
      karmaScore,
      kycStatus,
      referralCount,
    } = req.body;

    if (!clusterId) {
      return res.status(400).json({
        success: false,
        error: 'clusterId is required'
      });
    }

    const result = await trustService.calculateTrustScore({
      clusterId,
      identityVerified,
      accountAgeDays,
      transactionCount,
      successfulTransactions,
      deviceCount,
      verifiedDevices,
      karmaScore,
      kycStatus,
      referralCount,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error calculating trust score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate trust score'
    });
  }
});

/**
 * POST /api/v1/identity/trust/:clusterId/bonus
 * Add trust bonus
 */
router.post('/trust/:clusterId/bonus', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const { bonus, reason } = req.body;

    if (!bonus || !reason) {
      return res.status(400).json({
        success: false,
        error: 'bonus and reason are required'
      });
    }

    await trustService.addBonus(clusterId, bonus, reason);

    res.json({
      success: true,
      message: 'Bonus added successfully'
    });
  } catch (error) {
    console.error('Error adding bonus:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add bonus'
    });
  }
});

/**
 * POST /api/v1/identity/trust/:clusterId/penalty
 * Add trust penalty
 */
router.post('/trust/:clusterId/penalty', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const { penalty, reason } = req.body;

    if (!penalty || !reason) {
      return res.status(400).json({
        success: false,
        error: 'penalty and reason are required'
      });
    }

    await trustService.addPenalty(clusterId, penalty, reason);

    res.json({
      success: true,
      message: 'Penalty applied successfully'
    });
  } catch (error) {
    console.error('Error applying penalty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply penalty'
    });
  }
});

// ============================================================================
// FRAUD DETECTION ROUTES
// ============================================================================

/**
 * POST /api/v1/identity/fraud/check
 * Check for fraud on an action
 */
router.post('/fraud/check', async (req: Request, res: Response) => {
  try {
    const {
      clusterId,
      action,
      amount,
      deviceFingerprint,
      ipAddress,
      location,
      metadata,
    } = req.body;

    if (!clusterId || !action) {
      return res.status(400).json({
        success: false,
        error: 'clusterId and action are required'
      });
    }

    const result = await fraudService.checkFraud({
      clusterId,
      action,
      amount,
      deviceFingerprint,
      ipAddress,
      location,
      metadata,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check fraud'
    });
  }
});

/**
 * GET /api/v1/identity/fraud/:clusterId
 * Get fraud profile
 */
router.get('/fraud/:clusterId', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const profile = await fraudService.getFraudProfile(clusterId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Fraud profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error getting fraud profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fraud profile'
    });
  }
});

/**
 * GET /api/v1/identity/fraud/:clusterId/events
 * Get fraud events
 */
router.get('/fraud/:clusterId/events', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const events = await fraudService.getFraudEvents(clusterId, limit);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error getting fraud events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fraud events'
    });
  }
});

/**
 * POST /api/v1/identity/fraud/:clusterId/flag
 * Flag a fraud event
 */
router.post('/fraud/:clusterId/flag', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const { indicator, severity, details, source } = req.body;

    if (!indicator || !severity || !source) {
      return res.status(400).json({
        success: false,
        error: 'indicator, severity, and source are required'
      });
    }

    const event = await fraudService.flagFraudEvent(
      clusterId,
      indicator,
      severity,
      details || {},
      source
    );

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error flagging fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flag fraud event'
    });
  }
});

/**
 * POST /api/v1/identity/fraud/resolve/:eventId
 * Resolve a fraud event
 */
router.post('/fraud/resolve/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { resolvedBy, resolution } = req.body;

    if (!resolvedBy || !resolution) {
      return res.status(400).json({
        success: false,
        error: 'resolvedBy and resolution are required'
      });
    }

    const event = await fraudService.resolveFraudEvent(eventId, resolvedBy, resolution);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Fraud event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error resolving fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve fraud event'
    });
  }
});

/**
 * POST /api/v1/identity/fraud/:clusterId/clear
 * Clear fraud profile
 */
router.post('/fraud/:clusterId/clear', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const { reviewedBy } = req.body;

    if (!reviewedBy) {
      return res.status(400).json({
        success: false,
        error: 'reviewedBy is required'
      });
    }

    await fraudService.clearFraudProfile(clusterId, reviewedBy);

    res.json({
      success: true,
      message: 'Fraud profile cleared'
    });
  } catch (error) {
    console.error('Error clearing fraud profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear fraud profile'
    });
  }
});

/**
 * POST /api/v1/identity/fraud/:clusterId/confirm
 * Confirm fraud
 */
router.post('/fraud/:clusterId/confirm', async (req: Request, res: Response) => {
  try {
    const { clusterId } = req.params;
    const { reviewedBy } = req.body;

    if (!reviewedBy) {
      return res.status(400).json({
        success: false,
        error: 'reviewedBy is required'
      });
    }

    await fraudService.confirmFraud(clusterId, reviewedBy);

    res.json({
      success: true,
      message: 'Fraud confirmed'
    });
  } catch (error) {
    console.error('Error confirming fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm fraud'
    });
  }
});

export default router;
