/**
 * Forecasting Service
 * Cash flow prediction and financial forecasting
 */

import { v4 as uuidv4 } from 'uuid';
import { Forecast } from '../models/Forecast';
import { CashFlowForecast, ForecastFactor } from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export class ForecastingService {
  /**
   * Generate cash flow forecast for the next N days
   */
  async generateForecast(horizon: number = 30): Promise<CashFlowForecast[]> {
    logger.info(`Generating cash flow forecast for ${horizon} days`);

    const forecasts: CashFlowForecast[] = [];
    const today = new Date();

    // Historical data simulation (in production would query real data)
    const avgDailyInflow = 15000;
    const avgDailyOutflow = 12000;
    const volatility = 0.2;

    for (let day = 1; day <= horizon; day++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + day);

      // Add some variation based on day of week
      const dayOfWeek = forecastDate.getDay();
      const weekdayMultiplier = [0.3, 1.1, 1.2, 1.1, 1.0, 0.7, 0.4][dayOfWeek];

      // Add randomness
      const randomFactor = 1 + (Math.random() - 0.5) * volatility;

      const predictedInflow = Math.round(avgDailyInflow * weekdayMultiplier * randomFactor);
      const predictedOutflow = Math.round(avgDailyOutflow * weekdayMultiplier * randomFactor);
      const netCashFlow = predictedInflow - predictedOutflow;

      // Generate factors
      const factors = this.generateForecastFactors(predictedInflow, predictedOutflow, dayOfWeek);

      // Calculate confidence (decreases with horizon)
      const confidence = Math.max(50, 95 - day * 1.5);

      const forecast: CashFlowForecast = {
        id: uuidv4(),
        date: forecastDate,
        predictedInflow,
        predictedOutflow,
        netCashFlow,
        confidence,
        horizon: day,
        factors,
        createdAt: new Date(),
      };

      forecasts.push(forecast);

      // Save to database
      await this.saveForecast(forecast);
    }

    return forecasts;
  }

  /**
   * Generate factors affecting the forecast
   */
  private generateForecastFactors(
    inflow: number,
    outflow: number,
    dayOfWeek: number
  ): ForecastFactor[] {
    const factors: ForecastFactor[] = [];

    // Day of week factor
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    factors.push({
      name: 'Day of Week',
      impact: dayOfWeek === 1 || dayOfWeek === 5 ? 0.15 : -0.05,
      description: `${dayNames[dayOfWeek]} typically has ${dayOfWeek === 1 ? 'higher' : 'lower'} transaction volume`,
    });

    // Seasonal factor (simulated)
    const month = new Date().getMonth();
    const seasonalMultiplier = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.05, 1.0, 0.95, 1.2, 1.3][month];
    factors.push({
      name: 'Seasonal',
      impact: (seasonalMultiplier - 1) * 0.5,
      description: `Current month trend: ${seasonalMultiplier > 1 ? 'positive' : 'negative'} seasonal adjustment`,
    });

    // Payment cycle factor
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth >= 25 || dayOfMonth <= 5) {
      factors.push({
        name: 'Payment Cycle',
        impact: 0.2,
        description: 'End of month / start of month payment processing peak',
      });
    }

    // Cash flow trend
    if (inflow > outflow * 1.2) {
      factors.push({
        name: 'Positive Trend',
        impact: 0.1,
        description: 'Inflow significantly exceeds outflow',
      });
    } else if (inflow < outflow * 0.8) {
      factors.push({
        name: 'Negative Trend',
        impact: -0.1,
        description: 'Outflow exceeds inflow - attention needed',
      });
    }

    return factors;
  }

  /**
   * Save forecast to database
   */
  private async saveForecast(forecast: CashFlowForecast): Promise<void> {
    try {
      const forecastDoc = new Forecast({
        date: forecast.date,
        predictedInflow: forecast.predictedInflow,
        predictedOutflow: forecast.predictedOutflow,
        netCashFlow: forecast.netCashFlow,
        confidence: forecast.confidence,
        horizon: forecast.horizon,
        factors: forecast.factors,
        createdAt: forecast.createdAt,
      });
      await forecastDoc.save();
    } catch (error) {
      logger.error('Failed to save forecast:', error);
    }
  }

  /**
   * Get forecasts from database
   */
  async getForecasts(horizon?: number, limit: number = 30): Promise<CashFlowForecast[]> {
    const query: Record<string, unknown> = {};
    if (horizon) query.horizon = { $lte: horizon };

    const forecasts = await Forecast.find(query)
      .sort({ date: 1 })
      .limit(limit);

    return forecasts.map((doc) => ({
      id: doc._id.toString(),
      date: doc.date,
      predictedInflow: doc.predictedInflow,
      predictedOutflow: doc.predictedOutflow,
      netCashFlow: doc.netCashFlow,
      confidence: doc.confidence,
      horizon: doc.horizon,
      factors: doc.factors,
      createdAt: doc.createdAt,
    }));
  }

  /**
   * Get summary forecast (weekly/monthly aggregates)
   */
  async getForecastSummary(horizon: number = 30): Promise<{
    totalPredictedInflow: number;
    totalPredictedOutflow: number;
    netCashFlow: number;
    avgDailyInflow: number;
    avgDailyOutflow: number;
    avgConfidence: number;
    trend: 'positive' | 'neutral' | 'negative';
  }> {
    const forecasts = await this.getForecasts(horizon, horizon);

    if (forecasts.length === 0) {
      return {
        totalPredictedInflow: 0,
        totalPredictedOutflow: 0,
        netCashFlow: 0,
        avgDailyInflow: 0,
        avgDailyOutflow: 0,
        avgConfidence: 0,
        trend: 'neutral',
      };
    }

    const totalPredictedInflow = forecasts.reduce((sum, f) => sum + f.predictedInflow, 0);
    const totalPredictedOutflow = forecasts.reduce((sum, f) => sum + f.predictedOutflow, 0);
    const netCashFlow = totalPredictedInflow - totalPredictedOutflow;
    const avgConfidence =
      forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;

    // Determine trend
    let trend: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (netCashFlow > totalPredictedInflow * 0.15) {
      trend = 'positive';
    } else if (netCashFlow < 0) {
      trend = 'negative';
    }

    return {
      totalPredictedInflow,
      totalPredictedOutflow,
      netCashFlow,
      avgDailyInflow: totalPredictedInflow / forecasts.length,
      avgDailyOutflow: totalPredictedOutflow / forecasts.length,
      avgConfidence,
      trend,
    };
  }

  /**
   * Update forecast with actual values
   */
  async updateForecastWithActual(
    forecastId: string,
    actualInflow: number,
    actualOutflow: number
  ): Promise<boolean> {
    const variance = (actualInflow - actualOutflow) -
      (0 /* would be predicted net from stored forecast */);

    const result = await Forecast.findByIdAndUpdate(
      forecastId,
      {
        actualInflow,
        actualOutflow,
        variance,
      },
      { new: true }
    );

    return !!result;
  }
}

export const forecastingService = new ForecastingService();
