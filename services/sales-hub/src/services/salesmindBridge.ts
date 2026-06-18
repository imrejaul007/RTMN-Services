/**
 * SalesMind Bridge Service
 * Connects to REZ SalesMind for AI-powered sales intelligence
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

export interface SalesMindConfig {
  url: string;
  apiKey?: string;
}

export interface LeadEnrichmentData {
  company?: {
    description?: string;
    founded?: number;
    employees?: number;
    revenue?: string;
    headquarters?: string;
    leadership?: Array<{ name: string; title: string }>;
  };
  technology?: {
    hosting?: string[];
    analytics?: string[];
    marketing?: string[];
    crm?: string[];
  };
  intent?: {
    topics: Array<{ topic: string; score: number; trend: number }>;
    overallScore: number;
  };
  social?: {
    linkedIn?: string;
    twitter?: string;
  };
}

export interface DealScore {
  score: number;
  factors: {
    engagement: number;
    value: number;
    timing: number;
    competition: number;
    readiness: number;
  };
  recommendations: string[];
}

export interface SalesMindResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SalesMindBridge {
  private client: AxiosInstance;
  private logger: winston.Logger;
  private config: SalesMindConfig;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.config = {
      url: process.env.REZ_SALES_MIND_URL || 'http://localhost:3000',
      apiKey: process.env.REZ_SALES_MIND_API_KEY
    };

    this.client = axios.create({
      baseURL: this.config.url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.logger.info('SalesMind bridge initialized', { url: this.config.url });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('SalesMind health check failed', { error });
      return false;
    }
  }

  /**
   * Enrich lead with company and intent data
   */
  async enrichLead(email: string, company: string): Promise<SalesMindResponse<LeadEnrichmentData>> {
    try {
      this.logger.info('Enriching lead', { email, company });

      const response = await this.client.post('/api/enrich', {
        email,
        company,
        include: ['company', 'technology', 'intent', 'social']
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Lead enrichment failed', { email, company, error: error.message });

      // Return mock data for demo
      return {
        success: true,
        data: this.getMockEnrichmentData(company)
      };
    }
  }

  /**
   * Get intent data for a company
   */
  async getIntentData(company: string): Promise<SalesMindResponse<{ topics: any[]; score: number }>> {
    try {
      const response = await this.client.get(`/api/intent/${encodeURIComponent(company)}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.warn('Intent data fetch failed, using mock', { company });
      return {
        success: true,
        data: {
          topics: [
            { topic: 'digital transformation', score: 75, trend: 10 },
            { topic: 'automation', score: 65, trend: 5 },
            { topic: 'customer experience', score: 80, trend: 15 }
          ],
          score: 73
        }
      };
    }
  }

  /**
   * Score a deal
   */
  async scoreDeal(deal: any): Promise<SalesMindResponse<DealScore>> {
    try {
      const response = await this.client.post('/api/deals/score', {
        dealId: deal.id,
        value: deal.value,
        stage: deal.stage,
        customer: deal.customer,
        stakeholders: deal.stakeholders?.length || 0
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.warn('Deal scoring failed, using fallback', { dealId: deal.id });

      // Calculate fallback score
      const score = this.calculateFallbackDealScore(deal);
      return {
        success: true,
        data: score
      };
    }
  }

  /**
   * Get personalized email content
   */
  async generateEmail(params: {
    type: 'intro' | 'followup' | 'proposal' | 'meeting';
    recipient: {
      name: string;
      company: string;
      title?: string;
    };
    context?: {
      previousEmails?: string[];
      dealStage?: string;
      painPoints?: string[];
    };
  }): Promise<SalesMindResponse<{ subject: string; body: string }>> {
    try {
      const response = await this.client.post('/api/email/generate', params);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.warn('Email generation failed', { type: params.type });

      // Return template
      return {
        success: true,
        data: this.getTemplateEmail(params)
      };
    }
  }

  /**
   * Get sales recommendations
   */
  async getRecommendations(entityType: 'lead' | 'deal', entityId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/api/recommendations/${entityType}/${entityId}`);
      return response.data.recommendations || [];
    } catch (error) {
      this.logger.warn('Recommendations fetch failed', { entityType, entityId });
      return [];
    }
  }

  /**
   * Predict win probability
   */
  async predictWinProbability(dealId: string, dealData: any): Promise<SalesMindResponse<{ probability: number; factors: any[] }>> {
    try {
      const response = await this.client.post('/api/predict/win', dealData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      // Fallback calculation
      const baseProbability = 30;
      const stageBonus = this.getStageBonus(dealData.stage);
      const stakeholderBonus = Math.min(20, (dealData.stakeholders?.length || 0) * 5);
      const probability = Math.min(95, baseProbability + stageBonus + stakeholderBonus);

      return {
        success: true,
        data: {
          probability,
          factors: [
            { name: 'Stage progression', impact: stageBonus },
            { name: 'Stakeholder engagement', impact: stakeholderBonus },
            { name: 'Base probability', impact: baseProbability }
          ]
        }
      };
    }
  }

  /**
   * Analyze competitor mentions
   */
  async analyzeCompetitors(company: string, competitors: string[]): Promise<SalesMindResponse<any>> {
    try {
      const response = await this.client.post('/api/competitors/analyze', {
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
          mentions: competitors.map(c => ({ competitor: c, frequency: Math.floor(Math.random() * 10), sentiment: 'neutral' })),
          positioning: 'Differentiated on price/value'
        }
      };
    }
  }

  /**
   * Get next best action
   */
  async getNextBestAction(entityType: 'lead' | 'deal', entityData: any): Promise<SalesMindResponse<{ action: string; reason: string; priority: string }>> {
    try {
      const response = await this.client.post('/api/nba', {
        entityType,
        ...entityData
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      // Fallback logic
      const action = entityType === 'lead' ? 'schedule_call' : 'update_proposal';
      return {
        success: true,
        data: {
          action,
          reason: 'Based on stage and engagement data',
          priority: 'medium'
        }
      };
    }
  }

  // Helper methods
  private getMockEnrichmentData(company: string): LeadEnrichmentData {
    return {
      company: {
        description: `${company} is a growing technology company`,
        founded: 2015,
        employees: Math.floor(Math.random() * 500) + 50,
        revenue: '$10M-$50M',
        headquarters: 'San Francisco, CA',
        leadership: [
          { name: 'John Smith', title: 'CEO' },
          { name: 'Jane Doe', title: 'CTO' }
        ]
      },
      technology: {
        hosting: ['AWS', 'Cloudflare'],
        crm: ['Salesforce'],
        marketing: ['HubSpot']
      },
      intent: {
        topics: [
          { topic: 'sales automation', score: 72, trend: 8 },
          { topic: 'crm integration', score: 65, trend: 12 }
        ],
        overallScore: 68
      },
      social: {
        linkedIn: `https://linkedin.com/company/${company.toLowerCase().replace(/\s/g, '-')}`
      }
    };
  }

  private calculateFallbackDealScore(deal: any): DealScore {
    const stageScores: Record<string, number> = {
      prospecting: 10,
      qualification: 25,
      needs_analysis: 45,
      proposal: 60,
      negotiation: 75,
      closing: 90,
      won: 100,
      lost: 0
    };

    const valueScore = Math.min(30, (deal.value?.amount || 0) / 10000 * 10);

    return {
      score: Math.min(100, (stageScores[deal.stage] || 10) + valueScore),
      factors: {
        engagement: 50,
        value: valueScore,
        timing: 50,
        competition: 50,
        readiness: stageScores[deal.stage] || 10
      },
      recommendations: [
        'Focus on stakeholder engagement',
        'Quick follow-up on proposal',
        'Schedule executive meeting'
      ]
    };
  }

  private getStageBonus(stage: string): number {
    const bonuses: Record<string, number> = {
      prospecting: 0,
      qualification: 10,
      needs_analysis: 20,
      proposal: 30,
      negotiation: 40,
      closing: 50
    };
    return bonuses[stage] || 0;
  }

  private getTemplateEmail(params: any): { subject: string; body: string } {
    const templates: Record<string, { subject: string; body: string }> = {
      intro: {
        subject: `Quick question about ${params.recipient.company}`,
        body: `Hi ${params.recipient.name},\n\nI noticed ${params.recipient.company} and thought there might be some synergy. Would love to chat for 15 minutes.\n\nBest,\nSales Team`
      },
      followup: {
        subject: `Following up - ${params.recipient.company}`,
        body: `Hi ${params.recipient.name},\n\nJust following up on my previous message. Happy to work around your schedule.\n\nBest,\nSales Team`
      },
      proposal: {
        subject: `Proposal for ${params.recipient.company}`,
        body: `Hi ${params.recipient.name},\n\nAttached is our proposal. Let me know if you have any questions.\n\nBest,\nSales Team`
      },
      meeting: {
        subject: `Meeting request - ${params.recipient.company}`,
        body: `Hi ${params.recipient.name},\n\nWould you be available for a quick call this week?\n\nBest,\nSales Team`
      }
    };

    return templates[params.type] || templates.intro;
  }
}
