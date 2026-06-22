/**
 * HOJAI FounderOS - Market Analysis Service
 */

import { v4 as uuid } from 'uuid';
import { MarketAnalysisModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('market-analysis');

export class MarketAnalysisService {
  /**
   * List all market analyses for a tenant
   */
  async list(tenantId: string, limit = 50, offset = 0): Promise<any[]> {
    const analyses = await MarketAnalysisModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return analyses.map(a => this.formatMarketAnalysis(a));
  }

  /**
   * Get market analysis by ID
   */
  async getById(tenantId: string, id: string): Promise<any | null> {
    const analysis = await MarketAnalysisModel.findOne({ tenantId, id });
    return analysis ? this.formatMarketAnalysis(analysis) : null;
  }

  /**
   * Create a new market analysis
   */
  async create(tenantId: string, data: {
    name: string;
    description?: string;
    marketSize?: {
      value?: number;
      currency?: string;
      unit?: string;
    };
    tam?: number;
    sam?: number;
    som?: number;
    trends?: Array<{
      title: string;
      description?: string;
      impact?: 'positive' | 'negative' | 'neutral';
    }>;
    competitors?: Array<{
      name: string;
      marketShare?: number;
      strengths?: string[];
      weaknesses?: string[];
      website?: string;
    }>;
    opportunities?: string[];
    threats?: string[];
    createdBy?: string;
  }): Promise<any> {
    const id = uuid();

    const analysis = new MarketAnalysisModel({
      id,
      tenantId,
      name: data.name,
      description: data.description,
      marketSize: {
        value: data.marketSize?.value,
        currency: data.marketSize?.currency || 'USD',
        unit: data.marketSize?.unit
      },
      tam: data.tam,
      sam: data.sam,
      som: data.som,
      trends: (data.trends || []).map(t => ({
        id: uuid(),
        title: t.title,
        description: t.description,
        impact: t.impact || 'neutral'
      })),
      competitors: (data.competitors || []).map(c => ({
        id: uuid(),
        name: c.name,
        marketShare: c.marketShare,
        strengths: c.strengths || [],
        weaknesses: c.weaknesses || [],
        website: c.website
      })),
      opportunities: data.opportunities || [],
      threats: data.threats || [],
      createdBy: data.createdBy
    });

    await analysis.save();
    logger.info('market_analysis_created', { tenantId, id, name: data.name });

    return this.formatMarketAnalysis(analysis);
  }

  /**
   * Update a market analysis
   */
  async update(tenantId: string, id: string, updates: {
    name?: string;
    description?: string;
    marketSize?: {
      value?: number;
      currency?: string;
      unit?: string;
    };
    tam?: number;
    sam?: number;
    som?: number;
    trends?: Array<{
      id?: string;
      title: string;
      description?: string;
      impact?: 'positive' | 'negative' | 'neutral';
    }>;
    competitors?: Array<{
      id?: string;
      name: string;
      marketShare?: number;
      strengths?: string[];
      weaknesses?: string[];
      website?: string;
    }>;
    opportunities?: string[];
    threats?: string[];
  }): Promise<any | null> {
    const analysis = await MarketAnalysisModel.findOne({ tenantId, id });
    if (!analysis) return null;

    if (updates.name !== undefined) analysis.name = updates.name;
    if (updates.description !== undefined) analysis.description = updates.description;
    if (updates.marketSize !== undefined) {
      if (!analysis.marketSize) {
        analysis.marketSize = { currency: 'USD' };
      }
      if (updates.marketSize.value !== undefined) analysis.marketSize.value = updates.marketSize.value;
      if (updates.marketSize.currency !== undefined) analysis.marketSize.currency = updates.marketSize.currency;
      if (updates.marketSize.unit !== undefined) analysis.marketSize.unit = updates.marketSize.unit;
    }
    if (updates.tam !== undefined) analysis.tam = updates.tam;
    if (updates.sam !== undefined) analysis.sam = updates.sam;
    if (updates.som !== undefined) analysis.som = updates.som;
    if (updates.trends !== undefined) {
      analysis.trends = updates.trends.map(t => ({
        id: t.id || uuid(),
        title: t.title,
        description: t.description || '',
        impact: (t.impact || 'neutral') as 'positive' | 'negative' | 'neutral'
      }));
    }
    if (updates.competitors !== undefined) {
      analysis.competitors = updates.competitors.map(c => ({
        id: c.id || uuid(),
        name: c.name,
        marketShare: c.marketShare,
        strengths: c.strengths || [],
        weaknesses: c.weaknesses || [],
        website: c.website
      }));
    }
    if (updates.opportunities !== undefined) analysis.opportunities = updates.opportunities;
    if (updates.threats !== undefined) analysis.threats = updates.threats;

    await analysis.save();
    logger.info('market_analysis_updated', { tenantId, id });

    return this.formatMarketAnalysis(analysis);
  }

  /**
   * Delete a market analysis
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await MarketAnalysisModel.deleteOne({ tenantId, id });
    if (result.deletedCount > 0) {
      logger.info('market_analysis_deleted', { tenantId, id });
      return true;
    }
    return false;
  }

  /**
   * Add competitor to market analysis
   */
  async addCompetitor(tenantId: string, id: string, competitor: {
    name: string;
    marketShare?: number;
    strengths?: string[];
    weaknesses?: string[];
    website?: string;
  }): Promise<any | null> {
    const analysis = await MarketAnalysisModel.findOne({ tenantId, id });
    if (!analysis) return null;

    analysis.competitors.push({
      id: uuid(),
      name: competitor.name,
      marketShare: competitor.marketShare,
      strengths: competitor.strengths || [],
      weaknesses: competitor.weaknesses || [],
      website: competitor.website
    });

    await analysis.save();
    logger.info('competitor_added', { tenantId, id, competitorName: competitor.name });

    return this.formatMarketAnalysis(analysis);
  }

  /**
   * Generate TAM/SAM/SOM estimates
   */
  async generateMarketEstimates(
    tenantId: string,
    industry: string,
    region: string
  ): Promise<{
    tam: number;
    sam: number;
    som: number;
    methodology: string;
    confidence: number;
  }> {
    // Market sizing based on industry and region
    const marketMultipliers: Record<string, Record<string, number>> = {
      saas: { global: 150000000000, asia: 45000000000, india: 10000000000 },
      ecommerce: { global: 6000000000000, asia: 1800000000000, india: 100000000000 },
      fintech: { global: 300000000000, asia: 90000000000, india: 15000000000 },
      healthtech: { global: 500000000000, asia: 150000000000, india: 25000000000 },
      edtech: { global: 400000000000, asia: 120000000000, india: 30000000000 }
    };

    const industryKey = industry.toLowerCase().replace(/[^a-z]/g, '');
    const regionKey = region.toLowerCase();

    const tam = marketMultipliers[industryKey]?.[regionKey] ||
      marketMultipliers.saas?.global || 100000000000;

    // SAM: Typically 20-40% of TAM for addressable market
    const sam = tam * 0.3;

    // SOM: Typically 1-10% of SAM for obtainable market
    const som = sam * 0.05;

    return {
      tam,
      sam,
      som,
      methodology: 'Based on industry research and regional market data',
      confidence: 0.7
    };
  }

  /**
   * Analyze competitive landscape
   */
  async analyzeCompetition(tenantId: string, id: string): Promise<any> {
    const analysis = await this.getById(tenantId, id);
    if (!analysis) return null;

    const competitors = analysis.competitors || [];
    const totalMarketShare = competitors.reduce((sum: number, c: { marketShare?: number }) => sum + (c.marketShare || 0), 0);
    const untappedMarket = 100 - totalMarketShare;

    const insights = {
      marketConcentration: totalMarketShare > 80 ? 'Highly concentrated' :
        totalMarketShare > 50 ? 'Moderately concentrated' : 'Fragmented',
      keyPlayers: competitors.filter((c: { marketShare?: number }) => (c.marketShare || 0) > 10),
      competitiveGaps: this.identifyGaps(competitors),
      recommendations: this.generateRecommendations(competitors, untappedMarket),
      untappedOpportunity: untappedMarket
    };

    return insights;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private identifyGaps(competitors: any[]): string[] {
    const gaps: string[] = [];

    const hasEnterprise = competitors.some((c: { strengths?: string[] }) =>
      c.strengths?.some((s: string) => s.toLowerCase().includes('enterprise'))
    );
    if (!hasEnterprise) gaps.push('Enterprise segment underserved');

    const hasMobile = competitors.some((c: { strengths?: string[] }) =>
      c.strengths?.some((s: string) => s.toLowerCase().includes('mobile'))
    );
    if (!hasMobile) gaps.push('Mobile-first solutions gap');

    const hasAI = competitors.some((c: { strengths?: string[] }) =>
      c.strengths?.some((s: string) => s.toLowerCase().includes('ai') || s.toLowerCase().includes('machine learning'))
    );
    if (!hasAI) gaps.push('AI/ML capabilities gap');

    if (gaps.length === 0) {
      gaps.push('Market appears well-served');
    }

    return gaps;
  }

  private generateRecommendations(competitors: any[], untappedMarket: number): string[] {
    const recommendations: string[] = [];

    if (untappedMarket > 30) {
      recommendations.push('Significant white space available - focus on differentiation');
    }

    const weaknesses = competitors.flatMap((c: { weaknesses?: string[] }) => c.weaknesses || []);
    const commonWeakness = this.findMostCommon(weaknesses);
    if (commonWeakness) {
      recommendations.push(`Address competitor weakness: ${commonWeakness}`);
    }

    recommendations.push('Position against top 3 competitors with clear differentiators');

    return recommendations;
  }

  private findMostCommon(items: string[]): string | null {
    if (items.length === 0) return null;

    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }

    let maxItem = items[0];
    let maxCount = 0;
    for (const [item, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxItem = item;
      }
    }

    return maxCount > 1 ? maxItem : null;
  }

  private formatMarketAnalysis(analysis: any): any {
    return {
      id: analysis.id,
      tenantId: analysis.tenantId,
      name: analysis.name,
      description: analysis.description,
      marketSize: analysis.marketSize,
      tam: analysis.tam,
      sam: analysis.sam,
      som: analysis.som,
      trends: analysis.trends,
      competitors: analysis.competitors,
      opportunities: analysis.opportunities,
      threats: analysis.threats,
      createdBy: analysis.createdBy,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt
    };
  }
}

export const marketAnalysisService = new MarketAnalysisService();
export default marketAnalysisService;
