const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4933;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// In-memory stores
// ============================================================
const insights = new Map([
  ['ins-001', {
    id: 'ins-001',
    title: 'Q4 Revenue Growth',
    summary: 'Revenue up 15% this quarter driven by enterprise expansion',
    category: 'revenue',
    kpis: { revenue: '+15%', customers: '+8%', churn: '-2%' },
    recommendations: ['Expand to new markets', 'Invest in retention'],
    createdAt: new Date().toISOString(),
    confidence: 0.92
  }],
  ['ins-002', {
    id: 'ins-002',
    title: 'Customer Acquisition Cost Rising',
    summary: 'CAC increased 12% while LTV held steady',
    category: 'marketing',
    kpis: { cac: '+12%', ltv: '0%', payback_months: '+1.5' },
    recommendations: ['Optimize ad targeting', 'Improve conversion funnel'],
    createdAt: new Date().toISOString(),
    confidence: 0.87
  }]
]);

const decisions = new Map([
  ['dec-001', {
    id: 'dec-001',
    title: 'Enter European market Q2 2027',
    scenario: 'International expansion',
    impact: 'high',
    risks: ['Market risk', 'Regulatory compliance', 'Resource constraints'],
    opportunities: ['New revenue stream', 'Brand expansion'],
    recommendation: 'Proceed with phased rollout starting in UK and Germany',
    status: 'pending',
    createdAt: new Date().toISOString()
  }]
]);

const reports = new PersistentMap('reports', { serviceName: 'executive-copilot' });
const strategies = new Map([
  ['strat-1', { id: 'strat-1', name: 'Customer Success Focus', pillar: 'retention', status: 'active', progress: 65 }],
  ['strat-2', { id: 'strat-2', name: 'AI Product Suite', pillar: 'product', status: 'active', progress: 40 }]
]);

const kpis = new Map([
  ['revenue', { id: 'revenue', name: 'Monthly Revenue', value: 2500000, target: 3000000, unit: 'USD', trend: 'up', change: 0.15 }],
  ['customers', { id: 'customers', name: 'Active Customers', value: 1250, target: 1500, unit: 'count', trend: 'up', change: 0.08 }],
  ['nps', { id: 'nps', name: 'Net Promoter Score', value: 72, target: 80, unit: 'score', trend: 'flat', change: 0.02 }]
]);

const competitors = new Map([
  ['comp-1', { id: 'comp-1', name: 'Competitor A', marketShare: 0.32, growth: 0.18, strengths: ['Brand', 'Distribution'], weaknesses: ['Innovation', 'Pricing'] }],
  ['comp-2', { id: 'comp-2', name: 'Competitor B', marketShare: 0.21, growth: 0.12, strengths: ['Technology'], weaknesses: ['Customer service'] }]
]);

// ============================================================
// Health & Info
// ============================================================
app.get('/health', (req, res) => res.json({
  status: 'healthy',
  service: 'executive-copilot',
  version: '1.0.0',
  port: PORT,
  counts: { insights: insights.size, decisions: decisions.size, reports: reports.size, strategies: strategies.size, kpis: kpis.size, competitors: competitors.size },
  timestamp: new Date().toISOString()
}));

app.get('/', (req, res) => res.json({
  service: 'Executive Copilot',
  version: '1.0.0',
  port: PORT,
  status: 'running',
  capabilities: [
    '/api/insights - List AI-generated insights',
    '/api/insights/generate - Generate new insight',
    '/api/insights/:id - Get insight details',
    '/api/decisions - List strategic decisions',
    '/api/decisions/analyze - Analyze a decision',
    '/api/decisions/:id - Get decision',
    '/api/reports - List executive reports',
    '/api/reports/executive - Generate executive report',
    '/api/strategies - List strategic initiatives',
    '/api/strategies/:id - Update strategy',
    '/api/kpis - List KPIs',
    '/api/kpis/:id - Get KPI',
    '/api/competitors - List competitors',
    '/api/competitors/:id - Get competitor',
    '/api/dashboard - Get executive dashboard data',
    '/api/briefing - Get daily executive briefing',
    '/api/scenarios - List scenario analyses',
    '/api/scenarios/simulate - Run scenario simulation'
  ]
}));

// ============================================================
// Insights
// ============================================================
app.get('/api/insights', (req, res) => {
  const { category } = req.query;
  let results = Array.from(insights.values());
  if (category) results = results.filter(i => i.category === category);
  res.json({ insights: results, count: results.length });
});

app.get('/api/insights/:id', (req, res) => {
  const insight = insights.get(req.params.id);
  if (!insight) return res.status(404).json({ error: 'Insight not found' });
  res.json(insight);
});

app.post('/api/insights/generate',requireAuth,  (req, res) => {
  const { topic, timeRange } = req.body;
  const id = `ins-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const insight = {
    id,
    title: `AI Insight: ${topic || 'Performance Analysis'}`,
    summary: `Generated analysis for ${topic} over ${timeRange || 'last 30 days'}`,
    category: 'generated',
    kpis: { metric1: '+10%', metric2: '+5%' },
    recommendations: ['Continue current strategy', 'Monitor key metrics'],
    createdAt: new Date().toISOString(),
    confidence: 0.85
  };
  insights.set(id, insight);
  res.status(201).json(insight);
});

app.post('/api/insights',requireAuth,  (req, res) => {
  // Quick insight endpoint
  res.json({
    id: uuidv4(),
    summary: 'Revenue up 15% this quarter',
    kpis: { revenue: '+15%', customers: '+8%', churn: '-2%' },
    recommendations: ['Expand to new markets', 'Invest in retention']
  });
});

// ============================================================
// Decisions
// ============================================================
app.get('/api/decisions', (req, res) => {
  res.json({ decisions: Array.from(decisions.values()), count: decisions.size });
});

app.get('/api/decisions/:id', (req, res) => {
  const decision = decisions.get(req.params.id);
  if (!decision) return res.status(404).json({ error: 'Decision not found' });
  res.json(decision);
});

app.post('/api/decisions/analyze',requireAuth,  async (req, res) => {
  const { scenario, context, autoCreateGoal } = req.body;
  if (!scenario) return res.status(400).json({ error: 'scenario is required' });

  const decision = {
    id: uuidv4(),
    scenario,
    context: context || {},
    impact: 'high',
    risks: ['Market risk', 'Resource constraint', 'Execution risk'],
    opportunities: ['New revenue', 'Strategic positioning'],
    recommendation: 'Proceed with caution - phased approach recommended',
    confidence: 0.78,
    estimatedROI: '15-25% over 18 months',
    createdAt: new Date().toISOString()
  };

  // Phase A: when autoCreateGoal is true and impact is high/medium, create a goal in goal-os.
  // goal-os then emits `goal.created` to event-bus, which kicks off the wiring chain.
  let goalResult = null;
  if (autoCreateGoal && (decision.impact === 'high' || decision.impact === 'medium')) {
    try {
      const goalOsUrl = process.env.GOAL_OS_URL || 'http://localhost:4242';
      const ownerCorpId = (context && context.ownerCorpId) || 'demo-business-001';
      const r = await fetch(`${goalOsUrl}/api/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Decision: ${scenario.slice(0, 80)}`,
          description: `Auto-created from high-impact decision: ${decision.recommendation}`,
          ownerCorpId,
          category: 'business',
          level: 'goal',
          priority: decision.impact === 'high' ? 'high' : 'medium',
          metrics: { decisionId: decision.id, confidence: decision.confidence, estimatedROI: decision.estimatedROI },
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) goalResult = await r.json();
      else console.warn('[executive-copilot] goal create failed:', r.status);
    } catch (err) {
      console.warn('[executive-copilot] goal create error:', err.message);
    }
  }

  res.json({ ...decision, goal: goalResult });
});

app.post('/api/decisions',requireAuth,  (req, res) => {
  const { title, scenario } = req.body;
  if (!title || !scenario) return res.status(400).json({ error: 'title and scenario required' });
  const id = `dec-${Date.now()}`;
  const decision = {
    id,
    title,
    scenario,
    impact: 'medium',
    status: 'pending',
    risks: [],
    opportunities: [],
    createdAt: new Date().toISOString()
  };
  decisions.set(id, decision);
  res.status(201).json(decision);
});

// ============================================================
// Reports
// ============================================================
app.get('/api/reports', (req, res) => {
  res.json({ reports: Array.from(reports.values()), count: reports.size });
});

app.post('/api/reports/executive',requireAuth,  (req, res) => {
  const { period, audience } = req.body;
  const id = `rep-${Date.now()}`;
  const report = {
    id,
    period: period || 'Q4 2026',
    audience: audience || 'board',
    revenue: 5000000,
    costs: 3000000,
    profit: 2000000,
    margin: 0.4,
    metrics: {
      nps: 72,
      satisfaction: 4.5,
      retention: 0.92,
      cac: 1200,
      ltv: 15000
    },
    kpis: Array.from(kpis.values()),
    topInsights: Array.from(insights.values()).slice(0, 3),
    createdAt: new Date().toISOString()
  };
  reports.set(id, report);
  res.status(201).json(report);
});

// ============================================================
// Strategies
// ============================================================
app.get('/api/strategies', (req, res) => {
  res.json({ strategies: Array.from(strategies.values()) });
});

app.get('/api/strategies/:id', (req, res) => {
  const strategy = strategies.get(req.params.id);
  if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
  res.json(strategy);
});

app.patch('/api/strategies/:id',requireAuth,  (req, res) => {
  const strategy = strategies.get(req.params.id);
  if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
  const { progress, status, name } = req.body;
  if (progress !== undefined) strategy.progress = progress;
  if (status) strategy.status = status;
  if (name) strategy.name = name;
  strategy.updatedAt = new Date().toISOString();
  res.json(strategy);
});

// ============================================================
// KPIs
// ============================================================
app.get('/api/kpis', (req, res) => {
  res.json({ kpis: Array.from(kpis.values()) });
});

app.get('/api/kpis/:id', (req, res) => {
  const kpi = kpis.get(req.params.id);
  if (!kpi) return res.status(404).json({ error: 'KPI not found' });
  res.json(kpi);
});

app.patch('/api/kpis/:id',requireAuth,  (req, res) => {
  const kpi = kpis.get(req.params.id);
  if (!kpi) return res.status(404).json({ error: 'KPI not found' });
  const { value, target } = req.body;
  if (value !== undefined) kpi.value = value;
  if (target !== undefined) kpi.target = target;
  res.json(kpi);
});

// ============================================================
// Competitors
// ============================================================
app.get('/api/competitors', (req, res) => {
  res.json({ competitors: Array.from(competitors.values()) });
});

app.get('/api/competitors/:id', (req, res) => {
  const comp = competitors.get(req.params.id);
  if (!comp) return res.status(404).json({ error: 'Competitor not found' });
  res.json(comp);
});

// ============================================================
// Dashboard
// ============================================================
app.get('/api/dashboard', (req, res) => {
  res.json({
    kpis: Array.from(kpis.values()),
    topInsights: Array.from(insights.values()).slice(0, 5),
    strategies: Array.from(strategies.values()),
    openDecisions: Array.from(decisions.values()).filter(d => d.status === 'pending'),
    competitors: Array.from(competitors.values()),
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// Daily Briefing
// ============================================================
app.get('/api/briefing', (req, res) => {
  res.json({
    date: new Date().toISOString().split('T')[0],
    greeting: 'Good morning!',
    summary: 'Revenue is on track. Customer satisfaction at all-time high. 3 strategic decisions need your input.',
    keyPoints: [
      'Revenue up 15% QoQ',
      'New customer acquisition up 8%',
      '3 pending decisions require review',
      'Q4 strategy at 65% completion'
    ],
    actionItems: [
      { id: 'act-1', task: 'Review European expansion decision', priority: 'high' },
      { id: 'act-2', task: 'Approve Q1 marketing budget', priority: 'medium' }
    ],
    topInsight: Array.from(insights.values())[0]
  });
});

// ============================================================
// Scenarios
// ============================================================
app.get('/api/scenarios', (req, res) => {
  res.json({
    scenarios: [
      { id: 'sc-1', name: 'Conservative growth', assumptions: 'CAC stable, conversion +5%', projectedRevenue: 2800000, probability: 0.6 },
      { id: 'sc-2', name: 'Aggressive expansion', assumptions: 'CAC +20%, conversion +15%', projectedRevenue: 3500000, probability: 0.3 }
    ]
  });
});

app.post('/api/scenarios/simulate',requireAuth,  (req, res) => {
  const { assumptions } = req.body;
  res.json({
    id: uuidv4(),
    name: 'Custom Scenario',
    assumptions: assumptions || {},
    projectedRevenue: 3000000,
    projectedCosts: 1800000,
    projectedProfit: 1200000,
    breakEvenMonths: 14,
    risks: ['Market volatility', 'Execution risk'],
    confidence: 0.75,
    createdAt: new Date().toISOString()
  });
});

// ============================================================
// Error handler
// ============================================================
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => console.log(`👔 Executive Copilot running on port ${PORT}`));
installGracefulShutdown(server);
