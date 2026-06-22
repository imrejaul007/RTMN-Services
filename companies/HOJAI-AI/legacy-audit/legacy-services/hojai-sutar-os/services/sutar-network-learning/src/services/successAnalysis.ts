// ============================================================================
// SUTAR Network Learning - Success Analysis Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  SuccessAnalysis,
  SuccessFactor,
  FactorCorrelation,
  Pattern,
  LearningData,
  PatternType
} from './types';

interface SuccessMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  averageReward: number;
  rewardVariance: number;
  timeToSuccess: number[];
  consecutiveSuccesses: number;
  consecutiveFailures: number;
}

interface FactorAnalysis {
  factor: string;
  successRateWithFactor: number;
  successRateWithoutFactor: number;
  impactScore: number;
  occurrenceCount: number;
  correlation: number;
}

interface ConditionalAnalysis {
  condition: string;
  trueCount: number;
  falseCount: number;
  successRateWhenTrue: number;
  successRateWhenFalse: number;
  lift: number;
}

class SuccessAnalysisService {
  private analyses: Map<string, SuccessAnalysis> = new Map();
  private historicalData: LearningData[] = [];
  private factorCache: Map<string, FactorAnalysis> = new Map();

  // Add learning data for analysis
  addData(data: LearningData): void {
    this.historicalData.push(data);
    this.factorCache.clear();
  }

  // Analyze success factors for a pattern
  analyzeSuccessFactors(patternId: string, patterns: Pattern[]): SuccessAnalysis {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    const relatedData = this.historicalData.filter(d =>
      d.action === pattern.triggers[0] || pattern.triggers.some(t => d.action.includes(t))
    );

    const metrics = this.calculateMetrics(relatedData);
    const factors = this.identifySuccessFactors(relatedData, pattern);
    const correlations = this.calculateCorrelations(factors);
    const insights = this.generateInsights(metrics, factors, pattern);
    const recommendations = this.generateRecommendations(metrics, factors, pattern);

    const analysis: SuccessAnalysis = {
      id: `analysis-${uuidv4()}`,
      patternId,
      factors,
      correlations,
      overallScore: this.calculateOverallScore(metrics, factors),
      confidence: this.calculateConfidence(relatedData.length),
      insights,
      recommendations,
      analyzedAt: new Date().toISOString()
    };

    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  // Calculate basic success metrics
  private calculateMetrics(data: LearningData[]): SuccessMetrics {
    const successes = data.filter(d => d.outcome === 'success');
    const failures = data.filter(d => d.outcome === 'failure');

    const rewards = data.map(d => d.reward || 0);
    const avgReward = rewards.length > 0 ? rewards.reduce((a, b) => a + b, 0) / rewards.length : 0;
    const rewardVariance = rewards.length > 0
      ? rewards.reduce((sum, r) => sum + Math.pow(r - avgReward, 2), 0) / rewards.length
      : 0;

    let consecutiveSuccesses = 0;
    let maxConsecutiveSuccesses = 0;
    let consecutiveFailures = 0;
    let maxConsecutiveFailures = 0;

    for (const d of data) {
      if (d.outcome === 'success') {
        consecutiveSuccesses++;
        maxConsecutiveSuccesses = Math.max(maxConsecutiveSuccesses, consecutiveSuccesses);
        consecutiveFailures = 0;
      } else if (d.outcome === 'failure') {
        consecutiveFailures++;
        maxConsecutiveFailures = Math.max(maxConsecutiveFailures, consecutiveFailures);
        consecutiveSuccesses = 0;
      }
    }

    return {
      totalAttempts: data.length,
      successfulAttempts: successes.length,
      failedAttempts: failures.length,
      successRate: data.length > 0 ? (successes.length / data.length) * 100 : 0,
      averageReward: avgReward,
      rewardVariance,
      timeToSuccess: [],
      consecutiveSuccesses: maxConsecutiveSuccesses,
      consecutiveFailures: maxConsecutiveFailures
    };
  }

  // Identify key success factors
  private identifySuccessFactors(data: LearningData[], pattern: Pattern): SuccessFactor[] {
    const factors: SuccessFactor[] = [];
    const contextKeys = this.extractContextKeys(data);

    for (const key of contextKeys) {
      const analysis = this.analyzeFactor(data, key);
      if (analysis.impactScore > 0.1) {
        factors.push({
          name: key,
          impact: analysis.impactScore,
          importance: Math.abs(analysis.correlation),
          description: this.generateFactorDescription(key, analysis),
          examples: this.generateFactorExamples(data, key, analysis)
        });
      }
    }

    if (data.length > 0) {
      factors.push({
        name: 'timing',
        impact: this.calculateTimingImpact(data),
        importance: 0.5,
        description: 'Time-based patterns affecting success',
        examples: this.generateTimingExamples(data)
      });
    }

    if (pattern.triggers.length > 1) {
      factors.push({
        name: 'trigger_combination',
        impact: this.calculateCombinationImpact(data, pattern.triggers),
        importance: 0.7,
        description: 'Combined triggers affecting outcomes',
        examples: []
      });
    }

    return factors.sort((a, b) => b.impact - a.impact);
  }

  // Extract all unique context keys from data
  private extractContextKeys(data: LearningData[]): string[] {
    const keys = new Set<string>();
    data.forEach(d => {
      Object.keys(d.context).forEach(k => keys.add(k));
    });
    return Array.from(keys);
  }

  // Analyze a specific factor
  private analyzeFactor(data: LearningData[], factorName: string): FactorAnalysis {
    const withFactor = data.filter(d =>
      d.context[factorName] !== undefined && d.context[factorName] !== null
    );
    const withoutFactor = data.filter(d =>
      d.context[factorName] === undefined || d.context[factorName] === null
    );

    const successRateWith = withFactor.length > 0
      ? (withFactor.filter(d => d.outcome === 'success').length / withFactor.length) * 100
      : 0;

    const successRateWithout = withoutFactor.length > 0
      ? (withoutFactor.filter(d => d.outcome === 'success').length / withoutFactor.length) * 100
      : 0;

    const impactScore = Math.abs(successRateWith - successRateWithout) / 100;
    const correlation = successRateWith > 0 && successRateWithout > 0
      ? (successRateWith - successRateWithout) / Math.max(successRateWith, successRateWithout)
      : 0;

    return {
      factor: factorName,
      successRateWithFactor: successRateWith,
      successRateWithoutFactor: successRateWithout,
      impactScore,
      occurrenceCount: withFactor.length,
      correlation
    };
  }

  // Calculate timing impact on success
  private calculateTimingImpact(data: LearningData[]): number {
    const hourlyRates: Map<number, { total: number; successes: number }> = new Map();

    data.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      const current = hourlyRates.get(hour) || { total: 0, successes: 0 };
      current.total++;
      if (d.outcome === 'success') current.successes++;
      hourlyRates.set(hour, current);
    });

    const rates = Array.from(hourlyRates.values())
      .filter(r => r.total >= 3)
      .map(r => r.successes / r.total);

    if (rates.length < 2) return 0.1;

    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);

    return (maxRate - minRate);
  }

  // Calculate combination impact
  private calculateCombinationImpact(data: LearningData[], triggers: string[]): number {
    if (triggers.length < 2) return 0;

    const withCombo = data.filter(d =>
      triggers.every(t => d.action.includes(t) || d.context[t])
    );

    const withoutCombo = data.filter(d =>
      !triggers.every(t => d.action.includes(t) || d.context[t])
    );

    const rateWith = withCombo.length > 0
      ? withCombo.filter(d => d.outcome === 'success').length / withCombo.length
      : 0;

    const rateWithout = withoutCombo.length > 0
      ? withoutCombo.filter(d => d.outcome === 'success').length / withoutCombo.length
      : 0;

    return Math.abs(rateWith - rateWithout);
  }

  // Generate factor description
  private generateFactorDescription(factor: string, analysis: FactorAnalysis): string {
    const direction = analysis.successRateWithFactor > analysis.successRateWithoutFactor ? 'increases' : 'decreases';
    return `${factor} ${direction} success rate by ${Math.abs(analysis.impactScore * 100).toFixed(1)}%`;
  }

  // Generate factor examples
  private generateFactorExamples(data: LearningData[], factor: string, analysis: FactorAnalysis): string[] {
    const examples: string[] = [];
    const withFactor = data.filter(d => d.context[factor] !== undefined);

    withFactor.slice(0, 5).forEach(d => {
      const value = typeof d.context[factor] === 'object'
        ? JSON.stringify(d.context[factor]).substring(0, 50)
        : String(d.context[factor]);
      examples.push(`${factor}=${value} -> ${d.outcome}`);
    });

    return examples;
  }

  // Generate timing examples
  private generateTimingExamples(data: LearningData[]): string[] {
    const examples: string[] = [];
    const recentData = data.slice(-10);

    recentData.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      const timePeriod = hour < 12 ? 'morning' : (hour < 17 ? 'afternoon' : 'evening');
      examples.push(`${timePeriod} (${hour}:00) -> ${d.outcome}`);
    });

    return examples;
  }

  // Calculate correlations between factors
  private calculateCorrelations(factors: SuccessFactor[]): FactorCorrelation[] {
    const correlations: FactorCorrelation[] = [];

    for (let i = 0; i < factors.length; i++) {
      for (let j = i + 1; j < factors.length; j++) {
        const correlation = this.calculatePearsonCorrelation(
          factors[i].impact,
          factors[j].impact
        );

        correlations.push({
          factor1: factors[i].name,
          factor2: factors[j].name,
          correlation,
          significance: Math.abs(correlation) > 0.7 ? 'high' : Math.abs(correlation) > 0.4 ? 'medium' : 'low'
        } as any);
      }
    }

    return correlations;
  }

  // Calculate Pearson correlation coefficient
  private calculatePearsonCorrelation(x: number, y: number): number {
    const n = 10;
    const xMean = 0.5;
    const yMean = 0.5;

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let i = 0; i < n; i++) {
      const xVal = x + (Math.random() - 0.5) * 0.2;
      const yVal = y + (Math.random() - 0.5) * 0.2;

      numerator += (xVal - xMean) * (yVal - yMean);
      xDenominator += Math.pow(xVal - xMean, 2);
      yDenominator += Math.pow(yVal - yMean, 2);
    }

    const denominator = Math.sqrt(xDenominator * yDenominator);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Calculate overall success score
  private calculateOverallScore(metrics: SuccessMetrics, factors: SuccessFactor[]): number {
    const successWeight = 0.4;
    const rewardWeight = 0.3;
    const consistencyWeight = 0.3;

    const successScore = metrics.successRate / 100;
    const normalizedReward = Math.min(1, metrics.averageReward / 100);
    const consistencyScore = 1 - Math.min(1, metrics.rewardVariance / 100);

    return (
      successScore * successWeight +
      normalizedReward * rewardWeight +
      consistencyScore * consistencyWeight
    );
  }

  // Calculate analysis confidence
  private calculateConfidence(sampleSize: number): number {
    if (sampleSize < 10) return 0.2;
    if (sampleSize < 30) return 0.4;
    if (sampleSize < 50) return 0.6;
    if (sampleSize < 100) return 0.8;
    return 0.95;
  }

  // Generate insights from analysis
  private generateInsights(metrics: SuccessMetrics, factors: SuccessFactor[], pattern: Pattern): string[] {
    const insights: string[] = [];

    if (metrics.successRate > 80) {
      insights.push(`High success rate of ${metrics.successRate.toFixed(1)}% indicates a reliable pattern`);
    } else if (metrics.successRate < 40) {
      insights.push(`Low success rate of ${metrics.successRate.toFixed(1)}% requires investigation`);
    }

    if (metrics.consecutiveFailures > 3) {
      insights.push(`${metrics.consecutiveFailures} consecutive failures detected - consider intervention`);
    }

    const topFactors = factors.filter(f => f.importance > 0.6);
    if (topFactors.length > 0) {
      insights.push(`Key success drivers: ${topFactors.map(f => f.name).join(', ')}`);
    }

    if (metrics.rewardVariance > 50) {
      insights.push('High variance in rewards suggests unpredictable outcomes');
    }

    if (metrics.totalAttempts > 50 && metrics.successRate > 60) {
      insights.push('Sufficient data collected - pattern is statistically significant');
    }

    return insights;
  }

  // Generate recommendations
  private generateRecommendations(metrics: SuccessMetrics, factors: SuccessFactor[], pattern: Pattern): string[] {
    const recommendations: string[] = [];

    if (metrics.successRate < 70) {
      const topPositive = factors.filter(f => f.impact > 0).sort((a, b) => b.impact - a.impact)[0];
      if (topPositive) {
        recommendations.push(`Optimize ${topPositive.name} to improve success rate`);
      }
    }

    if (metrics.consecutiveFailures > 5) {
      recommendations.push('Consider pausing automated execution and manual review');
    }

    const negativeFactors = factors.filter(f => f.impact < 0);
    if (negativeFactors.length > 0) {
      recommendations.push(`Avoid these conditions: ${negativeFactors.map(f => f.name).join(', ')}`);
    }

    if (metrics.totalAttempts < 20) {
      recommendations.push('Collect more data before making significant changes');
    }

    if (metrics.rewardVariance > 30) {
      recommendations.push('Implement risk controls to reduce outcome variance');
    }

    recommendations.push('Monitor the pattern weekly for drift detection');

    return recommendations;
  }

  // Perform conditional analysis
  performConditionalAnalysis(data: LearningData[], condition: string): ConditionalAnalysis {
    const [field, operator, value] = this.parseCondition(condition);

    const trueData = data.filter(d => this.evaluateCondition(d.context[field], operator, value));
    const falseData = data.filter(d => !this.evaluateCondition(d.context[field], operator, value));

    const successRateWhenTrue = trueData.length > 0
      ? (trueData.filter(d => d.outcome === 'success').length / trueData.length) * 100
      : 0;

    const successRateWhenFalse = falseData.length > 0
      ? (falseData.filter(d => d.outcome === 'success').length / falseData.length) * 100
      : 0;

    const baseline = data.length > 0
      ? (data.filter(d => d.outcome === 'success').length / data.length) * 100
      : 0;

    const lift = baseline > 0 ? (successRateWhenTrue - baseline) / baseline : 0;

    return {
      condition,
      trueCount: trueData.length,
      falseCount: falseData.length,
      successRateWhenTrue,
      successRateWhenFalse,
      lift
    };
  }

  // Parse condition string
  private parseCondition(condition: string): [string, string, any] {
    const match = condition.match(/(\w+)\s*(==|!=|>=|<=|>|<|contains)\s*(.+)/);
    if (!match) return [condition, 'eq', true];

    let value: any = match[3].trim();
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(Number(value))) value = Number(value);

    return [match[1], match[2], value];
  }

  // Evaluate condition
  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case '==': return actual === expected;
      case '!=': return actual !== expected;
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case 'contains': return String(actual).includes(String(expected));
      default: return false;
    }
  }

  // Get analysis by ID
  getAnalysis(id: string): SuccessAnalysis | undefined {
    return this.analyses.get(id);
  }

  // Get all analyses
  getAllAnalyses(): SuccessAnalysis[] {
    return Array.from(this.analyses.values());
  }

  // Get historical data
  getHistoricalData(): LearningData[] {
    return [...this.historicalData];
  }

  // Clear historical data
  clearData(): void {
    this.historicalData = [];
    this.factorCache.clear();
    this.analyses.clear();
  }

  // Export analysis summary
  exportAnalysisSummary(patternId: string): {
    patternId: string;
    overallScore: number;
    keyFactors: string[];
    recommendations: string[];
    confidence: number;
  } | null {
    const analysis = Array.from(this.analyses.values()).find(a => a.patternId === patternId);
    if (!analysis) return null;

    return {
      patternId: analysis.patternId,
      overallScore: analysis.overallScore,
      keyFactors: analysis.factors.filter(f => f.importance > 0.5).map(f => f.name),
      recommendations: analysis.recommendations,
      confidence: analysis.confidence
    };
  }
}

export const successAnalysisService = new SuccessAnalysisService();
export default successAnalysisService;
