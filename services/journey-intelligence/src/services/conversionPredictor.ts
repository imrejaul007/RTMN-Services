/**
 * Conversion Predictor Service
 * Predicts customer conversion probability and value
 */

import { CustomerJourney } from '../models/Journey';
import { Touchpoint } from '../models/Touchpoint';
import {
  JourneyStage,
  ConversionPrediction,
  InfluenceFactor
} from '../types';
import { logger } from '../utils/logger';

interface CustomerFeatures {
  currentStage: JourneyStage;
  stageProgress: number; // 0-100
  daysSinceCreation: number;
  daysSinceLastActivity: number;
  totalTouchpoints: number;
  avgTouchpointsPerWeek: number;
  totalRevenue: number;
  avgSessionDuration: number;
  channelsUsed: number;
  conversionEvents: number;
  supportInteractions: number;
  engagementScore: number;
}

export class ConversionPredictor {
  private readonly MODEL_VERSION = '1.0.0';

  private readonly STAGE_ORDER: JourneyStage[] = [
    JourneyStage.AWARENESS,
    JourneyStage.CONSIDERATION,
    JourneyStage.ACQUISITION,
    JourneyStage.ACTIVATION,
    JourneyStage.RETENTION,
    JourneyStage.REFERRAL
  ];

  /**
   * Predict conversion for a customer
   */
  async predictConversion(
    customerId: string,
    tenantId: string
  ): Promise<ConversionPrediction | null> {
    const journey = await CustomerJourney.findByCustomerAndTenant(
      customerId,
      tenantId
    );

    if (!journey || journey.convertedAt) {
      return null;
    }

    const features = await this.extractFeatures(customerId, tenantId, journey);
    const { probability, predictedValue, predictedTime } = this.calculatePrediction(features);
    const factors = this.identifyInfluenceFactors(features);

    return {
      customerId,
      tenantId,
      currentStage: features.currentStage,
      conversionProbability: probability,
      predictedValue,
      predictedTimeToConversion: predictedTime,
     影响因素: factors,
      modelVersion: this.MODEL_VERSION,
      generatedAt: new Date()
    };
  }

  /**
   * Extract customer features for prediction
   */
  private async extractFeatures(
    customerId: string,
    tenantId: string,
    journey: InstanceType<typeof CustomerJourney>
  ): Promise<CustomerFeatures> {
    const touchpoints = await Touchpoint.findByCustomer(customerId, tenantId, {
      sort: '-timestamp'
    });

    const now = Date.now();
    const daysSinceCreation = Math.floor(
      (now - journey.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const lastTouchpoint = touchpoints[0];
    const daysSinceLastActivity = lastTouchpoint
      ? Math.floor((now - lastTouchpoint.timestamp.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreation;

    // Calculate stage progress
    const currentStageIndex = this.STAGE_ORDER.indexOf(journey.currentStage);
    const stageProgress = this.calculateStageProgress(journey, touchpoints);

    // Calculate average touchpoints per week
    const weeksActive = Math.max(1, daysSinceCreation / 7);
    const avgTouchpointsPerWeek = touchpoints.length / weeksActive;

    // Calculate average session duration
    const sessions = this.identifySessions(touchpoints);
    const avgSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
      : 0;

    // Count unique channels
    const channelsUsed = new Set(
      touchpoints
        .filter(t => t.source.channel)
        .map(t => t.source.channel)
    ).size;

    // Count conversion events
    const conversionEvents = touchpoints.filter(t => t.converted).length;

    // Count support interactions
    const supportInteractions = touchpoints.filter(
      t => t.type === 'support'
    ).length;

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(touchpoints, daysSinceCreation);

    return {
      currentStage: journey.currentStage,
      stageProgress,
      daysSinceCreation,
      daysSinceLastActivity,
      totalTouchpoints: touchpoints.length,
      avgTouchpointsPerWeek,
      totalRevenue: journey.value,
      avgSessionDuration,
      channelsUsed,
      conversionEvents,
      supportInteractions,
      engagementScore
    };
  }

  /**
   * Calculate progress within current stage
   */
  private calculateStageProgress(
    journey: InstanceType<typeof CustomerJourney>,
    touchpoints: Array<{ journeyStage?: string; timestamp: Date }>
  ): number {
    const currentStageHistory = journey.stages.find(
      s => s.enteredAt && !s.exitedAt
    );

    if (!currentStageHistory) return 0;

    const timeInStage = Date.now() - currentStageHistory.enteredAt.getTime();
    const hoursInStage = timeInStage / (1000 * 60 * 60);

    // Stage duration expectations (in hours)
    const stageExpectations: Record<string, number> = {
      [JourneyStage.AWARENESS]: 72, // 3 days
      [JourneyStage.CONSIDERATION]: 168, // 7 days
      [JourneyStage.ACQUISITION]: 48, // 2 days
      [JourneyStage.ACTIVATION]: 72, // 3 days
      [JourneyStage.RETENTION]: 720, // 30 days
      [JourneyStage.REFERRAL]: 168 // 7 days
    };

    const expectedDuration = stageExpectations[journey.currentStage] || 72;
    return Math.min(100, (hoursInStage / expectedDuration) * 100);
  }

  /**
   * Identify sessions from touchpoints
   */
  private identifySessions(
    touchpoints: Array<{ sessionId?: string; duration?: number; timestamp: Date }>
  ): Array<{ sessionId: string; duration: number }> {
    const sessionMap = new Map<string, number>();

    touchpoints.forEach(t => {
      const sessionId = t.sessionId || 'default';
      const existing = sessionMap.get(sessionId) || 0;
      sessionMap.set(sessionId, existing + (t.duration || 0));
    });

    return Array.from(sessionMap.entries()).map(([sessionId, duration]) => ({
      sessionId,
      duration
    }));
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(
    touchpoints: Array<{ type: string; duration?: number; revenue?: number; timestamp: Date }>,
    daysSinceCreation: number
  ): number {
    if (touchpoints.length === 0) return 0;

    let score = 0;

    // Recency (0-25)
    const lastTouch = touchpoints[0];
    const daysSinceLast = Math.floor(
      (Date.now() - lastTouch.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.max(0, 25 - daysSinceLast * 3);

    // Frequency (0-25)
    const weeksActive = Math.max(1, daysSinceCreation / 7);
    const freq = touchpoints.length / weeksActive;
    score += Math.min(25, freq * 5);

    // Monetary (0-25)
    const totalRevenue = touchpoints.reduce((sum, t) => sum + (t.revenue || 0), 0);
    score += Math.min(25, totalRevenue / 20);

    // Session depth (0-25)
    const totalDuration = touchpoints.reduce((sum, t) => sum + (t.duration || 0), 0);
    score += Math.min(25, totalDuration / 60);

    return Math.round(score);
  }

  /**
   * Calculate conversion prediction
   */
  private calculatePrediction(features: CustomerFeatures): {
    probability: number;
    predictedValue: number;
    predictedTime: number;
  } {
    let probability = 0;

    // Base probability by stage (10-90%)
    const stageBaseProbability: Record<string, number> = {
      [JourneyStage.AWARENESS]: 0.1,
      [JourneyStage.CONSIDERATION]: 0.25,
      [JourneyStage.ACQUISITION]: 0.5,
      [JourneyStage.ACTIVATION]: 0.7,
      [JourneyStage.RETENTION]: 0.85,
      [JourneyStage.REFERRAL]: 0.9
    };

    probability = stageBaseProbability[features.currentStage] || 0.1;

    // Stage progress multiplier (0.5-1.5)
    const progressMultiplier = 0.5 + (features.stageProgress / 100);
    probability *= progressMultiplier;

    // Engagement modifier (-0.2 to +0.2)
    const engagementModifier = (features.engagementScore - 50) / 250;
    probability += engagementModifier;

    // Activity recency modifier
    if (features.daysSinceLastActivity > 14) {
      probability -= 0.3;
    } else if (features.daysSinceLastActivity > 7) {
      probability -= 0.15;
    } else if (features.daysSinceLastActivity <= 2) {
      probability += 0.1;
    }

    // Channel diversity modifier
    if (features.channelsUsed >= 3) {
      probability += 0.1;
    }

    // High intent signals
    if (features.conversionEvents > 0) {
      probability += 0.15;
    }

    // Negative signals
    if (features.supportInteractions > 2) {
      probability -= 0.1;
    }

    // Clamp probability
    probability = Math.max(0.01, Math.min(0.99, probability));

    // Predict value based on engagement and channels
    const baseValue = 100; // base predicted value
    const engagementMultiplier = features.engagementScore / 50;
    const channelMultiplier = 1 + (features.channelsUsed * 0.1);
    const predictedValue = Math.round(baseValue * engagementMultiplier * channelMultiplier);

    // Predict time based on stage and engagement
    const stageTimes: Record<string, number> = {
      [JourneyStage.AWARESS]: 30,
      [JourneyStage.CONSIDERATION]: 14,
      [JourneyStage.ACQUISITION]: 7,
      [JourneyStage.ACTIVATION]: 5,
      [JourneyStage.RETENTION]: 3,
      [JourneyStage.REFERRAL]: 7
    };

    const baseTime = stageTimes[features.currentStage] || 14;
    const engagementTimeModifier = Math.max(0.5, 1.5 - (features.engagementScore / 100));
    const predictedTime = Math.round(baseTime * engagementTimeModifier * 24 * 60 * 60); // in seconds

    return { probability, predictedValue, predictedTime };
  }

  /**
   * Identify influence factors
   */
  private identifyInfluenceFactors(features: CustomerFeatures): InfluenceFactor[] {
    const factors: InfluenceFactor[] = [];

    // Stage factor
    factors.push({
      factor: 'current_stage',
      impact: this.getStageImpact(features.currentStage),
      direction: 'positive',
      description: `Customer is in ${features.currentStage} stage`
    });

    // Engagement factor
    if (features.engagementScore >= 60) {
      factors.push({
        factor: 'engagement',
        impact: 0.3,
        direction: 'positive',
        description: 'High engagement score indicates strong interest'
      });
    } else if (features.engagementScore < 30) {
      factors.push({
        factor: 'engagement',
        impact: -0.3,
        direction: 'negative',
        description: 'Low engagement score may indicate disinterest'
      });
    }

    // Recency factor
    if (features.daysSinceLastActivity <= 3) {
      factors.push({
        factor: 'recency',
        impact: 0.2,
        direction: 'positive',
        description: 'Recent activity indicates active interest'
      });
    } else if (features.daysSinceLastActivity >= 14) {
      factors.push({
        factor: 'recency',
        impact: -0.25,
        direction: 'negative',
        description: 'No recent activity increases churn risk'
      });
    }

    // Channel diversity
    if (features.channelsUsed >= 3) {
      factors.push({
        factor: 'channel_diversity',
        impact: 0.15,
        direction: 'positive',
        description: 'Using multiple channels shows deeper engagement'
      });
    }

    // Conversion events
    if (features.conversionEvents > 0) {
      factors.push({
        factor: 'conversion_events',
        impact: 0.2,
        direction: 'positive',
        description: 'Previous conversion attempts indicate intent'
      });
    }

    // Support interactions
    if (features.supportInteractions > 2) {
      factors.push({
        factor: 'support_interactions',
        impact: -0.15,
        direction: 'negative',
        description: 'High support usage may indicate friction'
      });
    }

    // Progress velocity
    if (features.stageProgress >= 70) {
      factors.push({
        factor: 'progress_velocity',
        impact: 0.15,
        direction: 'positive',
        description: 'Near stage completion'
      });
    }

    return factors;
  }

  /**
   * Get impact value for stage
   */
  private getStageImpact(stage: JourneyStage): number {
    const impacts: Record<string, number> = {
      [JourneyStage.AWARENESS]: 0.1,
      [JourneyStage.CONSIDERATION]: 0.2,
      [JourneyStage.ACQUISITION]: 0.35,
      [JourneyStage.ACTIVATION]: 0.5,
      [JourneyStage.RETENTION]: 0.6,
      [JourneyStage.REFERRAL]: 0.65
    };
    return impacts[stage] || 0.1;
  }

  /**
   * Batch predict for multiple customers
   */
  async batchPredict(
    customerIds: string[],
    tenantId: string
  ): Promise<ConversionPrediction[]> {
    const predictions: ConversionPrediction[] = [];

    for (const customerId of customerIds) {
      const prediction = await this.predictConversion(customerId, tenantId);
      if (prediction) {
        predictions.push(prediction);
      }
    }

    return predictions;
  }

  /**
   * Get conversion probability distribution
   */
  async getProbabilityDistribution(
    tenantId: string,
    buckets: number = 5
  ): Promise<Record<string, number>> {
    const journeys = await CustomerJourney.findActiveByTenant(tenantId);
    const distribution: Record<string, number> = {};

    for (const journey of journeys) {
      const prediction = await this.predictConversion(
        journey.customerId,
        tenantId
      );

      if (prediction) {
        const bucket = this.getProbabilityBucket(prediction.conversionProbability, buckets);
        distribution[bucket] = (distribution[bucket] || 0) + 1;
      }
    }

    return distribution;
  }

  /**
   * Get probability bucket name
   */
  private getProbabilityBucket(probability: number, buckets: number): string {
    const bucketSize = 100 / buckets;
    const bucketIndex = Math.floor(probability * 100 / bucketSize);
    const min = bucketIndex * bucketSize;
    const max = min + bucketSize;
    return `${min}-${max}%`;
  }
}

export const conversionPredictor = new ConversionPredictor();
