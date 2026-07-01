/**
 * CustomerTwin Bridge - SalesOS
 *
 * Full digital twin for customers with:
 * - Identity, Lifecycle, Relationships
 * - Financials, Behavior, Intelligence
 * - Memory, Journey/Opportunity links
 *
 * Port: 5060
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5060;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// INTERFACES
// ============================================================

/**
 * @typedef {Object} CustomerTwin
 * @property {string} id - Unique twin ID
 * @property {string} customerId - Customer ID
 * @property {Object} identity - Identity information
 * @property {Object} lifecycle - Customer lifecycle
 * @property {Object} relationships - Stakeholder relationships
 * @property {Object} financials - Financial metrics
 * @property {Object} behavior - Behavior patterns
 * @property {Object} intelligence - AI intelligence
 * @property {Object} memory - Customer memory
 * @property {string[]} journeyTwins - Linked journey twins
 * @property {string[]} opportunityTwins - Linked opportunity twins
 * @property {number} confidence - Twin confidence (0-100)
 * @property {Date} lastUpdated - Last update time
 * @property {Date} createdAt - Creation time
 */

// ============================================================
// IN-MEMORY STORAGE
// ============================================================

const customerTwins = new Map();

// Seed some sample twins
const sampleTwins = [
  {
    id: uuidv4(),
    customerId: 'CUS001',
    identity: {
      name: 'TechCorp India',
      email: 'rahul@techcorp.in',
      phone: '+91-9876543210',
      company: 'TechCorp India Pvt Ltd',
      title: 'VP of Engineering',
      industry: 'Technology',
      size: 'enterprise',
    },
    lifecycle: {
      stage: 'customer',
      since: new Date('2025-06-15'),
      tenure: 13,
      healthScore: 85,
      ltv: 250000,
    },
    relationships: {
      champion: { name: 'Rahul Sharma', email: 'rahul@techcorp.in', influence: 85 },
      economicBuyer: { name: 'Priya Patel', email: 'priya@techcorp.in' },
      blockers: [],
      influencers: ['Ankit Gupta', 'Sneha Reddy'],
    },
    financials: {
      arr: 250000,
      mrr: 20833,
      aov: 50000,
      orders: 12,
      paymentStatus: 'current',
      cac: 45000,
      margin: 72,
    },
    behavior: {
      engagement: 78,
      lastActive: new Date(),
      preferredChannel: 'whatsapp',
      loginFrequency: 8,
      featureAdoption: ['analytics', 'reports', 'api'],
      nps: 9,
    },
    intelligence: {
      churnRisk: 12,
      expansionProbability: 78,
      nextBestAction: 'expansion_offer',
      recommendedOffer: 'Enterprise Plus',
      intentSignals: [
        { type: 'search', content: 'GCC expansion features', date: new Date() },
        { type: 'meeting', content: 'Discussed scaling needs', date: new Date() },
      ],
    },
    memory: {
      lastInteraction: new Date(),
      preferences: { channel: 'whatsapp', time: '10-11am', language: 'en' },
      keyOutcomes: ['Implemented analytics dashboard', 'API integration complete'],
      openIssues: [],
    },
    journeyTwins: ['JRN001'],
    opportunityTwins: ['OPP001', 'OPP002'],
    confidence: 92,
    lastUpdated: new Date(),
    createdAt: new Date('2025-06-15'),
  },
  {
    id: uuidv4(),
    customerId: 'CUS002',
    identity: {
      name: 'Global Retail Solutions',
      email: 'amit@globalretail.com',
      phone: '+91-9876543211',
      company: 'Global Retail Solutions Ltd',
      title: 'CTO',
      industry: 'Retail',
      size: 'enterprise',
    },
    lifecycle: {
      stage: 'customer',
      since: new Date('2024-09-01'),
      tenure: 22,
      healthScore: 72,
      ltv: 180000,
    },
    relationships: {
      champion: { name: 'Amit Kumar', email: 'amit@globalretail.com', influence: 70 },
      blockers: ['Legal review delayed'],
      influencers: ['Vikram Singh'],
    },
    financials: {
      arr: 180000,
      mrr: 15000,
      aov: 36000,
      orders: 8,
      paymentStatus: 'current',
    },
    behavior: {
      engagement: 55,
      lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      preferredChannel: 'email',
      loginFrequency: 3,
      featureAdoption: ['basic_reports'],
      nps: 7,
    },
    intelligence: {
      churnRisk: 45,
      expansionProbability: 40,
      nextBestAction: 'engagement_nudge',
      intentSignals: [],
    },
    memory: {
      lastInteraction: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      preferences: { channel: 'email', time: 'afternoon', language: 'en' },
      keyOutcomes: [],
      openIssues: ['Feature request pending'],
    },
    journeyTwins: [],
    opportunityTwins: [],
    confidence: 78,
    lastUpdated: new Date(),
    createdAt: new Date('2024-09-01'),
  },
  {
    id: uuidv4(),
    customerId: 'CUS003',
    identity: {
      name: 'HealthFirst Hospitals',
      email: 'meera@healthfirst.in',
      phone: '+91-9876543212',
      company: 'HealthFirst Hospitals',
      title: 'Procurement Head',
      industry: 'Healthcare',
      size: 'enterprise',
    },
    lifecycle: {
      stage: 'churning',
      since: new Date('2025-01-01'),
      tenure: 6,
      healthScore: 35,
      ltv: 120000,
    },
    relationships: {
      champion: null,
      economicBuyer: { name: 'Dr. Rajesh', email: 'rajesh@healthfirst.in' },
      blockers: ['Budget freeze', 'New management'],
      influencers: [],
    },
    financials: {
      arr: 120000,
      mrr: 10000,
      paymentStatus: 'overdue',
    },
    behavior: {
      engagement: 25,
      lastActive: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      preferredChannel: 'call',
      loginFrequency: 1,
      featureAdoption: [],
      nps: 4,
    },
    intelligence: {
      churnRisk: 85,
      expansionProbability: 15,
      nextBestAction: 'retention_campaign',
      intentSignals: [],
    },
    memory: {
      lastInteraction: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      preferences: {},
      keyOutcomes: [],
      openIssues: ['Support escalations', 'Feature gaps reported'],
    },
    journeyTwins: [],
    opportunityTwins: [],
    confidence: 65,
    lastUpdated: new Date(),
    createdAt: new Date('2025-01-01'),
  },
];

// Initialize sample data
sampleTwins.forEach(twin => customerTwins.set(twin.id, twin));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CustomerTwin Bridge',
    version: '1.0.0',
    port: PORT,
    twinsCount: customerTwins.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  const twins = Array.from(customerTwins.values());
  res.json({
    success: true,
    count: twins.length,
    twins,
  });
});

// ============================================================
// CRUD OPERATIONS
// ============================================================

app.get('/:id', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }
  res.json({ success: true, twin });
});

app.post('/', (req, res) => {
  const twin = {
    id: uuidv4(),
    customerId: req.body.customerId,
    identity: req.body.identity,
    lifecycle: {
      ...req.body.lifecycle,
      since: new Date(),
      tenure: 0,
      healthScore: req.body.lifecycle?.healthScore || 50,
    },
    relationships: req.body.relationships || {
      blockers: [],
      influencers: [],
    },
    financials: req.body.financials || {
      arr: 0,
      mrr: 0,
      aov: 0,
      orders: 0,
      paymentStatus: 'current',
    },
    behavior: req.body.behavior || {
      engagement: 50,
      lastActive: new Date(),
      preferredChannel: 'email',
      loginFrequency: 0,
      featureAdoption: [],
    },
    intelligence: req.body.intelligence || {
      churnRisk: 50,
      expansionProbability: 50,
      nextBestAction: 'unknown',
      intentSignals: [],
    },
    memory: req.body.memory || {
      lastInteraction: new Date(),
      preferences: {},
      keyOutcomes: [],
      openIssues: [],
    },
    journeyTwins: [],
    opportunityTwins: [],
    confidence: 100,
    lastUpdated: new Date(),
    createdAt: new Date(),
  };

  customerTwins.set(twin.id, twin);
  res.status(201).json({ success: true, twin });
});

app.put('/:id', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }

  const updated = { ...twin, ...req.body, lastUpdated: new Date() };
  customerTwins.set(twin.id, updated);
  res.json({ success: true, twin: updated });
});

app.delete('/:id', (req, res) => {
  if (!customerTwins.has(req.params.id)) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }
  customerTwins.delete(req.params.id);
  res.json({ success: true, message: 'CustomerTwin deleted' });
});

// ============================================================
// TWIN-SPECIFIC ROUTES
// ============================================================

// Update behavior
app.post('/:id/behavior', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }

  twin.behavior = {
    ...twin.behavior,
    ...req.body,
    lastActive: new Date(),
  };
  twin.lastUpdated = new Date();
  twin.confidence = Math.min(100, twin.confidence + 1);

  customerTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

// Calculate AI scores
app.post('/:id/score', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }

  // Calculate churn risk
  twin.intelligence.churnRisk = calculateChurnRisk(twin);

  // Calculate expansion probability
  twin.intelligence.expansionProbability = calculateExpansionProbability(twin);

  // Calculate health score
  twin.lifecycle.healthScore = calculateHealthScore(twin);

  // Recommend next action
  twin.intelligence.nextBestAction = recommendNextAction(twin);

  twin.lastUpdated = new Date();
  twin.confidence = Math.min(100, twin.confidence + 2);

  customerTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

// Simulate scenarios
app.post('/:id/simulate', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }

  const { action, parameters } = req.body;
  const simTwin = JSON.parse(JSON.stringify(twin));
  const originalValues = {
    ltv: simTwin.lifecycle.ltv,
    arr: simTwin.financials.arr,
    churnRisk: simTwin.intelligence.churnRisk,
    expansionProbability: simTwin.intelligence.expansionProbability,
    stage: simTwin.lifecycle.stage,
  };

  switch (action) {
    case 'churn':
      simTwin.lifecycle.stage = 'churning';
      simTwin.intelligence.churnRisk = parameters?.probability || 0.9;
      simTwin.lifecycle.ltv *= (1 - (parameters?.revenueImpact || 0.5));
      simTwin.financials.arr = 0;
      break;

    case 'expand':
      simTwin.lifecycle.stage = 'expanding';
      simTwin.intelligence.expansionProbability = parameters?.probability || 0.85;
      simTwin.lifecycle.ltv *= (1 + (parameters?.revenueImpact || 0.3));
      simTwin.financials.arr *= (1 + (parameters?.revenueImpact || 0.3));
      simTwin.financials.mrr = simTwin.financials.arr / 12;
      break;

    case 'upgrade':
      simTwin.financials.arr *= 1.5;
      simTwin.financials.mrr = simTwin.financials.arr / 12;
      simTwin.lifecycle.ltv *= 1.35;
      break;

    case 'downgrade':
      simTwin.financials.arr *= 0.7;
      simTwin.financials.mrr = simTwin.financials.arr / 12;
      simTwin.lifecycle.ltv *= 0.8;
      break;

    default:
      return res.status(400).json({ error: 'Unknown simulation action' });
  }

  const impact = {
    ltvChange: simTwin.lifecycle.ltv - originalValues.ltv,
    ltvChangePercent: ((simTwin.lifecycle.ltv - originalValues.ltv) / originalValues.ltv * 100).toFixed(1) + '%',
    arrChange: simTwin.financials.arr - originalValues.arr,
    churnRiskChange: simTwin.intelligence.churnRisk - originalValues.churnRisk,
    expansionProbabilityChange: simTwin.intelligence.expansionProbability - originalValues.expansionProbability,
  };

  res.json({
    success: true,
    simulation: {
      action,
      parameters,
      original: originalValues,
      simulated: {
        ltv: simTwin.lifecycle.ltv,
        arr: simTwin.financials.arr,
        stage: simTwin.lifecycle.stage,
        churnRisk: simTwin.intelligence.churnRisk,
        expansionProbability: simTwin.intelligence.expansionProbability,
      },
      impact,
    },
  });
});

// Add intent signal
app.post('/:id/intent', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }

  const signal = {
    id: uuidv4(),
    type: req.body.type,
    content: req.body.content,
    source: req.body.source || 'manual',
    date: new Date(),
  };

  twin.intelligence.intentSignals.push(signal);
  twin.behavior.lastActive = new Date();
  twin.lastUpdated = new Date();

  // Recalculate scores
  twin.intelligence.expansionProbability = Math.min(100, twin.intelligence.expansionProbability + 5);

  customerTwins.set(twin.id, twin);
  res.json({ success: true, signal, twin });
});

// Link twins
app.post('/:id/link', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }

  const { type, targetId } = req.body;
  if (type === 'journey') {
    twin.journeyTwins.push(targetId);
  } else if (type === 'opportunity') {
    twin.opportunityTwins.push(targetId);
  }

  twin.lastUpdated = new Date();
  customerTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

// Get customer insights
app.get('/:id/insights', (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) {
    return res.status(404).json({ error: 'CustomerTwin not found' });
  }

  const insights = {
    customerId: twin.customerId,
    company: twin.identity.company,
    health: {
      score: twin.lifecycle.healthScore,
      status: twin.lifecycle.healthScore >= 70 ? 'healthy' : twin.lifecycle.healthScore >= 40 ? 'at_risk' : 'critical',
      trend: twin.behavior.engagement > 70 ? 'improving' : twin.behavior.engagement < 40 ? 'declining' : 'stable',
    },
    risk: {
      churnRisk: twin.intelligence.churnRisk,
      status: twin.intelligence.churnRisk >= 70 ? 'high' : twin.intelligence.churnRisk >= 40 ? 'medium' : 'low',
    },
    opportunity: {
      expansionProbability: twin.intelligence.expansionProbability,
      recommendedOffer: twin.intelligence.recommendedOffer,
      nextBestAction: twin.intelligence.nextBestAction,
    },
    engagement: {
      score: twin.behavior.engagement,
      preferredChannel: twin.behavior.preferredChannel,
      lastActive: twin.behavior.lastActive,
      loginFrequency: twin.behavior.loginFrequency,
    },
    financials: {
      arr: twin.financials.arr,
      ltv: twin.lifecycle.ltv,
      paymentStatus: twin.financials.paymentStatus,
    },
    relationships: {
      hasChampion: !!twin.relationships.champion,
      blockerCount: twin.relationships.blockers.length,
    },
    recentActivity: twin.intelligence.intentSignals.slice(-5),
    recommendations: generateRecommendations(twin),
  };

  res.json({ success: true, insights });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateChurnRisk(twin) {
  let risk = 25; // Base risk

  // Engagement impact
  if (twin.behavior.engagement < 30) risk += 25;
  else if (twin.behavior.engagement < 50) risk += 15;
  else if (twin.behavior.engagement > 70) risk -= 15;

  // Tenure impact
  if (twin.lifecycle.tenure < 3) risk += 15;
  else if (twin.lifecycle.tenure > 12) risk -= 10;

  // Payment status
  if (twin.financials.paymentStatus === 'overdue') risk += 30;
  else if (twin.financials.paymentStatus === 'late') risk += 15;

  // Login frequency
  if (twin.behavior.loginFrequency < 2) risk += 15;
  else if (twin.behavior.loginFrequency > 6) risk -= 10;

  // Blockers
  if (twin.relationships.blockers.length > 0) risk += 20;
  else if (!twin.relationships.champion) risk += 15;

  // NPS
  if (twin.behavior.nps && twin.behavior.nps < 6) risk += 20;
  else if (twin.behavior.nps && twin.behavior.nps > 8) risk -= 15;

  return Math.min(100, Math.max(0, risk));
}

function calculateExpansionProbability(twin) {
  let prob = 20; // Base probability

  // Only for active customers
  if (twin.lifecycle.stage !== 'customer') return prob;

  // Engagement impact
  if (twin.behavior.engagement > 70) prob += 25;
  else if (twin.behavior.engagement > 50) prob += 15;

  // Tenure impact
  if (twin.lifecycle.tenure > 12) prob += 15;
  else if (twin.lifecycle.tenure > 6) prob += 10;

  // Health score impact
  if (twin.lifecycle.healthScore > 80) prob += 20;
  else if (twin.lifecycle.healthScore > 60) prob += 10;

  // Size impact
  if (twin.identity.size === 'enterprise') prob += 15;
  else if (twin.identity.size === 'mid') prob += 10;

  // NPS impact
  if (twin.behavior.nps && twin.behavior.nps > 8) prob += 15;

  // No blockers
  if (twin.relationships.blockers.length === 0) prob += 10;

  return Math.min(95, Math.max(5, prob));
}

function calculateHealthScore(twin) {
  let score = 70;

  // Engagement (30% weight)
  score = score * 0.3 + twin.behavior.engagement * 0.3;

  // Financial (20% weight)
  if (twin.financials.paymentStatus === 'current') score += 14;
  else if (twin.financials.paymentStatus === 'late') score += 7;
  else score -= 14;

  // Relationships (20% weight)
  if (twin.relationships.champion) score += 14;
  if (twin.relationships.blockers.length === 0) score += 7;

  // Activity (20% weight)
  const daysSinceActivity = (Date.now() - new Date(twin.behavior.lastActive).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceActivity < 7) score += 14;
  else if (daysSinceActivity > 30) score -= 14;

  // NPS (10% weight)
  if (twin.behavior.nps) {
    score += (twin.behavior.nps / 10) * 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function recommendNextAction(twin) {
  // High churn risk
  if (twin.intelligence.churnRisk >= 70) {
    return 'retention_campaign';
  }

  // Expansion opportunity
  if (twin.intelligence.expansionProbability >= 70 && twin.lifecycle.stage === 'customer') {
    return 'expansion_offer';
  }

  // Low engagement
  if (twin.behavior.engagement < 50) {
    return 'engagement_nudge';
  }

  // New customer
  if (twin.lifecycle.tenure <= 3) {
    return 'onboarding_complete';
  }

  // At risk
  if (twin.lifecycle.healthScore < 60) {
    return 'health_check';
  }

  // Blockers present
  if (twin.relationships.blockers.length > 0) {
    return 'address_blockers';
  }

  // Default
  return 'maintain_relationship';
}

function generateRecommendations(twin) {
  const recommendations = [];

  if (twin.intelligence.churnRisk >= 70) {
    recommendations.push({
      priority: 'high',
      action: 'Initiate retention campaign',
      reason: 'High churn risk detected',
    });
  }

  if (!twin.relationships.champion && twin.lifecycle.stage === 'customer') {
    recommendations.push({
      priority: 'high',
      action: 'Identify and cultivate a champion',
      reason: 'No champion identified',
    });
  }

  if (twin.relationships.blockers.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Address blockers',
      reason: `${twin.relationships.blockers.length} blocker(s) identified`,
    });
  }

  if (twin.intelligence.expansionProbability >= 70) {
    recommendations.push({
      priority: 'medium',
      action: 'Prepare expansion offer',
      reason: 'High expansion probability',
    });
  }

  if (twin.behavior.engagement < 50) {
    recommendations.push({
      priority: 'medium',
      action: 'Increase engagement touchpoints',
      reason: 'Low engagement score',
    });
  }

  if (twin.lifecycle.tenure <= 3 && twin.lifecycle.stage === 'customer') {
    recommendations.push({
      priority: 'medium',
      action: 'Complete onboarding',
      reason: 'New customer, ensure time-to-value',
    });
  }

  return recommendations;
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║       CustomerTwin Bridge - SalesOS v1.0          ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Twins: ${customerTwins.size}                                       ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
