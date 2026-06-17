import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TrendAnalyzer } from '../services/trendAnalyzer';
import { CrowdInsight } from '../models/CrowdProfile';

const router = Router();

// In-memory storage for insights
const insights: CrowdInsight[] = [];

// Trend analyzer service
const trendAnalyzer = new TrendAnalyzer({
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta)
});

// Generate insights from trend data
router.post('/generate', (req: Request, res: Response) => {
  const { trends, locationId, category } = req.body;

  if (!trends || !Array.isArray(trends)) {
    return res.status(400).json({ error: 'trends array is required' });
  }

  const generatedInsights = trendAnalyzer.generateInsights(
    trends,
    locationId || 'all'
  );

  // Filter by category if specified
  const filteredInsights = category
    ? generatedInsights.filter(i => i.category === category)
    : generatedInsights;

  // Store insights
  insights.push(...filteredInsights);

  res.json({
    locationId: locationId || 'all',
    insightsGenerated: filteredInsights.length,
    insights: filteredInsights
  });
});

// Get all insights
router.get('/', (req: Request, res: Response) => {
  const { category, locationId, limit } = req.query;

  let result = [...insights];

  if (category) {
    result = result.filter(i => i.category === category);
  }

  if (locationId) {
    result = result.filter(i => i.id.includes(locationId));
  }

  result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const finalResult = limit ? result.slice(0, parseInt(limit as string)) : result;

  res.json({
    insights: finalResult,
    total: result.length,
    byCategory: {
      safety: result.filter(i => i.category === 'safety').length,
      efficiency: result.filter(i => i.category === 'efficiency').length,
      experience: result.filter(i => i.category === 'experience').length,
      operational: result.filter(i => i.category === 'operational').length
    }
  });
});

// Get insight by ID
router.get('/:id', (req: Request, res: Response) => {
  const insight = insights.find(i => i.id === req.params.id);

  if (!insight) {
    return res.status(404).json({ error: 'Insight not found' });
  }

  res.json(insight);
});

// Analyze trend patterns
router.post('/analyze', (req: Request, res: Response) => {
  const { trends, predictionHorizon } = req.body;

  if (!trends || !Array.isArray(trends)) {
    return res.status(400).json({ error: 'trends array is required' });
  }

  const analysis = trendAnalyzer.analyzeTrends(trends);
  const predictions = predictionHorizon
    ? trendAnalyzer.predictFutureTrends(trends, predictionHorizon)
    : [];

  res.json({
    analysis,
    predictions,
    timestamp: new Date()
  });
});

// Get safety insights
router.get('/category/safety', (req: Request, res: Response) => {
  const { limit } = req.query;

  const safetyInsights = insights
    .filter(i => i.category === 'safety')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const result = limit ? safetyInsights.slice(0, parseInt(limit as string)) : safetyInsights;

  res.json({
    category: 'safety',
    insights: result,
    count: safetyInsights.length,
    recommendations: getSafetyRecommendations(safetyInsights)
  });
});

// Get efficiency insights
router.get('/category/efficiency', (req: Request, res: Response) => {
  const { limit } = req.query;

  const efficiencyInsights = insights
    .filter(i => i.category === 'efficiency')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const result = limit ? efficiencyInsights.slice(0, parseInt(limit as string)) : efficiencyInsights;

  res.json({
    category: 'efficiency',
    insights: result,
    count: efficiencyInsights.length,
    recommendations: getEfficiencyRecommendations(efficiencyInsights)
  });
});

// Get experience insights
router.get('/category/experience', (req: Request, res: Response) => {
  const { limit } = req.query;

  const experienceInsights = insights
    .filter(i => i.category === 'experience')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const result = limit ? experienceInsights.slice(0, parseInt(limit as string)) : experienceInsights;

  res.json({
    category: 'experience',
    insights: result,
    count: experienceInsights.length,
    recommendations: getExperienceRecommendations(experienceInsights)
  });
});

// Get operational insights
router.get('/category/operational', (req: Request, res: Response) => {
  const { limit } = req.query;

  const operationalInsights = insights
    .filter(i => i.category === 'operational')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const result = limit ? operationalInsights.slice(0, parseInt(limit as string)) : operationalInsights;

  res.json({
    category: 'operational',
    insights: result,
    count: operationalInsights.length,
    recommendations: getOperationalRecommendations(operationalInsights)
  });
});

// Get summary dashboard
router.get('/dashboard/summary', (req: Request, res: Response) => {
  const recentInsights = insights.filter(
    i => Date.now() - i.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
  );

  res.json({
    timeframe: '24 hours',
    totalInsights: recentInsights.length,
    byCategory: {
      safety: recentInsights.filter(i => i.category === 'safety').length,
      efficiency: recentInsights.filter(i => i.category === 'efficiency').length,
      experience: recentInsights.filter(i => i.category === 'experience').length,
      operational: recentInsights.filter(i => i.category === 'operational').length
    },
    criticalAlerts: recentInsights.filter(
      i => i.confidence > 0.9 && i.category === 'safety'
    ).length,
    topRecommendations: getTopRecommendations(recentInsights),
    timestamp: new Date()
  });
});

// Helper functions
function getSafetyRecommendations(insights: CrowdInsight[]): string[] {
  const recommendations: string[] = [];

  const highDensityInsights = insights.filter(
    i => i.metrics.avgDensity > 0.8
  );
  if (highDensityInsights.length > 0) {
    recommendations.push('Consider crowd control measures for high-density periods');
  }

  const suddenSpikeInsights = insights.filter(
    i => i.recommendations.some(r => r.toLowerCase().includes('spike'))
  );
  if (suddenSpikeInsights.length > 0) {
    recommendations.push('Monitor for sudden crowd surges and prepare evacuation routes');
  }

  return recommendations.length > 0 ? recommendations : ['No immediate safety concerns detected'];
}

function getEfficiencyRecommendations(insights: CrowdInsight[]): string[] {
  const recommendations: string[] = [];

  const lowEfficiencyInsights = insights.filter(
    i => i.metrics.efficiency && i.metrics.efficiency < 0.5
  );
  if (lowEfficiencyInsights.length > 0) {
    recommendations.push('Optimize crowd flow to improve operational efficiency');
  }

  const peakTimeInsights = insights.filter(
    i => i.recommendations.some(r => r.toLowerCase().includes('peak'))
  );
  if (peakTimeInsights.length > 0) {
    recommendations.push('Schedule additional staff during identified peak times');
  }

  return recommendations.length > 0 ? recommendations : ['Current operations are efficient'];
}

function getExperienceRecommendations(insights: CrowdInsight[]): string[] {
  const recommendations: string[] = [];

  const waitTimeInsights = insights.filter(
    i => i.metrics.waitTime && i.metrics.waitTime > 300 // > 5 minutes
  );
  if (waitTimeInsights.length > 0) {
    recommendations.push('Reduce wait times to improve visitor experience');
  }

  const congestionInsights = insights.filter(
    i => i.recommendations.some(r => r.toLowerCase().includes('congestion'))
  );
  if (congestionInsights.length > 0) {
    recommendations.push('Implement wayfinding to reduce congestion hotspots');
  }

  return recommendations.length > 0 ? recommendations : ['Visitor experience metrics are positive'];
}

function getOperationalRecommendations(insights: CrowdInsight[]): string[] {
  const recommendations: string[] = [];

  const staffingInsights = insights.filter(
    i => i.recommendations.some(r => r.toLowerCase().includes('staff'))
  );
  if (staffingInsights.length > 0) {
    recommendations.push('Adjust staffing levels based on predicted crowd patterns');
  }

  const resourceInsights = insights.filter(
    i => i.recommendations.some(r => r.toLowerCase().includes('resource'))
  );
  if (resourceInsights.length > 0) {
    recommendations.push('Pre-position resources at identified high-activity zones');
  }

  return recommendations.length > 0 ? recommendations : ['Current resource allocation is optimal'];
}

function getTopRecommendations(insights: CrowdInsight[]): string[] {
  const allRecommendations = insights.flatMap(i => i.recommendations);

  // Get top 5 most common recommendations
  const recommendationCounts = allRecommendations.reduce((acc, r) => {
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(recommendationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rec]) => rec);
}

export default router;