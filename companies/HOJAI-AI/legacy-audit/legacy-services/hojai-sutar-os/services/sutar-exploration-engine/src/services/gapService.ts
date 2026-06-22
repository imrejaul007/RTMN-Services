// ============================================================================
// SUTAR Exploration Engine - Gap Analysis Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { GapAnalysis, MarketGap, GapQuery, GapType, GapSummary, GapRecommendation } from '../types/index.js';

export class GapService {
  private analyses: GapAnalysis[] = [];

  constructor() {
    this.initializeSampleData();
  }

  /**
   * Initialize sample gap analyses
   */
  private initializeSampleData(): void {
    const sampleAnalyses: GapAnalysis[] = [
      {
        id: uuidv4(),
        industry: 'SaaS',
        region: 'North America',
        timestamp: new Date().toISOString(),
        gaps: [
          {
            id: uuidv4(),
            type: 'pricing',
            name: 'Freemium to Enterprise Bridge',
            description: 'Lack of mid-tier pricing options between free and enterprise plans.',
            severity: 'high',
            size: 2500000000,
            competition: 2,
            entryDifficulty: 'moderate',
            relatedTrends: ['Pricing optimization', 'Value-based pricing'],
            metadata: {},
          },
          {
            id: uuidv4(),
            type: 'feature',
            name: 'Advanced Collaboration Features',
            description: 'Growing demand for real-time collaboration in B2B tools.',
            severity: 'critical',
            size: 5000000000,
            competition: 3,
            entryDifficulty: 'hard',
            relatedTrends: ['Remote work', 'Async collaboration'],
            metadata: {},
          },
          {
            id: uuidv4(),
            type: 'service',
            name: 'White-Glove Onboarding',
            description: 'Enterprise customers need dedicated onboarding support.',
            severity: 'high',
            size: 800000000,
            competition: 2,
            entryDifficulty: 'easy',
            relatedTrends: ['Customer success', 'Enterprise sales'],
            metadata: {},
          },
        ],
        summary: {
          totalGaps: 3,
          criticalGaps: 1,
          highGaps: 2,
          avgCompetition: 2.3,
          bestOpportunities: ['Advanced Collaboration Features', 'White-Glove Onboarding'],
        },
        recommendations: [
          {
            gapId: '',
            action: 'Develop tiered pricing with Professional plan at $99-199/month',
            priority: 'high',
            effort: 'medium',
            impact: 'high',
            estimatedCost: 150000,
            estimatedTime: '3 months',
          },
          {
            gapId: '',
            action: 'Build real-time collaboration module with presence and co-editing',
            priority: 'high',
            effort: 'high',
            impact: 'high',
            estimatedCost: 500000,
            estimatedTime: '6 months',
          },
          {
            gapId: '',
            action: 'Create dedicated customer success team for enterprise accounts',
            priority: 'medium',
            effort: 'medium',
            impact: 'medium',
            estimatedCost: 300000,
            estimatedTime: '2 months',
          },
        ],
        metadata: {},
      },
      {
        id: uuidv4(),
        industry: 'E-commerce',
        region: 'Global',
        timestamp: new Date().toISOString(),
        gaps: [
          {
            id: uuidv4(),
            type: 'technology',
            name: 'AR/VR Shopping Experience',
            description: 'Limited adoption of immersive technologies for product visualization.',
            severity: 'high',
            size: 12000000000,
            competition: 1,
            entryDifficulty: 'hard',
            relatedTrends: ['Immersive tech', 'Metaverse', 'Virtual try-on'],
            metadata: {},
          },
          {
            id: uuidv4(),
            type: 'service',
            name: 'Sustainable Shipping Options',
            description: 'Growing consumer demand for carbon-neutral delivery options.',
            severity: 'medium',
            size: 3000000000,
            competition: 2,
            entryDifficulty: 'moderate',
            relatedTrends: ['Sustainability', 'ESG', 'Green logistics'],
            metadata: {},
          },
          {
            id: uuidv4(),
            type: 'channel',
            name: 'Social Commerce Integration',
            description: 'Seamless shopping experience directly within social platforms.',
            severity: 'critical',
            size: 80000000000,
            competition: 4,
            entryDifficulty: 'moderate',
            relatedTrends: ['Social commerce', 'Influencer marketing', 'Live shopping'],
            metadata: {},
          },
        ],
        summary: {
          totalGaps: 3,
          criticalGaps: 1,
          highGaps: 2,
          avgCompetition: 2.3,
          bestOpportunities: ['Social Commerce Integration', 'AR/VR Shopping Experience'],
        },
        recommendations: [
          {
            gapId: '',
            action: 'Partner with social platforms for native checkout integration',
            priority: 'high',
            effort: 'high',
            impact: 'high',
            estimatedCost: 1000000,
            estimatedTime: '12 months',
          },
          {
            gapId: '',
            action: 'Pilot AR product visualization for home goods category',
            priority: 'medium',
            effort: 'high',
            impact: 'medium',
            estimatedCost: 400000,
            estimatedTime: '9 months',
          },
        ],
        metadata: {},
      },
    ];

    this.analyses = sampleAnalyses;
  }

  /**
   * Perform gap analysis for an industry
   */
  analyze(query: GapQuery): GapAnalysis {
    // Check if we have an existing analysis
    let analysis = this.analyses.find(
      a => a.industry.toLowerCase() === query.industry.toLowerCase() &&
        (!query.region || a.region?.toLowerCase() === query.region?.toLowerCase())
    );

    if (!analysis) {
      // Generate a new analysis
      analysis = this.generateAnalysis(query);
      this.analyses.push(analysis);
    }

    // Apply filters if specified
    let gaps = [...analysis.gaps];

    if (query.type) {
      gaps = gaps.filter(g => g.type === query.type);
    }

    if (query.minSeverity) {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const minLevel = severityOrder[query.minSeverity];
      gaps = gaps.filter(g => severityOrder[g.severity] >= minLevel);
    }

    // Recalculate summary
    const summary = this.calculateSummary(gaps);
    const recommendations = this.generateRecommendations(gaps);

    return {
      ...analysis,
      gaps,
      summary,
      recommendations,
    };
  }

  /**
   * Generate a new analysis
   */
  private generateAnalysis(query: GapQuery): GapAnalysis {
    const gaps: MarketGap[] = [
      {
        id: uuidv4(),
        type: 'product',
        name: 'Core Feature Gap',
        description: `Essential features missing in the ${query.industry} space.`,
        severity: 'high',
        size: Math.floor(Math.random() * 10000000000),
        competition: Math.floor(Math.random() * 5) + 1,
        entryDifficulty: 'moderate',
        relatedTrends: ['Digital transformation', 'Automation'],
        metadata: {},
      },
      {
        id: uuidv4(),
        type: 'service',
        name: 'Support Gap',
        description: `Customer support expectations not being met.`,
        severity: 'medium',
        size: Math.floor(Math.random() * 1000000000),
        competition: Math.floor(Math.random() * 3) + 1,
        entryDifficulty: 'easy',
        relatedTrends: ['Customer experience', 'Support automation'],
        metadata: {},
      },
      {
        id: uuidv4(),
        type: 'pricing',
        name: 'Price-Performance Gap',
        description: `Value delivered does not match price expectations.`,
        severity: 'high',
        size: Math.floor(Math.random() * 5000000000),
        competition: Math.floor(Math.random() * 4) + 1,
        entryDifficulty: 'moderate',
        relatedTrends: ['Value-based pricing', 'Cost optimization'],
        metadata: {},
      },
    ];

    return {
      id: uuidv4(),
      industry: query.industry,
      region: query.region,
      timestamp: new Date().toISOString(),
      gaps,
      summary: this.calculateSummary(gaps),
      recommendations: this.generateRecommendations(gaps),
      metadata: {},
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(gaps: MarketGap[]): GapSummary {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    return {
      totalGaps: gaps.length,
      criticalGaps: gaps.filter(g => g.severity === 'critical').length,
      highGaps: gaps.filter(g => g.severity === 'high').length,
      avgCompetition: gaps.reduce((sum, g) => sum + g.competition, 0) / gaps.length,
      bestOpportunities: gaps
        .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
        .slice(0, 3)
        .map(g => g.name),
    };
  }

  /**
   * Generate recommendations based on gaps
   */
  private generateRecommendations(gaps: MarketGap[]): GapRecommendation[] {
    const recommendations: GapRecommendation[] = [];

    for (const gap of gaps) {
      const rec: GapRecommendation = {
        gapId: gap.id,
        action: `Address ${gap.type} gap: ${gap.name}`,
        priority: gap.severity === 'critical' ? 'high' : gap.severity === 'high' ? 'high' : 'medium',
        effort: gap.entryDifficulty === 'easy' ? 'low' : gap.entryDifficulty === 'moderate' ? 'medium' : 'high',
        impact: gap.severity === 'critical' || gap.severity === 'high' ? 'high' : 'medium',
        estimatedCost: gap.size ? Math.floor(gap.size * 0.001) : undefined,
        estimatedTime: gap.entryDifficulty === 'easy' ? '1-2 months' :
          gap.entryDifficulty === 'moderate' ? '3-6 months' : '6-12 months',
      };
      recommendations.push(rec);
    }

    return recommendations;
  }

  /**
   * Get analysis by ID
   */
  get(id: string): GapAnalysis | undefined {
    return this.analyses.find(a => a.id === id);
  }

  /**
   * Get all analyses
   */
  list(): GapAnalysis[] {
    return this.analyses;
  }

  /**
   * Add a new gap to an analysis
   */
  addGap(analysisId: string, gap: Omit<MarketGap, 'id'>): MarketGap | undefined {
    const analysis = this.get(analysisId);
    if (!analysis) return undefined;

    const newGap: MarketGap = {
      ...gap,
      id: uuidv4(),
    };

    analysis.gaps.push(newGap);
    analysis.summary = this.calculateSummary(analysis.gaps);
    analysis.recommendations = this.generateRecommendations(analysis.gaps);
    analysis.timestamp = new Date().toISOString();

    return newGap;
  }

  /**
   * Get top opportunities across all analyses
   */
  getTopOpportunities(limit: number = 10): GapRecommendation[] {
    const allRecommendations: GapRecommendation[] = [];

    for (const analysis of this.analyses) {
      allRecommendations.push(...analysis.recommendations);
    }

    // Sort by priority and impact
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    return allRecommendations
      .sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return priorityOrder[b.impact] - priorityOrder[a.impact];
      })
      .slice(0, limit);
  }
}