/**
 * Hojai AI Marketplace
 * Public marketplace for third-party AI agents
 *
 * Features:
 * - Agent catalog with search/browse
 * - Third-party agent submission
 * - Ratings and reviews
 * - Transaction infrastructure
 * - Revenue sharing
 * - Agent certification
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4550;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());

// ============================================
// TYPES
// ============================================

interface Agent {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'sales' | 'hr' | 'finance' | 'healthcare' | 'legal' | 'marketing' | 'operations' | 'custom';
  tags: string[];
  provider: {
    id: string;
    name: string;
    verified: boolean;
    rating: number;
    totalAgents: number;
  };
  pricing: {
    model: 'per_conversation' | 'per_minute' | 'per_task' | 'monthly' | 'freemium';
    price: number;
    currency: string;
    minSubscription?: number;
  };
  capabilities: {
    languages: string[];
    channels: ('whatsapp' | 'chat' | 'email' | 'voice' | 'api')[];
    industries: string[];
    integrations: string[];
  };
  metrics: {
    installations: number;
    rating: number;
    reviews: number;
    avgResponseTime: number;
    uptime: number;
  };
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'featured' | 'archived';
  certification?: {
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    auditedBy: string;
    certifiedAt: Date;
    expiresAt: Date;
  };
  media: {
    icon: string;
    screenshots: string[];
    demoVideo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Review {
  id: string;
  agentId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  useCase: string;
  helpful: number;
  verified: boolean;
  status: 'pending' | 'approved' | 'flagged';
  createdAt: Date;
}

interface Transaction {
  id: string;
  agentId: string;
  buyerId: string;
  providerId: string;
  type: 'subscription' | 'one_time' | 'usage';
  amount: number;
  platformFee: number;
  providerPayout: number;
  status: 'pending' | 'completed' | 'refunded' | 'disputed';
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface Subscription {
  id: string;
  agentId: string;
  userId: string;
  plan: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

// In-memory stores
const agents = new Map<string, Agent>();
const reviews = new Map<string, Review>();
const transactions = new Map<string, Transaction>();
const subscriptions = new Map<string, Subscription>();

// Platform fee: 15%
const PLATFORM_FEE_RATE = 0.15;

// ============================================
// SEED DATA
// ============================================

function seedData() {
  const seedAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Legal Document Analyzer',
      description: 'AI agent that reviews, analyzes, and summarizes legal documents. Perfect for law firms and legal departments.',
      category: 'legal',
      tags: ['legal', 'document', 'analysis', 'contracts', 'NDA'],
      provider: { id: 'prov-1', name: 'LegalTech AI', verified: true, rating: 4.8, totalAgents: 5 },
      pricing: { model: 'monthly', price: 29999, currency: 'INR', minSubscription: 1 },
      capabilities: {
        languages: ['en', 'hi'],
        channels: ['api', 'chat'],
        industries: ['legal', 'finance', 'corporate'],
        integrations: ['DocuSign', 'Google Drive', 'Dropbox']
      },
      metrics: { installations: 234, rating: 4.7, reviews: 48, avgResponseTime: 2.3, uptime: 99.9 },
      status: 'featured',
      certification: { level: 'platinum', auditedBy: 'Hojai', certifiedAt: new Date('2026-01-15'), expiresAt: new Date('2027-01-15') },
      media: { icon: '⚖️', screenshots: [] },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date()
    },
    {
      id: 'agent-2',
      name: 'HR Resume Screener',
      description: 'Intelligent resume screening agent that ranks candidates based on job requirements. Saves 70% of screening time.',
      category: 'hr',
      tags: ['hr', 'recruitment', 'screening', 'hiring', 'ATS'],
      provider: { id: 'prov-2', name: 'TalentAI Labs', verified: true, rating: 4.6, totalAgents: 3 },
      pricing: { model: 'per_task', price: 50, currency: 'INR' },
      capabilities: {
        languages: ['en', 'hi', 'ta', 'te'],
        channels: ['api', 'chat', 'email'],
        industries: ['tech', 'finance', 'healthcare', 'retail'],
        integrations: ['Workday', 'Greenhouse', 'LinkedIn']
      },
      metrics: { installations: 567, rating: 4.5, reviews: 123, avgResponseTime: 1.8, uptime: 99.8 },
      status: 'approved',
      certification: { level: 'gold', auditedBy: 'Hojai', certifiedAt: new Date('2026-02-01'), expiresAt: new Date('2027-02-01') },
      media: { icon: '👔', screenshots: [] },
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date()
    },
    {
      id: 'agent-3',
      name: 'Financial Report Generator',
      description: 'Automatically generates quarterly financial reports, investor presentations, and compliance documents.',
      category: 'finance',
      tags: ['finance', 'reports', 'accounting', 'compliance', 'CFO'],
      provider: { id: 'prov-3', name: 'FinBot Solutions', verified: true, rating: 4.9, totalAgents: 8 },
      pricing: { model: 'monthly', price: 49999, currency: 'INR', minSubscription: 1 },
      capabilities: {
        languages: ['en'],
        channels: ['api', 'chat'],
        industries: ['finance', 'banking', 'investment'],
        integrations: ['QuickBooks', 'Xero', 'Tally', 'SAP']
      },
      metrics: { installations: 189, rating: 4.8, reviews: 34, avgResponseTime: 3.1, uptime: 99.95 },
      status: 'featured',
      certification: { level: 'platinum', auditedBy: 'Hojai', certifiedAt: new Date('2026-01-20'), expiresAt: new Date('2027-01-20') },
      media: { icon: '📊', screenshots: [] },
      createdAt: new Date('2025-12-15'),
      updatedAt: new Date()
    },
    {
      id: 'agent-4',
      name: 'Healthcare Appointment Bot',
      description: 'Manages patient appointments, sends reminders, handles rescheduling for clinics and hospitals.',
      category: 'healthcare',
      tags: ['healthcare', 'appointments', 'clinics', 'hospitals', 'telemedicine'],
      provider: { id: 'prov-4', name: 'MediBot Inc', verified: true, rating: 4.7, totalAgents: 4 },
      pricing: { model: 'per_conversation', price: 5, currency: 'INR' },
      capabilities: {
        languages: ['en', 'hi', 'bn', 'ta', 'te', 'mr'],
        channels: ['whatsapp', 'chat', 'voice', 'api'],
        industries: ['healthcare', 'pharma', 'wellness'],
        integrations: [' Practo', 'BookMyDoc', 'Lybrate']
      },
      metrics: { installations: 892, rating: 4.6, reviews: 256, avgResponseTime: 0.8, uptime: 99.7 },
      status: 'approved',
      certification: { level: 'gold', auditedBy: 'Hojai', certifiedAt: new Date('2026-03-01'), expiresAt: new Date('2027-03-01') },
      media: { icon: '🏥', screenshots: [] },
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date()
    },
    {
      id: 'agent-5',
      name: 'Marketing Content Generator',
      description: 'Creates social media posts, email campaigns, blog articles, and ad copies with brand voice training.',
      category: 'marketing',
      tags: ['marketing', 'content', 'social media', 'email', 'copywriting'],
      provider: { id: 'prov-5', name: 'ContentAI Studio', verified: false, rating: 4.3, totalAgents: 2 },
      pricing: { model: 'freemium', price: 0, currency: 'INR' },
      capabilities: {
        languages: ['en', 'hi'],
        channels: ['api', 'chat'],
        industries: ['retail', 'ecommerce', 'agency'],
        integrations: ['Canva', 'Buffer', 'Mailchimp']
      },
      metrics: { installations: 2341, rating: 4.2, reviews: 567, avgResponseTime: 2.5, uptime: 99.5 },
      status: 'approved',
      media: { icon: '📝', screenshots: [] },
      createdAt: new Date('2026-04-01'),
      updatedAt: new Date()
    }
  ];

  seedAgents.forEach(agent => agents.set(agent.id, agent));
  console.log(`Seeded ${seedAgents.length} agents`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateProviderPayout(amount: number): { platformFee: number; providerPayout: number } {
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
  const providerPayout = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, providerPayout };
}

// ============================================
// MARKETPLACE APIs
// ============================================

// Health check
app.get('/health', (_req, res) => {
  res.json({
    service: 'hojai-marketplace',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: {
      totalAgents: agents.size,
      featuredAgents: Array.from(agents.values()).filter(a => a.status === 'featured').length,
      totalInstallations: Array.from(agents.values()).reduce((sum, a) => sum + a.metrics.installations, 0)
    }
  });
});

// ============================================
// AGENT CATALOG APIs
// ============================================

// Browse/search agents
app.get('/api/agents', (req, res) => {
  const {
    category,
    search,
    minRating,
    maxPrice,
    language,
    channel,
    industry,
    sort = 'popular',
    page = 1,
    limit = 20
  } = req.query;

  let results = Array.from(agents.values()).filter(a =>
    a.status === 'approved' || a.status === 'featured'
  );

  // Filters
  if (category) {
    results = results.filter(a => a.category === category);
  }
  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  if (minRating) {
    results = results.filter(a => a.metrics.rating >= Number(minRating));
  }
  if (maxPrice) {
    results = results.filter(a => a.pricing.price <= Number(maxPrice));
  }
  if (language) {
    results = results.filter(a => a.capabilities.languages.includes(String(language)));
  }
  if (channel) {
    results = results.filter(a => a.capabilities.channels.includes(String(channel) as any));
  }
  if (industry) {
    results = results.filter(a => a.capabilities.industries.includes(String(industry)));
  }

  // Sorting
  switch (sort) {
    case 'popular':
      results.sort((a, b) => b.metrics.installations - a.metrics.installations);
      break;
    case 'rating':
      results.sort((a, b) => b.metrics.rating - a.metrics.rating);
      break;
    case 'price_low':
      results.sort((a, b) => a.pricing.price - b.pricing.price);
      break;
    case 'price_high':
      results.sort((a, b) => b.pricing.price - a.pricing.price);
      break;
    case 'newest':
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
  }

  // Featured first
  results = [
    ...results.filter(a => a.status === 'featured'),
    ...results.filter(a => a.status !== 'featured')
  ];

  // Pagination
  const start = (Number(page) - 1) * Number(limit);
  const paginated = results.slice(start, start + Number(limit));

  res.json({
    success: true,
    data: paginated,
    meta: {
      total: results.length,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(results.length / Number(limit))
    }
  });
});

// Get featured agents
app.get('/api/agents/featured', (_req, res) => {
  const featured = Array.from(agents.values())
    .filter(a => a.status === 'featured')
    .sort((a, b) => b.metrics.rating - a.metrics.rating);

  res.json({ success: true, data: featured });
});

// Get single agent
app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  // Get reviews for this agent
  const agentReviews = Array.from(reviews.values())
    .filter(r => r.agentId === req.params.id && r.status === 'approved')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({
    success: true,
    data: { ...agent, reviews: agentReviews }
  });
});

// Get agents by category
app.get('/api/agents/category/:category', (req, res) => {
  const categoryAgents = Array.from(agents.values())
    .filter(a => a.category === req.params.category && (a.status === 'approved' || a.status === 'featured'))
    .sort((a, b) => b.metrics.installations - a.metrics.installations);

  res.json({ success: true, data: categoryAgents });
});

// Get agent categories
app.get('/api/categories', (_req, res) => {
  const categories = [
    { id: 'support', name: 'Customer Support', icon: '🎧', count: 0 },
    { id: 'sales', name: 'Sales & CRM', icon: '💰', count: 0 },
    { id: 'hr', name: 'Human Resources', icon: '👔', count: 0 },
    { id: 'finance', name: 'Finance & Accounting', icon: '📊', count: 0 },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥', count: 0 },
    { id: 'legal', name: 'Legal', icon: '⚖️', count: 0 },
    { id: 'marketing', name: 'Marketing', icon: '📢', count: 0 },
    { id: 'operations', name: 'Operations', icon: '⚙️', count: 0 },
    { id: 'custom', name: 'Custom Agents', icon: '🤖', count: 0 }
  ];

  categories.forEach(cat => {
    cat.count = Array.from(agents.values())
      .filter(a => a.category === cat.id && a.status !== 'archived')
      .length;
  });

  res.json({ success: true, data: categories });
});

// ============================================
// AGENT SUBMISSION APIs (Third-party providers)
// ============================================

// Submit new agent
app.post('/api/agents', (req, res) => {
  const {
    name, description, category, tags, provider, pricing, capabilities, media
  } = req.body;

  if (!name || !description || !category || !provider || !pricing) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
    });
    return;
  }

  const id = `agent-${uuidv4().slice(0, 8)}`;
  const agent: Agent = {
    id,
    name,
    description,
    category,
    tags: tags || [],
    provider: {
      id: provider.id || `prov-${uuidv4().slice(0, 8)}`,
      name: provider.name,
      verified: false,
      rating: 0,
      totalAgents: 1
    },
    pricing: {
      model: pricing.model || 'per_conversation',
      price: pricing.price || 0,
      currency: pricing.currency || 'INR'
    },
    capabilities: {
      languages: capabilities?.languages || ['en'],
      channels: capabilities?.channels || ['chat'],
      industries: capabilities?.industries || [],
      integrations: capabilities?.integrations || []
    },
    metrics: { installations: 0, rating: 0, reviews: 0, avgResponseTime: 0, uptime: 0 },
    status: 'draft',
    media: {
      icon: media?.icon || '🤖',
      screenshots: media?.screenshots || []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  agents.set(id, agent);

  res.status(201).json({
    success: true,
    data: agent,
    message: 'Agent submitted. It will be reviewed within 48 hours.'
  });
});

// Update agent
app.patch('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  // Only allow updates to draft or approved agents
  if (agent.status === 'archived') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Cannot update archived agent' }
    });
    return;
  }

  const updates = req.body;
  Object.assign(agent, updates, { updatedAt: new Date() });
  agents.set(agent.id, agent);

  res.json({ success: true, data: agent });
});

// Submit agent for review
app.post('/api/agents/:id/submit', (req, res) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  if (agent.status !== 'draft') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Only draft agents can be submitted' }
    });
    return;
  }

  agent.status = 'pending_review';
  agent.updatedAt = new Date();
  agents.set(agent.id, agent);

  res.json({
    success: true,
    data: agent,
    message: 'Agent submitted for review. You will be notified within 48 hours.'
  });
});

// ============================================
// ADMIN APIs (Certification & Moderation)
// ============================================

// Approve agent
app.post('/api/admin/agents/:id/approve', (req, res) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  agent.status = 'approved';
  agent.updatedAt = new Date();
  agents.set(agent.id, agent);

  res.json({ success: true, data: agent, message: 'Agent approved' });
});

// Feature agent
app.post('/api/admin/agents/:id/feature', (req, res) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  agent.status = 'featured';
  agent.updatedAt = new Date();
  agents.set(agent.id, agent);

  res.json({ success: true, data: agent, message: 'Agent featured' });
});

// Certify agent
app.post('/api/admin/agents/:id/certify', (req, res) => {
  const { level, expiresIn = 365 } = req.body;
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  agent.certification = {
    level,
    auditedBy: 'Hojai',
    certifiedAt: new Date(),
    expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
  };
  agent.updatedAt = new Date();
  agents.set(agent.id, agent);

  res.json({ success: true, data: agent, message: `Agent certified as ${level}` });
});

// Reject agent
app.post('/api/admin/agents/:id/reject', (req, res) => {
  const { reason } = req.body;
  const agent = agents.get(req.params.id);

  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  agent.status = 'rejected';
  agent.updatedAt = new Date();
  agents.set(agent.id, agent);

  res.json({ success: true, data: agent, message: `Agent rejected: ${reason || 'No reason provided'}` });
});

// ============================================
// REVIEW APIs
// ============================================

// Get reviews for agent
app.get('/api/agents/:id/reviews', (req, res) => {
  const { sort = 'recent', page = 1, limit = 10 } = req.query;

  let agentReviews = Array.from(reviews.values())
    .filter(r => r.agentId === req.params.id && r.status === 'approved');

  switch (sort) {
    case 'helpful':
      agentReviews.sort((a, b) => b.helpful - a.helpful);
      break;
    case 'rating_high':
      agentReviews.sort((a, b) => b.rating - a.rating);
      break;
    case 'rating_low':
      agentReviews.sort((a, b) => a.rating - b.rating);
      break;
    default:
      agentReviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const start = (Number(page) - 1) * Number(limit);
  const paginated = agentReviews.slice(start, start + Number(limit));

  res.json({
    success: true,
    data: paginated,
    meta: { total: agentReviews.length, page: Number(page), limit: Number(limit) }
  });
});

// Submit review
app.post('/api/reviews', (req, res) => {
  const { agentId, userId, userName, rating, title, content, pros, cons, useCase } = req.body;

  if (!agentId || !userId || !rating || !content) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
    });
    return;
  }

  const agent = agents.get(agentId);
  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  // Check if user already reviewed
  const existingReview = Array.from(reviews.values())
    .find(r => r.agentId === agentId && r.userId === userId);

  if (existingReview) {
    res.status(400).json({
      success: false,
      error: { code: 'ALREADY_REVIEWED', message: 'You have already reviewed this agent' }
    });
    return;
  }

  const id = `review-${uuidv4().slice(0, 8)}`;
  const review: Review = {
    id,
    agentId,
    userId,
    userName: userName || 'Anonymous',
    rating,
    title: title || '',
    content,
    pros: pros || [],
    cons: cons || [],
    useCase: useCase || '',
    helpful: 0,
    verified: true, // Would verify subscription in production
    status: 'approved',
    createdAt: new Date()
  };

  reviews.set(id, review);

  // Update agent rating
  const agentReviews = Array.from(reviews.values()).filter(r => r.agentId === agentId);
  const avgRating = agentReviews.reduce((sum, r) => sum + r.rating, 0) / agentReviews.length;
  agent.metrics.rating = Math.round(avgRating * 10) / 10;
  agent.metrics.reviews = agentReviews.length;
  agents.set(agent.id, agent);

  res.status(201).json({ success: true, data: review });
});

// Mark review helpful
app.post('/api/reviews/:id/helpful', (_req, res) => {
  const review = reviews.get(req.params.id);

  if (!review) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Review not found' }
    });
    return;
  }

  review.helpful++;
  reviews.set(review.id, review);

  res.json({ success: true, data: { helpful: review.helpful } });
});

// ============================================
// TRANSACTION APIs
// ============================================

// Subscribe to agent
app.post('/api/subscribe', (req, res) => {
  const { agentId, userId, plan } = req.body;

  const agent = agents.get(agentId);
  if (!agent) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Agent not found' }
    });
    return;
  }

  const subscriptionId = `sub-${uuidv4().slice(0, 8)}`;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subscription: Subscription = {
    id: subscriptionId,
    agentId,
    userId,
    plan: plan || 'monthly',
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    autoRenew: true,
    cancelAtPeriodEnd: false
  };

  subscriptions.set(subscriptionId, subscription);

  // Record transaction
  const amount = agent.pricing.price;
  const { platformFee, providerPayout } = calculateProviderPayout(amount);

  const transactionId = `txn-${uuidv4().slice(0, 8)}`;
  const transaction: Transaction = {
    id: transactionId,
    agentId,
    buyerId: userId,
    providerId: agent.provider.id,
    type: 'subscription',
    amount,
    platformFee,
    providerPayout,
    status: 'completed',
    metadata: { subscriptionId },
    createdAt: new Date()
  };

  transactions.set(transactionId, transaction);

  // Update agent installations
  agent.metrics.installations++;
  agents.set(agent.id, agent);

  res.status(201).json({
    success: true,
    data: { subscription, transaction }
  });
});

// Get user subscriptions
app.get('/api/subscriptions/:userId', (req, res) => {
  const userSubs = Array.from(subscriptions.values())
    .filter(s => s.userId === req.params.userId && s.status === 'active');

  const subsWithAgents = userSubs.map(sub => ({
    ...sub,
    agent: agents.get(sub.agentId)
  }));

  res.json({ success: true, data: subsWithAgents });
});

// Cancel subscription
app.post('/api/subscriptions/:id/cancel', (req, res) => {
  const subscription = subscriptions.get(req.params.id);

  if (!subscription) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Subscription not found' }
    });
    return;
  }

  subscription.cancelAtPeriodEnd = true;
  subscriptions.set(subscription.id, subscription);

  res.json({
    success: true,
    data: subscription,
    message: 'Subscription will be cancelled at period end'
  });
});

// ============================================
// ANALYTICS APIs
// ============================================

// Marketplace stats
app.get('/api/stats', (_req, res) => {
  const allAgents = Array.from(agents.values());
  const activeAgents = allAgents.filter(a => a.status === 'approved' || a.status === 'featured');

  res.json({
    success: true,
    data: {
      totalAgents: activeAgents.length,
      featuredAgents: allAgents.filter(a => a.status === 'featured').length,
      totalInstallations: activeAgents.reduce((sum, a) => sum + a.metrics.installations, 0),
      totalReviews: activeAgents.reduce((sum, a) => sum + a.metrics.reviews, 0),
      avgRating: activeAgents.length > 0
        ? Math.round(activeAgents.reduce((sum, a) => sum + a.metrics.rating, 0) / activeAgents.length * 10) / 10
        : 0,
      totalTransactions: transactions.size,
      totalRevenue: Array.from(transactions.values())
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      platformRevenue: Array.from(transactions.values())
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.platformFee, 0)
    }
  });
});

// Provider analytics
app.get('/api/provider/:providerId/analytics', (req, res) => {
  const providerAgents = Array.from(agents.values())
    .filter(a => a.provider.id === req.params.providerId);

  const providerTransactions = Array.from(transactions.values())
    .filter(t => t.providerId === req.params.providerId);

  res.json({
    success: true,
    data: {
      agents: providerAgents.length,
      totalInstallations: providerAgents.reduce((sum, a) => sum + a.metrics.installations, 0),
      avgRating: providerAgents.length > 0
        ? Math.round(providerAgents.reduce((sum, a) => sum + a.metrics.rating, 0) / providerAgents.length * 10) / 10
        : 0,
      totalRevenue: providerTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.providerPayout, 0),
      pendingPayout: providerTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.providerPayout, 0) * 0.1, // 10% held
      transactions: providerTransactions.length
    }
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
  });
});

// Start server
seedData();
app.listen(PORT, () => {
  console.log(`🚀 Hojai AI Marketplace running on port ${PORT}`);
  console.log(`🤖 ${agents.size} agents in marketplace`);
  console.log(`📦 ${transactions.size} transactions`);
});

export default app;
