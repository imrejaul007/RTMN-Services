import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

interface CrisisAlert {
  brandId: string;
  brandName: string;
  severity: 'info' | 'warning' | 'critical';
  mentionId: string;
  source: string;
  content: string;
  sentiment: number;
  timestamp: Date;
}

interface TrustIntelligence {
  brandId: string;
  sentiment: number;
  sentimentTrend: 'improving' | 'declining' | 'stable';
  trustScore: number;
  factors: string[];
  lastUpdated: Date;
}

interface JourneyEvent {
  brandId: string;
  eventType: 'brand_mention' | 'sentiment_shift' | 'crisis_detected';
  source: string;
  content: string;
  sentiment: number;
  metadata: Record<string, any>;
  timestamp: Date;
}

export class CustomerOpsBridge {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.CUSTOMER_OPS_BRIDGE_URL || 'http://localhost:4399';
    this.timeout = 10000;
  }

  // Send crisis alert to Customer Operations
  async sendCrisisAlert(brandId: string, mention: any): Promise<boolean> {
    try {
      const alert: CrisisAlert = {
        brandId,
        brandName: mention.brandId,
        severity: 'critical',
        mentionId: mention.mentionId,
        source: mention.source,
        content: mention.content,
        sentiment: mention.sentiment?.score || 0,
        timestamp: new Date()
      };

      // Try to send to Customer Ops via ecosystem connector
      const response = await axios.post(
        `${this.baseUrl}/api/integrations/brandpulse/crisis`,
        alert,
        { timeout: this.timeout }
      ).catch(() => null);

      logger.info('Crisis alert sent to Customer Ops', { brandId, mentionId: mention.mentionId });
      return true;
    } catch (error) {
      logger.error('Failed to send crisis alert:', error);
      return false;
    }
  }

  // Sync brand sentiment to Trust Intelligence
  async syncTrustIntelligence(brandId: string, sentiment: any): Promise<boolean> {
    try {
      const trustData: TrustIntelligence = {
        brandId,
        sentiment: sentiment.score || 0,
        sentimentTrend: sentiment.trending?.direction || 'stable',
        trustScore: this.calculateTrustScore(sentiment),
        factors: this.extractTrustFactors(sentiment),
        lastUpdated: new Date()
      };

      // Send to Trust Intelligence service
      await axios.post(
        `${this.baseUrl}/api/trust/intelligence`,
        trustData,
        { timeout: this.timeout }
      ).catch(() => null);

      logger.info('Trust intelligence synced', { brandId, trustScore: trustData.trustScore });
      return true;
    } catch (error) {
      logger.error('Failed to sync trust intelligence:', error);
      return false;
    }
  }

  // Send brand mention to Journey Twin
  async sendToJourney(brandId: string, mention: any): Promise<boolean> {
    try {
      const journeyEvent: JourneyEvent = {
        brandId,
        eventType: 'brand_mention',
        source: mention.source,
        content: mention.content,
        sentiment: mention.sentiment?.score || 0,
        metadata: {
          author: mention.author,
          engagement: mention.engagement,
          tags: mention.tags,
          isCrisis: mention.isCrisis
        },
        timestamp: new Date()
      };

      await axios.post(
        `${this.baseUrl}/api/journey/events`,
        journeyEvent,
        { timeout: this.timeout }
      ).catch(() => null);

      return true;
    } catch (error) {
      logger.error('Failed to send journey event:', error);
      return false;
    }
  }

  // Sync campaign performance to Campaign Twin
  async syncCampaignPerformance(campaignId: string, performance: any): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/campaigns/${campaignId}/performance`,
        {
          ...performance,
          source: 'brandpulse',
          timestamp: new Date()
        },
        { timeout: this.timeout }
      ).catch(() => null);

      logger.info('Campaign performance synced', { campaignId });
      return true;
    } catch (error) {
      logger.error('Failed to sync campaign performance:', error);
      return false;
    }
  }

  // Get brand health for Executive Dashboard
  async getHealthForDashboard(brandId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/dashboard/brand/${brandId}/health`,
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      logger.warn('Dashboard health fetch failed, returning null');
      return null;
    }
  }

  // Send alert notification
  async sendNotification(brandId: string, alertType: string, message: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/notifications/send`,
        {
          brandId,
          type: alertType,
          message,
          source: 'brandpulse',
          timestamp: new Date()
        },
        { timeout: this.timeout }
      ).catch(() => null);

      return true;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      return false;
    }
  }

  // Bulk sync mentions to journey
  async bulkSyncJourney(brandId: string, mentions: any[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const mention of mentions) {
      const result = await this.sendToJourney(brandId, mention);
      if (result) success++;
      else failed++;
    }

    logger.info('Bulk journey sync completed', { brandId, success, failed });
    return { success, failed };
  }

  private calculateTrustScore(sentiment: any): number {
    // Calculate trust score (0-100) from sentiment data
    const score = sentiment.score || 0;
    const confidence = sentiment.confidence || 0;

    // Map sentiment score (-1 to 1) to trust (0-100)
    const baseTrust = ((score + 1) / 2) * 60; // 0-60 from sentiment
    const confidenceBonus = confidence * 40; // 0-40 from confidence

    return Math.round(baseTrust + confidenceBonus);
  }

  private extractTrustFactors(sentiment: any): string[] {
    const factors: string[] = [];

    if (sentiment.score > 0.3) {
      factors.push('Positive sentiment trend');
    } else if (sentiment.score < -0.3) {
      factors.push('Negative sentiment requires attention');
    }

    if (sentiment.confidence > 0.7) {
      factors.push('High confidence in sentiment analysis');
    }

    if (sentiment.trending?.direction === 'improving') {
      factors.push('Improving sentiment trajectory');
    }

    return factors;
  }
}
