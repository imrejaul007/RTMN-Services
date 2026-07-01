/**
 * AccountTwin Bridge - SalesOS
 *
 * Full digital twin for B2B accounts with:
 * - Company Info, Relationships
 * - Financials, Health, Opportunities
 * - Intelligence, Recommendations
 *
 * Port: 5061
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5061;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// In-memory storage
const accountTwins = new Map();

// Sample twins
const sampleTwins = [
  {
    id: uuidv4(),
    accountId: 'ACC001',
    company: {
      name: 'TechCorp India',
      industry: 'Technology',
      size: 'enterprise',
      revenue: '$50M-$100M',
      employees: 500,
      website: 'https://techcorp.in',
      locations: ['Bangalore', 'Hyderabad', 'Mumbai'],
    },
    relationships: {
      champion: { name: 'Rahul Sharma', email: 'rahul@techcorp.in', influence: 85, lastContact: new Date() },
      economicBuyer: { name: 'Priya Patel', email: 'priya@techcorp.in' },
      technicalBuyer: { name: 'Ankit Gupta', email: 'ankit@techcorp.in' },
      procurement: null,
      blockers: [],
      influencers: ['Sneha Reddy', 'Vikram Singh'],
    },
    financials: {
      totalARR: 250000,
      potentialARR: 500000,
      coverage: 0.5,
      paymentStatus: 'current',
    },
    health: {
      score: 85,
      trend: 'improving',
      riskFactors: [],
    },
    opportunities: {
      open: 3,
      value: 350000,
      stages: { discovery: 1, proposal: 1, negotiation: 1 },
    },
    intelligence: {
      churnRisk: 12,
      expansionPotential: 78,
      competitiveThreats: ['Salesforce', 'HubSpot'],
      recommendedActions: ['Schedule QBR', 'Prepare expansion offer'],
    },
    confidence: 92,
    lastUpdated: new Date(),
    createdAt: new Date('2025-06-15'),
  },
  {
    id: uuidv4(),
    accountId: 'ACC002',
    company: {
      name: 'Global Retail Solutions',
      industry: 'Retail',
      size: 'enterprise',
      revenue: '$100M-$500M',
      employees: 1200,
      locations: ['Delhi', 'Pune'],
    },
    relationships: {
      champion: { name: 'Amit Kumar', email: 'amit@globalretail.com', influence: 70, lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      economicBuyer: { name: 'Neha Gupta', email: 'neha@globalretail.com' },
      blockers: ['Budget approval pending', 'Legal review'],
      influencers: ['Vikram Singh'],
    },
    financials: {
      totalARR: 180000,
      potentialARR: 300000,
      coverage: 0.6,
      paymentStatus: 'current',
    },
    health: {
      score: 62,
      trend: 'stable',
      riskFactors: ['Budget freeze', 'Legal review delayed'],
    },
    opportunities: {
      open: 2,
      value: 120000,
      stages: { qualification: 2 },
    },
    intelligence: {
      churnRisk: 35,
      expansionPotential: 45,
      competitiveThreats: ['Zoho', 'SAP'],
      recommendedActions: ['Address legal concerns', 'Schedule executive call'],
    },
    confidence: 78,
    lastUpdated: new Date(),
    createdAt: new Date('2024-09-01'),
  },
];

sampleTwins.forEach(t => accountTwins.set(t.id, t));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AccountTwin Bridge',
    version: '1.0.0',
    port: PORT,
    twinsCount: accountTwins.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ success: true, twins: Array.from(accountTwins.values()) });
});

// ============================================================
// CRUD
// ============================================================

app.get('/:id', (req, res) => {
  const twin = accountTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'AccountTwin not found' });
  res.json({ success: true, twin });
});

app.post('/', (req, res) => {
  const twin = {
    id: uuidv4(),
    accountId: req.body.accountId,
    company: req.body.company,
    relationships: req.body.relationships || { blockers: [], influencers: [] },
    financials: req.body.financials || { totalARR: 0, potentialARR: 0, coverage: 0, paymentStatus: 'current' },
    health: req.body.health || { score: 50, trend: 'stable', riskFactors: [] },
    opportunities: req.body.opportunities || { open: 0, value: 0, stages: {} },
    intelligence: {
      churnRisk: 50,
      expansionPotential: 50,
      competitiveThreats: [],
      recommendedActions: [],
    },
    confidence: 100,
    lastUpdated: new Date(),
    createdAt: new Date(),
  };
  accountTwins.set(twin.id, twin);
  res.status(201).json({ success: true, twin });
});

app.put('/:id', (req, res) => {
  const twin = accountTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'AccountTwin not found' });
  const updated = { ...twin, ...req.body, lastUpdated: new Date() };
  accountTwins.set(twin.id, updated);
  res.json({ success: true, twin: updated });
});

// ============================================================
// SCORING
// ============================================================

app.post('/:id/score', (req, res) => {
  const twin = accountTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'AccountTwin not found' });

  twin.health.score = calculateHealth(twin);
  twin.health.trend = calculateTrend(twin);
  twin.health.riskFactors = identifyRiskFactors(twin);
  twin.intelligence.churnRisk = calculateChurnRisk(twin);
  twin.intelligence.expansionPotential = calculateExpansion(twin);
  twin.intelligence.recommendedActions = generateActions(twin);
  twin.lastUpdated = new Date();

  accountTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

// ============================================================
// HELPERS
// ============================================================

function calculateHealth(twin) {
  let score = 70;
  if (twin.financials.paymentStatus === 'overdue') score -= 25;
  else if (twin.financials.paymentStatus === 'late') score -= 10;
  if (twin.relationships.blockers.length > 0) score -= 20;
  if (!twin.relationships.champion) score -= 25;
  if (twin.opportunities.open === 0) score -= 10;
  if (twin.intelligence.competitiveThreats.length > 0) score -= 10;
  return Math.min(100, Math.max(0, score));
}

function calculateTrend(twin) {
  const daysSinceContact = twin.relationships.champion
    ? (Date.now() - new Date(twin.relationships.champion.lastContact).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  if (daysSinceContact < 7) return 'improving';
  if (daysSinceContact > 30) return 'declining';
  return 'stable';
}

function identifyRiskFactors(twin) {
  const risks = [];
  if (twin.relationships.blockers.length > 0) risks.push(`${twin.relationships.blockers.length} blocker(s) present`);
  if (!twin.relationships.champion) risks.push('No champion identified');
  if (twin.health.score < 60) risks.push('Low health score');
  if (twin.opportunities.open === 0) risks.push('No open opportunities');
  if (twin.intelligence.competitiveThreats.length > 0) risks.push(`Competitor(s): ${twin.intelligence.competitiveThreats.join(', ')}`);
  return risks;
}

function calculateChurnRisk(twin) {
  let risk = 25;
  if (twin.health.score < 50) risk += 35;
  if (twin.relationships.blockers.length > 0) risk += 25;
  if (!twin.relationships.champion) risk += 20;
  if (twin.financials.paymentStatus !== 'current') risk += 20;
  return Math.min(100, risk);
}

function calculateExpansion(twin) {
  let potential = 30;
  if (twin.company.size === 'enterprise') potential += 25;
  else if (twin.company.size === 'mid') potential += 15;
  if (twin.health.score > 80) potential += 20;
  if (twin.opportunities.open > 2) potential += 15;
  if (!twin.relationships.blockers.length) potential += 10;
  return Math.min(100, potential);
}

function generateActions(twin) {
  const actions = [];
  if (!twin.relationships.champion) actions.push('Identify and cultivate a champion');
  if (twin.relationships.blockers.length > 0) actions.push('Address identified blockers');
  if (twin.intelligence.expansionPotential > 70) actions.push('Prepare expansion offer');
  if (twin.intelligence.churnRisk > 60) actions.push('Initiate retention conversation');
  if (twin.health.trend === 'declining') actions.push('Increase engagement frequency');
  return actions;
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║       AccountTwin Bridge - SalesOS v1.0         ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Twins: ${accountTwins.size}                                       ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
