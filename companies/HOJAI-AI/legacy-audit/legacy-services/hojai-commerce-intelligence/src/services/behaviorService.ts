/**
 * HOJAI Commerce Intelligence - Behavior Service
 * User behavior analysis and segmentation
 */

import { v4 as uuid } from 'uuid';
import { UserBehaviorModel, IUserBehavior } from '../models/index.js';
import type { UserSegment, RFMTier } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('commerce-behavior');

export interface UpdateBehaviorInput {
  tenantId: string;
  userId: string;
  sessionDuration?: number;
  pagesViewed?: number;
  productViewed?: string;
  productPurchased?: string;
  orderValue?: number;
  cartAbandoned?: boolean;
  wishlistAdded?: string;
}

export interface UserSegmentResult {
  userId: string;
  segment: UserSegment;
  rfmTier: RFMTier;
  churnRisk: number;
  ltv: number;
  recommendations: Array<{ action: string; priority: string }>;
}

export class BehaviorService {
  /**
   * Get or create user behavior record
   */
  async getOrCreateBehavior(tenantId: string, userId: string): Promise<IUserBehavior> {
    let behavior = await UserBehaviorModel.findOne({ tenantId, userId });

    if (!behavior) {
      behavior = new UserBehaviorModel({
        userId,
        tenantId,
        segment: 'new',
        rfmTier: 'potential',
        recencyScore: 5,
        frequencyScore: 1,
        monetaryScore: 1,
        totalSessions: 0,
        totalOrders: 0,
        totalSpent: 0
      });
      await behavior.save();
      logger.info('user_behavior_created', { tenantId, userId });
    }

    return behavior;
  }

  /**
   * Update user behavior from events
   */
  async updateBehavior(input: UpdateBehaviorInput): Promise<IUserBehavior> {
    const { tenantId, userId } = input;
    const behavior = await this.getOrCreateBehavior(tenantId, userId);

    // Update session metrics
    if (input.sessionDuration !== undefined) {
      behavior.totalSessions += 1;
      behavior.avgSessionDuration =
        (behavior.avgSessionDuration * (behavior.totalSessions - 1) + input.sessionDuration) /
        behavior.totalSessions;
    }

    if (input.pagesViewed !== undefined) {
      behavior.pagesPerSession = input.pagesViewed;
    }

    // Track product views
    if (input.productViewed) {
      if (!behavior.productsViewed.includes(input.productViewed)) {
        behavior.productsViewed.push(input.productViewed);
      }
    }

    // Track purchases
    if (input.orderValue !== undefined && input.orderValue > 0) {
      behavior.totalOrders += 1;
      behavior.totalSpent += input.orderValue;
      behavior.avgOrderValue = behavior.totalSpent / behavior.totalOrders;
      behavior.lastOrderDate = new Date();
    }

    // Track purchased products
    if (input.productPurchased) {
      if (!behavior.productsPurchased.includes(input.productPurchased)) {
        behavior.productsPurchased.push(input.productPurchased);
      }
    }

    // Track cart abandonment
    if (input.cartAbandoned) {
      behavior.cartAbandons += 1;
    }

    // Track wishlist
    if (input.wishlistAdded) {
      if (!behavior.wishlistItems.includes(input.wishlistAdded)) {
        behavior.wishlistItems.push(input.wishlistAdded);
      }
    }

    // Update activity
    behavior.lastActiveAt = new Date();

    // Recalculate RFM
    this.calculateRFM(behavior);

    // Update segment
    this.updateSegment(behavior);

    // Predict churn and LTV
    this.predictRiskAndLTV(behavior);

    await behavior.save();
    logger.info('user_behavior_updated', { tenantId, userId, segment: behavior.segment });

    return behavior;
  }

  /**
   * Calculate RFM scores
   */
  private calculateRFM(behavior: IUserBehavior): void {
    const now = new Date();
    const lastActive = behavior.lastOrderDate || behavior.createdAt;
    const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    // Recency: More recent = higher score
    if (daysSinceActive <= 7) behavior.recencyScore = 5;
    else if (daysSinceActive <= 14) behavior.recencyScore = 4;
    else if (daysSinceActive <= 30) behavior.recencyScore = 3;
    else if (daysSinceActive <= 60) behavior.recencyScore = 2;
    else behavior.recencyScore = 1;

    // Frequency: More orders = higher score
    if (behavior.totalOrders >= 10) behavior.frequencyScore = 5;
    else if (behavior.totalOrders >= 5) behavior.frequencyScore = 4;
    else if (behavior.totalOrders >= 3) behavior.frequencyScore = 3;
    else if (behavior.totalOrders >= 1) behavior.frequencyScore = 2;
    else behavior.frequencyScore = 1;

    // Monetary: Higher spend = higher score
    if (behavior.avgOrderValue >= 10000) behavior.monetaryScore = 5;
    else if (behavior.avgOrderValue >= 5000) behavior.monetaryScore = 4;
    else if (behavior.avgOrderValue >= 1000) behavior.monetaryScore = 3;
    else if (behavior.avgOrderValue >= 500) behavior.monetaryScore = 2;
    else behavior.monetaryScore = 1;

    // Determine RFM tier
    const rfmScore = behavior.recencyScore + behavior.frequencyScore + behavior.monetaryScore;

    if (rfmScore >= 13) behavior.rfmTier = 'champions';
    else if (rfmScore >= 10) behavior.rfmTier = 'loyal';
    else if (rfmScore >= 7) behavior.rfmTier = 'potential';
    else if (rfmScore >= 5) behavior.rfmTier = 'at_risk';
    else behavior.rfmTier = 'lost';
  }

  /**
   * Update user segment based on behavior
   */
  private updateSegment(behavior: IUserBehavior): void {
    const now = new Date();
    const createdAt = behavior.createdAt;
    const lifetimeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    behavior.lifetimeDays = lifetimeDays;

    // Whales: High value customers
    if (behavior.totalSpent >= 50000 && behavior.totalOrders >= 10) {
      behavior.segment = 'whale';
    }
    // VIP: Frequent high-value customers
    else if (behavior.frequencyScore >= 4 && behavior.monetaryScore >= 4) {
      behavior.segment = 'vip';
    }
    // Churned: Inactive for > 60 days
    else if (lifetimeDays > 60 && behavior.predictedChurnRisk > 0.7) {
      behavior.segment = 'churned';
    }
    // At Risk: Declining engagement
    else if (behavior.cartAbandons > 3 || behavior.predictedChurnRisk > 0.5) {
      behavior.segment = 'at_risk';
    }
    // Inactive: No activity > 30 days
    else if (lifetimeDays > 30 && behavior.totalOrders === 0) {
      behavior.segment = 'inactive';
    }
    // Dormant: Had activity but none recently
    else if (behavior.lastActiveAt && (now.getTime() - behavior.lastActiveAt.getTime()) > 30 * 24 * 60 * 60 * 1000) {
      behavior.segment = 'dormant';
    }
    // Active: Recent engagement
    else if (behavior.totalOrders > 0) {
      behavior.segment = 'active';
    }
    // New: No purchase yet
    else {
      behavior.segment = 'new';
    }
  }

  /**
   * Predict churn risk and LTV
   */
  private predictRiskAndLTV(behavior: IUserBehavior): void {
    const now = new Date();

    // Calculate churn risk based on multiple factors
    let riskScore = 0.5;

    // Recency factor
    if (behavior.lastActiveAt) {
      const daysSinceActive = (now.getTime() - behavior.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActive > 30) riskScore += 0.3;
      else if (daysSinceActive > 14) riskScore += 0.15;
      else if (daysSinceActive <= 3) riskScore -= 0.2;
    }

    // Engagement factor
    if (behavior.cartAbandons > behavior.totalOrders * 0.5 && behavior.totalOrders > 3) {
      riskScore += 0.15;
    }

    // Frequency factor
    if (behavior.frequencyScore <= 2) riskScore += 0.1;

    // Clamp risk score
    behavior.predictedChurnRisk = Math.max(0, Math.min(1, riskScore));

    // Calculate predicted LTV
    if (behavior.totalOrders > 0 && behavior.lifetimeDays > 0) {
      const dailyValue = behavior.totalSpent / behavior.lifetimeDays;
      const remainingDays = Math.max(0, 365 - behavior.lifetimeDays);
      behavior.predictedLTV = behavior.totalSpent + (dailyValue * remainingDays * 0.5);
    } else {
      behavior.predictedLTV = behavior.avgOrderValue * 3; // Estimate 3 future purchases
    }
  }

  /**
   * Get user segment with recommendations
   */
  async getUserSegment(tenantId: string, userId: string): Promise<UserSegmentResult | null> {
    const behavior = await UserBehaviorModel.findOne({ tenantId, userId });
    if (!behavior) return null;

    const recommendations = this.generateRecommendations(behavior);

    return {
      userId,
      segment: behavior.segment as UserSegment,
      rfmTier: behavior.rfmTier as RFMTier,
      churnRisk: behavior.predictedChurnRisk,
      ltv: behavior.predictedLTV,
      recommendations
    };
  }

  /**
   * Generate segment-specific recommendations
   */
  private generateRecommendations(behavior: IUserBehavior): Array<{ action: string; priority: string }> {
    const recommendations: Array<{ action: string; priority: string }> = [];

    switch (behavior.segment) {
      case 'new':
        recommendations.push(
          { action: 'Send welcome discount', priority: 'high' },
          { action: 'Show popular products', priority: 'high' },
          { action: 'Enable push notifications', priority: 'medium' }
        );
        break;
      case 'at_risk':
        recommendations.push(
          { action: 'Send win-back offer', priority: 'high' },
          { action: 'Show recently viewed items', priority: 'high' },
          { action: 'Request feedback', priority: 'medium' }
        );
        break;
      case 'churned':
        recommendations.push(
          { action: 'Send deep discount offer', priority: 'high' },
          { action: 'Highlight new products', priority: 'medium' },
          { action: 'Offer loyalty points', priority: 'medium' }
        );
        break;
      case 'vip':
        recommendations.push(
          { action: 'Early access to new products', priority: 'high' },
          { action: 'Exclusive member benefits', priority: 'high' },
          { action: 'Personalized premium recommendations', priority: 'medium' }
        );
        break;
      case 'whale':
        recommendations.push(
          { action: 'VIP concierge service', priority: 'high' },
          { action: 'Custom product bundles', priority: 'high' },
          { action: 'Invitation to exclusive events', priority: 'medium' }
        );
        break;
      case 'active':
        recommendations.push(
          { action: 'Cross-sell complementary products', priority: 'high' },
          { action: 'Loyalty tier upgrade offer', priority: 'medium' },
          { action: 'Review request', priority: 'low' }
        );
        break;
    }

    return recommendations;
  }

  /**
   * Get users by segment
   */
  async getUsersBySegment(tenantId: string, segment: UserSegment, limit = 100): Promise<IUserBehavior[]> {
    return UserBehaviorModel.find({ tenantId, segment })
      .sort({ predictedLTV: -1 })
      .limit(limit);
  }

  /**
   * Get at-risk users
   */
  async getAtRiskUsers(tenantId: string, limit = 100): Promise<IUserBehavior[]> {
    return UserBehaviorModel.find({
      tenantId,
      predictedChurnRisk: { $gte: 0.5 },
      segment: { $in: ['at_risk', 'churned', 'dormant', 'inactive'] }
    })
      .sort({ predictedChurnRisk: -1 })
      .limit(limit);
  }

  /**
   * Get high-value users
   */
  async getHighValueUsers(tenantId: string, limit = 100): Promise<IUserBehavior[]> {
    return UserBehaviorModel.find({
      tenantId,
      segment: { $in: ['vip', 'whale'] }
    })
      .sort({ predictedLTV: -1 })
      .limit(limit);
  }
}

export const behaviorService = new BehaviorService();
export default behaviorService;
