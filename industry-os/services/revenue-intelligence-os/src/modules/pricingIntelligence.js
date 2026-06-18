/**
 * Pricing Intelligence Module
 * Dynamic pricing optimization and competitive benchmarking
 */

export class PricingIntelligence {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all pricing rules
   */
  getRules() {
    const rules = Array.from(this.db.pricingRules.values());
    return {
      rules: rules.map(r => ({
        ...r,
        monthlyRevenue: r.basePrice * 100, // Assume 100 customers
        annualRevenue: r.basePrice * 100 * 12,
      })),
      summary: {
        avgMargin: (rules.reduce((s, r) => s + r.margin, 0) / rules.length).toFixed(1),
        activeRules: rules.filter(r => r.status === 'active').length,
        totalProducts: rules.length,
      },
    };
  }

  /**
   * Optimize pricing for a product
   */
  optimize(productId, marketData = {}) {
    const rule = this.db.pricingRules.get(productId);
    if (!rule) {
      return { error: 'Product pricing rule not found' };
    }

    const currentPrice = rule.basePrice;
    const competitorAvg = marketData.competitorAvg || currentPrice * 0.95;
    const competitorHigh = marketData.competitorHigh || currentPrice * 1.1;
    const competitorLow = marketData.competitorLow || currentPrice * 0.85;
    const elasticity = marketData.elasticity || -1.2;
    const marketDemand = marketData.demand || 'normal';

    // Calculate optimal price based on margin and competitiveness
    let optimalPrice = currentPrice;

    if (marketDemand === 'high') {
      optimalPrice = currentPrice * 1.08; // 8% increase for high demand
    } else if (marketDemand === 'low') {
      optimalPrice = currentPrice * 0.95; // 5% decrease for low demand
    } else {
      optimalPrice = currentPrice * 1.03; // 3% slight optimization
    }

    // Ensure we're within competitive range
    const maxPrice = competitorHigh * 1.1;
    const minPrice = competitorLow * 0.9;

    if (optimalPrice > maxPrice) {
      optimalPrice = maxPrice;
    }

    const change = optimalPrice - currentPrice;
    const changePercent = ((optimalPrice / currentPrice - 1) * 100).toFixed(1);

    const recommendation = change > currentPrice * 0.05 ?
      { action: 'increase', amount: change, percentage: changePercent, confidence: 'high' } :
      change < -currentPrice * 0.05 ?
      { action: 'decrease', amount: Math.abs(change), percentage: Math.abs(changePercent), confidence: 'medium' } :
      { action: 'maintain', amount: 0, percentage: 0, confidence: 'high', reason: 'Price is optimally positioned' };

    // Calculate revenue impact
    const estimatedVolume = 100; // Current customers
    const elasticityImpact = changePercent * elasticity * 0.1; // 10% of elasticity effect
    const newVolume = estimatedVolume * (1 + elasticityImpact / 100);
    const revenueImpact = (optimalPrice * newVolume - currentPrice * estimatedVolume);

    return {
      product: rule.product,
      currentPrice,
      optimalPrice: Math.round(optimalPrice),
      recommendation,
      analysis: {
        competitorAvg,
        competitorRange: { low: competitorLow, high: competitorHigh },
        elasticity,
        marketDemand,
        position: optimalPrice > competitorAvg ? 'premium' : optimalPrice > competitorLow ? 'competitive' : 'value',
      },
      impact: {
        currentRevenue: currentPrice * estimatedVolume,
        projectedRevenue: optimalPrice * newVolume,
        revenueChange: Math.round(revenueImpact),
        marginChange: rule.margin + (recommendation.action === 'increase' ? 1.5 : recommendation.action === 'decrease' ? -1 : 0),
      },
      strategies: this.generateStrategies(currentPrice, optimalPrice, rule.margin, competitorAvg),
    };
  }

  /**
   * Generate pricing strategies
   */
  generateStrategies(current, optimal, margin, competitorAvg) {
    const strategies = [];

    if (optimal > current * 1.05) {
      strategies.push({
        name: 'Value-based increase',
        description: 'Increase price based on value delivered',
        risk: 'low',
        expectedImpact: '8-12% revenue increase',
        implementation: 'Gradual 5% increase with customer communication',
      });
    }

    if (margin < 60) {
      strategies.push({
        name: 'Margin improvement',
        description: 'Optimize costs to improve margin',
        risk: 'medium',
        expectedImpact: '3-5% margin improvement',
        implementation: 'Review pricing tiers and reduce discounting',
      });
    }

    if (optimal < competitorAvg * 0.9) {
      strategies.push({
        name: 'Premium positioning',
        description: 'Position as premium to justify higher pricing',
        risk: 'high',
        expectedImpact: '15-20% revenue increase',
        implementation: 'Add features/bundles to justify premium pricing',
      });
    }

    strategies.push({
      name: 'Bundle optimization',
      description: 'Create bundles to increase average deal size',
      risk: 'low',
      expectedImpact: '10-15% increase in deal size',
      implementation: 'Pair with complementary products',
    });

    return strategies;
  }

  /**
   * Get competitive pricing data
   */
  getCompetitors() {
    return {
      competitors: [
        {
          name: 'Competitor A',
          enterprise: 48000,
          professional: 18000,
          starter: 4500,
          strength: 'Enterprise focus',
          weakness: 'Higher pricing',
          marketShare: 25,
        },
        {
          name: 'Competitor B',
          enterprise: 52000,
          professional: 22000,
          starter: 5500,
          strength: 'Feature-rich',
          weakness: 'Complex onboarding',
          marketShare: 30,
        },
        {
          name: 'Competitor C',
          enterprise: 45000,
          professional: 17000,
          starter: 4000,
          strength: 'Low cost',
          weakness: 'Limited features',
          marketShare: 20,
        },
        {
          name: 'Market Leader',
          enterprise: 55000,
          professional: 25000,
          starter: 6000,
          strength: 'Brand recognition',
          weakness: 'Slow innovation',
          marketShare: 35,
        },
        {
          name: 'Market Average',
          enterprise: 48333,
          professional: 19000,
          starter: 4666,
          strength: 'Benchmark',
          weakness: 'N/A',
          marketShare: 100,
        },
      ],
      analysis: {
        avgEnterprise: 49667,
        avgProfessional: 19200,
        avgStarter: 4833,
        ourPosition: 'competitive',
        recommendation: 'Consider premium positioning for Enterprise tier',
      },
    };
  }

  /**
   * Calculate price sensitivity
   */
  calculateSensitivity(productId, priceChange) {
    const rule = this.db.pricingRules.get(productId);
    if (!rule) return { error: 'Product not found' };

    const elasticity = -1.2; // Typical SaaS elasticity
    const volumeChange = priceChange * elasticity;
    const currentVolume = 100;
    const newVolume = currentVolume * (1 + volumeChange / 100);
    const currentRevenue = rule.basePrice * currentVolume;
    const newPrice = rule.basePrice * (1 + priceChange / 100);
    const newRevenue = newPrice * newVolume;

    return {
      product: rule.product,
      priceChange: `${priceChange > 0 ? '+' : ''}${priceChange}%`,
      elasticity,
      volumeChange: `${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%`,
      revenueChange: {
        current: currentRevenue,
        projected: Math.round(newRevenue),
        change: Math.round(newRevenue - currentRevenue),
        percent: ((newRevenue / currentRevenue - 1) * 100).toFixed(1),
      },
      breakEvenPriceChange: Math.round((1 / Math.abs(elasticity) - 1) * 100),
      recommendation: newRevenue > currentRevenue ? 'Increase price' : 'Maintain current price',
    };
  }

  /**
   * Get pricing history
   */
  getHistory(productId) {
    const history = this.db.priceHistory.get(productId) || [];

    return {
      productId,
      history: history.length > 0 ? history : [
        { date: '2026-01-01', price: 45000, reason: 'Initial pricing' },
        { date: '2026-04-01', price: 47500, reason: 'Market adjustment' },
        { date: '2026-06-01', price: 50000, reason: 'Value addition' },
      ],
    };
  }

  /**
   * Add pricing rule
   */
  addRule(rule) {
    const id = `PRC${Date.now()}`;
    const newRule = {
      id,
      ...rule,
      status: 'active',
      margin: rule.margin || 60,
      updatedAt: new Date().toISOString(),
    };
    this.db.pricingRules.set(id, newRule);
    return newRule;
  }

  /**
   * Get discount analysis
   */
  getDiscountAnalysis() {
    return {
      avgDiscountGiven: 12.5,
      discountBrackets: [
        { range: '0-10%', count: 45, avgDealSize: 25000 },
        { range: '10-20%', count: 30, avgDealSize: 35000 },
        { range: '20-30%', count: 15, avgDealSize: 45000 },
        { range: '30%+', count: 10, avgDealSize: 60000 },
      ],
      discountRecovery: 65,
      recommendations: [
        { type: 'control', message: 'Set discount limits by deal size', priority: 'high' },
        { type: 'approval', message: 'Require approval for >20% discounts', priority: 'medium' },
        { type: 'bundling', message: 'Use bundles instead of discounts', priority: 'low' },
      ],
    };
  }
}

export default PricingIntelligence;
