import axios, { AxiosInstance } from 'axios';
import { BrandCampaign, BrandMention, BrandSentiment, BrandHealthKPIs } from '../models/BrandSync';

export class BrandOpsBridge {
  private customerOpsClient: AxiosInstance;
  private dashboardClient: AxiosInstance;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;

    // Initialize Customer Operations OS client
    this.customerOpsClient = axios.create({
      baseURL: process.env.CUSTOMER_OPS_URL || 'http://localhost:4990',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CUSTOMER_OPS_API_KEY || ''
      }
    });

    // Initialize Executive Dashboard client
    this.dashboardClient = axios.create({
      baseURL: process.env.DASHBOARD_URL || 'http://localhost:4000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.DASHBOARD_API_KEY || ''
      }
    });

    // Add response interceptor for logging
    this.customerOpsClient.interceptors.response.use(
      response => {
        this.logger.debug('Customer Ops API response', {
          status: response.status,
          path: response.config.url
        });
        return response;
      },
      error => {
        this.logger.error('Customer Ops API error', {
          status: error.response?.status,
          path: error.config?.url,
          message: error.message
        });
        throw error;
      }
    );

    this.dashboardClient.interceptors.response.use(
      response => response,
      error => {
        this.logger.error('Dashboard API error', {
          status: error.response?.status,
          path: error.config?.url,
          message: error.message
        });
        throw error;
      }
    );
  }

  /**
   * Sync campaign metrics to Customer Operations OS
   */
  async syncCampaignMetrics(campaigns: BrandCampaign[]): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    const result = { success: true, synced: 0, failed: 0, errors: [] as string[] };

    for (const campaign of campaigns) {
      try {
        await this.customerOpsClient.post('/api/campaigns/sync', {
          campaignId: campaign.id,
          brandId: campaign.brandId,
          name: campaign.name,
          status: campaign.status,
          metrics: {
            impressions: campaign.metrics.impressions,
            reach: campaign.metrics.reach,
            clicks: campaign.metrics.clicks,
            conversions: campaign.metrics.conversions,
            ctr: campaign.metrics.ctr,
            roas: campaign.metrics.roas,
            engagement: campaign.metrics.engagement
          },
          sentiment: campaign.metrics.sentiment,
          platforms: campaign.platforms,
          startDate: campaign.startDate,
          endDate: campaign.endDate
        });

        result.synced++;
      } catch (error: any) {
        result.failed++;
        result.errors?.push(`${campaign.id}: ${error.message}`);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Process brand mentions in Customer Operations OS
   */
  async processBrandMentions(mentions: BrandMention[]): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    const result = { success: true, synced: 0, failed: 0, errors: [] as string[] };

    for (const mention of mentions) {
      try {
        await this.customerOpsClient.post('/api/mentions/process', {
          mentionId: mention.id,
          brandId: mention.brandId,
          platform: mention.platform,
          authorId: mention.authorId,
          authorName: mention.authorName,
          content: mention.content,
          sentiment: mention.sentiment,
          sentimentScore: mention.sentimentScore,
          reach: mention.reach,
          engagement: mention.engagement,
          hashtags: mention.hashtags,
          url: mention.url,
          createdAt: mention.createdAt
        });

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
   * Process trend alerts in Customer Operations OS
   */
  async processTrendAlert(
    brandId: string,
    trend: {
      platform: string;
      trendType: string;
      volume: number;
      sentiment: BrandSentiment;
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.customerOpsClient.post('/api/alerts/trend', {
        brandId,
        platform: trend.platform,
        trendType: trend.trendType,
        volume: trend.volume,
        sentiment: trend.sentiment.score,
        keywords: trend.sentiment.keywords,
        timestamp: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Process engagement data in Customer Operations OS
   */
  async processEngagementData(
    brandId: string,
    data: {
      platform: string;
      campaignId: string;
      likes?: number;
      shares?: number;
      comments?: number;
      views?: number;
      clicks?: number;
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.customerOpsClient.post('/api/engagement/process', {
        brandId,
        campaignId: data.campaignId,
        platform: data.platform,
        metrics: {
          likes: data.likes || 0,
          shares: data.shares || 0,
          comments: data.comments || 0,
          views: data.views || 0,
          clicks: data.clicks || 0
        },
        timestamp: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Process crisis alerts in Customer Operations OS
   */
  async processCrisisAlert(
    brandId: string,
    crisis: {
      platform: string;
      crisisType: string;
      severity: string;
      affectedContent?: any[];
      metrics?: any;
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.customerOpsClient.post('/api/crisis/process', {
        brandId,
        platform: crisis.platform,
        crisisType: crisis.crisisType,
        severity: crisis.severity,
        affectedContent: crisis.affectedContent,
        metrics: crisis.metrics,
        detectedAt: new Date()
      });

      // Notify escalation team if critical
      if (crisis.severity === 'critical') {
        await this.customerOpsClient.post('/api/escalation/trigger', {
          brandId,
          type: 'brand_crisis',
          severity: crisis.severity,
          source: 'brandpulse',
          data: crisis
        });
      }

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Process brand alerts in Customer Operations OS
   */
  async processBrandAlert(
    brandId: string,
    alert: {
      type: string;
      severity: string;
      message: string;
      details?: any;
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.customerOpsClient.post('/api/alerts/brand', {
        brandId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        details: alert.details,
        source: 'brandpulse',
        timestamp: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Process report ready notifications in Customer Operations OS
   */
  async processReportReady(
    brandId: string,
    report: {
      type: string;
      url: string;
      period: { start: Date; end: Date };
    }
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.customerOpsClient.post('/api/reports/ready', {
        brandId,
        type: report.type,
        url: report.url,
        period: report.period,
        source: 'brandpulse',
        timestamp: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Update brand health KPIs on Executive Dashboard
   */
  async updateBrandHealthKPIs(brandId: string, campaigns: BrandCampaign[]): Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }> {
    try {
      // Aggregate metrics from campaigns
      const aggregatedMetrics = this.aggregateCampaignMetrics(campaigns);

      await this.dashboardClient.post('/api/kpis/brand-health', {
        brandId,
        metrics: aggregatedMetrics,
        timestamp: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Update sentiment KPIs on Executive Dashboard
   */
  async updateSentimentKPIs(brandId: string, sentiment: BrandSentiment): Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }> {
    try {
      await this.dashboardClient.post('/api/kpis/sentiment', {
        brandId,
        score: sentiment.score,
        positive: sentiment.positive,
        negative: sentiment.negative,
        neutral: sentiment.neutral,
        volume: sentiment.volume,
        trending: sentiment.trending,
        keywords: sentiment.keywords,
        platform: sentiment.platform,
        timestamp: sentiment.timestamp
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Notify Customer Operations of sentiment changes
   */
  async notifySentimentChange(
    brandId: string,
    sentiment: BrandSentiment
  ): Promise<{ success: boolean; synced: number; failed: number }> {
    try {
      await this.customerOpsClient.post('/api/sentiment/change', {
        brandId,
        platform: sentiment.platform,
        score: sentiment.score,
        previousScore: sentiment.score - 0.1, // Would need actual previous score
        change: 0.1,
        volume: sentiment.volume,
        timestamp: new Date()
      });

      return { success: true, synced: 1, failed: 0 };
    } catch (error) {
      return { success: false, synced: 0, failed: 1 };
    }
  }

  /**
   * Aggregate metrics from multiple campaigns
   */
  private aggregateCampaignMetrics(campaigns: BrandCampaign[]): any {
    const totals = {
      impressions: 0,
      reach: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      roas: 0,
      engagement: 0,
      sentiment: {
        positive: 0,
        negative: 0,
        neutral: 0
      }
    };

    for (const campaign of campaigns) {
      totals.impressions += campaign.metrics.impressions;
      totals.reach += campaign.metrics.reach;
      totals.clicks += campaign.metrics.clicks;
      totals.conversions += campaign.metrics.conversions;
      totals.engagement += campaign.metrics.engagement;
      totals.sentiment.positive += campaign.metrics.sentiment.positive;
      totals.sentiment.negative += campaign.metrics.sentiment.negative;
      totals.sentiment.neutral += campaign.metrics.sentiment.neutral;
    }

    // Calculate averages
    if (campaigns.length > 0) {
      totals.ctr = campaigns.reduce((sum, c) => sum + c.metrics.ctr, 0) / campaigns.length;
      totals.roas = campaigns.reduce((sum, c) => sum + c.metrics.roas, 0) / campaigns.length;
    }

    return totals;
  }

  /**
   * Get customer operations status
   */
  async getStatus(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      const response = await this.customerOpsClient.get('/health', {
        timeout: 5000
      });

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
}
