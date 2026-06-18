import { Router, Request, Response } from 'express';
import { RepPerformance, TeamPerformance, APIResponse } from '../models/Insights';

const router = Router();

// In-memory storage for demo (replace with actual service calls)
const mockReps: RepPerformance[] = [];

// Get rep performance metrics
router.get('/reps', async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const period = (req.query.period as string) || 'current_quarter';
    const sortBy = (req.query.sortBy as string) || 'revenue';
    const limit = parseInt(req.query.limit as string) || 50;

    // Mock data for demo
    const reps = generateMockRepPerformance(limit, teamId);

    // Sort by specified field
    reps.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.metrics.revenue - a.metrics.revenue;
        case 'attainment':
          return b.metrics.attainment - a.metrics.attainment;
        case 'winRate':
          return b.metrics.winRate - a.metrics.winRate;
        case 'dealsWon':
          return b.metrics.dealsWon - a.metrics.dealsWon;
        default:
          return 0;
      }
    });

    // Add rank
    reps.forEach((rep, index) => {
      rep.metrics.rank = index + 1;
    });

    const response: APIResponse<RepPerformance[]> = {
      success: true,
      data: reps,
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
        code: 'REP_PERFORMANCE_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get individual rep performance
router.get('/reps/:repId', async (req: Request, res: Response) => {
  try {
    const { repId } = req.params;
    const period = (req.query.period as string) || 'current_quarter';

    const rep = generateMockRepPerformance(1, undefined, repId)[0];

    if (!rep) {
      res.status(404).json({
        success: false,
        error: {
          code: 'REP_NOT_FOUND',
          message: `Rep with ID ${repId} not found`
        }
      });
      return;
    }

    const response: APIResponse<RepPerformance> = {
      success: true,
      data: rep,
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
        code: 'REP_PERFORMANCE_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get team performance
router.get('/teams', async (req: Request, res: Response) => {
  try {
    const managerId = req.query.managerId as string | undefined;
    const period = (req.query.period as string) || 'current_quarter';

    const teams = generateMockTeamPerformance(managerId);

    const response: APIResponse<TeamPerformance[]> = {
      success: true,
      data: teams,
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
        code: 'TEAM_PERFORMANCE_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'current_quarter';
    const category = (req.query.category as string) || 'revenue';
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = generateLeaderboard(category, limit);

    const response: APIResponse<any> = {
      success: true,
      data: leaderboard,
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
        code: 'LEADERBOARD_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get activity metrics
router.get('/activities', async (req: Request, res: Response) => {
  try {
    const repId = req.query.repId as string | undefined;
    const teamId = req.query.teamId as string | undefined;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const activities = generateMockActivities(repId, teamId, startDate, endDate);

    const response: APIResponse<any> = {
      success: true,
      data: activities,
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
        code: 'ACTIVITIES_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get performance trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const repId = req.query.repId as string | undefined;
    const teamId = req.query.teamId as string | undefined;
    const metric = (req.query.metric as string) || 'revenue';
    const periods = parseInt(req.query.periods as string) || 6;

    const trends = generatePerformanceTrends(repId, teamId, metric, periods);

    const response: APIResponse<any> = {
      success: true,
      data: trends,
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
        code: 'TRENDS_ERROR',
        message: errorMessage
      }
    });
  }
});

// Get coaching insights
router.get('/coaching', async (req: Request, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const focusArea = (req.query.focus as string) | undefined;

    const coaching = generateCoachingInsights(teamId, focusArea);

    const response: APIResponse<any> = {
      success: true,
      data: coaching,
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
        code: 'COACHING_ERROR',
        message: errorMessage
      }
    });
  }
});

// Helper functions

function generateMockRepPerformance(count: number, teamId?: string, specificId?: string): RepPerformance[] {
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Chris', 'Amanda', 'Kevin', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const teams = ['Enterprise', 'Mid-Market', 'SMB', 'Strategic'];

  const reps: RepPerformance[] = [];

  for (let i = 0; i < count; i++) {
    const repId = specificId || `REP-${String(i + 1).padStart(3, '0')}`;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const quota = 250000 + Math.floor(Math.random() * 750000);
    const attainment = 0.5 + Math.random() * 0.8;
    const revenue = Math.floor(quota * attainment);

    reps.push({
      repId,
      repName: `${firstName} ${lastName}`,
      teamId: teamId || `TEAM-${teams[Math.floor(Math.random() * teams.length)]}`,
      metrics: {
        revenue,
        quota,
        attainment,
        dealsWon: Math.floor(5 + Math.random() * 25),
        dealsLost: Math.floor(2 + Math.random() * 10),
        winRate: 0.3 + Math.random() * 0.4,
        averageCycleTime: 30 + Math.floor(Math.random() * 60),
        averageDealSize: 15000 + Math.floor(Math.random() * 85000),
        activities: {
          calls: Math.floor(50 + Math.random() * 150),
          emails: Math.floor(100 + Math.random() * 300),
          meetings: Math.floor(20 + Math.random() * 40),
          demos: Math.floor(5 + Math.random() * 20),
          proposals: Math.floor(3 + Math.random() * 15)
        }
      },
      period: 'Q2-2024',
      trends: [
        {
          metric: 'revenue',
          direction: Math.random() > 0.3 ? 'up' : (Math.random() > 0.5 ? 'down' : 'stable'),
          changePercent: Math.floor(-10 + Math.random() * 30),
          momentum: 'accelerating'
        }
      ],
      comparisons: {
        vsTeamAverage: -10 + Math.random() * 40,
        vsTopPerformer: -30 + Math.random() * 30,
        vsQuota: -20 + Math.random() * 40
      }
    });
  }

  return reps;
}

function generateMockTeamPerformance(managerId?: string): TeamPerformance[] {
  const teams = ['Enterprise', 'Mid-Market', 'SMB', 'Strategic'];
  const teamData: TeamPerformance[] = [];

  for (const team of teams) {
    const teamId = `TEAM-${team}`;
    if (managerId && teamId !== managerId) continue;

    const repCount = 5 + Math.floor(Math.random() * 10);
    const totalQuota = repCount * (300000 + Math.floor(Math.random() * 400000));
    const attainment = 0.7 + Math.random() * 0.4;
    const totalRevenue = Math.floor(totalQuota * attainment);

    teamData.push({
      teamId,
      teamName: `${team} Team`,
      managerId: `MGR-${team}`,
      totalRevenue,
      totalQuota,
      attainment,
      repCount,
      topReps: generateMockRepPerformance(3, teamId),
      underperformingReps: generateMockRepPerformance(2, teamId),
      teamHealth: {
        collaboration: 70 + Math.floor(Math.random() * 30),
        knowledgeSharing: 65 + Math.floor(Math.random() * 35),
        mentorship: 60 + Math.floor(Math.random() * 40),
        morale: 70 + Math.floor(Math.random() * 30)
      }
    });
  }

  return teamData;
}

function generateLeaderboard(category: string, limit: number): any[] {
  const entries = generateMockRepPerformance(20);
  entries.sort((a, b) => {
    switch (category) {
      case 'revenue':
        return b.metrics.revenue - a.metrics.revenue;
      case 'attainment':
        return b.metrics.attainment - a.metrics.attainment;
      case 'winRate':
        return b.metrics.winRate - a.metrics.winRate;
      case 'deals':
        return b.metrics.dealsWon - a.metrics.dealsWon;
      default:
        return 0;
    }
  });

  return entries.slice(0, limit).map((rep, index) => ({
    rank: index + 1,
    repId: rep.repId,
    repName: rep.repName,
    value: category === 'revenue' ? rep.metrics.revenue :
           category === 'attainment' ? Math.round(rep.metrics.attainment * 100) :
           category === 'winRate' ? Math.round(rep.metrics.winRate * 100) :
           rep.metrics.dealsWon,
    unit: category === 'revenue' ? '$' : category === 'attainment' || category === 'winRate' ? '%' : 'deals'
  }));
}

function generateMockActivities(repId?: string, teamId?: string, startDate?: Date, endDate?: Date): any {
  return {
    period: { start: startDate, end: endDate },
    summary: {
      calls: Math.floor(100 + Math.random() * 200),
      emails: Math.floor(200 + Math.random() * 400),
      meetings: Math.floor(30 + Math.random() * 50),
      demos: Math.floor(10 + Math.random() * 30)
    },
    dailyAverage: {
      calls: Math.floor(5 + Math.random() * 10),
      emails: Math.floor(15 + Math.random() * 25),
      meetings: Math.floor(2 + Math.random() * 5)
    },
    trends: {
      callsChange: Math.floor(-10 + Math.random() * 20),
      emailsChange: Math.floor(-15 + Math.random() * 25),
      meetingsChange: Math.floor(-5 + Math.random() * 15)
    }
  };
}

function generatePerformanceTrends(repId?: string, teamId?: string, metric?: string, periods?: number): any[] {
  const trends = [];
  for (let i = 0; i < (periods || 6); i++) {
    trends.push({
      period: `Period ${i + 1}`,
      value: 10000 + Math.floor(Math.random() * 5000) + (i * 500),
      change: Math.floor(-5 + Math.random() * 15),
      direction: Math.random() > 0.3 ? 'up' : (Math.random() > 0.5 ? 'down' : 'stable')
    });
  }
  return trends;
}

function generateCoachingInsights(teamId?: string, focusArea?: string): any[] {
  return [
    {
      repId: 'REP-001',
      repName: 'John Smith',
      insight: 'Opportunity to improve demo-to-close ratio',
      severity: 'medium',
      recommendation: 'Schedule follow-up within 24 hours of demo',
      potentialImpact: 15
    },
    {
      repId: 'REP-003',
      repName: 'Sarah Johnson',
      insight: 'Strong performance in enterprise segment',
      severity: 'positive',
      recommendation: 'Share best practices with team',
      potentialImpact: 10
    }
  ];
}

export default router;
