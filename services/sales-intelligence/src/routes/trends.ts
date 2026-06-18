import { Router, Request, Response } from 'express';
import { TrendAnalysisService } from '../services/trendAnalysis';
import { TrendAnalysis, SeasonalPattern, Anomaly, APIResponse } from '../models/Insights';

const router = Router();
const trendService = new TrendAnalysisService();

// Get overall trend analysis
router.get('/', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();
    const granularity = (req.query.granularity as any) || 'weekly';

    const analysis = await trendService.analyzeTrends(startDate, endDate, granularity);

    const response: APIResponse<TrendAnalysis> = {
      success: true,
      data: analysis,
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
        code: 'TREND_ANALYSIS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get specific trend by type
router.get('/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const validTypes = ['revenue', 'deal_velocity', 'win_rate', 'deal_size', 'cycle_time'];

    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Type must be one of: ${validTypes.join(', ')}`
        }
      });
      return;
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const trend = await trendService.getTrendByType(type, startDate, endDate);

    const response: APIResponse<any> = {
      success: true,
      data: trend,
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
        code: 'TREND_TYPE_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get seasonal patterns
router.get('/seasonal', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const region = req.query.region as string | undefined;

    const patterns = await trendService.getSeasonalPatterns(year, region);

    const response: APIResponse<SeasonalPattern[]> = {
      success: true,
      data: patterns,
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
        code: 'SEASONAL_PATTERNS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get anomaly detection results
router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const severity = req.query.severity as any | undefined;
    const status = req.query.status as any | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const anomalies = await trendService.getAnomalies(severity, status, limit);

    const response: APIResponse<Anomaly[]> = {
      success: true,
      data: anomalies,
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
        code: 'ANOMALIES_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get specific anomaly
router.get('/anomalies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const anomaly = await trendService.getAnomalyById(id);

    if (!anomaly) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ANOMALY_NOT_FOUND',
          message: `Anomaly with ID ${id} not found`
        }
      });
      return;
    }

    const response: APIResponse<Anomaly> = {
      success: true,
      data: anomaly,
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
        code: 'ANOMALY_ERROR',
        message: errorMessage
      }
    });
  }
});

// Update anomaly investigation status
router.patch('/anomalies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'investigating', 'resolved', 'false_positive'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        }
      });
      return;
    }

    const updated = await trendService.updateAnomalyStatus(id, status, notes);

    const response: APIResponse<Anomaly> = {
      success: true,
      data: updated,
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
        code: 'UPDATE_ANOMALY_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get insights
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as any | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    const insights = await trendService.getInsights(category, limit);

    const response: APIResponse<any> = {
      success: true,
      data: insights,
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
        code: 'INSIGHTS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get momentum indicators
router.get('/momentum', async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const repId = req.query.repId as string | undefined;

    const momentum = await trendService.getMomentumIndicators(teamId, repId);

    const response: APIResponse<any> = {
      success: true,
      data: momentum,
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
        code: 'MOMENTUM_ERROR',
        message: errorMessage
      }
    });
  }
});

// Compare periods
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const period1 = req.query.period1 as string;
    const period2 = req.query.period2 as string;

    if (!period1 || !period2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PERIODS',
          message: 'Both period1 and period2 are required'
        }
      });
      return;
    }

    const comparison = await trendService.comparePeriods(period1, period2);

    const response: APIResponse<any> = {
      success: true,
      data: comparison,
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
        code: 'COMPARE_ERROR',
        message: errorMessage
      }
    });
  }
});

export default router;
