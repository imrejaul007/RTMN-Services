/**
 * HOJAI SiteOS Support Widget Service
 * Port: 5482
 * Ticket management, live chat, support categories
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5482;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/support-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

// Support categories
const CATEGORIES = ['billing', 'technical', 'account', 'sales', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'pending', 'resolved', 'closed'];

// Canned responses
const CANNED_RESPONSES = [
  { id: 'greeting', category: 'all', title: 'Greeting', content: 'Hi {{name}}, thanks for reaching out! I\'ll be happy to help you.' },
  { id: 'billing_1', category: 'billing', title: 'Billing Info', content: 'I\'ve checked your billing history. Here are the details...' },
  { id: 'billing_2', category: 'billing', title: 'Refund Initiated', content: 'Your refund has been initiated and should reflect in 5-7 business days.' },
  { id: 'tech_1', category: 'technical', title: 'Technical Issue', content: 'I understand you\'re experiencing a technical issue. Let me look into this for you.' },
  { id: 'tech_2', category: 'technical', title: 'Escalated', content: 'I\'ve escalated this to our technical team. You\'ll hear back within 24 hours.' },
  { id: 'account_1', category: 'account', title: 'Password Reset', content: 'I\'ve sent a password reset link to your registered email.' },
  { id: 'closing', category: 'all', title: 'Closing', content: 'Is there anything else I can help you with today?' },
  { id: 'resolution', category: 'all', title: 'Issue Resolved', content: 'Great! I\'m glad we could resolve your issue. Feel free to reach out if you need anything else!' },
];

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'support-widget', port: PORT });
});

// =====================
// TICKETS
// =====================

app.get('/api/tickets', requireAuth, (req, res) => {
  let tickets = loadData(req.companyId, 'tickets');
  const { status, priority, category, assignedAgent, search } = req.query;

  if (status) tickets = tickets.filter(t => t.status === status);
  if (priority) tickets = tickets.filter(t => t.priority === priority);
  if (category) tickets = tickets.filter(t => t.category === category);
  if (assignedAgent) tickets = tickets.filter(t => t.assignedAgent === assignedAgent);
  if (search) {
    const s = search.toLowerCase();
    tickets = tickets.filter(t =>
      t.subject.toLowerCase().includes(s) ||
      t.customerName.toLowerCase().includes(s) ||
      t.customerEmail.toLowerCase().includes(s)
    );
  }

  tickets = tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ tickets });
});

app.post('/api/tickets', requireAuth, (req, res) => {
  const { customerId, customerName, customerEmail, category, priority, subject, description, source } = req.body;
  if (!subject) return res.status(400).json({ error: 'subject required' });

  // Auto-detect category from subject
  let detectedCategory = category || 'general';
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes('billing') || subjectLower.includes('payment') || subjectLower.includes('invoice')) detectedCategory = 'billing';
  else if (subjectLower.includes('not working') || subjectLower.includes('error') || subjectLower.includes('bug')) detectedCategory = 'technical';
  else if (subjectLower.includes('account') || subjectLower.includes('login') || subjectLower.includes('password')) detectedCategory = 'account';
  else if (subjectLower.includes('price') || subjectLower.includes('demo') || subjectLower.includes('buy')) detectedCategory = 'sales';

  // Auto-detect priority
  let detectedPriority = priority || 'medium';
  if (subjectLower.includes('urgent') || subjectLower.includes('asap') || subjectLower.includes('emergency')) detectedPriority = 'urgent';
  else if (subjectLower.includes('important')) detectedPriority = 'high';

  const ticket = {
    ticketId: uuidv4(),
    companyId: req.companyId,
    customerId: customerId || uuidv4(),
    customerName: customerName || 'Anonymous',
    customerEmail: customerEmail || '',
    category: detectedCategory,
    priority: detectedPriority,
    status: 'open',
    subject,
    description: description || '',
    assignedAgent: null,
    messages: [{
      id: uuidv4(),
      sender: 'customer',
      senderName: customerName || 'Customer',
      content: description || subject,
      timestamp: new Date().toISOString(),
      attachments: [],
    }],
    tags: [],
    satisfactionRating: null,
    firstResponseAt: null,
    resolvedAt: null,
    source: source || 'widget',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tickets = loadData(req.companyId, 'tickets');
  tickets.push(ticket);
  saveData(req.companyId, 'tickets', tickets);

  res.json({ success: true, ticket });
});

app.get('/api/tickets/:id', requireAuth, (req, res) => {
  const tickets = loadData(req.companyId, 'tickets');
  const ticket = tickets.find(t => t.ticketId === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket });
});

app.put('/api/tickets/:id', requireAuth, (req, res) => {
  const tickets = loadData(req.companyId, 'tickets');
  const index = tickets.findIndex(t => t.ticketId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Ticket not found' });

  // Track first response time
  if (req.body.assignedAgent && !tickets[index].firstResponseAt) {
    tickets[index].firstResponseAt = new Date().toISOString();
  }

  // Track resolution time
  if (req.body.status === 'resolved' && tickets[index].status !== 'resolved') {
    tickets[index].resolvedAt = new Date().toISOString();
  }

  tickets[index] = { ...tickets[index], ...req.body, ticketId: req.params.id, updatedAt: new Date().toISOString() };
  saveData(req.companyId, 'tickets', tickets);
  res.json({ success: true, ticket: tickets[index] });
});

app.put('/api/tickets/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const tickets = loadData(req.companyId, 'tickets');
  const index = tickets.findIndex(t => t.ticketId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Ticket not found' });

  const oldStatus = tickets[index].status;
  tickets[index].status = status;
  tickets[index].updatedAt = new Date().toISOString();

  if (status === 'resolved' && oldStatus !== 'resolved') {
    tickets[index].resolvedAt = new Date().toISOString();
  }

  // Add system message
  tickets[index].messages.push({
    id: uuidv4(),
    sender: 'system',
    senderName: 'System',
    content: `Status changed from ${oldStatus} to ${status}`,
    timestamp: new Date().toISOString(),
  });

  saveData(req.companyId, 'tickets', tickets);
  res.json({ success: true, ticket: tickets[index] });
});

app.put('/api/tickets/:id/assign', requireAuth, (req, res) => {
  const { agentId, agentName } = req.body;
  if (!agentId) return res.status(400).json({ error: 'agentId required' });

  const tickets = loadData(req.companyId, 'tickets');
  const index = tickets.findIndex(t => t.ticketId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Ticket not found' });

  const oldAgent = tickets[index].assignedAgent;
  tickets[index].assignedAgent = agentId;
  tickets[index].assignedAgentName = agentName || agentId;
  tickets[index].updatedAt = new Date().toISOString();

  if (!tickets[index].firstResponseAt) {
    tickets[index].firstResponseAt = new Date().toISOString();
  }

  // Add system message
  const msg = oldAgent ? `Reassigned from ${oldAgent} to ${agentName || agentId}` : `Assigned to ${agentName || agentId}`;
  tickets[index].messages.push({
    id: uuidv4(),
    sender: 'system',
    senderName: 'System',
    content: msg,
    timestamp: new Date().toISOString(),
  });

  saveData(req.companyId, 'tickets', tickets);
  res.json({ success: true, ticket: tickets[index] });
});

app.delete('/api/tickets/:id', requireAuth, (req, res) => {
  let tickets = loadData(req.companyId, 'tickets');
  if (!tickets.find(t => t.ticketId === req.params.id)) return res.status(404).json({ error: 'Ticket not found' });
  tickets = tickets.filter(t => t.ticketId !== req.params.id);
  saveData(req.companyId, 'tickets', tickets);
  res.json({ success: true });
});

// =====================
// MESSAGES
// =====================

app.get('/api/tickets/:id/messages', requireAuth, (req, res) => {
  const tickets = loadData(req.companyId, 'tickets');
  const ticket = tickets.find(t => t.ticketId === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ messages: ticket.messages });
});

app.post('/api/tickets/:id/messages', requireAuth, (req, res) => {
  const { sender, senderName, content, attachments } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const tickets = loadData(req.companyId, 'tickets');
  const index = tickets.findIndex(t => t.ticketId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Ticket not found' });

  const message = {
    id: uuidv4(),
    sender: sender || 'agent',
    senderName: senderName || 'Agent',
    content,
    timestamp: new Date().toISOString(),
    attachments: attachments || [],
  };

  tickets[index].messages.push(message);
  tickets[index].updatedAt = new Date().toISOString();

  // Mark as pending if customer responds
  if (sender === 'customer' && tickets[index].status === 'resolved') {
    tickets[index].status = 'open';
  }

  saveData(req.companyId, 'tickets', tickets);
  res.json({ success: true, message });
});

// =====================
// CANNED RESPONSES
// =====================

app.get('/api/canned-responses', requireAuth, (req, res) => {
  const { category } = req.query;
  let responses = CANNED_RESPONSES;
  if (category) responses = responses.filter(r => r.category === category || r.category === 'all');
  res.json({ responses });
});

app.post('/api/canned-responses', requireAuth, (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });

  const response = {
    id: uuidv4(),
    title,
    content,
    category: category || 'all',
    createdAt: new Date().toISOString(),
  };

  CANNED_RESPONSES.push(response);
  res.json({ success: true, response });
});

// =====================
// SATISFACTION RATING
// =====================

app.post('/api/tickets/:id/rate', requireAuth, (req, res) => {
  const { rating, feedback } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating 1-5 required' });

  const tickets = loadData(req.companyId, 'tickets');
  const index = tickets.findIndex(t => t.ticketId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Ticket not found' });

  tickets[index].satisfactionRating = { rating, feedback: feedback || '', ratedAt: new Date().toISOString() };
  tickets[index].updatedAt = new Date().toISOString();
  saveData(req.companyId, 'tickets', tickets);

  res.json({ success: true, rating: tickets[index].satisfactionRating });
});

// =====================
// STATS
// =====================

app.get('/api/stats', requireAuth, (req, res) => {
  const tickets = loadData(req.companyId, 'tickets');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);

  const open = tickets.filter(t => t.status === 'open').length;
  const pending = tickets.filter(t => t.status === 'pending').length;
  const resolved = tickets.filter(t => t.status === 'resolved').length;
  const closed = tickets.filter(t => t.status === 'closed').length;
  const urgent = tickets.filter(t => t.priority === 'urgent' && t.status === 'open').length;

  const thisWeek = tickets.filter(t => new Date(t.createdAt) >= weekAgo);
  const resolvedThisWeek = thisWeek.filter(t => t.resolvedAt && new Date(t.resolvedAt) >= weekAgo);

  const avgFirstResponseTime = tickets
    .filter(t => t.firstResponseAt)
    .reduce((acc, t) => {
      const diff = new Date(t.firstResponseAt) - new Date(t.createdAt);
      return acc + diff;
    }, 0) / (tickets.filter(t => t.firstResponseAt).length || 1);

  const avgResolutionTime = tickets
    .filter(t => t.resolvedAt)
    .reduce((acc, t) => {
      const diff = new Date(t.resolvedAt) - new Date(t.createdAt);
      return acc + diff;
    }, 0) / (tickets.filter(t => t.resolvedAt).length || 1);

  const ratings = tickets.filter(t => t.satisfactionRating);
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, t) => sum + t.satisfactionRating.rating, 0) / ratings.length
    : 0;

  res.json({
    total: tickets.length,
    open,
    pending,
    resolved,
    closed,
    urgent,
    thisWeekCreated: thisWeek.length,
    thisWeekResolved: resolvedThisWeek.length,
    resolutionRate: tickets.length > 0 ? ((resolved + closed) / tickets.length * 100).toFixed(1) : 0,
    avgFirstResponseTime: Math.round(avgFirstResponseTime / 60000), // minutes
    avgResolutionTime: Math.round(avgResolutionTime / 3600000), // hours
    avgCustomerRating: avgRating.toFixed(1),
    byCategory: CATEGORIES.reduce((acc, c) => {
      acc[c] = tickets.filter(t => t.category === c).length;
      return acc;
    }, {}),
    byPriority: PRIORITIES.reduce((acc, p) => {
      acc[p] = tickets.filter(t => t.priority === p).length;
      return acc;
    }, {}),
  });
});

// =====================
// CHAT SESSIONS (Live Chat)
// =====================

app.get('/api/sessions', requireAuth, (req, res) => {
  const sessions = loadData(req.companyId, 'sessions');
  const { status } = req.query;
  let filtered = sessions;
  if (status) filtered = filtered.filter(s => s.status === status);
  res.json({ sessions: filtered.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)) });
});

app.post('/api/sessions', requireAuth, (req, res) => {
  const { customerId, customerName, customerEmail } = req.body;

  const session = {
    sessionId: uuidv4(),
    companyId: req.companyId,
    customerId: customerId || uuidv4(),
    customerName: customerName || 'Guest',
    customerEmail: customerEmail || '',
    status: 'waiting',
    agentId: null,
    agentName: null,
    messages: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
  };

  const sessions = loadData(req.companyId, 'sessions');
  sessions.push(session);
  saveData(req.companyId, 'sessions', sessions);

  res.json({ success: true, session });
});

app.post('/api/sessions/:id/join', requireAuth, (req, res) => {
  const { agentId, agentName } = req.body;
  if (!agentId) return res.status(400).json({ error: 'agentId required' });

  const sessions = loadData(req.companyId, 'sessions');
  const index = sessions.findIndex(s => s.sessionId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Session not found' });

  sessions[index].status = 'active';
  sessions[index].agentId = agentId;
  sessions[index].agentName = agentName || agentId;
  sessions[index].joinedAt = new Date().toISOString();
  saveData(req.companyId, 'sessions', sessions);

  res.json({ success: true, session: sessions[index] });
});

app.post('/api/sessions/:id/messages', requireAuth, (req, res) => {
  const { sender, senderName, content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const sessions = loadData(req.companyId, 'sessions');
  const index = sessions.findIndex(s => s.sessionId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Session not found' });

  const message = {
    id: uuidv4(),
    sender: sender || 'agent',
    senderName: senderName || 'Agent',
    content,
    timestamp: new Date().toISOString(),
  };

  sessions[index].messages.push(message);
  sessions[index].typing = null;
  saveData(req.companyId, 'sessions', sessions);

  res.json({ success: true, message });
});

app.post('/api/sessions/:id/typing', requireAuth, (req, res) => {
  const { sender, isTyping } = req.body;

  const sessions = loadData(req.companyId, 'sessions');
  const index = sessions.findIndex(s => s.sessionId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Session not found' });

  sessions[index].typing = isTyping ? sender : null;
  saveData(req.companyId, 'sessions', sessions);

  res.json({ success: true });
});

app.post('/api/sessions/:id/end', requireAuth, (req, res) => {
  const sessions = loadData(req.companyId, 'sessions');
  const index = sessions.findIndex(s => s.sessionId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Session not found' });

  sessions[index].status = 'ended';
  sessions[index].endedAt = new Date().toISOString();
  saveData(req.companyId, 'sessions', sessions);

  res.json({ success: true, session: sessions[index] });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Support Widget Service running on port ${PORT}`);
});

export default app;
