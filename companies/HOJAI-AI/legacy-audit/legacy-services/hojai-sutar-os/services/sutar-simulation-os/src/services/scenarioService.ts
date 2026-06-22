// ============================================================================
// SUTAR SimulationOS - Scenario Service (What-If Analysis)
// ============================================================================

import type {
  SimulationResult,
  Scenario,
  WhatIfAnalysis,
  WhatIfVariation,
  ImpactSummary,
  Recommendation,
  ScenarioComparison,
  ComparisonMetrics,
  ScenarioRanking,
  ComparisonInsight,
  MetricComparison,
  SimulationType,
} from '../types/index.js';

// ============================================================================
// Scenario Service
// ============================================================================

export class ScenarioService {
  private simulations: Map<string, SimulationResult> = new Map();

  /**
   * Store a simulation result
   */
  store(simulation: SimulationResult): void {
    this.simulations.set(simulation.id, simulation);
  }

  /**
   * Get a simulation by ID
   */
  get(id: string): SimulationResult | undefined {
    return this.simulations.get(id);
  }

  /**
   * List all simulations with optional filters
   */
  list(filters?: {
    type?: SimulationType;
    status?: string;
    limit?: number;
    offset?: number;
  }): SimulationResult[] {
    let results = Array.from(this.simulations.values());

    if (filters?.type) {
      results = results.filter((s) => s.type === filters.type);
    }

    if (filters?.status) {
      results = results.filter((s) => s.status === filters.status);
    }

    // Sort by creation date descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get total count
   */
  count(filters?: { type?: SimulationType; status?: string }): number {
    return this.list({ ...filters, limit: 10000 }).length;
  }

  /**
   * Perform What-If analysis on a simulation
   */
  whatIfAnalysis(simulationId: string, variations: Array<{
    name: string;
    parameterChanges: Record<string, number>;
  }>): WhatIfAnalysis | null {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) return null;

    const baseline = simulation.bestScenario || simulation.scenarios[0];
    if (!baseline) return null;

    const whatIfVariations: WhatIfVariation[] = variations.map((variation) => {
      const parameterChanges: Record<string, { from: number; to: number }> = {};
      const modifiedParams = { ...baseline.parameters };

      for (const [param, newValue] of Object.entries(variation.parameterChanges)) {
        const paramVal = baseline.parameters[param];
        const oldValue = typeof paramVal === 'number' ? paramVal : parseFloat(String(paramVal)) || 0;
        parameterChanges[param] = { from: oldValue, to: newValue };
        modifiedParams[param] = newValue;
      }

      // Calculate projected outcome based on parameter changes
      const projectedOutcome = this.calculateProjectedOutcome(
        baseline.outcomes,
        parameterChanges,
        simulation.type
      );

      const delta = this.calculateDelta(baseline.outcomes, projectedOutcome);
      const impactScore = this.calculateImpactScore(delta);

      return {
        name: variation.name,
        description: `Parameter changes: ${Object.entries(parameterChanges)
          .map(([k, v]) => `${k}: ${v.from} → ${v.to}`)
          .join(', ')}`,
        parameterChanges,
        projectedOutcome,
        delta,
        impactScore,
      };
    });

    const impactSummary = this.calculateImpactSummary(baseline.outcomes, whatIfVariations);
    const recommendations = this.generateRecommendations(whatIfVariations, impactSummary);

    return {
      id: `whatif-${Date.now()}`,
      baseline,
      variations: whatIfVariations,
      impactSummary,
      recommendations,
    };
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(simulationIds: string[], weights?: Record<string, number>): ScenarioComparison | null {
    const simulations = simulationIds
      .map((id) => this.simulations.get(id))
      .filter((s): s is SimulationResult => s !== undefined);

    if (simulations.length < 2) return null;

    const allScenarios: Scenario[] = simulations.flatMap((s) => s.scenarios);
    const metrics = this.calculateComparisonMetrics(allScenarios, weights);
    const rankings = this.calculateRankings(allScenarios, metrics);
    const insights = this.generateInsights(simulations, metrics);
    const winner = rankings[0]?.scenarioId || '';

    return {
      id: `compare-${Date.now()}`,
      scenarios: simulations,
      metrics,
      rankings,
      insights,
      winner,
    };
  }

  /**
   * Calculate projected outcome based on parameter changes
   */
  private calculateProjectedOutcome(
    baseline: Scenario['outcomes'],
    changes: Record<string, { from: number; to: number }>,
    _type: SimulationType
  ): Scenario['outcomes'] {
    const projected = { ...baseline };

    // Apply proportional changes to revenue/cost/profit
    let revenueMultiplier = 1;
    let costMultiplier = 1;

    for (const [, change] of Object.entries(changes)) {
      const ratio = change.to / (change.from || 1);
      if (change.from !== 0) {
        if (change.to > change.from) {
          revenueMultiplier *= 1 + (ratio - 1) * 0.8;
        } else {
          costMultiplier *= 1 + (1 - ratio) * 0.5;
        }
      }
    }

    projected.revenue = baseline.revenue * revenueMultiplier;
    projected.cost = baseline.cost * costMultiplier;
    projected.profit = projected.revenue - projected.cost;
    projected.margin = (projected.profit / projected.revenue) * 100;

    // Recalculate risk based on changes
    const changeMagnitude = Object.values(changes).reduce(
      (sum, c) => sum + Math.abs(c.to - c.from) / (c.from || 1),
      0
    );
    projected.riskScore = baseline.riskScore + changeMagnitude * 5;

    return projected;
  }

  /**
   * Calculate delta between baseline and projected
   */
  private calculateDelta(
    baseline: Scenario['outcomes'],
    projected: Scenario['outcomes']
  ): Scenario['outcomes'] {
    return {
      revenue: projected.revenue - baseline.revenue,
      cost: projected.cost - baseline.cost,
      profit: projected.profit - baseline.profit,
      margin: projected.margin - baseline.margin,
      riskScore: projected.riskScore - baseline.riskScore,
      metrics: {},
    };
  }

  /**
   * Calculate impact score for a variation
   */
  private calculateImpactScore(delta: Scenario['outcomes']): number {
    const profitWeight = 0.4;
    const marginWeight = 0.3;
    const riskWeight = 0.3;

    const profitScore = delta.profit > 0 ? Math.min(delta.profit / 100, 1) * 50 + 50 : 50 - Math.min(Math.abs(delta.profit) / 100, 1) * 50;
    const marginScore = delta.margin > 0 ? Math.min(delta.margin / 10, 1) * 50 + 50 : 50 - Math.min(Math.abs(delta.margin) / 10, 1) * 50;
    const riskScore = delta.riskScore < 0 ? Math.min(Math.abs(delta.riskScore) / 20, 1) * 50 + 50 : 50 - Math.min(delta.riskScore / 20, 1) * 50;

    return Math.max(0, Math.min(100, profitWeight * profitScore + marginWeight * marginScore + riskWeight * riskScore));
  }

  /**
   * Calculate impact summary
   */
  private calculateImpactSummary(
    baseline: Scenario['outcomes'],
    variations: WhatIfVariation[]
  ): ImpactSummary {
    const avgDelta = variations.reduce(
      (acc, v) => ({
        revenue: acc.revenue + v.delta.revenue,
        cost: acc.cost + v.delta.cost,
        profit: acc.profit + v.delta.profit,
        risk: acc.risk + v.delta.riskScore,
      }),
      { revenue: 0, cost: 0, profit: 0, risk: 0 }
    );

    const count = variations.length || 1;
    const totalImpact = avgDelta.profit + avgDelta.risk * 10;

    return {
      totalImpact,
      revenueImpact: avgDelta.revenue / count,
      costImpact: avgDelta.cost / count,
      riskImpact: avgDelta.risk / count,
      netEffect: totalImpact > 50 ? 'POSITIVE' : totalImpact < -50 ? 'NEGATIVE' : 'NEUTRAL',
      confidenceScore: variations.length > 3 ? 0.85 : 0.7,
    };
  }

  /**
   * Generate recommendations based on what-if analysis
   */
  private generateRecommendations(
    variations: WhatIfVariation[],
    summary: ImpactSummary
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Find best variation
    const bestVariation = variations.reduce(
      (best, current) => (current.impactScore > best.impactScore ? current : best),
      variations[0]
    );

    if (bestVariation && bestVariation.impactScore > 60) {
      recommendations.push({
        priority: 'HIGH',
        action: `Implement ${bestVariation.name} scenario`,
        rationale: `This variation shows the highest impact score (${bestVariation.impactScore.toFixed(1)}) with positive profit impact`,
        expectedOutcome: bestVariation.projectedOutcome,
        confidenceScore: bestVariation.impactScore / 100,
      });
    }

    // Check for risk reduction opportunities
    const riskReducingVariations = variations.filter((v) => v.delta.riskScore < 0);
    if (riskReducingVariations.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Consider risk mitigation strategies',
        rationale: `${riskReducingVariations.length} variation(s) reduce risk exposure`,
        expectedOutcome: riskReducingVariations[0].projectedOutcome,
        confidenceScore: 0.75,
      });
    }

    // General recommendation based on summary
    if (summary.netEffect === 'POSITIVE') {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Proceed with what-if scenarios',
        rationale: 'Analysis indicates positive expected outcomes',
        expectedOutcome: variations[0]?.projectedOutcome || variations[0]?.projectedOutcome,
        confidenceScore: summary.confidenceScore,
      });
    } else if (summary.netEffect === 'NEGATIVE') {
      recommendations.push({
        priority: 'HIGH',
        action: 'Re-evaluate current parameters',
        rationale: 'What-if analysis indicates negative expected outcomes',
        expectedOutcome: variations[0]?.projectedOutcome,
        confidenceScore: summary.confidenceScore,
      });
    }

    return recommendations;
  }

  /**
   * Calculate comparison metrics across scenarios
   */
  private calculateComparisonMetrics(
    scenarios: Scenario[],
    _weights?: Record<string, number>
  ): ComparisonMetrics {
    const metricNames = ['profit', 'margin', 'risk', 'revenue'] as const;

    const calculateMetricComparison = (
      key: 'profit' | 'margin' | 'risk' | 'revenue'
    ): MetricComparison => {
      const values: Record<string, number> = {};
      let best = '';
      let worst = '';
      let maxVal = -Infinity;
      let minVal = Infinity;

      scenarios.forEach((s) => {
        const val = key === 'profit' ? s.outcomes.profit
          : key === 'margin' ? s.outcomes.margin
          : key === 'risk' ? s.outcomes.riskScore
          : s.outcomes.revenue;

        values[s.id] = val;

        if (val > maxVal) {
          maxVal = val;
          best = s.id;
        }
        if (val < minVal) {
          minVal = val;
          worst = s.id;
        }
      });

      // Normalize scores (for risk, lower is better)
      const normalizedScores: Record<string, number> = {};
      const range = maxVal - minVal || 1;

      scenarios.forEach((s) => {
        if (key === 'risk') {
          // For risk, invert (lower risk = higher score)
          normalizedScores[s.id] = 1 - (values[s.id] - minVal) / range;
        } else {
          normalizedScores[s.id] = (values[s.id] - minVal) / range;
        }
      });

      return {
        values,
        best,
        worst,
        spread: maxVal - minVal,
        normalizedScores,
      };
    };

    return {
      revenue: calculateMetricComparison('revenue'),
      cost: { values: {}, best: '', worst: '', spread: 0, normalizedScores: {} },
      profit: calculateMetricComparison('profit'),
      margin: calculateMetricComparison('margin'),
      risk: calculateMetricComparison('risk'),
      time: { values: {}, best: '', worst: '', spread: 0, normalizedScores: {} },
    };
  }

  /**
   * Calculate rankings across scenarios
   */
  private calculateRankings(scenarios: Scenario[], metrics: ComparisonMetrics): ScenarioRanking[] {
    const weights = { profit: 0.3, margin: 0.25, risk: 0.25, revenue: 0.2 };

    const rankings: ScenarioRanking[] = scenarios.map((scenario) => {
      const rankScores: Record<string, number> = {
        profit: metrics.profit.normalizedScores[scenario.id] || 0,
        margin: metrics.margin.normalizedScores[scenario.id] || 0,
        risk: metrics.risk.normalizedScores[scenario.id] || 0,
        revenue: metrics.revenue.normalizedScores[scenario.id] || 0,
      };

      const weightedScore =
        weights.profit * rankScores.profit +
        weights.margin * rankScores.margin +
        weights.risk * rankScores.risk +
        weights.revenue * rankScores.revenue;

      return {
        scenarioId: scenario.id,
        overallRank: 0,
        rankScores,
        weightedScore,
      };
    });

    // Sort by weighted score and assign ranks
    rankings.sort((a, b) => b.weightedScore - a.weightedScore);
    rankings.forEach((r, idx) => {
      r.overallRank = idx + 1;
    });

    return rankings;
  }

  /**
   * Generate insights from scenario comparison
   */
  private generateInsights(simulations: SimulationResult[], metrics: ComparisonMetrics): ComparisonInsight[] {
    const insights: ComparisonInsight[] = [];

    // Profit insight
    const profitBest = metrics.profit.best;
    const profitWorst = metrics.profit.worst;
    if (profitBest && profitWorst && profitBest !== profitWorst) {
      const spread = metrics.profit.spread;
      insights.push({
        category: 'Profitability',
        finding: `Profit varies by ${spread.toFixed(2)} across scenarios`,
        impact: spread > 500 ? 'HIGH' : spread > 100 ? 'MEDIUM' : 'LOW',
        evidence: `Best: ${profitBest}, Worst: ${profitWorst}`,
      });
    }

    // Risk insight
    const riskBest = metrics.risk.best;
    const riskWorst = metrics.risk.worst;
    if (riskBest && riskWorst && riskBest !== riskWorst) {
      insights.push({
        category: 'Risk',
        finding: `Risk profiles differ significantly between scenarios`,
        impact: 'MEDIUM',
        evidence: `Lowest risk: ${riskBest}, Highest risk: ${riskWorst}`,
      });
    }

    // Confidence insight
    const avgConfidence = simulations.reduce((sum, s) => sum + s.metadata.modelAccuracy, 0) / simulations.length;
    if (avgConfidence < 0.8) {
      insights.push({
        category: 'Reliability',
        finding: `Model confidence is below optimal threshold`,
        impact: 'HIGH',
        evidence: `Average confidence: ${(avgConfidence * 100).toFixed(1)}%`,
      });
    }

    return insights;
  }

  /**
   * Clear old simulations (for memory management)
   */
  prune(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;

    for (const [id, sim] of this.simulations.entries()) {
      const createdAt = new Date(sim.createdAt).getTime();
      if (createdAt < cutoff) {
        this.simulations.delete(id);
        pruned++;
      }
    }

    return pruned;
  }
}

export default ScenarioService;
