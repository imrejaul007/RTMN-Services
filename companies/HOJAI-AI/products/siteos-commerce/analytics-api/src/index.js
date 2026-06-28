/**
 * HOJAI SiteOS Analytics API
 * Port: 5489
 * Real-time metrics, funnels, cohorts, revenue analytics
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5489;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/analytics-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

// Generate mock data for demo
const generateMockData = (companyId) => {
  const now = new Date();
  const events = [];
  const visitors = [];
  const orders = [];

  // Generate 7 days of data
  for (let d = 6; d >= 0; d--) {
    const date = new Date(now - d * 24 * 60 * 60 * 1000);
    const dayVisitors = Math.floor(Math.random() * 500) + 200;
    const dayEvents = Math.floor(Math.random() * 2000) + 500;
    const dayOrders = Math.floor(dayVisitors * 0.03);

    events.push({
      date: date.toISOString().split('T')[0],
      visitors: dayVisitors,
      pageviews: dayEvents,
      orders: dayOrders,
      revenue: dayOrders * (Math.random() * 500 + 200)
    });

    visitors.push({ date: date.toISOString().split('T')[0], count: dayVisitors });
    orders.push({ date: date.toISOString().split('T')[0], count: dayOrders, value: dayOrders * 350 });
  }

  return { events, visitors, orders };
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'analytics-api', port: PORT });
});

// =====================
// REALTIME METRICS
// =====================

app.get('/api/analytics/realtime', requireAuth, (req, res) => {
  const visitors = Math.floor(Math.random() * 50) + 10;
  const events = Math.floor(Math.random() * 200) + 50;

  res.json({
    activeVisitors: visitors,
    eventsPerMinute: events,
    conversionRate: (Math.random() * 5 + 1).toFixed(2),
    avgSessionTime: Math.floor(Math.random() * 300) + 60,
    topPages: [
      { path: '/', views: Math.floor(Math.random() * 100) + 50 },
      { path: '/products', views: Math.floor(Math.random() * 80) + 30 },
      { path: '/checkout', views: Math.floor(Math.random() * 20) + 10 }
    ],
    timestamp: new Date().toISOString()
  });
});

// =====================
// DAILY METRICS
// =====================

app.get('/api/analytics/daily', requireAuth, (req, res) => {
  const { days = 7 } = req.query;
  const mock = generateMockData(req.companyId);

  res.json({
    daily: mock.events.slice(-Number(days)),
    visitors: mock.visitors.slice(-Number(days)),
    orders: mock.orders.slice(-Number(days))
  });
});

// =====================
// REVENUE METRICS
// =====================

app.get('/api/analytics/revenue', requireAuth, (req, res) => {
  const mock = generateMockData(req.companyId);
  const totalRevenue = mock.events.reduce((sum, e) => sum + e.revenue, 0);
  const totalOrders = mock.events.reduce((sum, e) => sum + e.orders, 0);

  res.json({
    totalRevenue: Math.round(totalRevenue),
    totalOrders,
    avgOrderValue: Math.round(totalRevenue / totalOrders || 0),
    revenueGrowth: ((Math.random() * 20 - 5)).toFixed(1),
    ordersGrowth: ((Math.random() * 15 - 3)).toFixed(1),
    byChannel: {
      organic: Math.round(totalRevenue * 0.4),
      paid: Math.round(totalRevenue * 0.3),
      social: Math.round(totalRevenue * 0.2),
      direct: Math.round(totalRevenue * 0.1)
    },
    byDay: mock.events
  });
});

// =====================
// FUNNEL ANALYSIS
// =====================

app.get('/api/analytics/funnels', requireAuth, (req, res) => {
  const { name = 'default' } = req.query;

  res.json({
    funnel: [
      { step: 'Visit', count: 10000, rate: 100 },
      { step: 'Product View', count: 4500, rate: 45 },
      { step: 'Add to Cart', count: 1200, rate: 12 },
      { step: 'Checkout', count: 600, rate: 6 },
      { step: 'Purchase', count: 300, rate: 3 }
    ],
    conversionRates: {
      visitToView: 45,
      viewToCart: 26.7,
      cartToCheckout: 50,
      checkoutToPurchase: 50,
      overall: 3
    }
  });
});

// =====================
// TOP PRODUCTS
// =====================

app.get('/api/analytics/top-products', requireAuth, (req, res) => {
  const { limit = 10 } = req.query;

  res.json({
    products: [
      { id: 'p1', name: 'Premium Wireless Headphones', sales: 156, revenue: 78000 },
      { id: 'p2', name: 'Smart Watch Pro', sales: 134, revenue: 120600 },
      { id: 'p3', name: 'Portable Charger', sales: 98, revenue: 19600 },
      { id: 'p4', name: 'Bluetooth Speaker', sales: 87, revenue: 34800 },
      { id: 'p5', name: 'USB-C Cable Pack', sales: 76, revenue: 7600 }
    ].slice(0, Number(limit))
  });
});

// =====================
// TOP CUSTOMERS
// =====================

app.get('/api/analytics/top-customers', requireAuth, (req, res) => {
  res.json({
    customers: [
      { id: 'c1', name: 'John Smith', orders: 15, ltv: 45000 },
      { id: 'c2', name: 'Sarah Johnson', orders: 12, ltv: 38000 },
      { id: 'c3', name: 'Mike Chen', orders: 10, ltv: 32000 },
      { id: 'c4', name: 'Emma Wilson', orders: 8, ltv: 28000 },
      { id: 'c5', name: 'David Brown', orders: 7, ltv: 24000 }
    ]
  });
});

// =====================
// COHORT ANALYSIS
// =====================

app.get('/api/analytics/cohorts', requireAuth, (req, res) => {
  const cohorts = [];
  for (let w = 0; w < 8; w++) {
    const date = new Date(Date.now() - w * 7 * 24 * 60 * 60 * 1000);
    const retention = Math.max(100 - w * 10 + Math.random() * 5, 10);
    cohorts.push({
      cohort: date.toISOString().split('T')[0],
      users: Math.floor(Math.random() * 200) + 100,
      week0: 100,
      week1: Math.round(retention),
      week2: Math.round(retention * 0.8),
      week3: Math.round(retention * 0.6),
      week4: Math.round(retention * 0.4)
    });
  }

  res.json({ cohorts: cohorts.reverse() });
});

// =====================
// EVENT TRACKING
// =====================

app.post('/api/analytics/track', requireAuth, (req, res) => {
  const { event, properties } = req.body;
  if (!event) return res.status(400).json({ error: 'event required' });

  const eventData = {
    id: uuidv4(),
    companyId: req.companyId,
    event,
    properties: properties || {},
    timestamp: new Date().toISOString()
  };

  const events = loadData(req.companyId, 'events');
  events.push(eventData);
  saveData(req.companyId, 'events', events);

  res.json({ success: true, event: eventData });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Analytics API running on port ${PORT}`);
});

export default app;
