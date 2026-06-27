import { v4 as uuidv4 } from 'uuid';
import * as ss from 'simple-statistics';
import {
  PricingSimulationRequest,
  PricingSimulationResult,
  PricingStrategy,
  Product,
  CompetitorPrice,
  PricingSegment,
  ValueDriver,
  CompetitivePricingAnalysis,
  ValueBasedAnalysis,
  ElasticityAnalysis,
  PromotionalAnalysis,
  PriceRecommendation,
  ABTestResult,
  PriceTestType
} from '../models/pricingSimulation.js';
import { MonteCarloRunner, SeededRandom } from '../../company-simulation/engine/companySimulationEngine.js';

// ============================================================================
// Pricing Simulation Engine - Core simulation algorithms
// ============================================================================

/**
 * Competitive pricing analyzer
 */
export class CompetitivePricingAnalyzer {
  /**
   * Analyze competitive positioning
   */
  static analyze(
    yourPrice: number,
    competitors: CompetitorPrice[]
  ): CompetitivePricingAnalysis {
    const prices = competitors.map(c => c.price);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const lowest = sortedPrices[0];
    const highest = sortedPrices[sortedPrices.length - 1];
    const average = ss.mean(sortedPrices);
    const median = ss.median(sortedPrices);

    // Determine position
    let pricePosition: CompetitivePricingAnalysis['pricePosition'];
    if (yourPrice === lowest) {
      pricePosition = 'lowest';
    } else if (yourPrice < average * 0.9) {
      pricePosition = 'below_average';
    } else if (yourPrice > average * 1.1) {
      pricePosition = 'above_average';
    } else if (yourPrice === highest) {
      pricePosition = 'highest';
    } else {
      pricePosition = 'average';
    }

    // Calculate estimated share impact
    const priceIndex = yourPrice / average;
    const estimatedShareImpact = this.calculateShareImpact(priceIndex, competitors);

    return {
      yourPrice,
      competitorPrices: new Map(competitors.map(c => [c.competitorId, c.price])),
      pricePosition,
      priceDifference: {
        vsLowest: ((yourPrice - lowest) / lowest) * 100,
        vsAverage: ((yourPrice - average) / average) * 100,
        vsHighest: ((yourPrice - highest) / highest) * 100
      },
      estimatedShareImpact
    };
  }

  /**
   * Calculate market share impact based on price index
   */
  private static calculateShareImpact(
    priceIndex: number,
    competitors: CompetitorPrice[]
  ): number {
    // Weighted average competitor price index
    let weightedIndex = 0;
    let totalWeight = 0;

    for (const competitor of competitors) {
      const compIndex = competitor.price / this.calculateAveragePrice(competitors);
      weightedIndex += compIndex * competitor.reliability;
      totalWeight += competitor.reliability;
    }

    const avgCompetitorIndex = weightedIndex / totalWeight;
    const relativeIndex = priceIndex / avgCompetitorIndex;

    // Price elasticity effect on share
    // For every 1% above average competitor, lose ~0.5% share
    const shareImpact = -(relativeIndex - 1) * 50;

    return Math.max(-1, Math.min(1, shareImpact / 100));
  }

  /**
   * Calculate average competitor price
   */
  private static calculateAveragePrice(competitors: CompetitorPrice[]): number {
    if (competitors.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const competitor of competitors) {
      weightedSum += competitor.price * competitor.reliability;
      totalWeight += competitor.reliability;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate competitive pricing recommendations
   */
  static recommend(
    analysis: CompetitivePricingAnalysis,
    targetPosition: CompetitivePricingAnalysis['pricePosition'],
    competitors: CompetitorPrice[]
  ): PriceRecommendation[] {
    const recommendations: PriceRecommendation[] = [];
    const avgPrice = this.calculateAveragePrice(competitors);

    switch (targetPosition) {
      case 'lowest':
        recommendations.push({
          id: uuidv4(),
          strategy: PricingStrategy.PENETRATION,
          recommendedPrice: Math.min(...competitors.map(c => c.price)) * 0.95,
          confidence: 0.7,
          reasoning: [
            'Aggressive low-price strategy to gain market share',
            'Suitable for commoditized products',
            'May require cost optimization'
          ],
          expectedImpact: {
            volumeChange: 20,
            revenueChange: 5,
            marginChange: -10
          },
          risks: [
            'Price wars with competitors',
            'Margin erosion',
            'Brand perception issues'
          ],
          conditions: ['Cost structure can support low margins', 'Volume gains offset margin loss']
        });
        break;

      case 'average':
        recommendations.push({
          id: uuidv4(),
          strategy: PricingStrategy.COMPETITIVE,
          recommendedPrice: avgPrice,
          confidence: 0.85,
          reasoning: [
            'Match market average to stay competitive',
            'Focus on differentiation over price',
            'Balanced risk approach'
          ],
          expectedImpact: {
            volumeChange: 0,
            revenueChange: 0,
            marginChange: 0
          },
          risks: [
            'May lose share to lower-priced competitors',
            'May leave money on table vs premium positioning'
          ],
          conditions: ['Strong differentiation exists', 'Quality justifies price']
        });
        break;

      case 'above_average':
        recommendations.push({
          id: uuidv4(),
          strategy: PricingStrategy.PREMIUM,
          recommendedPrice: avgPrice * 1.2,
          confidence: 0.6,
          reasoning: [
            'Premium pricing supported by brand strength',
            'Focus on value rather than price competition',
            'Suitable for differentiated products'
          ],
          expectedImpact: {
            volumeChange: -10,
            revenueChange: 5,
            marginChange: 15
          },
          risks: [
            'Volume loss may exceed margin gain',
            'Requires consistent quality and service'
          ],
          conditions: ['Strong brand equity', 'Superior product or service', 'Insensitive customer segments']
        });
        break;
    }

    return recommendations;
  }
}

/**
 * Value-based pricing engine
 */
export class ValueBasedPricingEngine {
  /**
   * Calculate value-based price
   */
  static calculatePrice(
    segments: PricingSegment[],
    valueDrivers?: ValueDriver[]
  ): ValueBasedAnalysis {
    // Calculate weighted willingness to pay
    const totalSize = segments.reduce((sum, s) => sum + s.size, 0);
    let weightedWTP = 0;

    for (const segment of segments) {
      const adjustedWTP = segment.willingnessToPay * (1 - segment.priceSensitivity / 200);
      weightedWTP += adjustedWTP * (segment.size / totalSize);
    }

    // Factor in value drivers if provided
    let valueMultiplier = 1.0;
    if (valueDrivers && valueDrivers.length > 0) {
      valueMultiplier = this.calculateValueMultiplier(valueDrivers);
    }

    const estimatedWTP = weightedWTP * valueMultiplier;

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(segments, valueDrivers);

    // Calculate total value score
    const totalValueScore = this.calculateTotalValueScore(valueDrivers, segments);

    // Generate driver contributions
    const driverContributions = valueDrivers
      ? valueDrivers.map(driver => ({
          driver: driver.name,
          yourScore: driver.yourPerformance,
          impact: driver.impact,
          contribution: (driver.yourPerformance / 100) * driver.impact * 100
        }))
      : [];

    return {
      totalValueScore,
      willingnessToPay: {
        estimated: estimatedWTP,
        confidence,
        range: {
          min: estimatedWTP * (1 - (1 - confidence) / 2),
          max: estimatedWTP * (1 + (1 - confidence) / 2)
        }
      },
      valueDrivers: driverContributions,
      optimalPrice: estimatedWTP,
      priceValueRatio: 1 // Calculated externally with cost
    };
  }

  /**
   * Calculate value multiplier from drivers
   */
  private static calculateValueMultiplier(drivers: ValueDriver[]): number {
    let totalImpact = 0;
    let totalPerformance = 0;

    for (const driver of drivers) {
      const performanceRatio = driver.yourPerformance / Math.max(driver.competitorPerformance, 1);
      totalImpact += driver.impact;
      totalPerformance += performanceRatio * driver.impact;
    }

    // Average performance weighted by impact
    const multiplier = totalPerformance / Math.max(totalImpact, 1);

    // Scale to reasonable range (0.7 to 1.5)
    return Math.max(0.7, Math.min(1.5, multiplier));
  }

  /**
   * Calculate confidence in WTP estimate
   */
  private static calculateConfidence(
    segments: PricingSegment[],
    drivers?: ValueDriver[]
  ): number {
    let confidence = 0.7; // Base confidence

    // More segments = higher confidence
    confidence += Math.min(0.1, segments.length * 0.02);

    // More data on drivers = higher confidence
    if (drivers) {
      confidence += Math.min(0.15, drivers.length * 0.03);
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Calculate total value score
   */
  private static calculateTotalValueScore(
    drivers?: ValueDriver[],
    segments?: PricingSegment[]
  ): number {
    let score = 50; // Base score

    if (drivers) {
      for (const driver of drivers) {
        score += (driver.yourPerformance / 100) * driver.impact * 50;
      }
      score = score / (1 + drivers.length * 0.1);
    }

    return Math.round(score);
  }

  /**
   * Recommend value-based pricing
   */
  static recommend(
    analysis: ValueBasedAnalysis,
    cost: number
  ): PriceRecommendation[] {
    const recommendations: PriceRecommendation[] = [];

    // Basic recommendation
    recommendations.push({
      id: uuidv4(),
      strategy: PricingStrategy.VALUE_BASED,
      recommendedPrice: analysis.willingnessToPay.estimated,
      confidence: analysis.willingnessToPay.confidence,
      reasoning: [
        `Estimated willingness to pay: $${analysis.willingnessToPay.estimated.toFixed(2)}`,
        `Value score: ${analysis.totalValueScore}/100`,
        'Price based on perceived value rather than cost or competition'
      ],
      expectedImpact: {
        volumeChange: 0, // Neutral - we priced at WTP
        revenueChange: 10, // Positive due to value pricing
        marginChange: ((analysis.willingnessToPay.estimated - cost) / cost) * 100 - 30 // vs cost+30%
      },
      risks: [
        'Customers may not perceive the value',
        'Requires strong value communication',
        'May need to educate market'
      ],
      conditions: [
        'Clear value proposition',
        'Effective marketing',
        'Quality delivery'
      ]
    });

    // Premium option
    if (analysis.willingnessToPay.confidence > 0.7) {
      recommendations.push({
        id: uuidv4(),
        strategy: PricingStrategy.PREMIUM,
        recommendedPrice: analysis.willingnessToPay.range.max,
        confidence: analysis.willingnessToPay.confidence * 0.7,
        reasoning: [
          'Premium pricing for high-value segments',
          'Capture maximum value from willing customers',
          'Higher margin strategy'
        ],
        expectedImpact: {
          volumeChange: -15,
          revenueChange: 5,
          marginChange: 20
        },
        risks: [
          'Volume loss at premium price',
          'Need to maintain premium perception'
        ],
        conditions: [
          'Strong brand',
          'Superior differentiation',
          'Premium segment access'
        ]
      });
    }

    return recommendations;
  }
}

/**
 * Price elasticity engine
 */
export class PriceElasticityEngine {
  /**
   * Analyze price elasticity
   */
  static analyze(
    currentPrice: number,
    currentVolume: number,
    elasticity: number,
    segments: PricingSegment[],
    iterations: number = 1000
  ): ElasticityAnalysis {
    // Run Monte Carlo simulation for elasticity uncertainty
    const elasticitySimulation = MonteCarloRunner.run(iterations, rng => {
      const elasticityNoise = rng.nextGaussian(1, 0.15); // 15% uncertainty
      return elasticity * elasticityNoise;
    });

    // Calculate optimal price point
    const optimalPrice = this.findOptimalPrice(
      currentPrice,
      currentVolume,
      elasticitySimulation.mean,
      segments
    );

    // Calculate optimal revenue and volume
    const optimalVolume = this.calculateVolume(
      currentVolume,
      currentPrice,
      optimalPrice,
      elasticitySimulation.mean
    );
    const optimalRevenue = optimalPrice * optimalVolume;

    // Calculate price floor and ceiling
    const floor = currentPrice * (1 - 0.3); // 30% below current
    const ceiling = currentPrice * (1 + 0.5); // 50% above current

    return {
      baseElasticity: elasticity,
      segmentElasticities: this.calculateSegmentElasticities(segments, elasticity),
      crossElasticities: new Map(), // Would require competitor data
      optimalPricePoint: {
        price: optimalPrice,
        revenue: optimalRevenue,
        volume: optimalVolume
      },
      priceRange: {
        floor,
        ceiling
      }
    };
  }

  /**
   * Find optimal price using revenue maximization
   * Revenue = Price * Quantity
   * Quantity = Base * (Price/BasePrice)^Elasticity
   * Revenue = Price * Base * (Price/BasePrice)^Elasticity
   */
  private static findOptimalPrice(
    basePrice: number,
    baseVolume: number,
    elasticity: number,
    segments: PricingSegment[]
  ): number {
    // For linear demand: P* = BasePrice * (1 + 1/elasticity)
    // This maximizes revenue when elasticity is constant
    let weightedElasticity = elasticity;

    if (segments.length > 0) {
      const totalSize = segments.reduce((sum, s) => sum + s.size, 0);
      weightedElasticity = segments.reduce(
        (sum, s) => sum + elasticity * (s.size / totalSize),
        0
      );
    }

    // Optimal price formula for revenue maximization
    // Note: elasticity is negative, so 1/elasticity is also negative
    const optimalPrice = basePrice * (1 + 1 / weightedElasticity);

    // Clamp to reasonable range (50% below to 100% above base)
    return Math.max(basePrice * 0.5, Math.min(basePrice * 2, optimalPrice));
  }

  /**
   * Calculate volume at a given price
   */
  private static calculateVolume(
    baseVolume: number,
    basePrice: number,
    newPrice: number,
    elasticity: number
  ): number {
    const priceRatio = newPrice / basePrice;
    const volumeRatio = Math.pow(priceRatio, elasticity);
    return baseVolume * volumeRatio;
  }

  /**
   * Calculate segment-specific elasticities
   */
  private static calculateSegmentElasticities(
    segments: PricingSegment[],
    baseElasticity: number
  ): Map<string, number> {
    const elasticities = new Map<string, number>();

    for (const segment of segments) {
      // More price-sensitive segments have higher (more negative) elasticity
      const sensitivityMultiplier = 1 + (segment.priceSensitivity - 50) / 100;
      const segmentElasticity = baseElasticity * sensitivityMultiplier;
      elasticities.set(segment.id, Math.round(segmentElasticity * 100) / 100);
    }

    return elasticities;
  }

  /**
   * Generate elasticity-based recommendations
   */
  static recommend(
    analysis: ElasticityAnalysis,
    currentPrice: number,
    cost: number
  ): PriceRecommendation[] {
    const recommendations: PriceRecommendation[] = [];

    const currentMargin = (currentPrice - cost) / currentPrice * 100;
    const optimalMargin = (analysis.optimalPricePoint.price - cost) / analysis.optimalPricePoint.price * 100;

    // Recommend optimal price
    if (Math.abs(analysis.optimalPricePoint.price - currentPrice) / currentPrice > 0.05) {
      recommendations.push({
        id: uuidv4(),
        strategy: PricingStrategy.DYNAMIC,
        recommendedPrice: analysis.optimalPricePoint.price,
        confidence: 0.75,
        reasoning: [
          `Current elasticity: ${analysis.baseElasticity.toFixed(2)}`,
          `Optimal price maximizes revenue at $${analysis.optimalPricePoint.price.toFixed(2)}`,
          `Expected volume at optimal: ${analysis.optimalPricePoint.volume.toFixed(0)}`
        ],
        expectedImpact: {
          volumeChange: ((analysis.optimalPricePoint.volume - analysis.optimalPricePoint.volume *
            Math.pow(analysis.optimalPricePoint.price / currentPrice, analysis.baseElasticity)) /
            (analysis.optimalPricePoint.volume * Math.pow(analysis.optimalPricePoint.price / currentPrice, analysis.baseElasticity))) * 100,
          revenueChange: ((analysis.optimalPricePoint.revenue -
            currentPrice * analysis.optimalPricePoint.volume *
            Math.pow(analysis.optimalPricePoint.price / currentPrice, analysis.baseElasticity)) /
            (currentPrice * analysis.optimalPricePoint.volume *
              Math.pow(analysis.optimalPricePoint.price / currentPrice, analysis.baseElasticity))) * 100,
          marginChange: optimalMargin - currentMargin
        },
        risks: [
          'Elasticity estimate may be inaccurate',
          'Competitor reactions not modeled',
          'Market conditions may change'
        ],
        conditions: ['Elasticity estimate is reliable', 'Market conditions stable']
      });
    }

    return recommendations;
  }
}

/**
 * Promotional pricing analyzer
 */
export class PromotionalPricingAnalyzer {
  /**
   * Analyze promotional pricing impact
   */
  static analyze(
    basePrice: number,
    baseVolume: number,
    elasticity: number,
    margin: number
  ): PromotionalAnalysis {
    // Calculate break-even discount
    // At break-even, additional volume exactly compensates for reduced margin
    const priceRatioAtBreakEven = 1 - margin / 100;
    const volumeIncreaseAtBreakEven = margin / (100 - margin);
    const breakEvenDiscount = (1 - priceRatioAtBreakEven) * 100;

    // Calculate expected lift from historical data patterns
    // Generally: 10% discount -> 20-30% volume lift
    const expectedLift = this.estimateLift(breakEvenDiscount, elasticity);

    // Assess cannibalization risk
    const cannibalizationRisk = this.estimateCannibalization(breakEvenDiscount);

    // Assess brand damage risk
    const brandDamageRisk = this.estimateBrandDamage(breakEvenDiscount);

    // Find optimal promotion strategy
    const optimalStrategy = this.findOptimalStrategy(
      elasticity,
      margin,
      cannibalizationRisk,
      brandDamageRisk
    );

    return {
      discountDepth: breakEvenDiscount,
      expectedLift,
      breakEvenDiscount,
      cannibalizationRisk,
      brandDamageRisk,
      optimalStrategy
    };
  }

  /**
   * Estimate volume lift from discount
   */
  private static estimateLift(discountDepth: number, elasticity: number): number {
    // Standard promotion response: ~2x the discount percentage in volume lift
    // Adjusted by elasticity
    const baseLift = discountDepth * 2;

    // More elastic products have higher lifts
    const elasticityAdjustment = Math.abs(elasticity);

    return baseLift * (elasticityAdjustment / 1.5);
  }

  /**
   * Estimate cannibalization risk
   */
  private static estimateCannibalization(discountDepth: number): number {
    // Higher discounts = higher risk of training customers to wait for sales
    // Base risk increases non-linearly
    if (discountDepth < 10) return 0.1;
    if (discountDepth < 20) return 0.2;
    if (discountDepth < 30) return 0.4;
    if (discountDepth < 50) return 0.7;
    return 0.9;
  }

  /**
   * Estimate brand damage risk
   */
  private static estimateBrandDamage(discountDepth: number): number {
    // Higher discounts can signal lower quality or desperation
    // Premium brands are more sensitive
    if (discountDepth < 10) return 0.05;
    if (discountDepth < 20) return 0.15;
    if (discountDepth < 30) return 0.3;
    if (discountDepth < 50) return 0.6;
    return 0.85;
  }

  /**
   * Find optimal promotional strategy
   */
  private static findOptimalStrategy(
    elasticity: number,
    margin: number,
    cannibalizationRisk: number,
    brandDamageRisk: number
  ): PromotionalAnalysis['optimalStrategy'] {
    // Find discount that maximizes net value considering all risks
    let bestDiscount = 0;
    let bestScore = -Infinity;

    for (let discount = 5; discount <= 50; discount += 5) {
      const price = 100 - discount;
      const volumeLift = this.estimateLift(discount, elasticity);
      const volumeMultiplier = 1 + volumeLift / 100;

      // Calculate revenue change
      const revenueChange = (price * volumeMultiplier) - 100;

      // Apply risk penalties
      const riskPenalty = (cannibalizationRisk + brandDamageRisk) * 0.2;
      const score = revenueChange * (1 - riskPenalty);

      if (score > bestScore) {
        bestScore = score;
        bestDiscount = discount;
      }
    }

    // Estimate optimal duration and frequency
    const duration = bestDiscount > 30 ? 3 : bestDiscount > 15 ? 7 : 14;
    const frequency = bestDiscount > 20 ? 4 : 12; // times per year

    return {
      discount: bestDiscount,
      duration,
      frequency
    };
  }

  /**
   * Recommend promotional strategy
   */
  static recommend(
    analysis: PromotionalAnalysis,
    basePrice: number
  ): PriceRecommendation[] {
    const recommendations: PriceRecommendation[] = [];

    if (analysis.optimalStrategy.discount > 0) {
      recommendations.push({
        id: uuidv4(),
        strategy: PricingStrategy.DYNAMIC,
        recommendedPrice: basePrice * (1 - analysis.optimalStrategy.discount / 100),
        confidence: 0.7,
        reasoning: [
          `Optimal discount: ${analysis.optimalStrategy.discount}%`,
          `Expected volume lift: ${analysis.expectedLift.toFixed(1)}%`,
          `Break-even discount: ${analysis.breakEvenDiscount.toFixed(1)}%`,
          `Duration: ${analysis.optimalStrategy.duration} days`,
          `Frequency: ${analysis.optimalStrategy.frequency}x per year`
        ],
        expectedImpact: {
          volumeChange: analysis.expectedLift,
          revenueChange: analysis.expectedLift - analysis.optimalStrategy.discount,
          marginChange: -analysis.optimalStrategy.discount
        },
        risks: [
          `Cannibalization risk: ${(analysis.cannibalizationRisk * 100).toFixed(0)}%`,
          `Brand damage risk: ${(analysis.brandDamageRisk * 100).toFixed(0)}%`
        ],
        conditions: [
          'Execute during appropriate season',
          'Coordinate with marketing',
          'Monitor competitive response'
        ]
      });
    }

    return recommendations;
  }
}

/**
 * A/B testing simulator
 */
export class ABTestingSimulator {
  /**
   * Simulate A/B test results
   */
  static simulate(
    controlPrice: number,
    variants: Array<{ price: number; trafficPercentage: number }>,
    baseVolume: number,
    elasticity: number,
    iterations: number = 1000
  ): ABTestResult {
    const results: ABTestResult = {
      testId: uuidv4(),
      status: 'completed',
      startDate: new Date(),
      endDate: new Date(),
      variants: [],
      statisticalSignificance: 0.95
    };

    // Simulate each variant
    for (const variant of variants) {
      // Calculate expected conversion rate at this price
      const priceRatio = variant.price / controlPrice;
      const volumeChange = Math.pow(priceRatio, elasticity);
      const conversionRate = 0.05 * volumeChange; // Base 5% conversion, adjusted by price

      // Monte Carlo simulation for variance
      const conversionSimulation = MonteCarloRunner.run(iterations, rng => {
        const noise = rng.nextGaussian(1, 0.2);
        return conversionRate * noise;
      });

      const impressions = Math.round(baseVolume * (variant.trafficPercentage / 100));
      const conversions = Math.round(impressions * conversionSimulation.mean);
      const revenue = conversions * variant.price;

      results.variants.push({
        id: variant.price.toString(),
        price: variant.price,
        impressions,
        conversions,
        conversionRate: conversionSimulation.mean,
        revenue,
        averageOrderValue: variant.price
      });
    }

    // Determine winner
    if (results.variants.length > 1) {
      const control = results.variants[0];
      const bestVariant = results.variants.reduce((best, current) =>
        current.conversionRate * current.price > best.conversionRate * best.price ? current : best
      );

      const lift = ((bestVariant.conversionRate * bestVariant.price) /
        (control.conversionRate * control.price) - 1) * 100;

      // Calculate confidence
      const controlVariance = control.conversionRate * 0.2;
      const bestVariance = bestVariant.conversionRate * 0.2;
      const pooledSE = Math.sqrt(Math.pow(controlVariance, 2) + Math.pow(bestVariance, 2));
      const zScore = lift / pooledSE;
      const confidence = this.zScoreToConfidence(zScore);

      if (confidence > 0.95) {
        results.winner = {
          variantId: bestVariant.id,
          confidence,
          lift
        };
      }
    }

    return results;
  }

  /**
   * Convert z-score to confidence level
   */
  private static zScoreToConfidence(zScore: number): number {
    // Standard normal CDF approximation
    const absZ = Math.abs(zScore);
    const t = 1 / (1 + 0.2316419 * absZ);
    const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    const confidence = 2 * (1 - p) - 1;
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Recommend test design
   */
  static recommendTest(
    currentPrice: number,
    elasticity: number,
    baseVolume: number
  ): Array<{ price: number; trafficPercentage: number }> {
    const recommendations: Array<{ price: number; trafficPercentage: number }> = [];

    // Control (current price)
    recommendations.push({
      price: currentPrice,
      trafficPercentage: 33.33
    });

    // Lower price variant
    const lowerPrice = currentPrice * 0.9;
    recommendations.push({
      price: lowerPrice,
      trafficPercentage: 33.33
    });

    // Higher price variant
    const higherPrice = currentPrice * 1.1;
    recommendations.push({
      price: higherPrice,
      trafficPercentage: 33.34
    });

    return recommendations;
  }
}

/**
 * Price ladder generator
 */
export class PriceLadderGenerator {
  /**
   * Generate price ladder with expected metrics
   */
  static generate(
    startPrice: number,
    endPrice: number,
    steps: number,
    cost: number,
    baseVolume: number,
    elasticity: number,
    competitors: CompetitorPrice[]
  ): Array<{
    price: number;
    expectedVolume: number;
    expectedRevenue: number;
    expectedMargin: number;
    competitiveIndex: number;
  }> {
    const ladder: Array<{
      price: number;
      expectedVolume: number;
      expectedRevenue: number;
      expectedMargin: number;
      competitiveIndex: number;
    }> = [];

    const step = (endPrice - startPrice) / (steps - 1);
    const avgCompetitorPrice = competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
      : startPrice;

    for (let i = 0; i < steps; i++) {
      const price = startPrice + step * i;

      // Calculate expected volume using elasticity
      const priceRatio = price / startPrice;
      const volumeRatio = Math.pow(priceRatio, elasticity);
      const expectedVolume = baseVolume * volumeRatio;

      // Calculate revenue and margin
      const expectedRevenue = price * expectedVolume;
      const expectedMargin = ((price - cost) / price) * 100;

      // Calculate competitive index
      const competitiveIndex = (price / avgCompetitorPrice) * 100;

      ladder.push({
        price: Math.round(price * 100) / 100,
        expectedVolume: Math.round(expectedVolume),
        expectedRevenue: Math.round(expectedRevenue * 100) / 100,
        expectedMargin: Math.round(expectedMargin * 100) / 100,
        competitiveIndex: Math.round(competitiveIndex * 10) / 10
      });
    }

    return ladder;
  }
}

/**
 * Main Pricing Simulation Engine
 */
export class PricingSimulationEngine {
  private simulations: Map<string, PricingSimulationResult> = new Map();

  /**
   * Run pricing simulation
   */
  async run(request: PricingSimulationRequest): Promise<PricingSimulationResult> {
    const startTime = Date.now();
    const id = uuidv4();

    const {
      product,
      competitors,
      segments,
      valueDrivers,
      parameters = {
        iterations: 1000,
        confidenceLevel: 0.95,
        step: 5
      }
    } = request;

    // Run competitive analysis
    const competitiveAnalysis = CompetitivePricingAnalyzer.analyze(
      product.currentPrice,
      competitors
    );

    // Run value-based analysis
    const valueBasedAnalysis = ValueBasedPricingEngine.calculatePrice(
      segments,
      valueDrivers
    );

    // Run elasticity analysis
    const elasticityAnalysis = PriceElasticityEngine.analyze(
      product.currentPrice,
      product.volume,
      product.elasticity,
      segments,
      parameters.iterations
    );

    // Run promotional analysis
    const promotionalAnalysis = PromotionalPricingAnalyzer.analyze(
      product.currentPrice,
      product.volume,
      product.elasticity,
      product.margin
    );

    // Generate recommendations
    const recommendations: PriceRecommendation[] = [];

    // Competitive recommendations
    recommendations.push(
      ...CompetitivePricingAnalyzer.recommend(competitiveAnalysis, 'average', competitors)
    );

    // Value-based recommendations
    recommendations.push(
      ...ValueBasedPricingEngine.recommend(valueBasedAnalysis, product.cost)
    );

    // Elasticity recommendations
    recommendations.push(
      ...PriceElasticityEngine.recommend(elasticityAnalysis, product.currentPrice, product.cost)
    );

    // Promotional recommendations
    recommendations.push(
      ...PromotionalPricingAnalyzer.recommend(promotionalAnalysis, product.currentPrice)
    );

    // Generate A/B test
    const abTestConfig = ABTestingSimulator.recommendTest(
      product.currentPrice,
      product.elasticity,
      product.volume
    );

    const abTests = [
      ABTestingSimulator.simulate(
        product.currentPrice,
        abTestConfig,
        product.volume,
        product.elasticity,
        parameters.iterations
      )
    ];

    // Generate price ladder
    const priceRange = parameters.priceRange || {
      min: product.currentPrice * 0.7,
      max: product.currentPrice * 1.3
    };

    const priceLadder = PriceLadderGenerator.generate(
      priceRange.min,
      priceRange.max,
      Math.ceil((priceRange.max - priceRange.min) / parameters.step) + 1,
      product.cost,
      product.volume,
      product.elasticity,
      competitors
    );

    const result: PricingSimulationResult = {
      id,
      productId: product.id,
      status: 'completed',
      competitiveAnalysis,
      valueBasedAnalysis,
      elasticityAnalysis,
      promotionalAnalysis,
      recommendations,
      abTests,
      priceLadder,
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
   * Get simulation by ID
   */
  get(id: string): PricingSimulationResult | undefined {
    return this.simulations.get(id);
  }

  /**
   * List all simulations
   */
  list(): PricingSimulationResult[] {
    return Array.from(this.simulations.values());
  }
}
