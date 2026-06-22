/**
 * CorpID Cloud - Trust Engine Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  trustScores,
  riskChecks,
  anomalies,
  createTrustScore,
  evaluateTrust,
  performRiskCheck,
  getTrustScore,
  getRiskChecks,
  recordAnomaly
} from '../models/trust.model.js';

const router = express.Router();

/**
 * Get current user's trust score
 * GET /api/trust/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const score = getTrustScore(req.user.id);
    res.json({ success: true, trustScore: score });
  })
);

/**
 * Evaluate trust for current user
 * POST /api/trust/evaluate
 */
router.post('/evaluate',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const score = evaluateTrust(req.user.id, req.body);

    dataAudit('trust.evaluated', req, 'trust_score', req.user.id, { score: score.overallScore });

    res.json({
      success: true,
      message: 'Trust score evaluated',
      trustScore: score
    });
  })
);

/**
 * Get trust score for specific user (admin)
 * GET /api/trust/user/:userId
 */
router.get('/user/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const score = getTrustScore(req.params.userId);
    res.json({ success: true, trustScore: score });
  })
);

/**
 * Evaluate trust for any user (admin)
 * POST /api/trust/user/:userId/evaluate
 */
router.post('/user/:userId/evaluate',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const score = evaluateTrust(req.params.userId, req.body);

    dataAudit('trust.evaluated', req, 'trust_score', req.params.userId);

    res.json({
      success: true,
      trustScore: score
    });
  })
);

/**
 * Perform risk check
 * POST /api/trust/risk-check
 */
router.post('/risk-check',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { action, context } = req.body;

    if (!action) {
      throw new AppError('Action is required', 400, 'VALIDATION_ERROR');
    }

    const check = performRiskCheck({
      userId: req.user.id,
      action,
      context
    });

    res.json({
      success: true,
      check
    });
  })
);

/**
 * Get risk check history
 * GET /api/trust/risk-checks
 */
router.get('/risk-checks',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { action, decision, limit = 50 } = req.query;
    const checks = getRiskChecks(req.user.id, { action, decision })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      count: checks.length,
      checks
    });
  })
);

/**
 * Record anomaly
 * POST /api/trust/anomalies
 */
router.post('/anomalies',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const anomaly = recordAnomaly({
      userId: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      anomaly
    });
  })
);

/**
 * Get anomalies
 * GET /api/trust/anomalies
 */
router.get('/anomalies',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { limit = 50, severity } = req.query;
    let userAnomalies = anomalies.filter(a => a.userId === req.user.id);

    if (severity) {
      userAnomalies = userAnomalies.filter(a => a.severity === severity);
    }

    res.json({
      success: true,
      count: userAnomalies.length,
      anomalies: userAnomalies.slice(0, parseInt(limit))
    });
  })
);

/**
 * Get trust statistics (admin)
 * GET /api/trust/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const allScores = Array.from(trustScores.values());
    const byGrade = {};
    const byRiskLevel = {};

    for (const score of allScores) {
      byGrade[score.grade] = (byGrade[score.grade] || 0) + 1;
      // Calculate current risk level from overall score
      const risk = score.overallScore >= 80 ? 'low' : score.overallScore >= 60 ? 'medium' : score.overallScore >= 40 ? 'high' : 'critical';
      byRiskLevel[risk] = (byRiskLevel[risk] || 0) + 1;
    }

    res.json({
      success: true,
      stats: {
        totalScores: allScores.length,
        byGrade,
        byRiskLevel,
        totalRiskChecks: riskChecks.length,
        totalAnomalies: anomalies.length,
        averageScore: allScores.length > 0
          ? Math.round(allScores.reduce((sum, s) => sum + s.overallScore, 0) / allScores.length)
          : 0
      }
    });
  })
);

export default router;
