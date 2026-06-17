import { Router, Request, Response, NextFunction } from 'express';
import { Call, CallStatus, Sentiment } from '../models/Call';
import { Recording, RecordingStatus } from '../models/Recording';

const router = Router();

// Get call statistics
router.get('/calls', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, startDate, endDate, customerId } = req.query;

    const filter: any = {};
    if (tenantId) filter.tenantId = tenantId;
    if (customerId) filter.customerId = customerId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Aggregate by status
    const statusStats = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Aggregate by direction
    const directionStats = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$direction',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Sentiment distribution
    const sentimentStats = await Call.aggregate([
      { $match: { ...filter, sentiment: { $exists: true } } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 }
        }
      }
    ]);

    // Intent distribution
    const intentStats = await Call.aggregate([
      { $match: { ...filter, intent: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$intent',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Time series (daily counts)
    const timeSeries = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    // Total counts
    const totals = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totals: totals[0] || { totalCalls: 0, totalDuration: 0, avgDuration: 0 },
        byStatus: statusStats,
        byDirection: directionStats,
        bySentiment: sentimentStats,
        topIntents: intentStats,
        timeSeries
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get customer voice analytics
router.get('/customer/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;

    const filter: any = { customerId: req.params.customerId };
    if (tenantId) filter.tenantId = tenantId;

    // Overall stats for this customer
    const overallStats = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' },
          inboundCalls: {
            $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] }
          },
          outboundCalls: {
            $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] }
          }
        }
      }
    ]);

    // Sentiment over time
    const sentimentTrend = await Call.aggregate([
      { $match: { ...filter, sentiment: { $exists: true } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sentiment: '$sentiment'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': -1 } },
      { $limit: 30 }
    ]);

    // Intent breakdown
    const intentBreakdown = await Call.aggregate([
      { $match: { ...filter, intent: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$intent',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent calls summary
    const recentCalls = await Call.find(filter)
      .select('callId direction duration sentiment intent summary status createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || {
          totalCalls: 0,
          totalDuration: 0,
          avgDuration: 0,
          inboundCalls: 0,
          outboundCalls: 0
        },
        sentimentTrend,
        intentBreakdown,
        recentCalls
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get agent/queue performance
router.get('/performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, startDate, endDate } = req.query;

    const filter: any = {};
    if (tenantId) filter.tenantId = tenantId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Average handling time by day
    const handlingTime = await Call.aggregate([
      { $match: { ...filter, status: CallStatus.COMPLETED } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    // Answer rate
    const answerStats = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          answered: {
            $sum: { $cond: [{ $in: ['$status', [CallStatus.ANSWERED, CallStatus.COMPLETED]] }, 1, 0] }
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$status', CallStatus.MISSED] }, 1, 0] }
          }
        }
      }
    ]);

    // Service level (calls answered within threshold)
    const serviceLevel = await Call.aggregate([
      { $match: { ...filter, status: CallStatus.COMPLETED } },
      {
        $bucket: {
          groupBy: '$duration',
          boundaries: [0, 30, 60, 120, 180, 300],
          default: '300+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        handlingTime,
        answerRate: answerStats[0] ? {
          total: answerStats[0].total,
          answered: answerStats[0].answered,
          missed: answerStats[0].missed,
          rate: ((answerStats[0].answered / answerStats[0].total) * 100).toFixed(2) + '%'
        } : null,
        serviceLevel
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get sentiment analysis
router.get('/sentiment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, startDate, endDate, customerId } = req.query;

    const filter: any = { sentiment: { $exists: true } };
    if (tenantId) filter.tenantId = tenantId;
    if (customerId) filter.customerId = customerId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Overall sentiment distribution
    const distribution = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
          percentage: {
            $sum: 1
          }
        }
      }
    ]);

    // Sentiment by time
    const byTime = await Call.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sentiment: '$sentiment'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Sentiment by intent
    const byIntent = await Call.aggregate([
      { $match: { ...filter, intent: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: { sentiment: '$sentiment', intent: '$intent' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate percentages
    const total = distribution.reduce((sum, d) => sum + d.count, 0);
    const distributionWithPercent = distribution.map(d => ({
      sentiment: d._id,
      count: d.count,
      percentage: total > 0 ? ((d.count / total) * 100).toFixed(2) + '%' : '0%'
    }));

    res.json({
      success: true,
      data: {
        distribution: distributionWithPercent,
        byTime,
        byIntent
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get real-time dashboard data
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.query;

    const filter: any = {};
    if (tenantId) filter.tenantId = tenantId;

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // Today's stats
    const todayStats = await Call.aggregate([
      { $match: { ...filter, createdAt: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          answered: { $sum: { $cond: [{ $eq: ['$status', CallStatus.ANSWERED] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', CallStatus.COMPLETED] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $eq: ['$status', CallStatus.MISSED] }, 1, 0] } },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Week comparison
    const weekStats = await Call.aggregate([
      { $match: { ...filter, createdAt: { $gte: weekStart, $lt: todayStart } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Current active calls
    const activeCalls = await Call.countDocuments({
      ...filter,
      status: { $in: [CallStatus.RINGING, CallStatus.ANSWERED] }
    });

    // Pending recordings
    const pendingRecordings = await Recording.countDocuments({
      ...filter,
      status: { $in: [RecordingStatus.PENDING, RecordingStatus.PROCESSING] }
    });

    // Sentiment today
    const todaySentiment = await Call.aggregate([
      { $match: { ...filter, createdAt: { $gte: todayStart }, sentiment: { $exists: true } } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        today: todayStats[0] || { total: 0, answered: 0, completed: 0, missed: 0, avgDuration: 0 },
        weekAgo: weekStats[0] || { total: 0, avgDuration: 0 },
        activeCalls,
        pendingRecordings,
        todaySentiment
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
