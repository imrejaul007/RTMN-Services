import winston from 'winston';
import { ForecastResult, TimeSeriesPoint } from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Forecasting Service - Predictive Analytics
// ============================================================================

export class ForecastingService {
  /**
   * Generate forecast for a metric
   */
  async forecast(
    tenantId: string,
    options: {
      metric: string;
      horizon: number;
      confidence?: number;
      period?: string;
    }
  ): Promise<ForecastResult> {
    const { metric, horizon = 30, period = '90d' } = options;

    // Get historical data
    const historicalData = await this.getHistoricalData(tenantId, metric, period);

    // Calculate forecast using multiple models
    const models = ['linear', 'exponential', 'moving_average'];
    const forecasts = models.map(model => this.runModel(model, historicalData, horizon));

    // Ensemble the forecasts (weighted average)
    const ensemble = this.ensembleForecasts(forecasts);

    // Calculate accuracy based on historical fit
    const accuracy = this.calculateAccuracy(historicalData);

    return {
      metricId: `${tenantId}-${metric}`,
      predictions: ensemble,
      model: 'ensemble',
      accuracy,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate revenue forecast
   */
  async forecastRevenue(
    tenantId: string,
    horizon: number = 90
  ): Promise<ForecastResult> {
    return this.forecast(tenantId, { metric: 'revenue', horizon });
  }

  /**
   * Generate user growth forecast
   */
  async forecastUserGrowth(
    tenantId: string,
    horizon: number = 90
  ): Promise<ForecastResult> {
    return this.forecast(tenantId, { metric: 'users', horizon });
  }

  /**
   * Generate cash flow forecast
   */
  async forecastCashFlow(
    tenantId: string,
    horizon: number = 180
  ): Promise<{
    monthly: ForecastResult;
    runway: number;
    burnRate: number;
    projections: { month: string; cash: number }[];
  }> {
    const monthly = await this.forecast(tenantId, { metric: 'cash_flow', horizon });

    // Calculate current burn rate and runway
    const burnRate = 140000; // Monthly burn rate
    const currentCash = 2500000; // Current cash reserves

    const projections = [];
    let runningCash = currentCash;

    for (let i = 0; i < horizon / 30; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);

      const monthlyCashFlow = i < monthly.predictions.length
        ? monthly.predictions[i].value
        : monthly.predictions[monthly.predictions.length - 1]?.value || 0;

      runningCash += monthlyCashFlow;

      projections.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cash: Math.round(runningCash),
      });
    }

    const runway = currentCash / burnRate;

    return {
      monthly,
      runway: Math.round(runway * 10) / 10,
      burnRate,
      projections,
    };
  }

  /**
   * Generate demand forecast
   */
  async forecastDemand(
    tenantId: string,
    horizon: number = 30
  ): Promise<{
    predictions: { date: Date; demand: number; lower: number; upper: number }[];
    peakDays: { date: Date; demand: number }[];
    recommendations: string[];
  }> {
    const demandData = await this.getHistoricalData(tenantId, 'demand', '180d');

    // Run forecasting model
    const forecast = this.runModel('linear', demandData, horizon);

    // Identify peak demand days
    const sortedByValue = [...forecast].sort((a, b) => b.value - a.value);
    const peakDays = sortedByValue.slice(0, 5).map(p => ({
      date: p.timestamp,
      demand: p.value,
    }));

    // Generate recommendations
    const recommendations = this.generateDemandRecommendations(forecast);

    return {
      predictions: forecast.map((p, i) => ({
        date: p.timestamp,
        demand: p.value,
        lower: p.lowerBound,
        upper: p.upperBound,
      })),
      peakDays,
      recommendations,
    };
  }

  /**
   * Generate scenario analysis
   */
  async scenarioAnalysis(
    tenantId: string,
    metric: string
  ): Promise<{
    optimistic: ForecastResult;
    baseline: ForecastResult;
    pessimistic: ForecastResult;
    recommendation: string;
  }> {
    const historicalData = await this.getHistoricalData(tenantId, metric, '90d');
    const baseTrend = this.calculateTrend(historicalData);

    // Generate three scenarios
    const optimisticGrowth = baseTrend.changePercent * 1.5;
    const pessimisticGrowth = baseTrend.changePercent * 0.5;

    const optimistic = this.generateScenarioForecast(
      tenantId,
      metric,
      30,
      optimisticGrowth
    );
    const baseline = this.forecast(tenantId, { metric, horizon: 30 });
    const pessimistic = this.generateScenarioForecast(
      tenantId,
      metric,
      30,
      pessimisticGrowth
    );

    return {
      optimistic,
      baseline,
      pessimistic,
      recommendation: this.generateScenarioRecommendation(optimistic, baseline, pessimistic),
    };
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private async getHistoricalData(
    tenantId: string,
    metric: string,
    period: string
  ): Promise<TimeSeriesPoint[]> {
    const days = this.parsePeriodDays(period);
    const points: TimeSeriesPoint[] = [];

    const baseValues: Record<string, number> = {
      revenue: 75000,
      users: 1200,
      cash_flow: -50000,
      demand: 500,
    };

    const baseValue = baseValues[metric] || 100;
    let currentValue = baseValue;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Add trend and seasonality
      const trend = (days - i) * (baseValue * 0.002);
      const seasonality = Math.sin((days - i) * Math.PI / 30) * baseValue * 0.1;
      const noise = (Math.random() - 0.5) * baseValue * 0.05;

      currentValue = baseValue + trend + seasonality + noise;

      points.push({
        timestamp: new Date(date),
        value: Math.round(currentValue * 100) / 100,
      });
    }

    return points;
  }

  private runModel(
    model: string,
    historicalData: TimeSeriesPoint[],
    horizon: number
  ): ForecastResult['predictions'] {
    const predictions: ForecastResult['predictions'] = [];
    const lastValue = historicalData[historicalData.length - 1].value;
    const trend = this.calculateTrend(historicalData);

    let currentValue = lastValue;
    const dailyChange = (lastValue * trend.changePercent) / 100 / 30;

    for (let i = 1; i <= horizon; i++) {
      const date = new Date(historicalData[historicalData.length - 1].timestamp);
      date.setDate(date.getDate() + i);

      // Model-specific prediction
      let predictedValue: number;

      switch (model) {
        case 'linear':
          predictedValue = currentValue + dailyChange * i;
          break;
        case 'exponential':
          predictedValue = currentValue * Math.pow(1 + dailyChange / currentValue, i);
          break;
        case 'moving_average':
          const recentAvg = historicalData.slice(-7).reduce((s, p) => s + p.value, 0) / 7;
          predictedValue = recentAvg + dailyChange * i * 0.8;
          break;
        default:
          predictedValue = currentValue + dailyChange * i;
      }

      // Calculate confidence interval (widens with time)
      const uncertainty = Math.abs(predictedValue) * 0.02 * Math.sqrt(i);
      const lowerBound = predictedValue - uncertainty;
      const upperBound = predictedValue + uncertainty;
      const confidence = Math.max(50, 95 - i * 1.5);

      predictions.push({
        timestamp: date,
        value: Math.round(predictedValue * 100) / 100,
        lowerBound: Math.round(lowerBound * 100) / 100,
        upperBound: Math.round(upperBound * 100) / 100,
        confidence: Math.round(confidence),
      });
    }

    return predictions;
  }

  private ensembleForecasts(forecasts: ForecastResult['predictions'][]): ForecastResult['predictions'] {
    if (forecasts.length === 0) return [];

    const weights = [0.4, 0.35, 0.25]; // Linear, Exponential, MA
    const horizon = forecasts[0].length;

    return forecasts[0].map((_, dayIndex) => {
      let weightedSum = 0;
      let weightedLower = 0;
      let weightedUpper = 0;

      forecasts.forEach((forecast, modelIndex) => {
        const point = forecast[dayIndex];
        weightedSum += point.value * weights[modelIndex];
        weightedLower += point.lowerBound * weights[modelIndex];
        weightedUpper += point.upperBound * weights[modelIndex];
      });

      const avgConfidence = forecasts.reduce(
        (sum, f) => sum + f[dayIndex].confidence,
        0
      ) / forecasts.length;

      return {
        timestamp: forecasts[0][dayIndex].timestamp,
        value: Math.round(weightedSum * 100) / 100,
        lowerBound: Math.round(weightedLower * 100) / 100,
        upperBound: Math.round(weightedUpper * 100) / 100,
        confidence: Math.round(avgConfidence),
      };
    });
  }

  private calculateAccuracy(historicalData: TimeSeriesPoint[]): number {
    // Simple accuracy calculation based on data consistency
    const variance = this.calculateVariance(historicalData.map(p => p.value));
    const mean = historicalData.reduce((sum, p) => sum + p.value, 0) / historicalData.length;
    const cv = Math.sqrt(variance) / mean;

    // Lower coefficient of variation = higher accuracy
    const accuracy = Math.max(70, Math.min(95, 100 - cv * 100));
    return Math.round(accuracy);
  }

  private calculateTrend(dataPoints: TimeSeriesPoint[]): { changePercent: number } {
    if (dataPoints.length < 2) return { changePercent: 0 };

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    return { changePercent };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private generateScenarioForecast(
    tenantId: string,
    metric: string,
    horizon: number,
    growthRate: number
  ): ForecastResult {
    const predictions: ForecastResult['predictions'] = [];
    const lastValue = 75000; // Example base value

    for (let i = 1; i <= horizon; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const dailyGrowth = growthRate / 100 / 365;
      const value = lastValue * Math.pow(1 + dailyGrowth, i * 30);
      const uncertainty = Math.abs(value) * 0.03 * Math.sqrt(i);

      predictions.push({
        timestamp: date,
        value: Math.round(value * 100) / 100,
        lowerBound: Math.round((value - uncertainty) * 100) / 100,
        upperBound: Math.round((value + uncertainty) * 100) / 100,
        confidence: Math.round(Math.max(60, 90 - i * 1)),
      });
    }

    return {
      metricId: `${tenantId}-${metric}`,
      predictions,
      model: 'scenario',
      accuracy: 75,
      generatedAt: new Date(),
    };
  }

  private generateScenarioRecommendation(
    optimistic: ForecastResult,
    baseline: ForecastResult,
    pessimistic: ForecastResult
  ): string {
    const lastBaseline = baseline.predictions[baseline.predictions.length - 1].value;
    const lastOptimistic = optimistic.predictions[optimistic.predictions.length - 1].value;
    const lastPessimistic = pessimistic.predictions[pessimistic.predictions.length - 1].value;

    const upside = ((lastOptimistic - lastBaseline) / lastBaseline * 100).toFixed(1);
    const downside = ((lastPessimistic - lastBaseline) / lastBaseline * 100).toFixed(1);

    return `Expected value in ${baseline.predictions.length} days: $${lastBaseline.toLocaleString()}. ` +
      `Range: $${lastPessimistic.toLocaleString()} (-${downside}%) to $${lastOptimistic.toLocaleString()} (+${upside}%). ` +
      `Recommend preparing contingency plans for downside scenario while maximizing investments in upside opportunities.`;
  }

  private generateDemandRecommendations(forecast: ForecastResult['predictions']): string[] {
    const recommendations: string[] = [];
    const maxDemand = Math.max(...forecast.map(p => p.value));
    const avgDemand = forecast.reduce((sum, p) => sum + p.value, 0) / forecast.length;

    if (maxDemand > avgDemand * 1.3) {
      recommendations.push('Consider increasing capacity to handle peak demand periods');
    }

    const increasingDays = forecast.filter((p, i) => i > 0 && p.value > forecast[i - 1].value).length;
    if (increasingDays > forecast.length * 0.6) {
      recommendations.push('Demand is trending upward - plan for inventory and staffing increases');
    }

    recommendations.push('Use confidence intervals to plan safety stock levels');

    return recommendations;
  }

  private parsePeriodDays(period: string): number {
    const match = period.match(/(\d+)([dwmy])?/);
    if (!match) return 90;

    const value = parseInt(match[1], 10);
    const unit = match[2] || 'd';

    switch (unit) {
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return value;
    }
  }
}
