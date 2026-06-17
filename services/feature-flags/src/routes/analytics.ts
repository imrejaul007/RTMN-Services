import { Router, Request, Response } from 'express';
import { evaluationLogs, FlagModel } from '../index';

const router = Router();

/**
 * GET /api/analytics/overview
 * Get overview statistics for feature flag usage
 */
router.get('/overview', (req: Request, res: Response) => {
  try {
    const { days = '7', environment } = req.query;
    const daysNum = parseInt(days as string, 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // Filter logs by date
    let relevantLogs = evaluationLogs.filter(
      log => new Date(log.evaluatedAt) >= cutoffDate
    );

    if (environment) {
      relevantLogs = relevantLogs.filter(
        log => log.environment === environment
      );
    }

    // Calculate statistics
    const totalEvaluations = relevantLogs.length;
    const uniqueFlags = new Set(relevantLogs.map(l => l.flagKey)).size;
    const uniqueUsers = new Set(
      relevantLogs
        .filter(l => l.context.userId)
        .map(l => l.context.userId)
    ).size;

    // Count by reason
    const reasonCounts: Record<string, number> = {};
    for (const log of relevantLogs) {
      reasonCounts[log.reason] = (reasonCounts[log.reason] || 0) + 1;
    }

    // Count by result (true/false)
    const trueCount = relevantLogs.filter(l => l.result === true).length;
    const falseCount = relevantLogs.filter(l => l.result === false).length;

    // Get top evaluated flags
    const flagCounts: Record<string, number> = {};
    for (const log of relevantLogs) {
      flagCounts[log.flagKey] = (flagCounts[log.flagKey] || 0) + 1;
    }

    const topFlags = Object.entries(flagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({
        flagKey: key,
        evaluationCount: count,
        percentage: totalEvaluations > 0
          ? ((count / totalEvaluations) * 100).toFixed(2)
          : '0.00'
      }));

    res.json({
      success: true,
      data: {
        period: {
          days: daysNum,
          from: cutoffDate.toISOString(),
          to: new Date().toISOString()
        },
        summary: {
          totalEvaluations,
          uniqueFlags,
          uniqueUsers,
          averagePerUser: uniqueUsers > 0
            ? (totalEvaluations / uniqueUsers).toFixed(2)
            : '0.00'
        },
        resultDistribution: {
          true: trueCount,
          false: falseCount,
          truePercentage: totalEvaluations > 0
            ? ((trueCount / totalEvaluations) * 100).toFixed(2)
            : '0.00'
        },
        reasonDistribution: reasonCounts,
        topFlags
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics overview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/flag/:flagKey
 * Get detailed analytics for a specific flag
 */
router.get('/flag/:flagKey', (req: Request, res: Response) => {
  try {
    const { flagKey } = req.params;
    const { days = '30', environment } = req.query;
    const daysNum = parseInt(days as string, 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // Get flag info
    const flag = FlagModel.findByKey(flagKey, environment as string | undefined);

    // Filter logs for this flag
    let relevantLogs = evaluationLogs.filter(
      log => log.flagKey === flagKey && new Date(log.evaluatedAt) >= cutoffDate
    );

    if (environment) {
      relevantLogs = relevantLogs.filter(
        log => log.environment === environment
      );
    }

    // Group by day
    const dailyStats: Record<string, { true: number; false: number; total: number }> = {};
    for (const log of relevantLogs) {
      const day = log.evaluatedAt.split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { true: 0, false: 0, total: 0 };
      }
      dailyStats[day].total++;
      if (log.result === true) {
        dailyStats[day].true++;
      } else {
        dailyStats[day].false++;
      }
    }

    // Group by user attribute
    const environmentCounts: Record<string, number> = {};
    for (const log of relevantLogs) {
      environmentCounts[log.environment] =
        (environmentCounts[log.environment] || 0) + 1;
    }

    // User-level stats
    const userStats: Record<string, { true: number; false: number; total: number }> = {};
    for (const log of relevantLogs) {
      const userId = log.context.userId || log.context.anonymousId || 'anonymous';
      if (!userStats[userId]) {
        userStats[userId] = { true: 0, false: 0, total: 0 };
      }
      userStats[userId].total++;
      if (log.result === true) {
        userStats[userId].true++;
      } else {
        userStats[userId].false++;
      }
    }

    // Get unique users
    const uniqueUsers = Object.keys(userStats).filter(k => k !== 'anonymous').length;

    // Recent evaluations
    const recentEvaluations = relevantLogs
      .slice(-50)
      .reverse()
      .map(log => ({
        evaluatedAt: log.evaluatedAt,
        result: log.result,
        reason: log.reason,
        userId: log.context.userId,
        environment: log.environment
      }));

    res.json({
      success: true,
      data: {
        flag: flag ? {
          id: flag.id,
          key: flag.key,
          name: flag.name,
          enabled: flag.enabled,
          variantType: flag.variantType,
          rolloutPercentage: flag.rollouts.percentage
        } : null,
        period: {
          days: daysNum,
          from: cutoffDate.toISOString(),
          to: new Date().toISOString()
        },
        summary: {
          totalEvaluations: relevantLogs.length,
          uniqueUsers,
          trueCount: relevantLogs.filter(l => l.result === true).length,
          falseCount: relevantLogs.filter(l => l.result === false).length
        },
        dailyTrend: dailyStats,
        environmentDistribution: environmentCounts,
        recentEvaluations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flag analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/comparison
 * Compare performance of multiple flags
 */
router.get('/comparison', (req: Request, res: Response) => {
  try {
    const { flags: flagKeys, days = '7', environment } = req.query;
    const daysNum = parseInt(days as string, 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    if (!flagKeys || typeof flagKeys !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'flags query parameter is required'
      });
    }

    const keys = flagKeys.split(',');
    const comparison: Record<string, {
      totalEvaluations: number;
      trueCount: number;
      falseCount: number;
      truePercentage: number;
      uniqueUsers: number;
      avgEvaluationsPerUser: number;
    }> = {};

    for (const key of keys) {
      let logs = evaluationLogs.filter(
        log => log.flagKey === key && new Date(log.evaluatedAt) >= cutoffDate
      );

      if (environment) {
        logs = logs.filter(log => log.environment === environment);
      }

      const trueCount = logs.filter(l => l.result === true).length;
      const falseCount = logs.filter(l => l.result === false).length;
      const uniqueUsers = new Set(
        logs.filter(l => l.context.userId).map(l => l.context.userId)
      ).size;

      comparison[key] = {
        totalEvaluations: logs.length,
        trueCount,
        falseCount,
        truePercentage: logs.length > 0
          ? parseFloat(((trueCount / logs.length) * 100).toFixed(2))
          : 0,
        uniqueUsers,
        avgEvaluationsPerUser: uniqueUsers > 0
          ? parseFloat((logs.length / uniqueUsers).toFixed(2))
          : 0
      };
    }

    res.json({
      success: true,
      data: comparison,
      period: {
        days: daysNum,
        from: cutoffDate.toISOString(),
        to: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comparison analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/recent
 * Get recent evaluation logs
 */
router.get('/recent', (req: Request, res: Response) => {
  try {
    const { limit = '50', environment } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 500);

    let logs = [...evaluationLogs].reverse();

    if (environment) {
      logs = logs.filter(log => log.environment === environment);
    }

    const recentLogs = logs.slice(0, limitNum).map(log => ({
      id: log.id,
      flagKey: log.flagKey,
      result: log.result,
      reason: log.reason,
      evaluatedAt: log.evaluatedAt,
      environment: log.environment,
      userId: log.context.userId
    }));

    res.json({
      success: true,
      data: recentLogs,
      count: recentLogs.length,
      total: logs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/analytics/clear
 * Clear evaluation logs (admin operation)
 */
router.delete('/clear', (req: Request, res: Response) => {
  try {
    const { before } = req.body;

    if (before) {
      const beforeDate = new Date(before);
      const originalLength = evaluationLogs.length;

      const keptLogs = evaluationLogs.filter(
        log => new Date(log.evaluatedAt) >= beforeDate
      );

      evaluationLogs.length = 0;
      evaluationLogs.push(...keptLogs);

      res.json({
        success: true,
        message: `Cleared ${originalLength - keptLogs.length} logs before ${before}`,
        remaining: keptLogs.length
      });
    } else {
      const count = evaluationLogs.length;
      evaluationLogs.length = 0;

      res.json({
        success: true,
        message: `Cleared all ${count} evaluation logs`,
        remaining: 0
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
