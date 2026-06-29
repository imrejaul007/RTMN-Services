/**
 * LearningOS Service
 *
 * Collective intelligence for all companies.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IndustryInsight,
  BestPractice,
  Benchmark,
  CompanyKnowledge,
  Learning,
  IndustryKnowledgeGraph,
} from './types';

// ============================================
// In-Memory Stores
// ============================================

const insights = new Map<string, IndustryInsight>();
const practices = new Map<string, BestPractice>();
const benchmarks = new Map<string, Benchmark>();
const companyKnowledge = new Map<string, CompanyKnowledge>();
const learnings = new Map<string, Learning>();

// ============================================
// LearningOS Service
// ============================================

export class LearningOS {
  /**
   * Record a learning from a company
   */
  recordLearning(params: {
    companyId: string;
    industry: string;
    type: 'success' | 'failure' | 'experiment';
    category: string;
    title: string;
    description: string;
    outcome: string;
    impact: number;
  }): Learning {
    const learning: Learning = {
      id: `learn_${uuidv4().slice(0, 8)}`,
      companyId: params.companyId,
      type: params.type,
      category: params.category,
      title: params.title,
      description: params.description,
      outcome: params.outcome,
      impact: params.impact,
      applicableTo: [], // Calculated later
      createdAt: new Date().toISOString(),
    };

    learnings.set(learning.id, learning);

    // Update company knowledge
    this.updateCompanyKnowledge(params.companyId, params.industry, learning);

    // Generate insights if enough data
    if (learnings.size >= 10) {
      this.generateInsights(params.industry);
    }

    return learning;
  }

  /**
   * Get insights for an industry
   */
  getInsights(industry: string): IndustryInsight[] {
    return Array.from(insights.values())
      .filter(i => i.industry === industry)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get best practices for an industry
   */
  getBestPractices(industry: string): BestPractice[] {
    return Array.from(practices.values())
      .filter(p => p.industry === industry)
      .sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get benchmarks for an industry
   */
  getBenchmarks(industry: string): Benchmark[] {
    return Array.from(benchmarks.values())
      .filter(b => b.industry === industry);
  }

  /**
   * Get company's own learnings
   */
  getCompanyLearnings(companyId: string): Learning[] {
    return Array.from(learnings.values())
      .filter(l => l.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get recommendations for a company
   */
  getRecommendations(companyId: string): {
    insights: IndustryInsight[];
    practices: BestPractice[];
    benchmarks: Benchmark[];
  } {
    const knowledge = companyKnowledge.get(companyId);
    if (!knowledge) {
      return { insights: [], practices: [], benchmarks: [] };
    }

    return {
      insights: this.getInsights(knowledge.industry),
      practices: this.getBestPractices(knowledge.industry),
      benchmarks: this.getBenchmarks(knowledge.industry),
    };
  }

  /**
   * Update company knowledge base
   */
  private updateCompanyKnowledge(companyId: string, industry: string, learning: Learning): void {
    let knowledge = companyKnowledge.get(companyId);

    if (!knowledge) {
      knowledge = {
        companyId,
        industry,
        stage: 'startup',
        learnings: [],
        patterns: [],
        metrics: {},
      };
      companyKnowledge.set(companyId, knowledge);
    }

    knowledge.learnings.push(learning);
  }

  /**
   * Generate insights from learnings
   */
  private generateInsights(industry: string): void {
    const industryLearnings = Array.from(learnings.values())
      .filter(l => l.companyId.startsWith(industry));

    if (industryLearnings.length < 5) return;

    // Calculate category performance
    const categoryPerformance = new Map<string, { total: number; count: number }>();

    for (const learning of industryLearnings) {
      const current = categoryPerformance.get(learning.category) || { total: 0, count: 0 };
      current.total += learning.impact;
      current.count++;
      categoryPerformance.set(learning.category, current);
    }

    // Generate insights for top categories
    for (const [category, data] of categoryPerformance) {
      if (data.count >= 3) {
        const avgImpact = data.total / data.count;
        const insight: IndustryInsight = {
          id: `insight_${uuidv4().slice(0, 8)}`,
          industry,
          type: category as any,
          title: `${category} optimization opportunity`,
          description: avgImpact > 0
            ? `Companies in ${industry} see positive impact from ${category} improvements.`
            : `Companies in ${industry} should focus on ${category} challenges.`,
          impact: avgImpact > 0 ? 'high' : 'medium',
          confidence: Math.min(100, data.count * 10),
          dataPoints: data.count,
          anonymized: true,
          createdAt: new Date().toISOString(),
          sourceCompanies: [],
        };

        insights.set(insight.id, insight);
      }
    }
  }

  /**
   * Add a best practice
   */
  addBestPractice(practice: Omit<BestPractice, 'id' | 'companiesUsing' | 'createdAt'>): BestPractice {
    const bestPractice: BestPractice = {
      id: `practice_${uuidv4().slice(0, 8)}`,
      ...practice,
      companiesUsing: 0,
      createdAt: new Date().toISOString(),
    };

    practices.set(bestPractice.id, bestPractice);
    return bestPractice;
  }

  /**
   * Add a benchmark
   */
  addBenchmark(benchmark: Omit<Benchmark, 'id' | 'updatedAt'>): Benchmark {
    const newBenchmark: Benchmark = {
      id: `bench_${uuidv4().slice(0, 8)}`,
      ...benchmark,
      updatedAt: new Date().toISOString(),
    };

    benchmarks.set(newBenchmark.id, newBenchmark);
    return newBenchmark;
  }

  /**
   * Get knowledge graph for industry
   */
  getKnowledgeGraph(industry: string): IndustryKnowledgeGraph {
    const industryInsights = this.getInsights(industry);
    const industryBenchmarks = this.getBenchmarks(industry);

    return {
      industry,
      entities: [],
      relationships: [],
      insights: industryInsights.map(i => i.id),
      benchmarks: industryBenchmarks.map(b => b.id),
    };
  }

  /**
   * Seed sample data
   */
  seedSampleData(): void {
    // Restaurant insights
    this.addBestPractice({
      industry: 'restaurant',
      category: 'marketing',
      title: 'Social media presence increases footfall',
      description: 'Restaurants with active Instagram presence see 30% more footfall',
      steps: ['Post daily', 'Use hashtags', 'Respond to reviews'],
      expectedOutcome: '30% increase in footfall',
      successRate: 85,
    });

    // Benchmarks
    this.addBenchmark({
      industry: 'restaurant',
      metric: 'Average order value',
      value: 450,
      unit: 'INR',
      percentile25: 300,
      percentile50: 450,
      percentile75: 600,
      percentile90: 800,
      sampleSize: 1000,
      period: '2026-Q2',
    });

    this.addBenchmark({
      industry: 'restaurant',
      metric: 'Customer acquisition cost',
      value: 120,
      unit: 'INR',
      percentile25: 80,
      percentile50: 120,
      percentile75: 180,
      percentile90: 250,
      sampleSize: 1000,
      period: '2026-Q2',
    });
  }
}

export const learningOS = new LearningOS();