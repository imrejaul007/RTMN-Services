import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Briefing, IBriefing } from '../models/Briefing';
import { Metric } from '../models/Metric';
import { ApiResponse, ExecutiveSummary, SummaryHighlight } from '../types';

const router = Router();

/**
 * GET /api/executive/summary
 * Get daily executive summary
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];

    // Get today's briefing
    const briefing = await Briefing.findOne({ date: targetDate });

    if (!briefing) {
      res.status(404).json({
        success: false,
        error: 'No briefing found for this date',
        message: `Generate a briefing first using POST /api/executive/briefing/generate`
      });
      return;
    }

    // Get key metrics
    const metrics = await Metric.find()
      .sort({ lastUpdated: -1 })
      .limit(10)
      .exec();

    // Calculate summary
    const summary = buildSummary(briefing, metrics, 'daily', targetDate, targetDate);

    const response: ApiResponse<ExecutiveSummary> = {
      success: true,
      data: summary
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/summary/weekly
 * Get weekly executive summary
 */
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const { endDate } = req.query;
    const end = endDate
      ? new Date(endDate as string)
      : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Get briefings for the week
    const briefings = await Briefing.find({
      date: { $gte: startStr, $lte: endStr }
    }).sort({ date: -1 }).exec();

    if (briefings.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No briefings found for this period'
      });
      return;
    }

    // Aggregate metrics
    const metrics = await Metric.find().exec();

    // Build weekly summary
    const summary = buildWeeklySummary(briefings, metrics, startStr, endStr);

    const response: ApiResponse<ExecutiveSummary> = {
      success: true,
      data: summary
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly summary',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/summary/monthly
 * Get monthly executive summary
 */
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const targetYear = parseInt(year as string, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month as string, 10) || new Date().getMonth() + 1;

    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 0);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Get briefings for the month
    const briefings = await Briefing.find({
      date: { $gte: startStr, $lte: endStr }
    }).sort({ date: -1 }).exec();

    if (briefings.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No briefings found for this period'
      });
      return;
    }

    // Aggregate metrics
    const metrics = await Metric.find().exec();

    // Build monthly summary
    const summary = buildMonthlySummary(briefings, metrics, startStr, endStr);

    const response: ApiResponse<ExecutiveSummary> = {
      success: true,
      data: summary
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly summary',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/summary/board
 * Get board-ready summary (formatted for board presentations)
 */
router.get('/board', async (req: Request, res: Response) => {
  try {
    const { period = 'quarterly' } = req.query;

    // Get recent briefings
    const briefings = await Briefing.find()
      .sort({ date: -1 })
      .limit(90)
      .exec();

    if (briefings.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No briefings found'
      });
      return;
    }

    // Build board-ready summary
    const boardSummary = buildBoardSummary(briefings, period as string);

    res.json({
      success: true,
      data: boardSummary
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate board summary',
      message: err.message
    });
  }
});

// Helper function to build daily summary
function buildSummary(
  briefing: IBriefing,
  metrics: any[],
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
  startDate: string,
  endDate: string
): ExecutiveSummary {
  const highlights: SummaryHighlight[] = [];

  // Add high-priority sections as highlights
  const prioritySections = briefing.sections.filter(s => s.priority === 'high');
  if (prioritySections.length > 0) {
    highlights.push({
      category: 'Priority Items',
      items: prioritySections.map(s => s.title)
    });
  }

  // Add opportunities as highlights
  if (briefing.opportunities.length > 0) {
    highlights.push({
      category: 'Opportunities',
      items: briefing.opportunities.map(o => o.title)
    });
  }

  // Extract key wins
  const keyWins = briefing.sections
    .filter(s => s.content.toLowerCase().includes('success') || s.content.toLowerCase().includes('growth'))
    .map(s => s.title);

  // Extract challenges
  const challenges = briefing.risks
    .filter(r => r.status === 'active')
    .map(r => r.title);

  return {
    id: uuidv4(),
    period,
    startDate,
    endDate,
    title: `${period.charAt(0).toUpperCase() + period.slice(1)} Executive Summary - ${endDate}`,
    executiveSummary: briefing.summary,
    highlights,
    keyWins: keyWins.length > 0 ? keyWins : ['Continued operations', 'Team performance'],
    challenges,
    metrics: briefing.metrics,
    outlook: generateOutlook(briefing),
    generatedAt: new Date()
  };
}

// Helper function to build weekly summary
function buildWeeklySummary(
  briefings: IBriefing[],
  metrics: any[],
  startDate: string,
  endDate: string
): ExecutiveSummary {
  const latestBriefing = briefings[0];
  const earliestBriefing = briefings[briefings.length - 1];

  // Aggregate metrics across the week
  const aggregatedMetrics = aggregateMetrics(briefings);

  const highlights: SummaryHighlight[] = [
    {
      category: 'Daily Briefings',
      items: briefings.map(b => `${b.date}: ${b.title}`)
    }
  ];

  // Collect all high-priority items
  const priorityItems = briefings.flatMap(b =>
    b.sections.filter(s => s.priority === 'high').map(s => `${b.date}: ${s.title}`)
  );
  if (priorityItems.length > 0) {
    highlights.push({ category: 'Priority Items', items: priorityItems });
  }

  // Aggregate opportunities
  const opportunities = briefings.flatMap(b => b.opportunities.map(o => o.title));
  if (opportunities.length > 0) {
    highlights.push({ category: 'Opportunities', items: opportunities });
  }

  return {
    id: uuidv4(),
    period: 'weekly',
    startDate,
    endDate,
    title: `Weekly Executive Summary - ${startDate} to ${endDate}`,
    executiveSummary: `${briefings.length} daily briefings analyzed. Key themes: ${latestBriefing.summary}`,
    highlights,
    keyWins: extractKeyWins(briefings),
    challenges: extractChallenges(briefings),
    metrics: aggregatedMetrics,
    outlook: `Week trend: ${calculateWeekTrend(briefings)}`,
    generatedAt: new Date()
  };
}

// Helper function to build monthly summary
function buildMonthlySummary(
  briefings: IBriefing[],
  metrics: any[],
  startDate: string,
  endDate: string
): ExecutiveSummary {
  const aggregatedMetrics = aggregateMetrics(briefings);

  // Calculate monthly totals
  const totalRevenue = briefings.reduce((sum, b) =>
    sum + (b.metrics.revenue || 0), 0);
  const avgDailyRevenue = totalRevenue / briefings.length;

  const highlights: SummaryHighlight[] = [
    {
      category: 'Month Overview',
      items: [
        `${briefings.length} days of briefings`,
        `Average daily revenue: $${avgDailyRevenue.toLocaleString()}`,
        `Total opportunities identified: ${briefings.reduce((sum, b) => sum + b.opportunities.length, 0)}`
      ]
    }
  ];

  return {
    id: uuidv4(),
    period: 'monthly',
    startDate,
    endDate,
    title: `Monthly Executive Summary - ${startDate} to ${endDate}`,
    executiveSummary: `This month saw ${briefings.length} operational days. Revenue performance ${avgDailyRevenue > 10000 ? 'exceeded' : 'met'} expectations.`,
    highlights,
    keyWins: extractKeyWins(briefings),
    challenges: extractChallenges(briefings),
    metrics: aggregatedMetrics,
    outlook: `Monthly trajectory ${calculateWeekTrend(briefings)}`,
    generatedAt: new Date()
  };
}

// Helper function to build board summary
function buildBoardSummary(
  briefings: IBriefing[],
  period: string
): ExecutiveSummary {
  const latestBriefing = briefings[0];

  return {
    id: uuidv4(),
    period: period as 'daily' | 'weekly' | 'monthly' | 'quarterly',
    startDate: briefings[briefings.length - 1].date,
    endDate: latestBriefing.date,
    title: `Board Summary - Last ${period}`,
    executiveSummary: latestBriefing.summary,
    highlights: [
      {
        category: 'Financial Performance',
        items: [`Revenue: $${(latestBriefing.metrics.revenue || 0).toLocaleString()}`, `Growth: ${latestBriefing.metrics.revenueChange || 0}%`]
      },
      {
        category: 'Risk Landscape',
        items: latestBriefing.risks.filter(r => r.severity === 'critical' || r.severity === 'high').map(r => r.title)
      },
      {
        category: 'Strategic Opportunities',
        items: latestBriefing.opportunities.filter(o => o.potential === 'high').map(o => o.title)
      }
    ],
    keyWins: extractKeyWins(briefings),
    challenges: extractChallenges(briefings),
    metrics: latestBriefing.metrics,
    outlook: 'Board-ready outlook requires human executive review.',
    preparedFor: 'Board of Directors',
    generatedAt: new Date()
  };
}

// Helper functions
function aggregateMetrics(briefings: IBriefing[]) {
  const latestBriefing = briefings[0];
  return {
    ...latestBriefing.metrics,
    date: latestBriefing.date,
    keyMetrics: latestBriefing.metrics.keyMetrics
  };
}

function extractKeyWins(briefings: IBriefing[]): string[] {
  const wins = briefings.flatMap(b =>
    b.sections
      .filter(s => s.priority === 'high' && !s.content.includes('risk'))
      .map(s => s.title)
  );
  return [...new Set(wins)].slice(0, 5);
}

function extractChallenges(briefings: IBriefing[]): string[] {
  const challenges = briefings.flatMap(b =>
    b.risks.filter(r => r.status === 'active').map(r => r.title)
  );
  return [...new Set(challenges)].slice(0, 5);
}

function calculateWeekTrend(briefings: IBriefing[]): string {
  if (briefings.length < 2) return 'insufficient data';

  const firstHalf = briefings.slice(0, Math.floor(briefings.length / 2));
  const secondHalf = briefings.slice(Math.floor(briefings.length / 2));

  const firstAvg = firstHalf.reduce((sum, b) => sum + (b.metrics.revenue || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, b) => sum + (b.metrics.revenue || 0), 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (change > 5) return 'upward momentum';
  if (change < -5) return 'needs attention';
  return 'stable performance';
}

function generateOutlook(briefing: IBriefing): string {
  const risks = briefing.risks.filter(r => r.severity === 'high' || r.severity === 'critical');
  const opportunities = briefing.opportunities.filter(o => o.potential === 'high');

  let outlook = '';

  if (risks.length > 0) {
    outlook += `Key risks to monitor: ${risks.map(r => r.title).join(', ')}. `;
  }

  if (opportunities.length > 0) {
    outlook += `Strategic opportunities: ${opportunities.map(o => o.title).join(', ')}. `;
  }

  return outlook || 'Business continues to operate within expected parameters.';
}

export default router;
