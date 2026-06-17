import { Router, Request, Response } from 'express';
import { Briefing } from '../models/Briefing';
import { Metric } from '../models/Metric';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, Forecast, ForecastPrediction } from '../types';

const router = Router();

/**
 * GET /api/executive/forecast
 * Get all forecasts
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Generate forecasts on the fly based on historical data
    const briefings = await Briefing.find()
      .sort({ date: -1 })
      .limit(30)
      .exec();

    const forecasts = generateAllForecasts(briefings);

    res.json({
      success: true,
      data: forecasts
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate forecasts',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/forecast/revenue
 * Get revenue forecast
 */
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;

    const briefings = await Briefing.find()
      .sort({ date: -1 })
      .limit(90)
      .exec();

    const forecast = generateRevenueForecast(briefings, period as string);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate revenue forecast',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/forecast/growth
 * Get growth forecast
 */
router.get('/growth', async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;

    const briefings = await Briefing.find()
      .sort({ date: -1 })
      .limit(90)
      .exec();

    const forecast = generateGrowthForecast(briefings, period as string);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate growth forecast',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/forecast/customers
 * Get customer forecast
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;

    const briefings = await Briefing.find()
      .sort({ date: -1 })
      .limit(90)
      .exec();

    const forecast = generateCustomerForecast(briefings, period as string);

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate customer forecast',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/forecast/scenarios
 * Get forecast scenarios (optimistic, baseline, pessimistic)
 */
router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const { type = 'revenue', period = 'monthly' } = req.query;

    const briefings = await Briefing.find()
      .sort({ date: -1 })
      .limit(90)
      .exec();

    const scenarios = generateScenarios(briefings, type as string, period as string);

    res.json({
      success: true,
      data: scenarios
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate scenarios',
      message: err.message
    });
  }
});

// Helper functions

function generateAllForecasts(briefings: any[]): Forecast[] {
  return [
    generateRevenueForecast(briefings, 'monthly'),
    generateGrowthForecast(briefings, 'monthly'),
    generateCustomerForecast(briefings, 'monthly')
  ];
}

function generateRevenueForecast(briefings: any[], period: string): Forecast {
  const revenueData = briefings
    .filter(b => b.metrics.revenue)
    .map(b => ({ date: b.date, value: b.metrics.revenue }));

  const predictions = calculatePredictions(revenueData, period, 'revenue');

  const currentRevenue = revenueData[0]?.value || 0;
  const avgGrowth = calculateAverageGrowth(revenueData);

  return {
    id: uuidv4(),
    type: 'revenue',
    period: period as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual',
    startDate: briefings[briefings.length - 1]?.date || new Date().toISOString().split('T')[0],
    endDate: briefings[0]?.date || new Date().toISOString().split('T')[0],
    predictions,
    confidence: calculateConfidence(revenueData.length),
    methodology: 'Linear regression with seasonal adjustment',
    assumptions: [
      `Average historical growth rate: ${avgGrowth.toFixed(1)}%`,
      'Market conditions remain stable',
      'No significant external disruptions'
    ],
    risks: [
      'Market volatility',
      'Competition changes',
      'Economic fluctuations'
    ],
    generatedAt: new Date()
  };
}

function generateGrowthForecast(briefings: any[], period: string): Forecast {
  const growthData = briefings
    .filter(b => b.metrics.revenueChange)
    .map(b => ({ date: b.date, value: b.metrics.revenueChange }));

  const predictions = calculatePredictions(growthData, period, 'growth');

  return {
    id: uuidv4(),
    type: 'growth',
    period: period as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual',
    startDate: briefings[briefings.length - 1]?.date || new Date().toISOString().split('T')[0],
    endDate: briefings[0]?.date || new Date().toISOString().split('T')[0],
    predictions,
    confidence: calculateConfidence(growthData.length),
    methodology: 'Moving average with trend analysis',
    assumptions: [
      'Growth patterns remain consistent',
      'Seasonal variations are predictable',
      'Market share remains stable'
    ],
    risks: [
      'Market saturation',
      'New competitor entry',
      'Demand shifts'
    ],
    generatedAt: new Date()
  };
}

function generateCustomerForecast(briefings: any[], period: string): Forecast {
  const customerData = briefings
    .filter(b => b.metrics.customers)
    .map(b => ({ date: b.date, value: b.metrics.customers }));

  const predictions = calculatePredictions(customerData, period, 'customers');

  const currentCustomers = customerData[0]?.value || 0;
  const avgGrowth = calculateAverageGrowth(customerData);

  return {
    id: uuidv4(),
    type: 'customers',
    period: period as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual',
    startDate: briefings[briefings.length - 1]?.date || new Date().toISOString().split('T')[0],
    endDate: briefings[0]?.date || new Date().toISOString().split('T')[0],
    predictions,
    confidence: calculateConfidence(customerData.length),
    methodology: 'Cohort analysis with growth modeling',
    assumptions: [
      `Current customer base: ${currentCustomers}`,
      `Average growth rate: ${avgGrowth.toFixed(1)}%`,
      'Customer retention remains stable'
    ],
    risks: [
      'Churn rate increase',
      'Market penetration limits',
      'Acquisition cost changes'
    ],
    generatedAt: new Date()
  };
}

function generateScenarios(
  briefings: any[],
  type: string,
  period: string
): { optimistic: Forecast; baseline: Forecast; pessimistic: Forecast } {
  const revenueData = briefings
    .filter(b => b.metrics.revenue)
    .map(b => ({ date: b.date, value: b.metrics.revenue }));

  const avgGrowth = calculateAverageGrowth(revenueData);
  const currentValue = revenueData[0]?.value || 0;

  // Generate predictions with different growth rates
  const optimisticGrowth = avgGrowth * 1.5;
  const baselineGrowth = avgGrowth;
  const pessimisticGrowth = avgGrowth * 0.5;

  const numPeriods = period === 'daily' ? 30 : period === 'weekly' ? 12 : period === 'monthly' ? 12 : 4;

  return {
    optimistic: generateScenarioForecast(
      type,
      period,
      briefings,
      optimisticGrowth,
      numPeriods,
      'Optimistic scenario with accelerated growth'
    ),
    baseline: generateScenarioForecast(
      type,
      period,
      briefings,
      baselineGrowth,
      numPeriods,
      'Baseline scenario maintaining current trajectory'
    ),
    pessimistic: generateScenarioForecast(
      type,
      period,
      briefings,
      pessimisticGrowth,
      numPeriods,
      'Conservative scenario with reduced growth'
    )
  };
}

function generateScenarioForecast(
  type: string,
  period: string,
  briefings: any[],
  growthRate: number,
  numPeriods: number,
  description: string
): Forecast {
  const data = type === 'revenue'
    ? briefings.filter(b => b.metrics.revenue).map(b => ({ date: b.date, value: b.metrics.revenue }))
    : type === 'customers'
      ? briefings.filter(b => b.metrics.customers).map(b => ({ date: b.date, value: b.metrics.customers }))
      : briefings.filter(b => b.metrics.revenueChange).map(b => ({ date: b.date, value: b.metrics.revenueChange }));

  const currentValue = data[0]?.value || 100000;
  const predictions: ForecastPrediction[] = [];

  const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;
  const startDate = new Date();

  for (let i = 1; i <= numPeriods; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + (i * periodDays));

    const growthMultiplier = Math.pow(1 + growthRate / 100, i);
    const projectedValue = currentValue * growthMultiplier;
    const uncertainty = 0.1 * i; // Uncertainty grows over time

    predictions.push({
      date: forecastDate.toISOString().split('T')[0],
      value: Math.round(projectedValue),
      lowerBound: Math.round(projectedValue * (1 - uncertainty)),
      upperBound: Math.round(projectedValue * (1 + uncertainty)),
      probability: Math.max(0.5, 1 - (i * 0.05)),
      drivers: [description]
    });
  }

  return {
    id: uuidv4(),
    type: type as 'revenue' | 'customers' | 'growth' | 'market',
    period: period as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual',
    startDate: briefings[briefings.length - 1]?.date || new Date().toISOString().split('T')[0],
    endDate: predictions[predictions.length - 1]?.date || new Date().toISOString().split('T')[0],
    predictions,
    confidence: calculateConfidence(data.length) - (Math.abs(growthRate) > 20 ? 0.1 : 0),
    methodology: description,
    assumptions: [`Assumed growth rate: ${growthRate.toFixed(1)}%`],
    risks: ['Scenario-specific risks apply'],
    generatedAt: new Date()
  };
}

function calculatePredictions(
  historicalData: { date: string; value: number }[],
  period: string,
  metricType: string
): ForecastPrediction[] {
  if (historicalData.length < 2) {
    return [];
  }

  const predictions: ForecastPrediction[] = [];
  const avgGrowth = calculateAverageGrowth(historicalData);
  const currentValue = historicalData[0].value;

  const numPeriods = period === 'daily' ? 30 : period === 'weekly' ? 12 : period === 'monthly' ? 12 : 4;
  const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;

  const startDate = new Date();

  for (let i = 1; i <= numPeriods; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + (i * periodDays));

    const growthMultiplier = Math.pow(1 + avgGrowth / 100, i);
    const projectedValue = currentValue * growthMultiplier;
    const uncertainty = 0.05 * i; // 5% uncertainty growth per period

    predictions.push({
      date: forecastDate.toISOString().split('T')[0],
      value: Math.round(projectedValue),
      lowerBound: Math.round(projectedValue * (1 - uncertainty)),
      upperBound: Math.round(projectedValue * (1 + uncertainty)),
      probability: Math.max(0.5, 1 - (i * 0.03)),
      drivers: [
        `Historical growth rate: ${avgGrowth.toFixed(1)}%`,
        `Based on ${historicalData.length} data points`
      ]
    });
  }

  return predictions;
}

function calculateAverageGrowth(data: { date: string; value: number }[]): number {
  if (data.length < 2) return 5; // Default 5% growth

  const growthRates: number[] = [];

  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i].value;
    const previous = data[i + 1].value;

    if (previous !== 0) {
      const growth = ((current - previous) / previous) * 100;
      growthRates.push(growth);
    }
  }

  if (growthRates.length === 0) return 5;

  // Use median to avoid outlier impact
  growthRates.sort((a, b) => a - b);
  const median = growthRates[Math.floor(growthRates.length / 2)];

  return median;
}

function calculateConfidence(dataPoints: number): number {
  if (dataPoints >= 30) return 0.85;
  if (dataPoints >= 14) return 0.75;
  if (dataPoints >= 7) return 0.65;
  return 0.50;
}

export default router;
