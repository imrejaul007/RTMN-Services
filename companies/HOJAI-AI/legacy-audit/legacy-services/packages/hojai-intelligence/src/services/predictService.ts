import mongoose from 'mongoose';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import {
  Prediction,
  PredictionType,
  PredictionRisk,
  RFM,
  RFMTier
} from '../types/index.js';
import { PredictionModel, RFMModel } from '../models/predictModel.js';

// ============================================================================
// PREDICTION SERVICE
// ============================================================================

export class PredictService {
  private redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  /**
   * Get churn prediction for a user
   */
  async predictChurn(params: {
    tenantId: string;
    userId: string;
    features?: Record<string, number>;
  }): Promise<Prediction> {
    // Check cache
    const cacheKey = `churn:${params.tenantId}:${params.userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // In production, this would call actual ML model
    // For now, compute a heuristic prediction
    const features = params.features || {};
    const churnProbability = this.computeChurnScore(features);
    const risk = this.getChurnRisk(churnProbability);

    const prediction: Prediction = {
      id: uuid(),
      tenantId: params.tenantId,
      userId: params.userId,
      type: PredictionType.CHURN,
      value: churnProbability,
      risk,
      confidence: 0.75,
      model: 'churn-v1',
      factors: this.getChurnFactors(features),
      explanation: this.getChurnExplanation(churnProbability, risk),
      recommendations: this.getChurnRecommendations(risk),
      features,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    };

    // Save to database
    await PredictionModel.create(prediction);

    // Cache result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(prediction));

    return prediction;
  }

  /**
   * Get LTV prediction for a user
   */
  async predictLTV(params: {
    tenantId: string;
    userId: string;
    features?: Record<string, number>;
    timeframe?: number; // days
  }): Promise<Prediction> {
    const cacheKey = `ltv:${params.tenantId}:${params.userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const features = params.features || {};
    const ltvValue = this.computeLTV(features, params.timeframe || 365);

    const prediction: Prediction = {
      id: uuid(),
      tenantId: params.tenantId,
      userId: params.userId,
      type: PredictionType.LTV,
      value: ltvValue,
      confidence: 0.70,
      model: 'ltv-v1',
      factors: this.getLTVFactors(features),
      explanation: `Predicted 365-day lifetime value: ₹${ltvValue.toFixed(0)}`,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date()
    };

    await PredictionModel.create(prediction);
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(prediction));

    return prediction;
  }

  /**
   * Get revisit prediction
   */
  async predictRevisit(params: {
    tenantId: string;
    userId: string;
    features?: Record<string, number>;
  }): Promise<Prediction> {
    const cacheKey = `revisit:${params.tenantId}:${params.userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const features = params.features || {};
    const revisitProbability = this.computeRevisitScore(features);
    const daysUntil = this.estimateRevisitDays(features);

    const prediction: Prediction = {
      id: uuid(),
      tenantId: params.tenantId,
      userId: params.userId,
      type: PredictionType.REVISIT,
      value: revisitProbability,
      confidence: 0.72,
      model: 'revisit-v1',
      factors: this.getRevisitFactors(features),
      explanation: `${(revisitProbability * 100).toFixed(0)}% chance of returning within ${daysUntil} days`,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date()
    };

    await PredictionModel.create(prediction);
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(prediction));

    return prediction;
  }

  /**
   * Get conversion prediction
   */
  async predictConversion(params: {
    tenantId: string;
    userId: string;
    context?: Record<string, unknown>;
  }): Promise<Prediction> {
    const features = params.context || {};
    const conversionProbability = this.computeConversionScore(features);

    const prediction: Prediction = {
      id: uuid(),
      tenantId: params.tenantId,
      userId: params.userId,
      type: PredictionType.CONVERSION,
      value: conversionProbability,
      confidence: 0.68,
      model: 'conversion-v1',
      explanation: `${(conversionProbability * 100).toFixed(0)}% conversion probability`,
      validUntil: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      createdAt: new Date()
    };

    await PredictionModel.create(prediction);
    return prediction;
  }

  /**
   * Get all predictions for a user
   */
  async getAllPredictions(params: {
    tenantId: string;
    userId: string;
    features?: Record<string, number>;
  }): Promise<Prediction[]> {
    const [churn, ltv, revisit] = await Promise.all([
      this.predictChurn(params),
      this.predictLTV(params),
      this.predictRevisit(params)
    ]);

    return [churn, ltv, revisit];
  }

  /**
   * Get at-risk users
   */
  async getAtRiskUsers(tenantId: string, limit = 100): Promise<Prediction[]> {
    const predictions = await PredictionModel.find({
      tenantId,
      type: PredictionType.CHURN,
      risk: { $in: ['high', 'critical'] }
    })
      .sort({ value: -1 })
      .limit(limit);

    return predictions.map(p => p.toObject() as Prediction);
  }

  /**
   * Get high-value users
   */
  async getHighValueUsers(tenantId: string, limit = 100): Promise<Prediction[]> {
    const predictions = await PredictionModel.find({
      tenantId,
      type: PredictionType.LTV
    })
      .sort({ value: -1 })
      .limit(limit);

    return predictions.map(p => p.toObject() as Prediction);
  }

  // =========================================================================
  // RFM ANALYSIS
  // =========================================================================

  /**
   * Compute RFM for a user
   */
  async computeRFM(params: {
    tenantId: string;
    userId: string;
    lastOrderDate: Date;
    totalOrders: number;
    totalSpent: number;
  }): Promise<RFM> {
    const recencyDays = Math.floor(
      (Date.now() - params.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate RFM scores (1-5)
    const recencyScore = this.getRecencyScore(recencyDays);
    const frequencyScore = this.getFrequencyScore(params.totalOrders);
    const monetaryScore = this.getMonetaryScore(params.totalSpent, params.totalOrders);

    const rfmScore = recencyScore + frequencyScore + monetaryScore;
    const tier = this.getRFMTier(recencyScore, frequencyScore, monetaryScore);

    const rfm: RFM = {
      id: uuid(),
      tenantId: params.tenantId,
      userId: params.userId,
      recencyScore,
      frequencyScore,
      monetaryScore,
      rfmScore,
      tier,
      lastOrderDate: params.lastOrderDate,
      totalOrders: params.totalOrders,
      totalSpent: params.totalSpent,
      averageOrderValue: params.totalOrders > 0 ? params.totalSpent / params.totalOrders : 0,
      segment: this.getRFMSegment(tier),
      computedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    await RFMModel.findOneAndUpdate(
      { tenantId: params.tenantId, userId: params.userId },
      rfm,
      { upsert: true }
    );

    return rfm;
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private computeChurnScore(features: Record<string, number>): number {
    // Simplified heuristic - in production, use actual ML model
    const daysSinceLastOrder = features.daysSinceLastOrder || 30;
    const orderFrequency = features.orderFrequency || 1;
    const engagementScore = features.engagementScore || 0.5;

    let score = 0.5;

    // Days since last order (more days = higher churn risk)
    if (daysSinceLastOrder > 60) score += 0.3;
    else if (daysSinceLastOrder > 30) score += 0.15;

    // Order frequency (less frequent = higher churn risk)
    if (orderFrequency < 0.5) score += 0.2;
    else if (orderFrequency < 1) score += 0.1;

    // Engagement (low engagement = higher churn risk)
    if (engagementScore < 0.3) score += 0.2;
    else if (engagementScore < 0.5) score += 0.1;

    return Math.min(Math.max(score, 0), 1);
  }

  private getChurnRisk(probability: number): PredictionRisk {
    if (probability >= 0.8) return PredictionRisk.CRITICAL;
    if (probability >= 0.6) return PredictionRisk.HIGH;
    if (probability >= 0.4) return PredictionRisk.MEDIUM;
    return PredictionRisk.LOW;
  }

  private getChurnFactors(features: Record<string, number>) {
    return [
      { name: 'Days Since Last Order', importance: 0.4, value: features.daysSinceLastOrder || 0 },
      { name: 'Order Frequency', importance: 0.3, value: features.orderFrequency || 0 },
      { name: 'Engagement Score', importance: 0.2, value: features.engagementScore || 0 },
      { name: 'Support Tickets', importance: 0.1, value: features.supportTickets || 0 }
    ];
  }

  private getChurnExplanation(probability: number, risk: PredictionRisk): string {
    const pct = (probability * 100).toFixed(0);
    const riskText = risk === PredictionRisk.CRITICAL ? 'immediate' :
                     risk === PredictionRisk.HIGH ? 'high' :
                     risk === PredictionRisk.MEDIUM ? 'moderate' : 'low';
    return `This customer has ${pct}% probability of churning. Risk level: ${riskText}.`;
  }

  private getChurnRecommendations(risk: PredictionRisk) {
    if (risk === PredictionRisk.CRITICAL) {
      return [
        { action: 'Send win-back offer', reason: 'Critical churn risk detected', priority: 'high' },
        { action: 'Personal outreach', reason: 'Requires immediate attention', priority: 'high' },
        { action: 'Review recent interactions', reason: 'Identify pain points', priority: 'medium' }
      ];
    }
    if (risk === PredictionRisk.HIGH) {
      return [
        { action: 'Send loyalty incentive', reason: 'High churn risk', priority: 'high' },
        { action: 'Request feedback', reason: 'Understand concerns', priority: 'medium' }
      ];
    }
    return [
      { action: 'Engage with personalized content', reason: 'Maintain connection', priority: 'low' }
    ];
  }

  private computeLTV(features: Record<string, number>, timeframe: number): number {
    const avgOrderValue = features.averageOrderValue || 500;
    const ordersPerMonth = features.ordersPerMonth || 2;
    const expectedOrders = ordersPerMonth * (timeframe / 30);
    return avgOrderValue * expectedOrders;
  }

  private getLTVFactors(features: Record<string, number>) {
    return [
      { name: 'Average Order Value', importance: 0.4, value: features.averageOrderValue || 0 },
      { name: 'Orders Per Month', importance: 0.35, value: features.ordersPerMonth || 0 },
      { name: 'Customer Tenure (months)', importance: 0.25, value: features.tenure || 0 }
    ];
  }

  private computeRevisitScore(features: Record<string, number>): number {
    const orderFrequency = features.orderFrequency || 1;
    const avgDaysBetweenOrders = features.avgDaysBetweenOrders || 14;

    let score = 0.5;

    if (orderFrequency >= 4) score += 0.3;
    else if (orderFrequency >= 2) score += 0.2;
    else if (orderFrequency >= 1) score += 0.1;

    if (avgDaysBetweenOrders <= 7) score += 0.2;
    else if (avgDaysBetweenOrders <= 14) score += 0.1;

    return Math.min(Math.max(score, 0), 1);
  }

  private estimateRevisitDays(features: Record<string, number>): number {
    return features.avgDaysBetweenOrders || 14;
  }

  private getRevisitFactors(features: Record<string, number>) {
    return [
      { name: 'Order Frequency', importance: 0.5, value: features.orderFrequency || 0 },
      { name: 'Avg Days Between Orders', importance: 0.3, value: features.avgDaysBetweenOrders || 0 },
      { name: 'Seasonality', importance: 0.2, value: features.seasonality || 'normal' }
    ];
  }

  private computeConversionScore(features: Record<string, number>): number {
    const cartValue = features.cartValue || 0;
    const itemCount = features.itemCount || 0;
    const visitCount = features.visitCount || 1;

    let score = 0.3;

    if (cartValue > 1000) score += 0.2;
    else if (cartValue > 500) score += 0.15;
    else if (cartValue > 200) score += 0.1;

    if (itemCount >= 3) score += 0.2;
    else if (itemCount >= 2) score += 0.1;

    if (visitCount >= 3) score += 0.15;
    else if (visitCount >= 2) score += 0.1;

    return Math.min(Math.max(score, 0), 1);
  }

  // RFM helper methods
  private getRecencyScore(days: number): number {
    if (days <= 7) return 5;
    if (days <= 14) return 4;
    if (days <= 30) return 3;
    if (days <= 60) return 2;
    return 1;
  }

  private getFrequencyScore(orders: number): number {
    if (orders >= 10) return 5;
    if (orders >= 6) return 4;
    if (orders >= 3) return 3;
    if (orders >= 2) return 2;
    return 1;
  }

  private getMonetaryScore(spent: number): number {
    if (spent >= 10000) return 5;
    if (spent >= 5000) return 4;
    if (spent >= 2000) return 3;
    if (spent >= 500) return 2;
    return 1;
  }

  private getRFMTier(r: number, f: number, m: number): RFMTier {
    const score = r + f + m;
    if (score >= 13) return RFMTier.CHAMPIONS;
    if (score >= 10 && r >= 4 && f >= 4) return RFMTier.LOYAL;
    if (score >= 8 && r >= 3) return RFMTier.POTENTIAL;
    if (score >= 6 || r <= 2) return RFMTier.AT_RISK;
    return RFMTier.LOST;
  }

  private getRFMSegment(tier: RFMTier): string {
    const segments: Record<RFMTier, string> = {
      [RFMTier.CHAMPIONS]: 'Best customers - buy often, recent, high spend',
      [RFMTier.LOYAL]: 'Loyal customers with consistent purchases',
      [RFMTier.POTENTIAL]: 'Good customers with growth potential',
      [RFMTier.AT_RISK]: 'Customers showing signs of churning',
      [RFMTier.LOST]: 'Inactive customers requiring win-back'
    };
    return segments[tier];
  }
}

export const predictService = new PredictService();
