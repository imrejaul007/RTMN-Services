/**
 * Dashboard Routes
 * Dashboard data for deployed Nexhas
 */

import { Router } from 'express';

const router = Router();

// Mock dashboard data - in production, aggregate from real services
const dashboardData = new Map();

// GET /api/studio/dashboard/:nexhaId - Get dashboard data for a Nexha
router.get('/:nexhaId', (req, res) => {
  const { nexhaId } = req.params;

  let data = dashboardData.get(nexhaId);

  if (!data) {
    data = generateMockDashboard(nexhaId);
    dashboardData.set(nexhaId, data);
  }

  res.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/dashboard/:nexhaId/stats - Get stats
router.get('/:nexhaId/stats', (req, res) => {
  const data = dashboardData.get(req.params.nexhaId) || generateMockDashboard(req.params.nexhaId);

  res.json({
    stats: data.stats,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/dashboard/:nexhaId/orders - Recent orders
router.get('/:nexhaId/orders', (req, res) => {
  const data = dashboardData.get(req.params.nexhaId) || generateMockDashboard(req.params.nexhaId);
  const { limit = 20 } = req.query;

  res.json({
    orders: data.recentOrders.slice(0, parseInt(String(limit))),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/dashboard/:nexhaId/workers - Workers status
router.get('/:nexhaId/workers', (req, res) => {
  const data = dashboardData.get(req.params.nexhaId) || generateMockDashboard(req.params.nexhaId);

  res.json({
    workers: data.workers,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/dashboard/:nexhaId/analytics - Analytics
router.get('/:nexhaId/analytics', (req, res) => {
  const data = dashboardData.get(req.params.nexhaId) || generateMockDashboard(req.params.nexhaId);

  res.json({
    analytics: data.analytics,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/studio/dashboard/:nexhaId/refresh - Force refresh
router.post('/:nexhaId/refresh', (req, res) => {
  const data = generateMockDashboard(req.params.nexhaId);
  dashboardData.set(req.params.nexhaId, data);

  res.json({
    success: true,
    refreshedAt: new Date().toISOString(),
  });
});

function generateMockDashboard(nexhaId: string) {
  return {
    nexhaId,
    stats: {
      orders: Math.floor(Math.random() * 500) + 50,
      revenue: Math.floor(Math.random() * 500000) + 10000,
      customers: Math.floor(Math.random() * 200) + 10,
      products: Math.floor(Math.random() * 1000) + 100,
      vendors: Math.floor(Math.random() * 50) + 5,
      averageOrderValue: Math.floor(Math.random() * 5000) + 500,
      conversionRate: (Math.random() * 5 + 1).toFixed(2),
    },
    recentOrders: Array.from({ length: 10 }, (_, i) => ({
      orderId: `ORD-${Date.now() - i * 86400000}`,
      customerId: `CUST-${Math.floor(Math.random() * 1000)}`,
      amount: Math.floor(Math.random() * 5000) + 100,
      status: ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
      placedAt: new Date(Date.now() - i * 86400000).toISOString(),
    })),
    workers: [
      { id: 'chef-worker', status: 'active', tasksToday: 42, uptime: '99.9%' },
      { id: 'procurement-worker', status: 'active', tasksToday: 18, uptime: '99.8%' },
      { id: 'finance-worker', status: 'active', tasksToday: 67, uptime: '100%' },
    ],
    analytics: {
      revenueChart: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 10000) + 1000),
      },
      topProducts: [
        { id: 'PROD001', name: 'Top Product 1', sales: 234 },
        { id: 'PROD002', name: 'Top Product 2', sales: 189 },
        { id: 'PROD003', name: 'Top Product 3', sales: 145 },
      ],
    },
    generatedAt: new Date().toISOString(),
  };
}

export default router;
