// ============================================================================
// SUTAR Network Learning - Anomaly Detection Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Anomaly,
  AnomalySeverity,
  AnomalyMetrics,
  LearningData
} from './types';

interface DistributionStats {
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  p95: number;
  p99: number;
}

interface AnomalyRule {
  id: string;
  name: string;
  condition: (data: LearningData) => boolean;
  severity: AnomalySeverity;
  description: string;
  threshold?: number;
}

class AnomalyDetectionService {
  private anomalies: Map<string, Anomaly> = new Map();
  private historicalData: LearningData[] = [];
  private baselines: Map<string, DistributionStats> = new Map();
  private rules: AnomalyRule[] = [];
  private rollingWindow: number = 100;

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules.push({
      id: 'consecutive-failures',
      name: 'Consecutive Failures',
      condition: (data) => {
        const recent = data.metadata?.recentOutcomes || [];
        return recent.slice(-5).filter((o: string) => o === 'failure').length >= 4;
      },
      severity: 'high',
      description: 'Detected 4+ consecutive failures in recent history'
    });

    this.rules.push({
      id: 'reward-spike',
      name: 'Reward Spike',
      condition: (data) => {
        return data.reward !== undefined && Math.abs(data.reward) > 100;
      },
      severity: 'medium',
      description: 'Unusually high or low reward value detected'
    });

    this.rules.push({
      id: 'rapid-frequency',
      name: 'Rapid Frequency',
      condition: (data) => {
        const now = new Date(data.timestamp).getTime();
        const recentSame = this.historicalData.filter(d =>
          d.action === data.action &&
          Math.abs(new Date(d.timestamp).getTime() - now) < 60000
        );
        return recentSame.length > 10;
      },
      severity: 'medium',
      description: 'High frequency of same action within short time period'
    });

    this.rules.push({
      id: 'context-drift',
      name: 'Context Drift',
      condition: (data) => {
        const sameAction = this.historicalData.filter(d => d.action === data.action);
        if (sameAction.length < 10) return false;

        const currentKeys = Object.keys(data.context).sort();
        const previousKeys = sameAction.slice(-10).flatMap(d => Object.keys(d.context)).filter((v, i, a) => a.indexOf(v) === i).sort();

        return JSON.stringify(currentKeys) !== JSON.stringify(previousKeys);
      },
      severity: 'low',
      description: 'Context structure changed for known action'
    });
  }

  // Analyze data point for anomalies
  analyzeDataPoint(data: LearningData): Anomaly[] {
    const anomalies: Anomaly[] = [];

    this.historicalData.push(data);

    const ruleAnomalies = this.checkRules(data);
    anomalies.push(...ruleAnomalies);

    const statisticalAnomalies = this.checkStatisticalAnomalies(data);
    anomalies.push(...statisticalAnomalies);

    const patternAnomalies = this.checkPatternAnomalies(data);
    anomalies.push(...patternAnomalies);

    anomalies.forEach(a => this.anomalies.set(a.id, a));

    return anomalies;
  }

  // Check against defined rules
  private checkRules(data: LearningData): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const rule of this.rules) {
      try {
        if (rule.condition(data)) {
          anomalies.push(this.createAnomaly(
            rule.name,
            rule.severity,
            rule.description,
            data
          ));
        }
      } catch (e) {
        // Rule evaluation failed, skip
      }
    }

    return anomalies;
  }

  // Check statistical anomalies
  private checkStatisticalAnomalies(data: LearningData): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (data.reward !== undefined) {
      const rewardAnomaly = this.checkRewardAnomaly(data);
      if (rewardAnomaly) anomalies.push(rewardAnomaly);
    }

    const successRateAnomaly = this.checkSuccessRateAnomaly(data);
    if (successRateAnomaly) anomalies.push(successRateAnomaly);

    return anomalies;
  }

  // Check reward-based anomaly
  private checkRewardAnomaly(data: LearningData): Anomaly | null {
    const stats = this.getBaselineStats('reward');
    if (!stats) return null;

    const zScore = Math.abs(data.reward! - stats.mean) / (stats.stdDev || 1);

    if (zScore > 3) {
      const severity = zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium';

      return this.createAnomalyWithMetrics(
        'Reward Anomaly',
        severity,
        `Reward value ${data.reward} is ${zScore.toFixed(1)} standard deviations from mean`,
        data,
        {
          expectedValue: stats.mean,
          actualValue: data.reward ?? 0,
          deviation: (data.reward ?? 0) - stats.mean,
          threshold: stats.mean + 3 * stats.stdDev,
          zScore
        }
      );
    }

    return null;
  }

  // Check success rate anomaly
  private checkSuccessRateAnomaly(data: LearningData): Anomaly | null {
    const recentData = this.historicalData.slice(-50);
    if (recentData.length < 10) return null;

    const recentSuccessRate = recentData.filter(d => d.outcome === 'success').length / recentData.length;

    const allSuccessRate = this.historicalData.length > 0
      ? this.historicalData.filter(d => d.outcome === 'success').length / this.historicalData.length
      : 0.5;

    const deviation = Math.abs(recentSuccessRate - allSuccessRate);

    if (deviation > 0.3) {
      const direction = recentSuccessRate < allSuccessRate ? 'decreased' : 'increased';

      return this.createAnomaly(
        'Success Rate Anomaly',
        deviation > 0.5 ? 'high' : 'medium',
        `Success rate has ${direction} significantly from ${(allSuccessRate * 100).toFixed(1)}% to ${(recentSuccessRate * 100).toFixed(1)}%`,
        data,
        {
          causes: [
            `Current: ${(recentSuccessRate * 100).toFixed(1)}%`,
            `Historical: ${(allSuccessRate * 100).toFixed(1)}%`,
            `Deviation: ${(deviation * 100).toFixed(1)}%`
          ],
          recommendations: [
            'Review recent changes in context or conditions',
            'Check for external factors affecting outcomes',
            'Consider rolling back recent strategy changes'
          ]
        }
      );
    }

    return null;
  }

  // Check pattern-based anomalies
  private checkPatternAnomalies(data: LearningData): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const sameAction = this.historicalData.filter(d => d.action === data.action);
    if (sameAction.length < 5) return anomalies;

    const outcomeDistribution = this.getOutcomeDistribution(sameAction);
    const expectedOutcome = this.getMostLikelyOutcome(outcomeDistribution);

    if (data.outcome !== expectedOutcome && sameAction.length > 20) {
      const severity = data.outcome === 'failure' && expectedOutcome === 'success' ? 'high' : 'medium';

      anomalies.push(this.createAnomaly(
        'Unexpected Outcome',
        severity,
        `Action "${data.action}" typically results in "${expectedOutcome}" but got "${data.outcome}"`,
        data,
        {
          causes: [
            `Expected: ${expectedOutcome}`,
            `Actual: ${data.outcome}`,
            `Confidence in pattern: ${(sameAction.length / this.historicalData.length * 100).toFixed(1)}%`
          ],
          recommendations: [
            'Investigate what changed in the context',
            'Check for environmental or external factors',
            'Update pattern confidence based on new data'
          ]
        }
      ));
    }

    return anomalies;
  }

  // Get outcome distribution
  private getOutcomeDistribution(data: LearningData[]): Record<string, number> {
    const distribution: Record<string, number> = { success: 0, failure: 0, neutral: 0 };

    data.forEach(d => {
      distribution[d.outcome] = (distribution[d.outcome] || 0) + 1;
    });

    return distribution;
  }

  // Get most likely outcome
  private getMostLikelyOutcome(distribution: Record<string, number>): string {
    let maxCount = 0;
    let likelyOutcome = 'neutral';

    Object.entries(distribution).forEach(([outcome, count]) => {
      if (count > maxCount) {
        maxCount = count;
        likelyOutcome = outcome;
      }
    });

    return likelyOutcome;
  }

  // Create basic anomaly
  private createAnomaly(
    type: string,
    severity: AnomalySeverity,
    description: string,
    data: LearningData,
    extra?: Partial<Anomaly>
  ): Anomaly {
    return {
      id: `anomaly-${uuidv4()}`,
      type,
      severity,
      description,
      detectedAt: new Date().toISOString(),
      metrics: {
        expectedValue: 0,
        actualValue: 0,
        deviation: 0,
        threshold: 0
      },
      causes: extra?.causes || ['Unknown cause'],
      recommendations: extra?.recommendations || ['Investigate further'],
      resolved: false,
      ...extra
    };
  }

  // Create anomaly with metrics
  private createAnomalyWithMetrics(
    type: string,
    severity: AnomalySeverity,
    description: string,
    data: LearningData,
    metrics: AnomalyMetrics
  ): Anomaly {
    return {
      id: `anomaly-${uuidv4()}`,
      type,
      severity,
      description,
      detectedAt: new Date().toISOString(),
      metrics,
      causes: this.investigateCauses(data, metrics),
      recommendations: this.generateRecommendations(severity, metrics),
      resolved: false
    };
  }

  // Investigate causes for anomaly
  private investigateCauses(data: LearningData, metrics: AnomalyMetrics): string[] {
    const causes: string[] = [];

    if (data.metadata?.recentChanges) {
      causes.push('Recent changes detected in system');
    }

    if (metrics.zScore !== undefined && metrics.zScore > 3) {
      causes.push(`Extreme value: ${metrics.zScore.toFixed(1)} sigma from mean`);
    }

    const contextKeys = Object.keys(data.context);
    if (contextKeys.length > 10) {
      causes.push('High context complexity may indicate unusual state');
    }

    causes.push('Potential external factor affecting outcome');

    return causes;
  }

  // Generate recommendations based on severity
  private generateRecommendations(severity: AnomalySeverity, metrics: AnomalyMetrics): string[] {
    const recommendations: string[] = [];

    switch (severity) {
      case 'critical':
        recommendations.push('IMMEDIATE ACTION REQUIRED');
        recommendations.push('Consider pausing automated processes');
        recommendations.push('Escalate to senior team member');
        break;
      case 'high':
        recommendations.push('Investigate root cause within 24 hours');
        recommendations.push('Review recent changes to system or context');
        recommendations.push('Consider temporary risk controls');
        break;
      case 'medium':
        recommendations.push('Monitor situation closely');
        recommendations.push('Gather additional data points');
        recommendations.push('Prepare contingency actions');
        break;
      case 'low':
        recommendations.push('Log for future analysis');
        recommendations.push('Monitor trend over time');
        break;
    }

    return recommendations;
  }

  // Get baseline statistics
  private getBaselineStats(metric: string): DistributionStats | null {
    const data = metric === 'reward'
      ? this.historicalData.map(d => d.reward || 0)
      : [];

    if (data.length < 10) return null;

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;

    return {
      mean,
      stdDev: Math.sqrt(variance),
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // Update baseline
  updateBaseline(metric: string, data: number[]): void {
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;

    this.baselines.set(metric, {
      mean,
      stdDev: Math.sqrt(variance),
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    });
  }

  // Resolve anomaly
  resolveAnomaly(anomalyId: string, resolution?: string): void {
    const anomaly = this.anomalies.get(anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      anomaly.resolvedAt = new Date().toISOString();
      if (resolution) {
        anomaly.recommendations.push(`Resolution: ${resolution}`);
      }
    }
  }

  // Get anomalies
  getAnomalies(filters?: {
    severity?: AnomalySeverity;
    resolved?: boolean;
    type?: string;
    from?: string;
    to?: string;
  }): Anomaly[] {
    let result = Array.from(this.anomalies.values());

    if (filters?.severity) {
      result = result.filter(a => a.severity === filters.severity);
    }
    if (filters?.resolved !== undefined) {
      result = result.filter(a => a.resolved === filters.resolved);
    }
    if (filters?.type) {
      result = result.filter(a => a.type === filters.type);
    }
    if (filters?.from) {
      result = result.filter(a => a.detectedAt >= filters.from!);
    }
    if (filters?.to) {
      result = result.filter(a => a.detectedAt <= filters.to!);
    }

    return result.sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));
  }

  // Get unresolved anomalies count
  getUnresolvedCount(): Record<AnomalySeverity, number> {
    const counts: Record<AnomalySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.anomalies.forEach(a => {
      if (!a.resolved) {
        counts[a.severity]++;
      }
    });

    return counts;
  }

  // Add custom rule
  addRule(rule: Omit<AnomalyRule, 'id'>): void {
    this.rules.push({
      ...rule,
      id: `rule-${uuidv4()}`
    });
  }

  // Remove rule
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  // Get rules
  getRules(): AnomalyRule[] {
    return [...this.rules];
  }

  // Get statistics
  getStatistics(): {
    totalAnomalies: number;
    resolvedAnomalies: number;
    unresolvedAnomalies: number;
    bySeverity: Record<AnomalySeverity, number>;
    avgResolutionTime: number;
    detectionRate: number;
  } {
    const allAnomalies = Array.from(this.anomalies.values());
    const resolved = allAnomalies.filter(a => a.resolved);

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    resolved.forEach(a => {
      if (a.resolvedAt) {
        totalResolutionTime += new Date(a.resolvedAt).getTime() - new Date(a.detectedAt).getTime();
        resolvedCount++;
      }
    });

    const bySeverity: Record<AnomalySeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    allAnomalies.forEach(a => bySeverity[a.severity]++);

    return {
      totalAnomalies: allAnomalies.length,
      resolvedAnomalies: resolved.length,
      unresolvedAnomalies: allAnomalies.length - resolved.length,
      bySeverity,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount / 1000 : 0,
      detectionRate: this.historicalData.length > 0 ? allAnomalies.length / this.historicalData.length : 0
    };
  }

  // Clear all data
  clearData(): void {
    this.anomalies.clear();
    this.historicalData = [];
    this.baselines.clear();
  }

  // Export anomaly data
  exportAnomalies(): Anomaly[] {
    return Array.from(this.anomalies.values());
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
export default anomalyDetectionService;
