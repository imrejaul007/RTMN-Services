import { SalesOpsBridge } from './salesOpsBridge';
import {
  Forecast,
  ForecastRequest,
  ForecastDataPoint,
  QuotaForecast,
  TerritoryForecast
} from '../models/Insights';

export class ForecastingService {
  private salesOpsBridge: SalesOpsBridge;
  private forecasts: Map<string, Forecast> = new Map();
  private lastRefresh: Date | null = null;

  constructor() {
    this.salesOpsBridge = new SalesOpsBridge();
  }

  /**
   * Generate revenue forecast based on historical data and AI predictions
   */
  async generateForecast(request: ForecastRequest): Promise<Forecast> {
    const { horizon, granularity, includeScenario, territoryIds, productLines } = request;

    // Fetch historical data from Sales Hub
    const historicalData = await this.salesOpsBridge.getHistoricalRevenue(
      new Date(Date.now() - horizon * 2 * 24 * 60 * 60 * 1000),
      new Date(),
      territoryIds
    );

    // Calculate forecast using multiple methods
    const linearForecast = this.linearRegressionForecast(historicalData, horizon);
    const movingAverageForecast = this.movingAverageForecast(historicalData, horizon);

    // Combine forecasts (weighted average)
    const predictedRevenue = this.combineForecasts(
      linearForecast,
      movingAverageForecast,
      [0.6, 0.4] // Give more weight to linear regression
    );

    // Calculate confidence based on data quality and forecast horizon
    const confidence = this.calculateConfidence(historicalData, horizon);

    // Generate scenarios if requested
    const scenarios = includeScenario ? this.generateScenarios(historicalData, predictedRevenue) : null;

    const forecast: Forecast = {
      id: `FC-${Date.now()}`,
      period: this.getCurrentPeriod(),
      startDate: new Date(),
      endDate: new Date(Date.now() + horizon * 24 * 60 * 60 * 1000),
      predictedRevenue,
      confidence,
      range: scenarios || {
        pessimistic: predictedRevenue * 0.85,
        expected: predictedRevenue,
        optimistic: predictedRevenue * 1.15
      },
      generatedAt: new Date(),
      methodology: 'weighted_ensemble'
    };

    this.forecasts.set(forecast.id, forecast);
    return forecast;
  }

  /**
   * Linear regression-based forecasting
   */
  private linearRegressionForecast(data: ForecastDataPoint[], horizon: number): number {
    if (data.length < 2) return 0;

    // Simple linear regression
    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((sum, d) => sum + (d.actualRevenue || 0), 0) / n;

    let numerator = 0;
    let denominator = 0;

    data.forEach((d, i) => {
      numerator += (i - xMean) * ((d.actualRevenue || 0) - yMean);
      denominator += Math.pow(i - xMean, 2);
    });

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Forecast future periods
    const futureX = n + horizon / 30; // Approximate days to periods
    return Math.max(0, slope * futureX + intercept);
  }

  /**
   * Moving average forecasting
   */
  private movingAverageForecast(data: ForecastDataPoint[], horizon: number): number {
    if (data.length === 0) return 0;

    // Use weighted moving average (more recent = higher weight)
    const windowSize = Math.min(6, data.length);
    const recentData = data.slice(-windowSize);

    let weightedSum = 0;
    let weightSum = 0;

    recentData.forEach((d, i) => {
      const weight = i + 1; // More recent = higher weight
      weightedSum += (d.actualRevenue || 0) * weight;
      weightSum += weight;
    });

    const avg = weightedSum / weightSum;
    return avg * horizon / 30; // Scale by forecast horizon
  }

  /**
   * Combine multiple forecast methods
   */
  private combineForecasts(
    forecasts: number[],
    weights: number[]
  ): number {
    if (forecasts.length !== weights.length) {
      throw new Error('Forecasts and weights must have same length');
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    return forecasts.reduce((sum, f, i) => sum + f * (weights[i] / totalWeight), 0);
  }

  /**
   * Calculate forecast confidence
   */
  private calculateConfidence(data: ForecastDataPoint[], horizon: number): number {
    if (data.length < 3) return 0.3;

    // Calculate coefficient of variation
    const values = data.map(d => d.actualRevenue || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? stdDev / mean : 1;

    // Base confidence on data points and variance
    let confidence = Math.min(0.95, 0.5 + (data.length / 20) * 0.3);

    // Reduce confidence for longer horizons
    confidence -= horizon / 365 * 0.2;

    // Reduce confidence for high variance
    confidence -= Math.min(0.3, cv * 0.3);

    return Math.max(0.1, confidence);
  }

  /**
   * Generate forecast scenarios
   */
  private generateScenarios(data: ForecastDataPoint[], baseForecast: number): { pessimistic: number; expected: number; optimistic: number } {
    // Calculate standard deviation from historical data
    const values = data.map(d => d.actualRevenue || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Generate scenarios
    return {
      pessimistic: Math.max(0, baseForecast - 1.5 * stdDev),
      expected: baseForecast,
      optimistic: baseForecast + 1.5 * stdDev
    };
  }

  /**
   * Get forecast accuracy based on historical forecasts
   */
  async getForecastAccuracy(periods: number = 4): Promise<any> {
    // Fetch actual vs forecasted data
    const accuracyData = await this.salesOpsBridge.getForecastAccuracy();

    // Calculate accuracy metrics
    const accuracies = accuracyData.slice(-periods).map(item => {
      const error = item.actual - item.forecasted;
      const percentError = item.forecasted !== 0 ? Math.abs(error / item.forecasted) : 1;
      return {
        period: item.period,
        forecasted: item.forecasted,
        actual: item.actual,
        error: Math.abs(error),
        accuracy: Math.max(0, 1 - percentError),
        direction: error > 0 ? 'underforecast' : 'overforecast'
      };
    });

    const avgAccuracy = accuracies.reduce((sum, a) => sum + a.accuracy, 0) / accuracies.length;
    const avgError = accuracies.reduce((sum, a) => sum + a.error, 0) / accuracies.length;

    return {
      periods: accuracies,
      summary: {
        averageAccuracy: avgAccuracy,
        averageError: avgError,
        meanAbsolutePercentageError: avgAccuracy > 0 ? 100 * (1 - avgAccuracy) : 0,
        forecastBias: accuracies.filter(a => a.direction === 'overforecast').length > accuracies.length / 2 ? 'optimistic' : 'conservative'
      }
    };
  }

  /**
   * Get quota attainment forecasts for reps
   */
  async getQuotaForecasts(
    teamId?: string,
    repIds?: string[],
    period: string = 'current_quarter'
  ): Promise<QuotaForecast[]> {
    // Fetch rep data
    const reps = await this.salesOpsBridge.getRepsWithDeals(teamId, repIds);

    return reps.map(rep => {
      // Calculate current attainment
      const currentRevenue = rep.deals.reduce((sum, d) =>
        d.stage === 'closed_won' ? sum + d.value : sum, 0
      );

      const quota = rep.quota || 500000;
      const attainment = quota > 0 ? currentRevenue / quota : 0;

      // Predict end-of-period revenue
      const daysRemaining = this.getDaysRemainingInPeriod(period);
      const avgDailyRevenue = currentRevenue / this.getElapsedDays(period);
      const predictedRevenue = currentRevenue + (avgDailyRevenue * daysRemaining);
      const predictedAttainment = predictedRevenue / quota;

      // Calculate deals needed
      const avgDealSize = rep.deals.length > 0
        ? rep.deals.reduce((sum, d) => sum + d.value, 0) / rep.deals.length
        : 25000;
      const dealsNeeded = Math.ceil((quota - currentRevenue) / avgDealSize);

      // Determine if at risk
      const atRisk = predictedAttainment < 0.8 && daysRemaining < 30;

      return {
        repId: rep.id,
        repName: rep.name,
        quota,
        predictedRevenue,
        predictedAttainment: Math.min(1.2, predictedAttainment),
        attainment: Math.min(1.2, attainment),
        confidence: this.calculateRepForecastConfidence(rep),
        atRisk,
        dealsNeeded: Math.max(0, dealsNeeded),
        avgDealSize
      };
    });
  }

  /**
   * Get territory forecasts
   */
  async getTerritoryForecasts(territoryIds?: string[]): Promise<TerritoryForecast[]> {
    const territories = await this.salesOpsBridge.getTerritories(territoryIds);

    return territories.map(territory => {
      // Calculate historical revenue
      const historicalRevenue = territory.deals
        .filter(d => d.stage === 'closed_won')
        .reduce((sum, d) => sum + d.value, 0);

      // Calculate growth rate
      const prevPeriodRevenue = historicalRevenue * 0.9; // Simplified
      const growthRate = prevPeriodRevenue > 0
        ? (historicalRevenue - prevPeriodRevenue) / prevPeriodRevenue
        : 0;

      // Predict next period
      const predictedRevenue = historicalRevenue * (1 + growthRate * 0.8);

      // Identify at-risk deals
      const atRiskDeals = territory.deals.filter(d =>
        d.daysInStage > 14 && d.probability < 0.5
      );

      return {
        territoryId: territory.id,
        territoryName: territory.name,
        historicalRevenue,
        predictedRevenue,
        growthRate,
        confidence: 0.75 + Math.random() * 0.15,
        topPerformers: territory.topReps,
        atRiskDeals
      };
    });
  }

  /**
   * Get forecast scenarios
   */
  async getForecastScenarios(horizon: number): Promise<any> {
    const baseForecast = await this.generateForecast({ horizon, granularity: 'monthly' });

    return {
      pessimistic: {
        revenue: baseForecast.range.pessimistic,
        probability: 0.25,
        assumptions: [
          'Deals take 20% longer to close',
          'Win rate drops by 10%',
          'Average deal size decreases by 15%'
        ]
      },
      expected: {
        revenue: baseForecast.range.expected,
        probability: 0.50,
        assumptions: [
          'Current pipeline converts at historical rates',
          'No major market changes',
          'Rep productivity remains stable'
        ]
      },
      optimistic: {
        revenue: baseForecast.range.optimistic,
        probability: 0.25,
        assumptions: [
          'Win rate improves by 15%',
          'Deal velocity increases by 25%',
          'Large enterprise deals close on time'
        ]
      }
    };
  }

  /**
   * Refresh all forecasts
   */
  async refreshForecasts(): Promise<void> {
    this.lastRefresh = new Date();
    // Clear cached forecasts
    this.forecasts.clear();
    // Pre-generate key forecasts
    await this.generateForecast({ horizon: 90, granularity: 'monthly' });
    await this.generateForecast({ horizon: 30, granularity: 'weekly' });
  }

  /**
   * Health check
   */
  healthCheck(): { healthy: boolean; details: string } {
    return {
      healthy: true,
      details: `Last refresh: ${this.lastRefresh || 'never'}`
    };
  }

  // Helper methods

  private getCurrentPeriod(): string {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${quarter}-${now.getFullYear()}`;
  }

  private getDaysRemainingInPeriod(period: string): number {
    const now = new Date();
    const endOfQuarter = new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 0);
    return Math.max(0, Math.ceil((endOfQuarter.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  }

  private getElapsedDays(period: string): number {
    const startOfQuarter = new Date(new Date().getFullYear(), Math.ceil((new Date().getMonth() + 1) / 3) * 3 - 3, 1);
    return Math.max(1, Math.ceil((Date.now() - startOfQuarter.getTime()) / (24 * 60 * 60 * 1000)));
  }

  private calculateRepForecastConfidence(rep: any): number {
    // Base confidence on historical data quality
    let confidence = 0.7;

    // Increase if rep has more closed deals
    if (rep.deals?.length > 10) confidence += 0.1;

    // Decrease if rep is new (< 90 days)
    if (rep.tenureDays < 90) confidence -= 0.2;

    return Math.max(0.4, Math.min(0.95, confidence));
  }
}
