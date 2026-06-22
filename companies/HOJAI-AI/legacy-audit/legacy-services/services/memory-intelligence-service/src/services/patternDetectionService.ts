// Pattern Detection Service - AI-powered pattern analysis

import { v4 as uuidv4 } from 'uuid';
import {
  PatternDetection,
  JourneyPattern,
  PatternInsight,
  PatternRecommendation,
} from '../models/customerMemory.js';
import { logger } from '../utils/logger.js';

export class PatternDetectionService {
  /**
   * Detect patterns for a customer
   */
  async detectPatterns(customerId: string, events: any[]): Promise<PatternDetection> {
    const patterns: JourneyPattern[] = [];
    const insights: PatternInsight[] = [];
    const recommendations: PatternRecommendation[] = [];

    // Behavioral patterns
    const behavioralPatterns = this.detectBehavioralPatterns(events);
    patterns.push(...behavioralPatterns.patterns);
    insights.push(...behavioralPatterns.insights);

    // Temporal patterns
    const temporalPatterns = this.detectTemporalPatterns(events);
    patterns.push(...temporalPatterns.patterns);
    insights.push(...temporalPatterns.insights);

    // Value patterns
    const valuePatterns = this.detectValuePatterns(events);
    patterns.push(...valuePatterns.patterns);
    insights.push(...valuePatterns.insights);

    // Support patterns
    const supportPatterns = this.detectSupportPatterns(events);
    patterns.push(...supportPatterns.patterns);
    insights.push(...supportPatterns.insights);
    recommendations.push(...supportPatterns.recommendations);

    // Generate recommendations based on patterns
    const autoRecommendations = this.generateRecommendations(patterns, insights);
    recommendations.push(...autoRecommendations);

    logger.info(`Pattern detection completed`, {
      customerId,
      patternsFound: patterns.length,
      insightsFound: insights.length,
    });

    return {
      customerId,
      patterns,
      insights,
      recommendations,
      detectedAt: new Date(),
    };
  }

  /**
   * Detect behavioral patterns
   */
  private detectBehavioralPatterns(events: any[]): { patterns: JourneyPattern[]; insights: PatternInsight[] } {
    const patterns: JourneyPattern[] = [];
    const insights: PatternInsight[] = [];

    // Channel preference
    const channelCounts: Record<string, number> = {};
    events.forEach(e => {
      if (e.channel) channelCounts[e.channel] = (channelCounts[e.channel] || 0) + 1;
    });

    const preferredChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
    if (preferredChannel && preferredChannel[1] > 2) {
      patterns.push({
        type: 'behavioral',
        name: 'Channel Preference',
        description: `Prefers ${preferredChannel[0]} for interactions`,
        confidence: preferredChannel[1] / events.length,
        detectedAt: new Date(),
        evidence: [`${preferredChannel[1]} interactions via ${preferredChannel[0]}`],
      });
    }

    // High engagement
    const engagementScore = events.length / 30; // events per month
    if (engagementScore > 0.5) {
      insights.push({
        type: 'positive',
        title: 'Highly Engaged',
        description: 'Customer interacts frequently with the platform',
        metric: engagementScore,
      });
    }

    return { patterns, insights };
  }

  /**
   * Detect temporal patterns
   */
  private detectTemporalPatterns(events: any[]): { patterns: JourneyPattern[]; insights: PatternInsight[] } {
    const patterns: JourneyPattern[] = [];
    const insights: PatternInsight[] = [];

    // Time of day patterns
    const hourCounts: Record<number, number> = {};
    events.forEach(e => {
      const hour = new Date(e.date).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(e => parseInt(e[0]));

    if (peakHours.length > 0) {
      const timeRange = peakHours.length === 1
        ? `${peakHours[0]}:00`
        : `${Math.min(...peakHours)}:00-${Math.max(...peakHours)}:00`;

      patterns.push({
        type: 'temporal',
        name: 'Peak Activity Time',
        description: `Most active between ${timeRange}`,
        confidence: 0.7,
        detectedAt: new Date(),
        evidence: [`Peak hours: ${timeRange}`],
      });
    }

    // Day of week patterns
    const dayCounts: Record<string, number> = {};
    events.forEach(e => {
      const day = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const peakDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    if (peakDays[0] && peakDays[0][1] > 3) {
      insights.push({
        type: 'neutral',
        title: 'Most Active Day',
        description: `Most interactions on ${peakDays[0][0]}`,
        metric: peakDays[0][1],
      });
    }

    return { patterns, insights };
  }

  /**
   * Detect value patterns
   */
  private detectValuePatterns(events: any[]): { patterns: JourneyPattern[]; insights: PatternInsight[] } {
    const patterns: JourneyPattern[] = [];
    const insights: PatternInsight[] = [];

    const commerceEvents = events.filter(e => e.domain === 'commerce' || e.category === 'order');
    const totalValue = commerceEvents.reduce((sum, e) => sum + (e.value || 0), 0);
    const avgOrderValue = commerceEvents.length > 0 ? totalValue / commerceEvents.length : 0;

    // LTV tier
    if (totalValue > 50000) {
      patterns.push({
        type: 'value',
        name: 'Premium Customer',
        description: 'Lifetime value exceeds ₹50,000',
        confidence: 0.95,
        detectedAt: new Date(),
        evidence: [`Total lifetime value: ₹${totalValue}`],
      });

      insights.push({
        type: 'positive',
        title: 'High-Value Customer',
        description: 'VIP-tier customer with high lifetime value',
        metric: totalValue,
      });
    } else if (totalValue > 10000) {
      patterns.push({
        type: 'value',
        name: 'Mid-Tier Customer',
        description: 'Lifetime value between ₹10,000-50,000',
        confidence: 0.85,
        detectedAt: new Date(),
        evidence: [`Total lifetime value: ₹${totalValue}`],
      });
    }

    // High AOV
    if (avgOrderValue > 1000) {
      insights.push({
        type: 'positive',
        title: 'High AOV',
        description: 'Average order value above platform average',
        metric: avgOrderValue,
      });
    }

    return { patterns, insights };
  }

  /**
   * Detect support patterns
   */
  private detectSupportPatterns(events: any[]): {
    patterns: JourneyPattern[];
    insights: PatternInsight[];
    recommendations: PatternRecommendation[];
  } {
    const patterns: JourneyPattern[] = [];
    const insights: PatternInsight[] = [];
    const recommendations: PatternRecommendation[] = [];

    const supportEvents = events.filter(e => e.domain === 'support' || e.category === 'support');

    if (supportEvents.length === 0) {
      return { patterns, insights, recommendations };
    }

    // Frequent support
    if (supportEvents.length > 5) {
      patterns.push({
        type: 'support',
        name: 'High Support Need',
        description: 'Customer contacts support frequently',
        confidence: 0.9,
        detectedAt: new Date(),
        evidence: [`${supportEvents.length} support interactions`],
      });

      insights.push({
        type: 'negative',
        title: 'Support-Heavy Customer',
        description: 'High support frequency may indicate product issues or confusion',
        metric: supportEvents.length,
      });

      recommendations.push({
        action: 'Schedule proactive check-in',
        reason: 'Customer has high support frequency',
        priority: 'high',
        expectedImpact: 'Reduce future support tickets',
      });
    }

    // Negative sentiment trend
    const avgSupportSentiment = supportEvents.reduce((sum, e) => sum + (e.sentiment || 0), 0) / supportEvents.length;
    if (avgSupportSentiment < -0.3) {
      insights.push({
        type: 'negative',
        title: 'Consistently Negative Support Sentiment',
        description: 'Support interactions have negative sentiment',
        metric: avgSupportSentiment,
      });

      recommendations.push({
        action: 'Escalate to dedicated support agent',
        reason: 'Consistently negative sentiment in support',
        priority: 'high',
        expectedImpact: 'Improve customer satisfaction',
      });
    }

    // Unresolved issues
    const unresolvedCount = supportEvents.filter(e => !e.resolved).length;
    if (unresolvedCount > 0) {
      recommendations.push({
        action: 'Review unresolved tickets',
        reason: `${unresolvedCount} unresolved support tickets`,
        priority: 'medium',
      });
    }

    return { patterns, insights, recommendations };
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(patterns: JourneyPattern[], insights: PatternInsight[]): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    // Check for premium customer without VIP status
    const premiumPattern = patterns.find(p => p.name === 'Premium Customer');
    if (premiumPattern) {
      recommendations.push({
        action: 'Consider VIP status upgrade',
        reason: 'Customer meets premium value criteria',
        priority: 'medium',
        expectedImpact: 'Improve retention',
      });
    }

    // Check for high engagement without loyalty benefits
    const highEngagement = insights.find(i => i.title === 'Highly Engaged');
    const lowTier = insights.find(i => i.type === 'positive' && insights.filter(x => x.type === 'positive').length === 1);
    if (highEngagement && !lowTier) {
      recommendations.push({
        action: 'Offer loyalty benefits',
        reason: 'Highly engaged customer without loyalty status',
        priority: 'low',
        expectedImpact: 'Increase retention',
      });
    }

    return recommendations;
  }

  /**
   * Predict next action
   */
  async predictNextAction(customerId: string, events: any[]): Promise<{
    predictedAction?: string;
    confidence: number;
    reasoning: string;
  }> {
    if (events.length < 2) {
      return {
        predictedAction: undefined,
        confidence: 0,
        reasoning: 'Insufficient history for prediction',
      };
    }

    // Simple pattern-based prediction
    const lastEvent = events[0];
    const secondLastEvent = events[1];

    // Order patterns
    if (lastEvent.domain === 'commerce' || lastEvent.category === 'order') {
      // After order, likely delivery check or support
      const deliveryEvents = events.filter(e => e.type?.includes('delivery'));
      const supportEvents = events.filter(e => e.category === 'support');

      if (deliveryEvents.length > 0) {
        return {
          predictedAction: 'support:delivery_inquiry',
          confidence: 0.7,
          reasoning: 'History of delivery inquiries after orders',
        };
      }
    }

    // Support patterns
    if (lastEvent.category === 'support') {
      return {
        predictedAction: 'support:follow_up',
        confidence: 0.6,
        reasoning: 'Recent support interaction',
      };
    }

    return {
      predictedAction: undefined,
      confidence: 0.3,
      reasoning: 'No clear pattern detected',
    };
  }
}

export const patternDetectionService = new PatternDetectionService();
