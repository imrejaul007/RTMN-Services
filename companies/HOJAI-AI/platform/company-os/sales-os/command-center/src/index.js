/**
 * Sales Command Center - SalesOS
 *
 * Executive dashboards and AI insights:
 * - CEO Dashboard
 * - CRO Dashboard
 * - AI Insights
 * - KPI Alerts
 *
 * Port: 5068
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5068;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sales Command Center',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// CEO DASHBOARD
// ============================================================

app.get('/ceo', async (req, res) => {
  const dashboard = {
    revenue: {
      arr: 12500000,
      mrr: 1041667,
      growth: 23.5,
      target: 15000000,
      attainment: 83.3,
      newARR: 1800000,
      expansionARR: 450000,
      churnARR: 280000,
    },
    customers: {
      total: 342,
      new: 28,
      churned: 3,
      expansion: 12,
      nrr: 108,
    },
    pipeline: {
      value: 45000000,
      coverage: 3.6,
      expected: 18000000,
      weighted: 19500000,
    },
    team: {
      reps: 24,
      quotaAttainment: 78,
      avgCycle: 45,
      avgDealSize: 125000,
    },
    efficiency: {
      cac: 25000,
      ltv: 85000,
      ltvCacRatio: 3.4,
      paybackPeriod: 8,
      grossMargin: 72,
    },
    alerts: [
      { type: 'warning', priority: 'high', message: '3 deals at risk in North region', action: 'review' },
      { type: 'opportunity', priority: 'medium', message: 'Healthcare vertical growing 23%', action: 'expand' },
    ],
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, dashboard });
});

// ============================================================
// CRO DASHBOARD
// ============================================================

app.get('/cro', async (req, res) => {
  const dashboard = {
    forecast: {
      commit: 12500000,
      bestCase: 15000000,
      pipeline: 45000000,
      weighted: 19500000,
      accuracy: 87,
      trend: 'improving',
    },
    pipeline: {
      total: 45000000,
      stages: {
        discovery: { count: 45, value: 5000000, avgDays: 8 },
        qualification: { count: 32, value: 8000000, avgDays: 12 },
        proposal: { count: 18, value: 12000000, avgDays: 18 },
        negotiation: { count: 8, value: 15000000, avgDays: 25 },
        closed: { count: 12, value: 5000000, avgDays: 0 },
      },
    },
    quotas: {
      attainment: 78,
      onTrack: 15,
      atRisk: 6,
      behind: 3,
      leaders: [
        { name: 'Rahul S', quota: 500000, attainment: 112, rank: 1 },
        { name: 'Priya M', quota: 500000, attainment: 98, rank: 2 },
        { name: 'Amit K', quota: 500000, attainment: 87, rank: 3 },
      ],
    },
    territories: [
      { name: 'North', arr: 3200000, target: 4000000, attainment: 80, reps: 6 },
      { name: 'South', arr: 2800000, target: 3000000, attainment: 93, reps: 5 },
      { name: 'East', arr: 3500000, target: 4000000, attainment: 87.5, reps: 6 },
      { name: 'West', arr: 3000000, target: 4000000, attainment: 75, reps: 7 },
    ],
    coaching: {
      dealsNeedingReview: 8,
      atRiskDeals: 5,
      championMissing: 12,
    },
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, dashboard });
});

// ============================================================
// MANAGER DASHBOARD
// ============================================================

app.get('/manager/:id', async (req, res) => {
  const { id } = req.params;

  const dashboard = {
    manager: { id, name: 'Sales Manager' },
    team: {
      size: 6,
      quota: 3000000,
      attainment: 82,
      reps: [
        { id: 'SR001', name: 'Rahul S', quota: 500000, attainment: 112, deals: 8, pipeline: 450000 },
        { id: 'SR002', name: 'Priya M', quota: 500000, attainment: 98, deals: 7, pipeline: 380000 },
        { id: 'SR003', name: 'Amit K', quota: 500000, attainment: 87, deals: 6, pipeline: 320000 },
        { id: 'SR004', name: 'Sneha R', quota: 500000, attainment: 75, deals: 5, pipeline: 290000 },
        { id: 'SR005', name: 'Vikram S', quota: 500000, attainment: 62, deals: 4, pipeline: 250000 },
        { id: 'SR006', name: 'Neha G', quota: 500000, attainment: 58, deals: 3, pipeline: 180000 },
      ],
    },
    activities: {
      callsToday: 24,
      meetingsToday: 8,
      emailsSent: 156,
      followups: 45,
    },
    coaching: {
      needingReview: 3,
      objections: 5,
      newDeals: 2,
    },
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, dashboard });
});

// ============================================================
// AI INSIGHTS
// ============================================================

app.get('/insights', async (req, res) => {
  const { limit = 10 } = req.query;

  const insights = [
    {
      type: 'warning',
      category: 'pipeline',
      title: 'At-Risk Deals',
      description: '5 deals with health score below 40 in Enterprise segment',
      impact: '$2.3M at risk',
      affectedDeals: 5,
      recommendedAction: 'Schedule immediate deal reviews with team leads',
      priority: 'high',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'opportunity',
      category: 'expansion',
      title: 'Expansion Ready Accounts',
      description: '12 customers with expansion probability above 70%',
      impact: '$1.8M potential ARR',
      recommendedAction: 'Launch expansion outreach campaign',
      priority: 'medium',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'trend',
      category: 'velocity',
      title: 'Sales Cycle Lengthening',
      description: 'Average cycle increased from 38 to 45 days',
      impact: 'Q3 targets at risk',
      recommendedAction: 'Investigate procurement bottlenecks',
      priority: 'high',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'win',
      category: 'competitor',
      title: 'Competitor Displacement',
      description: 'Won 8 deals against Salesforce this quarter',
      impact: '$3.2M ARR',
      recommendedAction: 'Document winning playbook',
      priority: 'medium',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'warning',
      category: 'team',
      title: 'New Rep Ramp',
      description: '3 reps below 50% quota attainment in first 90 days',
      impact: '$450K pipeline risk',
      recommendedAction: 'Assign mentors and intensive coaching',
      priority: 'medium',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'opportunity',
      category: 'territory',
      title: 'West Territory Gap',
      description: 'West region 15% below target with highest potential',
      impact: '$500K gap',
      recommendedAction: 'Add dedicated SDR or redistribute accounts',
      priority: 'high',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'trend',
      category: 'product',
      title: 'Analytics Feature Adoption',
      description: 'Customers using analytics have 34% lower churn',
      impact: 'Use as retention lever',
      recommendedAction: 'Push analytics onboarding in Q3',
      priority: 'low',
      timestamp: new Date().toISOString(),
    },
  ];

  res.json({ success: true, count: insights.length, insights: insights.slice(0, Number(limit)) });
});

app.get('/insights/summary', async (req, res) => {
  const summary = {
    total: 7,
    byType: { warning: 3, opportunity: 3, trend: 1, win: 1 },
    byPriority: { high: 3, medium: 3, low: 1 },
    totalImpact: { atRisk: '$2.3M', opportunity: '$5.3M' },
    lastUpdated: new Date().toISOString(),
  };

  res.json({ success: true, summary });
});

// ============================================================
// KPI METRICS
// ============================================================

app.get('/kpis', async (req, res) => {
  const kpis = {
    revenue: [
      { name: 'ARR', value: 12500000, target: 15000000, unit: 'INR' },
      { name: 'MRR', value: 1041667, target: 1250000, unit: 'INR' },
      { name: 'Growth Rate', value: 23.5, target: 30, unit: '%' },
      { name: 'NRR', value: 108, target: 110, unit: '%' },
    ],
    pipeline: [
      { name: 'Pipeline Value', value: 45000000, target: 50000000, unit: 'INR' },
      { name: 'Coverage Ratio', value: 3.6, target: 4, unit: 'x' },
      { name: 'Win Rate', value: 28, target: 30, unit: '%' },
      { name: 'Avg Deal Size', value: 125000, target: 150000, unit: 'INR' },
    ],
    efficiency: [
      { name: 'Sales Cycle', value: 45, target: 38, unit: 'days' },
      { name: 'Quota Attainment', value: 78, target: 100, unit: '%' },
      { name: 'LTV:CAC', value: 3.4, target: 4, unit: 'x' },
      { name: 'Payback Period', value: 8, target: 6, unit: 'months' },
    ],
    customer: [
      { name: 'Total Customers', value: 342, target: 400, unit: '' },
      { name: 'Churn Rate', value: 3.2, target: 2, unit: '%' },
      { name: 'NPS', value: 72, target: 80, unit: '' },
      { name: 'CSAT', value: 4.2, target: 4.5, unit: '/5' },
    ],
  };

  res.json({ success: true, kpis });
});

// ============================================================
// ALERTS
// ============================================================

app.get('/alerts', async (req, res) => {
  const { priority, type, limit = 20 } = req.query;

  let alerts = [
    { id: 1, priority: 'critical', type: 'deal_lost', message: 'Deal OPP001 lost to Salesforce', timestamp: new Date() },
    { id: 2, priority: 'high', type: 'churn_risk', message: 'Customer CUS003 churn risk above 80%', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 3, priority: 'high', type: 'quota_miss', message: 'SR006 below 60% quota attainment', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { id: 4, priority: 'medium', type: 'renewal', message: '3 renewals due in 30 days', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    { id: 5, priority: 'medium', type: 'opportunity', message: 'Healthcare expansion opportunity identified', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  ];

  if (priority) alerts = alerts.filter(a => a.priority === priority);
  if (type) alerts = alerts.filter(a => a.type === type);

  res.json({ success: true, count: alerts.length, alerts: alerts.slice(0, Number(limit)) });
});

app.post('/alerts/:id/acknowledge', (req, res) => {
  res.json({ success: true, message: 'Alert acknowledged' });
});

// ============================================================
// TRENDS
// ============================================================

app.get('/trends', async (req, res) => {
  const { period = '30d' } = req.query;

  const trends = {
    period,
    revenue: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      actual: [8500000, 9200000, 9800000, 10500000, 11200000, 12500000],
      target: [9000000, 9500000, 10000000, 11000000, 12000000, 15000000],
    },
    pipeline: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [35000000, 38000000, 40000000, 42000000, 44000000, 45000000],
    },
    winRate: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [25, 26, 27, 28, 28, 28],
    },
    salesCycle: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [42, 43, 44, 44, 45, 45],
    },
  };

  res.json({ success: true, trends });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║      Sales Command Center - SalesOS v1.0        ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Dashboards: CEO, CRO, Manager               ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
