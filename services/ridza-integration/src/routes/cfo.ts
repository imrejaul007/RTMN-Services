import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FinanceSync } from '../services/financeSync';
import { CFOMetrics } from '../models/FinanceProfile';
import winston from 'winston';

/**
 * CFO Dashboard Routes
 * Provides financial analytics and reporting
 */
export default function cfoRoutes(
  financeSync: FinanceSync,
  logger: winston.Logger
): Router {
  const router = Router();

  /**
   * GET /api/cfo/dashboard
   * Get CFO dashboard overview
   */
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const { period = 'monthly' } = req.query;

      // Gather metrics from FinanceSync service
      const metrics = await financeSync.getMetrics(period as string);
      const syncStatus = await financeSync.getSyncStatus();
      const recentActivity = await financeSync.getRecentActivity();

      const dashboard = {
        overview: {
          totalVolume: metrics.totalVolume,
          transactionCount: metrics.transactionCount,
          activeUsers: metrics.activeUsers,
          revenue: metrics.revenue.total
        },
        trends: metrics.trends,
        syncStatus,
        recentActivity: recentActivity.slice(0, 10),
        alerts: await getAlerts(financeSync),
        period,
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        dashboard
      });
    } catch (error: any) {
      logger.error({
        action: 'dashboard_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/cfo/metrics
   * Get detailed financial metrics
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const {
        startDate,
        endDate,
        granularity = 'daily',
        currencies,
        industries
      } = req.query;

      const metrics: CFOMetrics = await financeSync.calculateMetrics({
        startDate: startDate as string,
        endDate: endDate as string,
        granularity: granularity as string,
        currencies: currencies ? (currencies as string).split(',') : undefined,
        industries: industries ? (industries as string).split(',') : undefined
      });

      // Sync to Payment Twin
      await financeSync.syncToPaymentTwin(metrics);

      res.json({
        success: true,
        metrics
      });
    } catch (error: any) {
      logger.error({
        action: 'metrics_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/cfo/reports
   * Get available financial reports
   */
  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const { type, startDate, endDate } = req.query;

      const reports = await financeSync.getReports({
        type: type as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        reports
      });
    } catch (error: any) {
      logger.error({
        action: 'reports_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/cfo/reports
   * Generate a new financial report
   */
  router.post('/reports', async (req: Request, res: Response) => {
    try {
      const {
        type,
        format = 'json',
        startDate,
        endDate,
        filters
      } = req.body;

      if (!type || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: type, startDate, endDate'
        });
      }

      const report = await financeSync.generateReport({
        id: `RPT-${uuidv4().substring(0, 8).toUpperCase()}`,
        type,
        format,
        startDate,
        endDate,
        filters,
        status: 'generating',
        createdAt: new Date()
      });

      // Start async report generation
      setTimeout(async () => {
        try {
          await financeSync.completeReportGeneration(report.id);
          logger.info({
            action: 'report_generated',
            reportId: report.id,
            type
          });
        } catch (error) {
          logger.error({
            action: 'report_generation_failed',
            reportId: report.id,
            error: (error as Error).message
          });
        }
      }, 2000);

      res.status(201).json({
        success: true,
        report,
        message: 'Report generation started'
      });
    } catch (error: any) {
      logger.error({
        action: 'generate_report_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/cfo/reports/:id
   * Get specific report
   */
  router.get('/reports/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const report = await financeSync.getReport(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }

      res.json({
        success: true,
        report
      });
    } catch (error: any) {
      logger.error({
        action: 'get_report_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/cfo/analytics/trends
   * Get financial trends analysis
   */
  router.get('/analytics/trends', async (req: Request, res: Response) => {
    try {
      const { period = '90d' } = req.query;

      const trends = await financeSync.getTrends(period as string);

      res.json({
        success: true,
        trends
      });
    } catch (error: any) {
      logger.error({
        action: 'trends_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/cfo/analytics/forecast
   * Get financial forecasts
   */
  router.get('/analytics/forecast', async (req: Request, res: Response) => {
    try {
      const { horizon = '30d' } = req.query;

      const forecast = await financeSync.getForecast(horizon as string);

      res.json({
        success: true,
        forecast
      });
    } catch (error: any) {
      logger.error({
        action: 'forecast_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/cfo/breakdown/:type
   * Get breakdown by type (currency, industry, etc.)
   */
  router.get('/breakdown/:type', async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const { startDate, endDate } = req.query;

      const breakdown = await financeSync.getBreakdown(
        type,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        breakdown
      });
    } catch (error: any) {
      logger.error({
        action: 'breakdown_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

/**
 * Get alerts for CFO dashboard
 */
async function getAlerts(financeSync: FinanceSync): Promise<any[]> {
  const alerts: any[] = [];

  try {
    const syncStatus = await financeSync.getSyncStatus();

    if (!syncStatus.industryTwinConnected) {
      alerts.push({
        id: uuidv4(),
        type: 'warning',
        category: 'sync',
        message: 'Industry Twin sync is delayed',
        timestamp: new Date().toISOString()
      });
    }

    if (!syncStatus.paymentTwinConnected) {
      alerts.push({
        id: uuidv4(),
        type: 'error',
        category: 'sync',
        message: 'Payment Twin connection lost',
        timestamp: new Date().toISOString()
      });
    }

    // Check for unusual patterns
    const metrics = await financeSync.getMetrics('daily');
    if (metrics.riskMetrics.flaggedTransactions > 10) {
      alerts.push({
        id: uuidv4(),
        type: 'warning',
        category: 'risk',
        message: `${metrics.riskMetrics.flaggedTransactions} transactions flagged for review`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    // Return empty alerts if sync check fails
  }

  return alerts;
}
