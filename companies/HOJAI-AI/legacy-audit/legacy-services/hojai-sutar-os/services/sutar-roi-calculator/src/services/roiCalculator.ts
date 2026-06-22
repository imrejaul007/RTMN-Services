import {
  ROICalculationRequest,
  ROICalculationResult,
  CostBenefitRequest,
  CostBenefitResult,
  BreakEvenRequest,
  BreakEvenResult,
  ProfitMarginRequest,
  ProfitMarginResult,
  ProjectionRequest,
  ProjectionResult,
  YearlyProjection,
  MonthlyBreakdown,
} from '../types/index.js';

/**
 * ROI Calculator Service
 * Handles all ROI-related calculations including ROI, cost-benefit, break-even, profit margins, and projections
 */
export class ROICalculatorService {
  /**
   * Calculate Return on Investment
   */
  static calculateROI(request: ROICalculationRequest): ROICalculationResult {
    const { initialInvestment, finalValue, timePeriod } = request;

    if (initialInvestment <= 0) {
      throw new Error('Initial investment must be greater than zero');
    }

    const netReturn = finalValue - initialInvestment;
    const roi = (netReturn / initialInvestment) * 100;
    const returnMultiple = finalValue / initialInvestment;

    // Calculate annualized ROI
    const years = timePeriod / 365;
    const annualizedRoi = years > 0
      ? (Math.pow(returnMultiple, 1 / years) - 1) * 100
      : 0;

    // Calculate payback period (days until investment breaks even)
    const dailyReturn = netReturn / timePeriod;
    const paybackPeriod = dailyReturn > 0 ? initialInvestment / dailyReturn : Infinity;

    return {
      roi: Math.round(roi * 100) / 100,
      annualizedRoi: Math.round(annualizedRoi * 100) / 100,
      netReturn: Math.round(netReturn * 100) / 100,
      returnMultiple: Math.round(returnMultiple * 100) / 100,
      paybackPeriod: paybackPeriod === Infinity ? -1 : Math.round(paybackPeriod * 100) / 100,
    };
  }

  /**
   * Calculate Break-Even Point
   */
  static calculateBreakEven(request: BreakEvenRequest): BreakEvenResult {
    const { fixedCosts, variableCostPerUnit, pricePerUnit, expectedUnitsPerDay, currency = 'USD' } = request;

    if (pricePerUnit <= variableCostPerUnit) {
      throw new Error('Price per unit must be greater than variable cost per unit');
    }

    const contributionMargin = pricePerUnit - variableCostPerUnit;
    const contributionMarginRatio = (contributionMargin / pricePerUnit) * 100;
    const breakEvenUnits = Math.ceil(fixedCosts / contributionMargin);
    const breakEvenRevenue = breakEvenUnits * pricePerUnit;

    let breakEvenDays: number | undefined;
    let currentUtilization: number | undefined;

    if (expectedUnitsPerDay && expectedUnitsPerDay > 0) {
      breakEvenDays = Math.ceil(breakEvenUnits / expectedUnitsPerDay);
      currentUtilization = (expectedUnitsPerDay / breakEvenUnits) * 100;
    }

    // Margin of safety (if we have expected units)
    const marginOfSafety = expectedUnitsPerDay
      ? ((expectedUnitsPerDay * pricePerUnit - breakEvenRevenue) / (expectedUnitsPerDay * pricePerUnit)) * 100
      : 0;

    return {
      breakEvenUnits,
      breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
      breakEvenDays,
      marginOfSafety: Math.round(marginOfSafety * 100) / 100,
      contributionMargin: Math.round(contributionMargin * 100) / 100,
      contributionMarginRatio: Math.round(contributionMarginRatio * 100) / 100,
      currentUtilization: currentUtilization ? Math.round(currentUtilization * 100) / 100 : undefined,
      daysToBreakEven: breakEvenDays,
    };
  }

  /**
   * Calculate Cost-Benefit Analysis
   */
  static calculateCostBenefit(request: CostBenefitRequest): CostBenefitResult {
    const { costs, benefits, timeHorizon, discountRate = 0, currency = 'USD' } = request;

    // Calculate total costs
    let totalCosts = 0;
    let totalBenefits = 0;

    for (const cost of costs) {
      if (cost.timing === 'immediate') {
        totalCosts += cost.amount;
      } else {
        totalCosts += this.calculateRecurringCost(cost, timeHorizon);
      }
    }

    for (const benefit of benefits) {
      if (benefit.timing === 'immediate') {
        totalBenefits += benefit.amount;
      } else {
        totalBenefits += this.calculateRecurringBenefit(benefit, timeHorizon);
      }
    }

    const netBenefit = totalBenefits - totalCosts;
    const benefitCostRatio = totalCosts > 0 ? totalBenefits / totalCosts : 0;

    // Calculate discounted values
    const adjustedCosts = this.applyDiscount(totalCosts, discountRate, timeHorizon);
    const adjustedBenefits = this.applyDiscount(totalBenefits, discountRate, timeHorizon);
    const adjustedNetBenefit = adjustedBenefits - adjustedCosts;

    // Calculate monthly breakdown
    const monthlyBreakdown = this.generateMonthlyBreakdown(costs, benefits, timeHorizon, discountRate);

    // Calculate payback period
    const paybackPeriod = this.calculatePaybackPeriod(costs, benefits, timeHorizon);

    // Generate recommendation
    const recommendation = this.generateRecommendation(benefitCostRatio, adjustedNetBenefit, paybackPeriod, timeHorizon);
    const confidence = this.calculateConfidence(benefitCostRatio, costs.length, benefits.length);

    return {
      totalCosts: Math.round(totalCosts * 100) / 100,
      totalBenefits: Math.round(totalBenefits * 100) / 100,
      netBenefit: Math.round(netBenefit * 100) / 100,
      benefitCostRatio: Math.round(benefitCostRatio * 100) / 100,
      adjustedCosts: Math.round(adjustedCosts * 100) / 100,
      adjustedBenefits: Math.round(adjustedBenefits * 100) / 100,
      adjustedNetBenefit: Math.round(adjustedNetBenefit * 100) / 100,
      paybackPeriod: Math.round(paybackPeriod * 100) / 100,
      monthlyBreakdown,
      recommendation,
      confidence,
    };
  }

  /**
   * Calculate Profit Margins
   */
  static calculateProfitMargin(request: ProfitMarginRequest): ProfitMarginResult {
    const { revenue, costOfGoodsSold = 0, operatingExpenses = 0, otherExpenses = 0, taxRate = 0, currency = 'USD' } = request;

    if (revenue <= 0) {
      throw new Error('Revenue must be greater than zero');
    }

    // Gross Profit and Margin
    const grossProfit = revenue - costOfGoodsSold;
    const grossMargin = (grossProfit / revenue) * 100;

    // Operating Profit and Margin
    const operatingProfit = grossProfit - operatingExpenses;
    const operatingMargin = (operatingProfit / revenue) * 100;

    // EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization)
    const EBITDA = operatingProfit; // Simplified - would need depreciation data for full calc
    const EBITDA_margin = (EBITDA / revenue) * 100;

    // Net Profit
    const netProfit = operatingProfit - otherExpenses - (operatingProfit * taxRate / 100);
    const netMargin = (netProfit / revenue) * 100;

    return {
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
      operatingProfit: Math.round(operatingProfit * 100) / 100,
      operatingMargin: Math.round(operatingMargin * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      EBITDA: Math.round(EBITDA * 100) / 100,
      EBITDA_margin: Math.round(EBITDA_margin * 100) / 100,
      effectiveTaxRate: Math.round(taxRate * 100) / 100,
    };
  }

  /**
   * Generate Investment Projections
   */
  static generateProjection(request: ProjectionRequest): ProjectionResult {
    const {
      initialInvestment,
      expectedAnnualReturn,
      volatility = 0,
      years,
      monthlyContribution = 0,
      inflationRate = 0,
      currency = 'USD',
    } = request;

    const yearlyProjections: YearlyProjection[] = [];
    const optimisticProjections: YearlyProjection[] = [];
    const pessimisticProjections: YearlyProjection[] = [];

    let totalContributions = initialInvestment;
    let totalEarnings = 0;
    let currentValue = initialInvestment;

    // Optimistic/Pessimistic returns (assuming 2x volatility)
    const optimisticReturn = expectedAnnualReturn + (volatility * 2);
    const pessimisticReturn = Math.max(0, expectedAnnualReturn - (volatility * 2));

    let optimisticValue = initialInvestment;
    let pessimisticValue = initialInvestment;
    let optimisticContributions = initialInvestment;
    let pessimisticContributions = initialInvestment;

    for (let year = 1; year <= years; year++) {
      // Base scenario
      const yearReturn = currentValue * (expectedAnnualReturn / 100);
      const contributionTotal = monthlyContribution * 12;
      currentValue = currentValue + yearReturn + contributionTotal;
      totalContributions += contributionTotal;
      totalEarnings = currentValue - totalContributions;

      yearlyProjections.push({
        year,
        value: Math.round(currentValue * 100) / 100,
        contributions: Math.round(totalContributions * 100) / 100,
        earnings: Math.round(totalEarnings * 100) / 100,
        cumulativeReturn: Math.round(((currentValue - totalContributions) / totalContributions) * 100 * 100) / 100,
      });

      // Optimistic scenario
      const optYearReturn = optimisticValue * (optimisticReturn / 100);
      optimisticValue = optimisticValue + optYearReturn + contributionTotal;
      optimisticContributions += contributionTotal;

      optimisticProjections.push({
        year,
        value: Math.round(optimisticValue * 100) / 100,
        contributions: Math.round(optimisticContributions * 100) / 100,
        earnings: Math.round((optimisticValue - optimisticContributions) * 100) / 100,
        cumulativeReturn: Math.round(((optimisticValue - optimisticContributions) / optimisticContributions) * 100 * 100) / 100,
      });

      // Pessimistic scenario
      const pesYearReturn = pessimisticValue * (pessimisticReturn / 100);
      pessimisticValue = pessimisticValue + pesYearReturn + contributionTotal;
      pessimisticContributions += contributionTotal;

      pessimisticProjections.push({
        year,
        value: Math.round(pessimisticValue * 100) / 100,
        contributions: Math.round(pessimisticContributions * 100) / 100,
        earnings: Math.round((pessimisticValue - pessimisticContributions) * 100) / 100,
        cumulativeReturn: Math.round(((pessimisticValue - pessimisticContributions) / pessimisticContributions) * 100 * 100) / 100,
      });
    }

    // Calculate inflation-adjusted value
    const inflationFactor = Math.pow(1 + inflationRate / 100, years);
    const inflationAdjustedValue = currentValue / inflationFactor;

    // Calculate probability distribution (simplified Monte Carlo approximation)
    const probabilityOfReturn = this.calculateProbabilityDistribution(
      expectedAnnualReturn,
      volatility,
      years,
      initialInvestment,
      currentValue
    );

    return {
      projectedFinalValue: Math.round(currentValue * 100) / 100,
      totalContributions: Math.round(totalContributions * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      inflationAdjustedValue: Math.round(inflationAdjustedValue * 100) / 100,
      yearlyProjections,
      optimisticScenario: optimisticProjections,
      pessimisticScenario: pessimisticProjections,
      probabilityOfReturn,
    };
  }

  // Helper methods

  private static calculateRecurringCost(cost: { amount: number; frequency?: string; durationDays?: number }, timeHorizon: number): number {
    const { amount, frequency = 'monthly', durationDays = timeHorizon } = cost;
    const effectiveDays = Math.min(durationDays, timeHorizon);

    const multipliers: Record<string, number> = {
      daily: effectiveDays,
      weekly: effectiveDays / 7,
      monthly: effectiveDays / 30,
      quarterly: effectiveDays / 90,
      yearly: effectiveDays / 365,
    };

    return amount * (multipliers[frequency] || effectiveDays / 30);
  }

  private static calculateRecurringBenefit(benefit: { amount: number; frequency?: string; durationDays?: number }, timeHorizon: number): number {
    const { amount, frequency = 'monthly', durationDays = timeHorizon } = benefit;
    const effectiveDays = Math.min(durationDays, timeHorizon);

    const multipliers: Record<string, number> = {
      daily: effectiveDays,
      weekly: effectiveDays / 7,
      monthly: effectiveDays / 30,
      quarterly: effectiveDays / 90,
      yearly: effectiveDays / 365,
    };

    return amount * (multipliers[frequency] || effectiveDays / 30);
  }

  private static applyDiscount(amount: number, annualRate: number, days: number): number {
    if (annualRate <= 0) return amount;
    const years = days / 365;
    return amount / Math.pow(1 + annualRate / 100, years);
  }

  private static generateMonthlyBreakdown(
    costs: { amount: number; timing: string; frequency?: string; durationDays?: number }[],
    benefits: { amount: number; timing: string; frequency?: string; durationDays?: number }[],
    timeHorizon: number,
    discountRate: number
  ): MonthlyBreakdown[] {
    const months = Math.ceil(timeHorizon / 30);
    const breakdown: MonthlyBreakdown[] = [];

    let cumulativeCosts = 0;
    let cumulativeBenefits = 0;

    for (let month = 1; month <= months; month++) {
      // Simplified monthly calculation
      let monthlyCosts = 0;
      let monthlyBenefits = 0;

      for (const cost of costs) {
        if (cost.timing === 'immediate' && month === 1) {
          monthlyCosts += cost.amount;
        } else if (cost.timing === 'recurring') {
          const freqMultiplier = cost.frequency === 'monthly' ? 1 : 0.25;
          monthlyCosts += cost.amount * freqMultiplier;
        }
      }

      for (const benefit of benefits) {
        if (benefit.timing === 'immediate' && month === 1) {
          monthlyBenefits += benefit.amount;
        } else if (benefit.timing === 'recurring') {
          const freqMultiplier = benefit.frequency === 'monthly' ? 1 : 0.25;
          monthlyBenefits += benefit.amount * freqMultiplier;
        }
      }

      cumulativeCosts += monthlyCosts;
      cumulativeBenefits += monthlyBenefits;
      const netCashFlow = cumulativeBenefits - cumulativeCosts;
      const discountFactor = Math.pow(1 + discountRate / 100 / 12, month);
      const discountedNetCashFlow = netCashFlow / discountFactor;

      breakdown.push({
        month,
        cumulativeCosts: Math.round(cumulativeCosts * 100) / 100,
        cumulativeBenefits: Math.round(cumulativeBenefits * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        discountedNetCashFlow: Math.round(discountedNetCashFlow * 100) / 100,
      });
    }

    return breakdown;
  }

  private static calculatePaybackPeriod(
    costs: { amount: number; timing: string; frequency?: string; durationDays?: number }[],
    benefits: { amount: number; timing: string; frequency?: string; durationDays?: number }[],
    timeHorizon: number
  ): number {
    let cumulativeCosts = 0;
    let cumulativeBenefits = 0;

    for (let day = 1; day <= timeHorizon; day++) {
      const month = Math.ceil(day / 30);

      for (const cost of costs) {
        if (cost.timing === 'immediate' && day === 1) {
          cumulativeCosts += cost.amount;
        } else if (cost.timing === 'recurring') {
          const freqDays = this.frequencyToDays(cost.frequency || 'monthly');
          if (day % freqDays === 0) {
            cumulativeCosts += cost.amount;
          }
        }
      }

      for (const benefit of benefits) {
        if (benefit.timing === 'immediate' && day === 1) {
          cumulativeBenefits += benefit.amount;
        } else if (benefit.timing === 'recurring') {
          const freqDays = this.frequencyToDays(benefit.frequency || 'monthly');
          if (day % freqDays === 0) {
            cumulativeBenefits += benefit.amount;
          }
        }
      }

      if (cumulativeBenefits >= cumulativeCosts) {
        return day;
      }
    }

    return timeHorizon;
  }

  private static frequencyToDays(frequency: string): number {
    const mapping: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };
    return mapping[frequency] || 30;
  }

  private static generateRecommendation(
    bcr: number,
    netBenefit: number,
    paybackPeriod: number,
    timeHorizon: number
  ): CostBenefitResult['recommendation'] {
    const paybackRatio = paybackPeriod / timeHorizon;

    if (bcr >= 3 && netBenefit > 0 && paybackRatio < 0.3) {
      return 'highly_recommended';
    } else if (bcr >= 2 && netBenefit > 0 && paybackRatio < 0.5) {
      return 'recommended';
    } else if (bcr >= 1 && netBenefit > 0) {
      return 'neutral';
    } else if (bcr >= 0.5 && netBenefit < 0) {
      return 'not_recommended';
    }
    return 'strongly_not_recommended';
  }

  private static calculateConfidence(bcr: number, numCosts: number, numBenefits: number): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on BCR
    if (bcr >= 2) confidence += 20;
    else if (bcr >= 1) confidence += 10;

    // Increase confidence based on data points
    if (numCosts >= 3) confidence += 10;
    if (numBenefits >= 3) confidence += 10;

    // Decrease confidence for very high BCR (potential overestimation)
    if (bcr > 5) confidence -= 10;

    return Math.max(0, Math.min(100, confidence));
  }

  private static calculateProbabilityDistribution(
    expectedReturn: number,
    volatility: number,
    years: number,
    initialInvestment: number,
    finalValue: number
  ): ProjectionResult['probabilityOfReturn'] {
    // Simplified probability distribution based on volatility
    const stdDev = volatility * Math.sqrt(years);
    const zScore = stdDev > 0 ? (expectedReturn - 0) / stdDev : 0;

    // Normal distribution approximation
    const loss = Math.max(0, Math.min(100, 50 - zScore * 15));
    const breakeven = Math.max(0, Math.min(100, 20));
    const modest = Math.max(0, Math.min(100, 25 - Math.abs(zScore) * 5));
    const good = Math.max(0, Math.min(100, 15 + zScore * 3));
    const excellent = Math.max(0, Math.min(100, zScore * 8));

    const total = loss + breakeven + modest + good + excellent;
    const scale = 100 / total;

    return {
      loss: Math.round(loss * scale * 100) / 100,
      breakeven: Math.round(breakeven * scale * 100) / 100,
      modest: Math.round(modest * scale * 100) / 100,
      good: Math.round(good * scale * 100) / 100,
      excellent: Math.round(excellent * scale * 100) / 100,
    };
  }
}

export default ROICalculatorService;
