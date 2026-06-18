/**
 * Demand Intelligence Module
 * AI-powered demand forecasting and market signal analysis
 */

export class DemandIntelligence {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all demand signals
   */
  getSignals() {
    const signals = Array.from(this.db.demandSignals.values());
    const totalVolume = signals.reduce((sum, s) => sum + s.volume, 0);
    const totalConversions = signals.reduce((sum, s) => sum + (s.volume * s.conversionRate / 100), 0);
    const avgConversion = totalConversions / totalVolume * 100;

    return {
      signals: signals.map(s => ({
        ...s,
        contribution: ((s.volume / totalVolume) * 100).toFixed(1),
        conversionContribution: ((s.volume * s.conversionRate) / (totalVolume * avgConversion / 100) * 100).toFixed(1),
        projectedRevenue: s.volume * s.conversionRate / 100 * 1000, // Assume $1000 avg deal
      })),
      summary: {
        totalVolume,
        avgConversionRate: avgConversion.toFixed(1),
        strongestSignal: signals.reduce((max, s) => s.conversionRate > max.conversionRate ? s : max),
        weakestSignal: signals.reduce((min, s) => s.conversionRate < min.conversionRate ? s : min),
        trendingUp: signals.filter(s => s.trend === 'up').length,
        trendingDown: signals.filter(s => s.trend === 'down').length,
        stable: signals.filter(s => s.trend === 'stable').length,
      },
    };
  }

  /**
   * Run demand forecast
   */
  forecast(horizon = 3, factors = []) {
    const baseRevenue = 12000000;
    const forecasts = [];

    for (let i = 1; i <= horizon; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);

      // Seasonality factor (Q3 typically higher)
      const month = date.getMonth();
      let seasonality = 1;
      if (month >= 5 && month <= 8) seasonality = 1.15; // High season
      else if (month >= 11 || month <= 1) seasonality = 0.9; // Low season

      // Trend factor (8% monthly growth)
      const trend = 1 + (0.08 * i);

      // Random variance
      const randomFactor = 0.95 + (Math.random() * 0.1);

      // Factor adjustments
      let factorAdjustment = 1;
      if (factors.includes('economic_downturn')) factorAdjustment *= 0.85;
      if (factors.includes('market_boom')) factorAdjustment *= 1.15;
      if (factors.includes('seasonal_peak')) factorAdjustment *= 1.1;

      const predicted = baseRevenue * seasonality * trend * randomFactor * factorAdjustment;

      forecasts.push({
        id: `DF${Date.now()}${i}`,
        horizon: i,
        month: date.toISOString().slice(0, 7),
        predicted: Math.round(predicted),
        confidence: 92 - (i * 3),
        factors: [...factors, 'seasonality', 'trend', 'organic_growth'],
        seasonality: seasonality > 1 ? 'high' : seasonality < 1 ? 'low' : 'normal',
        createdAt: new Date().toISOString(),
      });
    }

    // Store forecasts
    forecasts.forEach(f => this.db.demandForecasts.set(f.id, f));

    return {
      forecasts,
      summary: {
        baseRevenue,
        totalPredicted: forecasts.reduce((s, f) => s + f.predicted, 0),
        avgConfidence: forecasts.reduce((s, f) => s + f.confidence, 0) / forecasts.length,
        avgGrowth: ((forecasts[forecasts.length - 1].predicted / forecasts[0].predicted - 1) * 100).toFixed(1),
      },
    };
  }

  /**
   * Get seasonality patterns
   */
  getSeasonality() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      patterns: months.map((month, i) => ({
        month,
        index: parseFloat((0.85 + (Math.sin((i + 3) * Math.PI / 6) * 0.15)).toFixed(2)),
        description: i >= 5 && i <= 8 ? 'High Season' : i >= 11 || i <= 1 ? 'Low Season' : 'Standard',
        revenueMultiplier: parseFloat((0.85 + (Math.sin((i + 3) * Math.PI / 6) * 0.15)).toFixed(2)),
      })),
      peak: { month: 'July', index: 1.0 },
      low: { month: 'January', index: 0.85 },
    };
  }

  /**
   * Analyze market trends
   */
  analyzeTrends() {
    const signals = Array.from(this.db.demandSignals.values());

    const organicGrowth = signals
      .filter(s => s.type === 'organic')
      .reduce((sum, s) => sum + (s.trend === 'up' ? s.volume : s.trend === 'down' ? -s.volume : 0), 0);

    const paidGrowth = signals
      .filter(s => s.type === 'paid')
      .reduce((sum, s) => sum + (s.trend === 'up' ? s.volume : s.trend === 'down' ? -s.volume : 0), 0);

    return {
      overallTrend: organicGrowth > 0 && paidGrowth > 0 ? 'accelerating' :
                    organicGrowth < 0 && paidGrowth < 0 ? 'declining' :
                    organicGrowth > 0 ? 'organic_led' : 'paid_led',
      organicGrowth,
      paidGrowth,
      signals: signals.map(s => ({
        source: s.source,
        volume: s.volume,
        trend: s.trend,
        health: this.calculateSignalHealth(s),
      })),
      recommendations: this.generateTrendRecommendations(organicGrowth, paidGrowth),
    };
  }

  /**
   * Calculate signal health score
   */
  calculateSignalHealth(signal) {
    const trendScore = signal.trend === 'up' ? 3 : signal.trend === 'stable' ? 2 : 1;
    const volumeScore = signal.volume > 20000 ? 3 : signal.volume > 10000 ? 2 : 1;
    const conversionScore = signal.conversionRate > 4 ? 3 : signal.conversionRate > 2 ? 2 : 1;

    const total = trendScore + volumeScore + conversionScore;
    return total >= 7 ? 'healthy' : total >= 5 ? 'moderate' : 'concerning';
  }

  /**
   * Generate trend recommendations
   */
  generateTrendRecommendations(organic, paid) {
    const recommendations = [];

    if (organic > 10000) {
      recommendations.push({
        type: 'opportunity',
        message: 'Strong organic growth detected - consider investing in SEO/content',
        impact: 'high',
      });
    }

    if (paid > 5000 && organic < 5000) {
      recommendations.push({
        type: 'warning',
        message: 'Growth is primarily paid - diversify with organic channels',
        impact: 'medium',
      });
    }

    if (organic < 0) {
      recommendations.push({
        type: 'alert',
        message: 'Organic traffic declining - review content strategy',
        impact: 'high',
      });
    }

    return recommendations;
  }

  /**
   * Add new demand signal
   */
  addSignal(signal) {
    const id = `SIG${Date.now()}`;
    const newSignal = {
      id,
      ...signal,
      updatedAt: new Date().toISOString(),
    };
    this.db.demandSignals.set(id, newSignal);
    return newSignal;
  }

  /**
   * Get pipeline coverage ratio
   */
  getPipelineCoverage() {
    const signals = Array.from(this.db.demandSignals.values());
    const totalPipeline = signals.reduce((sum, s) => sum + s.volume * s.conversionRate / 100 * 1000, 0);
    const targetRevenue = 15000000; // Monthly target

    return {
      totalPipeline,
      targetRevenue,
      coverageRatio: (totalPipeline / targetRevenue).toFixed(2),
      monthsOfPipeline: (totalPipeline / 12000000).toFixed(1),
      health: totalPipeline > targetRevenue ? 'healthy' : totalPipeline > targetRevenue * 0.7 ? 'adequate' : 'low',
    };
  }
}

export default DemandIntelligence;
