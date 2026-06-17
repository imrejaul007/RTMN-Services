import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      overview: { totalUsers: 12453, activeUsers: 3421, revenue: 284567, growth: 12.5 },
      trends: [
        { label: 'Users', value: 3421, change: 8.2, trend: 'up' },
        { label: 'Revenue', value: 284567, change: 12.5, trend: 'up' },
        { label: 'Orders', value: 4521, change: -2.3, trend: 'down' }
      ],
      topCategories: [
        { name: 'Electronics', value: 85432, percentage: 30 },
        { name: 'Fashion', value: 68421, percentage: 24 },
        { name: 'Home', value: 45213, percentage: 16 }
      ]
    });
  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

router.get('/realtime', async (req: AuthRequest, res: Response) => {
  try {
    res.json({ activeUsers: 342, currentOrders: 45, conversionRate: 3.2, avgResponseTime: 145 });
  } catch (error) {
    logger.error('Error fetching realtime:', error);
    res.status(500).json({ error: 'Failed to fetch realtime' });
  }
});

router.get('/cohorts', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      retention: [
        { week: 'Week 1', users: 1000, retained: 680, rate: 68 },
        { week: 'Week 2', users: 1000, retained: 452, rate: 45 }
      ]
    });
  } catch (error) {
    logger.error('Error fetching cohorts:', error);
    res.status(500).json({ error: 'Failed to fetch cohorts' });
  }
});

export default router;
