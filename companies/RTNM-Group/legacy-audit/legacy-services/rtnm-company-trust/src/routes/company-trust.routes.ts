import { Router, Request, Response } from 'express';
import { companyTrustService, TrustScores } from '../services/company-trust.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /trust/:corpId
 * Get trust score for a company
 */
router.get('/trust/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    const trust = await companyTrustService.getTrust(corpId);

    if (!trust) {
      return res.status(404).json({
        success: false,
        error: 'Trust record not found for this company',
        corpId,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        corpId: trust.corpId,
        companyName: trust.companyName,
        overallScore: trust.overallScore,
        paymentScore: trust.paymentScore,
        fulfillmentScore: trust.fulfillmentScore,
        disputeScore: trust.disputeScore,
        verificationScore: trust.verificationScore,
        transactionCount: trust.transactionCount,
        lastTransactionAt: trust.lastTransactionAt,
        trend: trust.trend,
        riskLevel: trust.riskLevel,
        badges: trust.badges,
        updatedAt: trust.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error in GET /trust/:corpId:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /trust/:corpId/update
 * Update trust scores for a company
 */
router.post('/trust/:corpId/update', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const { scores, triggeredBy, reason } = req.body;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    if (!scores || typeof scores !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'scores object is required',
      });
    }

    // Validate score ranges
    const scoreFields: (keyof TrustScores)[] = [
      'overallScore',
      'paymentScore',
      'fulfillmentScore',
      'disputeScore',
      'verificationScore',
    ];

    for (const field of scoreFields) {
      if (scores[field] !== undefined) {
        if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 100) {
          return res.status(400).json({
            success: false,
            error: `${field} must be a number between 0 and 100`,
          });
        }
      }
    }

    const result = await companyTrustService.updateTrust(
      corpId,
      scores,
      triggeredBy || 'api',
      reason || 'Manual update via API'
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        corpId: result.companyTrust?.corpId,
        overallScore: result.companyTrust?.overallScore,
        paymentScore: result.companyTrust?.paymentScore,
        fulfillmentScore: result.companyTrust?.fulfillmentScore,
        disputeScore: result.companyTrust?.disputeScore,
        verificationScore: result.companyTrust?.verificationScore,
        trend: result.companyTrust?.trend,
        riskLevel: result.companyTrust?.riskLevel,
        badges: result.companyTrust?.badges,
        updatedAt: result.companyTrust?.updatedAt,
      },
      message: 'Trust scores updated successfully',
    });
  } catch (error) {
    logger.error('Error in POST /trust/:corpId/update:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /trust/:corpId/history
 * Get trust history for a company
 */
router.get('/trust/:corpId/history', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const { limit, skip, startDate, endDate } = req.query;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    const options: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (limit) options.limit = parseInt(limit as string, 10);
    if (skip) options.skip = parseInt(skip as string, 10);
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);

    const history = await companyTrustService.getTrustHistory(corpId, options);

    return res.status(200).json({
      success: true,
      data: history.map((entry) => ({
        corpId: entry.corpId,
        overallScore: entry.overallScore,
        paymentScore: entry.paymentScore,
        fulfillmentScore: entry.fulfillmentScore,
        disputeScore: entry.disputeScore,
        verificationScore: entry.verificationScore,
        reason: entry.reason,
        triggeredBy: entry.triggeredBy,
        recordedAt: entry.recordedAt,
      })),
      count: history.length,
    });
  } catch (error) {
    logger.error('Error in GET /trust/:corpId/history:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /trust
 * Get all trust scores with optional filtering
 */
router.get('/trust', async (req: Request, res: Response) => {
  try {
    const { limit, skip, sortBy, sortOrder } = req.query;

    const options: {
      limit?: number;
      skip?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {};

    if (limit) options.limit = parseInt(limit as string, 10);
    if (skip) options.skip = parseInt(skip as string, 10);
    if (sortBy) options.sortBy = sortBy as string;
    if (sortOrder) options.sortOrder = sortOrder as 'asc' | 'desc';

    const trustScores = await companyTrustService.getAllTrustScores(options);

    return res.status(200).json({
      success: true,
      data: trustScores,
      count: trustScores.length,
    });
  } catch (error) {
    logger.error('Error in GET /trust:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /trust/leaderboard
 * Get top companies by trust score
 */
router.get('/trust/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const leaderboardLimit = limit ? parseInt(limit as string, 10) : 10;

    const leaderboard = await companyTrustService.getLeaderboard(leaderboardLimit);

    return res.status(200).json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    logger.error('Error in GET /trust/leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /trust/risk/:level
 * Get companies by risk level
 */
router.get('/trust/risk/:level', async (req: Request, res: Response) => {
  try {
    const { level } = req.params;

    if (!['low', 'medium', 'high'].includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid risk level. Must be: low, medium, or high',
      });
    }

    const companies = await companyTrustService.getByRiskLevel(level as 'low' | 'medium' | 'high');

    return res.status(200).json({
      success: true,
      data: companies,
      count: companies.length,
    });
  } catch (error) {
    logger.error('Error in GET /trust/risk/:level:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /trust/:corpId/transaction
 * Record a transaction for a company
 */
router.post('/trust/:corpId/transaction', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    await companyTrustService.recordTransaction(corpId);

    return res.status(200).json({
      success: true,
      message: 'Transaction recorded successfully',
    });
  } catch (error) {
    logger.error('Error in POST /trust/:corpId/transaction:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /trust/:corpId/badge
 * Add a badge to a company
 */
router.post('/trust/:corpId/badge', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const { badge } = req.body;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    if (!badge || typeof badge !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'badge is required and must be a string',
      });
    }

    const success = await companyTrustService.addBadge(corpId, badge);

    return res.status(200).json({
      success,
      message: success ? 'Badge added successfully' : 'Badge already exists or company not found',
    });
  } catch (error) {
    logger.error('Error in POST /trust/:corpId/badge:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;