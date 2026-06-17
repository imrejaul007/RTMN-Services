import { Router, Request, Response } from 'express';
import { generateForecast } from '../services/forecast';
import { ApiResponse, SalesForecast, ForecastRequest } from '../types';

const router = Router();

/**
 * POST /api/sales/forecast
 * Generate sales forecast based on pipeline data
 */
router.post('/forecast', async (req: Request, res: Response) => {
  try {
    const { period, deals } = req.body as ForecastRequest;

    if (!period || !deals || deals.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Period and deals are required'
      };
      return res.status(400).json(response);
    }

    const forecast = await generateForecast({
      period,
      deals
    });

    const response: ApiResponse<SalesForecast> = {
      success: true,
      data: forecast,
      message: `Generated ${period} sales forecast`
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate forecast'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sales/forecast/summary
 * Get forecast summary without deals (demo)
 */
router.get('/forecast/summary', async (req: Request, res: Response) => {
  try {
    const { period } = req.query;

    // Demo forecast data
    const summary = {
      period: period || 'monthly',
      totalRevenue: 2450000,
      weightedRevenue: 1825000,
      dealCount: 45,
      averageDealSize: 54444,
      confidence: 0.75,
      comparison: {
        previous: 2100000,
        change: 16.7,
        trend: 'up'
      },
      topDeals: [
        { name: 'Global Enterprise', amount: 500000, stage: 'negotiation' },
        { name: 'TechCorp Solutions', amount: 350000, stage: 'proposal' },
        { name: 'MegaSystems Inc', amount: 275000, stage: 'qualified' }
      ]
    };

    const response: ApiResponse = {
      success: true,
      data: summary
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get forecast summary'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sales/forecast/trends
 * Get historical forecast trends
 */
router.get('/forecast/trends', async (req: Request, res: Response) => {
  try {
    const { months } = req.query;

    const trends = [
      { month: 'January', predicted: 1800000, actual: 1750000 },
      { month: 'February', predicted: 1900000, actual: 1950000 },
      { month: 'March', predicted: 2100000, actual: 2050000 },
      { month: 'April', predicted: 2200000, actual: 2300000 },
      { month: 'May', predicted: 2350000, actual: null },
      { month: 'June', predicted: 2450000, actual: null }
    ].slice(0, Number(months) || 6);

    const response: ApiResponse = {
      success: true,
      data: trends
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trends'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sales/forecast/pipeline
 * Get pipeline health metrics
 */
router.get('/forecast/pipeline', async (req: Request, res: Response) => {
  try {
    const pipeline = {
      totalDeals: 45,
      totalValue: 2450000,
      averageAge: 23,
      conversionRates: {
        newToContacted: 0.65,
        contactedToQualified: 0.55,
        qualifiedToProposal: 0.60,
        proposalToNegotiation: 0.70,
        negotiationToClose: 0.75
      },
      stageDistribution: [
        { stage: 'new', count: 8, value: 280000 },
        { stage: 'contacted', count: 12, value: 420000 },
        { stage: 'qualified', count: 10, value: 550000 },
        { stage: 'proposal', count: 8, value: 600000 },
        { stage: 'negotiation', count: 5, value: 400000 },
        { stage: 'closed_won', count: 2, value: 200000 }
      ],
      riskIndicators: {
        staleDeals: 5,
        overdueFollowUps: 8,
        longNegotiations: 3
      }
    };

    const response: ApiResponse = {
      success: true,
      data: pipeline
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pipeline metrics'
    };
    res.status(500).json(response);
  }
});

export default router;
