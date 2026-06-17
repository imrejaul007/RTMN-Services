import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics';
import { ReportFilters } from '../types';

const router = Router();

/**
 * GET /api/outcomes/report
 * Generate a comprehensive report with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const filters: ReportFilters = {
      tenantId,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      period: req.query.period as 'daily' | 'weekly' | 'monthly' || 'daily',
      minRevenueSaved: req.query.minRevenueSaved
        ? Number(req.query.minRevenueSaved)
        : undefined,
      includeChurned: req.query.includeChurned === 'true',
      groupBy: req.query.groupBy as 'ticket' | 'agent' | 'channel' | 'category' || 'ticket'
    };

    const result = await AnalyticsService.generateReport(filters);

    res.json({
      success: true,
      data: result,
      filters,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * POST /api/outcomes/report
 * Generate report via POST with body
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const filters: ReportFilters = {
      tenantId,
      ...req.body
    };

    if (filters.startDate) {
      filters.startDate = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filters.endDate = new Date(filters.endDate);
    }

    const result = await AnalyticsService.generateReport(filters);

    res.json({
      success: true,
      data: result,
      filters,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * GET /api/outcomes/report/summary
 * Get report summary without breakdown
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const filters: ReportFilters = {
      tenantId,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      period: req.query.period as 'daily' | 'weekly' | 'monthly' || 'daily'
    };

    const result = await AnalyticsService.generateReport(filters);

    // Return just the report without breakdown
    res.json({
      success: true,
      data: result.report,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error generating report summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report summary'
    });
  }
});

/**
 * GET /api/outcomes/report/export
 * Export report in different formats
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { format = 'json' } = req.query;

    const filters: ReportFilters = {
      tenantId,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      period: req.query.period as 'daily' | 'weekly' | 'monthly' || 'daily',
      groupBy: req.query.groupBy as 'ticket' | 'agent' | 'channel' | 'category' || 'ticket'
    };

    const result = await AnalyticsService.generateReport(filters);

    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=outcome-report.csv');
        res.send(convertToCSV(result));
        break;
      case 'json':
      default:
        res.json({
          success: true,
          data: result,
          timestamp: new Date()
        });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    });
  }
});

/**
 * Convert report data to CSV format
 */
function convertToCSV(data: { report: any; breakdown: any[] }): string {
  const headers = [
    'Metric',
    'Value',
    'Period Start',
    'Period End'
  ];

  const rows = [
    ['Total Revenue Saved', data.report.totals.totalRevenueSaved, data.report.startDate, data.report.endDate],
    ['Total Revenue Protected', data.report.totals.totalRevenueProtected, data.report.startDate, data.report.endDate],
    ['Total Revenue Cost', data.report.totals.totalRevenueCost, data.report.startDate, data.report.endDate],
    ['Customers Retained', data.report.totals.totalCustomersRetained, data.report.startDate, data.report.endDate],
    ['Customers Churned', data.report.totals.totalCustomersChurned, data.report.startDate, data.report.endDate],
    ['Upsells Generated', data.report.totals.totalUpsellsGenerated, data.report.startDate, data.report.endDate],
    ['Upsell Amount', data.report.totals.totalUpsellAmount, data.report.startDate, data.report.endDate],
    ['Referrals Created', data.report.totals.totalReferralsCreated, data.report.startDate, data.report.endDate],
    ['Risks Identified', data.report.totals.totalRisksIdentified, data.report.startDate, data.report.endDate],
    ['Total Outcomes Tracked', data.report.totals.totalOutcomesTracked, data.report.startDate, data.report.endDate],
    ['Avg CSAT Improvement', data.report.averages.avgCsatImprovement, data.report.startDate, data.report.endDate],
    ['Avg Resolution Time', data.report.averages.avgResolutionTime, data.report.startDate, data.report.endDate],
    ['Avg Revenue Per Ticket', data.report.averages.avgRevenuePerTicket, data.report.startDate, data.report.endDate],
    ['Retention Rate', data.report.trends.retentionRate, data.report.startDate, data.report.endDate],
    ['Upsell Conversion Rate', data.report.trends.upsellConversionRate, data.report.startDate, data.report.endDate]
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

export default router;
