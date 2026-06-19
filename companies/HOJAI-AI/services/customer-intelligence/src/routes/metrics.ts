import { Router, Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { asyncHandler } from '../utils/helpers';

const router = Router();

/**
 * GET /api/metrics/summary
 * Get overall customer metrics summary
 */
router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    activeCustomers,
    newCustomersToday,
    newCustomersThisWeek,
    newCustomersThisMonth,
    recentCustomers,
    riskDistribution
  ] = await Promise.all([
    Customer.countDocuments({}),
    Customer.countDocuments({ status: 'active' }),
    Customer.countDocuments({ createdAt: { $gte: todayStart } }),
    Customer.countDocuments({ createdAt: { $gte: weekStart } }),
    Customer.countDocuments({ createdAt: { $gte: monthStart } }),
    Customer.find({})
      .sort({ 'metrics.totalRevenue': -1 })
      .limit(100)
      .select('metrics.totalRevenue metrics.engagementScore'),
    getRiskDistribution()
  ]);

  // Calculate averages
  const totalRevenue = recentCustomers.reduce((sum, c) =>
    sum + (c.metrics?.totalRevenue || 0), 0);
  const avgLifetimeValue = recentCustomers.length > 0
    ? totalRevenue / recentCustomers.length
    : 0;

  const totalEngagement = recentCustomers.reduce((sum, c) =>
    sum + (c.metrics?.engagementScore || 0), 0);
  const avgEngagementScore = recentCustomers.length > 0
    ? totalEngagement / recentCustomers.length
    : 0;

  // Calculate churn rate (churned customers / total)
  const churnedCustomers = await Customer.countDocuments({ status: 'churned' });
  const churnRate = totalCustomers > 0
    ? Math.round((churnedCustomers / totalCustomers) * 10000) / 100
    : 0;

  res.json({
    success: true,
    data: {
      totalCustomers,
      activeCustomers,
      inactiveCustomers: totalCustomers - activeCustomers,
      newCustomersToday,
      newCustomersThisWeek,
      newCustomersThisMonth,
      averageLifetimeValue: Math.round(avgLifetimeValue * 100) / 100,
      averageEngagementScore: Math.round(avgEngagementScore * 100) / 100,
      churnRate,
      riskDistribution
    }
  });
}));

/**
 * GET /api/metrics/tier-distribution
 * Get customer distribution by tier
 */
router.get('/tier-distribution', asyncHandler(async (_req: Request, res: Response) => {
  const tiers = await Customer.aggregate([
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$metrics.totalRevenue' },
        avgRevenue: { $avg: '$metrics.totalRevenue' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const total = tiers.reduce((sum, t) => sum + t.count, 0);

  res.json({
    success: true,
    data: tiers.map(t => ({
      tier: t._id,
      count: t.count,
      percentage: total > 0 ? Math.round((t.count / total) * 10000) / 100 : 0,
      totalRevenue: Math.round(t.totalRevenue * 100) / 100,
      averageRevenue: Math.round(t.avgRevenue * 100) / 100
    })),
    total
  });
}));

/**
 * GET /api/metrics/status-distribution
 * Get customer distribution by status
 */
router.get('/status-distribution', asyncHandler(async (_req: Request, res: Response) => {
  const statuses = await Customer.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$metrics.totalRevenue' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  res.json({
    success: true,
    data: statuses.map(s => ({
      status: s._id,
      count: s.count,
      percentage: total > 0 ? Math.round((s.count / total) * 10000) / 100 : 0,
      totalRevenue: Math.round(s.totalRevenue * 100) / 100
    })),
    total
  });
}));

/**
 * GET /api/metrics/revenue-breakdown
 * Get revenue breakdown statistics
 */
router.get('/revenue-breakdown', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await Customer.aggregate([
    {
      $match: { 'metrics.totalRevenue': { $gt: 0 } }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$metrics.totalRevenue' },
        avgRevenue: { $avg: '$metrics.totalRevenue' },
        maxRevenue: { $max: '$metrics.totalRevenue' },
        minRevenue: { $min: '$metrics.totalRevenue' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Get percentiles
  const percentiles = await Customer.aggregate([
    {
      $match: { 'metrics.totalRevenue': { $gt: 0 } }
    },
    {
      $group: {
        _id: null,
        revenues: { $push: '$metrics.totalRevenue' }
      }
    }
  ]);

  const revenueStats = stats[0] || {
    totalRevenue: 0,
    avgRevenue: 0,
    maxRevenue: 0,
    minRevenue: 0,
    count: 0
  };

  res.json({
    success: true,
    data: {
      totalRevenue: Math.round(revenueStats.totalRevenue * 100) / 100,
      averageRevenue: Math.round(revenueStats.avgRevenue * 100) / 100,
      maxRevenue: revenueStats.maxRevenue,
      minRevenue: revenueStats.minRevenue,
      customerCountWithRevenue: revenueStats.count,
      topPercentile: percentiles[0]?.revenues?.sort((a, b) => b - a)[0] || 0
    }
  });
}));

/**
 * GET /api/metrics/engagement-distribution
 * Get engagement score distribution
 */
router.get('/engagement-distribution', asyncHandler(async (_req: Request, res: Response) => {
  const distribution = await Customer.aggregate([
    {
      $bucket: {
        groupBy: '$metrics.engagementScore',
        boundaries: [0, 20, 40, 60, 80, 101],
        default: 'Other',
        output: {
          count: { $sum: 1 },
          customers: { $push: '$customerId' }
        }
      }
    }
  ]);

  const labels = ['Very Low (0-19)', 'Low (20-39)', 'Medium (40-59)', 'High (60-79)', 'Very High (80-100)'];

  res.json({
    success: true,
    data: distribution.map((d, i) => ({
      range: labels[i] || d._id,
      count: d.count
    }))
  });
}));

/**
 * GET /api/metrics/top-customers
 * Get top customers by various metrics
 */
router.get('/top-customers', asyncHandler(async (req: Request, res: Response) => {
  const sortBy = (req.query.sortBy as string) || 'totalRevenue';
  const limit = parseInt(req.query.limit as string) || 10;

  const validSortFields = ['totalRevenue', 'totalOrders', 'engagementScore', 'averageOrderValue'];

  const customers = await Customer.find({})
    .sort({ [`metrics.${sortBy}`]: -1 })
    .limit(limit)
    .select('customerId firstName lastName email metrics tier');

  res.json({
    success: true,
    data: customers.map(c => ({
      customerId: c.customerId,
      name: c.getFullName(),
      email: c.email,
      tier: c.tier,
      metrics: c.metrics,
      sortBy
    }))
  });
}));

/**
 * GET /api/metrics/daily-new-customers
 * Get daily new customer counts for a time period
 */
router.get('/daily-new-customers', asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const dailyCounts = await Customer.aggregate([
    {
      $match: { createdAt: { $gte: startDate } }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: dailyCounts.map(d => ({
      date: d._id,
      count: d.count
    }))
  });
}));

// Helper function
async function getRiskDistribution(): Promise<{ high: number; medium: number; low: number }> {
  const distribution = { high: 0, medium: 0, low: 0 };

  const highRisk = await Customer.countDocuments({
    'riskScore.overall': { $gte: 70 }
  });

  const mediumRisk = await Customer.countDocuments({
    'riskScore.overall': { $gte: 40, $lt: 70 }
  });

  const lowRisk = await Customer.countDocuments({
    'riskScore.overall': { $lt: 40 }
  });

  distribution.high = highRisk;
  distribution.medium = mediumRisk;
  distribution.low = lowRisk;

  return distribution;
}

export default router;
