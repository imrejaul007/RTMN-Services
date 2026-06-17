import { Router, Request, Response } from 'express';
import { insightsService } from '../services/insights';

const router = Router();

// GET /api/marketing/insights - Get comprehensive marketing insights
router.get('/', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch marketing insights'
    });
  }
});

// GET /api/marketing/insights/overview - Get overview metrics
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    res.json({
      success: true,
      data: insights.overview
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview metrics'
    });
  }
});

// GET /api/marketing/insights/top-performers - Get top performing campaigns and content
router.get('/top-performers', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    res.json({
      success: true,
      data: insights.topPerforming
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top performers'
    });
  }
});

// GET /api/marketing/insights/trends - Get marketing trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    res.json({
      success: true,
      data: {
        trends: insights.trends,
        summary: {
          totalTrends: insights.trends.length,
          highImpactTrends: insights.trends.filter(t => t.impact === 'high').length,
          actionableTrends: insights.trends.filter(t => t.actionable).length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends'
    });
  }
});

// GET /api/marketing/insights/opportunities - Get marketing opportunities
router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    res.json({
      success: true,
      data: {
        opportunities: insights.opportunities,
        summary: {
          totalOpportunities: insights.opportunities.length,
          highImpactOpportunities: insights.opportunities.filter(o => o.impact === 'high').length,
          avgConfidence: insights.opportunities.length > 0
            ? insights.opportunities.reduce((sum, o) => sum + o.confidence, 0) / insights.opportunities.length
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities'
    });
  }
});

// GET /api/marketing/insights/warnings - Get warnings and threats
router.get('/warnings', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    res.json({
      success: true,
      data: {
        warnings: insights.warnings,
        summary: {
          totalWarnings: insights.warnings.length,
          highPriorityWarnings: insights.warnings.filter(w => w.impact === 'high').length,
          actionableWarnings: insights.warnings.filter(w => w.actionable).length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching warnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch warnings'
    });
  }
});

// GET /api/marketing/insights/channels - Get channel performance
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    // Sort channels by ROAS
    const sortedChannels = [...insights.channelPerformance].sort(
      (a, b) => b.metrics.roas - a.metrics.roas
    );

    res.json({
      success: true,
      data: {
        channels: insights.channelPerformance,
        topChannel: sortedChannels[0],
        channelSummary: {
          totalChannels: insights.channelPerformance.length,
          avgROAS: insights.channelPerformance.reduce((sum, c) => sum + c.metrics.roas, 0) / insights.channelPerformance.length,
          bestPerforming: sortedChannels[0]?.channel,
          needsAttention: sortedChannels[sortedChannels.length - 1]?.channel
        }
      }
    });
  } catch (error) {
    console.error('Error fetching channel performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channel performance'
    });
  }
});

// GET /api/marketing/insights/competitor - Get competitor insights
router.get('/competitor', async (req: Request, res: Response) => {
  try {
    const competitorInsights = await insightsService.getCompetitorInsights();

    res.json({
      success: true,
      data: competitorInsights
    });
  } catch (error) {
    console.error('Error fetching competitor insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch competitor insights'
    });
  }
});

// GET /api/marketing/insights/seasonality - Get seasonality analysis
router.get('/seasonality', async (req: Request, res: Response) => {
  try {
    const seasonality = await insightsService.getSeasonalityAnalysis();

    res.json({
      success: true,
      data: seasonality
    });
  } catch (error) {
    console.error('Error fetching seasonality:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonality analysis'
    });
  }
});

// GET /api/marketing/insights/summary - Get executive summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const insights = await insightsService.getMarketingInsights();

    const summary = {
      overall: {
        totalCampaigns: insights.overview.totalCampaigns,
        activeCampaigns: insights.overview.activeCampaigns,
        overallROI: insights.overview.overallROI,
        status: insights.overview.overallROI > 150 ? 'excellent' :
                insights.overview.overallROI > 100 ? 'good' :
                insights.overview.overallROI > 50 ? 'fair' : 'needs_attention'
      },
      keyMetrics: {
        totalRevenue: insights.overview.totalRevenue,
        totalSpend: insights.overview.totalSpend,
        roi: insights.overview.overallROI,
        revenuePerCampaign: insights.overview.totalRevenue / insights.overview.totalCampaigns
      },
      performance: {
        topChannel: insights.topPerforming.channels[0]?.channel || 'N/A',
        topChannelROAS: insights.topPerforming.channels[0]?.roas || 0,
        topCampaign: insights.topPerforming.campaigns[0]?.name || 'N/A',
        topCampaignROAS: insights.topPerforming.campaigns[0]?.roas || 0
      },
      opportunities: {
        count: insights.opportunities.length,
        highImpact: insights.opportunities.filter(o => o.impact === 'high').length
      },
      warnings: {
        count: insights.warnings.length,
        highPriority: insights.warnings.filter(w => w.impact === 'high').length
      },
      recommendations: [
        ...insights.opportunities
          .filter(o => o.impact === 'high')
          .slice(0, 2)
          .map(o => o.recommendations[0]),
        ...insights.warnings
          .filter(w => w.impact === 'high')
          .slice(0, 2)
          .map(w => `Address: ${w.title}`)
      ].filter(Boolean)
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
});

export default router;
