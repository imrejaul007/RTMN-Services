/**
 * Service Management - CompanyOS Module
 * Unified ticketing for Customer, IT, and HR requests
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { addDays, addHours, format } = require('date-fns');

const app = express();
app.use(express.json());

// In-memory store (replace with DB)
const tickets = new Map();
const slaPolicies = new Map();
const approvals = new Map();

// ===== TICKET TYPES =====
const TICKET_TYPES = {
  CUSTOMER: 'customer',
  IT: 'it',
  HR: 'hr',
  GENERAL: 'general'
};

// ===== PRIORITIES =====
const PRIORITIES = {
  CRITICAL: { value: 1, label: 'Critical', sla_hours: 1 },
  HIGH: { value: 2, label: 'High', sla_hours: 4 },
  MEDIUM: { value: 3, label: 'Medium', sla_hours: 24 },
  LOW: { value: 4, label: 'Low', sla_hours: 72 }
};

// ===== STATUSES =====
const STATUSES = {
  NEW: 'new',
  OPEN: 'open',
  PENDING: 'pending',
  ON_HOLD: 'on_hold',
  SOLVED: 'solved',
  CLOSED: 'closed'
};

// ===== DEFAULT SLA POLICIES =====
function initSLAPolicies() {
  slaPolicies.set('customer_critical', {
    id: 'customer_critical',
    name: 'Customer Critical',
    type: TICKET_TYPES.CUSTOMER,
    priority: PRIORITIES.CRITICAL.value,
    first_response_hours: 1,
    resolution_hours: 4
  });
  slaPolicies.set('customer_high', {
    id: 'customer_high',
    name: 'Customer High',
    type: TICKET_TYPES.CUSTOMER,
    priority: PRIORITIES.HIGH.value,
    first_response_hours: 2,
    resolution_hours: 8
  });
  slaPolicies.set('it_critical', {
    id: 'it_critical',
    name: 'IT Critical',
    type: TICKET_TYPES.IT,
    priority: PRIORITIES.CRITICAL.value,
    first_response_hours: 0.5,
    resolution_hours: 2
  });
  slaPolicies.set('hr_general', {
    id: 'hr_general',
    name: 'HR General',
    type: TICKET_TYPES.HR,
    priority: PRIORITIES.MEDIUM.value,
    first_response_hours: 4,
    resolution_hours: 48
  });
}

initSLAPolicies();

// ===== CREATE TICKET =====
app.post('/api/tickets', (req, res) => {
  const {
    title,
    description,
    type = TICKET_TYPES.GENERAL,
    priority = PRIORITIES.MEDIUM.value,
    requester_id,
    requester_email,
    requester_name,
    assigned_to,
    tags = [],
    fields = {}
  } = req.body;

  if (!title || !requester_id) {
    return res.status(400).json({ error: 'title and requester_id required' });
  }

  const id = `TKT-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();

  // Calculate SLA
  const slaPolicy = findSLAPolicy(type, priority);
  const sla_due = addHours(now, slaPolicy?.resolution_hours || 24);
  const first_response_due = addHours(now, slaPolicy?.first_response_hours || 4);

  const ticket = {
    id,
    title,
    description,
    type,
    priority,
    status: STATUSES.NEW,
    requester: {
      id: requester_id,
      email: requester_email,
      name: requester_name
    },
    assigned_to,
    tags,
    fields,
    sla_policy: slaPolicy?.id,
    sla_due: format(sla_due, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    first_response_due: format(first_response_due, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    first_response_at: null,
    resolution_at: null,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    updated_at: format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    comments: [],
    history: [{
      action: 'created',
      by: requester_id,
      at: format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'")
    }]
  };

  tickets.set(id, ticket);

  res.status(201).json({
    success: true,
    ticket
  });
});

// ===== GET TICKET =====
app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  res.json({ ticket });
});

// ===== LIST TICKETS =====
app.get('/api/tickets', (req, res) => {
  const { type, status, priority, assigned_to, page = 1, limit = 20 } = req.query;

  let filtered = Array.from(tickets.values());

  if (type) filtered = filtered.filter(t => t.type === type);
  if (status) filtered = filtered.filter(t => t.status === status);
  if (priority) filtered = filtered.filter(t => t.priority === parseInt(priority));
  if (assigned_to) filtered = filtered.filter(t => t.assigned_to === assigned_to);

  // Sort by priority then created_at
  filtered.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + parseInt(limit));

  res.json({
    tickets: paged,
    total: filtered.length,
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

// ===== UPDATE TICKET =====
app.patch('/api/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const allowedFields = ['status', 'priority', 'assigned_to', 'tags', 'fields'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
      updates[`${field}_updated_at`] = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
  }

  // Handle status changes
  if (updates.status === STATUSES.SOLVED && !ticket.resolution_at) {
    updates.resolution_at = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
  }

  // Add to history
  updates.history = [...ticket.history, {
    action: 'updated',
    changes: Object.keys(updates),
    at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'")
  }];

  updates.updated_at = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");

  const updated = { ...ticket, ...updates };
  tickets.set(req.params.id, updated);

  res.json({ success: true, ticket: updated });
});

// ===== ADD COMMENT =====
app.post('/api/tickets/:id/comments', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { body, author_id, author_name, is_public = true } = req.body;

  if (!body || !author_id) {
    return res.status(400).json({ error: 'body and author_id required' });
  }

  const comment = {
    id: uuidv4(),
    body,
    author: { id: author_id, name: author_name },
    is_public,
    created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'")
  };

  ticket.comments.push(comment);
  ticket.history.push({
    action: 'comment_added',
    by: author_id,
    at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'")
  });

  // Track first response
  if (!ticket.first_response_at && is_public) {
    ticket.first_response_at = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    ticket.first_response_due_met = new Date() <= new Date(ticket.first_response_due);
  }

  tickets.set(req.params.id, ticket);

  res.status(201).json({ success: true, comment });
});

// ===== APPROVAL WORKFLOW =====
app.post('/api/tickets/:id/approval', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { approver_id, approver_name, type, reason } = req.body;

  const approval = {
    id: `APR-${Date.now().toString(36).toUpperCase()}`,
    ticket_id: ticket.id,
    type: type || 'general',
    status: 'pending',
    requested_by: ticket.requester.id,
    requested_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    approver: { id: approver_id, name: approver_name },
    reason,
    decided_at: null,
    decision: null,
    notes: null
  };

  approvals.set(approval.id, approval);

  // Update ticket status
  ticket.status = STATUSES.PENDING;
  ticket.pending_approval = approval.id;
  ticket.history.push({
    action: 'approval_requested',
    by: ticket.requester.id,
    at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'")
  });

  tickets.set(ticket.id, ticket);

  res.status(201).json({ success: true, approval });
});

// ===== APPROVE/REJECT =====
app.post('/api/approvals/:id/decide', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  const { decision, notes, decided_by } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approved or rejected' });
  }

  approval.status = decision;
  approval.decision = decision;
  approval.notes = notes;
  approval.decided_by = decided_by;
  approval.decided_at = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");

  approvals.set(approval.id, approval);

  // Update ticket
  const ticket = tickets.get(approval.ticket_id);
  if (ticket) {
    ticket.status = decision === 'approved' ? STATUSES.OPEN : STATUSES.OPEN;
    ticket.history.push({
      action: `approval_${decision}`,
      by: decided_by,
      at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'")
    });
    tickets.set(ticket.id, ticket);
  }

  res.json({ success: true, approval });
});

// ===== SLA STATUS =====
app.get('/api/tickets/:id/sla', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const now = new Date();
  const firstResponseDue = new Date(ticket.first_response_due);
  const slaDue = new Date(ticket.sla_due);

  const firstResponseBreached = !ticket.first_response_at && now > firstResponseDue;
  const slaBreached = !ticket.resolution_at && now > slaDue;

  res.json({
    ticket_id: ticket.id,
    status: ticket.status,
    first_response: {
      due: ticket.first_response_due,
      met: !!ticket.first_response_at,
      met_at: ticket.first_response_at,
      due_met: ticket.first_response_due_met,
      breached: firstResponseBreached,
      remaining_minutes: firstResponseBreached ? 0 : Math.floor((firstResponseDue - now) / 60000)
    },
    resolution: {
      due: ticket.sla_due,
      met: !!ticket.resolution_at,
      met_at: ticket.resolution_at,
      breached: slaBreached,
      remaining_minutes: slaBreached ? 0 : Math.floor((slaDue - now) / 60000)
    }
  });
});

// ===== DASHBOARD =====
app.get('/api/dashboard', (req, res) => {
  const all = Array.from(tickets.values());
  const now = new Date();

  const metrics = {
    total: all.length,
    by_status: {},
    by_type: {},
    by_priority: {},
    breached_sla: 0,
    avg_resolution_hours: 0,
    first_response_breached: 0
  };

  let totalResolutionHours = 0;
  let resolvedCount = 0;

  for (const ticket of all) {
    // By status
    metrics.by_status[ticket.status] = (metrics.by_status[ticket.status] || 0) + 1;

    // By type
    metrics.by_type[ticket.type] = (metrics.by_type[ticket.type] || 0) + 1;

    // By priority
    metrics.by_priority[ticket.priority] = (metrics.by_priority[ticket.priority] || 0) + 1;

    // SLA checks
    if (!ticket.first_response_at && now > new Date(ticket.first_response_due)) {
      metrics.first_response_breached++;
    }

    if (!ticket.resolution_at && now > new Date(ticket.sla_due)) {
      metrics.breached_sla++;
    }

    // Resolution time
    if (ticket.resolution_at) {
      const hours = (new Date(ticket.resolution_at) - new Date(ticket.created_at)) / 3600000;
      totalResolutionHours += hours;
      resolvedCount++;
    }
  }

  metrics.avg_resolution_hours = resolvedCount > 0
    ? Math.round(totalResolutionHours / resolvedCount * 10) / 10
    : 0;

  res.json({ metrics });
});

// ===== SLA POLICIES =====
app.get('/api/sla-policies', (req, res) => {
  res.json({ policies: Array.from(slaPolicies.values()) });
});

app.post('/api/sla-policies', (req, res) => {
  const { id, name, type, priority, first_response_hours, resolution_hours } = req.body;

  const policy = { id, name, type, priority, first_response_hours, resolution_hours };
  slaPolicies.set(id, policy);

  res.status(201).json({ success: true, policy });
});

// ===== HELPER =====
function findSLAPolicy(type, priority) {
  for (const policy of slaPolicies.values()) {
    if (policy.type === type && policy.priority === priority) {
      return policy;
    }
  }
  return null;
}

// ===== HEALTH =====
app.get('/health', (req, res) => {
  res.json({
    service: 'service-management',
    status: 'ok',
    tickets: tickets.size,
    approvals: approvals.size
  });
});

const PORT = process.env.PORT || 4510;

app.listen(PORT, () => {
  console.log(`🎫 Service Management running on port ${PORT}`);
});

module.exports = app;
