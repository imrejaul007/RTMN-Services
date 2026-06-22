// Trust Score Routes - API endpoints for trust score operations

import { Router, Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  TrustScoreService,
  TrustHistoryService,
  TrustBadgeService,
  TrustRecommendationService,
  TrustAlertService,
  TrustEngineIntegrationService
} from "../services";
import {
  TrustLevel,
  TrustFactorType,
  TrustBadgeType,
  AlertType,
  AlertSeverity,
  EntityType,
  TrustFactor
} from "../types";

/**
 * Create Express router with all trust score routes
 */
export function createTrustScoreRouter(
  trustScoreService: TrustScoreService,
  historyService: TrustHistoryService,
  badgeService: TrustBadgeService,
  recommendationService: TrustRecommendationService,
  alertService: TrustAlertService,
  engineIntegration: TrustEngineIntegrationService
): Router {
  const router = Router();

  // Helper function for API responses
  const apiResponse = <T>(res: Response, success: boolean, data?: T, error?: string) => {
    res.json({
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
      requestId: uuidv4()
    });
  };

  // ============================================
  // TRUST SCORE ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/score/:entityId
   * Get trust score for an entity
   */
  router.get("/score/:entityId", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const score = trustScoreService.getTrustScore(entityId);

      if (!score) {
        return res.status(404).json(apiResponse(res, false, undefined, "Trust score not found"));
      }

      apiResponse(res, true, score);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * POST /api/v1/score/:entityId
   * Create or update trust score for an entity
   */
  router.post("/score/:entityId", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { entityType, factors } = req.body;

      if (!entityType || !factors) {
        return res.status(400).json(apiResponse(res, false, undefined, "Missing required fields"));
      }

      const previousScore = trustScoreService.getTrustScore(entityId);
      const score = trustScoreService.calculateTrustScore(
        entityId,
        entityType as EntityType,
        factors as TrustFactor[],
        previousScore || undefined
      );

      // Record in history
      if (previousScore) {
        historyService.recordTrustChange(entityId, score, previousScore);
      } else {
        historyService.recordInitialScore(entityId, score);
      }

      // Check and award badges
      const awardedBadges = badgeService.checkAndAwardBadges(entityId, score);

      // Generate recommendations
      recommendationService.generateRecommendations(entityId, score);

      // Check alerts
      alertService.checkAndTriggerAlerts(entityId, score, previousScore || undefined);

      apiResponse(res, true, {
        score,
        badgesAwarded: awardedBadges
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * DELETE /api/v1/score/:entityId
   * Delete trust score for an entity
   */
  router.delete("/score/:entityId", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const deleted = trustScoreService.deleteTrustScore(entityId);

      if (deleted) {
        historyService.deleteHistory(entityId);
        badgeService.deleteAllBadges(entityId);
        recommendationService.deleteRecommendations(entityId);
        alertService.deleteAllAlerts(entityId);
      }

      apiResponse(res, true, { deleted });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // TRUST LEVEL ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/score/:entityId/level
   * Get trust level for an entity
   */
  router.get("/score/:entityId/level", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const score = trustScoreService.getTrustScore(entityId);

      if (!score) {
        return res.status(404).json(apiResponse(res, false, undefined, "Trust score not found"));
      }

      const thresholds = trustScoreService.getThresholds();
      const currentThreshold = thresholds.find(t => t.level === score.level);

      apiResponse(res, true, {
        level: score.level,
        score: score.score,
        threshold: currentThreshold,
        nextLevel: getNextLevel(score.level),
        scoreToNextLevel: getScoreToNextLevel(score.level, score.score)
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // TRUST FACTORS ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/score/:entityId/factors
   * Get trust factors for an entity
   */
  router.get("/score/:entityId/factors", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const score = trustScoreService.getTrustScore(entityId);

      if (!score) {
        return res.status(404).json(apiResponse(res, false, undefined, "Trust score not found"));
      }

      const weights = trustScoreService.getFactorWeights();
      const factorsWithWeights = score.factors.map(factor => ({
        ...factor,
        weightConfig: weights.find(w => w.type === factor.type)
      }));

      apiResponse(res, true, {
        factors: factorsWithWeights,
        totalWeight: score.totalWeight,
        confidence: score.confidence
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * PUT /api/v1/score/:entityId/factors/:factorType
   * Update a specific trust factor
   */
  router.put("/score/:entityId/factors/:factorType", (req: Request, res: Response) => {
    try {
      const { entityId, factorType } = req.params;
      const { score } = req.body;

      const currentScore = trustScoreService.getTrustScore(entityId);
      if (!currentScore) {
        return res.status(404).json(apiResponse(res, false, undefined, "Trust score not found"));
      }

      const factorIndex = currentScore.factors.findIndex(f => f.type === factorType);
      if (factorIndex === -1) {
        return res.status(404).json(apiResponse(res, false, undefined, "Factor not found"));
      }

      // Update the factor
      currentScore.factors[factorIndex].score = score;
      currentScore.factors[factorIndex].lastUpdated = new Date().toISOString();

      const updatedScore = trustScoreService.updateTrustScore(entityId, currentScore.factors);

      apiResponse(res, true, updatedScore);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // TRUST HISTORY ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/score/:entityId/history
   * Get trust history for an entity
   */
  router.get("/score/:entityId/history", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { page = "1", limit = "20", sortOrder = "DESC" } = req.query;

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortOrder: sortOrder as "ASC" | "DESC"
      };

      const history = historyService.getPaginatedHistory(entityId, pagination);
      const statistics = historyService.getHistoryStatistics(entityId);
      const trend = historyService.getHistoryTrend(entityId);

      apiResponse(res, true, {
        history,
        statistics,
        trend
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * GET /api/v1/score/:entityId/history/export
   * Export trust history
   */
  router.get("/score/:entityId/history/export", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { format = "json" } = req.query;

      const exportData = historyService.exportHistory(entityId, format as "json" | "csv");

      res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="trust-history-${entityId}.${format}"`);
      res.send(exportData);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // TRUST BADGES ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/score/:entityId/badges
   * Get trust badges for an entity
   */
  router.get("/score/:entityId/badges", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { page = "1", limit = "20" } = req.query;

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const badges = badgeService.getPaginatedBadges(entityId, pagination);
      const statistics = badgeService.getBadgeStatistics(entityId);
      const definitions = badgeService.getBadgeDefinitions();

      apiResponse(res, true, {
        badges,
        statistics,
        definitions
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * POST /api/v1/score/:entityId/badges
   * Award a badge to an entity
   */
  router.post("/score/:entityId/badges", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { badgeType, expiresInDays, issuer } = req.body;

      if (!badgeType) {
        return res.status(400).json(apiResponse(res, false, undefined, "Missing badgeType"));
      }

      const badge = badgeService.awardBadge(
        entityId,
        badgeType as TrustBadgeType,
        expiresInDays,
        issuer
      );

      apiResponse(res, true, badge);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * DELETE /api/v1/score/:entityId/badges/:badgeType
   * Revoke a badge from an entity
   */
  router.delete("/score/:entityId/badges/:badgeType", (req: Request, res: Response) => {
    try {
      const { entityId, badgeType } = req.params;
      const revoked = badgeService.revokeBadge(entityId, badgeType as TrustBadgeType);

      apiResponse(res, true, { revoked });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // TRUST RECOMMENDATIONS ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/score/:entityId/recommendations
   * Get trust recommendations for an entity
   */
  router.get("/score/:entityId/recommendations", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { page = "1", limit = "20", category, impact } = req.query;

      let recommendations = recommendationService.getRecommendations(entityId);

      // Filter by category
      if (category) {
        recommendations = recommendationService.getRecommendationsByCategory(entityId, category as string);
      }

      // Filter by impact
      if (impact) {
        recommendations = recommendationService.getRecommendationsByImpact(entityId, impact as "HIGH" | "MEDIUM" | "LOW");
      }

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const paginated = recommendationService.getPaginatedRecommendations(entityId, pagination);
      const statistics = recommendationService.getCompletionStatistics(entityId);
      const potential = recommendationService.calculatePotentialImprovement(entityId);
      const roadmap = recommendationService.getRoadmap(entityId);

      apiResponse(res, true, {
        recommendations: paginated,
        statistics,
        potential,
        roadmap
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * POST /api/v1/score/:entityId/recommendations/:recommendationId/complete
   * Mark a recommendation as completed
   */
  router.post("/score/:entityId/recommendations/:recommendationId/complete", (req: Request, res: Response) => {
    try {
      const { entityId, recommendationId } = req.params;
      const completed = recommendationService.completeRecommendation(entityId, recommendationId);

      if (!completed) {
        return res.status(404).json(apiResponse(res, false, undefined, "Recommendation not found"));
      }

      apiResponse(res, true, completed);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // TRUST ALERTS ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/score/:entityId/alerts
   * Get alerts for an entity
   */
  router.get("/score/:entityId/alerts", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { page = "1", limit = "20" } = req.query;

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const alerts = alertService.getAlerts(entityId);
      const events = alertService.getPaginatedAlertEvents(entityId, pagination);
      const statistics = alertService.getAlertStatistics(entityId);
      const alertTypes = alertService.getAlertTypes();

      apiResponse(res, true, {
        alerts,
        events,
        statistics,
        alertTypes
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * POST /api/v1/score/:entityId/alert
   * Create an alert for an entity
   */
  router.post("/score/:entityId/alert", (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { type, severity, threshold, notificationChannels, webhookUrl, email } = req.body;

      if (!type || !severity) {
        return res.status(400).json(apiResponse(res, false, undefined, "Missing required fields"));
      }

      const alert = alertService.createAlert(
        entityId,
        type as AlertType,
        severity as AlertSeverity,
        threshold,
        notificationChannels || ["IN_APP"],
        webhookUrl,
        email
      );

      apiResponse(res, true, alert);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * PUT /api/v1/score/:entityId/alert/:alertId
   * Update an alert
   */
  router.put("/score/:entityId/alert/:alertId", (req: Request, res: Response) => {
    try {
      const { entityId, alertId } = req.params;
      const updates = req.body;

      const updated = alertService.updateAlert(entityId, alertId, updates);

      if (!updated) {
        return res.status(404).json(apiResponse(res, false, undefined, "Alert not found"));
      }

      apiResponse(res, true, updated);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * DELETE /api/v1/score/:entityId/alert/:alertId
   * Delete an alert
   */
  router.delete("/score/:entityId/alert/:alertId", (req: Request, res: Response) => {
    try {
      const { entityId, alertId } = req.params;
      const deleted = alertService.deleteAlert(entityId, alertId);

      apiResponse(res, true, { deleted });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * POST /api/v1/score/:entityId/alerts/:eventId/acknowledge
   * Acknowledge an alert event
   */
  router.post("/score/:entityId/alerts/:eventId/acknowledge", (req: Request, res: Response) => {
    try {
      const { entityId, eventId } = req.params;
      const acknowledged = alertService.acknowledgeEvent(entityId, eventId);

      if (!acknowledged) {
        return res.status(404).json(apiResponse(res, false, undefined, "Event not found"));
      }

      apiResponse(res, true, acknowledged);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // TRUST ENGINE INTEGRATION ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/engine/status
   * Get Trust Engine connection status
   */
  router.get("/engine/status", async (_req: Request, res: Response) => {
    try {
      const health = await engineIntegration.healthCheck();
      apiResponse(res, true, {
        connected: health.connected,
        latency: health.latency,
        status: health.status,
        lastCheck: engineIntegration.getLastHealthCheck()
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * POST /api/v1/engine/sync
   * Sync trust scores with Trust Engine
   */
  router.post("/engine/sync", async (_req: Request, res: Response) => {
    try {
      const result = await engineIntegration.syncWithTrustEngine();
      apiResponse(res, true, result);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * GET /api/v1/engine/relationships/:entityId
   * Get trust relationships from Trust Engine
   */
  router.get("/engine/relationships/:entityId", async (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const relationships = await engineIntegration.getTrustRelationships(entityId);
      apiResponse(res, true, relationships);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  // ============================================
  // STATISTICS ENDPOINTS
  // ============================================

  /**
   * GET /api/v1/statistics
   * Get overall trust statistics
   */
  router.get("/statistics", (req: Request, res: Response) => {
    try {
      const stats = trustScoreService.getStatistics();
      const badgeStats = badgeService.getAllPlatformBadges();
      const alertTypes = alertService.getAlertTypes();

      apiResponse(res, true, {
        trustStatistics: stats,
        badgeStatistics: badgeStats,
        alertTypes
      });
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * GET /api/v1/levels
   * Get trust level definitions
   */
  router.get("/levels", (req: Request, res: Response) => {
    try {
      const thresholds = trustScoreService.getThresholds();
      apiResponse(res, true, thresholds);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  /**
   * GET /api/v1/factors
   * Get trust factor definitions
   */
  router.get("/factors", (req: Request, res: Response) => {
    try {
      const weights = trustScoreService.getFactorWeights();
      apiResponse(res, true, weights);
    } catch (error) {
      apiResponse(res, false, undefined, String(error));
    }
  });

  return router;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getNextLevel(currentLevel: TrustLevel): TrustLevel | null {
  const levels = [TrustLevel.UNTRUSTED, TrustLevel.LOW, TrustLevel.MEDIUM, TrustLevel.HIGH, TrustLevel.PREMIUM];
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

function getScoreToNextLevel(currentLevel: TrustLevel, currentScore: number): number | null {
  const thresholds: Record<TrustLevel, number> = {
    [TrustLevel.UNTRUSTED]: 21,
    [TrustLevel.LOW]: 41,
    [TrustLevel.MEDIUM]: 61,
    [TrustLevel.HIGH]: 81,
    [TrustLevel.PREMIUM]: 100
  };

  if (currentLevel === TrustLevel.PREMIUM) {
    return null;
  }

  return thresholds[currentLevel] - currentScore;
}

export default createTrustScoreRouter;
