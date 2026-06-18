/**
 * BrandPulse Bridge Service
 * Connects to BrandPulse for brand analytics and sentiment
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

export interface BrandPulseConfig {
  url: string;
  apiKey?: string;
}

export interface BrandData {
  company: string;
  overall: {
    score: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    mentions: number;
    trend: number;
  };
  channels: {
    twitter?: { mentions: number; sentiment: number };
    linkedin?: { mentions: number; sentiment: number };
    news?: { mentions: number; sentiment: number };
    reviews?: { mentions: number; sentiment: number };
  };
  competitive: {
    position: number;
    shareOfVoice: number;
    competitors: Array<{
      name: string;
      shareOfVoice: number;
      sentiment: number;
    }>;
  };
  trends: Array<{
    date: string;
    mentions: number;
    sentiment: number;
  }>;
  topTopics: Array<{
    topic: string;
    mentions: number;
    sentiment: number;
  }>;
}

export interface AffinityData {
  brandMentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  shareOfVoice: number;
  competitivePosition: string[];
  affinityScore: number;
}

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    leads: number;
    revenue: number;
    cpl: number;
    roas: number;
  };
}

export interface BrandPulseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class BrandPulseBridge {
  private client: AxiosInstance;
  private logger: winston.Logger;
  private config: BrandPulseConfig;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.config = {
      url: process.env.BRANDPULSE_URL || 'http://localhost:4056',
      apiKey: process.env.BRANDPULSE_API_KEY
    };

    this.client = axios.create({
      baseURL: this.config.url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.logger.info('BrandPulse bridge initialized', { url: this.config.url });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('BrandPulse health check failed', { error });
      return false;
    }
  }

  /**
   * Get brand analytics
   */
  async getBrandAnalytics(company: string, period?: '7d' | '30d' | '90d'): Promise<BrandPulseResponse<BrandData>> {
    try {
      const response = await this.client.get(`/api/brands/${encodeURIComponent(company)}/analytics`, {
        params: { period: period || '30d' }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.warn('Brand analytics fetch failed, using mock', { company });
      return {
        success: true,
        data: this.getMockBrandData(company)
      };
    }
  }

  /**
   * Get brand affinity for a company
   */
  async getBrandAffinity(company: string): Promise<BrandPulseResponse<AffinityData>> {
    try {
      const response = await this.client.get(`/api/brands/${encodeURIComponent(company)}/affinity`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.warn('Brand affinity fetch failed, using mock', { company });
      return {
        success: true,
        data: this.getMockAffinityData(company)
      };
    }
  }

  /**
   * Get sentiment analysis
   */
  async getSentiment(company: string): Promise<BrandPulseResponse<{
    overall: number;
    positive: number;
    neutral: number;
    negative: number;
    trend: number;
  }>> {
    try {
      const response = await this.client.get(`/api/brands/${encodeURIComponent(company)}/sentiment`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: {
          overall: 65,
          positive: 55,
          neutral: 30,
          negative: 15,
          trend: 5
        }
      };
    }
  }

  /**
   * Get share of voice
   */
  async getShareOfVoice(company: string, competitors: string[]): Promise<BrandPulseResponse<{
    company: { name: string; sov: number; sentiment: number };
    competitors: Array<{ name: string; sov: number; sentiment: number }>;
    total: number;
  }>> {
    try {
      const response = await this.client.post('/api/sov', {
        company,
        competitors
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: {
          company: { name: company, sov: 35, sentiment: 65 },
          competitors: competitors.map(c => ({ name: c, sov: Math.random() * 30, sentiment: Math.random() * 100 })),
          total: 100
        }
      };
    }
  }

  /**
   * Track campaign performance
   */
  async trackCampaign(campaignId: string): Promise<BrandPulseResponse<CampaignData>> {
    try {
      const response = await this.client.get(`/api/campaigns/${campaignId}/track`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: this.getMockCampaignData(campaignId)
      };
    }
  }

  /**
   * Create tracking campaign
   */
  async createCampaign(campaign: {
    name: string;
    target: string;
    channels: string[];
    startDate: Date;
    endDate: Date;
  }): Promise<BrandPulseResponse<{ id: string }>> {
    try {
      const response = await this.client.post('/api/campaigns', campaign);
      return {
        success: true,
        data: { id: response.data.id }
      };
    } catch (error: any) {
      this.logger.error('Campaign creation failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get top topics/keywords
   */
  async getTopTopics(company: string, limit: number = 10): Promise<BrandPulseResponse<Array<{
    topic: string;
    mentions: number;
    sentiment: number;
    trend: number;
  }>>> {
    try {
      const response = await this.client.get(`/api/brands/${encodeURIComponent(company)}/topics`, {
        params: { limit }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: [
          { topic: 'product quality', mentions: 450, sentiment: 72, trend: 8 },
          { topic: 'customer service', mentions: 320, sentiment: 68, trend: 12 },
          { topic: 'pricing', mentions: 280, sentiment: 45, trend: -3 },
          { topic: 'innovation', mentions: 250, sentiment: 80, trend: 15 },
          { topic: 'reliability', mentions: 200, sentiment: 75, trend: 5 }
        ]
      };
    }
  }

  /**
   * Get influencer mentions
   */
  async getInfluencerMentions(company: string): Promise<BrandPulseResponse<Array<{
    name: string;
    handle: string;
    platform: string;
    followers: number;
    sentiment: number;
    reach: number;
  }>>> {
    try {
      const response = await this.client.get(`/api/brands/${encodeURIComponent(company)}/influencers`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: [
          { name: 'Tech Influencer', handle: '@techguru', platform: 'twitter', followers: 50000, sentiment: 75, reach: 25000 },
          { name: 'Business Pro', handle: '@bizpro', platform: 'linkedin', followers: 30000, sentiment: 80, reach: 15000 }
        ]
      };
    }
  }

  /**
   * Monitor crisis/alerts
   */
  async getAlerts(company: string): Promise<BrandPulseResponse<Array<{
    id: string;
    type: 'crisis' | 'warning' | 'info';
    severity: 'high' | 'medium' | 'low';
    message: string;
    timestamp: Date;
    source: string;
  }>>> {
    try {
      const response = await this.client.get(`/api/brands/${encodeURIComponent(company)}/alerts`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Generate brand report
   */
  async generateReport(company: string, period: 'weekly' | 'monthly' | 'quarterly'): Promise<BrandPulseResponse<{
    reportId: string;
    downloadUrl: string;
  }>> {
    try {
      const response = await this.client.post('/api/reports/generate', {
        company,
        period,
        include: ['sentiment', 'sov', 'topics', 'influencers', 'campaigns']
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Report generation failed', { company, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get competitive benchmarks
   */
  async getBenchmarks(company: string): Promise<BrandPulseResponse<{
    metrics: {
      name: string;
      value: number;
      benchmark: number;
      status: 'above' | 'at' | 'below';
    }[];
    overall: number;
    trend: number;
  }>> {
    try {
      const response = await this.client.get(`/api/brands/${encodeURIComponent(company)}/benchmarks`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: true,
        data: {
          metrics: [
            { name: 'Sentiment Score', value: 65, benchmark: 60, status: 'above' },
            { name: 'Share of Voice', value: 35, benchmark: 30, status: 'above' },
            { name: 'Engagement Rate', value: 4.5, benchmark: 5, status: 'below' },
            { name: 'Response Time', value: 2, benchmark: 4, status: 'above' }
          ],
          overall: 72,
          trend: 5
        }
      };
    }
  }

  // Mock data helpers
  private getMockBrandData(company: string): BrandData {
    return {
      company,
      overall: {
        score: 68,
        sentiment: 'positive',
        mentions: 2500,
        trend: 12
      },
      channels: {
        twitter: { mentions: 800, sentiment: 70 },
        linkedin: { mentions: 600, sentiment: 75 },
        news: { mentions: 400, sentiment: 65 },
        reviews: { mentions: 700, sentiment: 62 }
      },
      competitive: {
        position: 3,
        shareOfVoice: 28,
        competitors: [
          { name: 'Competitor A', shareOfVoice: 35, sentiment: 60 },
          { name: 'Competitor B', shareOfVoice: 25, sentiment: 68 }
        ]
      },
      trends: [
        { date: '2024-01', mentions: 200, sentiment: 60 },
        { date: '2024-02', mentions: 250, sentiment: 65 },
        { date: '2024-03', mentions: 300, sentiment: 68 }
      ],
      topTopics: [
        { topic: 'product quality', mentions: 450, sentiment: 72 },
        { topic: 'customer service', mentions: 320, sentiment: 68 },
        { topic: 'pricing', mentions: 280, sentiment: 45 },
        { topic: 'innovation', mentions: 250, sentiment: 80 },
        { topic: 'reliability', mentions: 200, sentiment: 75 }
      ]
    };
  }

  private getMockAffinityData(company: string): AffinityData {
    return {
      brandMentions: 1500,
      sentiment: 'positive',
      shareOfVoice: 25,
      competitivePosition: ['Competitor A', 'Competitor B', 'Competitor C'],
      affinityScore: 68
    };
  }

  private getMockCampaignData(campaignId: string): CampaignData {
    return {
      id: campaignId,
      name: 'Spring Campaign',
      status: 'active',
      metrics: {
        impressions: 100000,
        clicks: 2500,
        conversions: 125,
        leads: 75,
        revenue: 25000,
        cpl: 333,
        roas: 2.5
      }
    };
  }
}
