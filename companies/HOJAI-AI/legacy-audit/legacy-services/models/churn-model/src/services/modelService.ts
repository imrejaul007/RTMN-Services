/**
 * Mock XGBoost Prediction Service for HOJAI AI Churn Model
 * Simulates XGBoost ML model predictions
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ChurnPredictionRequest,
  ChurnPredictionResponse,
  ChurnFactor,
  RiskLevel,
  ModelInfo,
  TrainRequest,
  TrainResponse,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// Model metadata
const MODEL_VERSION = '1.0.0';
const MODEL_ID = `churn-model-${uuidv4()}`;

// Feature weights (simulating XGBoost learned weights)
const FEATURE_WEIGHTS: Record<string, number> = {
  daysSinceLastPurchase: 0.35,
  totalOrders: 0.20,
  averageOrderValue: 0.15,
  engagementScore: 0.20,
  supportTickets: 0.10,
};

// Feature importance (relative importance scores)
const FEATURE_IMPORTANCE = [
  { feature: 'daysSinceLastPurchase', importance: 0.35 },
  { feature: 'totalOrders', importance: 0.20 },
  { feature: 'averageOrderValue', importance: 0.15 },
  { feature: 'engagementScore', importance: 0.20 },
  { feature: 'supportTickets', importance: 0.10 },
];

// In-memory storage for training data
const trainingData: Array<{ features: TrainRequest['features']; label: boolean }> = [];

export class ChurnModelService {
  /**
   * Normalize a value to 0-1 range based on typical ranges
   */
  private normalizeFeature(name: string, value: number): number {
    const ranges: Record<string, { min: number; max: number }> = {
      daysSinceLastPurchase: { min: 0, max: 90 },
      totalOrders: { min: 0, max: 100 },
      averageOrderValue: { min: 0, max: 10000 },
      engagementScore: { min: 0, max: 100 },
      supportTickets: { min: 0, max: 20 },
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
   * Calculate churn probability using mock XGBoost logic
   * In production, this would call actual XGBoost model inference
   */
  private calculateChurnProbability(features: ChurnPredictionRequest['features']): number {
    let score = 0;

    // Days since last purchase (higher = more likely to churn)
    const daysNorm = this.normalizeFeature('daysSinceLastPurchase', features.daysSinceLastPurchase);
    score += daysNorm * this.getFeatureWeight('daysSinceLastPurchase') * 100;

    // Total orders (higher = less likely to churn)
    const ordersNorm = this.normalizeFeature('totalOrders', features.totalOrders);
    score += (1 - ordersNorm) * this.getFeatureWeight('totalOrders') * 100;

    // Average order value (higher = less likely to churn)
    const aovNorm = this.normalizeFeature('averageOrderValue', features.averageOrderValue);
    score += (1 - aovNorm) * this.getFeatureWeight('averageOrderValue') * 100;

    // Engagement score (higher = less likely to churn)
    const engagementNorm = this.normalizeFeature('engagementScore', features.engagementScore);
    score += (1 - engagementNorm) * this.getFeatureWeight('engagementScore') * 100;

    // Support tickets (higher = more likely to churn)
    const ticketsNorm = this.normalizeFeature('supportTickets', features.supportTickets);
    score += ticketsNorm * this.getFeatureWeight('supportTickets') * 100;

    // Convert score to probability (0-1)
    const probability = Math.min(1, Math.max(0, score / 100));
    return Math.round(probability * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Determine risk level based on churn probability
   */
  private getRiskLevel(probability: number): RiskLevel {
    if (probability < 0.3) return 'low';
    if (probability < 0.7) return 'medium';
    return 'high';
  }

  /**
   * Calculate feature impact on prediction
   * Shows which features contributed most to the prediction
   */
  private calculateFeatureImpact(features: ChurnPredictionRequest['features'], _probability: number): ChurnFactor[] {
    const impacts: ChurnFactor[] = [];

    // Days since last purchase impact
    const daysNorm = this.normalizeFeature('daysSinceLastPurchase', features.daysSinceLastPurchase);
    impacts.push({
      name: 'daysSinceLastPurchase',
      impact: Math.round(daysNorm * this.getFeatureWeight('daysSinceLastPurchase') * 100 * 10) / 10,
    });

    // Total orders impact
    const ordersNorm = this.normalizeFeature('totalOrders', features.totalOrders);
    impacts.push({
      name: 'totalOrders',
      impact: Math.round((1 - ordersNorm) * this.getFeatureWeight('totalOrders') * 100 * 10) / 10,
    });

    // Average order value impact
    const aovNorm = this.normalizeFeature('averageOrderValue', features.averageOrderValue);
    impacts.push({
      name: 'averageOrderValue',
      impact: Math.round((1 - aovNorm) * this.getFeatureWeight('averageOrderValue') * 100 * 10) / 10,
    });

    // Engagement score impact
    const engagementNorm = this.normalizeFeature('engagementScore', features.engagementScore);
    impacts.push({
      name: 'engagementScore',
      impact: Math.round((1 - engagementNorm) * this.getFeatureWeight('engagementScore') * 100 * 10) / 10,
    });

    // Support tickets impact
    const ticketsNorm = this.normalizeFeature('supportTickets', features.supportTickets);
    impacts.push({
      name: 'supportTickets',
      impact: Math.round(ticketsNorm * this.getFeatureWeight('supportTickets') * 100 * 10) / 10,
    });

    // Sort by absolute impact value (descending)
    return impacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  /**
   * Calculate prediction confidence based on feature completeness
   */
  private calculateConfidence(features: ChurnPredictionRequest['features']): number {
    // Base confidence
    let confidence = 0.85;

    // Boost for having substantial order history
    if (features.totalOrders > 5) confidence += 0.05;

    // Boost for reasonable engagement
    if (features.engagementScore > 30) confidence += 0.05;

    // Reduce for edge cases
    if (features.daysSinceLastPurchase > 60) confidence -= 0.10;
    if (features.supportTickets > 5) confidence -= 0.05;

    return Math.min(0.99, Math.max(0.50, Math.round(confidence * 100) / 100));
  }

  /**
   * Predict churn probability for a customer
   */
  predict(request: ChurnPredictionRequest): ChurnPredictionResponse {
    logger.info('Predicting churn', { customerId: request.customerId });

    const probability = this.calculateChurnProbability(request.features);
    const riskLevel = this.getRiskLevel(probability);
    const factors = this.calculateFeatureImpact(request.features, probability);
    const confidence = this.calculateConfidence(request.features);

    const response: ChurnPredictionResponse = {
      customerId: request.customerId,
      probability,
      riskLevel,
      factors,
      confidence,
      modelVersion: MODEL_VERSION,
      timestamp: new Date().toISOString(),
    };

    logger.info('Churn prediction complete', {
      customerId: request.customerId,
      probability,
      riskLevel,
    });

    return response;
  }

  /**
   * Train model with new data (mock implementation)
   */
  async train(requests: TrainRequest[]): Promise<TrainResponse> {
    logger.info('Training model', { sampleCount: requests.length });

    const modelId = `churn-model-${uuidv4()}`;

    // Store training data
    for (const req of requests) {
      trainingData.push({ features: req.features, label: req.label });
    }

    // Simulate training time
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Calculate mock metrics
    const metrics = {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.80 + Math.random() * 0.15,
      recall: 0.75 + Math.random() * 0.15,
      f1Score: 0.78 + Math.random() * 0.12,
      auc: 0.88 + Math.random() * 0.1,
    };

    logger.info('Training complete', { modelId, metrics });

    return {
      modelId,
      status: 'completed',
      metrics: {
        accuracy: Math.round(metrics.accuracy * 1000) / 1000,
        precision: Math.round(metrics.precision * 1000) / 1000,
        recall: Math.round(metrics.recall * 1000) / 1000,
        f1Score: Math.round(metrics.f1Score * 1000) / 1000,
        auc: Math.round(metrics.auc * 1000) / 1000,
      },
      trainingSamples: trainingData.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get model information
   */
  getModelInfo(id: string): ModelInfo {
    logger.info('Getting model info', { modelId: id });

    return {
      id,
      version: MODEL_VERSION,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: {
        accuracy: 0.892,
        precision: 0.865,
        recall: 0.841,
        f1Score: 0.853,
        auc: 0.924,
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
export const churnModelService = new ChurnModelService();
