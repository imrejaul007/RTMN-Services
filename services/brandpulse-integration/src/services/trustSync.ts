import axios, { AxiosInstance } from 'axios';
import { BrandMention, BrandSentiment, TrustSignal } from '../models/BrandSync';

export class TrustSyncService {
  private trustClient: AxiosInstance;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;

    // Initialize Trust Intelligence client
    this.trustClient = axios.create({
      baseURL: process.env.TRUST_INTELLIGENCE_URL || 'http://localhost:4310',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.TRUST_INTELLIGENCE_API_KEY || ''
      }
    });

    // Add response interceptor for logging
    this.trustClient.interceptors.response.use(
      response => {
        this.logger.debug('Trust Intelligence API response', {
          status: response.status,
          path: response.config.url
        });
        return response;
      },
      error => {
        this.logger.error('Trust Intelligence API error', {
          status: error.response?.status,
          path: error.config?.url,
          message: error.message
        });
        throw error;
      }
    );
  }

  /**
   * Sync sentiment data to Trust Intelligence
   */
  async syncSentiment(sentiment: BrandSentiment): Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }> {
    try {
      const trustSignal = this.transformToTrustSignal(sentiment);

      await this.trustClient.post('/api/signals/social', trustSignal);

      this.logger.debug('Sentiment synced to Trust Intelligence', {
        brandId: sentiment.brandId,
        score: sentiment.score
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error: any) {
      this.logger.error('Failed to sync sentiment to Trust Intelligence', {
        brandId: sentiment.brandId,
        error: error.message
      });
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Sync multiple brand mentions to Trust Intelligence
   */
  async syncFromMentions(mentions: BrandMention[]): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    const result = { success: true, synced: 0, failed: 0, errors: [] as string[] };

    for (const mention of mentions) {
      try {
        const trustSignal = this.transformMentionToTrustSignal(mention);

        await this.trustClient.post('/api/signals/social', trustSignal);

        result.synced++;
      } catch (error: any) {
        result.failed++;
        result.errors?.push(`${mention.id}: ${error.message}`);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Sync crisis signal to Trust Intelligence
   */
  async syncCrisisSignal(
    brandId: string,
    crisis: {
      platform: string;
      crisisType: string;
      severity: string;
      metrics?: any;
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      const signal: TrustSignal = {
        id: `crisis-${Date.now()}`,
        brandId,
        source: 'social',
        type: `crisis_${crisis.crisisType}`,
        score: this.severityToScore(crisis.severity),
        weight: 1.0, // Highest weight for crisis signals
        description: `Crisis detected on ${crisis.platform}: ${crisis.crisisType}`,
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      await this.trustClient.post('/api/signals/crisis', signal);

      // Also update brand trust score
      await this.trustClient.patch(`/api/brands/${brandId}/trust-score`, {
        adjustment: -this.severityToScore(crisis.severity) / 10,
        reason: `Crisis: ${crisis.crisisType}`,
        source: 'brandpulse'
      });

      this.logger.warn('Crisis signal synced to Trust Intelligence', {
        brandId,
        crisisType: crisis.crisisType,
        severity: crisis.severity
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error: any) {
      this.logger.error('Failed to sync crisis signal', {
        brandId,
        error: error.message
      });
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Sync alert signal to Trust Intelligence
   */
  async syncAlertSignal(
    brandId: string,
    alert: {
      type: string;
      severity: string;
      message: string;
      details?: any;
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      const signal: TrustSignal = {
        id: `alert-${Date.now()}`,
        brandId,
        source: 'social',
        type: `alert_${alert.type}`,
        score: this.severityToScore(alert.severity) * 0.5, // Alerts have half the weight of crises
        weight: 0.5,
        description: alert.message,
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
      };

      await this.trustClient.post('/api/signals/alert', signal);

      return { success: true, synced: 1, failed: 0 };
    } catch (error: any) {
      this.logger.error('Failed to sync alert signal', {
        brandId,
        error: error.message
      });
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Get brand trust score from Trust Intelligence
   */
  async getBrandTrustScore(brandId: string): Promise<{
    score: number;
    breakdown: any;
    lastUpdated: Date;
  } | null> {
    try {
      const response = await this.trustClient.get(`/api/brands/${brandId}/trust-score`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get trust signals for a brand
   */
  async getTrustSignals(
    brandId: string,
    options?: {
      source?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<TrustSignal[]> {
    try {
      const params = new URLSearchParams();
      if (options?.source) params.append('source', options.source);
      if (options?.type) params.append('type', options.type);
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await this.trustClient.get(`/api/signals?brandId=${brandId}&${params.toString()}`);
      return response.data.signals || [];
    } catch {
      return [];
    }
  }

  /**
   * Get trust trend for a brand over time
   */
  async getTrustTrend(
    brandId: string,
    period: 'day' | 'week' | 'month' = 'day',
    points: number = 30
  ): Promise<{
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    dataPoints: { timestamp: Date; score: number }[];
  } | null> {
    try {
      const response = await this.trustClient.get(
        `/api/brands/${brandId}/trust-trend?period=${period}&points=${points}`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get competitive trust comparison
   */
  async getCompetitiveTrustAnalysis(brandId: string): Promise<{
    brandScore: number;
    competitors: { brandId: string; name: string; score: number }[];
    industryAverage: number;
    percentile: number;
  } | null> {
    try {
      const response = await this.trustClient.get(
        `/api/brands/${brandId}/competitive-analysis`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Batch sync sentiment with aggregation
   */
  async syncSentimentBatch(
    sentiments: BrandSentiment[]
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      // Aggregate sentiment by brand
      const aggregated = this.aggregateSentimentByBrand(sentiments);

      let synced = 0;
      let failed = 0;

      for (const [brandId, data] of Object.entries(aggregated)) {
        try {
          await this.trustClient.post('/api/signals/social/batch', {
            brandId,
            signals: data
          });
          synced++;
        } catch {
          failed++;
        }
      }

      return { success: failed === 0, synced, failed };
    } catch (error: any) {
      this.logger.error('Batch sentiment sync failed', { error: error.message });
      return { success: false, synced: 0, failed: sentiments.length };
    }
  }

  /**
   * Calculate brand reputation score
   */
  async calculateReputationScore(
    brandId: string,
    signals: TrustSignal[]
  ): Promise<number> {
    if (signals.length === 0) return 50; // Default neutral score

    // Weighted average of signal scores
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = signals.reduce((sum, s) => sum + s.score * s.weight, 0);

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Get Trust Intelligence health status
   */
  async getHealth(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      const response = await this.trustClient.get('/health', { timeout: 5000 });
      return {
        healthy: response.status === 200,
        latency: Date.now() - start
      };
    } catch {
      return {
        healthy: false,
        latency: Date.now() - start
      };
    }
  }

  /**
   * Transform BrandSentiment to TrustSignal
   */
  private transformToTrustSignal(sentiment: BrandSentiment): TrustSignal {
    // Convert sentiment score (-1 to 1) to trust score (0-100)
    const trustScore = Math.round((sentiment.score + 1) * 50);

    return {
      id: `sentiment-${sentiment.brandId}-${Date.now()}`,
      brandId: sentiment.brandId,
      source: 'social',
      type: `sentiment_${sentiment.platform}`,
      score: trustScore,
      weight: 0.3, // Social sentiment has moderate weight
      description: `Sentiment score: ${sentiment.score} (positive: ${sentiment.positive}, negative: ${sentiment.negative}, neutral: ${sentiment.neutral})`,
      sourceUrl: undefined,
      detectedAt: sentiment.timestamp,
      expiresAt: new Date(sentiment.timestamp.getTime() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * Transform BrandMention to TrustSignal
   */
  private transformMentionToTrustSignal(mention: BrandMention): TrustSignal {
    // Convert sentiment score to trust score
    const trustScore = Math.round((mention.sentimentScore + 1) * 50);

    return {
      id: `mention-${mention.id}`,
      brandId: mention.brandId,
      source: 'social',
      type: `mention_${mention.platform}`,
      score: trustScore,
      weight: this.calculateMentionWeight(mention),
      description: `Social mention on ${mention.platform}: "${mention.content.substring(0, 100)}..."`,
      sourceUrl: mention.url,
      detectedAt: mention.createdAt,
      expiresAt: new Date(mention.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }

  /**
   * Calculate mention weight based on engagement and reach
   */
  private calculateMentionWeight(mention: BrandMention): number {
    let weight = 0.1; // Base weight

    // Add reach weight (max 0.2)
    const reachWeight = Math.min(mention.reach / 100000, 1) * 0.2;
    weight += reachWeight;

    // Add engagement weight (max 0.3)
    const totalEngagement =
      mention.engagement.likes +
      mention.engagement.shares * 2 + // Shares are more valuable
      mention.engagement.comments * 3; // Comments are most valuable
    const engagementWeight = Math.min(totalEngagement / 10000, 1) * 0.3;
    weight += engagementWeight;

    // Add sentiment weight
    if (mention.sentiment === 'positive') weight += 0.2;
    else if (mention.sentiment === 'negative') weight -= 0.2;

    return Math.max(0.05, Math.min(weight, 1)); // Clamp between 0.05 and 1
  }

  /**
   * Aggregate sentiment data by brand
   */
  private aggregateSentimentByBrand(
    sentiments: BrandSentiment[]
  ): Record<string, TrustSignal[]> {
    const aggregated: Record<string, TrustSignal[]> = {};

    for (const sentiment of sentiments) {
      if (!aggregated[sentiment.brandId]) {
        aggregated[sentiment.brandId] = [];
      }
      aggregated[sentiment.brandId].push(this.transformToTrustSignal(sentiment));
    }

    return aggregated;
  }

  /**
   * Convert severity to score
   */
  private severityToScore(severity: string): number {
    switch (severity) {
      case 'critical':
        return 100;
      case 'high':
        return 75;
      case 'medium':
        return 50;
      case 'low':
        return 25;
      default:
        return 50;
    }
  }
}
