/**
 * Dropout Detector Service
 * Detects customers at risk of churning/dropping out
 */

import { CustomerJourney } from '../models/Journey';
import { Touchpoint } from '../models/Touchpoint';
import {
  JourneyStage,
  DropoutAlert,
  DropoutTrigger,
  DropoutRiskLevel
} from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface DropoutIndicators {
  inactivityDays: number;
  missedStages: string[];
  engagementScore: number;
  lastTouchpointType: string | null;
  touchpointFrequency: number; // touchpoints per week
  revenueTrend: number; // positive = increasing
}

export class DropoutDetector {
  private readonly THRESHOLDS = {
    CRITICAL: 0.9,
    HIGH: 0.7,
    MEDIUM: 0.5,
    LOW: 0.3,
    INACTIVITY_CRITICAL: 30, // days
    INACTIVITY_HIGH: 14,
    INACTIVITY_MEDIUM: 7,
    ENGAGEMENT_CRITICAL: 20,
    ENGAGEMENT_HIGH: 40,
    ENGAGEMENT_MEDIUM: 60
  };

  /**
   * Detect dropout risk for a customer
   */
  async detectDropoutRisk(
    customerId: string,
    tenantId: string
  ): Promise<DropoutAlert | null> {
    const journey = await CustomerJourney.findByCustomerAndTenant(
      customerId,
      tenantId
    );

    if (!journey || journey.convertedAt || journey.churnedAt) {
      return null;
    }

    const indicators = await this.calculateIndicators(customerId, tenantId);
    const probability = this.calculateDropoutProbability(indicators);
    const riskLevel = this.determineRiskLevel(probability);

    if (riskLevel === 'low') {
      return null;
    }

    const triggers = this.identifyTriggers(indicators);
    const recommendedActions = this.getRecommendedActions(
      indicators,
      journey.currentStage,
      triggers
    );

    const alert: DropoutAlert = {
      alertId: uuidv4(),
      customerId,
      tenantId,
      journeyId: journey._id!.toString(),
      currentStage: journey.currentStage,
      dropoutProbability: probability,
      riskLevel,
      detectedAt: new Date(),
      triggers,
      recommendedActions
    };

    logger.info(
      `Dropout risk detected for customer ${customerId}: ${riskLevel} (${(probability * 100).toFixed(1)}%)`
    );

    return alert;
  }

  /**
   * Detect dropout risks for all active journeys in a tenant
   */
  async detectAllDropoutRisks(
    tenantId: string,
    options?: { minRiskLevel?: DropoutRiskLevel; limit?: number }
  ): Promise<DropoutAlert[]> {
    const journeys = await CustomerJourney.findActiveByTenant(tenantId);

    const alerts: DropoutAlert[] = [];
    const riskLevels: Record<DropoutRiskLevel, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const minLevel = options?.minRiskLevel
      ? riskLevels[options.minRiskLevel]
      : riskLevels.low;

    for (const journey of journeys) {
      const alert = await this.detectDropoutRisk(
        journey.customerId,
        tenantId
      );

      if (alert && riskLevels[alert.riskLevel] >= minLevel) {
        alerts.push(alert);

        if (options?.limit && alerts.length >= options.limit) {
          break;
        }
      }
    }

    // Sort by probability (highest first)
    return alerts.sort((a, b) => b.dropoutProbability - a.dropoutProbability);
  }

  /**
   * Calculate dropout indicators for a customer
   */
  private async calculateIndicators(
    customerId: string,
    tenantId: string
  ): Promise<DropoutIndicators> {
    const touchpoints = await Touchpoint.findByCustomer(customerId, tenantId, {
      sort: '-timestamp'
    });

    // Calculate inactivity
    const lastTouchpoint = touchpoints[0];
    const inactivityDays = lastTouchpoint
      ? Math.floor(
          (Date.now() - lastTouchpoint.timestamp.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    // Identify missed stages
    const missedStages = await this.identifyMissedStages(customerId, tenantId);

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(touchpoints);

    // Calculate touchpoint frequency
    const touchpointFrequency = this.calculateFrequency(touchpoints);

    // Calculate revenue trend
    const revenueTrend = this.calculateRevenueTrend(touchpoints);

    return {
      inactivityDays,
      missedStages,
      engagementScore,
      lastTouchpointType: lastTouchpoint?.type || null,
      touchpointFrequency,
      revenueTrend
    };
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(
    touchpoints: Array<{ type: string; duration?: number; revenue?: number }>
  ): number {
    if (touchpoints.length === 0) return 0;

    let score = 0;

    // Recency factor (0-30 points)
    const lastTouch = touchpoints[0];
    const daysSinceLastTouch = Math.floor(
      (Date.now() - lastTouch.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 30 - daysSinceLastTouch * 2);
    score += recencyScore;

    // Frequency factor (0-30 points)
    const frequencyScore = Math.min(30, touchpoints.length * 3);
    score += frequencyScore;

    // Duration factor (0-20 points)
    const totalDuration = touchpoints.reduce((sum, t) => sum + (t.duration || 0), 0);
    const durationScore = Math.min(20, totalDuration / 60); // 1 point per minute
    score += durationScore;

    // Revenue factor (0-20 points)
    const totalRevenue = touchpoints.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const revenueScore = Math.min(20, totalRevenue / 10); // 1 point per $10
    score += revenueScore;

    return Math.round(score);
  }

  /**
   * Identify stages the customer should have progressed through
   */
  private async identifyMissedStages(
    customerId: string,
    tenantId: string
  ): Promise<string[]> {
    const journey = await CustomerJourney.findByCustomerAndTenant(
      customerId,
      tenantId
    );

    if (!journey) return [];

    const expectedStages: JourneyStage[] = [
      JourneyStage.AWARENESS,
      JourneyStage.CONSIDERATION,
      JourneyStage.ACQUISITION,
      JourneyStage.ACTIVATION,
      JourneyStage.RETENTION
    ];

    const currentIndex = expectedStages.indexOf(journey.currentStage);
    const currentTime = Date.now();
    const daysSinceCreation = Math.floor(
      (currentTime - journey.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate expected stage based on time
    let expectedIndex = 0;
    if (daysSinceCreation > 60) expectedIndex = 4;
    else if (daysSinceCreation > 30) expectedIndex = 3;
    else if (daysSinceCreation > 14) expectedIndex = 2;
    else if (daysSinceCreation > 3) expectedIndex = 1;

    const missed: string[] = [];
    for (let i = 0; i < Math.min(currentIndex, expectedIndex); i++) {
      const stage = journey.stages.find(s => s.stage === expectedStages[i]);
      if (!stage) {
        missed.push(expectedStages[i]);
      }
    }

    return missed;
  }

  /**
   * Calculate touchpoint frequency (per week)
   */
  private calculateFrequency(
    touchpoints: Array<{ timestamp: Date }>
  ): number {
    if (touchpoints.length < 2) return 0;

    const oldest = touchpoints[touchpoints.length - 1].timestamp;
    const newest = touchpoints[0].timestamp;
    const daysDiff = Math.max(
      1,
      (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weeks = daysDiff / 7;

    return touchpoints.length / weeks;
  }

  /**
   * Calculate revenue trend (-1 to 1)
   */
  private calculateRevenueTrend(
    touchpoints: Array<{ revenue?: number; timestamp: Date }>
  ): number {
    if (touchpoints.length < 2) return 0;

    // Sort by timestamp
    const sorted = [...touchpoints].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Split into two halves
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstHalfRevenue =
      firstHalf.reduce((sum, t) => sum + (t.revenue || 0), 0) / Math.max(1, firstHalf.length);
    const secondHalfRevenue =
      secondHalf.reduce((sum, t) => sum + (t.revenue || 0), 0) / Math.max(1, secondHalf.length);

    if (firstHalfRevenue === 0) return secondHalfRevenue > 0 ? 1 : 0;

    const ratio = secondHalfRevenue / firstHalfRevenue;
    return Math.max(-1, Math.min(1, ratio - 1));
  }

  /**
   * Calculate dropout probability
   */
  private calculateDropoutProbability(indicators: DropoutIndicators): number {
    let probability = 0;

    // Inactivity factor (0-40%)
    if (indicators.inactivityDays >= this.THRESHOLDS.INACTIVITY_CRITICAL) {
      probability += 0.4;
    } else if (indicators.inactivityDays >= this.THRESHOLDS.INACTIVITY_HIGH) {
      probability += 0.25;
    } else if (indicators.inactivityDays >= this.THRESHOLDS.INACTIVITY_MEDIUM) {
      probability += 0.1;
    }

    // Engagement factor (0-30%)
    if (indicators.engagementScore <= this.THRESHOLDS.ENGAGEMENT_CRITICAL) {
      probability += 0.3;
    } else if (indicators.engagementScore <= this.THRESHOLDS.ENGAGEMENT_HIGH) {
      probability += 0.15;
    } else if (indicators.engagementScore <= this.THRESHOLDS.ENGAGEMENT_MEDIUM) {
      probability += 0.05;
    }

    // Missed stages factor (0-20%)
    probability += Math.min(0.2, indicators.missedStages.length * 0.1);

    // Frequency factor (0-10%)
    if (indicators.touchpointFrequency < 0.5) {
      probability += 0.1;
    } else if (indicators.touchpointFrequency < 1) {
      probability += 0.05;
    }

    // Revenue trend factor (0-10%)
    if (indicators.revenueTrend < -0.5) {
      probability += 0.1;
    } else if (indicators.revenueTrend < 0) {
      probability += 0.05;
    }

    // Negative touchpoints factor (0-10%)
    const negativeTouchpoints = ['support'];
    if (
      indicators.lastTouchpointType &&
      negativeTouchpoints.includes(indicators.lastTouchpointType)
    ) {
      probability += 0.05;
    }

    return Math.min(1, probability);
  }

  /**
   * Determine risk level from probability
   */
  private determineRiskLevel(probability: number): DropoutRiskLevel {
    if (probability >= this.THRESHOLDS.CRITICAL) return 'critical';
    if (probability >= this.THRESHOLDS.HIGH) return 'high';
    if (probability >= this.THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }

  /**
   * Identify specific triggers
   */
  private identifyTriggers(indicators: DropoutIndicators): DropoutTrigger[] {
    const triggers: DropoutTrigger[] = [];

    // Inactivity trigger
    if (indicators.inactivityDays >= this.THRESHOLDS.INACTIVITY_MEDIUM) {
      triggers.push({
        type: 'inactivity',
        description: `No activity for ${indicators.inactivityDays} days`,
        severity: Math.min(1, indicators.inactivityDays / this.THRESHOLDS.INACTIVITY_CRITICAL),
        detectedAt: new Date()
      });
    }

    // Low engagement trigger
    if (indicators.engagementScore <= this.THRESHOLDS.ENGAGEMENT_MEDIUM) {
      triggers.push({
        type: 'low_engagement',
        description: `Engagement score is ${indicators.engagementScore}/100`,
        severity: 1 - indicators.engagementScore / 100,
        detectedAt: new Date()
      });
    }

    // Missed stages trigger
    if (indicators.missedStages.length > 0) {
      triggers.push({
        type: 'missed_stages',
        description: `Customer missed stages: ${indicators.missedStages.join(', ')}`,
        severity: Math.min(1, indicators.missedStages.length * 0.3),
        detectedAt: new Date()
      });
    }

    // Revenue decline trigger
    if (indicators.revenueTrend < 0) {
      triggers.push({
        type: 'revenue_decline',
        description: `Revenue trend is negative (${(indicators.revenueTrend * 100).toFixed(1)}%)`,
        severity: Math.abs(indicators.revenueTrend) / 2,
        detectedAt: new Date()
      });
    }

    return triggers;
  }

  /**
   * Get recommended actions based on triggers
   */
  private getRecommendedActions(
    indicators: DropoutIndicators,
    currentStage: JourneyStage,
    triggers: DropoutTrigger[]
  ): string[] {
    const actions: string[] = [];

    // Stage-specific recommendations
    switch (currentStage) {
      case JourneyStage.AWARENESS:
        actions.push('Send awareness campaign email');
        actions.push('Increase ad frequency');
        break;
      case JourneyStage.CONSIDERATION:
        actions.push('Offer limited-time discount');
        actions.push('Send case study or testimonials');
        break;
      case JourneyStage.ACQUISITION:
        actions.push('Simplify signup flow');
        actions.push('Offer free trial extension');
        break;
      case JourneyStage.ACTIVATION:
        actions.push('Send onboarding sequence');
        actions.push('Offer live demo or walkthrough');
        break;
      case JourneyStage.RETENTION:
        actions.push('Send loyalty reward');
        actions.push('Offer personalized recommendations');
        break;
    }

    // Trigger-specific recommendations
    triggers.forEach(trigger => {
      switch (trigger.type) {
        case 'inactivity':
          actions.push('Send re-engagement email with new content');
          actions.push('Consider push notification');
          break;
        case 'low_engagement':
          actions.push('A/B test different content types');
          actions.push('Reduce email frequency but increase quality');
          break;
        case 'revenue_decline':
          actions.push('Send exclusive offer to increase basket size');
          actions.push('Review customer for satisfaction issues');
          break;
      }
    });

    return [...new Set(actions)]; // Remove duplicates
  }
}

export const dropoutDetector = new DropoutDetector();
