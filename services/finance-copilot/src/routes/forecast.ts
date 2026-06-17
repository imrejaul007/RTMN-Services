/**
 * Forecasting Routes
 */

import { Router, Request, Response } from 'express';
import { forecastingService } from '../services/forecasting';

const router = Router();

/**
 * GET /api/finance/forecast
 * Get cash flow forecasts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { horizon, limit } = req.query;

    const forecasts = await forecastingService.getForecasts(
      horizon ? parseInt(horizon as string) : undefined,
      limit ? parseInt(limit as string) : 30
    );

    res.json({
      success: true,
      data: forecasts,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forecasts',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/forecast/generate
 * Generate new cash flow forecast
 */
router.get('/generate', async (req: Request, res: Response) => {
  try {
    const { horizon } = req.query;

    const forecasts = await forecastingService.generateForecast(
      horizon ? parseInt(horizon as string) : 30
    );

    res.json({
      success: true,
      data: {
        count: forecasts.length,
        forecasts,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate forecast',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/forecast/summary
 * Get forecast summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { horizon } = req.query;

    const summary = await forecastingService.getForecastSummary(
      horizon ? parseInt(horizon as string) : 30
    );

    res.json({
      success: true,
      data: summary,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching forecast summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forecast summary',
      timestamp: new Date(),
    });
  }
});

/**
 * PUT /api/finance/forecast/:id/actual
 * Update forecast with actual values
 */
router.put('/:id/actual', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actualInflow, actualOutflow } = req.body;

    if (actualInflow === undefined || actualOutflow === undefined) {
      res.status(400).json({
        success: false,
        error: 'actualInflow and actualOutflow are required',
        timestamp: new Date(),
      });
      return;
    }

    const success = await forecastingService.updateForecastWithActual(id, actualInflow, actualOutflow);

    res.json({
      success,
      data: { forecastId: id, updated: success },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error updating forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update forecast',
      timestamp: new Date(),
    });
  }
});

export default router;
