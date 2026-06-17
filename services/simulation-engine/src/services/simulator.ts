import {
  Simulation,
  SimulationResults,
  ScenarioDefinition,
  MonteCarloConfig,
  StatisticalMetrics,
  TimeSeriesPoint,
  MetricProjection,
  ImpactSummary,
  ScenarioComparison,
  RiskAnalysis,
  MetricImpact,
  DEFAULT_IMPACT_COEFFICIENTS,
} from '../types';
import { modelRunner } from './modelRunner';
import { impactCalculator } from './impactCalculator';
import { scenarioBuilder } from './scenarioBuilder';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export class Simulator {
  private simulation: Simulation;

  constructor(simulation: Simulation) {
    this.simulation = simulation;
  }

  async run(): Promise<SimulationResults> {
    const startTime = Date.now();
    const { config, scenarioId } = this.simulation;
    const { monteCarlo } = config;

    logger.info(`Starting simulation ${this.simulation.id} with ${monteCarlo.iterations} iterations`);

    try {
      // Get scenario definition
      const scenario = await scenarioBuilder.getScenario(scenarioId);
      if (!scenario) {
        throw new Error(`Scenario ${scenarioId} not found`);
      }

      // Run Monte Carlo simulation
      const monteCarloResults = await this.runMonteCarloSimulation(scenario, monteCarlo);

      // Calculate statistics
      const statistics = this.calculateStatistics(monteCarloResults);

      // Generate time series projections
      const timeSeries = this.generateTimeSeries(scenario, statistics);

      // Calculate impact on metrics
      const metrics = await this.calculateMetrics(scenario, statistics);

      // Calculate impact summary
      const impactSummary = impactCalculator.calculateImpactSummary(metrics);

      // Compare scenarios if comparative type
      const scenarios = await this.compareScenarios(scenario);

      // Analyze risk
      const riskAnalysis = this.analyzeRisk(metrics, monteCarlo.iterations);

      // Generate recommendations
      const recommendations = this.generateRecommendations(impactSummary, riskAnalysis);

      const executionTime = Date.now() - startTime;

      const results: SimulationResults = {
        summary: {
          totalIterations: monteCarlo.iterations,
          successfulIterations: monteCarloResults.filter(r => r.valid).length,
          failedIterations: monteCarloResults.filter(r => !r.valid).length,
          executionTime,
          confidenceLevel: monteCarlo.confidenceLevel,
        },
        metrics,
        impactSummary,
        scenarios,
        riskAnalysis,
        timeSeries,
        recommendations,
      };

      logger.info(`Simulation ${this.simulation.id} completed in ${executionTime}ms`);
      return results;
    } catch (error) {
      logger.error(`Simulation ${this.simulation.id} failed:`, error);
      throw error;
    }
  }

  private async runMonteCarloSimulation(
    scenario: ScenarioDefinition,
    config: MonteCarloConfig
  ): Promise<Array<{ valid: boolean; metrics: Record<string, number> }>> {
    const results: Array<{ valid: boolean; metrics: Record<string, number> }> = [];
    const seed = config.seed || Date.now();

    // Generate random number generator with seed
    const random = this.createRandomGenerator(seed, config.distribution);

    for (let i = 0; i < config.iterations; i++) {
      try {
        // Generate perturbed parameters based on distribution
        const perturbedParams = this.perturbParameters(scenario.parameters, random);

        // Run the model with perturbed parameters
        const modelOutput = await modelRunner.runModel(scenario, perturbedParams);

        results.push({
          valid: true,
          metrics: modelOutput,
        });
      } catch (error) {
        results.push({
          valid: false,
          metrics: {},
        });
      }

      // Log progress every 10%
      if ((i + 1) % Math.floor(config.iterations / 10) === 0) {
        logger.info(`Simulation progress: ${Math.floor((i + 1) / config.iterations * 100)}%`);
      }
    }

    return results;
  }

  private createRandomGenerator(
    seed: number,
    distribution: 'normal' | 'uniform' | 'exponential' | 'poisson'
  ): () => number {
    let state = seed;

    // Simple seeded random number generator (Linear Congruential Generator)
    const lcg = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };

    switch (distribution) {
      case 'normal':
        // Box-Muller transform for normal distribution
        let normalSpare: number | null = null;
        return () => {
          if (normalSpare !== null) {
            const value = normalSpare;
            normalSpare = null;
            return value;
          }
          const u1 = lcg();
          const u2 = lcg();
          const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          normalSpare = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
          return z0;
        };

      case 'uniform':
        return lcg;

      case 'exponential':
        return () => -Math.log(1 - lcg());

      case 'poisson':
        const lambda = 10; // Default lambda for Poisson
        return () => {
          let k = 0;
          let p = 1;
          const expNegLambda = Math.exp(-lambda);
          while (p > expNegLambda) {
            p *= lcg();
            k++;
          }
          return k - 1;
        };

      default:
        return lcg;
    }
  }

  private perturbParameters(
    params: ScenarioDefinition['parameters'],
    random: () => number
  ): Map<string, number> {
    const perturbed = new Map<string, number>();

    for (const param of params) {
      // Add 10-30% variation based on parameter uncertainty
      const variation = 0.1 + (random() * 0.2);
      const direction = random() > 0.5 ? 1 : -1;
      const newValue = param.proposedValue * (1 + (direction * variation));

      // Clamp to bounds if specified
      let finalValue = newValue;
      if (param.minValue !== undefined) {
        finalValue = Math.max(finalValue, param.minValue);
      }
      if (param.maxValue !== undefined) {
        finalValue = Math.min(finalValue, param.maxValue);
      }

      perturbed.set(param.name, finalValue);
    }

    return perturbed;
  }

  private calculateStatistics(
    results: Array<{ valid: boolean; metrics: Record<string, number> }>
  ): Record<string, StatisticalMetrics> {
    const validResults = results.filter(r => r.valid);
    const metrics: Record<string, number[]> = {};

    // Collect all values for each metric
    for (const result of validResults) {
      for (const [key, value] of Object.entries(result.metrics)) {
        if (!metrics[key]) {
          metrics[key] = [];
        }
        metrics[key].push(value);
      }
    }

    // Calculate statistics for each metric
    const statistics: Record<string, StatisticalMetrics> = {};

    for (const [metricName, values] of Object.entries(metrics)) {
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];
      const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);

      statistics[metricName] = {
        mean,
        median,
        stdDev,
        min: sorted[0],
        max: sorted[n - 1],
        percentile25: this.percentile(sorted, 25),
        percentile75: this.percentile(sorted, 75),
        percentile95: this.percentile(sorted, 95),
        percentile99: this.percentile(sorted, 99),
        variance,
        skewness: this.calculateSkewness(values, mean, stdDev),
        kurtosis: this.calculateKurtosis(values, mean, stdDev),
      };
    }

    return statistics;
  }

  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    if (n < 3) return 0;
    const sum = values.reduce((acc, v) => acc + Math.pow((v - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    if (n < 4) return 0;
    const sum = values.reduce((acc, v) => acc + Math.pow((v - mean) / stdDev, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  private generateTimeSeries(
    scenario: ScenarioDefinition,
    statistics: Record<string, StatisticalMetrics>
  ): TimeSeriesPoint[] {
    const { timeHorizon } = this.simulation.config;
    const points: TimeSeriesPoint[] = [];
    const start = new Date(timeHorizon.start);
    const end = new Date(timeHorizon.end);

    // Determine interval based on granularity
    let intervalMs: number;
    switch (timeHorizon.granularity) {
      case 'hour':
        intervalMs = 60 * 60 * 1000;
        break;
      case 'week':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        intervalMs = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 24 * 60 * 60 * 1000;
    }

    // Get net revenue statistics
    const netRevenueStats = statistics.netRevenue || statistics.revenue || {
      mean: 0,
      stdDev: 0,
      percentile95: 0,
      percentile5: 0,
    };

    let current = start.getTime();
    let day = 0;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / intervalMs);

    while (current <= end.getTime()) {
      // Project value with decay factor for uncertainty over time
      const decayFactor = Math.exp(-0.01 * day);
      const trendFactor = 1 + (0.001 * day); // Slight upward trend

      const baseValue = netRevenueStats.mean * decayFactor * trendFactor;
      const uncertainty = netRevenueStats.stdDev * decayFactor * Math.sqrt(day + 1);

      points.push({
        timestamp: new Date(current),
        value: baseValue,
        lowerBound: baseValue - 1.96 * uncertainty,
        upperBound: baseValue + 1.96 * uncertainty,
      });

      current += intervalMs;
      day++;
    }

    return points;
  }

  private async calculateMetrics(
    scenario: ScenarioDefinition,
    statistics: Record<string, StatisticalMetrics>
  ): Promise<{
    csat: MetricProjection;
    revenue: MetricProjection;
    churn: MetricProjection;
    supportCost: MetricProjection;
    netRevenue: MetricProjection;
  }> {
    // Get baseline values (using current parameter values)
    const baseline = await this.getBaselineMetrics(scenario);

    // Calculate projections using impact model
    const projections = impactCalculator.calculateProjections(
      scenario,
      baseline,
      statistics
    );

    // Generate distributions
    const csatDistribution = this.generateDistribution(statistics.csat);
    const revenueDistribution = this.generateDistribution(statistics.revenue);
    const churnDistribution = this.generateDistribution(statistics.churn);
    const supportCostDistribution = this.generateDistribution(statistics.supportCost);
    const netRevenueDistribution = this.generateDistribution(statistics.netRevenue);

    return {
      csat: {
        metric: 'csat',
        baseline: baseline.csat,
        projections: this.generateMetricTimeSeries(baseline.csat, projections.csat),
        statistics: statistics.csat || this.defaultStatistics(),
        distribution: csatDistribution,
      },
      revenue: {
        metric: 'revenue',
        baseline: baseline.revenue,
        projections: this.generateMetricTimeSeries(baseline.revenue, projections.revenue),
        statistics: statistics.revenue || this.defaultStatistics(),
        distribution: revenueDistribution,
      },
      churn: {
        metric: 'churn',
        baseline: baseline.churn,
        projections: this.generateMetricTimeSeries(baseline.churn, projections.churn),
        statistics: statistics.churn || this.defaultStatistics(),
        distribution: churnDistribution,
      },
      supportCost: {
        metric: 'supportCost',
        baseline: baseline.supportCost,
        projections: this.generateMetricTimeSeries(baseline.supportCost, projections.supportCost),
        statistics: statistics.supportCost || this.defaultStatistics(),
        distribution: supportCostDistribution,
      },
      netRevenue: {
        metric: 'netRevenue',
        baseline: baseline.netRevenue,
        projections: this.generateMetricTimeSeries(baseline.netRevenue, projections.netRevenue),
        statistics: statistics.netRevenue || this.defaultStatistics(),
        distribution: netRevenueDistribution,
      },
    };
  }

  private async getBaselineMetrics(scenario: ScenarioDefinition): Promise<{
    csat: number;
    revenue: number;
    churn: number;
    supportCost: number;
    netRevenue: number;
  }> {
    // In a real implementation, this would fetch from historical data
    // For now, return realistic baseline values
    return {
      csat: 0.75,
      revenue: 1000000,
      churn: 0.05,
      supportCost: 50000,
      netRevenue: 950000,
    };
  }

  private generateMetricTimeSeries(
    baseline: number,
    projected: number
  ): TimeSeriesPoint[] {
    const { timeHorizon } = this.simulation.config;
    const points: TimeSeriesPoint[] = [];
    const start = new Date(timeHorizon.start);
    const end = new Date(timeHorizon.end);
    const duration = end.getTime() - start.getTime();
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const timestamp = new Date(start.getTime() + (duration * i / steps));
      const progress = i / steps;
      const value = baseline + (projected - baseline) * progress;

      points.push({
        timestamp,
        value,
        lowerBound: value * 0.95,
        upperBound: value * 1.05,
      });
    }

    return points;
  }

  private generateDistribution(statistics: StatisticalMetrics): Record<string, number> {
    const distribution: Record<string, number> = {};
    const range = statistics.max - statistics.min;
    const bins = 10;
    const binSize = range / bins;

    for (let i = 0; i < bins; i++) {
      const binStart = statistics.min + (i * binSize);
      const binEnd = binStart + binSize;
      const midpoint = (binStart + binEnd) / 2;

      // Calculate probability using normal distribution approximation
      const z = (midpoint - statistics.mean) / statistics.stdDev;
      const probability = Math.exp(-0.5 * z * z) / (statistics.stdDev * Math.sqrt(2 * Math.PI));

      distribution[`${binStart.toFixed(0)}-${binEnd.toFixed(0)}`] = probability;
    }

    return distribution;
  }

  private defaultStatistics(): StatisticalMetrics {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentile25: 0,
      percentile75: 0,
      percentile95: 0,
      percentile99: 0,
      variance: 0,
    };
  }

  private analyzeRisk(
    metrics: {
      csat: MetricProjection;
      revenue: MetricProjection;
      churn: MetricProjection;
      supportCost: MetricProjection;
      netRevenue: MetricProjection;
    },
    iterations: number
  ): RiskAnalysis {
    const riskFactors: RiskAnalysis['riskFactors'] = [];

    // CSAT risk
    if (metrics.csat.statistics.percentile5 < 0.5) {
      riskFactors.push({
        factor: 'Low Customer Satisfaction',
        probability: 0.7,
        impact: 0.8,
        mitigation: 'Implement immediate customer feedback loops',
      });
    }

    // Revenue risk
    const revenueDownside = metrics.revenue.baseline - metrics.revenue.statistics.percentile5;
    if (revenueDownside > metrics.revenue.baseline * 0.1) {
      riskFactors.push({
        factor: 'Significant Revenue Decline',
        probability: 0.6,
        impact: 0.7,
        mitigation: 'Diversify revenue streams',
      });
    }

    // Churn risk
    if (metrics.churn.statistics.percentile95 > 0.1) {
      riskFactors.push({
        factor: 'High Customer Churn',
        probability: 0.5,
        impact: 0.9,
        mitigation: 'Enhance retention programs',
      });
    }

    // Support cost risk
    if (metrics.supportCost.statistics.percentile95 > metrics.supportCost.baseline * 1.5) {
      riskFactors.push({
        factor: 'Escalating Support Costs',
        probability: 0.65,
        impact: 0.6,
        mitigation: 'Invest in self-service solutions',
      });
    }

    // Calculate overall risk score
    const avgProbability = riskFactors.reduce((sum, r) => sum + r.probability, 0) / Math.max(riskFactors.length, 1);
    const avgImpact = riskFactors.reduce((sum, r) => sum + r.impact, 0) / Math.max(riskFactors.length, 1);
    const overallRiskScore = avgProbability * avgImpact * 100;

    // Determine risk level
    let riskLevel: RiskAnalysis['riskLevel'];
    if (overallRiskScore < 25) {
      riskLevel = 'low';
    } else if (overallRiskScore < 50) {
      riskLevel = 'medium';
    } else if (overallRiskScore < 75) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    // Calculate Value at Risk (VaR)
    const returns = metrics.netRevenue.projections.map(p => p.value);
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const valueAtRisk = metrics.netRevenue.baseline - sortedReturns[varIndex];

    // Confidence interval (95%)
    const confidenceInterval: [number, number] = [
      metrics.netRevenue.statistics.percentile5,
      metrics.netRevenue.statistics.percentile95,
    ];

    return {
      overallRiskScore,
      riskLevel,
      riskFactors,
      valueAtRisk: Math.abs(valueAtRisk),
      confidenceInterval,
    };
  }

  private async compareScenarios(baseScenario: ScenarioDefinition): Promise<ScenarioComparison[]> {
    // In a real implementation, this would compare with related scenarios
    // For now, return a comparison with the base scenario
    const comparisons: ScenarioComparison[] = [];

    // Add base scenario comparison
    comparisons.push({
      scenarioId: baseScenario.id,
      scenarioName: baseScenario.name,
      impactSummary: {
        csat: { metric: 'csat', baseline: 0.75, projected: 0.78, change: 0.03, changePercent: 4, confidence: 0.85 },
        revenue: { metric: 'revenue', baseline: 1000000, projected: 1050000, change: 50000, changePercent: 5, confidence: 0.8 },
        churn: { metric: 'churn', baseline: 0.05, projected: 0.045, change: -0.005, changePercent: -10, confidence: 0.75 },
        supportCost: { metric: 'supportCost', baseline: 50000, projected: 47500, change: -2500, changePercent: -5, confidence: 0.8 },
        netImpact: { metric: 'netRevenue', baseline: 950000, projected: 1002500, change: 52500, changePercent: 5.5, confidence: 0.78 },
      },
      riskScore: 35,
      recommendation: 'Proceed with implementation - moderate risk with positive expected outcomes',
    });

    return comparisons;
  }

  private generateRecommendations(
    impactSummary: ImpactSummary,
    riskAnalysis: RiskAnalysis
  ): SimulationResults['recommendations'] {
    const recommendations: SimulationResults['recommendations'] = [];

    // High revenue impact recommendation
    if (impactSummary.revenue.changePercent > 5) {
      recommendations.push({
        priority: 1,
        title: 'Implement Revenue Initiative',
        description: `Projected ${impactSummary.revenue.changePercent.toFixed(1)}% revenue increase warrants immediate implementation`,
        expectedImpact: impactSummary.revenue.change,
        confidence: impactSummary.revenue.confidence,
        caveats: ['Dependent on stable market conditions', 'Requires monitoring of key performance indicators'],
      });
    }

    // CSAT improvement recommendation
    if (impactSummary.csat.changePercent > 2) {
      recommendations.push({
        priority: 2,
        title: 'Customer Experience Enhancement',
        description: `Expected CSAT improvement of ${impactSummary.csat.changePercent.toFixed(1)}% will drive long-term retention`,
        expectedImpact: impactSummary.csat.change,
        confidence: impactSummary.csat.confidence,
        caveats: ['Requires sustained effort across multiple touchpoints'],
      });
    }

    // Churn reduction recommendation
    if (impactSummary.churn.change < 0) {
      recommendations.push({
        priority: 3,
        title: 'Retention Program',
        description: `Projected churn reduction of ${Math.abs(impactSummary.churn.changePercent).toFixed(1)}% will improve customer lifetime value`,
        expectedImpact: Math.abs(impactSummary.churn.change),
        confidence: impactSummary.churn.confidence,
        caveats: ['Effectiveness may vary by customer segment'],
      });
    }

    // Risk mitigation recommendation
    if (riskAnalysis.riskLevel === 'high' || riskAnalysis.riskLevel === 'critical') {
      recommendations.push({
        priority: recommendations.length + 1,
        title: 'Risk Mitigation Strategy Required',
        description: 'High risk profile detected - implement phased rollout with monitoring',
        expectedImpact: 0,
        confidence: 0.5,
        caveats: [
          'Consider pilot program before full rollout',
          'Establish early warning metrics',
          'Prepare contingency plans',
        ],
      });
    }

    // Support cost optimization
    if (impactSummary.supportCost.change < 0) {
      recommendations.push({
        priority: recommendations.length + 1,
        title: 'Support Cost Optimization',
        description: `Expected cost savings of ${Math.abs(impactSummary.supportCost.changePercent).toFixed(1)}% from process improvements`,
        expectedImpact: Math.abs(impactSummary.supportCost.change),
        confidence: impactSummary.supportCost.confidence,
        caveats: ['May require initial investment in automation'],
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }
}

export const simulator = {
  create: (simulation: Simulation) => new Simulator(simulation),
};
