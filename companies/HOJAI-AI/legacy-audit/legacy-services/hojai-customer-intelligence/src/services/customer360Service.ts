/**
 * HOJAI Customer Intelligence - Customer 360 Service
 */

import { v4 as uuid } from 'uuid';
import { Customer360ProfileModel, InteractionModel, CustomerInsightModel } from '../models/index.js';
import type { CustomerLifecycleStage, CustomerValueTier } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('customer360');

export class Customer360Service {
  /**
   * Get or create customer profile
   */
  async getOrCreateProfile(tenantId: string, customerId: string): Promise<any> {
    let profile = await Customer360ProfileModel.findOne({ tenantId, customerId });

    if (!profile) {
      const now = new Date();
      profile = new Customer360ProfileModel({
        customerId,
        tenantId,
        identity: {},
        lifecycle: {
          stage: 'new',
          firstSeenAt: now,
          lastSeenAt: now,
          lifetimeDays: 0
        },
        value: {
          tier: 'basic',
          totalSpent: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          predictedLTV: 0,
          clv: 0
        },
        engagement: {
          sessions: 0,
          avgSessionDuration: 0,
          pagesViewed: 0,
          productsViewed: 0,
          wishlistItems: 0,
          cartAbandons: 0
        },
        preferences: {
          categories: [],
          brands: [],
          communicationChannel: 'email',
          notificationsEnabled: true
        },
        satisfaction: {
          avgRating: 0,
          reviewsCount: 0,
          nps: 0
        },
        risk: {
          churnScore: 0.5,
          churnRisk: 'low',
          inactiveDays: 0,
          refundRate: 0
        },
        compliance: {
          gdprConsent: false,
          marketingConsent: false
        }
      });
      await profile.save();
      logger.info('customer_profile_created', { tenantId, customerId });
    }

    return profile;
  }

  /**
   * Get customer 360 profile
   */
  async getProfile(tenantId: string, customerId: string): Promise<any> {
    const profile = await this.getOrCreateProfile(tenantId, customerId);
    return this.formatProfile(profile);
  }

  /**
   * Update customer profile
   */
  async updateProfile(tenantId: string, customerId: string, updates: Record<string, unknown>): Promise<any> {
    const profile = await this.getOrCreateProfile(tenantId, customerId);

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        (profile as any)[key] = updates[key];
      }
    });

    // Recalculate derived fields
    this.recalculateProfile(profile);

    await profile.save();
    logger.info('customer_profile_updated', { tenantId, customerId });

    return this.formatProfile(profile);
  }

  /**
   * Record interaction
   */
  async recordInteraction(
    tenantId: string,
    customerId: string,
    type: string,
    data?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<any> {
    const interaction = new InteractionModel({
      id: uuid(),
      customerId,
      tenantId,
      type,
      channel: context?.channel as string || 'web',
      data,
      context,
      timestamp: new Date()
    });

    await interaction.save();

    // Update profile based on interaction
    await this.updateProfileFromInteraction(tenantId, customerId, type, data, context);

    logger.info('interaction_recorded', { tenantId, customerId, type });

    return interaction;
  }

  /**
   * Get customer timeline
   */
  async getTimeline(
    tenantId: string,
    customerId: string,
    limit: number = 50
  ): Promise<any[]> {
    const interactions = await InteractionModel.find({ tenantId, customerId })
      .sort({ timestamp: -1 })
      .limit(limit);

    return interactions.map(i => ({
      id: i.id,
      type: i.type,
      channel: i.channel,
      data: i.data,
      context: i.context,
      timestamp: i.timestamp
    }));
  }

  /**
   * Generate customer insights
   */
  async generateInsights(tenantId: string, customerId: string): Promise<any[]> {
    const profile = await this.getOrCreateProfile(tenantId, customerId);
    const insights = [];

    // Behavior insights
    if (profile.engagement.sessions > 10) {
      insights.push({
        id: uuid(),
        customerId,
        tenantId,
        type: 'behavior',
        category: 'engagement',
        title: 'Highly Engaged Customer',
        description: `This customer has ${profile.engagement.sessions} sessions with an average duration of ${Math.round(profile.engagement.avgSessionDuration / 60)} minutes.`,
        confidence: 0.85,
        data: { sessions: profile.engagement.sessions, avgDuration: profile.engagement.avgSessionDuration },
        actions: [{ type: 'retention', title: 'Offer loyalty benefits', priority: 'high' }]
      });
    }

    // Value insights
    if (profile.value.tier === 'platinum' || profile.value.tier === 'diamond') {
      insights.push({
        id: uuid(),
        customerId,
        tenantId,
        type: 'propensity',
        category: 'upsell',
        title: 'High-Value Customer',
        description: `Customer has spent ${profile.value.totalSpent} with an average order value of ${profile.value.avgOrderValue}.`,
        confidence: 0.9,
        data: { totalSpent: profile.value.totalSpent, avgOrderValue: profile.value.avgOrderValue },
        actions: [{ type: 'upsell', title: 'Offer premium products', priority: 'high' }]
      });
    }

    // Risk insights
    if (profile.risk.churnRisk === 'high' || profile.risk.churnRisk === 'critical') {
      insights.push({
        id: uuid(),
        customerId,
        tenantId,
        type: 'risk',
        category: 'churn',
        title: 'Churn Risk Detected',
        description: `Customer has not been active for ${profile.risk.inactiveDays} days. Churn probability: ${Math.round(profile.risk.churnScore * 100)}%.`,
        confidence: 0.8,
        data: { inactiveDays: profile.risk.inactiveDays, churnScore: profile.risk.churnScore },
        actions: [{ type: 'winback', title: 'Send win-back campaign', priority: 'high' }]
      });
    }

    // Preference insights
    if (profile.preferences.categories.length > 0) {
      insights.push({
        id: uuid(),
        customerId,
        tenantId,
        type: 'preference',
        category: 'product',
        title: 'Category Preferences Identified',
        description: `Customer prefers: ${profile.preferences.categories.join(', ')}.`,
        confidence: 0.75,
        data: { categories: profile.preferences.categories },
        actions: [{ type: 'personalize', title: 'Personalize recommendations', priority: 'medium' }]
      });
    }

    // Save insights
    for (const insight of insights) {
      await CustomerInsightModel.findOneAndUpdate(
        { customerId, tenantId, type: insight.type, category: insight.category },
        insight,
        { upsert: true }
      );
    }

    return insights;
  }

  /**
   * Get customer insights
   */
  async getInsights(tenantId: string, customerId: string): Promise<any[]> {
    const insights = await CustomerInsightModel.find({ tenantId, customerId })
      .sort({ confidence: -1 });

    if (insights.length === 0) {
      return this.generateInsights(tenantId, customerId);
    }

    return insights.map(i => ({
      id: i.id,
      type: i.type,
      category: i.category,
      title: i.title,
      description: i.description,
      confidence: i.confidence,
      actions: i.actions
    }));
  }

  /**
   * Calculate customer health score
   */
  async getHealthScore(tenantId: string, customerId: string): Promise<{
    score: number;
    components: {
      engagement: number;
      value: number;
      satisfaction: number;
      risk: number;
    };
    grade: string;
  }> {
    const profile = await this.getOrCreateProfile(tenantId, customerId);

    // Engagement score (0-100)
    const engagementScore = Math.min(100, (profile.engagement.sessions / 20) * 50 +
      (profile.engagement.avgSessionDuration / 300) * 50);

    // Value score (0-100)
    const valueScore = Math.min(100, (profile.value.totalSpent / 50000) * 50 +
      (profile.value.totalOrders / 20) * 50);

    // Satisfaction score (0-100)
    const satisfactionScore = (profile.satisfaction.avgRating / 5) * 100;

    // Risk score (inverse, 0-100)
    const riskScore = (1 - profile.risk.churnScore) * 100;

    // Overall score
    const overallScore = Math.round(
      (engagementScore * 0.25) +
      (valueScore * 0.30) +
      (satisfactionScore * 0.20) +
      (riskScore * 0.25)
    );

    // Grade
    let grade: string;
    if (overallScore >= 90) grade = 'A+';
    else if (overallScore >= 80) grade = 'A';
    else if (overallScore >= 70) grade = 'B+';
    else if (overallScore >= 60) grade = 'B';
    else if (overallScore >= 50) grade = 'C';
    else grade = 'D';

    return {
      score: overallScore,
      components: {
        engagement: Math.round(engagementScore),
        value: Math.round(valueScore),
        satisfaction: Math.round(satisfactionScore),
        risk: Math.round(riskScore)
      },
      grade
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async updateProfileFromInteraction(
    tenantId: string,
    customerId: string,
    type: string,
    data?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(tenantId, customerId);

    profile.lifecycle.lastSeenAt = new Date();

    switch (type) {
      case 'purchase':
        profile.value.totalOrders += 1;
        if (data?.amount) {
          profile.value.totalSpent += data.amount as number;
          profile.value.avgOrderValue = profile.value.totalSpent / profile.value.totalOrders;
        }
        profile.lifecycle.lastPurchaseAt = new Date();
        break;
      case 'product_view':
        profile.engagement.productsViewed += 1;
        if (context?.category) {
          if (!profile.preferences.categories.includes(context.category as string)) {
            profile.preferences.categories.push(context.category as string);
          }
        }
        break;
      case 'add_to_cart':
        profile.engagement.pagesViewed += 1;
        break;
      case 'cart_abandon':
        profile.engagement.cartAbandons += 1;
        break;
      case 'wishlist_add':
        profile.engagement.wishlistItems += 1;
        if (context?.productId) {
          profile.preferences.categories.push(context.category as string || 'general');
        }
        break;
      case 'app_open':
      case 'login':
        profile.engagement.sessions += 1;
        break;
    }

    this.recalculateProfile(profile);
    await profile.save();
  }

  private recalculateProfile(profile: any): void {
    const now = new Date();

    // Lifetime days
    profile.lifecycle.lifetimeDays = Math.floor(
      (now.getTime() - profile.lifecycle.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Inactive days
    if (profile.lifecycle.lastSeenAt) {
      profile.risk.inactiveDays = Math.floor(
        (now.getTime() - profile.lifecycle.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Churn risk
    if (profile.risk.inactiveDays > 60) profile.risk.churnScore = 0.9;
    else if (profile.risk.inactiveDays > 30) profile.risk.churnScore = 0.7;
    else if (profile.risk.inactiveDays > 14) profile.risk.churnScore = 0.5;
    else if (profile.risk.inactiveDays > 7) profile.risk.churnScore = 0.3;
    else profile.risk.churnScore = 0.1;

    profile.risk.churnRisk = profile.risk.churnScore >= 0.7 ? 'critical' :
      profile.risk.churnScore >= 0.5 ? 'high' :
        profile.risk.churnScore >= 0.3 ? 'medium' : 'low';

    // Lifecycle stage
    if (profile.value.totalOrders === 0) {
      profile.lifecycle.stage = profile.lifecycle.lifetimeDays > 30 ? 'churned' : 'new';
    } else if (profile.risk.churnRisk === 'critical') {
      profile.lifecycle.stage = 'at_risk';
    } else if (profile.value.totalOrders >= 10) {
      profile.lifecycle.stage = 'engaged';
    } else if (profile.value.totalOrders >= 1) {
      profile.lifecycle.stage = 'active';
    }

    // Value tier
    if (profile.value.totalSpent >= 100000) profile.value.tier = 'diamond';
    else if (profile.value.totalSpent >= 50000) profile.value.tier = 'platinum';
    else if (profile.value.totalSpent >= 20000) profile.value.tier = 'gold';
    else if (profile.value.totalSpent >= 5000) profile.value.tier = 'silver';
    else profile.value.tier = 'basic';

    // CLV (simplified)
    const dailyValue = profile.lifecycle.lifetimeDays > 0 ?
      profile.value.totalSpent / profile.lifecycle.lifetimeDays : 0;
    profile.value.clv = profile.value.totalSpent + (dailyValue * 365 * 0.5);
    profile.value.predictedLTV = profile.value.clv;
  }

  private formatProfile(profile: any): any {
    return {
      customerId: profile.customerId,
      identity: profile.identity,
      demographics: profile.demographics,
      lifecycle: profile.lifecycle,
      value: profile.value,
      engagement: profile.engagement,
      preferences: profile.preferences,
      satisfaction: profile.satisfaction,
      risk: profile.risk,
      compliance: profile.compliance,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }
}

export const customer360Service = new Customer360Service();
export default customer360Service;
