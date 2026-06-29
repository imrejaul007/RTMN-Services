/**
 * LearningOS Tests
 */

import { describe, it, expect } from 'vitest';
import { learningOS } from '../learning-os';

describe('LearningOS', () => {
  it('should record learnings', () => {
    const learning = learningOS.recordLearning({
      companyId: 'company_test',
      industry: 'restaurant',
      type: 'success',
      category: 'marketing',
      title: 'Social media works',
      description: 'Posting daily increases footfall',
      outcome: '30% more customers',
      impact: 30,
    });
    expect(learning.id).toBeDefined();
    expect(learning.type).toBe('success');
  });

  it('should get insights', () => {
    const insights = learningOS.getInsights('restaurant');
    expect(Array.isArray(insights)).toBe(true);
  });

  it('should add best practices', () => {
    const practice = learningOS.addBestPractice({
      industry: 'restaurant',
      category: 'operations',
      title: 'Reduce food waste',
      description: 'Track waste daily',
      steps: ['Track', 'Analyze', 'Optimize'],
      expectedOutcome: '-20% waste',
      successRate: 85,
    });
    expect(practice.id).toBeDefined();
  });

  it('should add benchmarks', () => {
    const benchmark = learningOS.addBenchmark({
      industry: 'restaurant',
      metric: 'avg_order_value',
      value: 450,
      unit: 'INR',
      percentile25: 300,
      percentile50: 450,
      percentile75: 600,
      percentile90: 800,
      sampleSize: 1000,
      period: '2026-Q2',
    });
    expect(benchmark.id).toBeDefined();
  });

  it('should get recommendations', () => {
    learningOS.recordLearning({
      companyId: 'company_recs',
      industry: 'retail',
      type: 'success',
      category: 'sales',
      title: 'Test',
      description: 'Test',
      outcome: 'Good',
      impact: 10,
    });
    const recs = learningOS.getRecommendations('company_recs');
    expect(recs).toBeDefined();
  });
});
