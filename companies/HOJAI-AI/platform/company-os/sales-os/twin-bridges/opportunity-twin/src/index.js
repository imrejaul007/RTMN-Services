/**
 * OpportunityTwin Bridge - SalesOS
 *
 * Full digital twin for opportunities with:
 * - Deal Info, Stakeholders
 * - Competition, Intelligence
 * - Activities, Documents
 *
 * Port: 5062
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5062;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const opportunityTwins = new Map();

const sampleTwins = [
  {
    id: uuidv4(),
    opportunityId: 'OPP001',
    deal: {
      name: 'TechCorp Enterprise Expansion',
      value: 150000,
      currency: 'INR',
      stage: 'proposal',
      probability: 50,
      closeDate: new Date('2026-08-15'),
      owner: 'SR001',
    },
    stakeholders: {
      champion: { name: 'Rahul Sharma', email: 'rahul@techcorp.in', role: 'VP Engineering', influence: 85, lastContact: new Date() },
      economicBuyer: { name: 'Priya Patel', email: 'priya@techcorp.in', role: 'CFO', influence: 90 },
      technicalBuyer: { name: 'Ankit Gupta', email: 'ankit@techcorp.in', role: 'CTO', influence: 70 },
      blockers: [],
      influencers: [{ name: 'Sneha Reddy', email: 'sneha@techcorp.in', role: 'Manager', influence: 60 }],
    },
    competition: {
      primary: 'Salesforce',
      alternatives: ['HubSpot', 'Zoho'],
      winProbability: 45,
      competitiveFactors: ['Price', 'Integration depth'],
    },
    intelligence: {
      health: 72,
      momentum: 'accelerating',
      missingStakeholders: [],
      riskFactors: ['Long procurement cycle'],
      buyingSignals: ['Budget approved', 'Executive alignment'],
      recommendedActions: ['Schedule executive sponsor call', 'Prepare ROI analysis'],
    },
    activities: {
      lastActivity: new Date(),
      activitiesCount: 24,
      meetingsThisMonth: 4,
      emailsExchanged: 15,
    },
    documents: {
      proposals: ['proposal_v2.pdf'],
      contracts: [],
      other: ['demo_recording.mp4', 'case_study.pdf'],
    },
    confidence: 88,
    lastUpdated: new Date(),
    createdAt: new Date('2026-05-01'),
  },
  {
    id: uuidv4(),
    opportunityId: 'OPP002',
    deal: {
      name: 'Global Retail Analytics Suite',
      value: 80000,
      currency: 'INR',
      stage: 'discovery',
      probability: 25,
      closeDate: new Date('2026-10-01'),
      owner: 'SR002',
    },
    stakeholders: {
      champion: null,
      economicBuyer: { name: 'Neha Gupta', email: 'neha@globalretail.com', role: 'VP Finance', influence: 80 },
      blockers: ['Budget pending', 'Legal review'],
      influencers: [],
    },
    competition: {
      alternatives: ['SAP', 'Oracle'],
      winProbability: 30,
      competitiveFactors: [],
    },
    intelligence: {
      health: 45,
      momentum: 'stable',
      missingStakeholders: ['Champion', 'Technical Buyer'],
      riskFactors: ['No champion', 'Budget freeze', 'Legal review'],
      buyingSignals: [],
      recommendedActions: ['Identify champion', 'Address legal concerns'],
    },
    activities: {
      lastActivity: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      activitiesCount: 8,
      meetingsThisMonth: 1,
      emailsExchanged: 5,
    },
    documents: {
      proposals: [],
      contracts: [],
      other: [],
    },
    confidence: 65,
    lastUpdated: new Date(),
    createdAt: new Date('2026-06-01'),
  },
];

sampleTwins.forEach(t => opportunityTwins.set(t.id, t));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OpportunityTwin Bridge',
    version: '1.0.0',
    port: PORT,
    twinsCount: opportunityTwins.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ success: true, twins: Array.from(opportunityTwins.values()) });
});

app.get('/:id', (req, res) => {
  const twin = opportunityTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'OpportunityTwin not found' });
  res.json({ success: true, twin });
});

app.post('/', (req, res) => {
  const twin = {
    id: uuidv4(),
    opportunityId: req.body.opportunityId,
    deal: req.body.deal,
    stakeholders: req.body.stakeholders || { blockers: [], influencers: [] },
    competition: req.body.competition || { alternatives: [], winProbability: 50, competitiveFactors: [] },
    intelligence: {
      health: 70,
      momentum: 'stable',
      missingStakeholders: [],
      riskFactors: [],
      buyingSignals: [],
      recommendedActions: [],
    },
    activities: {
      lastActivity: new Date(),
      activitiesCount: 0,
      meetingsThisMonth: 0,
      emailsExchanged: 0,
    },
    documents: { proposals: [], contracts: [], other: [] },
    confidence: 100,
    lastUpdated: new Date(),
    createdAt: new Date(),
  };
  opportunityTwins.set(twin.id, twin);
  res.status(201).json({ success: true, twin });
});

app.put('/:id', (req, res) => {
  const twin = opportunityTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'OpportunityTwin not found' });
  const updated = { ...twin, ...req.body, lastUpdated: new Date() };
  opportunityTwins.set(twin.id, updated);
  res.json({ success: true, twin: updated });
});

// ============================================================
// SCORING
// ============================================================

app.post('/:id/score', (req, res) => {
  const twin = opportunityTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'OpportunityTwin not found' });

  twin.intelligence.health = calculateHealth(twin);
  twin.intelligence.momentum = calculateMomentum(twin);
  twin.intelligence.missingStakeholders = findMissing(twin);
  twin.intelligence.riskFactors = identifyRisks(twin);
  twin.intelligence.buyingSignals = detectSignals(twin);
  twin.intelligence.recommendedActions = generateActions(twin);
  twin.deal.probability = twin.intelligence.health;
  twin.lastUpdated = new Date();

  opportunityTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

app.post('/:id/activity', (req, res) => {
  const twin = opportunityTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'OpportunityTwin not found' });

  const { type, count = 1 } = req.body;
  twin.activities.lastActivity = new Date();
  twin.activities.activitiesCount += count;
  if (type === 'meeting') twin.activities.meetingsThisMonth += count;
  if (type === 'email') twin.activities.emailsExchanged += count;

  opportunityTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

// ============================================================
// HELPERS
// ============================================================

function calculateHealth(twin) {
  let health = twin.deal.probability || 50;
  if (!twin.stakeholders.champion) health -= 20;
  if (!twin.stakeholders.economicBuyer) health -= 15;
  if (twin.stakeholders.blockers.length > 0) health -= 25;
  const daysSince = (Date.now() - new Date(twin.activities.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 14) health -= 20;
  if (daysSince > 30) health -= 15;
  if (twin.competition.primary) health -= 10;
  return Math.min(100, Math.max(0, health));
}

function calculateMomentum(twin) {
  if (twin.activities.meetingsThisMonth > 3) return 'accelerating';
  if (twin.activities.meetingsThisMonth < 1) return 'decelerating';
  return 'stable';
}

function findMissing(twin) {
  const missing = [];
  if (!twin.stakeholders.champion) missing.push('Champion');
  if (!twin.stakeholders.economicBuyer) missing.push('Economic Buyer');
  if (!twin.stakeholders.technicalBuyer) missing.push('Technical Buyer');
  return missing;
}

function identifyRisks(twin) {
  const risks = [];
  if (!twin.stakeholders.champion) risks.push('No champion identified');
  if (twin.stakeholders.blockers.length > 0) risks.push('Blocker(s) present');
  if (twin.competition.primary) risks.push(`Competing with ${twin.competition.primary}`);
  if (twin.deal.closeDate && new Date(twin.deal.closeDate) < new Date()) risks.push('Close date passed');
  return risks;
}

function detectSignals(twin) {
  const signals = [];
  if (twin.activities.meetingsThisMonth > 2) signals.push('Increased engagement');
  if (twin.deal.probability > 75) signals.push('High probability');
  if (twin.stakeholders.champion) signals.push('Champion engaged');
  if (twin.documents.contracts.length > 0) signals.push('Contract in review');
  return signals;
}

function generateActions(twin) {
  const actions = [];
  if (!twin.stakeholders.champion) actions.push('Schedule meeting with potential champion');
  if (twin.stakeholders.blockers.length > 0) actions.push('Address blocker concerns');
  if (twin.intelligence.momentum === 'decelerating') actions.push('Increase touchpoints');
  if (twin.deal.stage === 'proposal') actions.push('Send proposal follow-up');
  if (twin.deal.stage === 'negotiation') actions.push('Involve executive sponsor');
  return actions;
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║    OpportunityTwin Bridge - SalesOS v1.0         ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Twins: ${opportunityTwins.size}                                       ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
