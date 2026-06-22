/**
 * HOJAI Commerce Intelligence - Prediction Service
 * ML-powered predictions for commerce
 */

import { v4 as uuid } from 'uuid';
import { CommercePredictionModel } from '../models/index.js';
import { behaviorService } from './behaviorService.js';
import type { CommercePrediction } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('commerce-prediction');

export interface PredictionRequest {
  tenantId: string;
  userId: string;
  type: 'churn' | 'ltv' | 'next_purchase' | 'cart_recovery' | 'price_optimization' | 'product_demand' | 'inventory_demand';
  features?: Record<string, number>;
}

export interface PredictionResult {
  id: string;
  type: string;
  value: number;
  confidence: number;
  risk?: 'critical' | 'high' | 'medium' | 'low';
  factors: Array<{ name: string; importance: number; value: string | number }>;
  recommendations: Array<{ action: string; reason: string; priority: string }>;
  validUntil: Date;
}

export class PredictionService {
  private readonly VALIDITY_HOURS = 24;

  /**
   * Get prediction for a user
   */
  async predict(input: PredictionRequest): Promise<PredictionResult> {
    const { tenantId, userId, type, features } = input;

    // Check for cached prediction
    const cached = await this.getCachedPrediction(tenantId, userId, type);
    if (cached) {
      logger.info('prediction_cache_hit', { tenantId, userId, type });
      return cached;
    }

    // Generate prediction based on type
    let prediction: PredictionResult;

    switch (type) {
      case 'churn':
        prediction = await this.predictChurn(tenantId, userId, features);
        break;
      case 'ltv':
        prediction = await this.predictLTV(tenantId, userId, features);
        break;
      case 'next_purchase':
        prediction = await this.predictNextPurchase(tenantId, userId, features);
        break;
      case 'cart_recovery':
        prediction = await this.predictCartRecovery(tenantId, userId, features);
        break;
      case 'product_demand':
        prediction = await this.predictProductDemand(tenantId, userId, features);
        break;
      default:
        throw new Error(`Unknown prediction type: ${type}`);
    }

    // Cache prediction
    await this.cachePrediction(tenantId, userId, type, prediction);

    return prediction;
  }

  /**
   * Get all predictions for a user
   */
  async getAllPredictions(tenantId: string, userId: string): Promise<PredictionResult[]> {
    const types: Array<PredictionRequest['type']> = ['churn', 'ltv', 'next_purchase', 'cart_recovery'];
    const predictions: PredictionResult[] = [];

    for (const type of types) {
      try {
        const prediction = await this.predict({ tenantId, userId, type });
        predictions.push(prediction);
      } catch (error) {
        logger.error('prediction_failed', { tenantId, userId, type, error });
      }
    }

    return predictions;
  }

  /**
   * Churn prediction
   */
  private async predictChurn(
    tenantId: string,
    userId: string,
    features?: Record<string, number>
  ): Promise<PredictionResult> {
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    // Calculate churn probability
    let churnRisk = behavior.predictedChurnRisk;
    let confidence = 0.7;

    // Adjust based on provided features
    if (features) {
      if (features.daysSinceLastOrder !== undefined) {
        if (features.daysSinceLastOrder > 30) churnRisk = Math.min(1, churnRisk + 0.2);
        else if (features.daysSinceLastOrder <= 7) churnRisk = Math.max(0, churnRisk - 0.15);
      }
      if (features.loginFrequency !== undefined) {
        if (features.loginFrequency < 0.5) churnRisk = Math.min(1, churnRisk + 0.1);
      }
      confidence = Math.min(0.95, confidence + 0.1);
    }

    // Determine risk level
    let risk: 'critical' | 'high' | 'medium' | 'low';
    if (churnRisk >= 0.8) risk = 'critical';
    else if (churnRisk >= 0.6) risk = 'high';
    else if (churnRisk >= 0.4) risk = 'medium';
    else risk = 'low';

    // Generate factors
    const factors = [
      { name: 'days_since_last_order', importance: 0.35, value: behavior.lastOrderDate ?
        Math.floor((Date.now() - behavior.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : 999 },
      { name: 'cart_abandonment_rate', importance: 0.25, value: behavior.totalOrders > 0 ?
        behavior.cartAbandons / behavior.totalOrders : 0 },
      { name: 'engagement_score', importance: 0.2, value: behavior.frequencyScore },
      { name: 'session_frequency', importance: 0.1, value: behavior.totalSessions },
      { name: 'rfm_tier', importance: 0.1, value: behavior.rfmTier }
    ];

    // Generate recommendations
    const recommendations = this.generateChurnRecommendations(churnRisk, behavior);

    return {
      id: uuid(),
      type: 'churn',
      value: churnRisk,
      confidence,
      risk,
      factors,
      recommendations,
      validUntil: new Date(Date.now() + this.VALIDITY_HOURS * 60 * 60 * 1000)
    };
  }

  /**
   * LTV prediction
   */
  private async predictLTV(
    tenantId: string,
    userId: string,
    features?: Record<string, number>
  ): Promise<PredictionResult> {
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    // Calculate LTV
    let ltv = behavior.predictedLTV;
    let confidence = 0.75;

    // Adjust based on features
    if (features) {
      if (features.avgOrderValue !== undefined) {
        const projectedPurchases = features.projectedPurchases || 12;
        ltv = features.avgOrderValue * projectedPurchases;
      }
      if (features.retentionRate !== undefined) {
        ltv *= features.retentionRate;
        confidence = Math.min(0.9, confidence + 0.1);
      }
    }

    // Determine risk level (inverse of LTV quality)
    let risk: 'critical' | 'high' | 'medium' | 'low';
    const avgLTV = 5000; // Benchmark
    if (ltv < avgLTV * 0.3) risk = 'critical';
    else if (ltv < avgLTV * 0.6) risk = 'high';
    else if (ltv < avgLTV * 1.2) risk = 'medium';
    else risk = 'low';

    const factors = [
      { name: 'current_ltv', importance: 0.4, value: behavior.totalSpent },
      { name: 'avg_order_value', importance: 0.25, value: behavior.avgOrderValue },
      { name: 'purchase_frequency', importance: 0.2, value: behavior.totalOrders },
      { name: 'segment', importance: 0.15, value: behavior.segment }
    ];

    const recommendations = this.generateLTVRecommendations(ltv, behavior);

    return {
      id: uuid(),
      type: 'ltv',
      value: Math.round(ltv * 100) / 100,
      confidence,
      risk,
      factors,
      recommendations,
      validUntil: new Date(Date.now() + this.VALIDITY_HOURS * 60 * 60 * 1000)
    };
  }

  /**
   * Next purchase prediction
   */
  private async predictNextPurchase(
    tenantId: string,
    userId: string,
    features?: Record<string, number>
  ): Promise<PredictionResult> {
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    // Calculate days until next purchase
    let daysUntilPurchase = 14; // Default
    let confidence = 0.6;

    if (behavior.lastOrderDate) {
      const avgDaysBetweenOrders = behavior.lifetimeDays / Math.max(1, behavior.totalOrders);
      daysUntilPurchase = Math.max(1, Math.round(avgDaysBetweenOrders));
    }

    // Adjust based on churn risk
    if (behavior.predictedChurnRisk > 0.5) {
      daysUntilPurchase = Math.round(daysUntilPurchase * 1.5);
      confidence -= 0.1;
    }

    if (features?.daysSinceLastOrder !== undefined) {
      daysUntilPurchase = features.daysSinceLastOrder;
      confidence = Math.min(0.9, confidence + 0.2);
    }

    // Probability of purchase in next 7 days
    const purchaseProbability = Math.max(0.1, Math.min(0.95, 7 / daysUntilPurchase));

    const factors = [
      { name: 'avg_days_between_orders', importance: 0.35, value: daysUntilPurchase },
      { name: 'last_order_recency', importance: 0.25, value: behavior.lastOrderDate ?
        Math.floor((Date.now() - behavior.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : 999 },
      { name: 'purchase_count', importance: 0.2, value: behavior.totalOrders },
      { name: 'cart_activity', importance: 0.2, value: behavior.cartAbandons }
    ];

    const recommendations = this.generateNextPurchaseRecommendations(purchaseProbability, behavior);

    return {
      id: uuid(),
      type: 'next_purchase',
      value: purchaseProbability,
      confidence,
      factors,
      recommendations,
      validUntil: new Date(Date.now() + this.VALIDITY_HOURS * 60 * 60 * 1000)
    };
  }

  /**
   * Cart recovery prediction
   */
  private async predictCartRecovery(
    tenantId: string,
    userId: string,
    features?: Record<string, number>
  ): Promise<PredictionResult> {
    // Cart recovery is based on historical abandonment behavior
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    const cartAbandonRate = behavior.totalOrders > 0 ?
      behavior.cartAbandons / (behavior.totalOrders + behavior.cartAbandons) : 0.5;

    // Higher abandon rate = lower recovery probability
    const recoveryProbability = Math.max(0.1, 0.8 - cartAbandonRate);
    const confidence = 0.7;

    let risk: 'critical' | 'high' | 'medium' | 'low';
    if (recoveryProbability < 0.3) risk = 'critical';
    else if (recoveryProbability < 0.5) risk = 'high';
    else if (recoveryProbability < 0.7) risk = 'medium';
    else risk = 'low';

    const factors = [
      { name: 'cart_abandon_rate', importance: 0.4, value: cartAbandonRate },
      { name: 'total_abandons', importance: 0.25, value: behavior.cartAbandons },
      { name: 'engagement_level', importance: 0.2, value: behavior.totalSessions },
      { name: 'churn_risk', importance: 0.15, value: behavior.predictedChurnRisk }
    ];

    const recommendations = [
      { action: 'Send recovery email within 1 hour', reason: 'Peak recovery window', priority: 'high' },
      { action: 'Include discount incentive', reason: 'Motivate checkout completion', priority: 'medium' },
      { action: 'Show cart contents', reason: 'Remind of abandoned items', priority: 'medium' }
    ];

    return {
      id: uuid(),
      type: 'cart_recovery',
      value: recoveryProbability,
      confidence,
      risk,
      factors,
      recommendations,
      validUntil: new Date(Date.now() + this.VALIDITY_HOURS * 60 * 60 * 1000)
    };
  }

  /**
   * Product demand prediction
   */
  private async predictProductDemand(
    tenantId: string,
    userId: string,
    features?: Record<string, number>
  ): Promise<PredictionResult> {
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    // Simple demand score based on user's purchase patterns
    const demandScore = (behavior.frequencyScore + behavior.monetaryScore) / 10;
    const confidence = 0.65;

    const factors = [
      { name: 'purchase_frequency', importance: 0.35, value: behavior.frequencyScore },
      { name: 'spending_level', importance: 0.35, value: behavior.monetaryScore },
      { name: 'segment', importance: 0.2, value: behavior.segment },
      { name: 'churn_risk', importance: 0.1, value: behavior.predictedChurnRisk }
    ];

    const recommendations = [
      { action: 'Target with new product launches', reason: 'High demand score', priority: 'high' },
      { action: 'Bundle with complementary products', reason: 'Increase AOV', priority: 'medium' }
    ];

    return {
      id: uuid(),
      type: 'product_demand',
      value: demandScore,
      confidence,
      factors,
      recommendations,
      validUntil: new Date(Date.now() + this.VALIDITY_HOURS * 60 * 60 * 1000)
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateChurnRecommendations(
    churnRisk: number,
    behavior: any
  ): Array<{ action: string; reason: string; priority: string }> {
    const recommendations: Array<{ action: string; reason: string; priority: string }> = [];

    if (churnRisk >= 0.7) {
      recommendations.push(
        { action: 'Send personalized win-back offer', reason: 'Critical churn risk detected', priority: 'high' },
        { action: 'Enable SMS + Email notifications', reason: 'Re-engage immediately', priority: 'high' },
        { action: 'Trigger customer support outreach', reason: 'Personal intervention needed', priority: 'medium' }
      );
    } else if (churnRisk >= 0.5) {
      recommendations.push(
        { action: 'Offer loyalty points bonus', reason: 'Increase engagement', priority: 'high' },
        { action: 'Show recently viewed products', reason: 'Re-engage browsing behavior', priority: 'medium' }
      );
    } else {
      recommendations.push(
        { action: 'Maintain engagement with newsletters', reason: 'Keep user active', priority: 'low' }
      );
    }

    return recommendations;
  }

  private generateLTVRecommendations(
    ltv: number,
    behavior: any
  ): Array<{ action: string; reason: string; priority: string }> {
    const avgLTV = 5000;
    const recommendations: Array<{ action: string; reason: string; priority: string }> = [];

    if (ltv < avgLTV * 0.5) {
      recommendations.push(
        { action: 'Focus on increasing purchase frequency', reason: 'Low LTV - volume opportunity', priority: 'high' },
        { action: 'Offer bundle deals to increase AOV', reason: 'Boost per-order value', priority: 'medium' }
      );
    } else if (ltv > avgLTV * 2) {
      recommendations.push(
        { action: 'Move to VIP program', reason: 'High value customer', priority: 'high' },
        { action: 'Offer premium products', reason: 'Upsell opportunity', priority: 'medium' }
      );
    }

    return recommendations;
  }

  private generateNextPurchaseRecommendations(
    probability: number,
    behavior: any
  ): Array<{ action: string; reason: string; priority: string }> {
    const recommendations: Array<{ action: string; reason: string; priority: string }> = [];

    if (probability > 0.7) {
      recommendations.push(
        { action: 'Send product recommendation', reason: 'High purchase intent', priority: 'high' },
        { action: 'Offer limited-time discount', reason: 'Nudge to conversion', priority: 'medium' }
      );
    } else if (probability > 0.4) {
      recommendations.push(
        { action: 'Show wishlist items', reason: 'Re-engage interest', priority: 'medium' },
        { action: 'Send price drop alerts', reason: 'Create urgency', priority: 'low' }
      );
    }

    return recommendations;
  }

  private async getCachedPrediction(
    tenantId: string,
    userId: string,
    type: string
  ): Promise<PredictionResult | null> {
    const cached = await CommercePredictionModel.findOne({
      tenantId,
      userId,
      type,
      validUntil: { $gt: new Date() }
    });

    if (!cached) return null;

    return {
      id: cached.id,
      type: cached.type,
      value: cached.value,
      confidence: cached.confidence,
      risk: cached.risk as any,
      factors: cached.factors || [],
      recommendations: cached.recommendations || [],
      validUntil: cached.validUntil
    };
  }

  private async cachePrediction(
    tenantId: string,
    userId: string,
    type: string,
    prediction: PredictionResult
  ): Promise<void> {
    await CommercePredictionModel.findOneAndUpdate(
      { tenantId, userId, type },
      {
        id: prediction.id,
        tenantId,
        userId,
        type,
        value: prediction.value,
        confidence: prediction.confidence,
        risk: prediction.risk,
        factors: prediction.factors,
        recommendations: prediction.recommendations,
        validUntil: prediction.validUntil
      },
      { upsert: true }
    );
  }
}

export const predictionService = new PredictionService();
export default predictionService;
