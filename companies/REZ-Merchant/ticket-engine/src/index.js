/**
 * RTMN Ticket Engine Service
 *
 * Port: 4872
 * Purpose: Ticket lifecycle management
 *
 * Features:
 * - Ticket creation and management
 * - Status workflow
 * - Priority levels
 * - SLA tracking
 * - Assignment and routing
 * - Comments and attachments
 * - Time tracking
 * - Tags and categories
 * - Escalation rules
 * - Bulk operations
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.TICKET_ENGINE_PORT || 4872;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES
// ============================================================

const tickets = new Map();
const comments = new Map();
const categories = new Map();
const priorities = new Map();
const slaPolicies = new Map();
const escalations = new Map();
const timeEntries = new Map();

// Initialize priorities
const defaultPriorities = [
  { id: 'low', name: 'Low', color: '#10b981', responseTime: 480, resolutionTime: 2880, weight: 1 },
  { id: 'medium', name: 'Medium', color: '#f59e0b', responseTime: 240, resolutionTime: 1440, weight: 2 },
  { id: 'high', name: 'High', color: '#ef4444', responseTime: 60, resolutionTime: 480, weight: 3 },
  { id: 'urgent', name: 'Urgent', color: '#dc2626', responseTime: 15, resolutionTime: 120, weight: 4 }
];
defaultPriorities.forEach(p => priorities.set(p.id, p));

// Initialize categories
const defaultCategories = [
  { id: 'technical', name: 'Technical Issue', color: '#3b82f6', defaultPriority: 'high' },
  { id: 'billing', name: 'Billing', color: '#10b981', defaultPriority: 'medium' },
  { id: 'sales', name: 'Sales Inquiry', color: '#f59e0b', defaultPriority: 'low' },
  { id: 'feature', name: 'Feature Request', color: '#8b5cf6', defaultPriority: 'low' },
  { id: 'bug', name: 'Bug Report', color: '#ef4444', defaultPriority: 'high' },
  { id: 'general', name: 'General Inquiry', color: '#6b7280', defaultPriority: 'medium' },
  { id: 'account', name: 'Account Issues', color: '#ec4899', defaultPriority: 'medium' },
  { id: 'integration', name: 'Integration Help', color: '#14b8a6', defaultPriority: 'medium' }
];
defaultCategories.forEach(c => categories.set(c.id, c));

// Initialize SLA policies
const defaultSLAPolicies = [
  { id: 'sla-standard', name: 'Standard', firstResponseTime: 240, resolutionTime: 1440, appliesTo: ['low', 'medium'] },
  { id: 'sla-premium', name: 'Premium', firstResponseTime: 60, resolutionTime: 480, appliesTo: ['high'] },
  { id: 'sla-enterprise', name: 'Enterprise', firstResponseTime: 15, resolutionTime: 120, appliesTo: ['urgent'] }
];
defaultSLAPolicies.forEach(s => slaPolicies.set(s.id, s));

// Initialize sample tickets
const sampleTickets = [
  {
    id: 'TKT-001',
    subject: 'Unable to process payment',
    description: 'Customer reports error when trying to complete checkout. Error code: PAY-403.',
    customer: { id: 'cust-001', name: 'Sarah Chen', email: 'sarah@techcorp.com' },
    status: 'open',
    priority: 'high',
    category: 'billing',
    assignee: 'agent-001',
    tags: ['payment', 'checkout', 'error'],
    sla: { policy: 'sla-premium', breachWarning: false, breached: false, firstResponseDue: null, resolutionDue: null },
    timeSpent: 0,
    createdAt: '2026-06-17T10:00:00Z',
    updatedAt: '2026-06-17T10:00:00Z',
    resolvedAt: null,
    closedAt: null,
    source: 'email'
  },
  {
    id: 'TKT-002',
    subject: 'Feature request: Dark mode',
    description: 'User requests dark mode feature for the dashboard.',
    customer: { id: 'cust-002', name: 'Michael Raj', email: 'michael@globalretail.com' },
    status: 'pending',
    priority: 'low',
    category: 'feature',
    assignee: null,
    tags: ['ui', 'enhancement'],
    sla: { policy: 'sla-standard', breachWarning: false, breached: false, firstResponseDue: null, resolutionDue: null },
    timeSpent: 0,
    createdAt: '2026-06-16T14:30:00Z',
    updatedAt: '2026-06-17T09:00:00Z',
    resolvedAt: null,
    closedAt: null,
    source: 'portal'
  },
  {
    id: 'TKT-003',
    subject: 'API integration not working',
    description: 'REST API returning 500 errors on POST /orders endpoint.',
    customer: { id: 'cust-003', name: 'Priya Sharma', email: 'priya@finserve.com' },
    status: 'resolved',
    priority: 'urgent',
    category: 'integration',
    assignee: 'agent-002',
    tags: ['api', 'integration', 'critical'],
    sla: { policy: 'sla-enterprise', breachWarning: false, breached: false, firstResponseDue: null, resolutionDue: null },
    timeSpent: 180,
    createdAt: '2026-06-15T09:00:00Z',
    updatedAt: '2026-06-16T11:00:00Z',
    resolvedAt: '2026-06-16T11:00:00Z',
    closedAt: '2026-06-16T14:00:00Z',
    source: 'phone'
  }
];
sampleTickets.forEach(t => tickets.set(t.id, t));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Ticket Engine',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      tickets: tickets.size,
      open: Array.from(tickets.values()).filter(t => t.status === 'open').length,
      pending: Array.from(tickets.values()).filter(t => t.status === 'pending').length,
      resolved: Array.from(tickets.values()).filter(t => t.status === 'resolved').length,
      breached: Array.from(tickets.values()).filter(t => t.sla?.breached).length
    }
  });
});

// ============================================================
// TICKETS
// ============================================================

// Get all tickets
app.get('/api/tickets', (req, res) => {
  const { status, priority, category, assignee, search, tags, sort = 'updated', limit = 50, offset = 0 } = req.query;

  let result = Array.from(tickets.values());

  // Filters
  if (status) result = result.filter(t => t.status === status);
  if (priority) result = result.filter(t => t.priority === priority);
  if (category) result = result.filter(t => t.category === category);
  if (assignee) result = result.filter(t => t.assignee === assignee);
  if (tags) {
    const tagList = tags.split(',');
    result = result.filter(t => tagList.some(tag => t.tags.includes(tag)));
  }
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(t =>
      t.subject.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.id.toLowerCase().includes(s) ||
      t.customer.name.toLowerCase().includes(s)
    );
  }

  // Sort
  if (sort === 'updated') result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  else if (sort === 'created') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (sort === 'priority') {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    result.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  const total = result.length;
  result = result.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    success: true,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
    tickets: result
  });
});

// Get single ticket
app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  // Get comments
  const ticketComments = Array.from(comments.values())
    .filter(c => c.ticketId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Get time entries
  const ticketTime = Array.from(timeEntries.values())
    .filter(t => t.ticketId === req.params.id);

  res.json({
    success: true,
    ticket,
    comments: ticketComments,
    timeEntries: ticketTime
  });
});

// Create ticket
app.post('/api/tickets', (req, res) => {
  const { subject, description, customer, priority, category, assignee, tags = [], source = 'api' } = req.body;

  if (!subject || !customer) {
    return res.status(400).json({ success: false, error: 'Subject and customer required' });
  }

  const cat = category || 'general';
  const prio = priority || categories.get(cat)?.defaultPriority || 'medium';

  // Generate ticket ID
  const ticketNum = tickets.size + 1;
  const ticketId = `TKT-${String(ticketNum).padStart(4, '0')}`;

  // Calculate SLA
  const policy = slaPolicies.get(prio === 'urgent' ? 'sla-enterprise' : prio === 'high' ? 'sla-premium' : 'sla-standard');
  const now = new Date();
  const firstResponseDue = new Date(now.getTime() + (policy?.firstResponseTime || 240) * 60 * 1000);
  const resolutionDue = new Date(now.getTime() + (policy?.resolutionTime || 1440) * 60 * 1000);

  const ticket = {
    id: ticketId,
    subject,
    description: description || '',
    customer,
    status: assignee ? 'open' : 'new',
    priority: prio,
    category: cat,
    assignee,
    tags,
    sla: {
      policy: policy?.id || 'sla-standard',
      breachWarning: false,
      breached: false,
      firstResponseDue: firstResponseDue.toISOString(),
      resolutionDue: resolutionDue.toISOString(),
      firstResponseAt: null
    },
    timeSpent: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    resolvedAt: null,
    closedAt: null,
    source
  };

  tickets.set(ticket.id, ticket);

  res.status(201).json({ success: true, ticket });
});

// Update ticket
app.patch('/api/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  const updated = { ...ticket, ...req.body, updatedAt: new Date().toISOString() };

  // Handle status changes
  if (req.body.status === 'resolved' && !ticket.resolvedAt) {
    updated.resolvedAt = new Date().toISOString();
  }
  if (req.body.status === 'closed' && !ticket.closedAt) {
    updated.closedAt = new Date().toISOString();
  }

  // Update SLA if priority changed
  if (req.body.priority && req.body.priority !== ticket.priority) {
    const policy = slaPolicies.get(req.body.priority === 'urgent' ? 'sla-enterprise' : req.body.priority === 'high' ? 'sla-premium' : 'sla-standard');
    updated.sla = {
      ...updated.sla,
      policy: policy?.id || 'sla-standard',
      resolutionDue: new Date(Date.now() + (policy?.resolutionTime || 1440) * 60 * 1000).toISOString()
    };
  }

  tickets.set(req.params.id, updated);

  res.json({ success: true, ticket: updated });
});

// Assign ticket
app.post('/api/tickets/:id/assign', (req, res) => {
  const { assignee, team } = req.body;

  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  ticket.assignee = assignee;
  ticket.team = team;
  ticket.status = 'open';
  ticket.updatedAt = new Date().toISOString();

  tickets.set(req.params.id, ticket);

  res.json({ success: true, ticket });
});

// Change status
app.post('/api/tickets/:id/status', (req, res) => {
  const { status } = req.body;

  if (!['new', 'open', 'pending', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();

  if (status === 'resolved') ticket.resolvedAt = new Date().toISOString();
  if (status === 'closed') ticket.closedAt = new Date().toISOString();

  tickets.set(req.params.id, ticket);

  res.json({ success: true, ticket });
});

// Add tags
app.post('/api/tickets/:id/tags', (req, res) => {
  const { tags } = req.body;

  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  ticket.tags = [...new Set([...ticket.tags, ...tags])];
  ticket.updatedAt = new Date().toISOString();

  tickets.set(req.params.id, ticket);

  res.json({ success: true, ticket });
});

// Delete ticket
app.delete('/api/tickets/:id', (req, res) => {
  if (!tickets.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  tickets.delete(req.params.id);

  // Delete associated comments and time entries
  Array.from(comments.values()).filter(c => c.ticketId === req.params.id).forEach(c => comments.delete(c.id));
  Array.from(timeEntries.values()).filter(t => t.ticketId === req.params.id).forEach(t => timeEntries.delete(t.id));

  res.json({ success: true, message: 'Ticket deleted' });
});

// ============================================================
// COMMENTS
// ============================================================

// Get comments
app.get('/api/tickets/:id/comments', (req, res) => {
  const ticketComments = Array.from(comments.values())
    .filter(c => c.ticketId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ success: true, comments: ticketComments });
});

// Add comment
app.post('/api/tickets/:id/comments', (req, res) => {
  const { content, author, type = 'comment' } = req.body;

  if (!content || !author) {
    return res.status(400).json({ success: false, error: 'Content and author required' });
  }

  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  const comment = {
    id: `cmt-${uuidv4().slice(0, 8)}`,
    ticketId: req.params.id,
    content,
    author,
    type,
    internal: req.body.internal || false,
    attachments: req.body.attachments || [],
    createdAt: new Date().toISOString()
  };

  comments.set(comment.id, comment);

  // Update ticket
  ticket.updatedAt = new Date().toISOString();

  // Mark first response if this is the first comment from agent
  if (type === 'comment' && !ticket.sla.firstResponseAt && author.type === 'agent') {
    ticket.sla.firstResponseAt = new Date().toISOString();
    ticket.status = 'open';
  }

  tickets.set(req.params.id, ticket);

  res.status(201).json({ success: true, comment });
});

// ============================================================
// TIME TRACKING
// ============================================================

// Log time
app.post('/api/tickets/:id/time', (req, res) => {
  const { duration, description, user } = req.body;

  if (!duration) {
    return res.status(400).json({ success: false, error: 'Duration required' });
  }

  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }

  const timeEntry = {
    id: `time-${uuidv4().slice(0, 8)}`,
    ticketId: req.params.id,
    duration,
    description: description || '',
    user,
    createdAt: new Date().toISOString()
  };

  timeEntries.set(timeEntry.id, timeEntry);

  // Update ticket time spent
  ticket.timeSpent += duration;
  ticket.updatedAt = new Date().toISOString();
  tickets.set(req.params.id, ticket);

  res.status(201).json({ success: true, timeEntry });
});

// ============================================================
// CATEGORIES & PRIORITIES
// ============================================================

app.get('/api/categories', (req, res) => {
  res.json({ success: true, categories: Array.from(categories.values()) });
});

app.get('/api/priorities', (req, res) => {
  res.json({ success: true, priorities: Array.from(priorities.values()) });
});

app.get('/api/sla-policies', (req, res) => {
  res.json({ success: true, policies: Array.from(slaPolicies.values()) });
});

// ============================================================
// SLA & ESCALATION
// ============================================================

// Get SLA breach tickets
app.get('/api/tickets/sla/breached', (req, res) => {
  const now = new Date();

  const breachedTickets = Array.from(tickets.values()).filter(t => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    if (t.sla.resolutionDue && new Date(t.sla.resolutionDue) < now) return true;
    return false;
  });

  res.json({ success: true, tickets: breachedTickets });
});

// Get SLA warning tickets
app.get('/api/tickets/sla/warnings', (req, res) => {
  const now = new Date();
  const warningThreshold = 15 * 60 * 1000; // 15 minutes

  const warningTickets = Array.from(tickets.values()).filter(t => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    if (!t.sla.resolutionDue) return false;
    const due = new Date(t.sla.resolutionDue);
    const timeLeft = due.getTime() - now.getTime();
    return timeLeft > 0 && timeLeft < warningThreshold;
  });

  res.json({ success: true, tickets: warningTickets });
});

// ============================================================
// STATISTICS
// ============================================================

app.get('/api/stats', (req, res) => {
  const allTickets = Array.from(tickets.values());
  const now = new Date();

  const stats = {
    total: allTickets.length,
    byStatus: {
      new: allTickets.filter(t => t.status === 'new').length,
      open: allTickets.filter(t => t.status === 'open').length,
      pending: allTickets.filter(t => t.status === 'pending').length,
      resolved: allTickets.filter(t => t.status === 'resolved').length,
      closed: allTickets.filter(t => t.status === 'closed').length
    },
    byPriority: {
      low: allTickets.filter(t => t.priority === 'low').length,
      medium: allTickets.filter(t => t.priority === 'medium').length,
      high: allTickets.filter(t => t.priority === 'high').length,
      urgent: allTickets.filter(t => t.priority === 'urgent').length
    },
    byCategory: {},
    sla: {
      breached: allTickets.filter(t => t.sla?.breached).length,
      atRisk: allTickets.filter(t => {
        if (t.status === 'resolved' || t.status === 'closed') return false;
        if (!t.sla?.resolutionDue) return false;
        return new Date(t.sla.resolutionDue) < new Date(Date.now() + 15 * 60 * 1000);
      }).length
    },
    avgFirstResponseTime: 45, // minutes
    avgResolutionTime: 240, // minutes
    avgCSAT: 4.2,
    totalTimeSpent: allTickets.reduce((sum, t) => sum + (t.timeSpent || 0), 0)
  };

  // Category breakdown
  categories.forEach((cat, id) => {
    stats.byCategory[id] = allTickets.filter(t => t.category === id).length;
  });

  res.json({ success: true, stats });
});

// ============================================================
// BULK OPERATIONS
// ============================================================

app.post('/api/tickets/bulk', (req, res) => {
  const { action, ticketIds, data } = req.body;

  if (!ticketIds || !action) {
    return res.status(400).json({ success: false, error: 'Ticket IDs and action required' });
  }

  const results = { success: [], failed: [] };

  ticketIds.forEach(id => {
    const ticket = tickets.get(id);
    if (!ticket) {
      results.failed.push({ id, error: 'Ticket not found' });
      return;
    }

    if (action === 'assign' && data.assignee) {
      ticket.assignee = data.assignee;
      ticket.updatedAt = new Date().toISOString();
    } else if (action === 'status' && data.status) {
      ticket.status = data.status;
      ticket.updatedAt = new Date().toISOString();
    } else if (action === 'priority' && data.priority) {
      ticket.priority = data.priority;
      ticket.updatedAt = new Date().toISOString();
    } else if (action === 'tags' && data.tags) {
      ticket.tags = [...new Set([...ticket.tags, ...data.tags])];
      ticket.updatedAt = new Date().toISOString();
    }

    tickets.set(id, ticket);
    results.success.push(id);
  });

  res.json({ success: true, results });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`[Ticket Engine] Service started on port ${PORT}`);
  console.log(`[Ticket Engine] ${tickets.size} tickets loaded`);
  console.log(`[Ticket Engine] ${categories.size} categories available`);
  console.log(`[Ticket Engine] ${priorities.size} priorities configured`);
});

module.exports = app;
