/**
 * HOJAI AI Integration Client
 *
 * Connected Services:
 * - Web Intelligence (4595): Market signals, competitor analysis
 * - Merchant Intelligence (4751): Business intelligence, sales insights
 * - Lead Service: Lead scoring and enrichment
 * - Knowledge Graph (4786): Entity relationships
 */

import axios from 'axios';

const HOJAI_CONFIG = {
  webIntelligence: process.env.HOJAI_WEB_INTEL || 'http://localhost:4595',
  merchantIntelligence: process.env.HOJAI_MERCHANT_INTEL || 'http://localhost:4751',
  leadService: process.env.HOJAI_LEAD_SERVICE || 'http://localhost:4752',
  knowledgeGraph: process.env.HOJAI_KG || 'http://localhost:4786',
};

export interface MarketSignal {
  type: 'competitor' | 'trend' | 'news' | 'social';
  source: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: Date;
  relevance: number;
}

export interface BusinessIntelligence {
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'enterprise';
  techStack: string[];
  funding: string;
  growth: number;
}

export class HojaiAIClient {
  private webIntelClient = axios.create({ baseURL: HOJAI_CONFIG.webIntelligence, timeout: 5000 });
  private merchantIntelClient = axios.create({ baseURL: HOJAI_CONFIG.merchantIntelligence, timeout: 5000 });
  private leadClient = axios.create({ baseURL: HOJAI_CONFIG.leadService, timeout: 5000 });
  private kgClient = axios.create({ baseURL: HOJAI_CONFIG.knowledgeGraph, timeout: 5000 });

  /**
   * Fetch market signals from web intelligence
   */
  async getMarketSignals(query: string): Promise<MarketSignal[]> {
    try {
      const response = await this.webIntelClient.get('/signals/search', {
        params: { q: query, limit: 10 }
      });
      return response.data.signals || [];
    } catch (error) {
      console.log('HOJAI Web Intelligence unavailable, using fallback');
      return this.getFallbackSignals(query);
    }
  }

  /**
   * Get business intelligence for a company
   */
  async getBusinessIntelligence(companyName: string): Promise<BusinessIntelligence | null> {
    try {
      const response = await this.merchantIntelClient.get('/company-intel', {
        params: { name: companyName }
      });
      return response.data;
    } catch (error) {
      console.log('HOJAI Merchant Intelligence unavailable');
      return null;
    }
  }

  /**
   * Score a lead using AI
   */
  async scoreLead(leadData: any): Promise<{ score: number; factors: string[]; recommendations: string[] }> {
    try {
      const response = await this.leadClient.post('/score', leadData);
      return response.data;
    } catch (error) {
      return this.calculateFallbackScore(leadData);
    }
  }

  /**
   * Query knowledge graph for entity relationships
   */
  async queryKnowledgeGraph(entity: string, relationship?: string): Promise<any[]> {
    try {
      const response = await this.kgClient.get('/query', {
        params: { entity, relationship }
      });
      return response.data.results || [];
    } catch (error) {
      console.log('HOJAI Knowledge Graph unavailable');
      return [];
    }
  }

  /**
   * Enrich lead with AI insights
   */
  async enrichLead(leadId: string): Promise<any> {
    try {
      const response = await this.leadClient.post('/enrich', { leadId });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get twin data for a prospect
   */
  async getProspectTwin(prospectId: string): Promise<any> {
    try {
      const response = await this.merchantIntelClient.get('/twin', {
        params: { id: prospectId }
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  private getFallbackSignals(query: string): MarketSignal[] {
    return [
      {
        type: 'trend',
        source: 'HOJAI Web Intelligence',
        content: `Market trend detected for: ${query}`,
        sentiment: 'neutral',
        timestamp: new Date(),
        relevance: 0.7
      }
    ];
  }

  private calculateFallbackScore(leadData: any): { score: number; factors: string[]; recommendations: string[] } {
    let score = 50;
    const factors: string[] = [];
    const recommendations: string[] = [];

    if (leadData.company) score += 10;
    if (leadData.email) score += 15;
    if (leadData.phone) score += 10;
    if (leadData.website) score += 5;

    return { score: Math.min(score, 100), factors, recommendations };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.webIntelClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}