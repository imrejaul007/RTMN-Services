/**
 * RTNM Unified Dashboard Service
 * Port: 4900 - Cross-company analytics and executive dashboard
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 4900;
const app: Express = express();

// Types
type Company = 'rez-consumer' | 'rez-merchant' | 'risacare' | 'corpperks' | 'hojai-ai';
type MetricType = 'users' | 'revenue' | 'transactions' | 'engagement' | 'performance';

interface CompanyMetrics {
  company: Company;
  companyName: string;
  period: string;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    revenue: number;
    revenueGrowth: number;
    transactions: number;
    transactionGrowth: number;
    avgOrderValue: number;
    engagement: number;
    retention: number;
  };
  trends: { date: string; value: number }[];
}

interface UnifiedMetrics {
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  companyMetrics: CompanyMetrics[];
  overallGrowth: number;
  period: string;
}

// In-memory storage (would be fetched from actual services in production)
const companyData: Record<Company, CompanyMetrics> = {
  'rez-consumer': {
    company: 'rez-consumer',
    companyName: 'REZ Consumer',
    period: 'June 2026',
    metrics: {
      totalUsers: 1250000,
      activeUsers: 450000,
      newUsers: 12500,
      revenue: 45000000,
      revenueGrowth: 15.2,
      transactions: 890000,
      transactionGrowth: 22.5,
      avgOrderValue: 850,
      engagement: 78,
      retention: 65,
    },
    trends: generateTrends(30, 1200000, 1300000),
  },
  'rez-merchant': {
    company: 'rez-merchant',
    companyName: 'REZ Merchant',
    period: 'June 2026',
    metrics: {
      totalUsers: 85000,
      activeUsers: 62000,
      newUsers: 2500,
      revenue: 125000000,
      revenueGrowth: 28.5,
      transactions: 2500000,
      transactionGrowth: 35.2,
      avgOrderValue: 50,
      engagement: 82,
      retention: 72,
    },
    trends: generateTrends(30, 80000, 90000),
  },
  'risacare': {
    company: 'risacare',
    companyName: 'RisaCare',
    period: 'June 2026',
    metrics: {
      totalUsers: 250000,
      activeUsers: 85000,
      newUsers: 8000,
      revenue: 15000000,
      revenueGrowth: 42.5,
      transactions: 125000,
      transactionGrowth: 55.2,
      avgOrderValue: 120,
      engagement: 85,
      retention: 78,
    },
    trends: generateTrends(30, 240000, 260000),
  },
  'corpperks': {
    company: 'corpperks',
    companyName: 'CorpPerks',
    period: 'June 2026',
    metrics: {
      totalUsers: 500000,
      activeUsers: 180000,
      newUsers: 15000,
      revenue: 35000000,
      revenueGrowth: 32.8,
      transactions: 450000,
      transactionGrowth: 45.2,
      avgOrderValue: 78,
      engagement: 75,
      retention: 70,
    },
    trends: generateTrends(30, 480000, 520000),
  },
  'hojai-ai': {
    company: 'hojai-ai',
    companyName: 'HOJAI AI',
    period: 'June 2026',
    metrics: {
      totalUsers: 15000,
      activeUsers: 8500,
      newUsers: 1200,
      revenue: 8500000,
      revenueGrowth: 125.5,
      transactions: 45000,
      transactionGrowth: 150.2,
      avgOrderValue: 189,
      engagement: 92,
      retention: 85,
    },
    trends: generateTrends(30, 14000, 16000),
  },
};

function generateTrends(days: number, baseValue: number, endValue: number): { date: string; value: number }[] {
  const trends: { date: string; value: number }[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const progress = i / (days - 1);
    const value = Math.round(baseValue + (endValue - baseValue) * progress * (0.9 + Math.random() * 0.2));
    trends.push({
      date: date.toISOString().split('T')[0],
      value,
    });
  }
  return trends;
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info([${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'unified-dashboard',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// API info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'RTNM Unified Dashboard',
    version: '1.0.0',
    port: PORT,
    description: 'Cross-company analytics and executive dashboard',
    endpoints: {
      health: 'GET /health',
      unified: {
        overview: 'GET /api/unified/overview',
        metrics: 'GET /api/unified/metrics',
        trends: 'GET /api/unified/trends',
        comparison: 'GET /api/unified/compare',
      },
      companies: {
        list: 'GET /api/companies',
        metrics: 'GET /api/companies/:company/metrics',
        trends: 'GET /api/companies/:company/trends',
      },
      insights: 'GET /api/insights',
      alerts: 'GET /api/alerts',
    },
  });
});

// ============== UNIFIED METRICS ==============

/**
 * GET /api/unified/overview - Get unified overview
 */
app.get('/api/unified/overview', (_req: Request, res: Response) => {
  const companies = Object.values(companyData);

  const unifiedMetrics: UnifiedMetrics = {
    totalUsers: companies.reduce((sum, c) => sum + c.metrics.totalUsers, 0),
    totalRevenue: companies.reduce((sum, c) => sum + c.metrics.revenue, 0),
    totalTransactions: companies.reduce((sum, c) => sum + c.metrics.transactions, 0),
    companyMetrics: companies,
    overallGrowth: companies.reduce((sum, c) => sum + c.metrics.revenueGrowth, 0) / companies.length,
    period: 'June 2026',
  };

  res.json({
    success: true,
    data: unifiedMetrics,
  });
});

/**
 * GET /api/unified/metrics - Get aggregated metrics
 */
app.get('/api/unified/metrics', (req: Request, res: Response) => {
  const { type } = req.query;

  const companies = Object.values(companyData);
  let metrics: Record<string, any> = {};

  switch (type) {
    case 'users':
      metrics = {
        totalUsers: companies.reduce((sum, c) => sum + c.metrics.totalUsers, 0),
        activeUsers: companies.reduce((sum, c) => sum + c.metrics.activeUsers, 0),
        newUsers: companies.reduce((sum, c) => sum + c.metrics.newUsers, 0),
        engagement: Math.round(companies.reduce((sum, c) => sum + c.metrics.engagement, 0) / companies.length),
        retention: Math.round(companies.reduce((sum, c) => sum + c.metrics.retention, 0) / companies.length),
      };
      break;
    case 'revenue':
      metrics = {
        totalRevenue: companies.reduce((sum, c) => sum + c.metrics.revenue, 0),
        avgGrowth: companies.reduce((sum, c) => sum + c.metrics.revenueGrowth, 0) / companies.length,
        topCompany: companies.sort((a, b) => b.metrics.revenue - a.metrics.revenue)[0]?.companyName,
      };
      break;
    case 'transactions':
      metrics = {
        totalTransactions: companies.reduce((sum, c) => sum + c.metrics.transactions, 0),
        avgGrowth: companies.reduce((sum, c) => sum + c.metrics.transactionGrowth, 0) / companies.length,
        avgOrderValue: Math.round(companies.reduce((sum, c) => sum + c.metrics.avgOrderValue, 0) / companies.length),
      };
      break;
    default:
      metrics = {
        totalUsers: companies.reduce((sum, c) => sum + c.metrics.totalUsers, 0),
        totalRevenue: companies.reduce((sum, c) => sum + c.metrics.revenue, 0),
        totalTransactions: companies.reduce((sum, c) => sum + c.metrics.transactions, 0),
        overallGrowth: companies.reduce((sum, c) => sum + c.metrics.revenueGrowth, 0) / companies.length,
      };
  }

  res.json({
    success: true,
    data: { metrics, period: 'June 2026' },
  });
});

/**
 * GET /api/unified/trends - Get cross-company trends
 */
app.get('/api/unified/trends', (req: Request, res: Response) => {
  const { days = '30' } = req.query;
  const numDays = parseInt(days as string);

  const companies = Object.values(companyData);

  // Aggregate trends across all companies
  const aggregatedTrends: { date: string; users: number; revenue: number }[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - numDays);

  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = companies.map(c => {
      const trend = c.trends.find(t => t.date === dateStr);
      return { company: c.company, value: trend?.value || 0 };
    });

    aggregatedTrends.push({
      date: dateStr,
      users: dayData.reduce((sum, d) => sum + d.value, 0),
      revenue: dayData.reduce((sum, d) => sum + d.value * 0.1, 0), // Simplified calculation
    });
  }

  res.json({
    success: true,
    data: { trends: aggregatedTrends, days: numDays },
  });
});

/**
 * GET /api/unified/compare - Compare companies
 */
app.get('/api/unified/compare', (req: Request, res: Response) => {
  const companies = Object.values(companyData);

  // Calculate rankings
  const rankings = {
    byUsers: [...companies].sort((a, b) => b.metrics.totalUsers - a.metrics.totalUsers),
    byRevenue: [...companies].sort((a, b) => b.metrics.revenue - a.metrics.revenue),
    byGrowth: [...companies].sort((a, b) => b.metrics.revenueGrowth - a.metrics.revenueGrowth),
    byEngagement: [...companies].sort((a, b) => b.metrics.engagement - a.metrics.engagement),
    byRetention: [...companies].sort((a, b) => b.metrics.retention - a.metrics.retention),
  };

  res.json({
    success: true,
    data: {
      rankings: {
        users: rankings.byUsers.map((c, i) => ({ rank: i + 1, company: c.companyName, value: c.metrics.totalUsers })),
        revenue: rankings.byRevenue.map((c, i) => ({ rank: i + 1, company: c.companyName, value: c.metrics.revenue })),
        growth: rankings.byGrowth.map((c, i) => ({ rank: i + 1, company: c.companyName, value: c.metrics.revenueGrowth })),
        engagement: rankings.byEngagement.map((c, i) => ({ rank: i + 1, company: c.companyName, value: c.metrics.engagement })),
        retention: rankings.byRetention.map((c, i) => ({ rank: i + 1, company: c.companyName, value: c.metrics.retention })),
      },
    },
  });
});

// ============== COMPANY-SPECIFIC ==============

/**
 * GET /api/companies - List all companies
 */
app.get('/api/companies', (_req: Request, res: Response) => {
  const companies = Object.values(companyData).map(c => ({
    company: c.company,
    companyName: c.companyName,
    period: c.period,
  }));

  res.json({
    success: true,
    data: { companies, count: companies.length },
  });
});

/**
 * GET /api/companies/:company/metrics - Get company metrics
 */
app.get('/api/companies/:company/metrics', (req: Request, res: Response) => {
  const { company } = req.params;
  const data = companyData[company as Company];

  if (!data) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Company not found' },
    });
  }

  res.json({
    success: true,
    data,
  });
});

/**
 * GET /api/companies/:company/trends - Get company trends
 */
app.get('/api/companies/:company/trends', (req: Request, res: Response) => {
  const { company } = req.params;
  const { days = '30' } = req.query;
  const data = companyData[company as Company];

  if (!data) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Company not found' },
    });
  }

  const numDays = parseInt(days as string);
  const trends = data.trends.slice(-numDays);

  res.json({
    success: true,
    data: { trends, company: data.companyName, days: numDays },
  });
});

// ============== INSIGHTS ==============

/**
 * GET /api/insights - Get AI-generated insights
 */
app.get('/api/insights', (_req: Request, res: Response) => {
  const companies = Object.values(companyData);

  const insights = [
    {
      id: uuidv4(),
      type: 'growth',
      priority: 'high',
      title: 'HOJAI AI leads growth',
      description: 'HOJAI AI shows 125% revenue growth, highest across all companies. Consider investing in AI expansion.',
      company: 'hojai-ai',
      metric: 125.5,
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      type: 'opportunity',
      priority: 'medium',
      title: 'RisaCare engagement highest',
      description: 'RisaCare has 85% engagement rate, indicating strong user satisfaction. Apply learnings to other platforms.',
      company: 'risacare',
      metric: 85,
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      type: 'warning',
      priority: 'low',
      title: 'REZ Consumer retention below average',
      description: 'REZ Consumer retention at 65%, below group average of 74%. Consider loyalty program improvements.',
      company: 'rez-consumer',
      metric: 65,
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      type: 'success',
      priority: 'medium',
      title: 'RisaCare fastest growing healthcare',
      description: '42.5% revenue growth in healthcare vertical. Market expansion opportunities.',
      company: 'risacare',
      metric: 42.5,
      createdAt: new Date(),
    },
  ];

  res.json({
    success: true,
    data: { insights, count: insights.length },
  });
});

/**
 * GET /api/alerts - Get alerts
 */
app.get('/api/alerts', (_req: Request, res: Response) => {
  const alerts = [
    {
      id: uuidv4(),
      type: 'threshold',
      severity: 'info',
      title: 'Revenue target on track',
      description: 'Overall revenue growth at 49% vs target of 45%.',
      createdAt: new Date(),
    },
    {
      id: uuidv4(),
      type: 'anomaly',
      severity: 'warning',
      title: 'REZ Consumer new user decline',
      description: 'New user growth slowed by 15% this week. Investigate.',
      company: 'rez-consumer',
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: uuidv4(),
      type: 'milestone',
      severity: 'success',
      title: '2M total users milestone',
      description: 'Combined user base crossed 2 million across all platforms.',
      createdAt: new Date(Date.now() - 172800000),
    },
  ];

  res.json({
    success: true,
    data: { alerts, count: alerts.length },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error([ERROR] ${err.message}`);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(
╔═══════════════════════════════════════════════════════════╗
║       RTNM Unified Dashboard Service              ║
╠═══════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                ║
║  Port:       ${PORT.toString().padEnd(43)}║
║  Version:    1.0.0                               ║
╠═══════════════════════════════════════════════════════════╣
║  Companies:                                        ║
║    - REZ Consumer (1.25M users)                 ║
║    - REZ Merchant (85K merchants)                ║
║    - RisaCare (250K users)                       ║
║    - CorpPerks (500K users)                     ║
║    - HOJAI AI (15K users)                       ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app };
