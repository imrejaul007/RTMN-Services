'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4250;
const CORPID_URL = process.env.CORPID_URL || 'http://corp-id:4702';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

const agents = new Map();
const reviews = new Map();
const categories = [
  'sales', 'marketing', 'operations', 'finance', 'hr',
  'customer-support', 'logistics', 'procurement', 'compliance', 'analytics',
];

function log(msg) { console.log(`[${new Date().toISOString()}] [agent-marketplace] ${msg}`); }

// Seed sample agents
function seedAgents() {
  const samples = [
    { id: 'agent-sales-bot', name: 'Sales Bot Pro', category: 'sales', provider: 'nexha-core', description: 'Autonomous lead qualification and follow-up agent', price: 0.05, rating: 4.8, reviews: 342 },
    { id: 'agent-invoice-agent', name: 'Invoice Agent', category: 'finance', provider: 'nexha-core', description: 'Automated invoice generation and payment follow-up', price: 0.03, rating: 4.6, reviews: 189 },
    { id: 'agent-support-ai', name: 'Support AI', category: 'customer-support', provider: 'nexha-core', description: '24/7 customer support agent with sentiment analysis', price: 0.08, rating: 4.9, reviews: 567 },
    { id: 'agent-procurement-assist', name: 'Procurement Assistant', category: 'procurement', provider: 'nexha-core', description: 'Supplier discovery, RFQ management, and PO creation', price: 0.06, rating: 4.7, reviews: 234 },
    { id: 'agent-logistics-coord', name: 'Logistics Coordinator', category: 'logistics', provider: 'nexha-core', description: 'Shipment tracking, route optimization, delivery scheduling', price: 0.07, rating: 4.5, reviews: 156 },
    { id: 'agent-hr-recruiter', name: 'HR Recruiter', category: 'hr', provider: 'nexha-core', description: 'Resume screening, interview scheduling, offer management', price: 0.05, rating: 4.4, reviews: 98 },
    { id: 'agent-compliance-check', name: 'Compliance Checker', category: 'compliance', provider: 'nexha-core', description: 'Automated regulatory compliance verification', price: 0.10, rating: 4.7, reviews: 87 },
    { id: 'agent-analytics-dash', name: 'Analytics Dashboard Agent', category: 'analytics', provider: 'nexha-core', description: 'Business intelligence reports and anomaly detection', price: 0.04, rating: 4.8, reviews: 412 },
    { id: 'agent-marketing-campaign', name: 'Campaign Manager', category: 'marketing', provider: 'nexha-core', description: 'Multi-channel campaign creation and optimization', price: 0.06, rating: 4.6, reviews: 203 },
    { id: 'agent-ops-automation', name: 'Operations Automation', category: 'operations', provider: 'nexha-core', description: 'Workflow automation, incident management, process optimization', price: 0.09, rating: 4.9, reviews: 445 },
  ];

  for (const a of samples) {
    const agent = {
      id: a.id,
      name: a.name,
      category: a.category,
      provider: a.provider,
      description: a.description,
      price: a.price,
      priceModel: 'per_transaction',
      rating: a.rating,
      reviewCount: a.reviews,
      status: 'active',
      capabilities: [a.category, 'ai-powered', 'autonomous'],
      tier: 'standard',
      certified: true,
      listedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
    agents.set(a.id, agent);
  }
  log(`Seeded ${samples.length} sample agents`);
}

seedAgents();

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nexha-agent-marketplace', version: '0.1.0' }));

// ── List agents ─────────────────────────────────────────────────────
app.get('/api/v1/agents', (req, res) => {
  const { category, provider, minRating, certified, tier, q } = req.query;
  let list = [...agents.values()].filter(a => a.status === 'active');
  if (category) list = list.filter(a => a.category === category);
  if (provider) list = list.filter(a => a.provider === provider);
  if (minRating) list = list.filter(a => a.rating >= parseFloat(minRating));
  if (certified === 'true') list = list.filter(a => a.certified);
  if (tier) list = list.filter(a => a.tier === tier);
  if (q) {
    const query = q.toLowerCase();
    list = list.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
    );
  }
  // Sort by rating desc
  list.sort((a, b) => b.rating - a.rating);
  res.json({ success: true, data: list, total: list.length, categories });
});

// ── Get agent ───────────────────────────────────────────────────────
app.get('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const agentReviews = [...reviews.values()].filter(r => r.agentId === req.params.id);
  res.json({ success: true, data: { ...agent, reviews: agentReviews } });
});

// ── List agent ──────────────────────────────────────────────────────
app.post('/api/v1/agents', (req, res) => {
  const { name, category, description, price, priceModel = 'per_transaction', capabilities = [], tier = 'standard' } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'name and category are required' });
  }
  if (!categories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${categories.join(', ')}` });
  }
  const id = `agent-${uuidv4().slice(0, 12)}`;
  const agent = {
    id,
    name,
    category,
    provider: 'self',
    description: description || '',
    price: price || 0,
    priceModel,
    rating: 0,
    reviewCount: 0,
    status: 'active',
    capabilities,
    tier,
    certified: false,
    listedAt: new Date().toISOString(),
  };
  agents.set(id, agent);
  log(`Agent listed: ${id} (${name})`);
  res.status(201).json({ success: true, data: agent });
});

// ── Update agent ─────────────────────────────────────────────────────
app.put('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { price, description, capabilities, status, tier } = req.body;
  if (price != null) agent.price = price;
  if (description) agent.description = description;
  if (capabilities) agent.capabilities = capabilities;
  if (status) agent.status = status;
  if (tier) agent.tier = tier;
  res.json({ success: true, data: agent });
});

// ── Delete / deprecate agent ─────────────────────────────────────────
app.delete('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  agent.status = 'deprecated';
  res.json({ success: true, data: agent });
});

// ── Add review ───────────────────────────────────────────────────────
app.post('/api/v1/agents/:id/reviews', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const { reviewer, rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating (1-5) is required' });
  }
  const review = {
    id: `review-${uuidv4().slice(0, 12)}`,
    agentId: req.params.id,
    reviewer: reviewer || 'anonymous',
    rating: parseInt(rating),
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };
  reviews.set(review.id, review);
  // Update agent rating
  const agentReviews = [...reviews.values()].filter(r => r.agentId === req.params.id);
  agent.rating = parseFloat((agentReviews.reduce((s, r) => s + r.rating, 0) / agentReviews.length).toFixed(1));
  agent.reviewCount = agentReviews.length;
  log(`Review for ${agent.name}: ${rating}/5`);
  res.status(201).json({ success: true, data: review });
});

// ── Categories ───────────────────────────────────────────────────────
app.get('/api/v1/categories', (_req, res) => {
  const categoryStats = categories.map(cat => {
    const catAgents = [...agents.values()].filter(a => a.category === cat && a.status === 'active');
    return {
      name: cat,
      count: catAgents.length,
      avgRating: catAgents.length ? parseFloat((catAgents.reduce((s, a) => s + a.rating, 0) / catAgents.length).toFixed(1)) : 0,
    };
  });
  res.json({ success: true, data: categoryStats });
});

// ── Promotions ────────────────────────────────────────────────────────
const promotions = new Map();

app.get('/api/v1/promotions', (_req, res) => {
  res.json({ success: true, data: [...promotions.values()] });
});

app.post('/api/v1/promotions', (req, res) => {
  const { agentId, discountPercent, validUntil, message } = req.body;
  if (!agentId || !discountPercent) {
    return res.status(400).json({ error: 'agentId and discountPercent required' });
  }
  const promo = {
    id: `promo-${uuidv4().slice(0, 12)}`,
    agentId,
    discountPercent: parseFloat(discountPercent),
    validUntil,
    message: message || `${discountPercent}% off for a limited time!`,
    createdAt: new Date().toISOString(),
  };
  promotions.set(promo.id, promo);
  res.status(201).json({ success: true, data: promo });
});

// ── Stats ────────────────────────────────────────────────────────────
app.get('/api/v1/stats', (_req, res) => {
  const all = [...agents.values()].filter(a => a.status === 'active');
  const byCategory = {};
  for (const cat of categories) {
    const catAgents = all.filter(a => a.category === cat);
    byCategory[cat] = catAgents.length;
  }
  res.json({
    totalAgents: all.length,
    byCategory,
    certified: all.filter(a => a.certified).length,
    avgRating: all.length ? parseFloat((all.reduce((s, a) => s + a.rating, 0) / all.length).toFixed(1)) : 0,
    totalReviews: reviews.size,
  });
});

app.listen(PORT, () => {
  log(`Nexha Agent Marketplace running on port ${PORT}`);
  log(`  ${agents.size} agents seeded across ${categories.length} categories`);
  log(`  CorpID: ${CORPID_URL}`);
});
