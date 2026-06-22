/**
 * AssetMind Connector - Sends web intelligence to AssetMind
 */

import axios from 'axios';

export interface WebIntelligenceData {
  changeType?: string;
  severity?: string;
  timestamp?: string;
  content?: string;
  competitors?: string[];
  news?: Array<{ title: string; url: string; date: string }>;
  socialPresence?: Record<string, boolean>;
  webScore?: number;
}

export class AssetMindConnector {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.apiKey = process.env.ASSETMIND_API_KEY || 'assetmind-internal-key';
  }

  /**
   * Send web intelligence to AssetMind
   */
  async sendIntelligence(
    companyId: string,
    intelligenceType: 'web_change' | 'competitor_news' | 'social_presence' | 'web_score',
    data: WebIntelligenceData
  ): Promise<{ success: boolean; eventId?: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/intelligence/web`,
        {
          companyId,
          type: intelligenceType,
          source: 'hojai-web-monitoring',
          timestamp: new Date().toISOString(),
          data
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { success: true, eventId: response.data.eventId };
    } catch (error: any) {
      console.warn('AssetMind connector error:', error.message);
      return { success: false };
    }
  }

  /**
   * Send company news to AssetMind
   */
  async sendCompanyNews(
    companyId: string,
    news: Array<{ title: string; url: string; date: string; source: string }>
  ): Promise<{ count: number }> {
    let count = 0;

    for (const article of news) {
      try {
        await this.sendIntelligence(companyId, 'competitor_news', {
          content: article.title,
          timestamp: article.date
        });
        count++;
      } catch {
        // Continue with next article
      }
    }

    return { count };
  }

  /**
   * Send web score update to AssetMind
   */
  async sendWebScore(
    companyId: string,
    score: number,
    details: {
      hasWebsite: boolean;
      hasSocial: boolean;
      newsCount: number;
      competitorCount: number;
    }
  ): Promise<void> {
    await this.sendIntelligence(companyId, 'web_score', {
      webScore: score,
      content: JSON.stringify(details)
    });
  }

  /**
   * Get company intelligence from AssetMind
   */
  async getCompanyIntelligence(companyId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/companies/${companyId}/intelligence`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error: any) {
      console.warn('AssetMind get error:', error.message);
      return null;
    }
  }

  /**
   * Subscribe to company updates
   */
  async subscribeToUpdates(
    companyId: string,
    eventTypes: string[]
  ): Promise<{ subscriptionId: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/subscriptions`,
        {
          companyId,
          eventTypes,
          callback: `${process.env.WEB_MONITORING_URL || 'http://localhost:4596'}/api/webhook/assetmind`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { subscriptionId: response.data.subscriptionId };
    } catch (error: any) {
      console.warn('AssetMind subscription error:', error.message);
      return { subscriptionId: '' };
    }
  }
}