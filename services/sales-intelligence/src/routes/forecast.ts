import { Router, Request, Response } from 'express';
import { ForecastingService } from '../services/forecasting';
import { ForecastRequest, APIResponse, Forecast, QuotaForecast, TerritoryForecast } from '../models/Insights';

const router = Router();
const forecastingService = new ForecastingService();

// Generate revenue forecast
router.get('/', async (req: Request, res: Response) => {
  try {
    const horizon = parseInt(req.query.horizon as string) || 90;

    // Aggregate quota forecast into a top-level revenue projection
    const quotaData = await forecastingService.getQuotaForecasts();
    const totalQuota = quotaData.reduce((sum, q) => sum + (q.quota || 0), 0);
    const totalPredicted = quotaData.reduce((sum, q) => sum + (q.predictedRevenue || 0), 0);
    const weightedAttainment = totalQuota > 0 ? totalPredicted / totalQuota : 0;

    const response: APIResponse<any> = {
      success: true,
      data: {
        id: `FC-${Date.now()}`,
        period: `next-${horizon}-days`,
        horizonDays: horizon,
        predictedRevenue: Math.round(totalPredicted || totalQuota * weightedAttainment),
        quotaBaseline: totalQuota,
        weightedAttainment: Number(weightedAttainment.toFixed(4)),
        range: {
          pessimistic: Math.round(totalPredicted * 0.85),
          expected: Math.round(totalPredicted),
          optimistic: Math.round(totalPredicted * 1.15)
        },
        source: 'aggregated-quota-forecast',
        confidence: 0.7,
        generatedAt: new Date()
      },
      meta: {
        timestamp: new Date(),
        requestId: (req.headers['x-request-id'] as string) || ''
      }
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: {
        code: 'FORECAST_ERROR',
        message: errorMessage
      },
      meta: {
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || ''
      }
    });
  }
});

// Get historical forecast accuracy
router.get('/accuracy', async (req: Request, res: Response) => {
  try {
    const periods = parseInt(req.query.periods as string) || 4;

    const accuracy = await forecastingService.getForecastAccuracy(periods);

    const response: APIResponse<any> = {
      success: true,
      data: accuracy,
      meta: {
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || ''
      }
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: {
        code: 'ACCURACY_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get quota attainment forecasts
router.get('/quota', async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const repIds = req.query.repIds
      ? (req.query.repIds as string).split(',')
      : undefined;
    const period = (req.query.period as string) || 'current_quarter';

    const quotaForecasts = await forecastingService.getQuotaForecasts(teamId, repIds, period);

    const response: APIResponse<QuotaForecast[]> = {
      success: true,
      data: quotaForecasts,
      meta: {
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || ''
      }
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: {
        code: 'QUOTA_FORECAST_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get territory forecasts
router.get('/territory', async (req: Request, res: Response) => {
  try {
    const territoryIds = req.query.ids
      ? (req.query.ids as string).split(',')
      : undefined;

    const territoryForecasts = await forecastingService.getTerritoryForecasts(territoryIds);

    const response: APIResponse<TerritoryForecast[]> = {
      success: true,
      data: territoryForecasts,
      meta: {
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || ''
      }
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: {
        code: 'TERRITORY_FORECAST_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get forecast scenarios (best/worst/expected)
router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const horizon = parseInt(req.query.horizon as string) || 90;

    const scenarios = await forecastingService.getForecastScenarios(horizon);

    const response: APIResponse<any> = {
      success: true,
      data: scenarios,
      meta: {
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || ''
      }
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: {
        code: 'SCENARIOS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Refresh forecasts
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    await forecastingService.refreshForecasts();

    const response: APIResponse<{ message: string }> = {
      success: true,
      data: { message: 'Forecasts refreshed successfully' },
      meta: {
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string || ''
      }
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: errorMessage
      }
    });
  }
});

export default router;
