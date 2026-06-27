import { v4 as uuidv4 } from 'uuid';
import * as ss from 'simple-statistics';
import {
  CompanySimulationRequest,
  CompanySimulationResult,
  CompanyScenario,
  SimulationType,
  OrgRestructureScenario,
  HiringPlanScenario,
  ProcessChangeScenario,
  TechAdoptionScenario,
  MonteCarloResult,
  FinancialImpact,
  OperationalImpact,
  RiskAssessment,
  ImpactLevel,
  DepartmentType,
  RoleLevel
} from '../models/companySimulation.js';

// ============================================================================
// Company Simulation Engine - Core simulation algorithms
// ============================================================================

/**
 * Random number generator with seed support for reproducibility
 */
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  /**
   * Generate a random number between 0 and 1 using Mulberry32 algorithm
   */
  next(): number {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate a random number from normal distribution using Box-Muller transform
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  /**
   * Generate a random number from uniform distribution
   */
  nextUniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generate a random number from triangular distribution
   */
  nextTriangular(min: number, mode: number, max: number): number {
    const u = this.next();
    const fc = (mode - min) / (max - min);

    if (u <= fc) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }

  /**
   * Choose random element from array
   */
  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Shuffle array in place
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Monte Carlo simulation runner
 */
export class MonteCarloRunner {
  /**
   * Run Monte Carlo simulation for a given metric
   */
  static run(
    iterations: number,
    model: (rng: SeededRandom) => number,
    seed?: number
  ): MonteCarloResult {
    const rng = new SeededRandom(seed);
    const results: number[] = [];

    // Run all iterations
    for (let i = 0; i < iterations; i++) {
      results.push(model(rng));
    }

    // Sort results for percentile calculations
    const sorted = [...results].sort((a, b) => a - b);

    // Calculate statistics
    const mean = ss.mean(results);
    const median = ss.median(results);
    const stdDev = ss.standardDeviation(results);
    const min = Math.min(...results);
    const max = Math.max(...results);

    // Calculate percentiles
    const percentile5 = ss.percentile(sorted, 0.05);
    const percentile25 = ss.percentile(sorted, 0.25);
    const percentile75 = ss.percentile(sorted, 0.75);
    const percentile95 = ss.percentile(sorted, 0.95);

    // Generate distribution histogram (10 buckets)
    const distribution = this.generateHistogram(sorted, 10);

    // Calculate confidence interval (95%)
    const confidenceInterval: [number, number] = [
      ss.mean([percentile5, percentile25]),
      ss.mean([percentile75, percentile95])
    ];

    return {
      metric: 'value',
      iterations,
      mean,
      median,
      stdDev,
      min,
      max,
      percentile5,
      percentile25,
      percentile75,
      percentile95,
      distribution,
      confidenceInterval
    };
  }

  /**
   * Generate histogram from sorted data
   */
  private static generateHistogram(
    sorted: number[],
    buckets: number
  ): Array<{ value: number; frequency: number }> {
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;
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
   * Run sensitivity analysis
   */
  static sensitivityAnalysis(
    baseValue: number,
    factors: Array<{ name: string; impact: number; uncertainty: number }>,
    iterations: number,
    seed?: number
  ): Map<string, MonteCarloResult> {
    const rng = new SeededRandom(seed);
    const results: Map<string, number[]> = new Map();

    // Initialize result arrays
    factors.forEach(f => results.set(f.name, []));

    // Run simulation
    for (let i = 0; i < iterations; i++) {
      let value = baseValue;

      factors.forEach(factor => {
        const variation = rng.nextGaussian(0, factor.uncertainty);
        const impact = factor.impact * (1 + variation);
        value *= (1 + impact);
        results.get(factor.name)!.push(value);
      });
    }

    // Calculate statistics for each factor
    const monteCarloResults = new Map<string, MonteCarloResult>();

    results.forEach((values, name) => {
      const sorted = [...values].sort((a, b) => a - b);
      const factor = factors.find(f => f.name === name)!;

      monteCarloResults.set(name, {
        metric: name,
        iterations,
        mean: ss.mean(values),
        median: ss.median(values),
        stdDev: ss.standardDeviation(values),
        min: Math.min(...values),
        max: Math.max(...values),
        percentile5: ss.percentile(sorted, 0.05),
        percentile25: ss.percentile(sorted, 0.25),
        percentile75: ss.percentile(sorted, 0.75),
        percentile95: ss.percentile(sorted, 0.95),
        distribution: this.generateHistogram(sorted, 10),
        confidenceInterval: [
          ss.percentile(sorted, 0.05),
          ss.percentile(sorted, 0.95)
        ]
      });
    });

    return monteCarloResults;
  }
}

/**
 * Hiring plan ROI calculator
 */
export class HiringPlanCalculator {
  /**
   * Calculate ROI for a hiring plan
   */
  static calculateROI(
    scenario: HiringPlanScenario,
    baselineRevenue: number,
    baselineCosts: number,
    iterations: number = 1000
  ): MonteCarloResult {
    // Calculate deterministic values
    const totalNewHires = scenario.hires.reduce((sum, h) => sum + h.count, 0);
    const totalSalaryCost = scenario.hires.reduce(
      (sum, h) => sum + h.count * h.avgSalary,
      0
    );
    const avgProductivityGain = scenario.hires.reduce(
      (sum, h) => sum + h.productivityGain * h.count,
      0
    ) / totalNewHires;

    // Run Monte Carlo simulation
    return MonteCarloRunner.run(iterations, rng => {
      // Add uncertainty to key parameters
      const revenueMultiplier = rng.nextGaussian(1, 0.1); // 10% std dev
      const costMultiplier = rng.nextGaussian(1, 0.05); // 5% std dev
      const productivityMultiplier = rng.nextGaussian(1, 0.15); // 15% std dev

      // Calculate projected revenue with new hires
      const projectedRevenue = baselineRevenue * (1 + avgProductivityGain / 100 * productivityMultiplier);
      const revenueIncrease = projectedRevenue - baselineRevenue;

      // Calculate projected costs
      const projectedCosts = baselineCosts + totalSalaryCost * costMultiplier;
      const costIncrease = projectedCosts - baselineCosts;

      // Calculate ROI
      const netBenefit = revenueIncrease - costIncrease;
      const roi = (netBenefit / totalSalaryCost) * 100;

      return roi * revenueMultiplier;
    });
  }

  /**
   * Calculate break-even time
   */
  static calculateBreakEven(
    scenario: HiringPlanScenario,
    baselineRevenue: number,
    baselineCosts: number
  ): number {
    const totalSalaryCost = scenario.hires.reduce(
      (sum, h) => sum + h.count * h.avgSalary,
      0
    );

    const avgProductivityGain = scenario.hires.reduce(
      (sum, h) => sum + h.productivityGain * h.count,
      0
    ) / scenario.hires.reduce((sum, h) => sum + h.count, 0);

    const monthlyRevenueGain = (baselineRevenue * avgProductivityGain / 100) / 12;
    const monthlyCostIncrease = totalSalaryCost / 12;

    const monthlyNet = monthlyRevenueGain - monthlyCostIncrease;

    if (monthlyNet <= 0) {
      return Infinity; // Never breaks even
    }

    // Include ramp-up time
    const avgRampUp = scenario.hires.reduce(
      (sum, h) => sum + h.rampUpTime * h.count,
      0
    ) / scenario.hires.reduce((sum, h) => sum + h.count, 0);

    const rampUpCost = totalSalaryCost * (avgRampUp / 12);

    return rampUpCost / monthlyNet + avgRampUp;
  }
}

/**
 * Organization restructure impact calculator
 */
export class OrgRestructureCalculator {
  /**
   * Calculate impact of organizational restructure
   */
  static calculateImpact(
    scenario: OrgRestructureScenario,
    baselineCosts: number,
    baselineRevenue: number,
    totalEmployees: number,
    iterations: number = 1000
  ): MonteCarloResult {
    return MonteCarloRunner.run(iterations, rng => {
      // Base impact from layoffs
      let costSavings = 0;
      let revenueImpact = 0;

      if (scenario.layoffs) {
        // Average salary affected by layoffs
        const avgSalary = baselineCosts / totalEmployees;
        costSavings = scenario.layoffs * avgSalary * rng.nextGaussian(1, 0.1);
        // Layoffs typically reduce revenue slightly due to disruption
        revenueImpact = -scenario.layoffs * avgSalary * 0.1 * rng.nextGaussian(1, 0.2);
      }

      // Impact from new roles
      if (scenario.newRoles) {
        const newRoleCost = scenario.newRoles.reduce(
          (sum, r) => sum + r.count * r.avgSalary,
          0
        );
        costSavings -= newRoleCost * rng.nextGaussian(1, 0.05);
        revenueImpact += newRoleCost * 0.5 * rng.nextGaussian(1, 0.15); // 50% productivity
      }

      // Consolidation savings (typically 10-20% of combined budget)
      if (scenario.consolidation) {
        const consolidationSavings = scenario.consolidation.length * baselineCosts * 0.05;
        costSavings += consolidationSavings * rng.nextGaussian(1, 0.3);
      }

      // Structure efficiency gains
      const structureEfficiency = this.getStructureEfficiency(scenario.targetStructure);
      const efficiencyGain = (structureEfficiency - 1) * baselineRevenue * 0.1;
      revenueImpact += efficiencyGain * rng.nextGaussian(1, 0.2);

      // Net impact
      const netImpact = costSavings + revenueImpact;
      const roi = (netImpact / baselineCosts) * 100;

      return roi;
    });
  }

  /**
   * Get efficiency multiplier for different structures
   */
  private static getStructureEfficiency(structure: string): number {
    const efficiencies: Record<string, number> = {
      hierarchical: 1.0,
      flat: 1.15,
      matrix: 1.1,
      network: 1.2,
      holacracy: 1.05
    };
    return efficiencies[structure] ?? 1.0;
  }
}

/**
 * Process change impact calculator
 */
export class ProcessChangeCalculator {
  /**
   * Calculate impact of process changes
   */
  static calculateImpact(
    scenario: ProcessChangeScenario,
    baselineCosts: number,
    iterations: number = 1000
  ): MonteCarloResult {
    return MonteCarloRunner.run(iterations, rng => {
      // Total implementation cost
      const totalCost = scenario.implementationCost + scenario.trainingCost;

      // Annual benefits
      const timeSavingsValue = scenario.expectedBenefits.timeSavings * 52 * 50; // $50/hr
      const errorSavingsValue = scenario.expectedBenefits.errorReduction / 100 *
        baselineCosts * 0.05; // 5% of costs are error-related
      const directSavings = scenario.expectedBenefits.costSavings;

      const annualBenefit = (timeSavingsValue + errorSavingsValue + directSavings) *
        rng.nextGaussian(1, 0.2);

      // ROI calculation
      const roi = ((annualBenefit - scenario.annualMaintenanceCost || 0) / totalCost) * 100;

      return roi;
    });
  }
}

/**
 * Technology adoption ROI calculator
 */
export class TechAdoptionCalculator {
  /**
   * Calculate ROI for technology adoption
   */
  static calculateImpact(
    scenario: TechAdoptionScenario,
    baselineCosts: number,
    baselineRevenue: number,
    iterations: number = 1000
  ): MonteCarloResult {
    return MonteCarloRunner.run(iterations, rng => {
      // Total cost
      const totalCost = scenario.implementationCost + scenario.annualMaintenanceCost;

      // Productivity gains
      const revenueGain = baselineRevenue * (scenario.productivityGain / 100) *
        (scenario.adoptionRate / 100) * rng.nextGaussian(1, 0.15);

      // FTE replacement savings
      const avgSalary = baselineCosts / 100; // rough estimate
      const fteSavings = scenario.replacementFactor * avgSalary *
        rng.nextGaussian(1, 0.1);

      // Net benefit
      const netBenefit = revenueGain + fteSavings - scenario.annualMaintenanceCost;
      const roi = (netBenefit / totalCost) * 100;

      return roi;
    });
  }
}

/**
 * Risk assessment engine
 */
export class RiskAssessmentEngine {
  /**
   * Assess risks for a company scenario
   */
  static assess(
    scenario: CompanyScenario,
    financialImpact: FinancialImpact
  ): RiskAssessment {
    const risks: RiskAssessment['risks'] = [];

    // Financial risks
    if (financialImpact.costs.changePercent > 20) {
      risks.push({
        category: 'Financial',
        impact: ImpactLevel.CRITICAL,
        probability: 0.8,
        description: 'Significant cost increase may strain cash flow',
        mitigation: [
          'Phased implementation to spread costs',
          'Secure additional funding',
          'Identify cost reduction elsewhere'
        ]
      });
    }

    // Implementation risks based on scenario type
    switch (scenario.type) {
      case SimulationType.ORG_RESTUCTURE:
        risks.push(
          {
            category: 'Operational',
            impact: ImpactLevel.HIGH,
            probability: 0.6,
            description: 'Employee morale may decline during restructuring',
            mitigation: [
              'Transparent communication',
              'Employee assistance programs',
              'Clear career paths for retained staff'
            ]
          },
          {
            category: 'Knowledge',
            impact: ImpactLevel.MEDIUM,
            probability: 0.4,
            description: 'Key knowledge may be lost with departing employees',
            mitigation: [
              'Knowledge transfer sessions',
              'Documentation requirements',
              'Extended transition periods'
            ]
          }
        );
        break;

      case SimulationType.HIRING_PLAN:
        risks.push(
          {
            category: 'Talent',
            impact: ImpactLevel.HIGH,
            probability: 0.5,
            description: 'May not find qualified candidates in time',
            mitigation: [
              'Partner with recruiting firms',
              'Competitive compensation packages',
              'Remote hiring options'
            ]
          },
          {
            category: 'Integration',
            impact: ImpactLevel.MEDIUM,
            probability: 0.4,
            description: 'New hires may not integrate well with existing teams',
            mitigation: [
              'Structured onboarding program',
              'Mentorship assignments',
              'Team-building activities'
            ]
          }
        );
        break;

      case SimulationType.TECH_ADOPTION:
        risks.push(
          {
            category: 'Technical',
            impact: ImpactLevel.MEDIUM,
            probability: 0.3,
            description: 'Technology implementation may face technical challenges',
            mitigation: [
              'Proof of concept before full rollout',
              'Experienced implementation partner',
              'Buffer time for troubleshooting'
            ]
          },
          {
            category: 'Adoption',
            impact: ImpactLevel.HIGH,
            probability: 0.5,
            description: 'Users may resist adopting new technology',
            mitigation: [
              'Change management program',
              'Super-user training',
              'Incentives for adoption'
            ]
          }
        );
        break;

      case SimulationType.PROCESS_CHANGE:
        risks.push(
          {
            category: 'Execution',
            impact: ImpactLevel.MEDIUM,
            probability: 0.35,
            description: 'Process changes may disrupt ongoing work',
            mitigation: [
              'Parallel run periods',
              'Gradual rollout',
              'Rollback procedures'
            ]
          }
        );
        break;
    }

    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRiskScore(risks);

    return {
      risks,
      overallRiskScore,
      riskLevel: this.getRiskLevel(overallRiskScore)
    };
  }

  /**
   * Calculate weighted risk score
   */
  private static calculateOverallRiskScore(risks: RiskAssessment['risks']): number {
    const impactWeights: Record<ImpactLevel, number> = {
      [ImpactLevel.MINIMAL]: 5,
      [ImpactLevel.LOW]: 15,
      [ImpactLevel.MEDIUM]: 35,
      [ImpactLevel.HIGH]: 65,
      [ImpactLevel.CRITICAL]: 90
    };

    const weightedSum = risks.reduce((sum, risk) => {
      return sum + impactWeights[risk.impact] * risk.probability;
    }, 0);

    return Math.min(100, Math.round(weightedSum / risks.length));
  }

  /**
   * Get risk level from score
   */
  private static getRiskLevel(score: number): ImpactLevel {
    if (score < 15) return ImpactLevel.MINIMAL;
    if (score < 30) return ImpactLevel.LOW;
    if (score < 50) return ImpactLevel.MEDIUM;
    if (score < 70) return ImpactLevel.HIGH;
    return ImpactLevel.CRITICAL;
  }
}

/**
 * Recommendation generator
 */
export class RecommendationGenerator {
  /**
   * Generate recommendations based on simulation results
   */
  static generate(
    scenario: CompanyScenario,
    financial: FinancialImpact,
    operational: OperationalImpact,
    risks: RiskAssessment
  ): CompanySimulationResult['recommendations'] {
    const recommendations: CompanySimulationResult['recommendations'] = [];

    // Financial recommendations
    if (financial.profit.changePercent > 10) {
      recommendations.push({
        priority: 'high',
        action: 'Proceed with implementation - positive ROI expected',
        expectedImpact: `${financial.profit.changePercent.toFixed(1)}% profit improvement`,
        effort: 'medium',
        timeline: `${scenario.timeline} months`
      });
    } else if (financial.profit.changePercent > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Proceed with caution - marginal positive ROI',
        expectedImpact: `${financial.profit.changePercent.toFixed(1)}% profit improvement`,
        effort: 'medium',
        timeline: `${scenario.timeline} months`
      });
    } else {
      recommendations.push({
        priority: 'critical',
        action: 'Reconsider implementation - negative ROI projected',
        expectedImpact: `${financial.profit.changePercent.toFixed(1)}% profit decrease`,
        effort: 'low',
        timeline: 'Immediate review needed'
      });
    }

    // Risk-based recommendations
    if (risks.overallRiskScore > 50) {
      recommendations.push({
        priority: 'high',
        action: 'Implement risk mitigation strategies',
        expectedImpact: `Reduce risk score from ${risks.overallRiskScore} to target below 40`,
        effort: 'medium',
        timeline: 'Before implementation'
      });
    }

    // Operational recommendations
    if (operational.employeeImpact.displaced > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Develop transition support program for affected employees',
        expectedImpact: 'Maintain morale and reduce talent loss',
        effort: 'high',
        timeline: 'Before restructuring'
      });
    }

    // Break-even recommendations
    if (financial.breakEven > 12) {
      recommendations.push({
        priority: 'medium',
        action: 'Consider phased implementation to improve cash flow',
        expectedImpact: 'Reduce break-even period',
        effort: 'low',
        timeline: 'During planning phase'
      });
    }

    return recommendations;
  }
}

/**
 * Timeline projection engine
 */
export class TimelineProjectionEngine {
  /**
   * Generate monthly projections for simulation
   */
  static project(
    scenario: CompanyScenario,
    baseline: { revenue: number; costs: number; employees: number; efficiency: number },
    months: number,
    iterations: number = 1000
  ): Array<{
    month: number;
    revenue: number;
    costs: number;
    profit: number;
    headcount: number;
    efficiency: number;
  }> {
    const timeline: Array<{
      month: number;
      revenue: number;
      costs: number;
      profit: number;
      headcount: number;
      efficiency: number;
    }> = [];

    for (let month = 1; month <= months; month++) {
      const progress = month / scenario.timeline;
      const easing = this.easeInOutCubic(Math.min(1, progress));

      // Calculate interpolated values
      const revenue = this.interpolateRevenue(
        scenario,
        baseline.revenue,
        month,
        easing
      );
      const costs = this.interpolateCosts(
        scenario,
        baseline.costs,
        month,
        easing
      );
      const headcount = this.interpolateHeadcount(
        scenario,
        baseline.employees,
        month,
        easing
      );
      const efficiency = this.interpolateEfficiency(
        scenario,
        baseline.efficiency,
        month,
        easing
      );

      timeline.push({
        month,
        revenue,
        costs,
        profit: revenue - costs,
        headcount,
        efficiency
      });
    }

    return timeline;
  }

  /**
   * Easing function for smooth transitions
   */
  private static easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Interpolate revenue projection
   */
  private static interpolateRevenue(
    scenario: CompanyScenario,
    baseline: number,
    month: number,
    easing: number
  ): number {
    let growth = 0;

    switch (scenario.type) {
      case SimulationType.HIRING_PLAN:
        const hiringScenario = scenario as HiringPlanScenario;
        const totalProductivityGain = hiringScenario.hires.reduce(
          (sum, h) => sum + h.productivityGain * h.count,
          0
        ) / hiringScenario.hires.reduce((sum, h) => sum + h.count, 0);
        growth = (totalProductivityGain / 100) * easing;
        break;

      case SimulationType.ORG_RESTUCTURE:
        growth = 0.05 * easing; // 5% efficiency gain
        break;

      case SimulationType.TECH_ADOPTION:
        const techScenario = scenario as TechAdoptionScenario;
        growth = (techScenario.productivityGain / 100) * (techScenario.adoptionRate / 100) * easing;
        break;

      case SimulationType.PROCESS_CHANGE:
        const processScenario = scenario as ProcessChangeScenario;
        growth = ((processScenario.targetEfficiency - processScenario.currentEfficiency) / 100) * 0.1 * easing;
        break;
    }

    return baseline * (1 + growth);
  }

  /**
   * Interpolate cost projection
   */
  private static interpolateCosts(
    scenario: CompanyScenario,
    baseline: number,
    month: number,
    easing: number
  ): number {
    let change = 0;

    switch (scenario.type) {
      case SimulationType.HIRING_PLAN:
        const hiringScenario = scenario as HiringPlanScenario;
        const totalSalary = hiringScenario.hires.reduce(
          (sum, h) => sum + h.count * h.avgSalary,
          0
        );
        change = totalSalary * easing;
        break;

      case SimulationType.ORG_RESTUCTURE:
        if (scenario.layoffs) {
          const avgSalary = baseline / 100; // rough estimate
          change = -scenario.layoffs * avgSalary * easing;
        }
        break;

      case SimulationType.TECH_ADOPTION:
        const techScenario = scenario as TechAdoptionScenario;
        change = techScenario.implementationCost + techScenario.annualMaintenanceCost * (month / 12);
        break;

      case SimulationType.PROCESS_CHANGE:
        const processScenario = scenario as ProcessChangeScenario;
        change = processScenario.implementationCost + processScenario.trainingCost;
        break;
    }

    return baseline + change;
  }

  /**
   * Interpolate headcount projection
   */
  private static interpolateHeadcount(
    scenario: CompanyScenario,
    baseline: number,
    month: number,
    easing: number
  ): number {
    let change = 0;

    switch (scenario.type) {
      case SimulationType.ORG_RESTUCTURE:
        if (scenario.layoffs) {
          change = -scenario.layoffs * easing;
        }
        if (scenario.newRoles) {
          change += scenario.newRoles.reduce((sum, r) => sum + r.count, 0) * easing;
        }
        break;

      case SimulationType.HIRING_PLAN:
        const hiringScenario = scenario as HiringPlanScenario;
        change = hiringScenario.hires.reduce((sum, h) => sum + h.count, 0) * easing;
        break;
    }

    return Math.round(baseline + change);
  }

  /**
   * Interpolate efficiency projection
   */
  private static interpolateEfficiency(
    scenario: CompanyScenario,
    baseline: number,
    month: number,
    easing: number
  ): number {
    let targetEfficiency = baseline;

    switch (scenario.type) {
      case SimulationType.PROCESS_CHANGE:
        const processScenario = scenario as ProcessChangeScenario;
        targetEfficiency = processScenario.targetEfficiency;
        break;

      case SimulationType.ORG_RESTUCTURE:
        targetEfficiency = baseline + 5 * easing; // 5% improvement
        break;

      case SimulationType.TECH_ADOPTION:
        const techScenario = scenario as TechAdoptionScenario;
        targetEfficiency = baseline + techScenario.productivityGain * easing;
        break;
    }

    return Math.min(100, Math.round(baseline + (targetEfficiency - baseline) * easing));
  }
}

/**
 * Main Company Simulation Engine
 */
export class CompanySimulationEngine {
  private simulations: Map<string, CompanySimulationResult> = new Map();

  /**
   * Run a company simulation
   */
  async run(request: CompanySimulationRequest): Promise<CompanySimulationResult> {
    const startTime = Date.now();
    const id = uuidv4();

    const {
      companyId,
      scenario,
      baseline,
      parameters = {
        iterations: 1000,
        confidenceLevel: 0.95,
        timeHorizon: 12
      }
    } = request;

    // Run the appropriate simulation based on scenario type
    let monteCarloResults: MonteCarloResult[] = [];

    switch (scenario.type) {
      case SimulationType.HIRING_PLAN:
        const hiringROI = HiringPlanCalculator.calculateROI(
          scenario as HiringPlanScenario,
          baseline.currentRevenue,
          baseline.currentCosts,
          parameters.iterations
        );
        monteCarloResults.push(hiringROI);
        break;

      case SimulationType.ORG_RESTUCTURE:
        const restructureImpact = OrgRestructureCalculator.calculateImpact(
          scenario as OrgRestructureScenario,
          baseline.currentCosts,
          baseline.currentRevenue,
          baseline.employees.length,
          parameters.iterations
        );
        monteCarloResults.push(restructureImpact);
        break;

      case SimulationType.PROCESS_CHANGE:
        const processImpact = ProcessChangeCalculator.calculateImpact(
          scenario as ProcessChangeScenario,
          baseline.currentCosts,
          parameters.iterations
        );
        monteCarloResults.push(processImpact);
        break;

      case SimulationType.TECH_ADOPTION:
        const techImpact = TechAdoptionCalculator.calculateImpact(
          scenario as TechAdoptionScenario,
          baseline.currentCosts,
          baseline.currentRevenue,
          parameters.iterations
        );
        monteCarloResults.push(techImpact);
        break;
    }

    // Calculate financial impact
    const financial = this.calculateFinancialImpact(scenario, baseline, monteCarloResults[0]);

    // Calculate operational impact
    const operational = this.calculateOperationalImpact(scenario, baseline);

    // Assess risks
    const risks = RiskAssessmentEngine.assess(scenario, financial);

    // Generate timeline projections
    const timeline = TimelineProjectionEngine.project(
      scenario,
      {
        revenue: baseline.currentRevenue,
        costs: baseline.currentCosts,
        employees: baseline.employees.length,
        efficiency: baseline.departments.reduce((sum, d) => sum + d.efficiency, 0) /
          (baseline.departments.length || 1)
      },
      parameters.timeHorizon,
      parameters.iterations
    );

    // Generate recommendations
    const recommendations = RecommendationGenerator.generate(
      scenario,
      financial,
      operational,
      risks
    );

    const result: CompanySimulationResult = {
      id,
      companyId,
      scenarioType: scenario.type,
      status: 'completed',
      financial,
      operational,
      risks,
      monteCarlo: monteCarloResults,
      timeline,
      recommendations,
      metadata: {
        createdAt: new Date(),
        completedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
        iterations: parameters.iterations
      }
    };

    this.simulations.set(id, result);
    return result;
  }

  /**
   * Calculate financial impact
   */
  private calculateFinancialImpact(
    scenario: CompanyScenario,
    baseline: { currentRevenue: number; currentCosts: number },
    monteCarlo: MonteCarloResult
  ): FinancialImpact {
    let revenueChange = 0;
    let revenueChangePercent = 0;
    let costChange = 0;
    let costChangePercent = 0;

    switch (scenario.type) {
      case SimulationType.HIRING_PLAN:
        const hiringScenario = scenario as HiringPlanScenario;
        const avgProductivity = hiringScenario.hires.reduce(
          (sum, h) => sum + h.productivityGain * h.count,
          0
        ) / hiringScenario.hires.reduce((sum, h) => sum + h.count, 0);
        revenueChange = baseline.currentRevenue * (avgProductivity / 100);
        revenueChangePercent = avgProductivity;

        const totalSalary = hiringScenario.hires.reduce(
          (sum, h) => sum + h.count * h.avgSalary,
          0
        );
        costChange = totalSalary;
        costChangePercent = (totalSalary / baseline.currentCosts) * 100;
        break;

      case SimulationType.ORG_RESTUCTURE:
        if (scenario.layoffs) {
          const avgSalary = baseline.currentCosts / 100;
          costChange = -scenario.layoffs * avgSalary;
        }
        if (scenario.newRoles) {
          const newRoleCost = scenario.newRoles.reduce(
            (sum, r) => sum + r.count * r.avgSalary,
            0
          );
          costChange += newRoleCost;
        }
        costChangePercent = (costChange / baseline.currentCosts) * 100;
        revenueChange = baseline.currentRevenue * 0.05; // 5% efficiency gain
        revenueChangePercent = 5;
        break;

      case SimulationType.TECH_ADOPTION:
        const techScenario = scenario as TechAdoptionScenario;
        revenueChange = baseline.currentRevenue * (techScenario.productivityGain / 100) *
          (techScenario.adoptionRate / 100);
        costChange = techScenario.implementationCost + techScenario.annualMaintenanceCost;
        break;

      case SimulationType.PROCESS_CHANGE:
        const processScenario = scenario as ProcessChangeScenario;
        costChange = processScenario.implementationCost + processScenario.trainingCost -
          processScenario.expectedBenefits.costSavings;
        break;
    }

    const projectedRevenue = baseline.currentRevenue + revenueChange;
    const projectedCosts = baseline.currentCosts + costChange;
    const baselineProfit = baseline.currentRevenue - baseline.currentCosts;
    const projectedProfit = projectedRevenue - projectedCosts;

    const breakEven = this.calculateBreakEven(scenario, revenueChange, costChange);

    return {
      revenue: {
        baseline: baseline.currentRevenue,
        projected: projectedRevenue,
        change: revenueChange,
        changePercent: revenueChangePercent,
        confidenceInterval: [
          monteCarlo.percentile5,
          monteCarlo.percentile95
        ]
      },
      costs: {
        baseline: baseline.currentCosts,
        projected: projectedCosts,
        change: costChange,
        changePercent: costChangePercent,
        confidenceInterval: [
          baseline.currentCosts * 0.95,
          baseline.currentCosts * 1.05
        ]
      },
      profit: {
        baseline: baselineProfit,
        projected: projectedProfit,
        change: projectedProfit - baselineProfit,
        changePercent: baselineProfit !== 0
          ? ((projectedProfit - baselineProfit) / Math.abs(baselineProfit)) * 100
          : 0
      },
      breakEven
    };
  }

  /**
   * Calculate operational impact
   */
  private calculateOperationalImpact(
    scenario: CompanyScenario,
    baseline: { employees: any[]; departments: any[] }
  ): OperationalImpact {
    let affected = 0;
    let displaced = 0;
    let newHires = 0;
    let retrained = 0;

    switch (scenario.type) {
      case SimulationType.ORG_RESTUCTURE:
        affected = baseline.departments.reduce(
          (sum, d) => d.type && (scenario as OrgRestructureScenario).departmentsAffected.includes(d.type)
            ? sum + d.headCount
            : sum,
          0
        );
        displaced = (scenario as OrgRestructureScenario).layoffs || 0;
        if (scenario.newRoles) {
          newHires = scenario.newRoles.reduce((sum, r) => sum + r.count, 0);
        }
        break;

      case SimulationType.HIRING_PLAN:
        const hiringScenario = scenario as HiringPlanScenario;
        newHires = hiringScenario.hires.reduce((sum, h) => sum + h.count, 0);
        affected = newHires;
        break;

      case SimulationType.PROCESS_CHANGE:
        affected = (scenario as ProcessChangeScenario).affectedEmployees;
        retrained = affected;
        break;

      case SimulationType.TECH_ADOPTION:
        const techScenario = scenario as TechAdoptionScenario;
        affected = baseline.employees.filter(
          e => techScenario.departments.includes(e.department)
        ).length;
        displaced = Math.round(affected * (techScenario.replacementFactor / 100));
        break;
    }

    return {
      productivity: {
        baseline: 70,
        projected: this.calculateProjectedProductivity(scenario),
        change: 0,
        changePercent: 0
      },
      efficiency: {
        baseline: 75,
        projected: 80,
        change: 5,
        changePercent: 6.67
      },
      employeeImpact: {
        affected,
        displaced,
        newHires,
        retrained
      },
      timeline: {
        implementation: scenario.timeline,
        fullAdoption: scenario.timeline * 1.5,
        stabilization: scenario.timeline * 2
      }
    };
  }

  /**
   * Calculate projected productivity
   */
  private calculateProjectedProductivity(scenario: CompanyScenario): number {
    switch (scenario.type) {
      case SimulationType.HIRING_PLAN:
        const hiringScenario = scenario as HiringPlanScenario;
        return 70 + hiringScenario.hires.reduce(
          (sum, h) => sum + h.productivityGain,
          0
        ) / hiringScenario.hires.length;

      case SimulationType.TECH_ADOPTION:
        return 70 + (scenario as TechAdoptionScenario).productivityGain;

      case SimulationType.PROCESS_CHANGE:
        const processScenario = scenario as ProcessChangeScenario;
        return 70 + (processScenario.targetEfficiency - processScenario.currentEfficiency);

      default:
        return 75;
    }
  }

  /**
   * Calculate break-even point
   */
  private calculateBreakEven(
    scenario: CompanyScenario,
    revenueChange: number,
    costChange: number
  ): number {
    const monthlyRevenueGain = revenueChange / 12;
    const monthlyCostIncrease = costChange / 12;
    const monthlyNet = monthlyRevenueGain - monthlyCostIncrease;

    if (monthlyNet <= 0) {
      return Infinity;
    }

    const upfrontCosts = this.getUpfrontCosts(scenario);
    return upfrontCosts / monthlyNet;
  }

  /**
   * Get upfront costs for scenario
   */
  private getUpfrontCosts(scenario: CompanyScenario): number {
    switch (scenario.type) {
      case SimulationType.HIRING_PLAN:
        const hiringScenario = scenario as HiringPlanScenario;
        const avgRampUp = hiringScenario.hires.reduce(
          (sum, h) => sum + h.rampUpTime * h.count,
          0
        ) / hiringScenario.hires.reduce((sum, h) => sum + h.count, 0);
        return hiringScenario.hires.reduce((sum, h) => sum + h.count * h.avgSalary, 0) *
          (avgRampUp / 12);

      case SimulationType.TECH_ADOPTION:
        return (scenario as TechAdoptionScenario).implementationCost;

      case SimulationType.PROCESS_CHANGE:
        const processScenario = scenario as ProcessChangeScenario;
        return processScenario.implementationCost + processScenario.trainingCost;

      default:
        return 0;
    }
  }

  /**
   * Get simulation by ID
   */
  get(id: string): CompanySimulationResult | undefined {
    return this.simulations.get(id);
  }

  /**
   * List all simulations
   */
  list(): CompanySimulationResult[] {
    return Array.from(this.simulations.values());
  }
}
