import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Campaign } from '../models/Campaign';
import { DailyMetrics, MetricsSummary } from '../models/Metric';

const router = Router();

// Validation schemas
const recordMetricsSchema = z.object({
  campaignId: z.string().min(1),
  tenantId: z.string().min(1),
  date: z.string().datetime().or(z.date()).optional(),
  metrics: z.object({
    impressions: z.number().min(0).optional(),
    clicks: z.number().min(0).optional(),
    leads: z.number().min(0).optional(),
    conversions: z.number().min(0).optional(),
    revenue: z.number().min(0).optional(),
    spend: z.number().min(0).optional()
  }),
  channelMetrics: z.array(z.object({
    channel: z.string(),
    impressions: z.number().min(0).optional(),
    clicks: z.number().min(0).optional(),
    spend: z.number().min(0).optional()
  })).optional()
});

const updateCampaignMetricsSchema = z.object({
  impressions: z.number().min(0).optional(),
  clicks: z.number().min(0).optional(),
  leads: z.number().min(0).optional(),
  conversions: z.number().min(0).optional(),
  revenue: z.number().min(0).optional()
});

// Record daily metrics for a campaign
router.post('/record', async (req: Request, res: Response) => {
  try {
    const validatedData = recordMetricsSchema.parse(req.body);
    const metricId = `MTR-${uuidv4().substring(0, 8).toUpperCase()}`;
    const date = validatedData.date ? new Date(validatedData.date) : new Date();

    // Check if metrics already exist for this campaign and date
    const existingMetric = await DailyMetrics.findOne({
      campaignId: validatedData.campaignId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lte: new Date(date.setHours(23, 59, 59, 999))
      }
    });

    if (existingMetric) {
      // Update existing metrics
      Object.assign(existingMetric.metrics, validatedData.metrics);
      if (validatedData.channelMetrics) {
        existingMetric.channelMetrics = validatedData.channelMetrics;
      }
      await existingMetric.save();

      return res.json({
        success: true,
        data: existingMetric,
        message: 'Metrics updated for existing date'
      });
    }

    // Create new daily metrics record
    const dailyMetrics = new DailyMetrics({
      metricId,
      campaignId: validatedData.campaignId,
      tenantId: validatedData.tenantId,
      date,
      metrics: {
        ...validatedData.metrics,
        ctr: 0,
        conversionRate: 0,
        cpc: 0,
        cpa: 0,
        roas: 0
      },
      channelMetrics: validatedData.channelMetrics
    });

    await dailyMetrics.save();

    // Update campaign's aggregate metrics
    await updateCampaignAggregates(validatedData.campaignId);

    res.status(201).json({
      success: true,
      data: dailyMetrics
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Error recording metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record metrics'
      });
    }
  }
});

// Get metrics for a campaign
router.get('/campaign/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate, period = 'daily' } = req.query;

    const query: Record<string, any> = { campaignId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const metrics = await DailyMetrics.find(query)
      .sort({ date: 1 })
      .lean();

    // Calculate totals
    const totals = metrics.reduce((acc, m) => ({
      impressions: acc.impressions + m.metrics.impressions,
      clicks: acc.clicks + m.metrics.clicks,
      leads: acc.leads + m.metrics.leads,
      conversions: acc.conversions + m.metrics.conversions,
      revenue: acc.revenue + m.metrics.revenue,
      spend: acc.spend + m.metrics.spend
    }), { impressions: 0, clicks: 0, leads: 0, conversions: 0, revenue: 0, spend: 0 });

    res.json({
      success: true,
      data: metrics,
      totals,
      count: metrics.length
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign metrics'
    });
  }
});

// Get metrics summary
router.get('/summary/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { period = 'daily' } = req.query;

    const summary = await MetricsSummary.findOne({
      campaignId,
      period
    }).sort({ startDate: -1 }).lean();

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'No summary found for this period'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching metrics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics summary'
    });
  }
});

// Generate metrics summary
router.post('/summary/generate', async (req: Request, res: Response) => {
  try {
    const { campaignId, tenantId, period = 'daily', startDate, endDate } = req.body;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Aggregate metrics
    const aggregated = await DailyMetrics.aggregate([
      {
        $match: {
          campaignId,
          tenantId,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          impressions: { $sum: '$metrics.impressions' },
          clicks: { $sum: '$metrics.clicks' },
          leads: { $sum: '$metrics.leads' },
          conversions: { $sum: '$metrics.conversions' },
          revenue: { $sum: '$metrics.revenue' },
          spend: { $sum: '$metrics.spend' },
          days: { $sum: 1 }
        }
      }
    ]);

    if (aggregated.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No metrics found for the specified period'
      });
    }

    const data = aggregated[0];

    // Calculate averages
    const averages = {
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
      cpa: data.conversions > 0 ? data.spend / data.conversions : 0,
      roas: data.spend > 0 ? data.revenue / data.spend : 0
    };

    const summaryId = `SUM-${uuidv4().substring(0, 8).toUpperCase()}`;

    const summary = await MetricsSummary.findOneAndUpdate(
      { campaignId, period, startDate: start, endDate: end },
      {
        summaryId,
        campaignId,
        tenantId,
        period,
        startDate: start,
        endDate: end,
        totals: {
          impressions: data.impressions,
          clicks: data.clicks,
          leads: data.leads,
          conversions: data.conversions,
          revenue: data.revenue,
          spend: data.spend
        },
        averages,
        trend: 'stable',
        trendPercentage: 0
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error generating metrics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics summary'
    });
  }
});

// Get channel breakdown for a campaign
router.get('/channels/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    const query: Record<string, any> = { campaignId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const metrics = await DailyMetrics.find(query).lean();

    // Aggregate by channel
    const channelBreakdown: Record<string, {
      impressions: number;
      clicks: number;
      spend: number;
      days: number;
    }> = {};

    metrics.forEach(m => {
      if (m.channelMetrics) {
        m.channelMetrics.forEach(ch => {
          if (!channelBreakdown[ch.channel]) {
            channelBreakdown[ch.channel] = { impressions: 0, clicks: 0, spend: 0, days: 0 };
          }
          channelBreakdown[ch.channel].impressions += ch.impressions || 0;
          channelBreakdown[ch.channel].clicks += ch.clicks || 0;
          channelBreakdown[ch.channel].spend += ch.spend || 0;
        });
      }
    });

    // Calculate derived metrics per channel
    const channelData = Object.entries(channelBreakdown).map(([channel, data]) => ({
      channel,
      impressions: data.impressions,
      clicks: data.clicks,
      spend: data.spend,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0
    }));

    // Sort by spend descending
    channelData.sort((a, b) => b.spend - a.spend);

    res.json({
      success: true,
      data: channelData
    });
  } catch (error) {
    console.error('Error fetching channel breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel breakdown'
    });
  }
});

// Bulk update campaign metrics
router.patch('/campaign/:campaignId/bulk', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { updates } = req.body;

    // updates is an array of metric records
    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates must be an array'
      });
    }

    const results = [];
    for (const update of updates) {
      const validated = recordMetricsSchema.parse({
        ...update,
        campaignId,
        tenantId: update.tenantId
      });

      const metricId = `MTR-${uuidv4().substring(0, 8).toUpperCase()}`;
      const date = validated.date ? new Date(validated.date) : new Date();

      const existingMetric = await DailyMetrics.findOne({
        campaignId,
        date: {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lte: new Date(date.setHours(23, 59, 59, 999))
        }
      });

      if (existingMetric) {
        Object.assign(existingMetric.metrics, validated.metrics);
        await existingMetric.save();
        results.push(existingMetric);
      } else {
        const newMetric = new DailyMetrics({
          metricId,
          campaignId,
          tenantId: validated.tenantId,
          date,
          metrics: validated.metrics
        });
        await newMetric.save();
        results.push(newMetric);
      }
    }

    // Update campaign aggregates
    await updateCampaignAggregates(campaignId);

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error bulk updating metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update metrics'
    });
  }
});

// Helper function to update campaign aggregate metrics
async function updateCampaignAggregates(campaignId: string) {
  const aggregated = await DailyMetrics.aggregate([
    { $match: { campaignId } },
    {
      $group: {
        _id: null,
        impressions: { $sum: '$metrics.impressions' },
        clicks: { $sum: '$metrics.clicks' },
        leads: { $sum: '$metrics.leads' },
        conversions: { $sum: '$metrics.conversions' },
        revenue: { $sum: '$metrics.revenue' },
        spend: { $sum: '$metrics.spend' }
      }
    }
  ]);

  if (aggregated.length > 0) {
    const data = aggregated[0];
    await Campaign.findOneAndUpdate(
      { campaignId },
      {
        metrics: {
          impressions: data.impressions,
          clicks: data.clicks,
          leads: data.leads,
          conversions: data.conversions,
          revenue: data.revenue
        }
      }
    );
  }
}

export default router;
