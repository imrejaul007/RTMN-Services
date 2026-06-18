import { Router, Request, Response } from 'express';
import { ForecastingService } from '../services/forecasting';
import { ForecastRequest, APIResponse, Forecast, QuotaForecast, TerritoryForecast } from '../models/Insights';

const router = Router();
const forecastingService = new ForecastingService();

// Generate revenue forecast
router.get('/', async (req: Request, res: Response) => {
  try {
    const horizon = parseInt(req.query.horizon as string) || 90;
    const granularity = (req.query.granularity as any) || 'monthly';
    const includeScenario = req.query.scenario === 'true';
    const territoryIds = req.query.territories
      ? (req.query.territories as string).split(',')
      : undefined;
    const productLines = req.query.products
      ? (req.query.products as string).split(',')
      : undefined;

    const request: ForecastRequest = {
      horizon,
      granularity,
      includeScenario,
      territoryIds,
      productLines
    };

    const forecast = await forecastingService.generateForecast(request);

    const response: APIResponse<Forecast> = {
      success: true,
      data: forecast,
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
