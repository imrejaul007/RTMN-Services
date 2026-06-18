import { Router, Request, Response } from 'express';
import { PipelineAnalysisService } from '../services/pipelineAnalysis';
import { PipelineHealth, PipelineMetrics, APIResponse } from '../models/Insights';

const router = Router();
const pipelineService = new PipelineAnalysisService();

// Get pipeline health score
router.get('/health', async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const territoryId = req.query.territoryId as string | undefined;

    const health = await pipelineService.getPipelineHealth(teamId, territoryId);

    const response: APIResponse<PipelineHealth> = {
      success: true,
      data: health,
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
        code: 'PIPELINE_HEALTH_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get pipeline metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const metrics = await pipelineService.getPipelineMetrics(startDate, endDate);

    const response: APIResponse<PipelineMetrics> = {
      success: true,
      data: metrics,
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
        code: 'PIPELINE_METRICS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get stage breakdown
router.get('/stages', async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const includeHistorical = req.query.historical === 'true';

    const stages = await pipelineService.getStageBreakdown(teamId, includeHistorical);

    const response: APIResponse<any> = {
      success: true,
      data: stages,
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
        code: 'STAGE_BREAKDOWN_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get pipeline bottlenecks
router.get('/bottlenecks', async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;

    const bottlenecks = await pipelineService.identifyBottlenecks(teamId);

    const response: APIResponse<any> = {
      success: true,
      data: bottlenecks,
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
        code: 'BOTTLENECK_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get conversion rates by stage
router.get('/conversion', async (req: Request, res: Response) => {
  try {
    const period = parseInt(req.query.period as string) || 90;

    const conversions = await pipelineService.getConversionRates(period);

    const response: APIResponse<any> = {
      success: true,
      data: conversions,
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
        code: 'CONVERSION_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get stalled deals
router.get('/stalled', async (req: Request, res: Response) => {
  try {
    const daysThreshold = parseInt(req.query.days as string) || 14;

    const stalledDeals = await pipelineService.getStalledDeals(daysThreshold);

    const response: APIResponse<any> = {
      success: true,
      data: stalledDeals,
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
        code: 'STALLED_DEALS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get at-risk deals
router.get('/at-risk', async (req: Request, res: Response) => {
  try {
    const atRiskDeals = await pipelineService.getAtRiskDeals();

    const response: APIResponse<any> = {
      success: true,
      data: atRiskDeals,
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
        code: 'AT_RISK_DEALS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get velocity analysis
router.get('/velocity', async (req: Request, res: Response) => {
  try {
    const velocity = await pipelineService.getVelocityAnalysis();

    const response: APIResponse<any> = {
      success: true,
      data: velocity,
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
        code: 'VELOCITY_ERROR',
        message: errorMessage
      }
    });
  }
});

export default router;
