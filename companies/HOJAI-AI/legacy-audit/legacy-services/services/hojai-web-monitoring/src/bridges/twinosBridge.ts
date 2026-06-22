/**
 * TwinOS Bridge - Updates digital twins with web intelligence
 */

import axios from 'axios';

export interface WebTwinData {
  name: string;
  url: string;
  lastUpdate?: string;
  lastChange?: string;
  contentSnapshot?: string;
  webScore?: number;
  competitors?: string[];
  news?: string[];
  socialPresence?: Record<string, boolean>;
}

export class TwinOSBridge {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.apiKey = process.env.TWINOS_API_KEY || 'twinos-internal-key';
  }

  /**
   * Update a company twin with web intelligence data
   */
  async updateTwin(entityId: string, entityType: string, webData: WebTwinData): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/twins/${entityType}/${entityId}`,
        {
          source: 'web-monitoring',
          timestamp: new Date().toISOString(),
          data: {
            webIntelligence: webData,
            webScore: this.calculateWebScore(webData),
            lastWebUpdate: new Date().toISOString()
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error: any) {
      console.warn('TwinOS bridge error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch update multiple twins
   */
  async batchUpdateTwins(updates: Array<{
    entityId: string;
    entityType: string;
    webData: WebTwinData;
  }>): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        await this.updateTwin(update.entityId, update.entityType, update.webData);
        successful++;
      } catch {
        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Get twin data for a company
   */
  async getTwin(entityId: string, entityType: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/twins/${entityType}/${entityId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error: any) {
      console.warn('TwinOS get error:', error.message);
      return null;
    }
  }

  /**
   * Calculate web presence score (0-100)
   */
  private calculateWebScore(webData: WebTwinData): number {
    let score = 0;

    if (webData.url) score += 30;
    if (webData.competitors?.length) score += 20;
    if (webData.news?.length) score += 20;
    if (webData.socialPresence) {
      const socialCount = Object.values(webData.socialPresence).filter(Boolean).length;
      score += socialCount * 10;
    }
    if (webData.contentSnapshot) score += 10;

    return Math.min(score, 100);
  }
}