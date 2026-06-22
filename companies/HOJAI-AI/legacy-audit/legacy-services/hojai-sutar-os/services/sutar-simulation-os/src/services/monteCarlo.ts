// ============================================================================
// SUTAR SimulationOS - Monte Carlo Engine
// ============================================================================

import type {
  SimulationRequest,
  SimulationResult,
  Scenario,
  ScenarioOutcome,
  SimulationStatistics,
  DistributionBucket,
  Percentiles,
  ConfidenceInterval,
  SimulationMetadata,
} from '../types/index.js';

// ============================================================================
// Monte Carlo Engine
// ============================================================================

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export class MonteCarloEngine {
  private iterations: number;
  private confidenceLevel: number;
  private results: number[] = [];
  private outcomes: ScenarioOutcome[] = [];

  constructor(iterations: number = 1000, confidenceLevel: number = 0.95) {
    this.iterations = Math.min(iterations, 10000);
    this.confidenceLevel = Math.max(0.5, Math.min(confidenceLevel, 0.99));
  }

  /**
   * Run Monte Carlo simulation with given parameters
   */
  run(request: SimulationRequest): SimulationResult {
    const startTime = Date.now();
    this.results = [];
    this.outcomes = [];

    // Generate scenarios based on simulation type
    const scenarios = this.generateScenarios(request);

    // Run Monte Carlo iterations
    for (let i = 0; i < this.iterations; i++) {
      const outcome = this.runSingleIteration(request, scenarios);
      this.results.push(outcome.profit);
      this.outcomes.push(outcome);
    }

    // Calculate statistics
    const statistics = this.calculateStatistics();
    const confidenceInterval = this.calculateConfidenceInterval();
    const riskAssessment = this.calculateRiskAssessment();

    // Rank scenarios
    scenarios.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    const bestScenario = scenarios.reduce((best, current) =>
      current.outcomes.profit > best.outcomes.profit ? current : best
    );

    const worstScenario = scenarios.reduce((worst, current) =>
      current.outcomes.profit < worst.outcomes.profit ? current : worst
    );

    const durationMs = Date.now() - startTime;

    return {
      id: this.generateId(),
      name: request.name,
      type: request.type,
      status: 'completed',
      scenarios,
      bestScenario,
      worstScenario,
      statistics,
      confidenceInterval,
      riskAssessment,
      metadata: {
        durationMs,
        iterationsCompleted: this.iterations,
        convergenceRate: this.calculateConvergenceRate(),
        modelAccuracy: this.calculateModelAccuracy(),
        assumptions: this.getAssumptions(request),
        warnings: this.getWarnings(),
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate scenarios based on simulation type
   */
  private generateScenarios(request: SimulationRequest): Scenario[] {
    switch (request.type) {
      case 'PRICING':
        return this.generatePricingScenarios(request);
      case 'OFFER':
        return this.generateOfferScenarios(request);
      case 'CASHBACK':
        return this.generateCashbackScenarios(request);
      case 'BUNDLE':
        return this.generateBundleScenarios(request);
      case 'STAFFING':
        return this.generateStaffingScenarios(request);
      case 'INVENTORY':
        return this.generateInventoryScenarios(request);
      case 'PROCUREMENT':
        return this.generateProcurementScenarios(request);
      case 'DEMAND':
        return this.generateDemandScenarios(request);
      case 'RISK':
        return this.generateRiskScenarios(request);
      case 'CASHFLOW':
        return this.generateCashflowScenarios(request);
      case 'REVENUE':
        return this.generateRevenueScenarios(request);
      case 'COST':
        return this.generateCostScenarios(request);
      case 'COMPLIANCE':
        return this.generateComplianceScenarios(request);
      default:
        return this.generateGenericScenarios(request);
    }
  }

  /**
   * Generate pricing scenarios
   */
  private generatePricingScenarios(request: SimulationRequest): Scenario[] {
    const currentPrice = request.parameters.currentPrice || 100;
    const elasticity = request.parameters.elasticity || 1.5;
    const competitorPrice = request.parameters.competitorPrice || currentPrice;

    const scenarios: Scenario[] = [];
    const priceChanges = [-20, -15, -10, -5, 0, 5, 10, 15, 20];

    priceChanges.forEach((pct, idx) => {
      const newPrice = currentPrice * (1 + pct / 100);
      const demandChange = -elasticity * (pct / 100);
      const estimatedUnits = Math.max(0, 1000 * (1 + demandChange));
      const revenue = newPrice * estimatedUnits;
      const cost = estimatedUnits * (currentPrice * 0.6);
      const profit = revenue - cost;
      const margin = (profit / revenue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: `${pct > 0 ? '+' : ''}${pct}% Price Change`,
        description: `Simulate ${pct > 0 ? 'increase' : 'decrease'} price by ${Math.abs(pct)}%`,
        parameters: { price: newPrice, change: pct, demandMultiplier: 1 + demandChange },
        outcomes: {
          revenue,
          cost,
          profit,
          margin,
          units: estimatedUnits,
          riskScore: this.calculateRiskScore(profit, margin),
          metrics: {
            priceChange: pct,
            demandChange: demandChange * 100,
            competitorGap: newPrice - competitorPrice,
          },
        },
        probability: this.calculateProbability(pct, elasticity),
        confidence: 0.85,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate offer/cashback scenarios
   */
  private generateOfferScenarios(request: SimulationRequest): Scenario[] {
    const offerValue = request.parameters.offerValue || 10;
    const offerType = request.parameters.offerType || 'percentage';
    const estimatedUplift = request.parameters.estimatedUplift || 0.15;
    const baseRevenue = request.parameters.baseValue || 10000;

    const scenarios: Scenario[] = [];
    const offerOptions = [
      { name: 'No Offer', value: 0, type: 'none' },
      { name: `${offerType === 'percentage' ? '5%' : '$5'} Off`, value: offerType === 'percentage' ? 5 : 5, type: offerType },
      { name: `${offerType === 'percentage' ? '10%' : '$10'} Off`, value: offerType === 'percentage' ? 10 : 10, type: offerType },
      { name: `${offerType === 'percentage' ? '15%' : '$15'} Off`, value: offerType === 'percentage' ? 15 : 15, type: offerType },
      { name: `${offerType === 'percentage' ? '20%' : '$20'} Off`, value: offerType === 'percentage' ? 20 : 20, type: offerType },
    ];

    offerOptions.forEach((opt, idx) => {
      const upliftMultiplier = opt.value === 0 ? 1 : 1 + estimatedUplift * (opt.value / 10);
      const revenue = baseRevenue * upliftMultiplier;
      const cost = opt.value === 0 ? 0 : revenue * (opt.value / 100) * 1.2;
      const profit = revenue - cost;
      const margin = (profit / revenue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: opt.name,
        description: `Test ${opt.name} offer`,
        parameters: { offerValue: opt.value, offerType: opt.type },
        outcomes: {
          revenue,
          cost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin),
          metrics: {
            upliftPercentage: (upliftMultiplier - 1) * 100,
            costPerCustomer: opt.value === 0 ? 0 : opt.value,
            roi: profit > 0 ? (profit / (cost || 1)) * 100 : 0,
          },
        },
        probability: opt.value === 0 ? 1 : 0.7 - (opt.value * 0.02),
        confidence: 0.8,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate cashback scenarios
   */
  private generateCashbackScenarios(request: SimulationRequest): Scenario[] {
    const baseRevenue = request.parameters.baseValue || 10000;
    const scenarios: Scenario[] = [];

    const cashbackOptions = [0, 2, 5, 10, 15, 20];

    cashbackOptions.forEach((pct, idx) => {
      const conversionLift = pct === 0 ? 1 : 1 + (pct * 0.03);
      const revenue = baseRevenue * conversionLift;
      const cost = revenue * (pct / 100);
      const profit = revenue - cost;
      const margin = (profit / revenue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: pct === 0 ? 'No Cashback' : `${pct}% Cashback`,
        description: `Test ${pct}% cashback reward`,
        parameters: { cashbackPercentage: pct },
        outcomes: {
          revenue,
          cost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin),
          metrics: {
            conversionLift: (conversionLift - 1) * 100,
            avgTransactionValue: revenue / 100,
            rewardCost: cost,
          },
        },
        probability: pct === 0 ? 1 : 0.85 - (pct * 0.02),
        confidence: 0.75,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate bundle scenarios
   */
  private generateBundleScenarios(request: SimulationRequest): Scenario[] {
    const items = request.parameters.bundleItems || [
      { id: 'A', price: 50, cost: 25 },
      { id: 'B', price: 30, cost: 15 },
      { id: 'C', price: 20, cost: 10 },
    ];

    const scenarios: Scenario[] = [];
    const discountOptions = [0, 5, 10, 15, 20, 25];

    discountOptions.forEach((discount, idx) => {
      const bundlePrice = items.reduce((sum, item) => sum + item.price, 0);
      const discountedPrice = bundlePrice * (1 - discount / 100);
      const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
      const revenue = discountedPrice;
      const profit = revenue - totalCost;
      const margin = (profit / revenue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: discount === 0 ? 'Separate Items' : `${discount}% Bundle Discount`,
        description: `Bundle with ${discount}% discount`,
        parameters: { bundlePrice: discountedPrice, discountPercentage: discount },
        outcomes: {
          revenue,
          cost: totalCost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin),
          metrics: {
            totalValue: bundlePrice,
            discountAmount: bundlePrice - discountedPrice,
            perceivedSavings: discount,
          },
        },
        probability: discount === 0 ? 0.3 : 0.5 + (discount * 0.02),
        confidence: 0.7,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate staffing scenarios
   */
  private generateStaffingScenarios(request: SimulationRequest): Scenario[] {
    const currentStaff = request.parameters.currentStaff || 10;
    const hoursRequired = request.parameters.hoursRequired || 40;
    const hourlyRate = request.parameters.hourlyRate || 25;
    const productivityGain = request.parameters.productivityGain || 0.1;

    const scenarios: Scenario[] = [];
    const staffOptions = [-3, -2, -1, 0, 1, 2, 3];

    staffOptions.forEach((change, idx) => {
      const newStaff = Math.max(1, currentStaff + change);
      const effectiveHours = newStaff * hoursRequired;
      const laborCost = effectiveHours * hourlyRate;
      const productivityMultiplier = 1 + (change * productivityGain);
      const outputValue = effectiveHours * productivityMultiplier * 100;
      const profit = outputValue - laborCost;
      const margin = (profit / outputValue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: change === 0 ? 'Current Staffing' : `${change > 0 ? '+' : ''}${change} Staff`,
        description: `${change === 0 ? 'Maintain' : change > 0 ? 'Add' : 'Reduce'} ${Math.abs(change)} staff`,
        parameters: { staffCount: newStaff, staffChange: change },
        outcomes: {
          revenue: outputValue,
          cost: laborCost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin),
          metrics: {
            laborCostPerHour: hourlyRate,
            productivityMultiplier,
            utilizationRate: (hoursRequired / (newStaff * hoursRequired)) * 100,
          },
        },
        probability: change === 0 ? 0.9 : 0.6,
        confidence: 0.75,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate inventory scenarios
   */
  private generateInventoryScenarios(request: SimulationRequest): Scenario[] {
    const currentStock = request.parameters.currentStock || 100;
    const reorderPoint = request.parameters.reorderPoint || 20;
    const leadTime = request.parameters.leadTime || 7;
    const carryingCost = request.parameters.carryingCost || 2;
    const stockoutCost = request.parameters.stockoutCost || 50;

    const scenarios: Scenario[] = [];
    const stockMultipliers = [0.5, 0.75, 1, 1.25, 1.5, 2];

    stockMultipliers.forEach((mult, idx) => {
      const stock = currentStock * mult;
      const daysToStockout = stock / 10;
      const needsReorder = stock <= reorderPoint;
      const carryingCostTotal = stock * carryingCost;
      const stockoutRisk = daysToStockout < leadTime ? (leadTime - daysToStockout) / leadTime : 0;
      const expectedStockoutCost = stockoutRisk * stockoutCost * 10;
      const revenue = stock * 10;
      const profit = revenue - carryingCostTotal - expectedStockoutCost;
      const margin = (profit / revenue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: `${Math.round(mult * 100)}% Current Stock`,
        description: `Maintain ${Math.round(mult * 100)}% of current stock level`,
        parameters: { stockLevel: stock, multiplier: mult },
        outcomes: {
          revenue,
          cost: carryingCostTotal + expectedStockoutCost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin) + stockoutRisk * 30,
          metrics: {
            daysOfSupply: daysToStockout,
            carryingCost,
            stockoutRisk,
            reorderNeeded: needsReorder ? 1 : 0,
          },
        },
        probability: mult === 1 ? 0.8 : 0.65,
        confidence: 0.7,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate procurement scenarios
   */
  private generateProcurementScenarios(request: SimulationRequest): Scenario[] {
    const suppliers = request.parameters.suppliers || [
      { id: 'A', name: 'Supplier A', price: 100, reliability: 0.9, leadTime: 7 },
      { id: 'B', name: 'Supplier B', price: 85, reliability: 0.75, leadTime: 14 },
      { id: 'C', name: 'Supplier C', price: 90, reliability: 0.85, leadTime: 10 },
    ];
    const quantity = request.parameters.quantity || 100;

    const scenarios: Scenario[] = [];

    // Single supplier scenarios
    suppliers.forEach((supplier, idx) => {
      const cost = supplier.price * quantity;
      const qualityScore = supplier.reliability * 100;
      const delayRisk = (1 - supplier.reliability) * supplier.leadTime;
      const profit = (100 - supplier.price) * quantity;
      const margin = profit / cost * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: `Single: Supplier ${supplier.id}`,
        description: `Order all from ${supplier.id}`,
        parameters: { supplierId: supplier.id, quantity, unitPrice: supplier.price },
        outcomes: {
          revenue: cost,
          cost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin) + (1 - supplier.reliability) * 40,
          metrics: {
            unitPrice: supplier.price,
            reliability: supplier.reliability,
            leadTime: supplier.leadTime,
            qualityScore,
            delayRiskDays: delayRisk,
          },
        },
        probability: supplier.reliability,
        confidence: 0.8,
        rank: 0,
      });
    });

    // Mixed supplier scenario
    const mixedCost = suppliers.reduce((sum, s) => sum + s.price * quantity * 0.33, 0);
    const mixedReliability = 1 - suppliers.reduce((sum, s) => sum + (1 - s.reliability) * 0.33, 0);
    const mixedProfit = (100 - mixedCost / quantity) * quantity;
    const mixedMargin = mixedProfit / mixedCost * 100;

    scenarios.push({
      id: 'scenario-mixed',
      name: 'Mixed Suppliers',
      description: 'Split order across all suppliers',
      parameters: { mixPercentage: 33 },
      outcomes: {
        revenue: mixedCost,
        cost: mixedCost,
        profit: mixedProfit,
        margin: mixedMargin,
        riskScore: this.calculateRiskScore(mixedProfit, mixedMargin) + (1 - mixedReliability) * 20,
        metrics: {
          avgPrice: mixedCost / quantity,
          avgReliability: mixedReliability,
          riskDiversification: 0.8,
        },
      },
      probability: mixedReliability,
      confidence: 0.75,
      rank: 0,
    });

    return scenarios;
  }

  /**
   * Generate demand forecasting scenarios
   */
  private generateDemandScenarios(request: SimulationRequest): Scenario[] {
    const historicalDemand = request.parameters.historicalDemand || [100, 110, 95, 120, 115];
    const seasonalityFactor = request.parameters.seasonalityFactor || 1.1;
    const trendFactor = request.parameters.trendFactor || 0.05;

    const avgDemand = historicalDemand.reduce((a, b) => a + b, 0) / historicalDemand.length;
    const scenarios: Scenario[] = [];
    const scenariosToGenerate = [
      { name: 'Conservative', multiplier: 0.85, variance: 0.1 },
      { name: 'Baseline', multiplier: 1, variance: 0.15 },
      { name: 'Optimistic', multiplier: 1.15, variance: 0.2 },
      { name: 'High Growth', multiplier: 1.3, variance: 0.25 },
      { name: 'Best Case', multiplier: 1.5, variance: 0.3 },
    ];

    scenariosToGenerate.forEach((s, idx) => {
      const projectedDemand = avgDemand * s.multiplier * (1 + trendFactor);
      const demandVariance = projectedDemand * s.variance;
      const revenue = projectedDemand * 10;
      const cost = revenue * 0.6;
      const profit = revenue - cost;
      const margin = (profit / revenue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: s.name,
        description: `${s.name} demand scenario`,
        parameters: { projectedDemand, multiplier: s.multiplier, variance: s.variance },
        outcomes: {
          revenue,
          cost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin) + s.variance * 20,
          metrics: {
            demand: projectedDemand,
            seasonalityFactor,
            trendFactor,
            confidenceBand: demandVariance,
          },
        },
        probability: 1 - s.variance,
        confidence: 0.7 + (1 - s.variance) * 0.2,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate risk assessment scenarios
   */
  private generateRiskScenarios(request: SimulationRequest): Scenario[] {
    const riskFactors = request.parameters.riskFactors || [
      { name: 'Market Risk', probability: 0.2, impact: 30 },
      { name: 'Operational Risk', probability: 0.15, impact: 20 },
      { name: 'Credit Risk', probability: 0.1, impact: 25 },
      { name: 'Regulatory Risk', probability: 0.05, impact: 15 },
    ];

    const scenarios: Scenario[] = [];
    const mitigationLevels = ['No Mitigation', 'Partial', 'Full'];

    mitigationLevels.forEach((level, idx) => {
      const mitigationFactor = idx === 0 ? 1 : idx === 1 ? 0.5 : 0.2;
      const totalRisk = riskFactors.reduce((sum, rf) => {
        const mitigatedImpact = rf.impact * mitigationFactor;
        return sum + rf.probability * mitigatedImpact;
      }, 0);

      const baseValue = 10000;
      const riskAdjustedValue = baseValue * (1 - totalRisk / 100);
      const profit = riskAdjustedValue - baseValue * 0.6;
      const margin = (profit / riskAdjustedValue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: level === 'No Mitigation' ? 'Current Risk Profile' : `${level} Mitigation`,
        description: `${level.toLowerCase()} risk mitigation strategy`,
        parameters: { mitigationLevel: idx, mitigationFactor },
        outcomes: {
          revenue: riskAdjustedValue,
          cost: baseValue * 0.6,
          profit,
          margin,
          riskScore: totalRisk,
          metrics: {
            totalRiskScore: totalRisk,
            mitigatedFactors: idx,
            expectedLoss: baseValue * (totalRisk / 100),
            riskReduction: (1 - mitigationFactor) * 100,
          },
        },
        probability: 0.7 + (mitigationFactor * 0.2),
        confidence: 0.75,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate cash flow forecasting scenarios
   */
  private generateCashflowScenarios(request: SimulationRequest): Scenario[] {
    const inflows = request.parameters.inflows || [
      { name: 'Sales Revenue', amount: 10000, frequency: 'monthly' as const, certainty: 0.9 },
      { name: 'Service Income', amount: 5000, frequency: 'monthly' as const, certainty: 0.8 },
      { name: 'Investment Returns', amount: 2000, frequency: 'quarterly' as const, certainty: 0.7 },
    ];

    const outflows = request.parameters.outflows || [
      { name: 'Rent', amount: 3000, frequency: 'monthly' as const, certainty: 1.0 },
      { name: 'Salaries', amount: 8000, frequency: 'monthly' as const, certainty: 1.0 },
      { name: 'Utilities', amount: 500, frequency: 'monthly' as const, certainty: 0.9 },
      { name: 'Inventory', amount: 2000, frequency: 'monthly' as const, certainty: 0.85 },
      { name: 'Taxes', amount: 1500, frequency: 'quarterly' as const, certainty: 1.0 },
    ];

    const openingBalance = request.parameters.openingBalance || 10000;
    const periods = request.parameters.forecastPeriods || 12;

    const scenarios: Scenario[] = [];
    const scenariosToGenerate = [
      { name: 'Pessimistic', inflowMult: 0.7, outflowMult: 1.2, probability: 0.15 },
      { name: 'Conservative', inflowMult: 0.85, outflowMult: 1.1, probability: 0.25 },
      { name: 'Baseline', inflowMult: 1.0, outflowMult: 1.0, probability: 0.4 },
      { name: 'Optimistic', inflowMult: 1.15, outflowMult: 0.95, probability: 0.15 },
      { name: 'Best Case', inflowMult: 1.3, outflowMult: 0.9, probability: 0.05 },
    ];

    scenariosToGenerate.forEach((s, idx) => {
      let balance = openingBalance;

      inflows.forEach(inflow => {
        balance += inflow.amount * inflow.certainty * s.inflowMult * this.getFrequencyMultiplier(inflow.frequency) * periods / 12;
      });

      outflows.forEach(outflow => {
        balance -= outflow.amount * outflow.certainty * s.outflowMult * this.getFrequencyMultiplier(outflow.frequency) * periods / 12;
      });

      const totalInflow = inflows.reduce((sum, i) => sum + i.amount * i.certainty * s.inflowMult, 0);
      const totalOutflow = outflows.reduce((sum, o) => sum + o.amount * o.certainty * s.outflowMult, 0);
      const netCashflow = totalInflow - totalOutflow;
      const margin = (netCashflow / totalInflow) * 100;
      const minBalance = openingBalance * 0.5; // Risk if balance drops below 50% of opening
      const riskScore = balance < minBalance ? 50 + (1 - balance / minBalance) * 50 : 50 * (totalOutflow / totalInflow);

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: s.name,
        description: `${s.name} cash flow scenario over ${periods} periods`,
        parameters: { inflowMultiplier: s.inflowMult, outflowMultiplier: s.outflowMult, periods },
        outcomes: {
          revenue: totalInflow,
          cost: totalOutflow,
          profit: netCashflow,
          margin,
          riskScore,
          metrics: {
            openingBalance,
            closingBalance: balance,
            totalInflow,
            totalOutflow,
            netCashflow,
            cashConversionDays: (totalOutflow / (totalInflow / 365)),
          },
        },
        probability: s.probability,
        confidence: 0.7 + s.probability * 0.2,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate revenue forecasting scenarios
   */
  private generateRevenueScenarios(request: SimulationRequest): Scenario[] {
    const historicalRevenue = request.parameters.historicalRevenue || [100000, 110000, 105000, 120000, 115000, 125000];
    const growthRate = request.parameters.growthRate || 0.1;
    const growthVariance = request.parameters.growthRateVariance || 0.05;
    const pricePerUnit = request.parameters.pricePerUnit || 100;
    const unitsSold = request.parameters.unitsSold || 1000;
    const marketSize = request.parameters.marketSize || 100000;
    const marketShare = request.parameters.marketShare || 0.01;

    const avgRevenue = historicalRevenue.reduce((a, b) => a + b, 0) / historicalRevenue.length;

    const scenarios: Scenario[] = [];
    const scenariosToGenerate = [
      { name: 'Pessimistic', growthMult: 0.5, variance: 0.1, probability: 0.15 },
      { name: 'Conservative', growthMult: 0.8, variance: 0.05, probability: 0.25 },
      { name: 'Baseline', growthMult: 1.0, variance: 0.03, probability: 0.4 },
      { name: 'Optimistic', growthMult: 1.2, variance: 0.02, probability: 0.15 },
      { name: 'Best Case', growthMult: 1.5, variance: 0.01, probability: 0.05 },
    ];

    scenariosToGenerate.forEach((s, idx) => {
      const adjustedGrowth = growthRate * s.growthMult;
      const projectedRevenue = avgRevenue * Math.pow(1 + adjustedGrowth, 12); // 12 months
      const varianceAdjusted = projectedRevenue * (1 + (Math.random() - 0.5) * s.variance * 2);
      const cost = projectedRevenue * 0.6;
      const profit = projectedRevenue - cost;
      const margin = (profit / projectedRevenue) * 100;
      const marketPenetration = Math.min(marketShare * s.growthMult * 1.5, 0.5);
      const marketPotential = marketSize * marketPenetration * pricePerUnit;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: s.name,
        description: `${s.name} revenue forecast with ${(adjustedGrowth * 100).toFixed(1)}% growth`,
        parameters: { growthRate: adjustedGrowth, marketShare: marketPenetration, projectedMonths: 12 },
        outcomes: {
          revenue: varianceAdjusted,
          cost,
          profit,
          margin,
          riskScore: s.variance * 100 + (1 - s.probability) * 20,
          metrics: {
            baseRevenue: avgRevenue,
            projectedRevenue,
            growthRate: adjustedGrowth,
            marketPenetration,
            marketPotential,
            marketShare,
            revenuePerUnit: pricePerUnit,
            unitsProjected: unitsSold * s.growthMult,
          },
        },
        probability: s.probability,
        confidence: 0.75 + (1 - s.variance) * 0.15,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate cost forecasting scenarios
   */
  private generateCostScenarios(request: SimulationRequest): Scenario[] {
    const fixedCosts = request.parameters.fixedCosts || 50000;
    const variableCostPerUnit = request.parameters.variableCostPerUnit || 30;
    const baseRevenue = request.parameters.baseValue || 100000;
    const pricePerUnit = request.parameters.pricePerUnit || 100;
    const overheadCosts = request.parameters.overheadCosts || [
      { name: 'Rent', amount: 10000 },
      { name: 'Salaries', amount: 25000 },
      { name: 'Utilities', amount: 2000 },
      { name: 'Insurance', amount: 3000 },
      { name: 'Marketing', amount: 5000 },
      { name: 'Admin', amount: 5000 },
    ];

    const scenarios: Scenario[] = [];
    const scenariosToGenerate = [
      { name: 'Pessimistic', costMult: 1.3, efficiency: 0.7, probability: 0.15 },
      { name: 'Conservative', costMult: 1.15, efficiency: 0.85, probability: 0.25 },
      { name: 'Baseline', costMult: 1.0, efficiency: 1.0, probability: 0.4 },
      { name: 'Optimistic', costMult: 0.85, efficiency: 1.15, probability: 0.15 },
      { name: 'Best Case', costMult: 0.7, efficiency: 1.3, probability: 0.05 },
    ];

    scenariosToGenerate.forEach((s, idx) => {
      const adjustedFixedCosts = fixedCosts * s.costMult;
      const adjustedVariableCost = variableCostPerUnit * s.costMult * (2 - s.efficiency);
      const totalOverhead = overheadCosts.reduce((sum, o) => sum + o.amount, 0) * s.costMult;
      const totalCost = adjustedFixedCosts + adjustedVariableCost + totalOverhead;
      const projectedRevenue = baseRevenue * s.efficiency;
      const profit = projectedRevenue - totalCost;
      const margin = (profit / projectedRevenue) * 100;
      const costPerUnit = adjustedVariableCost;
      const breakEvenUnits = adjustedFixedCosts / (pricePerUnit - costPerUnit) || 0;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: s.name,
        description: `${s.name} cost structure`,
        parameters: { costMultiplier: s.costMult, efficiency: s.efficiency },
        outcomes: {
          revenue: projectedRevenue,
          cost: totalCost,
          profit,
          margin,
          riskScore: (s.costMult - 1) * 50 + (1 - s.efficiency) * 30,
          metrics: {
            fixedCosts: adjustedFixedCosts,
            variableCostPerUnit: adjustedVariableCost,
            overheadCosts: totalOverhead,
            totalCost,
            costPerUnit,
            breakEvenUnits,
            costToRevenueRatio: totalCost / projectedRevenue,
          },
        },
        probability: s.probability,
        confidence: 0.7 + s.efficiency * 0.2,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Generate compliance risk scenarios
   */
  private generateComplianceScenarios(request: SimulationRequest): Scenario[] {
    const complianceAreas = request.parameters.complianceAreas || [
      { area: 'Data Privacy (GDPR/PDPA)', riskLevel: 0.3, penaltyAmount: 50000 },
      { area: 'Financial Reporting', riskLevel: 0.2, penaltyAmount: 25000 },
      { area: 'Labor Law', riskLevel: 0.15, penaltyAmount: 10000 },
      { area: 'Environmental', riskLevel: 0.1, penaltyAmount: 75000 },
      { area: 'Health & Safety', riskLevel: 0.25, penaltyAmount: 15000 },
    ];

    const regulatoryChanges = request.parameters.regulatoryChanges || [
      { date: new Date('2024-06-01'), description: 'New data protection rules', estimatedImpact: 0.1 },
      { date: new Date('2024-09-01'), description: 'Minimum wage increase', estimatedImpact: 0.15 },
    ];

    const auditFindings = request.parameters.auditFindings || [
      { year: 2023, severity: 'medium' as const, cost: 5000 },
      { year: 2022, severity: 'low' as const, cost: 2000 },
    ];

    const scenarios: Scenario[] = [];
    const scenariosToGenerate = [
      { name: 'Full Compliance', mitigation: 1.0, probability: 0.3 },
      { name: 'Minor Issues', mitigation: 0.7, probability: 0.35 },
      { name: 'Major Finding', mitigation: 0.4, probability: 0.25 },
      { name: 'Critical Violation', mitigation: 0.1, probability: 0.1 },
    ];

    scenariosToGenerate.forEach((s, idx) => {
      const complianceCost = complianceAreas.reduce((sum, area) => {
        const violationChance = area.riskLevel * (1 - s.mitigation);
        return sum + area.penaltyAmount * violationChance;
      }, 0);

      const regulatoryImpact = regulatoryChanges.reduce((sum, change) => {
        return sum + change.estimatedImpact * (1 - s.mitigation);
      }, 0);

      const historicalPenalty = auditFindings.reduce((sum, finding) => {
        const severityMult = finding.severity === 'critical' ? 2 : finding.severity === 'high' ? 1.5 : finding.severity === 'medium' ? 1 : 0.5;
        return sum + finding.cost * severityMult;
      }, 0);

      const totalPenaltyRisk = complianceCost + historicalPenalty * (1 - s.mitigation);
      const complianceInvestment = 50000 * s.mitigation;
      const revenue = 500000;
      const cost = 300000 + complianceInvestment;
      const profit = revenue - cost - totalPenaltyRisk;
      const margin = (profit / revenue) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name: s.name,
        description: `${s.name} - ${(s.mitigation * 100).toFixed(0)}% compliance posture`,
        parameters: { mitigationLevel: s.mitigation, areasCovered: complianceAreas.length },
        outcomes: {
          revenue,
          cost: cost + totalPenaltyRisk,
          profit,
          margin,
          riskScore: (1 - s.mitigation) * 80,
          metrics: {
            complianceCost,
            regulatoryImpact,
            historicalPenalty,
            totalPenaltyRisk,
            complianceInvestment,
            complianceScore: s.mitigation * 100,
            areasAtRisk: complianceAreas.filter(a => a.riskLevel > 0.2).length,
            regulatoryChangesImpact: regulatoryImpact * 100,
          },
        },
        probability: s.probability,
        confidence: 0.65 + s.probability * 0.2,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Get frequency multiplier for cash flow
   */
  private getFrequencyMultiplier(frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'): number {
    switch (frequency) {
      case 'daily': return 365;
      case 'weekly': return 52;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'annually': return 1;
      default: return 12;
    }
  }

  /**
   * Generate generic scenarios
   */
  private generateGenericScenarios(request: SimulationRequest): Scenario[] {
    const baseValue = request.parameters.baseValue || 100;
    const variance = request.parameters.variance || 0.2;

    const scenarios: Scenario[] = [];
    const scenarioTypes = ['Pessimistic', 'Conservative', 'Baseline', 'Optimistic', 'Best Case'];
    const multipliers = [0.5, 0.75, 1, 1.25, 1.5];

    scenarioTypes.forEach((name, idx) => {
      const mult = multipliers[idx];
      const value = baseValue * mult;
      const varianceAdjusted = value * (1 + (variance * (idx - 2) / 2));
      const cost = value * 0.6;
      const profit = varianceAdjusted - cost;
      const margin = (profit / varianceAdjusted) * 100;

      scenarios.push({
        id: `scenario-${idx + 1}`,
        name,
        description: `${name} scenario`,
        parameters: { value: varianceAdjusted, multiplier: mult },
        outcomes: {
          revenue: varianceAdjusted,
          cost,
          profit,
          margin,
          riskScore: this.calculateRiskScore(profit, margin) + Math.abs(idx - 2) * 10,
          metrics: {
            expectedValue: value,
            varianceAdjusted,
            volatility: variance * Math.abs(idx - 2),
          },
        },
        probability: 1 - Math.abs(idx - 2) * 0.15,
        confidence: 0.8,
        rank: 0,
      });
    });

    return scenarios;
  }

  /**
   * Run a single Monte Carlo iteration
   */
  private runSingleIteration(request: SimulationRequest, scenarios: Scenario[]): ScenarioOutcome {
    // Add randomness to outcomes
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const noise = 1 + (Math.random() - 0.5) * 0.1;

    return {
      revenue: randomScenario.outcomes.revenue * noise,
      cost: randomScenario.outcomes.cost * noise,
      profit: randomScenario.outcomes.profit * noise,
      margin: randomScenario.outcomes.margin,
      riskScore: randomScenario.outcomes.riskScore + (Math.random() - 0.5) * 5,
      metrics: randomScenario.outcomes.metrics,
    };
  }

  /**
   * Calculate statistics from results
   */
  private calculateStatistics(): SimulationStatistics {
    const sorted = [...this.results].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      totalIterations: this.iterations,
      successfulRuns: this.results.length,
      failedRuns: 0,
      mean,
      median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)],
      standardDeviation: stdDev,
      variance,
      min: sorted[0],
      max: sorted[n - 1],
      percentiles: this.calculatePercentiles(sorted),
      distribution: this.calculateDistribution(sorted),
    };
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentiles(sorted: number[]): Percentiles {
    const n = sorted.length;
    const getPercentile = (p: number) => {
      const idx = Math.floor((p / 100) * n);
      return sorted[Math.min(idx, n - 1)];
    };

    return {
      p5: getPercentile(5),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  /**
   * Calculate distribution buckets
   */
  private calculateDistribution(sorted: number[]): DistributionBucket[] {
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;
    const bucketCount = 10;
    const bucketSize = range / bucketCount;

    const buckets: DistributionBucket[] = [];
    let cumulative = 0;

    for (let i = 0; i < bucketCount; i++) {
      const lower = min + i * bucketSize;
      const upper = lower + bucketSize;
      const count = sorted.filter((v) => v >= lower && v < upper).length;
      const percentage = (count / sorted.length) * 100;
      cumulative += percentage;

      buckets.push({
        bucket: `${lower.toFixed(0)}-${upper.toFixed(0)}`,
        count,
        percentage,
        cumulative,
      });
    }

    return buckets;
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(): ConfidenceInterval {
    const sorted = [...this.results].sort((a, b) => a - b);
    const n = sorted.length;
    const alpha = 1 - this.confidenceLevel;

    const lowerIdx = Math.floor((alpha / 2) * n);
    const upperIdx = Math.floor((1 - alpha / 2) * n);

    const mean = this.results.reduce((a, b) => a + b, 0) / n;
    const lower = sorted[lowerIdx];
    const upper = sorted[upperIdx];
    const marginOfError = (upper - lower) / 2;

    return {
      lower,
      upper,
      level: this.confidenceLevel,
      marginOfError,
    };
  }

  /**
   * Calculate risk assessment
   */
  private calculateRiskAssessment() {
    const mean = this.results.reduce((a, b) => a + b, 0) / this.results.length;
    const sorted = [...this.results].sort((a, b) => a - b);
    const var95 = sorted[Math.floor(0.05 * sorted.length)];
    const expectedShortfall = sorted.slice(0, Math.floor(0.05 * sorted.length)).reduce((a, b) => a + b, 0) /
      Math.floor(0.05 * sorted.length);

    const riskScore = Math.max(0, 100 - (mean / 100) * 50 + (sorted[0] < 0 ? 30 : 0));
    const riskLevel: RiskLevel = riskScore < 20 ? 'LOW' : riskScore < 40 ? 'MEDIUM' : riskScore < 60 ? 'HIGH' : 'CRITICAL';

    return {
      overallRiskScore: riskScore,
      riskLevel,
      riskFactors: [],
      riskMitigation: [
        'Diversify scenarios to reduce concentration risk',
        'Monitor key risk indicators regularly',
        'Implement hedging strategies for high-risk outcomes',
      ],
      valueAtRisk: mean - var95,
      expectedShortfall,
    };
  }

  /**
   * Calculate risk score for a scenario
   */
  private calculateRiskScore(profit: number, margin: number): number {
    let score = 50; // Base score

    // Profit-based adjustment
    if (profit < 0) score += 30;
    else if (profit < 100) score += 15;
    else if (profit > 500) score -= 20;

    // Margin-based adjustment
    if (margin < 0) score += 20;
    else if (margin < 10) score += 10;
    else if (margin > 30) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate probability based on parameters
   */
  private calculateProbability(change: number, elasticity: number): number {
    const baseProb = 0.7;
    const changeImpact = Math.abs(change) * 0.02;
    const elasticityImpact = Math.abs(elasticity - 1) * 0.1;

    return Math.max(0.3, Math.min(0.95, baseProb - changeImpact - elasticityImpact));
  }

  /**
   * Calculate convergence rate
   */
  private calculateConvergenceRate(): number {
    if (this.results.length < 100) return 0;
    const firstHalf = this.results.slice(0, Math.floor(this.results.length / 2));
    const secondHalf = this.results.slice(Math.floor(this.results.length / 2));

    const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = Math.abs(mean2 - mean1);
    const avg = (Math.abs(mean1) + Math.abs(mean2)) / 2;

    return Math.max(0, 1 - diff / avg);
  }

  /**
   * Calculate model accuracy
   */
  private calculateModelAccuracy(): number {
    // Simple heuristic based on sample size
    if (this.iterations >= 5000) return 0.95;
    if (this.iterations >= 1000) return 0.85;
    if (this.iterations >= 500) return 0.75;
    return 0.6;
  }

  /**
   * Get assumptions based on simulation type
   */
  private getAssumptions(request: SimulationRequest): string[] {
    const assumptions: string[] = [
      'Results based on Monte Carlo simulation with random sampling',
      `Sample size: ${this.iterations} iterations`,
      `Confidence level: ${(this.confidenceLevel * 100).toFixed(0)}%`,
    ];

    switch (request.type) {
      case 'PRICING':
        assumptions.push('Price elasticity assumed constant');
        assumptions.push('Competitor prices assumed stable');
        break;
      case 'OFFER':
      case 'CASHBACK':
        assumptions.push('Uplift estimates based on historical data');
        assumptions.push('Customer response assumed independent');
        break;
      case 'INVENTORY':
        assumptions.push('Demand rate assumed constant');
        assumptions.push('Lead times assumed deterministic');
        break;
      case 'PROCUREMENT':
        assumptions.push('Supplier reliability based on historical performance');
        assumptions.push('Quality assumed consistent across shipments');
        break;
    }

    return assumptions;
  }

  /**
   * Get warnings based on simulation results
   */
  private getWarnings(): string[] {
    const warnings: string[] = [];
    const sorted = [...this.results].sort((a, b) => a - b);

    if (sorted[0] < 0) {
      warnings.push('Negative outcomes possible - consider risk mitigation');
    }

    if (this.iterations < 1000) {
      warnings.push('Low iteration count may result in imprecise estimates');
    }

    const variance = this.results.reduce((acc, val) => {
      const mean = this.results.reduce((a, b) => a + b, 0) / this.results.length;
      return acc + Math.pow(val - mean, 2);
    }, 0) / this.results.length;

    if (Math.sqrt(variance) > 100) {
      warnings.push('High variance detected - results may be unreliable');
    }

    return warnings;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default MonteCarloEngine;
