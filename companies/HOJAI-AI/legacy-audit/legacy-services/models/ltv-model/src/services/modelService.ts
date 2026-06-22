/**
 * Mock CatBoost LTV Prediction Service for HOJAI AI
 * Simulates CatBoost ML model predictions for customer lifetime value
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  LTVPredictionRequest,
  LTVPredictionResponse,
  LTVFeatureContribution,
  LTVTrainSample,
  LTVTrainResponse,
  LTVModelInfo,
  LTVTier,
  LTVPredictionTimeframe,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// Model metadata
const MODEL_VERSION = process.env.MODEL_VERSION ?? '1.0.0-catboost';
const MODEL_ID = `ltv-model-${uuidv4()}`;

// CatBoost-inspired feature weights (simulating learned weights from training)
const FEATURE_WEIGHTS: Record<string, number> = {
  totalRevenue: 0.30,
  orderCount: 0.20,
  averageOrderValue: 0.25,
  daysActive: 0.15,
  retentionRate: 0.10,
};

// Feature importance (relative importance scores from CatBoost)
const FEATURE_IMPORTANCE = [
  { feature: 'totalRevenue', importance: 0.30 },
  { feature: 'orderCount', importance: 0.20 },
  { feature: 'averageOrderValue', importance: 0.25 },
  { feature: 'daysActive', importance: 0.15 },
  { feature: 'retentionRate', importance: 0.10 },
];

// In-memory storage for training data
const trainingData: Array<{ features: LTVTrainSample['features']; actualLTV: number }> = [];

/**
 * Tier thresholds for customer segmentation
 */
const TIER_THRESHOLDS = {
  platinum: 50000,
  gold: 15000,
  silver: 5000,
  // bronze: < 5000
};

export class LTVModelService {
  /**
   * Normalize a feature value to 0-1 range based on typical ranges
   */
  private normalizeFeature(name: string, value: number): number {
    const ranges: Record<string, { min: number; max: number }> = {
      totalRevenue: { min: 0, max: 100000 },
      orderCount: { min: 0, max: 500 },
      averageOrderValue: { min: 0, max: 5000 },
      daysActive: { min: 1, max: 730 },
      retentionRate: { min: 0, max: 1 },
    };

    const range = ranges[name] ?? { min: 0, max: 100 };
    const normalized = (value - range.min) / (range.max - range.min);
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Get feature weight with fallback
   */
  private getFeatureWeight(name: string): number {
    return FEATURE_WEIGHTS[name] ?? 0;
  }

  /**
   * Calculate base LTV using mock CatBoost logic
   * In production, this would call actual CatBoost model inference
   */
  private calculateBaseLTV(features: LTVPredictionRequest['features']): number {
    // Simulate CatBoost's gradient boosting logic

    // Total revenue factor (higher revenue = higher LTV potential)
    const revenueNorm = this.normalizeFeature('totalRevenue', features.totalRevenue);
    const revenueFactor = revenueNorm * this.getFeatureWeight('totalRevenue');

    // Order count factor (more orders = higher engagement = higher LTV)
    const ordersNorm = this.normalizeFeature('orderCount', features.orderCount);
    const ordersFactor = ordersNorm * this.getFeatureWeight('orderCount');

    // AOV factor (higher AOV = premium customer = higher LTV)
    const aovNorm = this.normalizeFeature('averageOrderValue', features.averageOrderValue);
    const aovFactor = aovNorm * this.getFeatureWeight('averageOrderValue');

    // Days active factor (older customers have more predictable LTV)
    const daysNorm = this.normalizeFeature('daysActive', features.daysActive);
    const daysFactor = daysNorm * this.getFeatureWeight('daysActive');

    // Retention rate factor (critical for LTV - CatBoost heavily weights this)
    const retentionFactor = features.retentionRate * this.getFeatureWeight('retentionRate');

    // Combine factors into a score (0-1)
    const score = revenueFactor + ordersFactor + aovFactor + daysFactor + retentionFactor;

    // Scale to realistic LTV range (0 - 100,000)
    const baseLTV = score * 100000;

    return Math.round(baseLTV);
  }

  /**
   * Calculate time-based predictions using growth rates
   */
  private calculateTimeframePredictions(
    baseLTV: number,
    features: LTVPredictionRequest['features']
  ): LTVPredictionTimeframe {
    // Growth multiplier based on customer engagement
    const engagementMultiplier = 1 + (features.retentionRate * 0.5);

    // Time-based projections
    const threeMonth = Math.round(baseLTV * 0.25 * engagementMultiplier);
    const sixMonth = Math.round(baseLTV * 0.50 * engagementMultiplier);
    const twelveMonth = Math.round(baseLTV * engagementMultiplier);

    return {
      threeMonth,
      sixMonth,
      twelveMonth,
    };
  }

  /**
   * Determine customer tier based on LTV
   */
  private determineTier(ltv: number): LTVTier {
    if (ltv >= TIER_THRESHOLDS.platinum) return 'platinum';
    if (ltv >= TIER_THRESHOLDS.gold) return 'gold';
    if (ltv >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
  }

  /**
   * Calculate feature contributions to the prediction
   */
  private calculateFeatureContributions(
    features: LTVPredictionRequest['features'],
    baseLTV: number
  ): LTVFeatureContribution[] {
    const contributions: LTVFeatureContribution[] = [];

    // Calculate contribution for each feature
    const featureNames = ['totalRevenue', 'orderCount', 'averageOrderValue', 'daysActive', 'retentionRate'];

    for (const name of featureNames) {
      const value = features[name as keyof typeof features] as number;
      const normalized = this.normalizeFeature(name, value);
      const weight = this.getFeatureWeight(name);
      const rawContribution = normalized * weight * baseLTV;
      const percentageContribution = baseLTV > 0 ? (rawContribution / baseLTV) * 100 : 0;

      contributions.push({
        name,
        contribution: Math.round(percentageContribution * 10) / 10,
        direction: percentageContribution >= 0 ? 'positive' : 'negative',
      });
    }

    // Sort by absolute contribution (descending)
    return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }

  /**
   * Calculate prediction confidence based on feature completeness and data quality
   */
  private calculateConfidence(features: LTVPredictionRequest['features']): number {
    // Base confidence
    let confidence = 0.80;

    // Boost for substantial transaction history
    if (features.orderCount > 10) confidence += 0.08;
    if (features.orderCount > 50) confidence += 0.05;

    // Boost for reasonable activity period
    if (features.daysActive > 30) confidence += 0.05;
    if (features.daysActive > 180) confidence += 0.05;

    // Boost for consistent retention
    if (features.retentionRate > 0.3) confidence += 0.05;

    // Reduce confidence for edge cases
    if (features.totalRevenue === 0 && features.orderCount === 0) confidence -= 0.20;
    if (features.daysActive < 7) confidence -= 0.15;
    if (features.retentionRate < 0.1) confidence -= 0.10;

    return Math.min(0.99, Math.max(0.50, Math.round(confidence * 100) / 100));
  }

  /**
   * Predict LTV for a customer
   */
  predict(request: LTVPredictionRequest): LTVPredictionResponse {
    logger.info('Predicting LTV', { customerId: request.customerId });

    const baseLTV = this.calculateBaseLTV(request.features);
    const timeframePredictions = this.calculateTimeframePredictions(baseLTV, request.features);
    const tier = this.determineTier(baseLTV);
    const confidence = this.calculateConfidence(request.features);

    const response: LTVPredictionResponse = {
      customerId: request.customerId,
      ltv: baseLTV,
      confidence,
      tier,
      prediction: timeframePredictions,
      modelVersion: MODEL_VERSION,
      timestamp: new Date().toISOString(),
    };

    logger.info('LTV prediction complete', {
      customerId: request.customerId,
      ltv: baseLTV,
      tier,
      confidence,
    });

    return response;
  }

  /**
   * Train model with new data (mock CatBoost training)
   */
  async train(samples: LTVTrainSample[]): Promise<LTVTrainResponse> {
    logger.info('Training LTV model', { sampleCount: samples.length });

    const modelId = `ltv-model-${uuidv4()}`;

    // Store training data
    for (const sample of samples) {
      trainingData.push({ features: sample.features, actualLTV: sample.actualLTV });
    }

    // Simulate CatBoost training time (varies with data size)
    const trainingTime = Math.min(2000, 500 + samples.length * 0.5);
    await new Promise((resolve) => setTimeout(resolve, trainingTime));

    // Calculate mock metrics (simulating CatBoost evaluation)
    const baseMSE = 5000 + Math.random() * 10000;
    const metrics = {
      mse: Math.round(baseMSE * 100) / 100,
      rmse: Math.round(Math.sqrt(baseMSE) * 100) / 100,
      mae: Math.round((baseMSE * 0.7) * 100) / 100,
      r2: Math.round((0.75 + Math.random() * 0.2) * 1000) / 1000,
      mape: Math.round((5 + Math.random() * 10) * 100) / 100,
    };

    logger.info('Training complete', { modelId, metrics, samples: trainingData.length });

    return {
      modelId,
      status: 'completed',
      metrics,
      trainingSamples: trainingData.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get model information
   */
  getModelInfo(id: string): LTVModelInfo {
    logger.info('Getting model info', { modelId: id });

    return {
      id,
      version: MODEL_VERSION,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: {
        mse: 12450.5,
        rmse: 111.58,
        mae: 8950.25,
        r2: 0.847,
        mape: 12.35,
      },
      featureImportance: FEATURE_IMPORTANCE,
    };
  }

  /**
   * Get current model version
   */
  getModelVersion(): string {
    return MODEL_VERSION;
  }
}

// Singleton instance
export const ltvModelService = new LTVModelService();
