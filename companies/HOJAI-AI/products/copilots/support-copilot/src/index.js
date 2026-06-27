const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require("uuid");
const rezIntel = require("./rez-intel-client");

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4925;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// In-memory stores (replace with MongoDB/Postgres in production)
// ============================================================
const tickets = new Map([
  ['tkt-001', {
    id: 'tkt-001',
    subject: 'Cannot login to dashboard',
    customer: 'acme-corp',
    status: 'open',
    priority: 'high',
    category: 'technical',
    messages: [
      { from: 'customer', text: 'I cannot log in to my dashboard since this morning.', timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }],
  ['tkt-002', {
    id: 'tkt-002',
    subject: 'Billing question about annual plan',
    customer: 'globex',
    status: 'pending',
    priority: 'medium',
    category: 'billing',
    messages: [
      { from: 'customer', text: 'Can you explain the difference between Pro and Enterprise annual plans?', timestamp: new Date().toISOString() }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]
]);

const articles = new Map([
  ['art-1', { id: 'art-1', title: 'How to reset your password', category: 'account', body: 'To reset your password, go to Settings > Security > Reset Password...', helpful: 85, views: 1247 }],
  ['art-2', { id: 'art-2', title: 'Billing FAQ', category: 'billing', body: 'Common questions about plans, invoices, and payment methods...', helpful: 72, views: 892 }],
  ['art-3', { id: 'art-3', title: 'Getting started with your dashboard', category: 'onboarding', body: 'Welcome! Here are the first steps to set up your workspace...', helpful: 91, views: 2103 }]
]);

const conversations = new PersistentMap('conversations', { serviceName: 'support-copilot' });
const macros = new Map([
  ['mac-1', { id: 'mac-1', name: 'Greeting', body: 'Hi! How can I help you today?', category: 'greeting' }],
  ['mac-2', { id: 'mac-2', name: 'Closing', body: 'Glad I could help! Anything else?', category: 'closing' }]
]);

// ============================================================
// Health & Info
// ============================================================
app.get('/health', (req, res) => res.json({
  status: 'healthy',
  service: 'support-copilot',
  version: '1.0.0',
  port: PORT,
  counts: { tickets: tickets.size, articles: articles.size, conversations: conversations.size, macros: macros.size },
  timestamp: new Date().toISOString()
}));

app.get('/', (req, res) => res.json({
  service: 'Support Copilot',
  version: '1.0.0',
  port: PORT,
  status: 'running',
  capabilities: [
    '/api/analyze - Analyze support message for intent',
    '/api/summarize - Summarize a conversation',
    '/api/suggest - Suggest responses based on context',
    '/api/auto-reply - Generate auto-reply for ticket',
    '/api/tickets - List/filter tickets',
    '/api/tickets/:id - Get ticket details',
    '/api/tickets/:id/reply - Add reply to ticket',
    '/api/tickets/:id/close - Close ticket',
    '/api/articles - List knowledge base articles',
    '/api/articles/:id - Get article',
    '/api/search - Search knowledge base',
    '/api/categorize - Auto-categorize ticket',
    '/api/priority - Suggest priority',
    '/api/macros - List response macros',
    '/api/sentiment - Analyze message sentiment',
    '/api/escalate - Check if ticket needs escalation',
    '/api/conversations - List active conversations',
    '/api/stats - Get support statistics'
  ]
}));

// ============================================================
// AI Analysis endpoints
// ============================================================
app.post('/api/analyze',requireAuth,  (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  // Simple keyword-based intent detection
  const lower = message.toLowerCase();
  let intent = 'general';
  if (lower.match(/password|login|sign in|auth/)) intent = 'account_access';
  else if (lower.match(/bill|invoice|charge|payment|refund/)) intent = 'billing';
  else if (lower.match(/bug|error|broken|crash|not working/)) intent = 'technical';
  else if (lower.match(/cancel|delete|close account/)) intent = 'cancellation';
  else if (lower.match(/upgrade|plan|subscription/)) intent = 'sales';

  res.json({
    id: uuidv4(),
    message,
    intent,
    confidence: 0.85,
    suggestions: [
      `Search knowledge base for "${intent}"`,
      'Create a new ticket',
      'Suggest relevant article'
    ],
    relatedArticles: Array.from(articles.values())
      .filter(a => a.category === intent.split('_')[0] || a.category === 'account')
      .slice(0, 3)
      .map(a => ({ id: a.id, title: a.title }))
  });
});

app.post('/api/summarize',requireAuth,  (req, res) => {
  const { ticketId, conversation } = req.body;
  if (!ticketId && !conversation) return res.status(400).json({ error: 'ticketId or conversation required' });

  let text = conversation;
  if (ticketId && tickets.has(ticketId)) {
    const t = tickets.get(ticketId);
    text = t.messages.map(m => `${m.from}: ${m.text}`).join('\n');
  }

  if (!text) return res.status(404).json({ error: 'Ticket not found' });

  // Simple summary
  const firstSentence = text.split(/[.!?]/).filter(s => s.trim())[0] || 'No content';
  res.json({
    ticketId,
    summary: firstSentence.trim().slice(0, 200),
    messageCount: text.split('\n').length,
    priority: text.toLowerCase().includes('urgent') ? 'high' : 'medium',
    category: text.toLowerCase().includes('bill') ? 'billing' : 'general',
    sentiment: text.toLowerCase().includes('angry') || text.toLowerCase().includes('frustrated') ? 'negative' : 'neutral'
  });
});

app.post('/api/suggest',requireAuth,  (req, res) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  res.json({
    suggestions: [
      { id: uuidv4(), text: 'I understand your concern. Let me help you with that.', confidence: 0.9 },
      { id: uuidv4(), text: 'Could you provide more details about the issue?', confidence: 0.85 },
      { id: uuidv4(), text: 'I will look into this and get back to you shortly.', confidence: 0.82 }
    ],
    context: context || 'general'
  });
});

app.post('/api/auto-reply',requireAuth,  (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId || !tickets.has(ticketId)) return res.status(404).json({ error: 'Ticket not found' });

  const ticket = tickets.get(ticketId);
  const reply = `Hi! Thanks for reaching out about "${ticket.subject}". I've received your message and our team is looking into it. We'll get back to you within 24 hours.`;

  res.json({
    ticketId,
    reply,
    macro: 'mac-1',
    confidence: 0.88
  });
});

app.post('/api/sentiment',requireAuth,  (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const lower = message.toLowerCase();
  const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'hate', 'worst', 'unacceptable'];
  const positiveWords = ['thanks', 'great', 'awesome', 'love', 'perfect', 'excellent', 'amazing'];

  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  const posCount = positiveWords.filter(w => lower.includes(w)).length;

  let sentiment = 'neutral';
  let score = 0;
  if (negCount > posCount) { sentiment = 'negative'; score = -0.5 - (negCount * 0.2); }
  else if (posCount > negCount) { sentiment = 'positive'; score = 0.5 + (posCount * 0.2); }

  res.json({
    message,
    sentiment,
    score: Math.max(-1, Math.min(1, score)),
    needsAttention: sentiment === 'negative' && score < -0.7
  });
});

app.post('/api/categorize',requireAuth,  (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const lower = message.toLowerCase();
  const categories = {
    'technical': ['bug', 'error', 'broken', 'crash', 'not working', 'issue'],
    'billing': ['bill', 'invoice', 'charge', 'payment', 'refund', 'price'],
    'account': ['password', 'login', 'sign', 'account', 'access', 'permission'],
    'feature_request': ['feature', 'request', 'suggestion', 'would like', 'could you add'],
    'general': []
  };

  let bestCategory = 'general';
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(categories)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestCategory = cat; }
  }

  res.json({ category: bestCategory, confidence: Math.min(1, 0.5 + bestScore * 0.2) });
});

app.post('/api/priority',requireAuth,  (req, res) => {
  const { message, customerTier } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const lower = message.toLowerCase();
  let priority = 'low';
  if (lower.match(/urgent|critical|asap|immediately|emergency/)) priority = 'urgent';
  else if (lower.match(/important|broken|cannot|can't/)) priority = 'high';
  else if (lower.match(/when|how|question|help/)) priority = 'medium';

  // Customer tier boost
  if (customerTier === 'enterprise' && priority !== 'urgent') priority = priority === 'low' ? 'medium' : 'high';
  if (customerTier === 'platinum' && priority === 'low') priority = 'medium';

  res.json({ priority, reasoning: `Based on keywords and customer tier (${customerTier || 'standard'})` });
});

app.post('/api/escalate',requireAuth,  (req, res) => {
  const { ticketId, message } = req.body;
  const lower = (message || '').toLowerCase();
  const reasons = [];

  if (lower.match(/urgent|critical|emergency|legal|lawsuit/)) reasons.push('urgent_keywords');
  if (lower.match(/angry|frustrated|terrible|unacceptable/)) reasons.push('negative_sentiment');
  if (lower.match(/manager|supervisor|escalate/)) reasons.push('explicit_request');

  const shouldEscalate = reasons.length > 0;

  res.json({
    shouldEscalate,
    reasons,
    recommendedTeam: shouldEscalate ? 'tier2_support' : 'tier1_support',
    ticketId
  });
});

// ============================================================
// Ticket Management
// ============================================================
app.get('/api/tickets', (req, res) => {
  const { status, priority, customer, category } = req.query;
  let results = Array.from(tickets.values());

  if (status) results = results.filter(t => t.status === status);
  if (priority) results = results.filter(t => t.priority === priority);
  if (customer) results = results.filter(t => t.customer === customer);
  if (category) results = results.filter(t => t.category === category);

  res.json({
    tickets: results,
    count: results.length,
    byStatus: {
      open: results.filter(t => t.status === 'open').length,
      pending: results.filter(t => t.status === 'pending').length,
      closed: results.filter(t => t.status === 'closed').length
    }
  });
});

app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

app.post('/api/tickets',requireAuth,  (req, res) => {
  const { subject, customer, message, priority, category } = req.body;
  if (!subject || !customer || !message) return res.status(400).json({ error: 'subject, customer, and message required' });

  const id = `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ticket = {
    id,
    subject,
    customer,
    status: 'open',
    priority: priority || 'medium',
    category: category || 'general',
    messages: [{ from: 'customer', text: message, timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tickets.set(id, ticket);
  res.status(201).json(ticket);
});

app.post('/api/tickets/:id/reply',requireAuth,  (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const { text, from } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  ticket.messages.push({ from: from || 'agent', text, timestamp: new Date().toISOString() });
  ticket.updatedAt = new Date().toISOString();
  ticket.status = 'pending';
  res.json(ticket);
});

app.post('/api/tickets/:id/close',requireAuth,  (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  ticket.status = 'closed';
  ticket.closedAt = new Date().toISOString();
  res.json(ticket);
});

// ============================================================
// Knowledge Base
// ============================================================
app.get('/api/articles', (req, res) => {
  const { category } = req.query;
  let results = Array.from(articles.values());
  if (category) results = results.filter(a => a.category === category);
  res.json({ articles: results, count: results.length });
});

app.get('/api/articles/:id', (req, res) => {
  const article = articles.get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  article.views = (article.views || 0) + 1;
  res.json(article);
});

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q query param required' });
  const lower = q.toLowerCase();
  const results = Array.from(articles.values())
    .filter(a => a.title.toLowerCase().includes(lower) || a.body.toLowerCase().includes(lower))
    .map(a => ({ id: a.id, title: a.title, category: a.category, snippet: a.body.slice(0, 150) }));
  res.json({ query: q, results, count: results.length });
});

app.get('/api/macros', (req, res) => {
  res.json({ macros: Array.from(macros.values()) });
});

// ============================================================
// Conversations (live chat)
// ============================================================
app.get('/api/conversations', (req, res) => {
  res.json({ conversations: Array.from(conversations.values()), count: conversations.size });
});

app.post('/api/conversations',requireAuth,  (req, res) => {
  const { userId, message } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const id = `conv-${Date.now()}`;
  const conv = {
    id,
    userId,
    messages: message ? [{ from: 'user', text: message, timestamp: new Date().toISOString() }] : [],
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  conversations.set(id, conv);
  res.status(201).json(conv);
});

// ============================================================
// Stats
// ============================================================
app.get('/api/stats', (req, res) => {
  const allTickets = Array.from(tickets.values());
  res.json({
    tickets: {
      total: allTickets.length,
      byStatus: {
        open: allTickets.filter(t => t.status === 'open').length,
        pending: allTickets.filter(t => t.status === 'pending').length,
        closed: allTickets.filter(t => t.status === 'closed').length
      },
      byPriority: {
        low: allTickets.filter(t => t.priority === 'low').length,
        medium: allTickets.filter(t => t.priority === 'medium').length,
        high: allTickets.filter(t => t.priority === 'high').length,
        urgent: allTickets.filter(t => t.priority === 'urgent').length
      }
    },
    articles: { total: articles.size },
    conversations: { active: conversations.size },
    macros: { total: macros.size }
  });
});

// ============================================================
// 404 handler
// ============================================================
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// ============================================================
// Error handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = 
// ============================================================
// REZ INTELLIGENCE — DEEP INTEGRATION (4 endpoints)
// ============================================================
//
// 1) POST /api/support/insights         — customer insights (LTV, churn risk)
// 2) POST /api/support/churn-risk       — explicit churn prediction
// 3) GET  /api/support/next-best-action — AI-recommended response action
// 4) POST /api/support/classify-intent  — intent classification for a message
//
// Each endpoint gracefully degrades to null on failure.

app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({
    rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED,
    rezIntelUrl: rezIntel.REZ_INTEL_URL,
    rezIntelHealthy: isHealthy
  });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context });
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// 1) Customer insights for a support ticket
app.post('/api/support/insights', requireAuth, async (req, res) => {
  const { customerId, ticketId } = req.body;
  const insights = await rezIntel.getCustomerInsights({ customerId, ticketId });
  res.json({
    success: true,
    insights,
    source: insights ? 'rez-intel' : 'unavailable',
    fallback: !insights
  });
});

// 2) Churn risk prediction
app.post('/api/support/churn-risk', requireAuth, async (req, res) => {
  const { customerId, recentTickets, sentiment } = req.body;
  const prediction = await rezIntel.predictChurn({ customerId, recentTickets, sentiment });
  res.json({
    success: true,
    prediction,
    source: prediction ? 'rez-intel' : 'unavailable',
    fallback: !prediction
  });
});

// 3) Next-best-action for a ticket (response strategy)
app.get('/api/support/next-best-action', requireAuth, async (req, res) => {
  const { ticketId, customerId, category, sentiment } = req.query;
  const action = await rezIntel.getNextBestAction({
    ticketId,
    customerId,
    category,
    sentiment,
    copilot: 'support'
  });
  res.json({
    success: true,
    action,
    source: action ? 'rez-intel' : 'unavailable',
    fallback: !action
  });
});

// 4) Intent classification for an inbound message
app.post('/api/support/classify-intent', requireAuth, async (req, res) => {
  const { message, customerId, ticketId } = req.body;
  const intent = await rezIntel.classifyIntent({ message, customerId, ticketId });
  res.json({
    success: true,
    intent,
    source: intent ? 'rez-intel' : 'unavailable',
    fallback: !intent
  });
});

app.listen(PORT, () => console.log(`🎧 Support Copilot running on port ${PORT}`));
installGracefulShutdown(server);
