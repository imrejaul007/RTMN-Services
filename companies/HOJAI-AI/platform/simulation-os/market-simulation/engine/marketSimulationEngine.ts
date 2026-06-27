import { v4 as uuidv4 } from 'uuid';
import * as ss from 'simple-statistics';
import {
  MarketSimulationRequest,
  MarketSimulationResult,
  DemandForecast,
  PriceElasticityAnalysis,
  MarketShareProjection,
  CompetitiveResponse,
  ScenarioOutcome,
  MarketTrend,
  CompetitorBehaviorModel,
  ProductCategory,
  CustomerSegment,
  Competitor
} from '../models/marketSimulation.js';
import { SeededRandom, MonteCarloRunner } from '../../company-simulation/engine/companySimulationEngine.js';

// ============================================================================
// Market Simulation Engine - Core simulation algorithms
// ============================================================================

/**
 * Demand forecasting engine
 */
export class DemandForecastingEngine {
  /**
   * Generate demand forecast using multiple methods
   */
  static forecast(
    category: ProductCategory,
    currentDemand: number,
    timeHorizon: number,
    iterations: number,
    trends: MarketTrend[] = []
  ): DemandForecast[] {
    const forecasts: DemandForecast[] = [];

    for (let month = 1; month <= timeHorizon; month++) {
      // Calculate base demand with growth
      const growthMultiplier = Math.pow(1 + category.growthRate / 100, month / 12);

      // Apply seasonality
      const seasonalityFactor = this.getSeasonalityFactor(category, month);

      // Apply trend impacts
      const trendImpact = this.calculateTrendImpact(trends, month);

      // Run Monte Carlo for uncertainty
      const simulation = MonteCarloRunner.run(iterations, rng => {
        const noise = rng.nextGaussian(1, 0.1); // 10% uncertainty
        const projected = currentDemand * growthMultiplier * seasonalityFactor * trendImpact * noise;
        return projected;
      });

      forecasts.push({
        period: `Month ${month}`,
        baseline: currentDemand * growthMultiplier * seasonalityFactor,
        projected: simulation.mean,
        optimistic: simulation.percentile75,
        pessimistic: simulation.percentile25,
        drivers: this.identifyDemandDrivers(category, month, trends)
      });
    }

    return forecasts;
  }

  /**
   * Get seasonality factor for a month
   */
  private static getSeasonalityFactor(category: ProductCategory, month: number): number {
    if (category.seasonality.peakMonths.includes(month)) {
      return 1.3; // 30% boost during peak
    }
    if (category.seasonality.troughMonths.includes(month)) {
      return 0.7; // 30% reduction during trough
    }
    return 1.0;
  }

  /**
   * Calculate impact of trends on demand
   */
  private static calculateTrendImpact(trends: MarketTrend[], month: number): number {
    let impact = 1.0;

    for (const trend of trends) {
      // Weight by probability and impact
      const probability = trend.probability * (month <= 12 ? 0.8 : trend.timeframe === 'short' ? 0.9 : 0.5);
      impact += trend.impact * probability;
    }

    return Math.max(0.5, Math.min(2.0, impact)); // Clamp between 0.5 and 2.0
  }

  /**
   * Identify key demand drivers
   */
  private static identifyDemandDrivers(
    category: ProductCategory,
    month: number,
    trends: MarketTrend[]
  ): DemandForecast['drivers'] {
    const drivers: DemandForecast['drivers'] = [];

    // Category growth
    drivers.push({
      factor: 'Category Growth',
      impact: category.growthRate / 100,
      confidence: 0.8
    });

    // Seasonality
    if (category.seasonality.peakMonths.includes(month)) {
      drivers.push({
        factor: 'Peak Season',
        impact: 0.3,
        confidence: 0.9
      });
    } else if (category.seasonality.troughMonths.includes(month)) {
      drivers.push({
        factor: 'Off Season',
        impact: -0.3,
        confidence: 0.9
      });
    }

    // Active trends
    const activeTrends = trends.filter(t => t.probability > 0.5);
    for (const trend of activeTrends.slice(0, 3)) {
      drivers.push({
        factor: trend.name,
        impact: trend.impact,
        confidence: trend.probability
      });
    }

    return drivers;
  }

  /**
   * Find peak demand period
   */
  static findPeakDemand(forecasts: DemandForecast[]): DemandForecast {
    let peak = forecasts[0];

    for (const forecast of forecasts) {
      if (forecast.projected > peak.projected) {
        peak = forecast;
      }
    }

    return peak;
  }
}

/**
 * Price elasticity engine
 */
export class PriceElasticityEngine {
  /**
   * Analyze price elasticity across segments
   */
  static analyzeElasticity(
    currentPrice: number,
    segments: CustomerSegment[],
    iterations: number = 1000
  ): PriceElasticityAnalysis {
    // Calculate base elasticity (industry standard for most goods: -1.2 to -1.5)
    const baseElasticity = this.estimateBaseElasticity(segments);

    // Calculate segment-specific elasticities
    const segmentElasticities = new Map<string, number>();
    for (const segment of segments) {
      const elasticity = this.calculateSegmentElasticity(segment, baseElasticity);
      segmentElasticities.set(segment.id, elasticity);
    }

    // Find optimal price range
    const optimalRange = this.findOptimalPriceRange(
      currentPrice,
      baseElasticity,
      segments
    );

    // Calculate volume impact at different price points
    const volumeImpact = this.calculateVolumeImpact(
      currentPrice,
      optimalRange.recommended,
      segments,
      segmentElasticities,
      iterations
    );

    return {
      categoryElasticity: baseElasticity,
      segmentElasticities,
      optimalPriceRange: optimalRange,
      volumeImpact
    };
  }

  /**
   * Estimate base price elasticity
   */
  private static estimateBaseElasticity(segments: CustomerSegment[]): number {
    // Calculate weighted average price sensitivity
    const totalCustomers = segments.reduce((sum, s) => sum + s.size, 0);
    let weightedSensitivity = 0;

    for (const segment of segments) {
      weightedSensitivity += segment.behavior.priceSensitivity * segment.size;
    }

    const avgPriceSensitivity = weightedSensitivity / totalCustomers;

    // Map price sensitivity (0-100) to elasticity (-0.5 to -3.0)
    const elasticity = -0.5 - (avgPriceSensitivity / 100) * 2.5;

    return elasticity;
  }

  /**
   * Calculate segment-specific elasticity
   */
  private static calculateSegmentElasticity(segment: CustomerSegment, baseElasticity: number): number {
    // Adjust based on price sensitivity
    const sensitivityAdjustment = (segment.behavior.priceSensitivity - 50) / 50;
    const elasticity = baseElasticity * (1 + sensitivityAdjustment * 0.3);

    return Math.round(elasticity * 100) / 100;
  }

  /**
   * Find optimal price range using revenue maximization
   */
  private static findOptimalPriceRange(
    currentPrice: number,
    elasticity: number,
    segments: CustomerSegment[]
  ): PriceElasticityAnalysis['optimalPriceRange'] {
    // Calculate optimal price using: P* = MC / (1 + 1/E)
    // Assuming MC is 60% of current price (common markup)
    const marginalCost = currentPrice * 0.6;
    const optimalPrice = marginalCost / (1 + 1 / elasticity);

    // Calculate range (typically 15% above and below optimal)
    const range = currentPrice * 0.15;

    return {
      min: Math.round((optimalPrice - range) * 100) / 100,
      max: Math.round((optimalPrice + range) * 100) / 100,
      recommended: Math.round(optimalPrice * 100) / 100
    };
  }

  /**
   * Calculate volume impact at different price points
   */
  private static calculateVolumeImpact(
    currentPrice: number,
    newPrice: number,
    segments: CustomerSegment[],
    elasticities: Map<string, number>,
    iterations: number
  ): PriceElasticityAnalysis['volumeImpact'] {
    const priceChange = (newPrice - currentPrice) / currentPrice;
    const volumeImpact = new Map<string, {
      priceChange: number;
      volumeChange: number;
      revenueChange: number;
    }>();

    for (const segment of segments) {
      const elasticity = elasticities.get(segment.id) || -1.5;

      // Volume change based on elasticity
      const volumeChange = elasticity * priceChange;

      // Revenue change
      const currentRevenue = segment.size * currentPrice;
      const projectedRevenue = segment.size * (1 + volumeChange) * newPrice;
      const revenueChange = (projectedRevenue - currentRevenue) / currentRevenue;

      volumeImpact.set(segment.id, {
        priceChange: Math.round(priceChange * 10000) / 100, // Percentage
        volumeChange: Math.round(volumeChange * 10000) / 100,
        revenueChange: Math.round(revenueChange * 10000) / 100
      });
    }

    return volumeImpact;
  }
}

/**
 * Market share projection engine
 */
export class MarketShareProjectionEngine {
  /**
   * Project market share over time
   */
  static project(
    currentShares: Map<string, number>,
    competitors: Competitor[],
    yourCompany: { currentMarketShare: number; brandStrength: number; customerSatisfaction: number },
    timeHorizon: number,
    iterations: number
  ): MarketShareProjection[] {
    const projections: MarketShareProjection[] = [];

    // Calculate competitive dynamics
    const dynamics = this.calculateCompetitiveDynamics(competitors);

    for (let month = 1; month <= timeHorizon; month++) {
      const projection = this.calculateMonthlyProjection(
        currentShares,
        dynamics,
        yourCompany,
        month,
        iterations
      );

      projections.push(projection);
    }

    return projections;
  }

  /**
   * Calculate competitive dynamics
   */
  private static calculateCompetitiveDynamics(competitors: Competitor[]): {
    aggressiveCompetitors: string[];
    weakeningCompetitors: string[];
    growthLeaders: string[];
  } {
    const aggressiveCompetitors: string[] = [];
    const weakeningCompetitors: string[] = [];
    const growthLeaders: string[] = [];

    for (const competitor of competitors) {
      // Identify aggressive competitors (recent positive moves)
      const recentMoves = competitor.recentStrategies.filter(s => s.impact > 0.2);
      if (recentMoves.length >= 2) {
        aggressiveCompetitors.push(competitor.id);
      }

      // Identify weakening competitors (negative recent moves)
      const negativeMoves = competitor.recentStrategies.filter(s => s.impact < -0.1);
      if (negativeMoves.length >= 2 || competitor.financialHealth.growth < -5) {
        weakeningCompetitors.push(competitor.id);
      }

      // Identify growth leaders
      if (competitor.financialHealth.growth > 20) {
        growthLeaders.push(competitor.id);
      }
    }

    return { aggressiveCompetitors, weakeningCompetitors, growthLeaders };
  }

  /**
   * Calculate monthly market share projection
   */
  private static calculateMonthlyProjection(
    currentShares: Map<string, number>,
    dynamics: ReturnType<typeof this.calculateCompetitiveDynamics>,
    yourCompany: { currentMarketShare: number; brandStrength: number; customerSatisfaction: number },
    month: number,
    iterations: number
  ): MarketShareProjection {
    // Monte Carlo simulation for market share movements
    const yourShareResult = MonteCarloRunner.run(iterations, rng => {
      let yourShare = yourCompany.currentMarketShare;

      // Growth factors (positive)
      yourShare += (yourCompany.customerSatisfaction - 70) * 0.05; // Satisfaction impact
      yourShare += (yourCompany.brandStrength - 50) * 0.02; // Brand impact

      // Negative factors (competition pressure)
      const competitivePressure = dynamics.aggressiveCompetitors.length * 0.3;
      yourShare -= competitivePressure * rng.nextUniform(0.5, 1.5);

      // Positive factors (competitors weakening)
      const competitorWeakness = dynamics.weakeningCompetitors.length * 0.2;
      yourShare += competitorWeakness * rng.nextUniform(0.3, 0.8);

      // Time decay (competition catches up)
      yourShare -= month * 0.02;

      // Add noise
      yourShare += rng.nextGaussian(0, 0.5);

      return Math.max(1, Math.min(50, yourShare)); // Clamp between 1% and 50%
    });

    // Calculate competitor projections
    const competitorProjections = new Map<string, {
      current: number;
      projected: number;
      momentum: 'growing' | 'stable' | 'declining';
    }>();

    let remainingShare = 100 - yourShareResult.mean;

    for (const [id, currentShare] of currentShares) {
      if (id === 'your_company') continue;

      const isAggressive = dynamics.aggressiveCompetitors.includes(id);
      const isWeakening = dynamics.weakeningCompetitors.includes(id);

      let projectedShare = currentShare;

      if (isAggressive) {
        projectedShare *= 1 + (month * 0.02);
      } else if (isWeakening) {
        projectedShare *= 1 - (month * 0.015);
      } else {
        projectedShare *= 1 + (Math.random() - 0.5) * 0.02;
      }

      // Scale to remaining share
      projectedShare = (projectedShare / (currentShares.size - 1)) * remainingShare;

      // Determine momentum
      let momentum: 'growing' | 'stable' | 'declining';
      if (projectedShare > currentShare * 1.05) {
        momentum = 'growing';
      } else if (projectedShare < currentShare * 0.95) {
        momentum = 'declining';
      } else {
        momentum = 'stable';
      }

      competitorProjections.set(id, {
        current: currentShare,
        projected: Math.round(projectedShare * 100) / 100,
        momentum
      });
    }

    return {
      period: `Month ${month}`,
      yourCompany: {
        current: yourCompany.currentMarketShare,
        projected: Math.round(yourShareResult.mean * 100) / 100,
        confidenceInterval: [yourShareResult.percentile25, yourShareResult.percentile75]
      },
      competitors: competitorProjections
    };
  }
}

/**
 * Competitive response modeling engine
 */
export class CompetitiveResponseEngine {
  /**
   * Model likely competitor responses
   */
  static modelResponses(
    competitors: Competitor[],
    yourAction: string,
    iterations: number
  ): CompetitiveResponse[] {
    const responses: CompetitiveResponse[] = [];

    for (const competitor of competitors) {
      const response = this.modelCompetitorResponse(competitor, yourAction, iterations);
      responses.push(response);
    }

    // Sort by impact
    responses.sort((a, b) => b.responseProbability * Math.abs(b.impactOnMarket.marketShareShift) -
      a.responseProbability * Math.abs(a.impactOnMarket.marketShareShift));

    return responses;
  }

  /**
   * Model individual competitor response
   */
  private static modelCompetitorResponse(
    competitor: Competitor,
    yourAction: string,
    iterations: number
  ): CompetitiveResponse {
    // Determine aggressiveness
    const aggressiveness = this.calculateAggressiveness(competitor);

    // Determine response probability
    const responseProbability = MonteCarloRunner.run(iterations, rng => {
      let probability = 0.3; // Base probability

      // Increase if competitor is aggressive
      probability += aggressiveness * 0.3;

      // Increase if action threatens their market share
      const recentThreat = competitor.recentStrategies
        .filter(s => s.strategy.includes('market_share') || s.strategy.includes('pricing'))
        .length;
      probability += recentThreat * 0.1;

      // Add uncertainty
      probability += rng.nextGaussian(0, 0.1);

      return Math.max(0.1, Math.min(0.9, probability));
    });

    // Determine response type
    const responseType = this.determineResponseType(competitor, yourAction);

    // Estimate timeline
    const expectedTimeline = this.estimateTimeline(responseType, competitor);

    // Calculate impact
    const impactOnMarket = this.calculateImpact(responseType, competitor);

    return {
      competitorId: competitor.id,
      responseProbability: Math.round(responseProbability.mean * 100) / 100,
      responseType,
      expectedTimeline,
      impactOnMarket,
      yourCounterStrategies: this.generateCounterStrategies(responseType)
    };
  }

  /**
   * Calculate competitor aggressiveness
   */
  private static calculateAggressiveness(competitor: Competitor): number {
    let score = 50; // Base score

    // Recent aggressive moves
    const aggressiveMoves = competitor.recentStrategies.filter(s => s.impact > 0.2).length;
    score += aggressiveMoves * 10;

    // Financial health (more resources = more aggressive potential)
    score += Math.min(20, competitor.financialHealth.revenue / 10000000);

    // Strategic focus
    if (competitor.financialHealth.growth > 20) score += 10;
    if (competitor.financialHealth.growth < 0) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine likely response type
   */
  private static determineResponseType(competitor: Competitor, yourAction: string): CompetitiveResponse['responseType'] {
    const responses: Array<{ type: CompetitiveResponse['responseType']; weight: number }> = [];

    // Price war (if you're cutting prices)
    if (yourAction.toLowerCase().includes('price')) {
      responses.push({ type: 'price_war', weight: competitor.financialHealth.profitability > 10 ? 40 : 20 });
    }

    // Feature race (if you're launching features)
    if (yourAction.toLowerCase().includes('feature') || yourAction.toLowerCase().includes('product')) {
      responses.push({ type: 'feature_race', weight: competitor.strengths.includes('innovation') ? 50 : 25 });
    }

    // Marketing blitz (always possible)
    responses.push({ type: 'marketing_blitz', weight: 30 });

    // Partnership (for niche players)
    responses.push({ type: 'partnership', weight: competitor.financialHealth.growth < 0 ? 40 : 15 });

    // Pick weighted random
    const totalWeight = responses.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const response of responses) {
      random -= response.weight;
      if (random <= 0) {
        return response.type;
      }
    }

    return 'marketing_blitz'; // Default
  }

  /**
   * Estimate response timeline
   */
  private static estimateTimeline(responseType: CompetitiveResponse['responseType'], competitor: Competitor): number {
    const baseTimelines: Record<CompetitiveResponse['responseType'], number> = {
      price_war: 2, // Quick
      marketing_blitz: 3, // Moderate
      feature_race: 6, // Slow
      partnership: 9, // Slow
      acquisition: 12 // Very slow
    };

    const base = baseTimelines[responseType];

    // Adjust based on competitor size (larger = faster)
    const sizeFactor = Math.max(0.5, Math.min(2, competitor.financialHealth.revenue / 100000000));

    return Math.round(base / sizeFactor);
  }

  /**
   * Calculate market impact
   */
  private static calculateImpact(
    responseType: CompetitiveResponse['responseType'],
    competitor: Competitor
  ): CompetitiveResponse['impactOnMarket'] {
    const baseImpact: Record<CompetitiveResponse['responseType'], {
      shareShift: number;
      priceImpact: number;
      demandImpact: number;
    }> = {
      price_war: { shareShift: 3, priceImpact: -10, demandImpact: 5 },
      marketing_blitz: { shareShift: 1.5, priceImpact: 0, demandImpact: 3 },
      feature_race: { shareShift: 2, priceImpact: 2, demandImpact: 8 },
      partnership: { shareShift: 1, priceImpact: 5, demandImpact: 4 },
      acquisition: { shareShift: 5, priceImpact: 3, demandImpact: 2 }
    };

    const impact = baseImpact[responseType];

    // Scale by competitor size
    const scale = Math.min(1.5, Math.max(0.5, competitor.financialHealth.revenue / 50000000));

    return {
      marketShareShift: Math.round(impact.shareShift * scale * 100) / 100,
      priceImpact: Math.round(impact.priceImpact * scale),
      demandImpact: Math.round(impact.demandImpact * scale)
    };
  }

  /**
   * Generate counter strategies
   */
  private static generateCounterStrategies(responseType: CompetitiveResponse['responseType']): string[] {
    const strategies: Record<CompetitiveResponse['responseType'], string[]> = {
      price_war: [
        'Differentiate on quality, not price',
        'Focus on loyal customer segments',
        'Offer value-added services',
        'Consider selective price matching'
      ],
      marketing_blitz: [
        'Increase marketing spend temporarily',
        'Focus on niche positioning',
        'Leverage customer testimonials',
        'Partner with influencers'
      ],
      feature_race: [
        'Focus on core features excellence',
        'Prioritize user experience over features',
        'Build moat through integration',
        'Consider strategic acquisitions'
      ],
      partnership: [
        'Form competing partnerships',
        'Differentiate through exclusivity',
        'Strengthen customer relationships',
        'Explore merger opportunities'
      ],
      acquisition: [
        'Prepare defense strategy',
        'Seek protective partnerships',
        'Accelerate growth to increase valuation',
        'Consider preemptive acquisition'
      ]
    };

    return strategies[responseType];
  }
}

/**
 * Scenario analysis engine
 */
export class ScenarioAnalysisEngine {
  /**
   * Generate market scenarios
   */
  static generateScenarios(
    baseMarketSize: number,
    baseGrowth: number,
    timeHorizon: number,
    iterations: number
  ): ScenarioOutcome[] {
    const scenarios: ScenarioOutcome[] = [
      this.generateOptimisticScenario(baseMarketSize, baseGrowth, timeHorizon, iterations),
      this.generateBaseScenario(baseMarketSize, baseGrowth, timeHorizon, iterations),
      this.generatePessimisticScenario(baseMarketSize, baseGrowth, timeHorizon, iterations),
      this.generateDisruptiveScenario(baseMarketSize, baseGrowth, timeHorizon, iterations)
    ];

    return scenarios;
  }

  /**
   * Generate optimistic scenario
   */
  private static generateOptimisticScenario(
    baseMarketSize: number,
    baseGrowth: number,
    timeHorizon: number,
    iterations: number
  ): ScenarioOutcome {
    const growthBonus = 0.05; // 5% additional growth

    const scenarioResult = MonteCarloRunner.run(iterations, rng => {
      const marketSize = baseMarketSize * Math.pow(1 + baseGrowth + growthBonus, timeHorizon / 12);
      const profitMultiplier = rng.nextUniform(1.1, 1.3);
      const competitiveIntensity = rng.nextUniform(40, 60);

      return {
        marketSize,
        marketGrowth: baseGrowth + growthBonus,
        yourMarketShare: 25 + rng.nextGaussian(5, 3),
        yourRevenue: baseMarketSize * 0.2 * Math.pow(1.15, timeHorizon / 12),
        yourProfitability: 20 + profitMultiplier * 10,
        competitiveIntensity
      };
    });

    return {
      scenarioName: 'Optimistic',
      probability: 0.2,
      metrics: {
        marketSize: scenarioResult.mean,
        marketGrowth: baseGrowth + growthBonus,
        yourMarketShare: 25,
        yourRevenue: baseMarketSize * 0.2 * Math.pow(1.15, timeHorizon / 12),
        yourProfitability: 25,
        competitiveIntensity: 50
      },
      timeline: this.generateTimeline(baseMarketSize, baseGrowth + growthBonus, timeHorizon),
      keyEvents: [
        { period: 3, event: 'Favorable regulatory changes', impact: 'positive' },
        { period: 6, event: 'Major competitor exits market', impact: 'positive' },
        { period: 9, event: 'Breakthrough technology adoption', impact: 'positive' }
      ]
    };
  }

  /**
   * Generate base scenario
   */
  private static generateBaseScenario(
    baseMarketSize: number,
    baseGrowth: number,
    timeHorizon: number,
    iterations: number
  ): ScenarioOutcome {
    return {
      scenarioName: 'Base Case',
      probability: 0.5,
      metrics: {
        marketSize: baseMarketSize * Math.pow(1 + baseGrowth, timeHorizon / 12),
        marketGrowth: baseGrowth,
        yourMarketShare: 20,
        yourRevenue: baseMarketSize * 0.2 * Math.pow(1 + baseGrowth, timeHorizon / 12),
        yourProfitability: 20,
        competitiveIntensity: 60
      },
      timeline: this.generateTimeline(baseMarketSize, baseGrowth, timeHorizon),
      keyEvents: [
        { period: 6, event: 'Market consolidation begins', impact: 'neutral' },
        { period: 12, event: 'New smaller entrants', impact: 'negative' }
      ]
    };
  }

  /**
   * Generate pessimistic scenario
   */
  private static generatePessimisticScenario(
    baseMarketSize: number,
    baseGrowth: number,
    timeHorizon: number,
    iterations: number
  ): ScenarioOutcome {
    const growthPenalty = 0.03; // 3% reduced growth

    return {
      scenarioName: 'Pessimistic',
      probability: 0.2,
      metrics: {
        marketSize: baseMarketSize * Math.pow(1 + baseGrowth - growthPenalty, timeHorizon / 12),
        marketGrowth: baseGrowth - growthPenalty,
        yourMarketShare: 15,
        yourRevenue: baseMarketSize * 0.15 * Math.pow(0.97, timeHorizon / 12),
        yourProfitability: 12,
        competitiveIntensity: 75
      },
      timeline: this.generateTimeline(baseMarketSize, baseGrowth - growthPenalty, timeHorizon),
      keyEvents: [
        { period: 4, event: 'Economic downturn begins', impact: 'negative' },
        { period: 8, event: 'Aggressive competitor pricing', impact: 'negative' },
        { period: 11, event: 'Cost pressures increase', impact: 'negative' }
      ]
    };
  }

  /**
   * Generate disruptive scenario
   */
  private static generateDisruptiveScenario(
    baseMarketSize: number,
    baseGrowth: number,
    timeHorizon: number,
    iterations: number
  ): ScenarioOutcome {
    return {
      scenarioName: 'Black Swan',
      probability: 0.1,
      metrics: {
        marketSize: baseMarketSize * 0.7 * Math.pow(0.95, timeHorizon / 12),
        marketGrowth: -0.05,
        yourMarketShare: Math.random() > 0.5 ? 30 : 10, // Win or lose big
        yourRevenue: baseMarketSize * 0.3 * (Math.random() > 0.5 ? 1.2 : 0.5),
        yourProfitability: Math.random() > 0.5 ? 30 : 5,
        competitiveIntensity: 90
      },
      timeline: this.generateTimeline(baseMarketSize * 0.8, -0.05, timeHorizon),
      keyEvents: [
        { period: 3, event: 'Unexpected regulatory change', impact: 'negative' },
        { period: 6, event: 'Market disruption by new technology', impact: 'negative' },
        { period: 9, event: 'Major market player collapse', impact: 'negative' }
      ]
    };
  }

  /**
   * Generate timeline for scenario
   */
  private static generateTimeline(baseMarketSize: number, growth: number, timeHorizon: number): DemandForecast[] {
    const timeline: DemandForecast[] = [];

    for (let month = 1; month <= timeHorizon; month++) {
      const growthFactor = Math.pow(1 + growth, month / 12);
      const baseDemand = baseMarketSize * growthFactor;

      timeline.push({
        period: `Month ${month}`,
        baseline: baseDemand,
        projected: baseDemand * 0.95,
        optimistic: baseDemand * 1.1,
        pessimistic: baseDemand * 0.85,
        drivers: []
      });
    }

    return timeline;
  }
}

/**
 * Threat assessment engine (Porter's 5 Forces)
 */
export class ThreatAssessmentEngine {
  /**
   * Assess competitive threats using Porter's 5 Forces
   */
  static assess(
    marketType: string,
    competitors: Competitor[],
    segments: CustomerSegment[]
  ): MarketSimulationResult['threatAssessment'] {
    return {
      newEntrants: this.assessNewEntrants(competitors),
      substitutes: this.assessSubstitutes(segments),
      supplierPower: this.assessSupplierPower(marketType),
      buyerPower: this.assessBuyerPower(segments),
      competitiveRivalry: this.assessCompetitiveRivalry(competitors)
    };
  }

  private static assessNewEntrants(competitors: Competitor[]): number {
    // High barriers = low threat (low score)
    // Count recent entrants
    const recentEntrants = competitors.filter(c =>
      c.financialHealth.growth > 30 && c.marketShare < 5
    ).length;

    return Math.min(100, recentEntrants * 15 + 30);
  }

  private static assessSubstitutes(segments: CustomerSegment[]): number {
    // Based on digital adoption (higher adoption = more substitutes)
    const avgDigitalAdoption = segments.reduce(
      (sum, s) => sum + s.behavior.digitalAdoption,
      0
    ) / segments.length;

    return avgDigitalAdoption * 0.8;
  }

  private static assessSupplierPower(marketType: string): number {
    // B2B has higher supplier power
    const basePower = marketType === 'B2B' ? 60 : 40;

    return basePower + Math.round(Math.random() * 20);
  }

  private static assessBuyerPower(segments: CustomerSegment[]): number {
    // Based on price sensitivity (higher = more buyer power)
    const avgPriceSensitivity = segments.reduce(
      (sum, s) => sum + s.behavior.priceSensitivity,
      0
    ) / segments.length;

    return avgPriceSensitivity * 0.9;
  }

  private static assessCompetitiveRivalry(competitors: Competitor[]): number {
    // Based on number of competitors and their aggression
    let rivalry = competitors.length * 8;

    for (const competitor of competitors) {
      if (competitor.financialHealth.growth > 15) rivalry += 10;
      if (competitor.recentStrategies.length > 3) rivalry += 5;
    }

    return Math.min(100, rivalry);
  }
}

/**
 * Recommendation generator for market simulation
 */
export class MarketRecommendationGenerator {
  /**
   * Generate market strategy recommendations
   */
  static generate(
    result: MarketSimulationResult,
    elasticity: PriceElasticityAnalysis
  ): MarketSimulationResult['recommendations'] {
    const recommendations: MarketSimulationResult['recommendations'] = [];

    // Pricing recommendations
    if (elasticity.categoryElasticity > -1) {
      recommendations.push({
        priority: 'medium',
        action: 'Consider premium pricing strategy',
        rationale: 'Low price sensitivity in your market allows for higher margins',
        expectedImpact: `${((elasticity.optimalPriceRange.recommended / elasticity.optimalPriceRange.min - 1) * 100).toFixed(0)}% potential price increase`,
        timeframe: '0-3 months'
      });
    } else {
      recommendations.push({
        priority: 'high',
        action: 'Optimize pricing using elasticity insights',
        rationale: 'High price sensitivity requires careful pricing to maximize revenue',
        expectedImpact: `Optimal price range: $${elasticity.optimalPriceRange.min} - $${elasticity.optimalPriceRange.max}`,
        timeframe: '0-1 months'
      });
    }

    // Market share recommendations
    const finalProjection = result.marketShareProjection[result.marketShareProjection.length - 1];
    if (finalProjection.yourCompany.projected < finalProjection.yourCompany.current) {
      recommendations.push({
        priority: 'high',
        action: 'Defend market share against competitor pressure',
        rationale: 'Market share is projected to decline without intervention',
        expectedImpact: `Prevent ${(finalProjection.yourCompany.current - finalProjection.yourCompany.projected).toFixed(1)}% share loss`,
        timeframe: '0-6 months'
      });
    }

    // Threat-based recommendations
    if (result.threatAssessment.newEntrants > 60) {
      recommendations.push({
        priority: 'high',
        action: 'Strengthen barriers to entry',
        rationale: 'High threat of new entrants detected',
        expectedImpact: 'Reduce new entrant threat by 20-30%',
        timeframe: '6-12 months'
      });
    }

    if (result.threatAssessment.competitiveRivalry > 70) {
      recommendations.push({
        priority: 'high',
        action: 'Differentiate to reduce competitive rivalry',
        rationale: 'Intense competitive rivalry eroding margins',
        expectedImpact: 'Reduce rivalry impact by 15-25%',
        timeframe: '3-6 months'
      });
    }

    // Competitive response recommendations
    const aggressiveResponses = result.competitiveResponses.filter(r => r.responseProbability > 0.5);
    if (aggressiveResponses.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Prepare counter-strategies for likely competitor responses',
        rationale: `${aggressiveResponses.length} competitor(s) likely to respond aggressively`,
        expectedImpact: 'Minimize market share loss from competitive response',
        timeframe: '0-3 months'
      });
    }

    // Scenario-based recommendations
    const pessimisticScenario = result.scenarios.find(s => s.scenarioName === 'Pessimistic');
    if (pessimisticScenario && pessimisticScenario.probability > 0.15) {
      recommendations.push({
        priority: 'medium',
        action: 'Develop contingency plans for downside scenarios',
        rationale: `${(pessimisticScenario.probability * 100).toFixed(0)}% probability of pessimistic outcome`,
        expectedImpact: 'Reduce downside risk by 30-40%',
        timeframe: '3-6 months'
      });
    }

    return recommendations;
  }
}

/**
 * Main Market Simulation Engine
 */
export class MarketSimulationEngine {
  private simulations: Map<string, MarketSimulationResult> = new Map();
  private trends: MarketTrend[] = [];

  /**
   * Run market simulation
   */
  async run(request: MarketSimulationRequest): Promise<MarketSimulationResult> {
    const startTime = Date.now();
    const id = uuidv4();

    const {
      marketId,
      marketType,
      productCategory,
      yourCompany,
      competitors,
      customerSegments,
      parameters = {
        iterations: 1000,
        timeHorizon: 12,
        confidenceLevel: 0.95
      }
    } = request;

    // Calculate current market size
    const currentMarketSize = productCategory.marketSize;

    // Generate demand forecasts
    const demandForecast = DemandForecastingEngine.forecast(
      productCategory,
      currentMarketSize * 0.3, // Assume 30% TAM
      parameters.timeHorizon,
      parameters.iterations,
      this.trends
    );

    // Analyze price elasticity
    const priceElasticity = PriceElasticityEngine.analyzeElasticity(
      yourCompany.currentPricing,
      customerSegments,
      parameters.iterations
    );

    // Project market share
    const currentShares = new Map<string, number>();
    currentShares.set('your_company', yourCompany.currentMarketShare);
    competitors.forEach(c => currentShares.set(c.id, c.marketShare));

    const marketShareProjection = MarketShareProjectionEngine.project(
      currentShares,
      competitors,
      yourCompany,
      parameters.timeHorizon,
      parameters.iterations
    );

    // Model competitive responses
    const competitiveResponses = CompetitiveResponseEngine.modelResponses(
      competitors,
      'price change',
      parameters.iterations
    );

    // Assess threats
    const threatAssessment = ThreatAssessmentEngine.assess(
      marketType,
      competitors,
      customerSegments
    );

    // Generate scenarios
    const scenarios = ScenarioAnalysisEngine.generateScenarios(
      currentMarketSize,
      productCategory.growthRate / 100,
      parameters.timeHorizon,
      parameters.iterations
    );

    // Find peak demand
    const peakDemand = DemandForecastingEngine.findPeakDemand(demandForecast);

    // Generate recommendations
    const result: MarketSimulationResult = {
      id,
      marketId,
      status: 'completed',
      demandForecast,
      peakDemand: {
        month: demandForecast.indexOf(peakDemand) + 1,
        volume: peakDemand.projected,
        intensity: peakDemand.optimistic / peakDemand.baseline
      },
      priceElasticity,
      marketShareProjection,
      competitiveResponses,
      threatAssessment,
      scenarios,
      recommendations: [],
      metadata: {
        createdAt: new Date(),
        completedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
        iterations: parameters.iterations
      }
    };

    // Generate recommendations
    result.recommendations = MarketRecommendationGenerator.generate(result, priceElasticity);

    this.simulations.set(id, result);
    return result;
  }

  /**
   * Get simulation by ID
   */
  get(id: string): MarketSimulationResult | undefined {
    return this.simulations.get(id);
  }

  /**
   * List all simulations
   */
  list(): MarketSimulationResult[] {
    return Array.from(this.simulations.values());
  }

  /**
   * Get market trends
   */
  getTrends(): MarketTrend[] {
    return this.trends;
  }

  /**
   * Add market trend
   */
  addTrend(trend: MarketTrend): void {
    this.trends.push(trend);
  }
}
