// ============================================================================
// SUTAR Exploration Engine - Trend Analysis Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { Trend, TrendQuery, TrendProjection } from '../types/index.js';

export class TrendService {
  private trends: Trend[] = [];

  constructor() {
    this.initializeSampleData();
  }

  /**
   * Initialize sample trends
   */
  private initializeSampleData(): void {
    const sampleTrends: Trend[] = [
      {
        id: uuidv4(),
        name: 'Generative AI Adoption',
        description: 'Rapid adoption of generative AI across industries for content creation, coding, and decision support.',
        category: 'Technology',
        direction: 'upward',
        velocity: 85,
        strength: 92,
        volume: 150000,
        sentiment: 78,
        startDate: '2023-01-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(85, 'upward'),
        relatedOpportunities: ['AI platforms', 'AI consulting', 'AI training'],
        sources: ['Industry reports', 'News analysis', 'Social media'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Remote Work Normalization',
        description: 'Hybrid and fully remote work models becoming permanent fixtures in knowledge work.',
        category: 'Workplace',
        direction: 'stable',
        velocity: 15,
        strength: 75,
        volume: 85000,
        sentiment: 65,
        startDate: '2020-03-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(15, 'stable'),
        relatedOpportunities: ['Collaboration tools', 'Remote HR services', 'Virtual team building'],
        sources: ['HR surveys', 'Office data', 'Job postings'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Sustainability Focus',
        description: 'Growing consumer and investor pressure for sustainable business practices and eco-friendly products.',
        category: 'Environmental',
        direction: 'upward',
        velocity: 72,
        strength: 88,
        volume: 120000,
        sentiment: 82,
        startDate: '2021-01-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(72, 'upward'),
        relatedOpportunities: ['Green products', 'Carbon tracking', 'Sustainable supply chain'],
        sources: ['ESG reports', 'Consumer surveys', 'Policy changes'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Digital Health Acceleration',
        description: 'Telemedicine, health apps, and digital health platforms seeing sustained growth post-pandemic.',
        category: 'Healthcare',
        direction: 'upward',
        velocity: 68,
        strength: 82,
        volume: 95000,
        sentiment: 75,
        startDate: '2020-03-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(68, 'upward'),
        relatedOpportunities: ['Telemedicine', 'Health tracking', 'Mental health apps'],
        sources: ['Healthcare reports', 'App stores', 'Medical journals'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'E-commerce Saturation',
        description: 'Online retail growth rate slowing as market reaches maturity in developed markets.',
        category: 'Retail',
        direction: 'stable',
        velocity: 25,
        strength: 65,
        volume: 200000,
        sentiment: 45,
        startDate: '2019-01-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(25, 'stable'),
        relatedOpportunities: ['Niche e-commerce', 'Social commerce', 'Commerce infrastructure'],
        sources: ['Retail reports', 'Payment data', 'Market research'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Cybersecurity Investment',
        description: 'Increasing cybersecurity spending driven by ransomware attacks and regulatory requirements.',
        category: 'Security',
        direction: 'upward',
        velocity: 78,
        strength: 90,
        volume: 75000,
        sentiment: 60,
        startDate: '2020-01-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(78, 'upward'),
        relatedOpportunities: ['Security tools', 'Managed security', 'Security training'],
        sources: ['Security reports', ' breach data', 'Budget surveys'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Low-Code/No-Code Adoption',
        description: 'Business users increasingly using low-code platforms to build applications without coding.',
        category: 'Technology',
        direction: 'upward',
        velocity: 65,
        strength: 78,
        volume: 60000,
        sentiment: 72,
        startDate: '2021-01-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(65, 'upward'),
        relatedOpportunities: ['Low-code platforms', 'Citizen development', 'Process automation'],
        sources: ['Analyst reports', 'User surveys', 'Platform data'],
        metadata: {},
      },
      {
        id: uuidv4(),
        name: 'Blockchain Maturation',
        description: 'Blockchain technology moving from speculation to practical enterprise applications.',
        category: 'Technology',
        direction: 'stable',
        velocity: 35,
        strength: 55,
        volume: 45000,
        sentiment: 50,
        startDate: '2017-01-01',
        endDate: '2026-12-31',
        projections: this.generateProjections(35, 'stable'),
        relatedOpportunities: ['Supply chain', 'Digital identity', 'Tokenization'],
        sources: ['Crypto news', 'Enterprise reports', 'Startup data'],
        metadata: {},
      },
    ];

    this.trends = sampleTrends;
  }

  /**
   * Generate projections for a trend
   */
  private generateProjections(baseValue: number, direction: Trend['direction']): TrendProjection[] {
    const periods = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];
    const projections: TrendProjection[] = [];

    let currentValue = baseValue;
    for (const period of periods) {
      const variance = (Math.random() * 10) - 5;
      const predicted = direction === 'upward'
        ? currentValue + Math.abs(variance) + 2
        : direction === 'downward'
          ? currentValue - Math.abs(variance) - 2
          : currentValue + (variance * 0.5);

      projections.push({
        period,
        predicted: Math.max(0, Math.min(100, Math.round(predicted * 100) / 100)),
        confidence: 70 + Math.random() * 25,
        range: {
          min: Math.max(0, predicted - 10),
          max: Math.min(100, predicted + 10),
        },
      });

      currentValue = predicted;
    }

    return projections;
  }

  /**
   * List trends with optional filters
   */
  list(query: TrendQuery): { trends: Trend[]; total: number } {
    let filtered = [...this.trends];

    // Apply filters
    if (query.category) {
      filtered = filtered.filter(t => t.category.toLowerCase().includes(query.category!.toLowerCase()));
    }

    if (query.direction) {
      filtered = filtered.filter(t => t.direction === query.direction);
    }

    if (query.minStrength !== undefined) {
      filtered = filtered.filter(t => t.strength >= query.minStrength!);
    }

    // Sort by strength (most relevant first)
    filtered.sort((a, b) => b.strength - a.strength);

    const total = filtered.length;

    // Apply limit
    const limit = query.limit || 20;
    filtered = filtered.slice(0, limit);

    return { trends: filtered, total };
  }

  /**
   * Get trend by ID
   */
  get(id: string): Trend | undefined {
    return this.trends.find(t => t.id === id);
  }

  /**
   * Get trending topics
   */
  getTrending(limit: number = 10): Trend[] {
    return [...this.trends]
      .filter(t => t.direction === 'upward')
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, limit);
  }

  /**
   * Get emerging trends (high velocity, recent start)
   */
  getEmerging(limit: number = 5): Trend[] {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return [...this.trends]
      .filter(t => new Date(t.startDate) > sixMonthsAgo && t.velocity > 50)
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, limit);
  }

  /**
   * Create a new trend
   */
  create(trend: Omit<Trend, 'id'>): Trend {
    const newTrend: Trend = {
      ...trend,
      id: uuidv4(),
    };

    this.trends.unshift(newTrend);
    return newTrend;
  }

  /**
   * Update trend analysis
   */
  updateAnalysis(id: string, updates: Partial<Trend>): Trend | undefined {
    const index = this.trends.findIndex(t => t.id === id);
    if (index === -1) return undefined;

    this.trends[index] = {
      ...this.trends[index],
      ...updates,
      id,
    };

    return this.trends[index];
  }

  /**
   * Get trend summary statistics
   */
  getSummary(): {
    total: number;
    upward: number;
    downward: number;
    stable: number;
    avgStrength: number;
    avgVelocity: number;
  } {
    const upward = this.trends.filter(t => t.direction === 'upward').length;
    const downward = this.trends.filter(t => t.direction === 'downward').length;
    const stable = this.trends.filter(t => t.direction === 'stable').length;

    return {
      total: this.trends.length,
      upward,
      downward,
      stable,
      avgStrength: this.trends.reduce((sum, t) => sum + t.strength, 0) / this.trends.length,
      avgVelocity: this.trends.reduce((sum, t) => sum + t.velocity, 0) / this.trends.length,
    };
  }
}