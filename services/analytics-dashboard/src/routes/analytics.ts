import { Router, Request, Response } from 'express';
import { DataEngine } from '../services/dataEngine';
import { ChartService } from '../services/charts';
import { ExportService } from '../services/export';
import { Widget } from '../models/Widget';

const router = Router();

// Get analytics overview
router.get('/overview', (req: Request, res: Response) => {
  try {
    const overview = DataEngine.getOverview();
    res.json(overview);
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Get metrics by industry
router.get('/industry/:industry', (req: Request, res: Response) => {
  try {
    const { industry } = req.params;
    const { period } = req.query;

    const metrics = DataEngine.getIndustryMetrics(industry, period as string);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching industry metrics:', error);
    res.status(500).json({ error: 'Failed to fetch industry metrics' });
  }
});

// Get all industries summary
router.get('/industries', (req: Request, res) => {
  try {
    const summary = DataEngine.getIndustriesSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching industries summary:', error);
    res.status(500).json({ error: 'Failed to fetch industries summary' });
  }
});

// Get time-series data
router.get('/timeseries', (req: Request, res: Response) => {
  try {
    const { metric, period, granularity, industry } = req.query;

    const data = DataEngine.getTimeSeries({
      metric: metric as string,
      period: period as string || 'week',
      granularity: granularity as 'hour' | 'day' | 'week' | 'month',
      industry: industry as string
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching time series:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

// Get comparison data
router.get('/compare', (req: Request, res: Response) => {
  try {
    const { metrics, period } = req.query;

    const metricList = metrics ? (metrics as string).split(',') : ['revenue', 'orders', 'customers'];
    const data = DataEngine.getComparison(metricList, period as string);

    res.json(data);
  } catch (error) {
    console.error('Error fetching comparison:', error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// Get real-time data
router.get('/realtime', (req: Request, res: Response) => {
  try {
    const { metric } = req.query;
    const data = DataEngine.getRealTimeData(metric as string);
    res.json(data);
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    res.status(500).json({ error: 'Failed to fetch realtime data' });
  }
});

// Get widget data
router.get('/widget/:widgetId', async (req: Request, res: Response) => {
  try {
    const widget = Widget.getById(req.params.widgetId);

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const data = await DataEngine.getWidgetData(widget);
    res.json({
      widgetId: widget.id,
      widgetType: widget.type,
      data
    });
  } catch (error) {
    console.error('Error fetching widget data:', error);
    res.status(500).json({ error: 'Failed to fetch widget data' });
  }
});

// Generate chart data
router.post('/charts', (req: Request, res: Response) => {
  try {
    const { type, data, options } = req.body;

    const chartData = ChartService.generateChart(type, data, options);
    res.json(chartData);
  } catch (error) {
    console.error('Error generating chart:', error);
    res.status(500).json({ error: 'Failed to generate chart data' });
  }
});

// Get KPI data
router.get('/kpi/:metric', (req: Request, res: Response) => {
  try {
    const { metric } = req.params;
    const { period, comparison } = req.query;

    const kpi = DataEngine.getKPI(metric, {
      period: period as string,
      includeComparison: comparison === 'true'
    });

    res.json(kpi);
  } catch (error) {
    console.error('Error fetching KPI:', error);
    res.status(500).json({ error: 'Failed to fetch KPI data' });
  }
});

// Get top performers
router.get('/top', (req: Request, res: Response) => {
  try {
    const { category, limit, period } = req.query;

    const top = DataEngine.getTopPerformers({
      category: category as string || 'products',
      limit: parseInt(limit as string) || 10,
      period: period as string || 'month'
    });

    res.json(top);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// Get trends
router.get('/trends', (req: Request, res: Response) => {
  try {
    const { metrics, period } = req.query;

    const metricsList = metrics ? (metrics as string).split(',') : ['revenue', 'orders'];
    const trends = DataEngine.getTrends(metricsList, period as string || 'month');

    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get geographic data
router.get('/geographic', (req: Request, res: Response) => {
  try {
    const { metric, granularity } = req.query;

    const geoData = DataEngine.getGeographicData({
      metric: metric as string || 'revenue',
      granularity: granularity as 'city' | 'state' | 'country' || 'city'
    });

    res.json(geoData);
  } catch (error) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({ error: 'Failed to fetch geographic data' });
  }
});

// Export analytics data
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { format, data, filename, options } = req.body;

    const exportResult = await ExportService.export({
      format,
      data,
      filename,
      options
    });

    res.json(exportResult);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Export dashboard
router.post('/export/dashboard/:id', async (req: Request, res: Response) => {
  try {
    const { format, includeWidgets, includeData } = req.body;

    const exportResult = await ExportService.exportDashboard({
      dashboardId: req.params.id,
      format: format || 'json',
      includeWidgets: includeWidgets !== false,
      includeData: includeData === true
    });

    res.json(exportResult);
  } catch (error) {
    console.error('Error exporting dashboard:', error);
    res.status(500).json({ error: 'Failed to export dashboard' });
  }
});

export default router;
