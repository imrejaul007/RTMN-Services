import {
  ScenarioDefinition,
  ImpactSummary,
  MetricImpact,
  StatisticalMetrics,
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

export interface ImpactModel {
  metric: string;
  baseline: number;
  projected: number;
  change: number;
  changePercent: number;
  confidence: number;
}

export interface Projections {
  csat: number;
  revenue: number;
  churn: number;
  supportCost: number;
  netRevenue: number;
}

class ImpactCalculator {
  /**
   * Calculate the impact summary from projections
   */
  calculateImpactSummary(
    projections: {
      csat: { baseline: number; statistics: StatisticalMetrics };
      revenue: { baseline: number; statistics: StatisticalMetrics };
      churn: { baseline: number; statistics: StatisticalMetrics };
      supportCost: { baseline: number; statistics: StatisticalMetrics };
      netRevenue: { baseline: number; statistics: StatisticalMetrics };
    }
  ): ImpactSummary {
    const csat = this.calculateMetricImpact(
      projections.csat.baseline,
      projections.csat.statistics.mean,
      'csat'
    );

    const revenue = this.calculateMetricImpact(
      projections.revenue.baseline,
      projections.revenue.statistics.mean,
      'revenue'
    );

    const churn = this.calculateMetricImpact(
      projections.churn.baseline,
      projections.churn.statistics.mean,
      'churn',
      true // Lower is better
    );

    const supportCost = this.calculateMetricImpact(
      projections.supportCost.baseline,
      projections.supportCost.statistics.mean,
      'supportCost',
      true // Lower is better
    );

    const netImpact = this.calculateMetricImpact(
      projections.netRevenue.baseline,
      projections.netRevenue.statistics.mean,
      'netRevenue'
    );

    return { csat, revenue, churn, supportCost, netImpact };
  }

  /**
   * Calculate impact for a single metric
   */
  calculateMetricImpact(
    baseline: number,
    projected: number,
    metric: string,
    lowerIsBetter: boolean = false
  ): MetricImpact {
    const change = projected - baseline;
    const changePercent = baseline !== 0 ? (change / baseline) * 100 : 0;

    // Calculate confidence based on the reliability of projections
    // This is a simplified confidence calculation
    const confidence = this.calculateConfidence(baseline, projected, lowerIsBetter);

    return {
      metric,
      baseline,
      projected,
      change,
      changePercent,
      confidence,
    };
  }

  /**
   * Calculate projection values based on scenario and statistics
   */
  calculateProjections(
    scenario: ScenarioDefinition,
    baseline: {
      csat: number;
      revenue: number;
      churn: number;
      supportCost: number;
      netRevenue: number;
    },
    statistics: Record<string, StatisticalMetrics>
  ): Projections {
    // Extract parameter impacts
    const impacts = this.extractParameterImpacts(scenario);

    // Apply category-specific impact models
    const projected = this.applyImpactModel(scenario.category, baseline, impacts);

    return projected;
  }

  /**
   * Extract parameter impacts from scenario
   */
  private extractParameterImpacts(scenario: ScenarioDefinition): Record<string, number> {
    const impacts: Record<string, number> = {};

    for (const param of scenario.parameters) {
      const changeRatio = param.proposedValue / param.currentValue;
      const changePercent = (changeRatio - 1) * 100;

      impacts[param.name] = changePercent;
      impacts[`${param.name}_changeRatio`] = changeRatio;
      impacts[param.category] = changePercent;
    }

    return impacts;
  }

  /**
   * Apply category-specific impact model
   */
  private applyImpactModel(
    category: ScenarioCategory,
    baseline: {
      csat: number;
      revenue: number;
      churn: number;
      supportCost: number;
      netRevenue: number;
    },
    impacts: Record<string, number>
  ): Projections {
    const { csat: csatCoeffs, revenue: revenueCoeffs, churn: churnCoeffs, supportCost: supportCoeffs } = DEFAULT_IMPACT_COEFFICIENTS;

    let csatImpact = 0;
    let revenueImpact = 0;
    let churnImpact = 0;
    let supportImpact = 0;

    // Calculate impacts based on category
    switch (category) {
      case ScenarioCategory.REFUND:
        const refundChange = impacts['refund_rate'] || impacts['refundChange'] || impacts[ScenarioCategory.REFUND] || 0;
        csatImpact = refundChange * csatCoeffs.refundSensitivity;
        supportImpact = refundChange * supportCoeffs.refundAmount;
        revenueImpact = refundChange * revenueCoeffs.refundRate;
        churnImpact = refundChange * churnCoeffs.refundFrequency * 0.5;
        break;

      case ScenarioCategory.PRICING:
        const priceChange = impacts['price'] || impacts['priceChange'] || impacts[ScenarioCategory.PRICING] || 0;
        revenueImpact = priceChange * 0.8 - Math.min(priceChange * 1.5, 20) * 0.5; // Volume reduction effect
        churnImpact = priceChange * churnCoeffs.refundFrequency * 0.3;
        csatImpact = priceChange * 0.05;
        supportImpact = priceChange * 0.02;
        break;

      case ScenarioCategory.PROMOTION:
        const promoChange = impacts['promotion'] || impacts['promoChange'] || impacts[ScenarioCategory.PROMOTION] || 0;
        revenueImpact = promoChange * revenueCoeffs.promotionUplift - promoChange * 0.3; // Margin impact
        csatImpact = Math.min(promoChange * 0.1, 5);
        churnImpact = -promoChange * 0.05;
        supportImpact = promoChange * 0.03;
        break;

      case ScenarioCategory.SERVICE:
        const serviceChange = impacts['service'] || impacts['serviceLevel'] || impacts[ScenarioCategory.SERVICE] || 0;
        csatImpact = serviceChange * csatCoeffs.resolutionRate;
        churnImpact = serviceChange * churnCoeffs.csatImpact;
        supportImpact = -serviceChange * supportCoeffs.csatImpact;
        revenueImpact = serviceChange * csatImpact * revenueCoeffs.csatImpact * 0.5;
        break;

      case ScenarioCategory.CUSTOMER:
        const customerChange = impacts['customer'] || impacts['customerChange'] || impacts[ScenarioCategory.CUSTOMER] || 0;
        csatImpact = customerChange * 0.4;
        churnImpact = -customerChange * 0.3;
        revenueImpact = customerChange * revenueCoeffs.csatImpact * 2;
        supportImpact = -customerChange * 0.1;
        break;

      case ScenarioCategory.OPERATIONAL:
        const opsChange = impacts['operational'] || impacts['opsEfficiency'] || impacts[ScenarioCategory.OPERATIONAL] || 0;
        supportImpact = -opsChange * supportCoeffs.complexityFactor * 0.5;
        revenueImpact = opsChange * 0.1;
        csatImpact = opsChange * 0.05;
        churnImpact = -opsChange * 0.05;
        break;

      case ScenarioCategory.FINANCIAL:
        const financialChange = impacts['financial'] || impacts['financialChange'] || impacts[ScenarioCategory.FINANCIAL] || 0;
        revenueImpact = financialChange * 0.15;
        supportImpact = financialChange * 0.02;
        csatImpact = financialChange * 0.05;
        churnImpact = financialChange * 0.03;
        break;

      case ScenarioCategory.MARKETING:
        const marketingChange = impacts['marketing'] || impacts['marketingSpend'] || impacts[ScenarioCategory.MARKETING] || 0;
        revenueImpact = marketingChange * 0.2 - marketingChange * 0.1; // Spend vs ROI
        csatImpact = marketingChange * 0.03;
        churnImpact = -marketingChange * 0.02;
        supportImpact = marketingChange * 0.01;
        break;

      default:
        // Generic impact calculation
        const totalImpact = Object.values(impacts).reduce((a, b) => a + b, 0) / Math.max(Object.keys(impacts).length, 1);
        csatImpact = totalImpact * 0.3;
        revenueImpact = totalImpact * 0.4;
        churnImpact = -totalImpact * 0.2;
        supportImpact = -totalImpact * 0.1;
    }

    // Apply impacts to baseline values
    const projectedCsat = Math.max(0, Math.min(1, baseline.csat * (1 + csatImpact / 100)));
    const projectedRevenue = baseline.revenue * (1 + revenueImpact / 100);
    const projectedChurn = Math.max(0, baseline.churn * (1 + churnImpact / 100));
    const projectedSupportCost = baseline.supportCost * (1 + supportImpact / 100);
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
   * Calculate confidence score for projections
   */
  private calculateConfidence(
    baseline: number,
    projected: number,
    lowerIsBetter: boolean
  ): number {
    // Base confidence
    let confidence = 0.7;

    // Increase confidence for smaller changes (more predictable)
    const changeRatio = Math.abs(projected / baseline - 1);
    if (changeRatio < 0.05) {
      confidence += 0.15;
    } else if (changeRatio < 0.1) {
      confidence += 0.1;
    } else if (changeRatio < 0.2) {
      confidence += 0.05;
    }

    // Adjust based on direction
    if (lowerIsBetter && projected < baseline) {
      confidence += 0.05;
    } else if (!lowerIsBetter && projected > baseline) {
      confidence += 0.05;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Calculate ROI for scenario
   */
  calculateROI(
    projectedRevenue: number,
    baselineRevenue: number,
    implementationCost: number
  ): {
    roi: number;
    paybackPeriod: number; // in months
    netBenefit: number;
  } {
    const netBenefit = projectedRevenue - baselineRevenue;
    const roi = implementationCost > 0 ? ((netBenefit - implementationCost) / implementationCost) * 100 : 0;
    const paybackPeriod = netBenefit > 0 ? (implementationCost / (netBenefit / 12)) : Infinity;

    return { roi, paybackPeriod, netBenefit };
  }

  /**
   * Calculate compound impact across multiple metrics
   */
  calculateCompoundImpact(
    metrics: MetricImpact[]
  ): {
    totalPositive: number;
    totalNegative: number;
    netScore: number;
    weightedScore: number;
  } {
    // Weight factors for different metrics
    const weights: Record<string, number> = {
      csat: 0.25,
      revenue: 0.35,
      churn: 0.2,
      supportCost: 0.1,
      netImpact: 0.1,
    };

    let totalPositive = 0;
    let totalNegative = 0;
    let weightedScore = 0;

    for (const metric of metrics) {
      if (metric.changePercent > 0) {
        totalPositive += metric.changePercent;
      } else {
        totalNegative += Math.abs(metric.changePercent);
      }

      const weight = weights[metric.metric] || 0.1;
      weightedScore += (metric.changePercent / 100) * weight * metric.confidence;
    }

    return {
      totalPositive,
      totalNegative,
      netScore: totalPositive - totalNegative,
      weightedScore: weightedScore * 100,
    };
  }

  /**
   * Calculate what-if scenario impact
   */
  calculateWhatIfImpact(
    scenarioName: string,
    baseline: {
      csat: number;
      revenue: number;
      churn: number;
      supportCost: number;
    },
    proposed: {
      csat: number;
      revenue: number;
      churn: number;
      supportCost: number;
    }
  ): {
    scenario: string;
    impactSummary: ImpactSummary;
    compoundImpact: ReturnType<typeof this.calculateCompoundImpact>;
    recommendation: 'implement' | 'pilot' | 'monitor' | 'avoid';
    reasoning: string;
  } {
    const impactSummary = this.calculateImpactSummary({
      csat: { baseline: baseline.csat, statistics: { mean: proposed.csat, median: proposed.csat, stdDev: 0, min: proposed.csat * 0.95, max: proposed.csat * 1.05, percentile25: proposed.csat * 0.97, percentile75: proposed.csat * 1.03, percentile95: proposed.csat * 1.05, percentile99: proposed.csat * 1.08, variance: 0 } },
      revenue: { baseline: baseline.revenue, statistics: { mean: proposed.revenue, median: proposed.revenue, stdDev: baseline.revenue * 0.02, min: proposed.revenue * 0.95, max: proposed.revenue * 1.05, percentile25: proposed.revenue * 0.98, percentile75: proposed.revenue * 1.02, percentile95: proposed.revenue * 1.05, percentile99: proposed.revenue * 1.08, variance: 0 } },
      churn: { baseline: baseline.churn, statistics: { mean: proposed.churn, median: proposed.churn, stdDev: baseline.churn * 0.05, min: proposed.churn * 0.9, max: proposed.churn * 1.1, percentile25: proposed.churn * 0.95, percentile75: proposed.churn * 1.05, percentile95: proposed.churn * 1.1, percentile99: proposed.churn * 1.15, variance: 0 } },
      supportCost: { baseline: baseline.supportCost, statistics: { mean: proposed.supportCost, median: proposed.supportCost, stdDev: baseline.supportCost * 0.03, min: proposed.supportCost * 0.9, max: proposed.supportCost * 1.1, percentile25: proposed.supportCost * 0.95, percentile75: proposed.supportCost * 1.05, percentile95: proposed.supportCost * 1.1, percentile99: proposed.supportCost * 1.15, variance: 0 } },
      netRevenue: { baseline: baseline.revenue - baseline.supportCost, statistics: { mean: proposed.revenue - proposed.supportCost, median: proposed.revenue - proposed.supportCost, stdDev: baseline.revenue * 0.02, min: (baseline.revenue - baseline.supportCost) * 0.9, max: (baseline.revenue - baseline.supportCost) * 1.1, percentile25: (baseline.revenue - baseline.supportCost) * 0.95, percentile75: (baseline.revenue - baseline.supportCost) * 1.05, percentile95: (baseline.revenue - baseline.supportCost) * 1.1, percentile99: (baseline.revenue - baseline.supportCost) * 1.15, variance: 0 } },
    });

    const compoundImpact = this.calculateCompoundImpact([
      impactSummary.csat,
      impactSummary.revenue,
      impactSummary.churn,
      impactSummary.supportCost,
      impactSummary.netImpact,
    ]);

    // Determine recommendation
    let recommendation: 'implement' | 'pilot' | 'monitor' | 'avoid';
    let reasoning: string;

    if (compoundImpact.weightedScore > 5 && impactSummary.netImpact.changePercent > 5) {
      recommendation = 'implement';
      reasoning = 'Strong positive projected impact across multiple metrics';
    } else if (compoundImpact.weightedScore > 2 && impactSummary.netImpact.changePercent > 2) {
      recommendation = 'pilot';
      reasoning = 'Moderate positive impact - recommend piloting before full implementation';
    } else if (compoundImpact.weightedScore >= -2) {
      recommendation = 'monitor';
      reasoning = 'Minimal projected impact - monitor closely if implemented';
    } else {
      recommendation = 'avoid';
      reasoning = 'Negative projected impact across multiple metrics';
    }

    return {
      scenario: scenarioName,
      impactSummary,
      compoundImpact,
      recommendation,
      reasoning,
    };
  }
}

export const impactCalculator = new ImpactCalculator();
