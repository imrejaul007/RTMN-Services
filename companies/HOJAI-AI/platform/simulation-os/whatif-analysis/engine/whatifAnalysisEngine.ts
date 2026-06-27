import { v4 as uuidv4 } from 'uuid';
import * as ss from 'simple-statistics';
import {
  WhatIfAnalysisRequest,
  WhatIfResult,
  WhatIfQuestion,
  WhatIfVariable,
  ChangeAssumption,
  WhatIfProjection,
  ImpactAnalysis,
  ScenarioComparison,
  WhatIfTemplate,
  QuestionType,
  VariableType
} from '../models/whatifAnalysis.js';
import { SeededRandom, MonteCarloRunner } from '../../company-simulation/engine/companySimulationEngine.js';

// ============================================================================
// What-If Analysis Engine - Core simulation algorithms
// ============================================================================

/**
 * Natural language parser for what-if questions
 */
export class NaturalLanguageParser {
  /**
   * Parse a natural language question into structured what-if analysis
   */
  static parse(question: string): {
    type: QuestionType;
    variables: WhatIfVariable[];
    changes: ChangeAssumption[];
  } {
    const lowerQuestion = question.toLowerCase();

    // Detect question type
    let type = this.detectType(lowerQuestion);

    // Extract variables and changes based on type
    const { variables, changes } = this.extractVariablesAndChanges(question, type);

    return { type, variables, changes };
  }

  /**
   * Detect the type of what-if question
   */
  private static detectType(question: string): QuestionType {
    if (question.includes('hire') || question.includes('employee') || question.includes('headcount')) {
      return QuestionType.HIRING;
    }
    if (question.includes('price') || question.includes('pricing') || question.includes('discount')) {
      return QuestionType.PRICING;
    }
    if (question.includes('competitor') || question.includes('market share') || question.includes('market entry')) {
      return QuestionType.MARKET;
    }
    if (question.includes('cost') || question.includes('revenue') || question.includes('profit') || question.includes('margin')) {
      return QuestionType.FINANCIAL;
    }
    if (question.includes('process') || question.includes('efficiency') || question.includes('automation')) {
      return QuestionType.OPERATIONS;
    }
    if (question.includes('technology') || question.includes('software') || question.includes('ai') || question.includes('automation')) {
      return QuestionType.TECHNOLOGY;
    }
    if (question.includes('org') || question.includes('restructure') || question.includes('department') || question.includes('team')) {
      return QuestionType.ORGANIZATION;
    }
    return QuestionType.CUSTOM;
  }

  /**
   * Extract variables and changes from question
   */
  private static extractVariablesAndChanges(
    question: string,
    type: QuestionType
  ): { variables: WhatIfVariable[]; changes: ChangeAssumption[] } {
    const variables: WhatIfVariable[] = [];
    const changes: ChangeAssumption[] = [];

    // Extract numbers from the question
    const numbers = question.match(/\d+/g)?.map(Number) || [];

    switch (type) {
      case QuestionType.HIRING:
        const hires = numbers[0] || 10;
        variables.push(
          { id: 'num_hires', name: 'Number of Hires', type: VariableType.NUMBER, currentValue: hires, min: 1, max: 100 },
          { id: 'avg_salary', name: 'Average Salary', type: VariableType.CURRENCY, currentValue: 80000, min: 30000, max: 300000, unit: '$' },
          { id: 'productivity_gain', name: 'Productivity Gain', type: VariableType.PERCENTAGE, currentValue: 15, min: 0, max: 100, unit: '%' }
        );
        changes.push(
          { id: uuidv4(), variableId: 'num_hires', newValue: hires, changeType: 'absolute' },
          { id: uuidv4(), variableId: 'avg_salary', newValue: 80000, changeType: 'absolute' }
        );
        break;

      case QuestionType.PRICING:
        const priceChange = numbers[0] || 10;
        variables.push(
          { id: 'current_price', name: 'Current Price', type: VariableType.CURRENCY, currentValue: 100, unit: '$' },
          { id: 'price_change', name: 'Price Change', type: VariableType.PERCENTAGE, currentValue: priceChange, min: -50, max: 100, unit: '%' },
          { id: 'elasticity', name: 'Price Elasticity', type: VariableType.NUMBER, currentValue: -1.5, min: -5, max: 0 }
        );
        changes.push(
          { id: uuidv4(), variableId: 'price_change', newValue: priceChange, changeType: 'percentage' }
        );
        break;

      case QuestionType.MARKET:
        const marketShareChange = numbers[0] || 5;
        variables.push(
          { id: 'current_share', name: 'Current Market Share', type: VariableType.PERCENTAGE, currentValue: 20, min: 0, max: 100, unit: '%' },
          { id: 'share_change', name: 'Market Share Change', type: VariableType.PERCENTAGE, currentValue: marketShareChange, min: -20, max: 50, unit: '%' },
          { id: 'market_size', name: 'Market Size', type: VariableType.CURRENCY, currentValue: 10000000, unit: '$' }
        );
        changes.push(
          { id: uuidv4(), variableId: 'share_change', newValue: marketShareChange, changeType: 'percentage' }
        );
        break;

      case QuestionType.FINANCIAL:
        variables.push(
          { id: 'revenue', name: 'Revenue', type: VariableType.CURRENCY, currentValue: 1000000, unit: '$' },
          { id: 'costs', name: 'Costs', type: VariableType.CURRENCY, currentValue: 700000, unit: '$' },
          { id: 'cost_change', name: 'Cost Change', type: VariableType.PERCENTAGE, currentValue: numbers[0] || 5, min: -20, max: 50, unit: '%' }
        );
        changes.push(
          { id: uuidv4(), variableId: 'cost_change', newValue: numbers[0] || 5, changeType: 'percentage' }
        );
        break;

      case QuestionType.OPERATIONS:
        const efficiencyGain = numbers[0] || 20;
        variables.push(
          { id: 'current_efficiency', name: 'Current Efficiency', type: VariableType.PERCENTAGE, currentValue: 70, min: 0, max: 100, unit: '%' },
          { id: 'efficiency_gain', name: 'Efficiency Improvement', type: VariableType.PERCENTAGE, currentValue: efficiencyGain, min: 0, max: 50, unit: '%' },
          { id: 'time_savings', name: 'Time Savings', type: VariableType.NUMBER, currentValue: 5, min: 0, max: 40, unit: 'hrs/week' }
        );
        changes.push(
          { id: uuidv4(), variableId: 'efficiency_gain', newValue: efficiencyGain, changeType: 'percentage' }
        );
        break;

      default:
        variables.push(
          { id: 'impact_factor', name: 'Impact Factor', type: VariableType.PERCENTAGE, currentValue: numbers[0] || 10, min: -50, max: 100, unit: '%' }
        );
        changes.push(
          { id: uuidv4(), variableId: 'impact_factor', newValue: numbers[0] || 10, changeType: 'percentage' }
        );
    }

    return { variables, changes };
  }
}

/**
 * What-If calculation engine
 */
export class WhatIfCalculationEngine {
  /**
   * Calculate what-if projections
   */
  static calculate(
    type: QuestionType,
    variables: WhatIfVariable[],
    changes: ChangeAssumption[],
    baselineMetrics: {
      revenue?: number;
      costs?: number;
      employees?: number;
      customers?: number;
    },
    timeHorizon: number,
    iterations: number
  ): {
    projections: WhatIfProjection[];
    impacts: ImpactAnalysis[];
    baselineMetrics: WhatIfResult['baselineMetrics'];
    projectedMetrics: WhatIfResult['projectedMetrics'];
  } {
    // Build variable map
    const variableMap = new Map<string, WhatIfVariable>();
    variables.forEach(v => variableMap.set(v.id, v));

    // Calculate baseline metrics
    const baseline = this.calculateBaseline(baselineMetrics);

    // Apply changes and calculate projections
    const projections = this.calculateProjections(
      type,
      variableMap,
      changes,
      baseline,
      timeHorizon,
      iterations
    );

    // Calculate impacts
    const impacts = this.calculateImpacts(type, variableMap, changes, baseline);

    // Calculate projected metrics
    const projected = this.calculateProjectedMetrics(baseline, impacts);

    return {
      projections,
      impacts,
      baselineMetrics: baseline,
      projectedMetrics: projected
    };
  }

  /**
   * Calculate baseline metrics
   */
  private static calculateBaseline(metrics: {
    revenue?: number;
    costs?: number;
    employees?: number;
    customers?: number;
  }): WhatIfResult['baselineMetrics'] {
    const revenue = metrics.revenue || 1000000;
    const costs = metrics.costs || revenue * 0.7;
    const profit = revenue - costs;
    const margin = (profit / revenue) * 100;

    return {
      revenue,
      costs,
      profit,
      margin
    };
  }

  /**
   * Calculate projections over time
   */
  private static calculateProjections(
    type: QuestionType,
    variables: Map<string, WhatIfVariable>,
    changes: ChangeAssumption[],
    baseline: WhatIfResult['baselineMetrics'],
    timeHorizon: number,
    iterations: number
  ): WhatIfProjection[] {
    const projections: WhatIfProjection[] = [];

    // Get the main change
    const mainChange = changes.find(c =>
      c.variableId.includes('change') ||
      c.variableId.includes('hire') ||
      c.variableId.includes('price') ||
      c.variableId.includes('efficiency')
    );

    for (let period = 1; period <= timeHorizon; period++) {
      // Calculate impact based on type
      const impact = this.calculatePeriodImpact(
        type,
        mainChange,
        period,
        timeHorizon,
        baseline
      );

      // Monte Carlo for confidence intervals
      const simulation = MonteCarloRunner.run(iterations, rng => {
        const noise = rng.nextGaussian(1, 0.1);
        return baseline.profit * (1 + impact / 100) * noise;
      });

      const projected = baseline.profit * (1 + impact / 100);

      projections.push({
        period: period === timeHorizon ? `End` : `Period ${period}`,
        baseline: baseline.profit,
        projected,
        change: projected - baseline.profit,
        changePercent: impact,
        confidenceInterval: [simulation.percentile5, simulation.percentile95]
      });
    }

    return projections;
  }

  /**
   * Calculate impact for a specific period
   */
  private static calculatePeriodImpact(
    type: QuestionType,
    change: ChangeAssumption | undefined,
    period: number,
    totalPeriods: number,
    baseline: WhatIfResult['baselineMetrics']
  ): number {
    if (!change) return 0;

    const changeValue = typeof change.newValue === 'number' ? change.newValue : 0;
    const rampUp = Math.min(1, period / (totalPeriods / 3)); // Gradual ramp up

    switch (type) {
      case QuestionType.HIRING:
        return changeValue * 0.5 * rampUp; // 0.5% per hire

      case QuestionType.PRICING:
        const elasticity = -1.5;
        return changeValue * elasticity * rampUp;

      case QuestionType.MARKET:
        return changeValue * 2 * rampUp; // 2x multiplier for market share

      case QuestionType.FINANCIAL:
        return -changeValue * rampUp; // Cost change impacts profit negatively

      case QuestionType.OPERATIONS:
        return changeValue * 0.3 * rampUp; // Efficiency gains

      case QuestionType.TECHNOLOGY:
        return changeValue * 0.4 * rampUp;

      default:
        return changeValue * rampUp;
    }
  }

  /**
   * Calculate detailed impacts
   */
  private static calculateImpacts(
    type: QuestionType,
    variables: Map<string, WhatIfVariable>,
    changes: ChangeAssumption[],
    baseline: WhatIfResult['baselineMetrics']
  ): ImpactAnalysis[] {
    const impacts: ImpactAnalysis[] = [];

    for (const change of changes) {
      const variable = variables.get(change.variableId);
      if (!variable) continue;

      const currentValue = typeof variable.currentValue === 'number' ? variable.currentValue : 0;
      const newValue = typeof change.newValue === 'number' ? change.newValue : 0;
      const absoluteChange = newValue - currentValue;

      // Calculate impact based on type
      let impactValue = 0;
      let impactPercent = 0;

      switch (type) {
        case QuestionType.HIRING:
          if (variable.id === 'num_hires') {
            impactValue = newValue * (variables.get('avg_salary')?.currentValue as number || 80000) * 0.5;
            impactPercent = (impactValue / baseline.costs) * 100;
          }
          break;

        case QuestionType.PRICING:
          if (variable.id === 'price_change') {
            impactValue = baseline.revenue * (newValue / 100);
            impactPercent = newValue * -1.5; // Price elasticity
          }
          break;

        case QuestionType.MARKET:
          if (variable.id === 'share_change') {
            const marketSize = (variables.get('market_size')?.currentValue as number) || baseline.revenue * 5;
            impactValue = marketSize * (newValue / 100);
            impactPercent = (impactValue / baseline.revenue) * 100;
          }
          break;

        case QuestionType.FINANCIAL:
          if (variable.id === 'cost_change') {
            impactValue = baseline.costs * (newValue / 100);
            impactPercent = (impactValue / baseline.profit) * 100;
          }
          break;

        case QuestionType.OPERATIONS:
          if (variable.id === 'efficiency_gain') {
            impactValue = baseline.revenue * (newValue / 100) * 0.2;
            impactPercent = (impactValue / baseline.revenue) * 100;
          }
          break;
      }

      impacts.push({
        metric: variable.name,
        baseline: currentValue,
        projected: newValue,
        impact: {
          absolute: impactValue,
          percentage: impactPercent,
          confidence: change.confidence || 0.8
        },
        drivers: [{
          assumption: `Change in ${variable.name}`,
          contribution: impactValue,
          percentage: impactPercent
        }]
      });
    }

    return impacts;
  }

  /**
   * Calculate projected metrics from impacts
   */
  private static calculateProjectedMetrics(
    baseline: WhatIfResult['baselineMetrics'],
    impacts: ImpactAnalysis[]
  ): WhatIfResult['projectedMetrics'] {
    const revenueImpact = impacts
      .filter(i => i.metric.toLowerCase().includes('revenue') || i.metric.toLowerCase().includes('price'))
      .reduce((sum, i) => sum + i.impact.absolute, 0);

    const costImpact = impacts
      .filter(i => i.metric.toLowerCase().includes('cost') || i.metric.toLowerCase().includes('salary'))
      .reduce((sum, i) => sum + i.impact.absolute, 0);

    const projectedRevenue = baseline.revenue + revenueImpact;
    const projectedCosts = baseline.costs + costImpact;
    const projectedProfit = projectedRevenue - projectedCosts;
    const projectedMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;

    return {
      revenue: projectedRevenue,
      costs: projectedCosts,
      profit: projectedProfit,
      margin: projectedMargin
    };
  }
}

/**
 * Scenario comparison engine
 */
export class ScenarioComparisonEngine {
  /**
   * Generate scenario comparisons
   */
  static compare(
    type: QuestionType,
    variables: WhatIfVariable[],
    changes: ChangeAssumption[],
    numScenarios: number,
    baseline: WhatIfResult['baselineMetrics']
  ): ScenarioComparison[] {
    const comparisons: ScenarioComparison[] = [];

    // Generate different scenarios by varying key parameters
    const keyVariable = variables.find(v =>
      v.id.includes('change') ||
      v.id.includes('hire') ||
      v.id.includes('price') ||
      v.id.includes('gain')
    );

    if (!keyVariable) return comparisons;

    const currentValue = typeof keyVariable.currentValue === 'number' ? keyVariable.currentValue : 0;
    const step = Math.abs(currentValue) * 0.5 / (numScenarios - 1);
    const minValue = currentValue - step * Math.floor(numScenarios / 2);

    for (let i = 0; i < numScenarios; i++) {
      const scenarioValue = minValue + step * i;

      const scenarioChanges = changes.map(c =>
        c.variableId === keyVariable.id
          ? { ...c, newValue: scenarioValue }
          : c
      );

      // Calculate impact for this scenario
      const impact = WhatIfCalculationEngine.calculatePeriodImpact(
        type,
        { ...changes[0], newValue: scenarioValue },
        12,
        12,
        baseline
      );

      const projectedProfit = baseline.profit * (1 + impact / 100);

      comparisons.push({
        scenarioId: `scenario-${i}`,
        scenarioName: `${keyVariable.name}: ${scenarioValue}${keyVariable.unit || ''}`,
        projections: [{
          period: 'End State',
          baseline: baseline.profit,
          projected: projectedProfit,
          change: projectedProfit - baseline.profit,
          changePercent: impact,
          confidenceInterval: [
            projectedProfit * 0.85,
            projectedProfit * 1.15
          ]
        }],
        impact: [{
          metric: 'Profit',
          baseline: baseline.profit,
          projected: projectedProfit,
          impact: {
            absolute: projectedProfit - baseline.profit,
            percentage: impact,
            confidence: 0.8
          },
          drivers: []
        }],
        totalImpact: projectedProfit - baseline.profit,
        riskAdjustedImpact: (projectedProfit - baseline.profit) * 0.8,
        confidence: 0.8,
        tradeoffs: this.identifyTradeoffs(type, scenarioValue)
      });
    }

    // Sort by total impact
    comparisons.sort((a, b) => b.totalImpact - a.totalImpact);

    return comparisons;
  }

  /**
   * Identify tradeoffs for a scenario
   */
  private static identifyTradeoffs(
    type: QuestionType,
    value: number
  ): ScenarioComparison['tradeoffs'] {
    const positive: string[] = [];
    const negative: string[] = [];

    switch (type) {
      case QuestionType.HIRING:
        if (value > 0) {
          positive.push('Increased capacity');
          positive.push('New skills and expertise');
          positive.push('Better team coverage');
          if (value > 10) {
            negative.push('Higher fixed costs');
            negative.push('Longer onboarding time');
            negative.push('Potential cultural dilution');
          }
        }
        break;

      case QuestionType.PRICING:
        if (value > 0) {
          positive.push('Higher revenue per unit');
          positive.push('Improved margins');
          positive.push('Premium positioning');
          if (value > 15) {
            negative.push('Volume loss risk');
            negative.push('Customer attrition');
          }
        } else {
          positive.push('Volume potential');
          positive.push('Market share opportunity');
          negative.push('Margin compression');
        }
        break;

      case QuestionType.MARKET:
        if (value > 0) {
          positive.push('Increased market presence');
          positive.push('Network effects');
          positive.push('Scale advantages');
          if (value > 10) {
            negative.push('Aggressive competitor response');
            negative.push('Investment requirements');
          }
        }
        break;

      case QuestionType.OPERATIONS:
        if (value > 0) {
          positive.push('Cost reduction');
          positive.push('Faster delivery');
          positive.push('Better customer experience');
          if (value > 25) {
            negative.push('Implementation disruption');
            negative.push('Change management costs');
          }
        }
        break;
    }

    return { positive, negative };
  }
}

/**
 * Insights generator
 */
export class InsightsGenerator {
  /**
   * Generate insights from what-if analysis
   */
  static generate(
    type: QuestionType,
    impacts: ImpactAnalysis[],
    projections: WhatIfProjection[],
    comparisons: ScenarioComparison[]
  ): WhatIfResult['insights'] {
    const insights: WhatIfResult['insights'] = [];

    // Calculate total impact
    const totalImpact = projections[projections.length - 1]?.changePercent || 0;

    // Opportunity insights
    if (totalImpact > 10) {
      insights.push({
        type: 'opportunity',
        title: 'Significant Positive Impact',
        description: `This change could improve profits by ${totalImpact.toFixed(1)}%. Consider implementation.`,
        priority: 'high'
      });
    }

    // Risk insights
    if (totalImpact < -10) {
      insights.push({
        type: 'risk',
        title: 'Significant Negative Impact',
        description: `This change could reduce profits by ${Math.abs(totalImpact).toFixed(1)}%. Proceed with caution.`,
        priority: 'critical'
      });
    }

    // Type-specific insights
    switch (type) {
      case QuestionType.HIRING:
        insights.push({
          type: 'recommendation',
          title: 'Staged Hiring Recommended',
          description: 'Consider hiring in phases to manage costs and monitor impact.',
          priority: 'medium'
        });
        break;

      case QuestionType.PRICING:
        const priceImpact = impacts.find(i => i.metric.toLowerCase().includes('price'));
        if (priceImpact && priceImpact.impact.percentage < -15) {
          insights.push({
            type: 'risk',
            title: 'High Volume Risk',
            description: 'Significant price increase may lead to substantial volume loss.',
            priority: 'high'
          });
        }
        break;

      case QuestionType.MARKET:
        insights.push({
          type: 'recommendation',
          title: 'Competitive Response Likely',
          description: 'Market share gains may trigger competitor responses. Plan accordingly.',
          priority: 'medium'
        });
        break;
    }

    // Comparison insights
    if (comparisons.length > 1) {
      const bestScenario = comparisons[0];
      const worstScenario = comparisons[comparisons.length - 1];

      insights.push({
        type: 'recommendation',
        title: 'Scenario Analysis Complete',
        description: `Best scenario: ${bestScenario.scenarioName} (+${bestScenario.totalImpact.toFixed(0)}). Worst: ${worstScenario.scenarioName} (${worstScenario.totalImpact.toFixed(0)}).`,
        priority: 'medium'
      });
    }

    return insights;
  }
}

/**
 * Recommendation generator
 */
export class RecommendationGenerator {
  /**
   * Generate recommendations based on what-if analysis
   */
  static generate(
    type: QuestionType,
    impacts: ImpactAnalysis[],
    projections: WhatIfProjection[],
    comparisons: ScenarioComparison[]
  ): WhatIfResult['recommendations'] {
    const recommendations: WhatIfResult['recommendations'] = [];

    const totalImpact = projections[projections.length - 1]?.changePercent || 0;

    // Type-specific recommendations
    switch (type) {
      case QuestionType.HIRING:
        const numHires = impacts.find(i => i.metric.includes('Hire'))?.projected || 0;
        recommendations.push({
          action: `Hire ${numHires} employees in phases over 6 months`,
          expectedOutcome: `${(totalImpact / 2).toFixed(1)}% profit improvement`,
          effort: 'medium',
          timeframe: '6-12 months'
        });
        if (numHires > 10) {
          recommendations.push({
            action: 'Implement structured onboarding program',
            expectedOutcome: 'Faster time-to-productivity',
            effort: 'medium',
            timeframe: '1-3 months'
          });
        }
        break;

      case QuestionType.PRICING:
        const priceChange = impacts.find(i => i.metric.includes('Price'))?.impact.percentage || 0;
        if (priceChange > 0) {
          recommendations.push({
            action: 'Test price increase with A/B test on small segment',
            expectedOutcome: 'Validate elasticity assumptions',
            effort: 'low',
            timeframe: '1-2 months'
          });
        }
        recommendations.push({
          action: 'Communicate value increase to customers',
          expectedOutcome: 'Reduce churn risk',
          effort: 'medium',
          timeframe: 'Immediate'
        });
        break;

      case QuestionType.MARKET:
        recommendations.push({
          action: 'Develop competitive response plan',
          expectedOutcome: 'Minimize market share loss',
          effort: 'high',
          timeframe: '1-3 months'
        });
        recommendations.push({
          action: 'Invest in customer loyalty',
          expectedOutcome: 'Defend existing share',
          effort: 'medium',
          timeframe: '3-6 months'
        });
        break;

      case QuestionType.OPERATIONS:
        recommendations.push({
          action: 'Pilot efficiency improvements in one department',
          expectedOutcome: 'Validate benefits before full rollout',
          effort: 'medium',
          timeframe: '1-3 months'
        });
        recommendations.push({
          action: 'Train employees on new processes',
          expectedOutcome: 'Faster adoption',
          effort: 'medium',
          timeframe: '1-2 months'
        });
        break;

      default:
        recommendations.push({
          action: 'Implement change incrementally',
          expectedOutcome: `${totalImpact.toFixed(1)}% improvement`,
          effort: 'medium',
          timeframe: '3-6 months'
        });
    }

    return recommendations;
  }
}

/**
 * What-If template library
 */
export class WhatIfTemplateLibrary {
  /**
   * Get all templates
   */
  static getTemplates(): WhatIfTemplate[] {
    return [
      {
        id: 'hiring-roi',
        name: 'Hiring ROI Analysis',
        type: QuestionType.HIRING,
        description: 'Analyze the return on investment for hiring new employees',
        question: 'What if we hire X employees?',
        suggestedVariables: [
          { id: 'num_hires', name: 'Number of Hires', type: VariableType.NUMBER, currentValue: 5, min: 1, max: 100 },
          { id: 'avg_salary', name: 'Average Salary', type: VariableType.CURRENCY, currentValue: 80000, min: 30000, max: 300000, unit: '$' },
          { id: 'productivity_gain', name: 'Productivity Gain', type: VariableType.PERCENTAGE, currentValue: 15, min: 0, max: 100, unit: '%' },
          { id: 'ramp_up_time', name: 'Ramp-up Time', type: VariableType.NUMBER, currentValue: 3, min: 1, max: 12, unit: 'months' }
        ]
      },
      {
        id: 'pricing-change',
        name: 'Pricing Change Impact',
        type: QuestionType.PRICING,
        description: 'Assess the impact of changing product or service prices',
        question: 'What if we change our prices by X%?',
        suggestedVariables: [
          { id: 'current_price', name: 'Current Price', type: VariableType.CURRENCY, currentValue: 100, unit: '$' },
          { id: 'price_change', name: 'Price Change', type: VariableType.PERCENTAGE, currentValue: 10, min: -50, max: 100, unit: '%' },
          { id: 'elasticity', name: 'Price Elasticity', type: VariableType.NUMBER, currentValue: -1.5, min: -5, max: 0 }
        ]
      },
      {
        id: 'market-expansion',
        name: 'Market Expansion Analysis',
        type: QuestionType.MARKET,
        description: 'Evaluate the impact of gaining or losing market share',
        question: 'What if our market share changes by X%?',
        suggestedVariables: [
          { id: 'current_share', name: 'Current Market Share', type: VariableType.PERCENTAGE, currentValue: 20, min: 0, max: 100, unit: '%' },
          { id: 'share_change', name: 'Market Share Change', type: VariableType.PERCENTAGE, currentValue: 5, min: -20, max: 50, unit: '%' },
          { id: 'market_size', name: 'Market Size', type: VariableType.CURRENCY, currentValue: 10000000, unit: '$' }
        ]
      },
      {
        id: 'cost-reduction',
        name: 'Cost Reduction Impact',
        type: QuestionType.FINANCIAL,
        description: 'Analyze the impact of cost reduction initiatives',
        question: 'What if we reduce costs by X%?',
        suggestedVariables: [
          { id: 'revenue', name: 'Current Revenue', type: VariableType.CURRENCY, currentValue: 1000000, unit: '$' },
          { id: 'current_costs', name: 'Current Costs', type: VariableType.CURRENCY, currentValue: 700000, unit: '$' },
          { id: 'cost_reduction', name: 'Cost Reduction', type: VariableType.PERCENTAGE, currentValue: 10, min: 0, max: 30, unit: '%' }
        ]
      },
      {
        id: 'efficiency-improvement',
        name: 'Efficiency Improvement',
        type: QuestionType.OPERATIONS,
        description: 'Assess the impact of operational efficiency improvements',
        question: 'What if we improve efficiency by X%?',
        suggestedVariables: [
          { id: 'current_efficiency', name: 'Current Efficiency', type: VariableType.PERCENTAGE, currentValue: 70, min: 0, max: 100, unit: '%' },
          { id: 'efficiency_gain', name: 'Efficiency Improvement', type: VariableType.PERCENTAGE, currentValue: 20, min: 0, max: 50, unit: '%' },
          { id: 'implementation_cost', name: 'Implementation Cost', type: VariableType.CURRENCY, currentValue: 50000, unit: '$' }
        ]
      }
    ];
  }

  /**
   * Get template by ID
   */
  static getTemplate(id: string): WhatIfTemplate | undefined {
    return this.getTemplates().find(t => t.id === id);
  }
}

/**
 * Main What-If Analysis Engine
 */
export class WhatIfAnalysisEngine {
  private analyses: Map<string, WhatIfResult> = new Map();

  /**
   * Run what-if analysis
   */
  async run(request: WhatIfAnalysisRequest): Promise<WhatIfResult> {
    const startTime = Date.now();
    const id = uuidv4();

    const {
      question,
      type,
      description,
      variables: inputVariables,
      changes: inputChanges,
      parameters = {
        timeHorizon: 12,
        scenarios: 3,
        includeComparison: true,
        baselineMetrics: {}
      }
    } = request;

    // Parse question if variables not provided
    let variables = inputVariables.map(v => ({
      id: v.id,
      name: v.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: VariableType.NUMBER,
      currentValue: v.currentValue
    }));

    let changes = inputChanges.map(c => ({
      id: uuidv4(),
      variableId: c.variableId,
      newValue: c.newValue,
      changeType: c.changeType as 'absolute' | 'percentage' | 'relative',
      confidence: c.confidence
    }));

    // If no variables/changes provided, parse from question
    if (variables.length === 0 || changes.length === 0) {
      const parsed = NaturalLanguageParser.parse(question);
      variables = parsed.variables;
      changes = parsed.changes;
    }

    // Calculate projections and impacts
    const calculation = WhatIfCalculationEngine.calculate(
      type,
      variables,
      changes,
      parameters.baselineMetrics || {},
      parameters.timeHorizon || 12,
      1000
    );

    // Generate scenario comparisons
    const comparisons = parameters.includeComparison
      ? ScenarioComparisonEngine.compare(
          type,
          variables,
          changes,
          parameters.scenarios || 3,
          calculation.baselineMetrics
        )
      : [];

    // Generate insights
    const insights = InsightsGenerator.generate(
      type,
      calculation.impacts,
      calculation.projections,
      comparisons
    );

    // Generate recommendations
    const recommendations = RecommendationGenerator.generate(
      type,
      calculation.impacts,
      calculation.projections,
      comparisons
    );

    const result: WhatIfResult = {
      id,
      questionId: id,
      question,
      type,
      projections: calculation.projections,
      impacts: calculation.impacts,
      baselineMetrics: calculation.baselineMetrics,
      projectedMetrics: calculation.projectedMetrics,
      comparisons,
      insights,
      recommendations,
      metadata: {
        createdAt: new Date(),
        confidenceLevel: 0.85,
        assumptionsUsed: changes.length,
        scenariosCompared: comparisons.length
      }
    };

    this.analyses.set(id, result);
    return result;
  }

  /**
   * Get analysis by ID
   */
  get(id: string): WhatIfResult | undefined {
    return this.analyses.get(id);
  }

  /**
   * List all analyses
   */
  list(): WhatIfResult[] {
    return Array.from(this.analyses.values());
  }

  /**
   * Get templates
   */
  getTemplates(): WhatIfTemplate[] {
    return WhatIfTemplateLibrary.getTemplates();
  }
}
