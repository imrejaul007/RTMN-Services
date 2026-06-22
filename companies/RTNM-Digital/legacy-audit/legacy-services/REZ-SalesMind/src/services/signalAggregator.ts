/**
 * Signal Aggregator - Combines signals from HOJAI AI, AdBazaar, and REZ CRM Hub
 *
 * Purpose: Real-time signal processing and enrichment
 */

import { HojaiAIClient } from './hojaiClient.js';
import { AdBazaarClient } from './adbazaarClient.js';
import { REZCRMClient } from './rezCRMClient.js';

export interface Signal {
  id: string;
  type: 'behavior' | 'intent' | 'engagement' | 'market' | 'competitor';
  source: 'hojai' | 'adbazaar' | 'crm' | 'combined';
  entity: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  strength: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class SignalAggregator {
  constructor(
    private hojaiClient: HojaiAIClient,
    private adbazaarClient: AdBazaarClient,
    private rezCRMClient: REZCRMClient
  ) {}

  /**
   * Aggregate all signals for a lead
   */
  async aggregateSignals(leadId: string): Promise<Signal[]> {
    const signals: Signal[] = [];

    // Get CRM signals
    const activitiesResult = await this.rezCRMClient.getActivities(leadId);
    const activities = activitiesResult.data;
    signals.push(...this.extractCRMSignals(leadId, activities));

    // Get AdBazaar signals
    const touchpoints = await this.adbazaarClient.getTouchpoints(leadId);
    signals.push(...this.extractAdBazaarSignals(leadId, touchpoints));

    // Get HOJAI AI signals
    const leadResult = await this.rezCRMClient.getLead(leadId);
    const lead = leadResult.data;
    if (lead?.company) {
      const marketSignals = await this.hojaiClient.getMarketSignals(lead.company);
      signals.push(...this.convertMarketSignals(leadId, marketSignals));
    }

    // Sort by strength and timestamp
    return signals.sort((a, b) => {
      const strengthDiff = b.strength - a.strength;
      if (strengthDiff !== 0) return strengthDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Get intent signals for a prospect
   */
  async getIntentSignals(prospectId: string): Promise<Signal[]> {
    const signals = await this.aggregateSignals(prospectId);
    return signals.filter(s => s.type === 'intent' || s.type === 'behavior');
  }

  /**
   * Get market signals for an industry
   */
  async getMarketSignals(industry: string): Promise<Signal[]> {
    const marketSignals = await this.hojaiClient.getMarketSignals(industry);
    return marketSignals.map(s => ({
      id: this.generateId(),
      type: 'market' as const,
      source: 'hojai' as const,
      entity: industry,
      content: s.content,
      sentiment: s.sentiment,
      strength: s.relevance,
      timestamp: s.timestamp
    }));
  }

  /**
   * Detect buying signals
   */
  async detectBuyingSignals(prospectId: string): Promise<Signal[]> {
    const signals = await this.aggregateSignals(prospectId);

    return signals.filter(s => {
      // Strong positive signals indicate buying intent
      if (s.type === 'behavior' && s.sentiment === 'positive' && s.strength > 0.7) {
        return true;
      }
      if (s.type === 'engagement' && s.strength > 0.8) {
        return true;
      }
      return false;
    });
  }

  /**
   * Detect churn risk signals
   */
  async detectChurnRisk(prospectId: string): Promise<Signal[]> {
    const signals = await this.aggregateSignals(prospectId);

    return signals.filter(s => {
      // Negative engagement signals
      if (s.type === 'engagement' && s.sentiment === 'negative') {
        return true;
      }
      // Low engagement over time
      if (s.type === 'behavior' && s.strength < 0.3) {
        return true;
      }
      return false;
    });
  }

  /**
   * Get combined score from all signals
   */
  async getSignalScore(prospectId: string): Promise<{
    overall: number;
    breakdown: {
      intent: number;
      engagement: number;
      market: number;
    };
    trend: 'up' | 'down' | 'stable';
  }> {
    const signals = await this.aggregateSignals(prospectId);

    const intentSignals = signals.filter(s => s.type === 'intent');
    const engagementSignals = signals.filter(s => s.type === 'engagement');
    const marketSignals = signals.filter(s => s.type === 'market');

    const intent = this.averageStrength(intentSignals);
    const engagement = this.averageStrength(engagementSignals);
    const market = this.averageStrength(marketSignals);

    const overall = Math.round((intent * 0.4 + engagement * 0.3 + market * 0.3) * 100);

    // Calculate trend from recent signals
    const recentSignals = signals.filter(s => {
      const age = Date.now() - new Date(s.timestamp).getTime();
      return age < 7 * 24 * 60 * 60 * 1000; // Last 7 days
    });

    const trend = this.calculateTrend(recentSignals);

    return { overall, breakdown: { intent, engagement, market }, trend };
  }

  private extractCRMSignals(leadId: string, activities: any[]): Signal[] {
    return activities.slice(0, 10).map(activity => ({
      id: this.generateId(),
      type: 'behavior' as const,
      source: 'crm' as const,
      entity: leadId,
      content: activity.subject || activity.description || `Interaction: ${activity.type}`,
      sentiment: this.inferSentiment(activity.type),
      strength: this.activityToStrength(activity),
      timestamp: new Date(activity.timestamp)
    }));
  }

  private extractAdBazaarSignals(leadId: string, touchpoints: string[]): Signal[] {
    return touchpoints.map((tp, i) => ({
      id: this.generateId(),
      type: 'engagement' as const,
      source: 'adbazaar' as const,
      entity: leadId,
      content: `Marketing touchpoint: ${tp}`,
      sentiment: 'neutral' as const,
      strength: Math.max(0.3, 1 - (i * 0.1)),
      timestamp: new Date()
    }));
  }

  private convertMarketSignals(leadId: string, marketSignals: any[]): Signal[] {
    return marketSignals.map(s => ({
      id: this.generateId(),
      type: 'market' as const,
      source: 'hojai' as const,
      entity: leadId,
      content: s.content,
      sentiment: s.sentiment,
      strength: s.relevance,
      timestamp: s.timestamp,
      metadata: { sourceType: s.type }
    }));
  }

  private inferSentiment(activityType: string): 'positive' | 'negative' | 'neutral' {
    const positive = ['call', 'meeting', 'demo'];
    const negative = ['lost', 'churn', 'unsubscribed'];

    if (positive.includes(activityType.toLowerCase())) return 'positive';
    if (negative.includes(activityType.toLowerCase())) return 'negative';
    return 'neutral';
  }

  private activityToStrength(activity: any): number {
    const weights: Record<string, number> = {
      meeting: 0.9,
      call: 0.8,
      demo: 0.9,
      email: 0.5,
      note: 0.3,
      task: 0.2
    };
    return weights[activity.type?.toLowerCase()] || 0.5;
  }

  private averageStrength(signals: Signal[]): number {
    if (signals.length === 0) return 0;
    return signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
  }

  private calculateTrend(signals: Signal[]): 'up' | 'down' | 'stable' {
    if (signals.length < 2) return 'stable';

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const thisWeek = signals.filter(s => new Date(s.timestamp).getTime() > weekAgo);
    const lastWeek = signals.filter(s => {
      const t = new Date(s.timestamp).getTime();
      return t > twoWeeksAgo && t <= weekAgo;
    });

    const thisWeekAvg = this.averageStrength(thisWeek);
    const lastWeekAvg = this.averageStrength(lastWeek);

    const diff = thisWeekAvg - lastWeekAvg;
    if (diff > 0.1) return 'up';
    if (diff < -0.1) return 'down';
    return 'stable';
  }

  private generateId(): string {
    return 'sig_' + Math.random().toString(36).substring(2, 11);
  }
}