import {
  ScenarioDefinition,
  ScenarioCategory,
  DEFAULT_IMPACT_COEFFICIENTS,
} from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export interface ModelOutput {
  csat: number;
  revenue: number;
  churn: number;
  supportCost: number;
  netRevenue: number;
}

export interface ModelContext {
  scenario: ScenarioDefinition;
  parameters: Map<string, number>;
  baseline: ModelOutput;
}

class ModelRunner {
  /**
   * Run the simulation model with given parameters
   */
  async runModel(
    scenario: ScenarioDefinition,
    parameters: Map<string, number>
  ): Promise<ModelOutput> {
    logger.debug(`Running model for scenario: ${scenario.name}`);

    // Get baseline metrics
    const baseline = this.getBaselineMetrics(scenario);

    // Apply scenario-specific transformations
    const transformedParams = this.transformParameters(scenario, parameters);

    // Run impact calculations
    const output = this.calculateModelOutput(scenario, baseline, transformedParams);

    return output;
  }

  /**
   * Get baseline metrics for the scenario
   */
  private getBaselineMetrics(scenario: ScenarioDefinition): ModelOutput {
    // In production, this would fetch from historical data
    // For now, use realistic defaults based on scenario category
    const baseValues: Record<ScenarioCategory, ModelOutput> = {
      [ScenarioCategory.PRICING]: {
        csat: 0.72,
        revenue: 950000,
        churn: 0.055,
        supportCost: 55000,
        netRevenue: 895000,
      },
      [ScenarioCategory.REFUND]: {
        csat: 0.75,
        revenue: 1000000,
        churn: 0.05,
        supportCost: 50000,
        netRevenue: 950000,
      },
      [ScenarioCategory.PROMOTION]: {
        csat: 0.78,
        revenue: 1050000,
        churn: 0.045,
        supportCost: 48000,
        netRevenue: 1002000,
      },
      [ScenarioCategory.SERVICE]: {
        csat: 0.70,
        revenue: 920000,
        churn: 0.06,
        supportCost: 60000,
        netRevenue: 860000,
      },
      [ScenarioCategory.OPERATIONAL]: {
        csat: 0.74,
        revenue: 980000,
        churn: 0.052,
        supportCost: 52000,
        netRevenue: 928000,
      },
      [ScenarioCategory.CUSTOMER]: {
        csat: 0.73,
        revenue: 960000,
        churn: 0.054,
        supportCost: 53000,
        netRevenue: 907000,
      },
      [ScenarioCategory.FINANCIAL]: {
        csat: 0.76,
        revenue: 1020000,
        churn: 0.048,
        supportCost: 49000,
        netRevenue: 971000,
      },
      [ScenarioCategory.MARKETING]: {
        csat: 0.77,
        revenue: 1030000,
        churn: 0.047,
        supportCost: 48500,
        netRevenue: 981500,
      },
    };

    return baseValues[scenario.category] || baseValues[ScenarioCategory.OPERATIONAL];
  }

  /**
   * Transform parameters based on scenario type
   */
  private transformParameters(
    scenario: ScenarioDefinition,
    parameters: Map<string, number>
  ): Map<string, number> {
    const transformed = new Map<string, number>();

    for (const param of scenario.parameters) {
      const proposed = parameters.get(param.name) || param.proposedValue;
      const current = param.currentValue;

      // Calculate change ratio
      const changeRatio = proposed / current;

      // Apply transformations based on parameter category
      switch (param.category) {
        case ScenarioCategory.REFUND:
          // Refund changes affect CSAT and support cost
          transformed.set(`${param.name}_csatImpact`, this.calculateRefundCsatImpact(changeRatio));
          transformed.set(`${param.name}_supportImpact`, this.calculateRefundSupportImpact(changeRatio));
          break;

        case ScenarioCategory.PRICING:
          // Price changes affect revenue and churn
          transformed.set(`${param.name}_revenueImpact`, this.calculatePriceRevenueImpact(changeRatio));
          transformed.set(`${param.name}_churnImpact`, this.calculatePriceChurnImpact(changeRatio));
          break;

        case ScenarioCategory.PROMOTION:
          // Promotion changes affect revenue and CSAT
          transformed.set(`${param.name}_revenueImpact`, this.calculatePromotionRevenueImpact(changeRatio));
          transformed.set(`${param.name}_csatImpact`, this.calculatePromotionCsatImpact(changeRatio));
          break;

        case ScenarioCategory.SERVICE:
          // Service changes affect CSAT and churn
          transformed.set(`${param.name}_csatImpact`, this.calculateServiceCsatImpact(changeRatio));
          transformed.set(`${param.name}_churnImpact`, this.calculateServiceChurnImpact(changeRatio));
          break;

        default:
          // Generic impact calculation
          transformed.set(`${param.name}_impact`, this.calculateGenericImpact(changeRatio));
      }

      transformed.set(param.name, proposed);
      transformed.set(`${param.name}_changeRatio`, changeRatio);
    }

    return transformed;
  }

  private calculateRefundCsatImpact(changeRatio: number): number {
    // Higher refunds generally improve CSAT
    const refundSensitivity = DEFAULT_IMPACT_COEFFICIENTS.csat.refundSensitivity;
    return (changeRatio - 1) * refundSensitivity;
  }

  private calculateRefundSupportImpact(changeRatio: number): number {
    // Higher refunds increase support costs
    const refundCostFactor = DEFAULT_IMPACT_COEFFICIENTS.supportCost.refundAmount;
    return (changeRatio - 1) * refundCostFactor;
  }

  private calculatePriceRevenueImpact(changeRatio: number): number {
    // Price increases increase revenue per unit but may decrease volume
    const netEffect = changeRatio - 1;
    const volumeReduction = Math.min(netEffect * 1.5, -0.2); // Max 20% volume drop
    return netEffect + (volumeReduction * 0.5 * changeRatio);
  }

  private calculatePriceChurnImpact(changeRatio: number): number {
    // Higher prices increase churn
    const churnSensitivity = DEFAULT_IMPACT_COEFFICIENTS.churn.refundFrequency;
    return (changeRatio - 1) * churnSensitivity;
  }

  private calculatePromotionRevenueImpact(changeRatio: number): number {
    // Promotions increase volume but may reduce margin
    const baseLift = changeRatio - 1;
    const marginImpact = -baseLift * 0.3; // 30% margin reduction
    return baseLift + marginImpact;
  }

  private calculatePromotionCsatImpact(changeRatio: number): number {
    // Promotions have positive but diminishing CSAT impact
    const impact = Math.min((changeRatio - 1) * 0.5, 0.05);
    return impact;
  }

  private calculateServiceCsatImpact(changeRatio: number): number {
    // Better service improves CSAT
    const resolutionRate = DEFAULT_IMPACT_COEFFICIENTS.csat.resolutionRate;
    return (changeRatio - 1) * resolutionRate;
  }

  private calculateServiceChurnImpact(changeRatio: number): number {
    // Better service reduces churn
    const churnImpact = DEFAULT_IMPACT_COEFFICIENTS.churn.csatImpact;
    return (changeRatio - 1) * churnImpact;
  }

  private calculateGenericImpact(changeRatio: number): number {
    return (changeRatio - 1) * 0.5;
  }

  /**
   * Calculate the final model output
   */
  private calculateModelOutput(
    scenario: ScenarioDefinition,
    baseline: ModelOutput,
    params: Map<string, number>
  ): ModelOutput {
    // Extract change impacts from parameters
    let csatChange = 0;
    let revenueChange = 0;
    let churnChange = 0;
    let supportCostChange = 0;

    for (const [key, value] of params.entries()) {
      if (key.endsWith('_csatImpact')) {
        csatChange += value;
      } else if (key.endsWith('_revenueImpact')) {
        revenueChange += value;
      } else if (key.endsWith('_churnImpact')) {
        churnChange += value;
      } else if (key.endsWith('_supportImpact')) {
        supportCostChange += value;
      } else if (key.endsWith('_impact')) {
        // Apply generic impact evenly
        csatChange += value * 0.3;
        revenueChange += value * 0.3;
        churnChange += value * 0.2;
        supportCostChange += value * 0.2;
      }
    }

    // Calculate projected values
    const projectedCsat = Math.max(0, Math.min(1, baseline.csat * (1 + csatChange)));
    const projectedRevenue = baseline.revenue * (1 + revenueChange);
    const projectedChurn = Math.max(0, baseline.churn * (1 + churnChange));
    const projectedSupportCost = baseline.supportCost * (1 + supportCostChange);
    const projectedNetRevenue = projectedRevenue - projectedSupportCost;

    return {
      csat: projectedCsat,
      revenue: projectedRevenue,
      churn: projectedChurn,
      supportCost: projectedSupportCost,
      netRevenue: projectedNetRevenue,
    };
  }

  /**
   * Run sensitivity analysis on a parameter
   */
  async runSensitivityAnalysis(
    scenario: ScenarioDefinition,
    parameterName: string,
    minValue: number,
    maxValue: number,
    steps: number = 10
  ): Promise<Array<{ value: number; output: ModelOutput }>> {
    const results: Array<{ value: number; output: ModelOutput }> = [];
    const stepSize = (maxValue - minValue) / steps;

    for (let i = 0; i <= steps; i++) {
      const value = minValue + (stepSize * i);
      const parameters = new Map([[parameterName, value]]);
      const output = await this.runModel(scenario, parameters);
      results.push({ value, output });
    }

    return results;
  }

  /**
   * Run comparative analysis between scenarios
   */
  async runComparativeAnalysis(
    scenarios: ScenarioDefinition[]
  ): Promise<Map<string, ModelOutput>> {
    const results = new Map<string, ModelOutput>();

    for (const scenario of scenarios) {
      const parameters = new Map(
        scenario.parameters.map(p => [p.name, p.proposedValue])
      );
      const output = await this.runModel(scenario, parameters);
      results.set(scenario.id, output);
    }

    return results;
  }

  /**
   * Validate model inputs
   */
  validateInputs(
    scenario: ScenarioDefinition,
    parameters: Map<string, number>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate all scenario parameters are provided
    for (const param of scenario.parameters) {
      const value = parameters.get(param.name);
      if (value === undefined) {
        errors.push(`Missing parameter: ${param.name}`);
        continue;
      }

      // Check bounds if specified
      if (param.minValue !== undefined && value < param.minValue) {
        errors.push(
          `Parameter "${param.name}" value ${value} is below minimum ${param.minValue}`
        );
      }
      if (param.maxValue !== undefined && value > param.maxValue) {
        errors.push(
          `Parameter "${param.name}" value ${value} exceeds maximum ${param.maxValue}`
        );
      }
    }

    // Validate scenario constraints
    const constraints = scenario.constraints;
    for (const [key, constraintValue] of Object.entries(constraints)) {
      const param = scenario.parameters.find(p => p.name === key);
      if (param) {
        const proposedValue = parameters.get(key);
        if (proposedValue !== undefined && proposedValue > constraintValue) {
          errors.push(
            `Constraint violation: ${key} proposed value ${proposedValue} exceeds constraint ${constraintValue}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const modelRunner = new ModelRunner();
