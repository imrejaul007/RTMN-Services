// SUTAR Trust Score Service - Main Entry Point
// Provides trust scoring for all entities in the SUTAR ecosystem

import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { v4 as uuidv4 } from "uuid";
import {
  TrustScoreService,
  TrustHistoryService,
  TrustBadgeService,
  TrustRecommendationService,
  TrustAlertService,
  TrustEngineIntegrationService
} from "./services";
import { createTrustScoreRouter } from "./routes";
import {
  TrustLevel,
  TrustFactorType,
  EntityType,
  TrustFactor
} from "./types";

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4181;
const START_TIME = Date.now();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Initialize services
const trustScoreService = new TrustScoreService();
const historyService = new TrustHistoryService();
const badgeService = new TrustBadgeService();
const recommendationService = new TrustRecommendationService();
const alertService = new TrustAlertService();
const engineIntegration = new TrustEngineIntegrationService(
  {
    baseUrl: process.env.TRUST_ENGINE_URL || "http://localhost:4180",
    timeout: 10000
  },
  trustScoreService
);

// Create router
const trustScoreRouter = createTrustScoreRouter(
  trustScoreService,
  historyService,
  badgeService,
  recommendationService,
  alertService,
  engineIntegration
);

// ============================================
// HEALTH & INFO ENDPOINTS
// ============================================

/**
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response) => {
  const stats = trustScoreService.getStatistics();
  res.json({
    status: "healthy",
    service: "sutar-trust-score",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    statistics: {
      totalEntities: stats.totalEntities,
      averageScore: Math.round(stats.averageScore * 100) / 100
    }
  });
});

/**
 * Service info endpoint
 */
app.get("/api/v1/info", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: "sutar-trust-score",
      description: "SUTAR Trust Score Service - Provides trust scoring for all entities",
      version: "1.0.0",
      features: [
        "Trust Score Calculation",
        "Trust Levels (UNTRUSTED, LOW, MEDIUM, HIGH, PREMIUM)",
        "Trust Factors with weighted contributions",
        "Trust History tracking",
        "Trust Badges and verification",
        "Trust Recommendations",
        "Trust Alerts",
        "Trust Engine Integration"
      ],
      endpoints: {
        score: "/api/v1/score/:entityId",
        level: "/api/v1/score/:entityId/level",
        factors: "/api/v1/score/:entityId/factors",
        history: "/api/v1/score/:entityId/history",
        badges: "/api/v1/score/:entityId/badges",
        recommendations: "/api/v1/score/:entityId/recommendations",
        alerts: "/api/v1/score/:entityId/alerts",
        alert: "/api/v1/score/:entityId/alert"
      },
      trustLevels: Object.values(TrustLevel),
      trustFactors: Object.values(TrustFactorType),
      entityTypes: Object.values(EntityType)
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Trust levels info
 */
app.get("/api/v1/levels", (_req: Request, res: Response) => {
  const thresholds = trustScoreService.getThresholds();
  res.json({
    success: true,
    data: thresholds,
    timestamp: new Date().toISOString()
  });
});

/**
 * Trust factors info
 */
app.get("/api/v1/factors", (_req: Request, res: Response) => {
  const weights = trustScoreService.getFactorWeights();
  res.json({
    success: true,
    data: weights,
    timestamp: new Date().toISOString()
  });
});

/**
 * Statistics endpoint
 */
app.get("/api/v1/statistics", (_req: Request, res: Response) => {
  const stats = trustScoreService.getStatistics();
  const badgeStats = badgeService.getAllPlatformBadges();

  res.json({
    success: true,
    data: {
      trustStatistics: stats,
      badgeStatistics: badgeStats
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// TRUST SCORE ROUTES
// ============================================

app.use("/api/v1", trustScoreRouter);

// ============================================
// INTENT & EVENT HANDLING
// ============================================

/**
 * Intent handler for internal service communication
 */
app.post("/api/v1/intent", async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);

    let response: Record<string, unknown> = {};

    switch (type) {
      case "CALCULATE_TRUST_SCORE":
        response = await handleCalculateTrustScore(payload);
        break;
      case "GET_TRUST_SCORE":
        response = handleGetTrustScore(payload);
        break;
      case "UPDATE_TRUST_FACTORS":
        response = handleUpdateTrustFactors(payload);
        break;
      case "CHECK_BADGE_ELIGIBILITY":
        response = handleCheckBadgeEligibility(payload);
        break;
      case "SYNC_WITH_ENGINE":
        response = await handleSyncWithEngine();
        break;
      default:
        response = { error: `Unknown intent type: ${type}` };
    }

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      requestId: uuidv4()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Event handler for internal service events
 */
app.post("/api/v1/event", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);

    switch (type) {
      case "ENTITY_UPDATED":
        await handleEntityUpdated(data);
        break;
      case "TRANSACTION_COMPLETED":
        await handleTransactionCompleted(data);
        break;
      case "CONTRACT_COMPLETED":
        await handleContractCompleted(data);
        break;
      case "BADGE_EARNED":
        await handleBadgeEarned(data);
        break;
      case "TRUST_ENGINE_UPDATE":
        await handleTrustEngineUpdate(data);
        break;
    }

    res.json({
      success: true,
      data: { eventId: uuidv4(), type, status: "processed" },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// INTENT & EVENT HANDLERS
// ============================================

async function handleCalculateTrustScore(payload: {
  entityId: string;
  entityType: string;
  factors?: TrustFactor[];
}): Promise<Record<string, unknown>> {
  const { entityId, entityType, factors } = payload;

  const trustFactors = factors || TrustScoreService.generateInitialFactors();
  const previousScore = trustScoreService.getTrustScore(entityId);

  const score = trustScoreService.calculateTrustScore(
    entityId,
    entityType as EntityType,
    trustFactors,
    previousScore || undefined
  );

  // Record history
  if (previousScore) {
    historyService.recordTrustChange(entityId, score, previousScore);
  } else {
    historyService.recordInitialScore(entityId, score);
  }

  // Check badges
  const awardedBadges = badgeService.checkAndAwardBadges(entityId, score);

  // Generate recommendations
  recommendationService.generateRecommendations(entityId, score);

  return {
    score,
    badgesAwarded: awardedBadges.length
  };
}

function handleGetTrustScore(payload: { entityId: string }): Record<string, unknown> {
  const { entityId } = payload;
  const score = trustScoreService.getTrustScore(entityId);

  if (!score) {
    return { error: "Trust score not found" };
  }

  return { score };
}

function handleUpdateTrustFactors(payload: {
  entityId: string;
  factors: TrustFactor[];
}): Record<string, unknown> {
  const { entityId, factors } = payload;

  try {
    const updatedScore = trustScoreService.updateTrustScore(entityId, factors);
    return { score: updatedScore };
  } catch (error) {
    return { error: String(error) };
  }
}

function handleCheckBadgeEligibility(payload: { entityId: string }): Record<string, unknown> {
  const { entityId } = payload;
  const score = trustScoreService.getTrustScore(entityId);

  if (!score) {
    return { error: "Trust score not found" };
  }

  const eligibleBadges = badgeService.getEligibleBadges(entityId, score);
  const currentBadges = badgeService.getBadges(entityId);

  return {
    currentBadges: currentBadges.length,
    eligibleBadges
  };
}

async function handleSyncWithEngine(): Promise<Record<string, unknown>> {
  const result = await engineIntegration.syncWithTrustEngine();
  return result;
}

async function handleEntityUpdated(data: { entityId: string }): Promise<void> {
  const { entityId } = data;
  const score = trustScoreService.getTrustScore(entityId);

  if (score) {
    // Refresh the score to reflect changes
    trustScoreService.refreshTrustScore(entityId);
  }
}

async function handleTransactionCompleted(data: {
  entityId: string;
  success: boolean;
}): Promise<void> {
  const { entityId, success } = data;
  const score = trustScoreService.getTrustScore(entityId);

  if (score) {
    // Update transaction history factor
    const txFactor = score.factors.find(f => f.type === TrustFactorType.TRANSACTION_HISTORY);
    if (txFactor) {
      txFactor.score = success
        ? Math.min(100, txFactor.score + 2)
        : Math.max(0, txFactor.score - 5);
      txFactor.lastUpdated = new Date().toISOString();

      trustScoreService.updateTrustScore(entityId, score.factors);
    }
  }
}

async function handleContractCompleted(data: {
  entityId: string;
  success: boolean;
}): Promise<void> {
  const { entityId, success } = data;
  const score = trustScoreService.getTrustScore(entityId);

  if (score) {
    // Update contract compliance factor
    const ccFactor = score.factors.find(f => f.type === TrustFactorType.CONTRACT_COMPLIANCE);
    if (ccFactor) {
      ccFactor.score = success
        ? Math.min(100, ccFactor.score + 3)
        : Math.max(0, ccFactor.score - 8);
      ccFactor.lastUpdated = new Date().toISOString();

      trustScoreService.updateTrustScore(entityId, score.factors);
    }
  }
}

async function handleBadgeEarned(data: {
  entityId: string;
  badgeType: string;
}): Promise<void> {
  const { entityId, badgeType } = data;

  // Create alert for new badge
  alertService.createAlert(
    entityId,
    "NEW_BADGE_EARNED" as any,
    "INFO" as any,
    undefined,
    ["IN_APP"]
  );
}

async function handleTrustEngineUpdate(data: {
  entityId: string;
  score?: number;
  level?: TrustLevel;
}): Promise<void> {
  const { entityId, score: newScore, level } = data;
  const currentScore = trustScoreService.getTrustScore(entityId);

  if (currentScore && newScore !== undefined) {
    // Check for significant changes
    const change = Math.abs(newScore - currentScore.score);
    if (change >= 5) {
      alertService.checkAndTriggerAlerts(
        entityId,
        { ...currentScore, score: newScore, level: level || currentScore.level },
        currentScore
      );
    }
  }
}

// ============================================
// ERROR HANDLING
// ============================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    timestamp: new Date().toISOString()
  });
});

app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error("[ERROR]", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           SUTAR TRUST SCORE SERVICE                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Service: sutar-trust-score                                   ║
║  Version: 1.0.0                                               ║
║  Port: ${PORT}                                                      ║
║  Trust Engine: ${process.env.TRUST_ENGINE_URL || "http://localhost:4180"}                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Features:                                                    ║
║    - Trust Score Calculation                                  ║
║    - Trust Levels (UNTRUSTED, LOW, MEDIUM, HIGH, PREMIUM)      ║
║    - Trust Factors with weighted contributions                ║
║    - Trust History tracking                                   ║
║    - Trust Badges and verification                            ║
║    - Trust Recommendations                                    ║
║    - Trust Alerts                                             ║
║    - Trust Engine Integration                                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    GET  /health                                               ║
║    GET  /api/v1/info                                          ║
║    GET  /api/v1/score/:entityId                               ║
║    GET  /api/v1/score/:entityId/level                         ║
║    GET  /api/v1/score/:entityId/factors                      ║
║    GET  /api/v1/score/:entityId/history                      ║
║    GET  /api/v1/score/:entityId/badges                        ║
║    GET  /api/v1/score/:entityId/recommendations              ║
║    GET  /api/v1/score/:entityId/alerts                        ║
║    POST /api/v1/score/:entityId/alert                        ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
