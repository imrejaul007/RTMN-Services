import { Router, Request, Response } from 'express';
import { Order } from '../models/Order';
import { calculateOrderMetrics, calculateRevenueMetrics, calculateCustomerMetrics, calculateProductMetrics } from '../services/analytics';
import { logger } from '../index';

const router = Router();

// Middleware to extract tenant
function extractTenant(req: Request, res: Response, next: Function) {
  const tenantId = req.headers['x-tenant-id'] as string || req.body?.tenantId || 'default';
  (req as any).tenantId = tenantId;
  next();
}

// GET /api/analytics/overview - Get analytics overview
router.get('/overview', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    const dateFilter: Record<string, any> = { tenantId };
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) (dateFilter.createdAt as any).$gte = new Date(startDate as string);
      if (endDate) (dateFilter.createdAt as any).$lte = new Date(endDate as string);
    }

    const [metrics, revenue, customer, product] = await Promise.all([
      calculateOrderMetrics(tenantId, startDate as string, endDate as string),
      calculateRevenueMetrics(tenantId, startDate as string, endDate as string),
      calculateCustomerMetrics(tenantId, startDate as string, endDate as string),
      calculateProductMetrics(tenantId, startDate as string, endDate as string),
    ]);

    res.json({
      success: true,
      data: {
        orders: metrics,
        revenue,
        customers: customer,
        products: product,
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' });
  }
});

// GET /api/analytics/orders - Detailed order analytics
router.get('/orders', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    const metrics = await calculateOrderMetrics(tenantId, startDate as string, endDate as string);

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Error fetching order analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order analytics' });
  }
});

// GET /api/analytics/revenue - Revenue analytics
router.get('/revenue', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate, granularity = 'day' } = req.query;

    const metrics = await calculateRevenueMetrics(
      tenantId,
      startDate as string,
      endDate as string,
      granularity as string
    );

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Error fetching revenue analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue analytics' });
  }
});

// GET /api/analytics/customers - Customer analytics
router.get('/customers', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    const metrics = await calculateCustomerMetrics(tenantId, startDate as string, endDate as string);

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Error fetching customer analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer analytics' });
  }
});

// GET /api/analytics/products - Product analytics
router.get('/products', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate, limit = '10' } = req.query;

    const metrics = await calculateProductMetrics(
      tenantId,
      startDate as string,
      endDate as string,
      parseInt(limit as string)
    );

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Error fetching product analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product analytics' });
  }
});

// GET /api/analytics/trends - Order trends over time
router.get('/trends', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate, granularity = 'day' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    let groupFormat: string;
    switch (granularity) {
      case 'hour':
        groupFormat = '%Y-%m-%d %H:00';
        break;
      case 'week':
        groupFormat = '%Y-W%V';
        break;
      case 'month':
        groupFormat = '%Y-%m';
        break;
      default:
        groupFormat = '%Y-%m-%d';
    }

    const trends = await Order.aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          totalOrders: { $sum: '$count' },
          totalRevenue: { $sum: '$revenue' },
          byStatus: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: trends });
  } catch (error) {
    logger.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

// GET /api/analytics/status - Order status distribution
router.get('/status', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    const match: Record<string, any> = { tenantId };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) (match.createdAt as any).$gte = new Date(startDate as string);
      if (endDate) (match.createdAt as any).$lte = new Date(endDate as string);
    }

    const distribution = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = distribution.reduce((sum, item) => sum + item.count, 0);
    const totalRevenue = distribution.reduce((sum, item) => sum + item.revenue, 0);

    const statusDistribution = distribution.map(item => ({
      status: item._id,
      count: item.count,
      revenue: Math.round(item.revenue * 100) / 100,
      percentage: Math.round((item.count / total) * 10000) / 100,
    }));

    res.json({
      success: true,
      data: {
        distribution: statusDistribution,
        total: {
          orders: total,
          revenue: Math.round(totalRevenue * 100) / 100,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching status distribution:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status distribution' });
  }
});

// GET /api/analytics/average-order-value - AOV metrics
router.get('/aov', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { startDate, endDate } = req.query;

    const match: Record<string, any> = {
      tenantId,
      status: { $nin: ['cancelled'] },
    };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) (match.createdAt as any).$gte = new Date(startDate as string);
      if (endDate) (match.createdAt as any).$lte = new Date(endDate as string);
    }

    const aovData = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          averageOrderValue: { $avg: '$pricing.total' },
          totalRevenue: { $sum: '$pricing.total' },
          orderCount: { $sum: 1 },
          minOrder: { $min: '$pricing.total' },
          maxOrder: { $max: '$pricing.total' },
        },
      },
    ]);

    const result = aovData[0] || {
      averageOrderValue: 0,
      totalRevenue: 0,
      orderCount: 0,
      minOrder: 0,
      maxOrder: 0,
    };

    res.json({
      success: true,
      data: {
        averageOrderValue: Math.round(result.averageOrderValue * 100) / 100,
        totalRevenue: Math.round(result.totalRevenue * 100) / 100,
        orderCount: result.orderCount,
        minOrder: Math.round(result.minOrder * 100) / 100,
        maxOrder: Math.round(result.maxOrder * 100) / 100,
      },
    });
  } catch (error) {
    logger.error('Error fetching AOV metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch AOV metrics' });
  }
});

export default router;
