import { Router, Request, Response } from 'express';
import { segmentationService } from '../services/segmentation';

const router = Router();

// GET /api/marketing/audience/segment - Get audience segments
router.get('/segment', async (req: Request, res: Response) => {
  try {
    const segments = await segmentationService.getSegments();

    res.json({
      success: true,
      data: segments,
      meta: {
        totalSegments: segments.length,
        totalAddressableMarket: segments.reduce((sum, seg) => sum + seg.size, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience segments'
    });
  }
});

// GET /api/marketing/audience/segment/:id - Get specific segment
router.get('/segment/:id', async (req: Request, res: Response) => {
  try {
    const segment = await segmentationService.getSegmentById(req.params.id);

    if (!segment) {
      res.status(404).json({
        success: false,
        error: 'Segment not found'
      });
      return;
    }

    res.json({
      success: true,
      data: segment
    });
  } catch (error) {
    console.error('Error fetching segment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch segment'
    });
  }
});

// GET /api/marketing/audience/segment/:id/growth - Get segment growth prediction
router.get('/segment/:id/growth', async (req: Request, res: Response) => {
  try {
    const { months = 6 } = req.query;
    const growth = await segmentationService.predictSegmentGrowth(
      req.params.id,
      Number(months)
    );

    res.json({
      success: true,
      data: {
        segmentId: req.params.id,
        projectionMonths: Number(months),
        ...growth
      }
    });
  } catch (error) {
    console.error('Error predicting growth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict segment growth'
    });
  }
});

// POST /api/marketing/audience/analyze - Analyze audience based on criteria
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { demographics, behaviors, psychographics } = req.body;

    const analysis = await segmentationService.analyzeAudience({
      demographics,
      behaviors,
      psychographics
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing audience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze audience'
    });
  }
});

// GET /api/marketing/audience/insights - Get audience insights
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const segments = await segmentationService.getSegments();
    const analysis = await segmentationService.analyzeAudience({});

    res.json({
      success: true,
      data: {
        segments,
        insights: analysis.insights,
        summary: {
          totalSegments: segments.length,
          totalAddressableMarket: segments.reduce((sum, seg) => sum + seg.size, 0),
          avgEngagementScore: segments.reduce((sum, seg) => sum + seg.engagementScore, 0) / segments.length,
          avgConversionRate: segments.reduce((sum, seg) => sum + seg.conversionRate, 0) / segments.length,
          highValueSegments: segments.filter(s => s.engagementScore > 75).length,
          atRiskSegments: segments.filter(s => s.churnRisk === 'high').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience insights'
    });
  }
});

// GET /api/marketing/audience/distribution - Get segment distribution
router.get('/distribution', async (req: Request, res: Response) => {
  try {
    const segments = await segmentationService.getSegments();
    const totalMarket = segments.reduce((sum, seg) => sum + seg.size, 0);

    const distribution = segments.map(segment => ({
      segmentId: segment.id,
      name: segment.name,
      size: segment.size,
      percentage: ((segment.size / totalMarket) * 100).toFixed(2),
      cumulativePercentage: 0
    }));

    // Calculate cumulative percentage
    let cumulative = 0;
    distribution.forEach(d => {
      cumulative += parseFloat(d.percentage);
      d.cumulativePercentage = Math.round(cumulative * 100) / 100;
    });

    res.json({
      success: true,
      data: {
        distribution,
        totalAddressableMarket: totalMarket,
        paretoInsight: cumulative >= 80 ? 'Top 20% of segments represent majority of value' : 'Value is distributed across segments'
      }
    });
  } catch (error) {
    console.error('Error fetching distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distribution'
    });
  }
});

// GET /api/marketing/audience/engagement - Get engagement metrics by segment
router.get('/engagement', async (req: Request, res: Response) => {
  try {
    const segments = await segmentationService.getSegments();

    const engagement = segments.map(segment => ({
      segmentId: segment.id,
      name: segment.name,
      engagementScore: segment.engagementScore,
      conversionRate: segment.conversionRate,
      preferredChannels: segment.preferredChannels,
      preferredContentTypes: segment.preferredContentTypes,
      engagementLevel: segment.engagementScore >= 75 ? 'high' :
                      segment.engagementScore >= 50 ? 'medium' : 'low',
      recommendations: generateEngagementRecommendations(segment)
    }));

    res.json({
      success: true,
      data: engagement
    });
  } catch (error) {
    console.error('Error fetching engagement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement metrics'
    });
  }
});

// Helper function to generate engagement recommendations
function generateEngagementRecommendations(segment: any): string[] {
  const recommendations = [];

  if (segment.engagementScore < 60) {
    recommendations.push('Increase posting frequency on preferred channels');
    recommendations.push('Test different content types from preferred list');
  }

  if (segment.conversionRate < 5) {
    recommendations.push('Review and optimize conversion funnel');
    recommendations.push('Test urgency and scarcity tactics');
  }

  if (segment.churnRisk === 'high') {
    recommendations.push('Implement win-back campaign');
    recommendations.push('Offer exclusive incentives');
  }

  if (segment.preferredChannels.includes('email')) {
    recommendations.push('Optimize email subject lines');
  }

  if (segment.preferredChannels.includes('social_media')) {
    recommendations.push('Increase social engagement activities');
  }

  return recommendations;
}

export default router;
