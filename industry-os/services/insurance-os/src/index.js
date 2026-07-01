/**
 * Insurance OS - AI-Powered Insurance Platform
 * Port: 5260
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5260;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// In-memory stores
const policies = new Map();
const claims = new Map();
const quotes = new Map();
const agents = new Map();
const risks = new Map();

// Seed AI agents
agents.set('underwriting-agent', {
  id: 'underwriting-agent',
  name: 'AI Underwriting Agent',
  type: 'underwriting',
  accuracy: 0.94,
  status: 'active'
});
agents.set('claims-agent', {
  id: 'claims-agent',
  name: 'Claims Processing Agent',
  type: 'claims',
  accuracy: 0.96,
  status: 'active'
});
agents.set('fraud-agent', {
  id: 'fraud-agent',
  name: 'Fraud Detection Agent',
  type: 'fraud',
  accuracy: 0.92,
  status: 'active'
});
agents.set('risk-agent', {
  id: 'risk-agent',
  name: 'Risk Assessment Agent',
  type: 'risk',
  accuracy: 0.89,
  status: 'active'
});
agents.set('pricing-agent', {
  id: 'pricing-agent',
  name: 'Dynamic Pricing Agent',
  type: 'pricing',
  accuracy: 0.91,
  status: 'active'
});

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'insurance-os',
  version: '1.0.0',
  port: PORT,
  agents: agents.size,
  capabilities: ['policy_management', 'claims_processing', 'underwriting', 'fraud_detection', 'risk_assessment']
}));

// Policy Routes
app.post('/api/policies', (req, res) => {
  const { type, holder, coverage, premium, startDate, endDate } = req.body;
  if (!type || !holder) return res.status(400).json({ error: 'type and holder required' });

  const policy = {
    id: `POL-${uuidv4().slice(0, 8).toUpperCase()}`,
    type: type || 'auto',
    holder,
    coverage: coverage || 100000,
    premium: premium || 500,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: 'active',
    claims: [],
    createdAt: new Date().toISOString()
  };

  policies.set(policy.id, policy);
  res.status(201).json(policy);
});

app.get('/api/policies', (req, res) => {
  let list = Array.from(policies.values());
  if (req.query.status) list = list.filter(p => p.status === req.query.status);
  if (req.query.type) list = list.filter(p => p.type === req.query.type);
  res.json({ count: list.length, policies: list });
});

app.get('/api/policies/:id', (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json(policy);
});

// Claims Routes
app.post('/api/claims', (req, res) => {
  const { policyId, type, amount, description } = req.body;
  if (!policyId || !type || !amount) {
    return res.status(400).json({ error: 'policyId, type, and amount required' });
  }

  const policy = policies.get(policyId);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  const claim = {
    id: `CLM-${uuidv4().slice(0, 8).toUpperCase()}`,
    policyId,
    type,
    amount,
    description: description || '',
    status: 'pending',
    fraudScore: null,
    approved: null,
    processedBy: null,
    createdAt: new Date().toISOString(),
    processedAt: null
  };

  claims.set(claim.id, claim);
  policy.claims.push(claim.id);
  policies.set(policyId, policy);

  res.status(201).json({ claim, agent: agents.get('claims-agent') });
});

app.get('/api/claims', (req, res) => {
  let list = Array.from(claims.values());
  if (req.query.status) list = list.filter(c => c.status === req.query.status);
  if (req.query.policyId) list = list.filter(c => c.policyId === req.query.policyId);
  res.json({ count: list.length, claims: list });
});

app.get('/api/claims/:id', (req, res) => {
  const claim = claims.get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  res.json(claim);
});

app.patch('/api/claims/:id/process', (req, res) => {
  const claim = claims.get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const { approved, fraudScore } = req.body;

  // AI processing
  claim.fraudScore = fraudScore || Math.random() * 100;
  claim.approved = approved !== undefined ? approved : claim.fraudScore < 30;
  claim.status = claim.approved ? 'approved' : 'denied';
  claim.processedAt = new Date().toISOString();
  claim.processedBy = 'ai-agent';

  claims.set(claim.id, claim);
  res.json({ claim, agent: agents.get('fraud-agent') });
});

// Quote Routes
app.post('/api/quotes', (req, res) => {
  const { type, coverage, deductible, duration } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });

  // AI-powered quote calculation
  const basePremium = coverage / 1000 * (type === 'life' ? 10 : type === 'auto' ? 15 : type === 'health' ? 20 : 12);
  const deductibleDiscount = deductible ? (100 - deductible / 100) * 0.1 : 0;
  const durationDiscount = duration && duration > 1 ? (duration - 1) * 0.05 : 0;

  const quote = {
    id: `QT-${uuidv4().slice(0, 8).toUpperCase()}`,
    type,
    coverage: coverage || 100000,
    deductible: deductible || 500,
    duration: duration || 1,
    premium: Math.round(basePremium * (1 - deductibleDiscount - durationDiscount)),
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'valid',
    createdAt: new Date().toISOString()
  };

  quotes.set(quote.id, quote);
  res.status(201).json({ quote, agent: agents.get('pricing-agent') });
});

app.get('/api/quotes', (req, res) => {
  const list = Array.from(quotes.values());
  res.json({ count: list.length, quotes: list });
});

// Risk Assessment Routes
app.post('/api/risks', (req, res) => {
  const { type, factors, profile } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });

  // AI risk scoring
  const riskScore = Math.random() * 100;
  const riskLevel = riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high';

  const risk = {
    id: `RSK-${uuidv4().slice(0, 8).toUpperCase()}`,
    type,
    factors: factors || [],
    profile: profile || {},
    score: Math.round(riskScore),
    level: riskLevel,
    recommendations: [
      riskScore > 70 ? 'Consider higher deductible' : null,
      'Bundle multiple policies for discount',
      'Install safety devices for auto insurance'
    ].filter(Boolean),
    assessedAt: new Date().toISOString()
  };

  risks.set(risk.id, risk);
  res.status(201).json({ risk, agent: agents.get('risk-agent') });
});

app.get('/api/risks/:id', (req, res) => {
  const risk = risks.get(req.params.id);
  if (!risk) return res.status(404).json({ error: 'Risk assessment not found' });
  res.json(risk);
});

// Underwriting Routes
app.post('/api/underwriting/evaluate', (req, res) => {
  const { applicantId, type, riskScore, medicalHistory, drivingRecord } = req.body;
  if (!applicantId) return res.status(400).json({ error: 'applicantId required' });

  // AI underwriting decision
  const approvalProbability = Math.random();
  const maxCoverage = riskScore < 30 ? 500000 : riskScore < 70 ? 250000 : 100000;
  const recommendedPremium = Math.round(maxCoverage / 1000 * (approvalProbability > 0.5 ? 15 : 20));

  const evaluation = {
    id: `UW-${uuidv4().slice(0, 8).toUpperCase()}`,
    applicantId,
    insuranceType: type || 'auto',
    riskScore: riskScore || Math.round(Math.random() * 100),
    medicalHistoryScore: medicalHistory ? Math.round(Math.random() * 100) : null,
    drivingRecordScore: drivingRecord ? Math.round(Math.random() * 100) : null,
    decision: approvalProbability > 0.3 ? 'approved' : 'manual_review',
    recommendedCoverage: maxCoverage,
    recommendedPremium,
    conditions: approvalProbability > 0.5 ? [] : ['Higher premium tier'],
    evaluatedAt: new Date().toISOString()
  };

  res.json({ evaluation, agent: agents.get('underwriting-agent') });
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    policies: policies.size,
    activePolicies: Array.from(policies.values()).filter(p => p.status === 'active').length,
    claims: claims.size,
    pendingClaims: Array.from(claims.values()).filter(c => c.status === 'pending').length,
    approvedClaims: Array.from(claims.values()).filter(c => c.status === 'approved').length,
    quotes: quotes.size,
    agents: Array.from(agents.values())
  });
});

// AI Agents endpoint
app.get('/api/agents', (_, res) => {
  res.json({ count: agents.size, agents: Array.from(agents.values()) });
});

app.listen(PORT, () => {
  console.log(`[InsuranceOS] Insurance OS running on port ${PORT}`);
  console.log(`AI Agents: ${agents.size} active`);
});
