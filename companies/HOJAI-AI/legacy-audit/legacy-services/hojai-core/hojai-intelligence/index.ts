/**
 * Hojai Intelligence Platform
 *
 * Migration Strategy: Fork & Sync
 *
 * SOURCES:
 * - REZ-Intelligence/REZ-predictive-engine
 * - REZ-Intelligence/REZ-recommendation-engine
 * - REZ-Intelligence/REZ-ml-feature-store
 * - REZ-Intelligence/REZ-ltv-attribution
 *
 * PORT: 4530
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-intelligence');

// ============================================
// INTELLIGENCE TYPES
// ============================================

export interface PredictionRequest {
  customerId: string;
  features: Record<string, number | string>;
}

export interface PredictionResult {
  customerId: string;
  predictions: {
    churn_probability?: number;
    ltv_prediction?: number;
    conversion_probability?: number;
    revisit_probability?: number;
    next_purchase_days?: number;
  };
  confidence: number;
  modelVersion: string;
  calculatedAt: string;
}

export interface RecommendationRequest {
  customerId?: string;
  productIds?: string[];
  limit?: number;
  context?: Record<string, any>;
}

export interface RecommendationResult {
  customerId?: string;
  recommendations: {
    productId: string;
    score: number;
    reason: string;
  }[];
  modelVersion: string;
  calculatedAt: string;
}

export interface SegmentRequest {
  customerId: string;
}

export interface SegmentResult {
  customerId: string;
  segments: string[];
  segmentScores: Record<string, number>;
}

// ============================================
// ML FEATURE STORE
// ============================================

/**
 * Feature Store for ML
 */
export class FeatureStore {
  private features: Map<string, Map<string, number>> = new Map();

  /**
   * Store features for a customer
   */
  async storeFeatures(
    tenantId: string,
    customerId: string,
    features: Record<string, number>
  ): Promise<void> {
    const key = `${tenantId}:${customerId}`;
    this.features.set(key, new Map(Object.entries(features)));
    logger.info('features_stored', { tenantId, customerId, featureCount: Object.keys(features).length });
  }

  /**
   * Get features for a customer
   */
  async getFeatures(
    tenantId: string,
    customerId: string
  ): Promise<Record<string, number>> {
    const key = `${tenantId}:${customerId}`;
    const customerFeatures = this.features.get(key);

    if (!customerFeatures) {
      return this.getDefaultFeatures();
    }

    return Object.fromEntries(customerFeatures);
  }

  /**
   * Get default features (for new customers)
   */
  private getDefaultFeatures(): Record<string, number> {
    return {
      order_frequency: 0,
      avg_order_value: 0,
      days_since_last_order: 999,
      total_orders: 0,
      engagement_score: 50,
      tenure_days: 0
    };
  }
}

// ============================================
// PREDICTION ENGINE
// ============================================

/**
 * Prediction Engine
 */
export class PredictionEngine {
  private featureStore: FeatureStore;

  constructor(featureStore: FeatureStore) {
    this.featureStore = featureStore;
  }

  /**
   * Predict churn probability
   */
  async predictChurn(
    tenantId: string,
    customerId: string
  ): Promise<number> {
    const features = await this.featureStore.getFeatures(tenantId, customerId);

    // Simplified churn model
    const daysSinceLast = features.days_since_last_order || 999;
    const orderFrequency = features.order_frequency || 0;
    const engagement = features.engagement_score || 50;

    // Simple heuristic (would be ML model in production)
    let churnRisk = 0;

    if (daysSinceLast > 90) churnRisk += 0.4;
    else if (daysSinceLast > 60) churnRisk += 0.2;
    else if (daysSinceLast > 30) churnRisk += 0.1;

    if (orderFrequency < 0.1) churnRisk += 0.2;
    if (engagement < 30) churnRisk += 0.2;

    return Math.min(1, Math.max(0, churnRisk));
  }

  /**
   * Predict LTV (Lifetime Value)
   */
  async predictLTV(
    tenantId: string,
    customerId: string
  ): Promise<number> {
    const features = await this.featureStore.getFeatures(tenantId, customerId);

    const avgOrderValue = features.avg_order_value || 0;
    const orderFrequency = features.order_frequency || 0;
    const tenureDays = features.tenure_days || 30;

    // Simplified LTV model (annual)
    const monthlyValue = avgOrderValue * orderFrequency * 30;
    const expectedMonths = Math.max(1, tenureDays / 30);
    const ltv = monthlyValue * expectedMonths * 12;

    return Math.round(ltv);
  }

  /**
   * Predict conversion probability
   */
  async predictConversion(
    tenantId: string,
    customerId: string
  ): Promise<number> {
    const features = await this.featureStore.getFeatures(tenantId, customerId);

    const engagement = features.engagement_score || 50;
    const orderFrequency = features.order_frequency || 0;

    let conversionProb = 0;

    if (engagement > 70) conversionProb += 0.3;
    if (engagement > 50) conversionProb += 0.2;
    if (orderFrequency > 0.5) conversionProb += 0.3;
    if (orderFrequency > 0.2) conversionProb += 0.1;

    return Math.min(1, Math.max(0, conversionProb));
  }

  /**
   * Predict revisit probability
   */
  async predictRevisit(
    tenantId: string,
    customerId: string
  ): Promise<number> {
    const features = await this.featureStore.getFeatures(tenantId, customerId);

    const orderFrequency = features.order_frequency || 0;
    const daysSinceLast = features.days_since_last_order || 999;
    const engagement = features.engagement_score || 50;

    let revisitProb = 0;

    if (orderFrequency > 0.5) revisitProb += 0.4;
    if (orderFrequency > 0.2) revisitProb += 0.2;
    if (daysSinceLast < 30) revisitProb += 0.2;
    if (engagement > 60) revisitProb += 0.2;

    return Math.min(1, Math.max(0, revisitProb));
  }

  /**
   * Get all predictions for a customer
   */
  async predictAll(
    tenantId: string,
    customerId: string
  ): Promise<PredictionResult> {
    const [churn, ltv, conversion, revisit] = await Promise.all([
      this.predictChurn(tenantId, customerId),
      this.predictLTV(tenantId, customerId),
      this.predictConversion(tenantId, customerId),
      this.predictRevisit(tenantId, customerId)
    ]);

    return {
      customerId,
      predictions: {
        churn_probability: churn,
        ltv_prediction: ltv,
        conversion_probability: conversion,
        revisit_probability: revisit,
        next_purchase_days: Math.round(30 / (revist || 0.5))
      },
      confidence: 0.85,
      modelVersion: '1.0.0',
      calculatedAt: new Date().toISOString()
    };
  }
}

// ============================================
// RECOMMENDATION ENGINE
// ============================================

/**
 * Recommendation Engine
 */
export class RecommendationEngine {
  /**
   * Get personalized recommendations
   */
  async getRecommendations(
    tenantId: string,
    customerId: string,
    limit: number = 10
  ): Promise<RecommendationResult> {
    logger.info('recommendations_generated', { tenantId, customerId, limit });

    // Simplified recommendation model
    // Would integrate with product graph, customer preferences, etc.

    const recommendations = [
      { productId: 'prod_1', score: 0.95, reason: 'Based on your purchase history' },
      { productId: 'prod_2', score: 0.88, reason: 'Popular in your area' },
      { productId: 'prod_3', score: 0.82, reason: 'Frequently bought together' },
      { productId: 'prod_4', score: 0.78, reason: 'Similar to items you liked' },
      { productId: 'prod_5', score: 0.75, reason: 'Trending now' }
    ].slice(0, limit);

    return {
      customerId,
      recommendations,
      modelVersion: '1.0.0',
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Get similar products
   */
  async getSimilarProducts(
    tenantId: string,
    productId: string,
    limit: number = 5
  ): Promise<{ productId: string; score: number }[]> {
    return [
      { productId: `${productId}_similar_1`, score: 0.92 },
      { productId: `${productId}_similar_2`, score: 0.87 },
      { productId: `${productId}_similar_3`, score: 0.82 }
    ].slice(0, limit);
  }

  /**
   * Get trending products
   */
  async getTrending(
    tenantId: string,
    category?: string,
    limit: number = 10
  ): Promise<{ productId: string; score: number; reason: string }[]> {
    return [
      { productId: 'trending_1', score: 0.98, reason: 'Sales up 150% this week' },
      { productId: 'trending_2', score: 0.95, reason: 'Most ordered today' },
      { productId: 'trending_3', score: 0.92, reason: 'Rising in popularity' }
    ].slice(0, limit);
  }
}

// ============================================
// SEGMENTATION ENGINE
// ============================================

/**
 * Segmentation Engine
 */
export class SegmentationEngine {
  /**
   * Segment a customer
   */
  async segmentCustomer(
    tenantId: string,
    customerId: string,
    features: Record<string, number>
  ): Promise<SegmentResult> {
    const segments: string[] = [];
    const segmentScores: Record<string, number> = {};

    // RFM Segmentation
    const recency = features.days_since_last_order || 999;
    const frequency = features.order_frequency || 0;
    const monetary = features.avg_order_value || 0;

    // Champions (high value, recent, frequent)
    if (recency <= 7 && frequency > 0.5 && monetary > 1000) {
      segments.push('champions');
      segmentScores['champions'] = 0.95;
    }

    // Loyal (frequent, moderate recency)
    if (frequency > 0.3 && recency <= 30) {
      segments.push('loyal');
      segmentScores['loyal'] = 0.88;
    }

    // At Risk (high value, long time since purchase)
    if (monetary > 500 && recency > 60 && recency <= 90) {
      segments.push('at_risk');
      segmentScores['at_risk'] = 0.82;
    }

    // Churned (low engagement, long time since purchase)
    if (recency > 90 || (features.engagement_score || 50) < 30) {
      segments.push('churned');
      segmentScores['churned'] = 0.90;
    }

    // New Customers (recent, low frequency)
    if (recency <= 14 && (features.total_orders || 0) <= 3) {
      segments.push('new_customer');
      segmentScores['new_customer'] = 0.85;
    }

    // High Value
    if (monetary > 2000) {
      segments.push('high_value');
      segmentScores['high_value'] = 0.80;
    }

    logger.info('customer_segmented', { tenantId, customerId, segments });

    return {
      customerId,
      segments: segments.length > 0 ? segments : ['standard'],
      segmentScores
    };
  }
}

// ============================================
// INTELLIGENCE PLATFORM
// ============================================

/**
 * Hojai Intelligence Platform
 */
export class HojaiIntelligencePlatform {
  private featureStore: FeatureStore;
  private predictionEngine: PredictionEngine;
  private recommendationEngine: RecommendationEngine;
  private segmentationEngine: SegmentationEngine;

  constructor() {
    this.featureStore = new FeatureStore();
    this.predictionEngine = new PredictionEngine(this.featureStore);
    this.recommendationEngine = new RecommendationEngine();
    this.segmentationEngine = new SegmentationEngine();
  }

  /**
   * Store customer features
   */
  async storeFeatures(
    tenantId: string,
    customerId: string,
    features: Record<string, number>
  ): Promise<void> {
    await this.featureStore.storeFeatures(tenantId, customerId, features);
  }

  /**
   * Get all predictions
   */
  async predictAll(
    tenantId: string,
    customerId: string
  ): Promise<PredictionResult> {
    return this.predictionEngine.predictAll(tenantId, customerId);
  }

  /**
   * Get recommendations
   */
  async recommend(
    tenantId: string,
    customerId: string,
    limit: number = 10
  ): Promise<RecommendationResult> {
    return this.recommendationEngine.getRecommendations(tenantId, customerId, limit);
  }

  /**
   * Segment customer
   */
  async segment(
    tenantId: string,
    customerId: string,
    features?: Record<string, number>
  ): Promise<SegmentResult> {
    const customerFeatures = features ||
      await this.featureStore.getFeatures(tenantId, customerId);
    return this.segmentationEngine.segmentCustomer(tenantId, customerId, customerFeatures);
  }
}

// ============================================
// EXPRESS INTEGRATION
// ============================================

/**
 * Create Express routes
 */
export function createIntelligenceRoutes(platform: HojaiIntelligencePlatform) {
  const router = express.Router();

  // ============================================
  // FEATURES
  // ============================================

  /**
   * POST /api/features
   * Store customer features
   */
  router.post('/features', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerId, features } = req.body;

      if (!customerId || !features) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'customerId and features are required')
        );
      }

      await platform.storeFeatures(tenantId, customerId, features);
      res.json(createResponse({ stored: true }, { tenantId }));
    } catch (error) {
      logger.error('store_features_error', { error });
      res.status(500).json(
        createErrorResponse('STORE_ERROR', 'Failed to store features')
      );
    }
  });

  // ============================================
  // PREDICTIONS
  // ============================================

  /**
   * POST /api/predict
   * Get all predictions
   */
  router.post('/predict', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerId } = req.body;

      if (!customerId) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'customerId is required')
        );
      }

      const predictions = await platform.predictAll(tenantId, customerId);
      res.json(createResponse(predictions, { tenantId }));
    } catch (error) {
      logger.error('predict_error', { error });
      res.status(500).json(
        createErrorResponse('PREDICT_ERROR', 'Failed to generate predictions')
      );
    }
  });

  /**
   * POST /api/predict/churn
   * Predict churn
   */
  router.post('/predict/churn', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerId } = req.body;

      const churnProb = await platform.predictAll(tenantId, customerId);
      res.json(createResponse({ churn_probability: churnProb.predictions.churn_probability }, { tenantId }));
    } catch (error) {
      logger.error('churn_predict_error', { error });
      res.status(500).json(
        createErrorResponse('PREDICT_ERROR', 'Failed to predict churn')
      );
    }
  });

  /**
   * POST /api/predict/ltv
   * Predict LTV
   */
  router.post('/predict/ltv', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerId } = req.body;

      const ltv = await platform.predictAll(tenantId, customerId);
      res.json(createResponse({ ltv_prediction: ltv.predictions.ltv_prediction }, { tenantId }));
    } catch (error) {
      logger.error('ltv_predict_error', { error });
      res.status(500).json(
        createErrorResponse('PREDICT_ERROR', 'Failed to predict LTV')
      );
    }
  });

  // ============================================
  // RECOMMENDATIONS
  // ============================================

  /**
   * POST /api/recommend
   * Get recommendations
   */
  router.post('/recommend', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerId, limit } = req.body;

      const recommendations = await platform.recommend(
        tenantId,
        customerId,
        limit || 10
      );
      res.json(createResponse(recommendations, { tenantId }));
    } catch (error) {
      logger.error('recommend_error', { error });
      res.status(500).json(
        createErrorResponse('RECOMMEND_ERROR', 'Failed to generate recommendations')
      );
    }
  });

  /**
   * GET /api/recommend/trending
   * Get trending products
   */
  router.get('/recommend/trending', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { category, limit } = req.query;

      const recEngine = new RecommendationEngine();
      const trending = await recEngine.getTrending(
        tenantId,
        category as string,
        limit ? parseInt(limit as string) : 10
      );

      res.json(createResponse(trending, { tenantId }));
    } catch (error) {
      logger.error('trending_error', { error });
      res.status(500).json(
        createErrorResponse('TRENDING_ERROR', 'Failed to get trending products')
      );
    }
  });

  // ============================================
  // SEGMENTATION
  // ============================================

  /**
   * POST /api/segment
   * Segment customer
   */
  router.post('/segment', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerId, features } = req.body;

      if (!customerId) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'customerId is required')
        );
      }

      const segments = await platform.segment(tenantId, customerId, features);
      res.json(createResponse(segments, { tenantId }));
    } catch (error) {
      logger.error('segment_error', { error });
      res.status(500).json(
        createErrorResponse('SEGMENT_ERROR', 'Failed to segment customer')
      );
    }
  });

  /**
   * POST /api/segment/batch
   * Batch segment customers
   */
  router.post('/segment/batch', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { customerIds } = req.body;

      if (!customerIds || !Array.isArray(customerIds)) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'customerIds array is required')
        );
      }

      const results = await Promise.all(
        customerIds.map(id => platform.segment(tenantId, id))
      );

      res.json(createResponse(results, { tenantId }));
    } catch (error) {
      logger.error('batch_segment_error', { error });
      res.status(500).json(
        createErrorResponse('SEGMENT_ERROR', 'Failed to batch segment')
      );
    }
  });

  return router;
}

// ============================================
// SERVICE BOOTSTRAP
// ============================================

/**
 * Bootstrap the Intelligence Platform
 */
export async function bootstrap(port = 4530) {
  const platform = new HojaiIntelligencePlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hojai-intelligence',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Routes
  app.use('/api', createIntelligenceRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_intelligence_platform_started', { port });
  });

  return { platform, app };
}

// ============================================
// EXPORTS
// ============================================

export default {
  HojaiIntelligencePlatform,
  FeatureStore,
  PredictionEngine,
  RecommendationEngine,
  SegmentationEngine,
  createIntelligenceRoutes,
  bootstrap
};
