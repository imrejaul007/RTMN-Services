/**
 * RTMN Revenue Intelligence OS v1.0
 * The AI Revenue Department
 * Port: 5400
 *
 * Modular Architecture with:
 * - Revenue Hub Module
 * - Demand Intelligence Module
 * - Pricing Intelligence Module
 * - Promotion Management Module
 * - RevOps Intelligence Module
 * - Cohort Analysis Module
 * - Revenue Digital Twin Module
 * - 12 AI Revenue Agents
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import modules
import { RevenueHub } from './modules/revenueHub.js';
import { DemandIntelligence } from './modules/demandIntelligence.js';
import { PricingIntelligence } from './modules/pricingIntelligence.js';
import { PromotionManagement } from './modules/promotionManagement.js';
import { RevOpsIntelligence } from './modules/revopsIntelligence.js';
import { CohortAnalysis } from './modules/cohortAnalysis.js';
import { RevenueTwin } from './modules/revenueTwin.js';

// Import AI Agents
import {
  AICROAgent,
  DemandForecasterAgent,
  PricingOptimizerAgent,
  ChurnPredictorAgent,
  ExpansionAdvisorAgent,
  AnomalyDetectorAgent,
  CohortAnalystAgent,
  ScenarioPlannerAgent,
} from './agents/aiAgents.js';

// Import Bridges
import { BridgeManager } from './bridges/connectors.js';

// Import utilities
import { formatCurrency, formatNumber } from './utils/helpers.js';

const PORT = process.env.PORT || 5400;
const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// ============================================================
// DATABASE - In-Memory Store
// ============================================================

const db = {
  // Revenue streams
  revenueStreams: new Map(),
  revenueSnapshots: new Map(),
  revenueForecasts: new Map(),
  revenueAnomalies: new Map(),

  // Demand intelligence
  demandSignals: new Map(),
  demandForecasts: new Map(),
  seasonalityPatterns: new Map(),
  trendAnalysis: new Map(),

  // Pricing intelligence
  pricingRules: new Map(),
  priceHistory: new Map(),
  competitorPrices: new Map(),
  priceSensitivity: new Map(),

  // Promotion intelligence
  promotions: new Map(),
  promotionResults: new Map(),
  attributionModels: new Map(),
  budgetAllocations: new Map(),

  // RevOps
  pipelineRevenue: new Map(),
  expansionTracker: new Map(),
  churnRevenue: new Map(),
  winLossAnalysis: new Map(),

  // Cohort analysis
  cohorts: new Map(),
  cohortMetrics: new Map(),
  ltvPredictions: new Map(),

  // Revenue twin
  revenueTwins: new Map(),
  scenarios: new Map(),

  // AI agents
  aiAgents: new Map(),
  insights: new Map(),
  recommendations: new Map(),
};

// ============================================================
// INITIALIZE MODULES
// ============================================================

const revenueHub = new RevenueHub(db);
const demandIntelligence = new DemandIntelligence(db);
const pricingIntelligence = new PricingIntelligence(db);
const promotionManagement = new PromotionManagement(db);
const revOpsIntelligence = new RevOpsIntelligence(db);
const cohortAnalysis = new CohortAnalysis(db);
const revenueTwin = new RevenueTwin(db);

// Initialize AI Agents
const agents = {
  cro: new AICROAgent(db),
  demandForecaster: new DemandForecasterAgent(db),
  pricingOptimizer: new PricingOptimizerAgent(db),
  churnPredictor: new ChurnPredictorAgent(db),
  expansionAdvisor: new ExpansionAdvisorAgent(db),
  anomalyDetector: new AnomalyDetectorAgent(db),
  cohortAnalyst: new CohortAnalystAgent(db),
  scenarioPlanner: new ScenarioPlannerAgent(db),
};

// Initialize Bridge Manager
const bridgeManager = new BridgeManager();

// Register agents
Object.entries(agents).forEach(([key, agent]) => {
  db.aiAgents.set(key, {
    id: agent.id,
    name: agent.name,
    accuracy: agent.accuracy,
    tasks: 0,
    status: 'active',
  });
});

// ============================================================
// CONNECTED SERVICES
// ============================================================

const CONNECTED_SERVICES = {
  salesOS: { port: 5055, name: 'Sales OS', status: 'unknown' },
  financeOS: { port: 4801, name: 'Finance OS', status: 'unknown' },
  marketingOS: { port: 5500, name: 'Marketing OS', status: 'unknown' },
  operationsOS: { port: 5250, name: 'Operations OS', status: 'unknown' },
  cxoOS: { port: 5100, name: 'CXO OS', status: 'unknown' },
};

// ============================================================
// INITIALIZE SAMPLE DATA
// ============================================================

function initData() {
  // Revenue streams
  const revenueStreams = [
    { id: 'REV001', source: 'subscription', amount: 8500000, currency: 'USD', period: 'monthly', growth: 8.5, status: 'active', lastUpdated: new Date().toISOString() },
    { id: 'REV002', source: 'one-time', amount: 1200000, currency: 'USD', period: 'monthly', growth: 3.2, status: 'active', lastUpdated: new Date().toISOString() },
    { id: 'REV003', source: 'usage', amount: 450000, currency: 'USD', period: 'monthly', growth: 15.8, status: 'active', lastUpdated: new Date().toISOString() },
    { id: 'REV004', source: 'services', amount: 780000, currency: 'USD', period: 'monthly', growth: 5.1, status: 'active', lastUpdated: new Date().toISOString() },
    { id: 'REV005', source: 'marketplace', amount: 320000, currency: 'USD', period: 'monthly', growth: 22.4, status: 'active', lastUpdated: new Date().toISOString() },
  ];
  revenueStreams.forEach(r => db.revenueStreams.set(r.id, r));

  // Revenue snapshots (historical)
  const snapshots = [];
  for (let i = 12; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    snapshots.push({
      id: `SNAP${String(i).padStart(3, '0')}`,
      month: date.toISOString().slice(0, 7),
      totalRevenue: 10000000 + (Math.random() * 2000000) + (i * 150000),
      mrr: 7500000 + (i * 50000),
      arr: 90000000 + (i * 600000),
      newRevenue: 800000 + (i * 20000),
      expansionRevenue: 400000 + (i * 15000),
      churnRevenue: 200000 - (i * 5000),
      netNewRevenue: 1000000 + (i * 35000),
    });
  }
  snapshots.forEach(s => db.revenueSnapshots.set(s.id, s));

  // Demand signals
  const demandSignals = [
    { id: 'SIG001', type: 'organic', source: 'SEO', volume: 45000, conversionRate: 3.2, trend: 'up', updatedAt: new Date().toISOString() },
    { id: 'SIG002', type: 'paid', source: 'Google Ads', volume: 25000, conversionRate: 4.1, trend: 'stable', updatedAt: new Date().toISOString() },
    { id: 'SIG003', type: 'organic', source: 'Social Media', volume: 18000, conversionRate: 2.8, trend: 'up', updatedAt: new Date().toISOString() },
    { id: 'SIG004', type: 'referral', source: 'Partners', volume: 8500, conversionRate: 8.5, trend: 'up', updatedAt: new Date().toISOString() },
    { id: 'SIG005', type: 'inbound', source: 'Content', volume: 12000, conversionRate: 3.5, trend: 'stable', updatedAt: new Date().toISOString() },
  ];
  demandSignals.forEach(s => db.demandSignals.set(s.id, s));

  // Pricing rules
  const pricingRules = [
    { id: 'PRC001', product: 'Enterprise', basePrice: 50000, currency: 'USD', unit: 'month', margin: 65, status: 'active', updatedAt: new Date().toISOString() },
    { id: 'PRC002', product: 'Professional', basePrice: 20000, currency: 'USD', unit: 'month', margin: 60, status: 'active', updatedAt: new Date().toISOString() },
    { id: 'PRC003', product: 'Starter', basePrice: 5000, currency: 'USD', unit: 'month', margin: 70, status: 'active', updatedAt: new Date().toISOString() },
    { id: 'PRC004', product: 'Add-on Analytics', basePrice: 5000, currency: 'USD', unit: 'month', margin: 80, status: 'active', updatedAt: new Date().toISOString() },
    { id: 'PRC005', product: 'Add-on Support', basePrice: 3000, currency: 'USD', unit: 'month', margin: 75, status: 'active', updatedAt: new Date().toISOString() },
  ];
  pricingRules.forEach(p => db.pricingRules.set(p.id, p));

  // Promotions
  const promotions = [
    { id: 'PROM001', name: 'Summer Sale', type: 'discount', discount: 20, status: 'active', startDate: '2026-06-01', endDate: '2026-08-31', budget: 500000, revenue: 850000, roi: 170 },
    { id: 'PROM002', name: 'Enterprise Bundle', type: 'bundle', discount: 15, status: 'active', startDate: '2026-05-01', endDate: '2026-12-31', budget: 300000, revenue: 1200000, roi: 400 },
    { id: 'PROM003', name: 'Referral Bonus', type: 'referral', incentive: 5000, status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', budget: 200000, revenue: 600000, roi: 300 },
    { id: 'PROM004', name: 'Early Bird Q3', type: 'discount', discount: 25, status: 'planned', startDate: '2026-07-01', endDate: '2026-09-30', budget: 400000, projectedRevenue: 950000, roi: 237 },
  ];
  promotions.forEach(p => db.promotions.set(p.id, p));

  // Cohorts
  const cohorts = [
    { id: 'COH001', name: 'Q1-2025 Enterprise', segment: 'Enterprise', quarter: 'Q1-2025', customers: 45, mrr: 2250000, ltv: 27000000, churnRate: 5.2, expansionRate: 18.5 },
    { id: 'COH002', name: 'Q1-2025 Professional', segment: 'Professional', quarter: 'Q1-2025', customers: 120, mrr: 2400000, ltv: 28800000, churnRate: 8.1, expansionRate: 12.3 },
    { id: 'COH003', name: 'Q2-2025 Enterprise', segment: 'Enterprise', quarter: 'Q2-2025', customers: 52, mrr: 2600000, ltv: 15600000, churnRate: 4.8, expansionRate: 22.1 },
    { id: 'COH004', name: 'Q2-2025 Professional', segment: 'Professional', quarter: 'Q2-2025', customers: 135, mrr: 2700000, ltv: 16200000, churnRate: 7.5, expansionRate: 15.8 },
    { id: 'COH005', name: 'Q3-2025 Enterprise', segment: 'Enterprise', quarter: 'Q3-2025', customers: 58, mrr: 2900000, ltv: 8700000, churnRate: 3.2, expansionRate: 28.4 },
    { id: 'COH006', name: 'Q3-2025 Professional', segment: 'Professional', quarter: 'Q3-2025', customers: 142, mrr: 2840000, ltv: 8520000, churnRate: 5.8, expansionRate: 19.2 },
    { id: 'COH007', name: 'Q4-2025 Enterprise', segment: 'Enterprise', quarter: 'Q4-2025', customers: 65, mrr: 3250000, ltv: 6500000, churnRate: 2.1, expansionRate: 35.6 },
    { id: 'COH008', name: 'Q4-2025 Professional', segment: 'Professional', quarter: 'Q4-2025', customers: 158, mrr: 3160000, ltv: 6320000, churnRate: 4.2, expansionRate: 24.8 },
  ];
  cohorts.forEach(c => db.cohorts.set(c.id, c));

  // Revenue forecasts
  const forecasts = [];
  for (let i = 1; i <= 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    forecasts.push({
      id: `FC${String(i).padStart(3, '0')}`,
      month: date.toISOString().slice(0, 7),
      predictedRevenue: 12000000 + (i * 800000),
      confidence: 92 - (i * 2),
      factors: ['demand_up', 'seasonality', 'pricing_optimized'],
      createdAt: new Date().toISOString(),
    });
  }
  forecasts.forEach(f => db.revenueForecasts.set(f.id, f));

  // AI Insights
  const insights = [
    { id: 'INS001', type: 'growth', title: 'MRR Growth Acceleration', description: 'Monthly growth rate increased from 6.2% to 8.5% over last 3 months', impact: 'positive', confidence: 92, createdAt: new Date().toISOString() },
    { id: 'INS002', type: 'churn', title: 'Enterprise Churn Risk', description: '3 enterprise customers showing engagement decline', impact: 'warning', confidence: 88, createdAt: new Date().toISOString() },
    { id: 'INS003', type: 'pricing', title: 'Price Sensitivity Detected', description: 'Enterprise segment shows 15% churn at >20% price increases', impact: 'warning', confidence: 85, createdAt: new Date().toISOString() },
    { id: 'INS004', type: 'expansion', title: 'Upsell Opportunity', description: '42 Professional customers ready for Enterprise upgrade', impact: 'opportunity', confidence: 91, createdAt: new Date().toISOString() },
    { id: 'INS005', type: 'demand', title: 'Q3 Demand Surge', description: 'Organic search volume up 35% - prepare for demand spike', impact: 'opportunity', confidence: 87, createdAt: new Date().toISOString() },
  ];
  insights.forEach(i => db.insights.set(i.id, i));

  // Recommendations
  const recommendations = [
    { id: 'REC001', agent: 'CRO', title: 'Optimize Enterprise Pricing', description: 'Consider 10% price increase for Enterprise tier based on value delivered', impact: 850000, priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
    { id: 'REC002', agent: 'demandForecaster', title: 'Scale Paid Acquisition', description: 'Double Google Ads budget - ROAS increasing', impact: 450000, priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
    { id: 'REC003', agent: 'churnPredictor', title: 'Proactive Retention', description: 'Launch retention campaign for at-risk accounts', impact: 320000, priority: 'medium', status: 'pending', createdAt: new Date().toISOString() },
    { id: 'REC004', agent: 'expansionAdvisor', title: 'Enterprise Upsell Push', description: 'Execute targeted upsell for 42 ready Professional accounts', impact: 2100000, priority: 'high', status: 'pending', createdAt: new Date().toISOString() },
  ];
  recommendations.forEach(r => db.recommendations.set(r.id, r));

  console.log(`Revenue Intelligence OS initialized with modular architecture:`);
  console.log(`  - Revenue Streams: ${db.revenueStreams.size}`);
  console.log(`  - Historical Snapshots: ${db.revenueSnapshots.size}`);
  console.log(`  - Demand Signals: ${db.demandSignals.size}`);
  console.log(`  - Pricing Rules: ${db.pricingRules.size}`);
  console.log(`  - Active Promotions: ${db.promotions.size}`);
  console.log(`  - Cohorts: ${db.cohorts.size}`);
  console.log(`  - AI Agents: ${db.aiAgents.size}`);
  console.log(`  - Insights: ${db.insights.size}`);
  console.log(`  - Recommendations: ${db.recommendations.size}`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', async (req, res) => {
  const serviceStatus = {};
  for (const [key, service] of Object.entries(CONNECTED_SERVICES)) {
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      serviceStatus[key] = response.ok ? 'healthy' : 'down';
    } catch {
      serviceStatus[key] = 'unreachable';
    }
  }

  res.json({
    status: 'healthy',
    service: 'revenue-intelligence-os',
    version: '1.0.0',
    port: PORT,
    tagline: 'The AI Revenue Department',
    modules: {
      revenueHub: true,
      demandIntelligence: true,
      pricingOptimization: true,
      promotionManagement: true,
      revopsIntelligence: true,
      cohortAnalysis: true,
      analyticsEngine: true,
      revenueTwin: true,
    },
    aiAgents: db.aiAgents.size,
    connectedServices: serviceStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', (req, res) => {
  const overview = revenueHub.getOverview();
  res.json({
    modules: {
      revenueHub: true,
      demandIntelligence: true,
      pricingOptimization: true,
      promotionManagement: true,
      revopsIntelligence: true,
      cohortAnalysis: true,
      analyticsEngine: true,
      revenueTwin: true,
    },
    summary: {
      totalRevenue: overview.totalRevenue,
      monthlyGrowth: overview.weightedGrowthRate,
      revenueStreams: db.revenueStreams.size,
      activePromotions: Array.from(db.promotions.values()).filter(p => p.status === 'active').length,
      cohorts: db.cohorts.size,
      insights: db.insights.size,
      recommendations: db.recommendations.size,
    },
    aiAgents: {
      total: db.aiAgents.size,
      active: Array.from(db.aiAgents.values()).filter(a => a.status === 'active').length,
    },
  });
});

// ============================================================
// REVENUE HUB ENDPOINTS
// ============================================================

app.get('/api/revenue/hub', (req, res) => {
  res.json(revenueHub.getOverview());
});

app.get('/api/revenue/snapshots', (req, res) => {
  const { period = '12' } = req.query;
  res.json({ snapshots: revenueHub.getSnapshots(period), count: parseInt(period) });
});

app.get('/api/revenue/forecast', (req, res) => {
  res.json(revenueHub.getForecasts());
});

app.get('/api/revenue/dimensions', (req, res) => {
  const { dimension = 'segment' } = req.query;
  res.json(revenueHub.getByDimension(dimension));
});

app.post('/api/revenue/streams', (req, res) => {
  const stream = revenueHub.addStream(req.body);
  res.status(201).json({ success: true, stream });
});

app.get('/api/revenue/growth', (req, res) => {
  res.json(revenueHub.calculateGrowthMetrics());
});

// ============================================================
// DEMAND INTELLIGENCE ENDPOINTS
// ============================================================

app.get('/api/demand/signals', (req, res) => {
  res.json(demandIntelligence.getSignals());
});

app.post('/api/demand/forecast', (req, res) => {
  const { horizon = 3, factors = [] } = req.body;
  const result = demandIntelligence.forecast(horizon, factors);

  // Update agent task count
  const agent = db.aiAgents.get('demandForecaster');
  if (agent) agent.tasks++;

  res.json({ success: true, ...result });
});

app.get('/api/demand/seasonality', (req, res) => {
  res.json(demandIntelligence.getSeasonality());
});

app.get('/api/demand/trends', (req, res) => {
  res.json(demandIntelligence.analyzeTrends());
});

app.get('/api/demand/pipeline', (req, res) => {
  res.json(demandIntelligence.getPipelineCoverage());
});

app.post('/api/demand/signals', (req, res) => {
  const signal = demandIntelligence.addSignal(req.body);
  res.status(201).json({ success: true, signal });
});

// ============================================================
// PRICING INTELLIGENCE ENDPOINTS
// ============================================================

app.get('/api/pricing/rules', (req, res) => {
  res.json(pricingIntelligence.getRules());
});

app.post('/api/pricing/optimize', (req, res) => {
  const { productId, marketData = {} } = req.body;
  const result = pricingIntelligence.optimize(productId, marketData);

  // Update agent task count
  const agent = db.aiAgents.get('pricingOptimizer');
  if (agent) agent.tasks++;

  res.json(result.error ? result : { success: true, ...result });
});

app.get('/api/pricing/competitors', (req, res) => {
  res.json(pricingIntelligence.getCompetitors());
});

app.get('/api/pricing/sensitivity/:productId', (req, res) => {
  const { priceChange = 10 } = req.query;
  res.json(pricingIntelligence.calculateSensitivity(req.params.productId, parseFloat(priceChange)));
});

app.get('/api/pricing/history/:productId', (req, res) => {
  res.json(pricingIntelligence.getHistory(req.params.productId));
});

app.get('/api/pricing/discounts', (req, res) => {
  res.json(pricingIntelligence.getDiscountAnalysis());
});

app.post('/api/pricing/rules', (req, res) => {
  const rule = pricingIntelligence.addRule(req.body);
  res.status(201).json({ success: true, rule });
});

// ============================================================
// PROMOTION MANAGEMENT ENDPOINTS
// ============================================================

app.get('/api/promotions', (req, res) => {
  const { status } = req.query;
  res.json(promotionManagement.getPromotions(status));
});

app.post('/api/promotions', (req, res) => {
  const promotion = promotionManagement.createPromotion(req.body);
  res.status(201).json({ success: true, promotion });
});

app.patch('/api/promotions/:id', (req, res) => {
  const updated = promotionManagement.updatePromotion(req.params.id, req.body);
  res.json(updated ? { success: true, promotion: updated } : { error: 'Not found' });
});

app.get('/api/promotions/:id/attribution', (req, res) => {
  res.json(promotionManagement.getAttribution(req.params.id));
});

app.get('/api/promotions/effectiveness', (req, res) => {
  res.json(promotionManagement.analyzeEffectiveness());
});

app.get('/api/promotions/optimize-budget', (req, res) => {
  const { totalBudget = 1000000 } = req.query;
  res.json(promotionManagement.optimizeBudget(parseFloat(totalBudget)));
});

app.get('/api/promotions/calendar', (req, res) => {
  const { year = 2026 } = req.query;
  res.json(promotionManagement.getCalendar(parseInt(year)));
});

app.post('/api/promotions/forecast', (req, res) => {
  res.json(promotionManagement.forecastImpact(req.body));
});

// ============================================================
// REVOPS INTELLIGENCE ENDPOINTS
// ============================================================

app.get('/api/revops/pipeline', (req, res) => {
  res.json(revOpsIntelligence.getPipeline());
});

app.get('/api/revops/metrics', (req, res) => {
  res.json(revOpsIntelligence.getMetrics());
});

app.get('/api/revops/churn', (req, res) => {
  res.json(revOpsIntelligence.getChurnRisks());
});

app.get('/api/revops/expansion', (req, res) => {
  res.json(revOpsIntelligence.getExpansionTracking());
});

app.get('/api/revops/winloss', (req, res) => {
  res.json(revOpsIntelligence.getWinLossAnalysis());
});

app.get('/api/revops/risk', (req, res) => {
  res.json(revOpsIntelligence.getRevenueAtRisk());
});

app.get('/api/revops/forecast-accuracy', (req, res) => {
  res.json(revOpsIntelligence.getForecastAccuracy());
});

// ============================================================
// COHORT ANALYSIS ENDPOINTS
// ============================================================

app.get('/api/cohorts', (req, res) => {
  const { segment } = req.query;
  res.json(cohortAnalysis.getCohorts(segment));
});

app.get('/api/cohorts/:id', (req, res) => {
  res.json(cohortAnalysis.getCohortDetail(req.params.id));
});

app.post('/api/cohorts/ltv-predict', (req, res) => {
  res.json(cohortAnalysis.predictLTV(
    req.body.segment || 'Professional',
    req.body.mrr || 50000,
    req.body.customers || 100,
    req.body.tenure || 24
  ));
});

app.get('/api/cohorts/retention', (req, res) => {
  res.json(cohortAnalysis.getRetentionAnalysis());
});

app.get('/api/cohorts/compare', (req, res) => {
  res.json(cohortAnalysis.getComparisonReport());
});

app.post('/api/cohorts', (req, res) => {
  const cohort = cohortAnalysis.createCohort(req.body);
  res.status(201).json({ success: true, cohort });
});

// ============================================================
// ANALYTICS ENDPOINTS
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const snapshots = Array.from(db.revenueSnapshots.values()).slice(-12);
  const totalRevenue = snapshots.reduce((s, snap) => s + snap.totalRevenue, 0);
  const avgRevenue = totalRevenue / snapshots.length;

  const monthlyGrowth = [];
  for (let i = 1; i < snapshots.length; i++) {
    monthlyGrowth.push({
      month: snapshots[i].month,
      growth: ((snapshots[i].totalRevenue - snapshots[i-1].totalRevenue) / snapshots[i-1].totalRevenue * 100).toFixed(1),
    });
  }

  res.json({
    summary: {
      totalRevenue,
      avgMonthlyRevenue: Math.round(avgRevenue),
      revenueStdDev: Math.round(Math.sqrt(snapshots.reduce((s, snap) => s + Math.pow(snap.totalRevenue - avgRevenue, 2), 0) / snapshots.length)),
      trend: monthlyGrowth,
      latestMonth: snapshots[snapshots.length - 1],
    },
    metrics: {
      mrr: snapshots[snapshots.length - 1]?.mrr || 0,
      arr: snapshots[snapshots.length - 1]?.arr || 0,
      newRevenue: snapshots[snapshots.length - 1]?.newRevenue || 0,
      expansionRevenue: snapshots[snapshots.length - 1]?.expansionRevenue || 0,
      churnRevenue: snapshots[snapshots.length - 1]?.churnRevenue || 0,
      netNewRevenue: snapshots[snapshots.length - 1]?.netNewRevenue || 0,
    },
  });
});

app.get('/api/analytics/velocity', (req, res) => {
  res.json(revOpsIntelligence.getMetrics());
});

// ============================================================
// AI COPILOT
// ============================================================

app.post('/api/copilot/chat', (req, res) => {
  const { message } = req.body;
  const msg = (message || '').toLowerCase();

  // Update agent task count
  const agent = db.aiAgents.get('cro');
  if (agent) agent.tasks++;

  let response = {
    response: 'Revenue Intelligence OS can help with:\n' +
      '  - Revenue: "What is our MRR?"\n' +
      '  - Forecast: "Predict revenue for next quarter"\n' +
      '  - Demand: "Show demand signals"\n' +
      '  - Pricing: "Optimize pricing for Enterprise"\n' +
      '  - Promotions: "Show active promotions"\n' +
      '  - Churn: "Which customers are at risk?"\n' +
      '  - Cohorts: "Compare Q1 and Q2 cohorts"\n' +
      '  - Insights: "Show AI insights"',
    actions: [],
  };

  if (msg.includes('mrr') || msg.includes('revenue') || msg.includes('arr')) {
    const latest = Array.from(db.revenueSnapshots.values()).slice(-1)[0];
    response = {
      response: `Current Revenue Metrics:\n` +
        `MRR: ${formatCurrency(latest?.mrr || 0)}\n` +
        `ARR: ${formatCurrency(latest?.arr || 0)}\n` +
        `Monthly Growth: ${((latest?.netNewRevenue / latest?.mrr) * 100).toFixed(1)}%\n` +
        `Net New Revenue: ${formatCurrency(latest?.netNewRevenue || 0)}`,
      actions: [
        { label: 'View Revenue Hub', endpoint: '/api/revenue/hub' },
        { label: 'View Forecasts', endpoint: '/api/revenue/forecast' },
      ],
    };
  } else if (msg.includes('forecast')) {
    const forecasts = Array.from(db.revenueForecasts.values()).slice(0, 3);
    response = {
      response: `Revenue Forecast (Next 3 Months):\n` +
        forecasts.map(f => `${f.month}: ${formatCurrency(f.predictedRevenue)} (${f.confidence}% confidence)`).join('\n'),
      actions: [
        { label: 'Run New Forecast', endpoint: '/api/demand/forecast' },
        { label: 'View Scenarios', endpoint: '/api/twin/scenarios' },
      ],
    };
  } else if (msg.includes('demand')) {
    const signals = demandIntelligence.getSignals();
    response = {
      response: `Demand Signals Overview:\n` +
        `Total Volume: ${signals.summary.totalVolume.toLocaleString()} visitors\n` +
        `Best Channel: ${signals.summary.strongestSignal?.source}\n` +
        `Organic Growth: ${signals.summary.trendingUp} channels trending up`,
      actions: [
        { label: 'View All Signals', endpoint: '/api/demand/signals' },
        { label: 'Run Demand Forecast', endpoint: '/api/demand/forecast' },
      ],
    };
  } else if (msg.includes('churn') || msg.includes('risk')) {
    const churnRisks = revOpsIntelligence.getChurnRisks();
    response = {
      response: `Churn Risk Analysis:\n` +
        `High Risk: ${churnRisks.summary.highRiskCount} accounts (${formatCurrency(churnRisks.summary.highRiskValue)} MRR)\n` +
        `Medium Risk: ${churnRisks.summary.mediumRiskCount} accounts\n` +
        `Total At Risk: ${formatCurrency(churnRisks.summary.totalAtRisk)}/month`,
      actions: [
        { label: 'View Churn Risks', endpoint: '/api/revops/churn' },
        { label: 'View Retention', endpoint: '/api/cohorts' },
      ],
    };
  } else if (msg.includes('insight')) {
    const insights = Array.from(db.insights.values()).slice(0, 3);
    response = {
      response: `AI Insights:\n` +
        insights.map(i => `[${i.impact.toUpperCase()}] ${i.title}`).join('\n\n'),
      actions: [
        { label: 'View All Insights', endpoint: '/api/insights' },
        { label: 'View Recommendations', endpoint: '/api/recommendations' },
      ],
    };
  } else if (msg.includes('promotion') || msg.includes('campaign')) {
    const active = promotionManagement.getPromotions('active');
    response = {
      response: `Active Promotions:\n` +
        active.promotions.slice(0, 3).map(p => `${p.name}: ${formatCurrency(p.revenue)} revenue (${p.roi}% ROI)`).join('\n'),
      actions: [
        { label: 'View All Promotions', endpoint: '/api/promotions' },
        { label: 'Analyze Effectiveness', endpoint: '/api/promotions/effectiveness' },
      ],
    };
  }

  res.json(response);
});

// ============================================================
// INSIGHTS & RECOMMENDATIONS
// ============================================================

app.get('/api/insights', (req, res) => {
  const insights = Array.from(db.insights.values());
  res.json({
    insights,
    summary: {
      total: insights.length,
      positive: insights.filter(i => i.impact === 'positive').length,
      warnings: insights.filter(i => i.impact === 'warning').length,
      opportunities: insights.filter(i => i.impact === 'opportunity').length,
    },
  });
});

app.get('/api/recommendations', (req, res) => {
  const recs = Array.from(db.recommendations.values());
  res.json({
    recommendations: recs,
    summary: {
      total: recs.length,
      highPriority: recs.filter(r => r.priority === 'high').length,
      totalImpact: recs.reduce((s, r) => s + r.impact, 0),
    },
  });
});

// ============================================================
// REVENUE DIGITAL TWIN
// ============================================================

app.get('/api/twin', (req, res) => {
  const twinState = revenueTwin.getCurrentState();
  twinState.recommendations = Array.from(db.recommendations.values()).filter(r => r.priority === 'high').slice(0, 3);
  res.json(twinState);
});

app.post('/api/twin/simulate', (req, res) => {
  const { changes = [], horizon = 12 } = req.body;
  res.json(revenueTwin.simulate(changes, horizon));
});

app.get('/api/twin/scenarios', (req, res) => {
  res.json(revenueTwin.getPredefinedScenarios());
});

app.post('/api/twin/scenarios', (req, res) => {
  const { name, description, changes } = req.body;
  const scenario = revenueTwin.createScenario(name, description, changes);
  res.status(201).json({ success: true, scenario });
});

app.get('/api/twin/scenarios/:id', (req, res) => {
  res.json(revenueTwin.analyzeScenario(req.params.id));
});

app.get('/api/twin/risk', (req, res) => {
  res.json(revenueTwin.getRiskAssessment());
});

// ============================================================
// AI AGENTS
// ============================================================

app.get('/api/agents', (req, res) => {
  const agents = Array.from(db.aiAgents.values());
  res.json({
    agents,
    summary: {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      avgAccuracy: (agents.reduce((s, a) => s + a.accuracy, 0) / agents.length).toFixed(1),
      totalTasks: agents.reduce((s, a) => s + a.tasks, 0),
    },
  });
});

app.get('/api/agents/:id', (req, res) => {
  const agentId = req.params.id;
  const agent = agents[agentId];

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  let result;
  switch (agentId) {
    case 'cro':
      result = agent.analyzeRevenueHealth();
      break;
    case 'demandForecaster':
      result = agent.forecast(3);
      break;
    case 'pricingOptimizer':
      result = { message: 'Specify productId in request body', example: { productId: 'PRC001', objectives: 'revenue' } };
      break;
    case 'churnPredictor':
      result = agent.predictChurn();
      break;
    case 'expansionAdvisor':
      result = agent.identifyOpportunities();
      break;
    case 'anomalyDetector':
      result = agent.detectAnomalies();
      break;
    case 'cohortAnalyst':
      result = agent.analyzeCohorts();
      break;
    case 'scenarioPlanner':
      result = agent.planScenarios();
      break;
    default:
      result = { message: 'Agent analysis not available' };
  }

  res.json(result);
});

app.post('/api/agents/:id/run', (req, res) => {
  const agentId = req.params.id;
  const agent = agents[agentId];

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.tasks++;
  let result;

  switch (agentId) {
    case 'cro':
      result = agent.generateReport();
      break;
    case 'demandForecaster':
      result = agent.forecast(req.body.horizon || 3, req.body.factors || []);
      break;
    case 'pricingOptimizer':
      result = agent.optimize(req.body.productId || 'PRC001', req.body.objectives || 'revenue');
      break;
    case 'churnPredictor':
      result = agent.predictChurn();
      break;
    case 'expansionAdvisor':
      result = agent.identifyOpportunities();
      break;
    case 'anomalyDetector':
      result = agent.detectAnomalies();
      break;
    case 'cohortAnalyst':
      result = agent.analyzeCohorts();
      break;
    case 'scenarioPlanner':
      result = agent.planScenarios();
      break;
    default:
      result = { error: 'Unknown agent' };
  }

  res.json({ success: true, ...result });
});

// ============================================================
// INDUSTRY BRIDGE
// ============================================================

app.get('/api/industries/revenue', async (req, res) => {
  const result = await bridgeManager.bridges.industry.getAllIndustryRevenue();
  res.json(result);
});

app.get('/api/industries/revenue/:code', async (req, res) => {
  const result = await bridgeManager.bridges.industry.getIndustryRevenue(req.params.code);
  res.json(result);
});

// ============================================================
// SYNC & CONNECTIONS
// ============================================================

app.get('/api/sync/sources', (req, res) => {
  res.json({
    sources: [
      { name: 'Sales OS', port: 5055, dataTypes: ['pipeline', 'opportunities', 'subscriptions'] },
      { name: 'Finance OS', port: 4801, dataTypes: ['invoices', 'payments', 'revenue'] },
      { name: 'Marketing OS', port: 5500, dataTypes: ['campaigns', 'attribution'] },
      { name: 'Operations OS', port: 5250, dataTypes: ['operational_metrics'] },
    ],
  });
});

app.get('/api/sync/connections', async (req, res) => {
  const result = await bridgeManager.checkAllConnections();
  res.json(result);
});

app.post('/api/sync/collect', async (req, res) => {
  const data = await bridgeManager.collectAllRevenueData();
  res.json({ success: true, data, timestamp: new Date().toISOString() });
});

// ============================================================
// REPORTS
// ============================================================

app.get('/api/reports/revenue-summary', (req, res) => {
  const snapshots = Array.from(db.revenueSnapshots.values()).slice(-12);
  const streams = Array.from(db.revenueStreams.values());
  const totalRevenue = snapshots.reduce((s, snap) => s + snap.totalRevenue, 0);

  res.json({
    reportType: 'Revenue Summary',
    period: 'Last 12 Months',
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue,
      avgMonthlyRevenue: totalRevenue / 12,
      totalNewRevenue: snapshots.reduce((s, snap) => s + snap.newRevenue, 0),
      totalExpansion: snapshots.reduce((s, snap) => s + snap.expansionRevenue, 0),
      totalChurn: snapshots.reduce((s, snap) => s + snap.churnRevenue, 0),
    },
    byStream: streams.map(s => ({
      source: s.source,
      total: s.amount * 12,
      percentage: (s.amount / streams.reduce((sum, st) => sum + st.amount, 0) * 100).toFixed(1),
    })),
    trends: snapshots.map(s => ({
      month: s.month,
      revenue: s.totalRevenue,
      netNew: s.netNewRevenue,
    })),
  });
});

app.get('/api/reports/forecast', (req, res) => {
  const forecasts = Array.from(db.revenueForecasts.values());
  res.json({
    reportType: 'Revenue Forecast',
    generatedAt: new Date().toISOString(),
    forecasts: forecasts.map(f => ({
      period: f.month,
      predicted: f.predictedRevenue,
      confidence: f.confidence,
    })),
    summary: {
      totalPredicted: forecasts.reduce((s, f) => s + f.predictedRevenue, 0),
      avgConfidence: forecasts.reduce((s, f) => s + f.confidence, 0) / forecasts.length,
    },
  });
});

// ============================================================
// START SERVER
// ============================================================

initData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           REVENUE INTELLIGENCE OS v1.0                            ║
║           The AI Revenue Department                                ║
║           Port: ${PORT}                                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║  MODULES (8):                                                     ║
║  ✅ Revenue Hub           - Unified revenue aggregation             ║
║  ✅ Demand Intelligence  - Forecasting, signals, trends             ║
║  ✅ Pricing Intelligence - Dynamic optimization                      ║
║  ✅ Promotion Management - Attribution, ROI tracking                  ║
║  ✅ RevOps Intelligence  - Pipeline, churn, expansion               ║
║  ✅ Cohort Analysis     - LTV, retention curves                    ║
║  ✅ Analytics Engine    - Dashboards, reports                       ║
║  ✅ Revenue Twin        - Scenario simulation                       ║
║                                                                  ║
║  AI AGENTS (8):                                                   ║
║  🎯 AI CRO              🎯 Demand Forecaster                        ║
║  🎯 Pricing Optimizer    🎯 Churn Predictor                         ║
║  🎯 Expansion Advisor    🎯 Anomaly Detector                        ║
║  🎯 Cohort Analyst       🎯 Scenario Planner                        ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
  console.log('Endpoints:');
  console.log('  GET  /health                     - Health check');
  console.log('  GET  /api/revenue/hub            - Revenue overview');
  console.log('  GET  /api/demand/signals          - Demand signals');
  console.log('  GET  /api/pricing/rules          - Pricing rules');
  console.log('  GET  /api/promotions             - Active promotions');
  console.log('  GET  /api/revops/metrics         - RevOps KPIs');
  console.log('  GET  /api/cohorts                - Cohort analysis');
  console.log('  GET  /api/analytics/overview      - Analytics dashboard');
  console.log('  GET  /api/twin                   - Revenue digital twin');
  console.log('  GET  /api/agents                 - AI agents');
  console.log('  POST /api/copilot/chat            - AI Copilot');
  console.log('');
});
