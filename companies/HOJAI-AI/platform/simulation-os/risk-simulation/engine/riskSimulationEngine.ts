import { v4 as uuidv4 } from 'uuid';
import * as ss from 'simple-statistics';
import {
  RiskSimulationRequest,
  RiskSimulationResult,
  RiskFactor,
  Position,
  Scenario,
  VaRParameters,
  VaRResult,
  MonteCarloResult,
  RiskMetrics,
  SensitivityResult,
  StressTestResult,
  RiskMitigation,
  RiskCategory,
  RiskSeverity,
  DistributionType
} from '../models/riskSimulation.js';
import { SeededRandom } from '../../company-simulation/engine/companySimulationEngine.js';

// ============================================================================
// Risk Simulation Engine - Core simulation algorithms
// ============================================================================

/**
 * Monte Carlo risk engine with advanced statistical methods
 */
export class MonteCarloRiskEngine {
  /**
   * Run comprehensive Monte Carlo simulation
   */
  static runSimulation(
    positions: Position[],
    riskFactors: RiskFactor[],
    iterations: number,
    seed?: number
  ): MonteCarloResult[] {
    const results: MonteCarloResult[] = [];

    // Calculate portfolio returns
    const portfolioReturns = this.simulatePortfolioReturns(
      positions,
      riskFactors,
      iterations,
      seed
    );

    // Analyze each position
    for (const position of positions) {
      const positionReturns = this.simulatePositionReturns(
        position,
        riskFactors,
        iterations,
        seed
      );

      results.push(this.analyzeResults(`Position: ${position.name}`, positionReturns, iterations));
    }

    // Add portfolio-level analysis
    results.push(this.analyzeResults('Portfolio Value', portfolioReturns, iterations));

    return results;
  }

  /**
   * Simulate portfolio returns
   */
  private static simulatePortfolioReturns(
    positions: Position[],
    riskFactors: RiskFactor[],
    iterations: number,
    seed?: number
  ): number[] {
    const rng = new SeededRandom(seed);
    const returns: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let portfolioReturn = 0;

      for (const position of positions) {
        // Calculate position return based on factor sensitivities
        let positionReturn = 0;

        for (const factorSensitivity of position.riskFactors) {
          const factor = riskFactors.find(f => f.id === factorSensitivity.factorId);
          if (!factor) continue;

          const factorReturn = this.generateRandomReturn(factor, rng);
          positionReturn += factorReturn * factorSensitivity.sensitivity;
        }

        // Weight by position value
        const weight = position.value / positions.reduce((sum, p) => sum + p.value, 0);
        portfolioReturn += positionReturn * weight;
      }

      returns.push(portfolioReturn);
    }

    return returns;
  }

  /**
   * Simulate individual position returns
   */
  private static simulatePositionReturns(
    position: Position,
    riskFactors: RiskFactor[],
    iterations: number,
    seed?: number
  ): number[] {
    const rng = new SeededRandom(seed);
    const returns: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let positionReturn = 0;

      for (const factorSensitivity of position.riskFactors) {
        const factor = riskFactors.find(f => f.id === factorSensitivity.factorId);
        if (!factor) continue;

        const factorReturn = this.generateRandomReturn(factor, rng);
        positionReturn += factorReturn * factorSensitivity.sensitivity;
      }

      returns.push(positionReturn);
    }

    return returns;
  }

  /**
   * Generate random return based on factor distribution
   */
  private static generateRandomReturn(factor: RiskFactor, rng: SeededRandom): number {
    switch (factor.distribution) {
      case DistributionType.NORMAL:
        return rng.nextGaussian(factor.currentValue, factor.volatility);

      case DistributionType.UNIFORM:
        const min = factor.min ?? factor.currentValue - factor.volatility * 2;
        const max = factor.max ?? factor.currentValue + factor.volatility * 2;
        return rng.nextUniform(min, max);

      case DistributionType.TRIANGULAR:
        const mode = factor.mode ?? factor.currentValue;
        return rng.nextTriangular(
          factor.min ?? factor.currentValue - factor.volatility * 3,
          mode,
          factor.max ?? factor.currentValue + factor.volatility * 3
        );

      case DistributionType.LOGNORMAL:
        const logMean = Math.log(factor.currentValue) - factor.volatility ** 2 / 2;
        const logStd = factor.volatility;
        return Math.exp(rng.nextGaussian(logMean, logStd));

      case DistributionType.POISSON:
        return rng.nextInt(0, factor.currentValue);

      case DistributionType.BERNOULLI:
        return rng.next() > 0.5 ? factor.currentValue : -factor.currentValue;

      default:
        return rng.nextGaussian(factor.currentValue, factor.volatility);
    }
  }

  /**
   * Analyze simulation results
   */
  private static analyzeResults(metric: string, returns: number[], iterations: number): MonteCarloResult {
    const sorted = [...returns].sort((a, b) => a - b);

    // Calculate statistics
    const mean = ss.mean(returns);
    const median = ss.median(returns);
    const stdDev = ss.standardDeviation(returns);
    const min = Math.min(...returns);
    const max = Math.max(...returns);

    // Calculate percentiles
    const percentile5 = ss.percentile(sorted, 0.05);
    const percentile10 = ss.percentile(sorted, 0.10);
    const percentile25 = ss.percentile(sorted, 0.25);
    const percentile50 = ss.percentile(sorted, 0.50);
    const percentile75 = ss.percentile(sorted, 0.75);
    const percentile90 = ss.percentile(sorted, 0.90);
    const percentile95 = ss.percentile(sorted, 0.95);
    const percentile99 = ss.percentile(sorted, 0.99);

    // Calculate higher moments
    const skewness = this.calculateSkewness(returns, mean, stdDev);
    const kurtosis = this.calculateKurtosis(returns, mean, stdDev);

    // Generate distribution histogram
    const distribution = this.generateHistogram(sorted, 20);

    // Calculate confidence interval
    const confidenceInterval: [number, number] = [percentile5, percentile95];

    // Fit normal distribution and test
    const normalFit = this.testNormality(returns);

    return {
      metric,
      iterations,
      mean,
      median,
      stdDev,
      min,
      max,
      skewness,
      kurtosis,
      percentile5,
      percentile10,
      percentile25,
      percentile50,
      percentile75,
      percentile90,
      percentile95,
      percentile99,
      confidenceInterval,
      distribution,
      normalFit
    };
  }

  /**
   * Calculate skewness (third moment)
   */
  private static calculateSkewness(data: number[], mean: number, stdDev: number): number {
    const n = data.length;
    const sum = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  /**
   * Calculate kurtosis (fourth moment)
   */
  private static calculateKurtosis(data: number[], mean: number, stdDev: number): number {
    const n = data.length;
    const sum = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  /**
   * Generate histogram from sorted data
   */
  private static generateHistogram(sorted: number[], buckets: number): Array<{ value: number; frequency: number }> {
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min || 1;
    const bucketSize = range / buckets;

    const histogram: Array<{ value: number; frequency: number }> = [];

    for (let i = 0; i < buckets; i++) {
      const bucketMin = min + i * bucketSize;
      const bucketMax = bucketMin + bucketSize;
      const count = sorted.filter(
        v => v >= bucketMin && (i === buckets - 1 ? v <= bucketMax : v < bucketMax)
      ).length;

      histogram.push({
        value: bucketMin + bucketSize / 2,
        frequency: count / sorted.length
      });
    }

    return histogram;
  }

  /**
   * Test normality using Anderson-Darling test approximation
   */
  private static testNormality(data: number[]): MonteCarloResult['normalFit'] {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const mean = ss.mean(data);
    const stdDev = ss.standardDeviation(data);

    // Standardize data
    const z = sorted.map(x => (x - mean) / stdDev);

    // Calculate Anderson-Darling statistic (simplified)
    const phi = (x: number) => {
      // Standard normal CDF approximation
      const t = 1 / (1 + 0.2316419 * Math.abs(x));
      const d = 0.3989423 * Math.exp(-x * x / 2);
      const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
      return x > 0 ? 1 - p : p;
    };

    let ad = 0;
    for (let i = 1; i <= n; i++) {
      const term1 = Math.log(phi(z[i - 1]));
      const term2 = Math.log(1 - phi(z[n - i]));
      ad += (2 * i - 1) * (term1 + term2);
    }
    ad = -ad / n - n;

    // Critical value at 5% significance is approximately 2.492
    const isNormal = ad < 2.492;

    return {
      mu: mean,
      sigma: stdDev,
      andersonDarling: ad,
      isNormal
    };
  }
}

/**
 * Value at Risk engine
 */
export class VaREngine {
  /**
   * Calculate Value at Risk using Monte Carlo
   */
  static calculateVaR(params: VaRParameters): VaRResult {
    const { confidenceLevel, timeHorizon, portfolio, riskFactors } = params;

    // Run Monte Carlo simulation
    const iterations = 10000;
    const rng = new SeededRandom();
    const returns: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let portfolioReturn = 0;

      for (const position of portfolio) {
        let positionReturn = 0;

        for (const factorSensitivity of position.riskFactors) {
          const factor = riskFactors.find(f => f.id === factorSensitivity.factorId);
          if (!factor) continue;

          // Scale volatility by square root of time
          const scaledVolatility = factor.volatility * Math.sqrt(timeHorizon);
          const factorReturn = rng.nextGaussian(0, scaledVolatility);
          positionReturn += factorReturn * factorSensitivity.sensitivity;
        }

        const weight = position.value / portfolio.reduce((sum, p) => sum + p.value, 0);
        portfolioReturn += positionReturn * weight;
      }

      returns.push(portfolioReturn);
    }

    // Calculate VaR
    const sorted = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * iterations);
    const varValue = sorted[varIndex];

    // Calculate CVaR (Expected Shortfall)
    const cvarValue = ss.mean(sorted.slice(0, varIndex + 1));

    // Calculate other metrics
    const percentile5 = ss.percentile(sorted, 0.05);
    const percentile95 = ss.percentile(sorted, 0.95);
    const worstCase = Math.min(...returns);
    const bestCase = Math.max(...returns);

    // Generate distribution
    const distribution = MonteCarloRiskEngine['generateHistogram'](sorted, 20);

    return {
      var: Math.abs(varValue),
      cvar: Math.abs(cvarValue),
      confidenceLevel,
      timeHorizon,
      distribution,
      percentile5,
      percentile95,
      worstCase,
      bestCase
    };
  }

  /**
   * Calculate VaR for multiple confidence levels
   */
  static calculateMultipleVaR(
    portfolio: Position[],
    riskFactors: RiskFactor[],
    timeHorizon: number
  ): VaRResult[] {
    const confidenceLevels = [0.90, 0.95, 0.99, 0.999];

    return confidenceLevels.map(confidence => {
      return this.calculateVaR({
        confidenceLevel: confidence,
        timeHorizon,
        method: 'monte_carlo',
        portfolio,
        riskFactors
      });
    });
  }

  /**
   * Calculate Marginal VaR (component VaR)
   */
  static calculateMarginalVaR(
    portfolio: Position[],
    riskFactors: RiskFactor[],
    varBase: number
  ): Map<string, number> {
    const marginalVaRs = new Map<string, number>();

    // Calculate VaR contribution of each position
    for (const position of portfolio) {
      const positionsWithout = portfolio.filter(p => p.id !== position.id);
      const positionsWith = portfolio;

      // Calculate portfolio VaR without this position
      const varWithout = this.calculateVaR({
        confidenceLevel: 0.95,
        timeHorizon: 1,
        method: 'monte_carlo',
        portfolio: positionsWithout.length > 0 ? positionsWithout : positionsWith,
        riskFactors
      });

      // Marginal contribution
      const marginalVaR = varBase - varWithout.var;
      marginalVaRs.set(position.id, marginalVaR);
    }

    return marginalVaRs;
  }
}

/**
 * Sensitivity analysis engine
 */
export class SensitivityAnalysisEngine {
  /**
   * Perform sensitivity analysis on risk factors
   */
  static analyze(
    positions: Position[],
    riskFactors: RiskFactor[],
    iterations: number = 1000
  ): SensitivityResult[] {
    const results: SensitivityResult[] = [];

    // Calculate base portfolio value
    const baseValue = positions.reduce((sum, p) => sum + p.value, 0);

    for (const factor of riskFactors) {
      // Calculate factor contribution to risk
      const positionContributions = positions
        .filter(p => p.riskFactors.some(f => f.factorId === factor.id))
        .map(p => ({
          position,
          sensitivity: p.riskFactors.find(f => f.factorId === factor.id)!.sensitivity,
          weight: p.value / baseValue
        }));

      const totalExposure = positionContributions.reduce(
        (sum, pc) => sum + Math.abs(pc.sensitivity) * pc.weight * factor.volatility,
        0
      );

      // Calculate impact of ±1 standard deviation
      const impact = totalExposure * factor.volatility;

      // Tornado data points
      const tornado = {
        low: baseValue - impact,
        base: baseValue,
        high: baseValue + impact
      };

      // Calculate percentage contribution to total risk
      const totalRisk = riskFactors.reduce((sum, f) => {
        return sum + f.volatility * f.volatility;
      }, 0);

      const contribution = (factor.volatility * factor.volatility / totalRisk) * 100;

      results.push({
        factorId: factor.id,
        factorName: factor.name,
        baseValue: factor.currentValue,
        impact: {
          valueChange: impact,
          percentageChange: (impact / baseValue) * 100
        },
        tornado,
        contribution
      });
    }

    // Sort by absolute contribution
    results.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return results;
  }

  /**
   * Perform one-way sensitivity analysis
   */
  static oneWayAnalysis(
    positions: Position[],
    factor: RiskFactor,
    range: { min: number; max: number; steps: number }
  ): Array<{ factorValue: number; portfolioValue: number }> {
    const results: Array<{ factorValue: number; portfolioValue: number }> = [];
    const step = (range.max - range.min) / (range.steps - 1);

    for (let i = 0; i < range.steps; i++) {
      const factorValue = range.min + step * i;

      let portfolioValue = 0;
      for (const position of positions) {
        const sensitivity = position.riskFactors.find(f => f.factorId === factor.id)?.sensitivity || 0;
        const positionReturn = (factorValue - factor.currentValue) * sensitivity;
        portfolioValue += position.value * (1 + positionReturn);
      }

      results.push({ factorValue, portfolioValue });
    }

    return results;
  }

  /**
   * Perform two-way sensitivity analysis (scenario matrix)
   */
  static twoWayAnalysis(
    positions: Position[],
    factor1: RiskFactor,
    factor2: RiskFactor,
    range: { min: number; max: number; steps: number }
  ): Map<string, Map<string, number>> {
    const results = new Map<string, Map<string, number>>();
    const step = (range.max - range.min) / (range.steps - 1);

    for (let i = 0; i < range.steps; i++) {
      const value1 = range.min + step * i;
      const innerMap = new Map<string, number>();

      for (let j = 0; j < range.steps; j++) {
        const value2 = range.min + step * j;

        let portfolioValue = 0;
        for (const position of positions) {
          const sensitivity1 = position.riskFactors.find(f => f.factorId === factor1.id)?.sensitivity || 0;
          const sensitivity2 = position.riskFactors.find(f => f.factorId === factor2.id)?.sensitivity || 0;

          const return1 = (value1 - factor1.currentValue) * sensitivity1;
          const return2 = (value2 - factor2.currentValue) * sensitivity2;
          const totalReturn = return1 + return2;

          portfolioValue += position.value * (1 + totalReturn);
        }

        innerMap.set(value2.toFixed(2), portfolioValue);
      }

      results.set(value1.toFixed(2), innerMap);
    }

    return results;
  }
}

/**
 * Stress testing engine
 */
export class StressTestingEngine {
  /**
   * Run stress tests on scenarios
   */
  static runStressTests(
    scenarios: Scenario[],
    positions: Position[],
    riskFactors: RiskFactor[]
  ): StressTestResult[] {
    const results: StressTestResult[] = [];
    const basePortfolioValue = positions.reduce((sum, p) => sum + p.value, 0);

    for (const scenario of scenarios) {
      const result = this.runScenarioStressTest(scenario, positions, riskFactors, basePortfolioValue);
      results.push(result);
    }

    return results;
  }

  /**
   * Run individual scenario stress test
   */
  private static runScenarioStressTest(
    scenario: Scenario,
    positions: Position[],
    riskFactors: RiskFactor[],
    basePortfolioValue: number
  ): StressTestResult {
    let scenarioPortfolioValue = basePortfolioValue;

    // Apply factor changes
    for (const [factorId, changePercent] of scenario.factorChanges) {
      const factor = riskFactors.find(f => f.id === factorId);
      if (!factor) continue;

      const newValue = factor.currentValue * (1 + changePercent);

      // Calculate impact on each position
      for (const position of positions) {
        const sensitivity = position.riskFactors.find(f => f.factorId === factorId)?.sensitivity || 0;
        const positionReturn = (newValue - factor.currentValue) / factor.currentValue * sensitivity;
        scenarioPortfolioValue *= (1 + positionReturn);
      }
    }

    const dollarChange = scenarioPortfolioValue - basePortfolioValue;
    const percentageChange = (dollarChange / basePortfolioValue) * 100;

    // Identify cascading risks
    const cascadingRisks = this.identifyCascadingRisks(scenario, positions);

    // Assess survivability
    const survivability = this.assessSurvivability(
      scenarioPortfolioValue,
      basePortfolioValue,
      scenario.recoveryTime
    );

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      impact: {
        portfolioValue: scenarioPortfolioValue,
        dollarChange,
        percentageChange
      },
      recoveryTime: scenario.recoveryTime,
      cascadingRisks,
      survivability
    };
  }

  /**
   * Identify cascading risks from scenario
   */
  private static identifyCascadingRisks(
    scenario: Scenario,
    positions: Position[]
  ): StressTestResult['cascadingRisks'] {
    const cascadingRisks: StressTestResult['cascadingRisks'] = [];

    // Identify correlated positions that might be affected
    const affectedPositions = positions.filter(p =>
      p.riskFactors.some(f => scenario.factorChanges.has(f.factorId))
    );

    for (const position of affectedPositions) {
      // Find correlated positions
      const correlatedPositions = positions.filter(p =>
        p.id !== position.id &&
        p.type === position.type
      );

      for (const correlated of correlatedPositions.slice(0, 3)) {
        cascadingRisks.push({
          risk: `${position.name} -> ${correlated.name} contagion`,
          impact: Math.random() * 0.1, // Simplified impact estimation
          probability: 0.3 + Math.random() * 0.3
        });
      }
    }

    return cascadingRisks;
  }

  /**
   * Assess if portfolio can survive and recover
   */
  private static assessSurvivability(
    stressedValue: number,
    baseValue: number,
    recoveryTime?: number
  ): StressTestResult['survivability'] {
    const lossPercentage = (baseValue - stressedValue) / baseValue;
    const canRecover = stressedValue > baseValue * 0.5; // Can recover if >50% remains

    return {
      canRecover,
      timeToRecovery: canRecover && recoveryTime ? recoveryTime : undefined,
      capitalNeeded: canRecover ? baseValue - stressedValue : undefined
    };
  }

  /**
   * Generate standard stress test scenarios
   */
  static generateStandardScenarios(): Scenario[] {
    return [
      {
        id: 'scenario-market-crash',
        name: 'Market Crash (2008 Style)',
        probability: 0.05,
        description: 'Severe market downturn similar to 2008 financial crisis',
        factorChanges: new Map([
          ['equity_market', -0.40],
          ['credit_spreads', 0.30],
          ['volatility', 0.80],
          ['liquidity', -0.50]
        ]),
        duration: 30,
        recoveryTime: 365
      },
      {
        id: 'scenario-recession',
        name: 'Mild Recession',
        probability: 0.15,
        description: 'Economic downturn with moderate market impact',
        factorChanges: new Map([
          ['equity_market', -0.20],
          ['credit_spreads', 0.15],
          ['interest_rates', -0.05],
          ['gdp_growth', -0.03]
        ]),
        duration: 180,
        recoveryTime: 270
      },
      {
        id: 'scenario-interest-rate-shock',
        name: 'Interest Rate Shock',
        probability: 0.10,
        description: 'Sudden increase in interest rates',
        factorChanges: new Map([
          ['interest_rates', 0.25],
          ['bond_prices', -0.15],
          ['equity_market', -0.10],
          ['real_estate', -0.15]
        ]),
        duration: 60,
        recoveryTime: 180
      },
      {
        id: 'scenario-inflation-surge',
        name: 'Inflation Surge',
        probability: 0.12,
        description: 'Significant increase in inflation',
        factorChanges: new Map([
          ['inflation', 0.05],
          ['interest_rates', 0.03],
          ['real_estate', -0.10],
          ['bond_prices', -0.12]
        ]),
        duration: 120,
        recoveryTime: 240
      },
      {
        id: 'scenario-geopolitical-crisis',
        name: 'Geopolitical Crisis',
        probability: 0.08,
        description: 'Major geopolitical event causing market volatility',
        factorChanges: new Map([
          ['equity_market', -0.15],
          ['volatility', 0.50],
          ['oil_prices', 0.30],
          ['safe_haven_demand', 0.25]
        ]),
        duration: 45,
        recoveryTime: 90
      }
    ];
  }
}

/**
 * Risk mitigation recommendation engine
 */
export class RiskMitigationEngine {
  /**
   * Generate risk mitigation recommendations
   */
  static generateRecommendations(
    simulationResult: RiskSimulationResult
  ): RiskMitigation[] {
    const recommendations: RiskMitigation[] = [];
    const { varResults, sensitivityAnalysis, stressTests } = simulationResult;

    // Analyze VaR results
    for (const varResult of varResults) {
      if (varResult.var > 100000) { // Threshold for significant risk
        recommendations.push({
          id: uuidv4(),
          category: RiskCategory.MARKET,
          severity: RiskSeverity.HIGH,
          recommendation: 'Consider hedging strategies to reduce VaR exposure',
          expectedImpact: {
            riskReduction: 20,
            cost: 5000,
            implementationTime: 30
          },
          priority: 'high',
          constraints: ['Requires hedging infrastructure', 'May impact returns']
        });
      }
    }

    // Analyze sensitivity results
    for (const sensitivity of sensitivityAnalysis.slice(0, 3)) {
      if (sensitivity.contribution > 15) {
        recommendations.push({
          id: uuidv4(),
          category: RiskCategory.MARKET,
          severity: RiskSeverity.MEDIUM,
          recommendation: `Reduce exposure to ${sensitivity.factorName} risk factor`,
          expectedImpact: {
            riskReduction: sensitivity.contribution * 0.5,
            cost: 0,
            implementationTime: 14
          },
          priority: 'medium',
          constraints: ['May reduce upside potential']
        });
      }
    }

    // Analyze stress tests
    for (const stress of stressTests) {
      if (!stress.survivability.canRecover) {
        recommendations.push({
          id: uuidv4(),
          category: RiskCategory.STRATEGIC,
          severity: RiskSeverity.CRITICAL,
          recommendation: 'Increase capital reserves to survive worst-case scenario',
          expectedImpact: {
            riskReduction: stress.impact.percentageChange * -1,
            cost: stress.survivability.capitalNeeded || 0,
            implementationTime: 90
          },
          priority: 'critical',
          constraints: ['Requires additional capital']
        });
      }

      if (stress.impact.percentageChange < -20) {
        recommendations.push({
          id: uuidv4(),
          category: RiskCategory.OPERATIONAL,
          severity: RiskSeverity.HIGH,
          recommendation: `Develop contingency plan for ${stress.scenarioName} scenario`,
          expectedImpact: {
            riskReduction: 15,
            cost: 10000,
            implementationTime: 60
          },
          priority: 'high',
          constraints: ['Requires executive approval']
        });
      }
    }

    // Add diversification recommendations
    recommendations.push({
      id: uuidv4(),
      category: RiskCategory.MARKET,
      severity: RiskSeverity.LOW,
      recommendation: 'Increase portfolio diversification to reduce concentration risk',
      expectedImpact: {
        riskReduction: 10,
        cost: 0,
        implementationTime: 180
      },
      priority: 'low',
      constraints: ['May require new market access']
    });

    return recommendations;
  }
}

/**
 * Main Risk Simulation Engine
 */
export class RiskSimulationEngine {
  private simulations: Map<string, RiskSimulationResult> = new Map();

  /**
   * Run risk simulation
   */
  async run(request: RiskSimulationRequest): Promise<RiskSimulationResult> {
    const startTime = Date.now();
    const id = uuidv4();

    const {
      simulationId,
      name,
      description,
      positions,
      riskFactors,
      scenarios,
      parameters = {
        iterations: 10000,
        confidenceLevel: 0.95,
        timeHorizon: 1,
        includeVaR: true,
        includeSensitivity: true,
        includeStress: true
      }
    } = request;

    // Run Monte Carlo simulation
    const monteCarlo = MonteCarloRiskEngine.runSimulation(
      positions,
      riskFactors,
      parameters.iterations
    );

    // Calculate VaR if requested
    const varResults = parameters.includeVaR
      ? VaREngine.calculateMultipleVaR(positions, riskFactors, parameters.timeHorizon)
      : [];

    // Run sensitivity analysis if requested
    const sensitivityAnalysis = parameters.includeSensitivity
      ? SensitivityAnalysisEngine.analyze(positions, riskFactors, parameters.iterations)
      : [];

    // Run stress tests if requested
    const effectiveScenarios = scenarios && scenarios.length > 0
      ? scenarios
      : StressTestingEngine.generateStandardScenarios();

    const stressTests = parameters.includeStress
      ? StressTestingEngine.runStressTests(effectiveScenarios, positions, riskFactors)
      : [];

    // Calculate aggregate metrics
    const aggregateMetrics = this.calculateAggregateMetrics(
      monteCarlo,
      varResults,
      positions
    );

    // Generate risk mitigation recommendations
    const mockResult: RiskSimulationResult = {
      id,
      simulationId,
      name,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
      executionTimeMs: Date.now() - startTime,
      monteCarlo,
      aggregateMetrics,
      varResults,
      sensitivityAnalysis,
      scenarioAnalysis: new Map(effectiveScenarios.map(s => [
        s.id,
        { scenario: s, impact: 0, probability: s.probability }
      ])),
      stressTests,
      mitigations: [],
      metadata: {
        iterations: parameters.iterations,
        confidenceLevel: parameters.confidenceLevel,
        timeHorizon: parameters.timeHorizon,
        positionsAnalyzed: positions.length,
        riskFactors: riskFactors.length
      }
    };

    mockResult.mitigations = RiskMitigationEngine.generateRecommendations(mockResult);

    this.simulations.set(id, mockResult);
    return mockResult;
  }

  /**
   * Calculate aggregate risk metrics
   */
  private calculateAggregateMetrics(
    monteCarloResults: MonteCarloResult[],
    varResults: VaRResult[],
    positions: Position[]
  ): RiskMetrics {
    const portfolioResult = monteCarloResults.find(r => r.metric === 'Portfolio Value');

    if (!portfolioResult) {
      return {
        var: varResults[0] || { var: 0, cvar: 0, confidenceLevel: 0.95, timeHorizon: 1, distribution: [], percentile5: 0, percentile95: 0, worstCase: 0, bestCase: 0 },
        expectedReturn: 0,
        volatility: 0,
        maxDrawdown: { value: 0, percentage: 0, duration: 0 }
      };
    }

    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);

    // Calculate Sharpe Ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const sharpeRatio = portfolioResult.mean > riskFreeRate
      ? (portfolioResult.mean - riskFreeRate) / portfolioResult.stdDev
      : 0;

    // Calculate Sortino Ratio (downside deviation)
    const downsideReturns = monteCarloResults
      .filter(r => r.metric === 'Portfolio Value')
      .flatMap(r => r.distribution.map(d => d.value));
    const downsideStdDev = ss.standardDeviation(downsideReturns.filter(r => r < 0));
    const sortinoRatio = downsideStdDev > 0
      ? (portfolioResult.mean - riskFreeRate) / downsideStdDev
      : 0;

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(portfolioResult.distribution.map(d => d.value), totalValue);

    return {
      var: varResults.find(v => v.confidenceLevel === 0.95) || {
        var: portfolioResult.percentile5,
        cvar: portfolioResult.percentile5,
        confidenceLevel: 0.95,
        timeHorizon: 1,
        distribution: [],
        percentile5: 0,
        percentile95: 0,
        worstCase: 0,
        bestCase: 0
      },
      expectedReturn: portfolioResult.mean,
      volatility: portfolioResult.stdDev,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      correlationMatrix: this.calculateCorrelationMatrix(positions)
    };
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(
    values: number[],
    initialValue: number
  ): RiskMetrics['maxDrawdown'] {
    let maxValue = initialValue;
    let maxDrawdownValue = 0;
    let maxDrawdownPercent = 0;
    let drawdownDuration = 0;
    let currentDrawdownDuration = 0;

    for (const value of values) {
      if (value > maxValue) {
        maxValue = value;
        currentDrawdownDuration = 0;
      } else {
        const drawdownValue = maxValue - value;
        const drawdownPercent = (drawdownValue / maxValue) * 100;
        currentDrawdownDuration++;

        if (drawdownValue > maxDrawdownValue) {
          maxDrawdownValue = drawdownValue;
          maxDrawdownPercent = drawdownPercent;
          drawdownDuration = currentDrawdownDuration;
        }
      }
    }

    return {
      value: maxDrawdownValue,
      percentage: maxDrawdownPercent,
      duration: drawdownDuration
    };
  }

  /**
   * Calculate correlation matrix for positions
   */
  private calculateCorrelationMatrix(positions: Position[]): {
    factors: string[];
    matrix: number[][];
  } {
    const factors = positions.map(p => p.name);
    const n = positions.length;
    const matrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        // Simplified correlation - same type = 0.5, different = 0.2
        if (i === j) {
          row.push(1);
        } else if (positions[i].type === positions[j].type) {
          row.push(0.5 + Math.random() * 0.3);
        } else {
          row.push(0.1 + Math.random() * 0.2);
        }
      }
      matrix.push(row);
    }

    return { factors, matrix };
  }

  /**
   * Get simulation by ID
   */
  get(id: string): RiskSimulationResult | undefined {
    return this.simulations.get(id);
  }

  /**
   * List all simulations
   */
  list(): RiskSimulationResult[] {
    return Array.from(this.simulations.values());
  }

  /**
   * Get VaR for a simulation
   */
  getVaR(id: string): VaRResult[] | undefined {
    return this.simulations.get(id)?.varResults;
  }
}
