/**
 * CompanyOS ITSM Suite
 *
 * Complete ITSM implementation:
 * - Service Desk (IT, HR, Customer support)
 * - Problem Management
 * - Incident Management
 * - Change Management
 * - Service Catalog
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONFIG
// ============================================================================

const PORT = parseInt(process.env.PORT || '4014', 10);
const SERVICE_NAME = 'itsm';
const VERSION = '1.0.0';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';
type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
type TicketCategory = 'it' | 'hr' | 'customer' | 'incident' | 'problem' | 'change';

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  // Relationships
  createdBy: string;
  assignedTo?: string;
  relatedTickets: string[];
  linkedProblemId?: string;
  linkedChangeId?: string;

  // SLA
  sla: {
    responseDeadline: string;
    resolutionDeadline: string;
    breached: boolean;
    breachedAt?: string;
  };

  // Tracking
  comments: Array<{ author: string; text: string; createdAt: string }>;
  history: Array<{ field: string; from: any; to: any; at: string }>;

  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'identified' | 'resolved';

  // Incidents linked to this problem
  incidentIds: string[];

  rootCause?: string;
  knownError?: string;
  workaround?: string;
  resolution?: string;

  priority: TicketPriority;
  impact: 'low' | 'medium' | 'high' | 'critical';

  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface Change {
  id: string;
  title: string;
  description: string;
  type: 'normal' | 'standard' | 'emergency';
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'implemented' | 'closed';

  risk: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';

  // Planning
  implementationPlan?: string;
  rollbackPlan?: string;
  testPlan?: string;

  // Approval
  approvers: string[];
  approvals: Array<{ approver: string; approved: boolean; comment?: string; at: string }>;

  // Scheduling
  scheduledStart?: string;
  scheduledEnd?: string;
  implementedAt?: string;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'hardware' | 'software' | 'access' | 'service' | 'other';

  // Fulfillment
  fulfillmentGroup: string;
  approvers: string[];
  requiresApproval: boolean;

  // SLA
  responseSlaHours: number;
  resolutionSlaHours: number;

  // Form fields
  requestForm: Array<{ name: string; type: string; required: boolean }>;

  active: boolean;
  createdAt: string;
}

const tickets = new Map<string, Ticket>();
const problems = new Map<string, Problem>();
const changes = new Map<string, Change>();
const catalog = new Map<string, ServiceCatalogItem>();

// Seed catalog items
const defaultCatalog: ServiceCatalogItem[] = [
  {
    id: 'CAT-001',
    name: 'New Laptop',
    description: 'Request a new laptop for a new employee',
    category: 'Hardware',
    type: 'hardware',
    fulfillmentGroup: 'IT',
    approvers: ['IT Manager'],
    requiresApproval: true,
    responseSlaHours: 4,
    resolutionSlaHours: 48,
    requestForm: [
      { name: 'employee_name', type: 'text', required: true },
      { name: 'department', type: 'text', required: true },
      { name: 'laptop_type', type: 'select', required: true },
      { name: 'justification', type: 'textarea', required: true },
    ],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'CAT-002',
    name: 'Software Access',
    description: 'Request access to a software application',
    category: 'Access',
    type: 'access',
    fulfillmentGroup: 'IT',
    approvers: ['IT Manager'],
    requiresApproval: true,
    responseSlaHours: 2,
    resolutionSlaHours: 24,
    requestForm: [
      { name: 'software_name', type: 'text', required: true },
      { name: 'access_level', type: 'select', required: true },
      { name: 'justification', type: 'textarea', required: true },
    ],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'CAT-003',
    name: 'Password Reset',
    description: 'Reset your password',
    category: 'Self-Service',
    type: 'service',
    fulfillmentGroup: 'IT',
    approvers: [],
    requiresApproval: false,
    responseSlaHours: 1,
    resolutionSlaHours: 1,
    requestForm: [
      { name: 'username', type: 'text', required: true },
    ],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'CAT-004',
    name: 'Leave Request',
    description: 'Submit a leave request',
    category: 'HR',
    type: 'service',
    fulfillmentGroup: 'HR',
    approvers: ['HR Manager'],
    requiresApproval: true,
    responseSlaHours: 1,
    resolutionSlaHours: 24,
    requestForm: [
      { name: 'leave_type', type: 'select', required: true },
      { name: 'start_date', type: 'date', required: true },
      { name: 'end_date', type: 'date', required: true },
      { name: 'reason', type: 'textarea', required: true },
    ],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'CAT-005',
    name: 'Server Access',
    description: 'Request access to production servers',
    category: 'Access',
    type: 'access',
    fulfillmentGroup: 'IT',
    approvers: ['IT Manager', 'CTO'],
    requiresApproval: true,
    responseSlaHours: 4,
    resolutionSlaHours: 48,
    requestForm: [
      { name: 'server_name', type: 'text', required: true },
      { name: 'access_level', type: 'select', required: true },
      { name: 'duration', type: 'select', required: true },
      { name: 'justification', type: 'textarea', required: true },
    ],
    active: true,
    createdAt: new Date().toISOString(),
  },
];

for (const item of defaultCatalog) {
  catalog.set(item.id, item);
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============================================================================
// SERVICE CATALOG
// ============================================================================

/**
 * GET /api/catalog
 * List all catalog items.
 */
app.get('/api/catalog', (req, res) => {
  const { category, type, active } = req.query;

  let result = Array.from(catalog.values());

  if (category) result = result.filter(c => c.category === category);
  if (type) result = result.filter(c => c.type === type);
  if (active !== undefined) result = result.filter(c => c.active === (active === 'true'));

  res.json({ success: true, data: { items: result, total: result.length } });
});

/**
 * POST /api/catalog/request
 * Request a catalog item.
 */
app.post('/api/catalog/request', async (req, res) => {
  try {
    const { catalogItemId, requester, formData } = req.body;

    const item = catalog.get(catalogItemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Catalog item not found' });
    }

    // Create ticket
    const ticketId = `TKT-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const ticket: Ticket = {
      id: ticketId,
      title: `Request: ${item.name}`,
      description: JSON.stringify(formData),
      category: item.category === 'HR' ? 'hr' : 'it',
      priority: 'medium',
      status: item.requiresApproval ? 'pending' : 'open',
      createdBy: requester,
      sla: {
        responseDeadline: new Date(Date.now() + item.responseSlaHours * 3600000).toISOString(),
        resolutionDeadline: new Date(Date.now() + item.resolutionSlaHours * 3600000).toISOString(),
        breached: false,
      },
      comments: [],
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    tickets.set(ticketId, ticket);

    res.status(201).json({
      success: true,
      data: { ticketId, status: ticket.status },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TICKETS
// ============================================================================

/**
 * GET /api/tickets
 * List all tickets.
 */
app.get('/api/tickets', (req, res) => {
  const { category, priority, status, assignedTo, createdBy } = req.query;

  let result = Array.from(tickets.values());

  if (category) result = result.filter(t => t.category === category);
  if (priority) result = result.filter(t => t.priority === priority);
  if (status) result = result.filter(t => t.status === status);
  if (assignedTo) result = result.filter(t => t.assignedTo === assignedTo);
  if (createdBy) result = result.filter(t => t.createdBy === createdBy);

  res.json({ success: true, data: { tickets: result, total: result.length } });
});

/**
 * GET /api/tickets/:id
 * Get a single ticket.
 */
app.get('/api/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Ticket not found' });
  }
  res.json({ success: true, data: ticket });
});

/**
 * POST /api/tickets
 * Create a new ticket.
 */
app.post('/api/tickets', async (req, res) => {
  try {
    const { title, description, category, priority, createdBy, assignedTo } = req.body;

    if (!title || !createdBy) {
      return res.status(400).json({ success: false, error: 'title and createdBy are required' });
    }

    const id = `TKT-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    // SLA based on priority
    const slaHours = { critical: 1, high: 4, medium: 24, low: 48 };
    const sla = slaHours[priority as TicketPriority] || 24;

    const ticket: Ticket = {
      id,
      title,
      description: description || '',
      category: category as TicketCategory || 'it',
      priority: priority as TicketPriority || 'medium',
      status: 'new',
      createdBy,
      assignedTo,
      relatedTickets: [],
      sla: {
        responseDeadline: new Date(Date.now() + sla * 3600000).toISOString(),
        resolutionDeadline: new Date(Date.now() + sla * 4 * 3600000).toISOString(),
        breached: false,
      },
      comments: [],
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    tickets.set(id, ticket);

    res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/tickets/:id
 * Update a ticket.
 */
app.patch('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = tickets.get(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const updates = req.body;
    const now = new Date().toISOString();

    // Track history
    for (const [field, value] of Object.entries(updates)) {
      if (ticket[field as keyof Ticket] !== value) {
        ticket.history.push({
          field,
          from: ticket[field as keyof Ticket],
          to: value,
          at: now,
        });
      }
    }

    // Handle status changes
    if (updates.status === 'resolved') {
      ticket.resolvedAt = now;
    } else if (updates.status === 'closed') {
      ticket.closedAt = now;
    }

    Object.assign(ticket, updates);
    ticket.updatedAt = now;
    tickets.set(ticket.id, ticket);

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tickets/:id/comments
 * Add a comment to a ticket.
 */
app.post('/api/tickets/:id/comments', async (req, res) => {
  try {
    const ticket = tickets.get(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const { author, text } = req.body;
    if (!author || !text) {
      return res.status(400).json({ success: false, error: 'author and text are required' });
    }

    ticket.comments.push({
      author,
      text,
      createdAt: new Date().toISOString(),
    });
    ticket.updatedAt = new Date().toISOString();
    tickets.set(ticket.id, ticket);

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PROBLEM MANAGEMENT
// ============================================================================

/**
 * GET /api/problems
 * List all problems.
 */
app.get('/api/problems', (req, res) => {
  const { status } = req.query;

  let result = Array.from(problems.values());
  if (status) result = result.filter(p => p.status === status);

  res.json({ success: true, data: { problems: result, total: result.length } });
});

/**
 * POST /api/problems
 * Create a new problem.
 */
app.post('/api/problems', async (req, res) => {
  try {
    const { title, description, incidentIds, priority, impact, createdBy } = req.body;

    if (!title || !createdBy) {
      return res.status(400).json({ success: false, error: 'title and createdBy are required' });
    }

    const id = `PRB-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const problem: Problem = {
      id,
      title,
      description: description || '',
      status: 'open',
      incidentIds: incidentIds || [],
      priority: priority as TicketPriority || 'medium',
      impact: impact as Problem['impact'] || 'medium',
      createdAt: now,
      updatedAt: now,
    };

    problems.set(id, problem);

    // Link problem to incidents
    for (const incidentId of incidentIds || []) {
      const incident = tickets.get(incidentId);
      if (incident) {
        incident.linkedProblemId = id;
        incident.priority = problem.priority;
        tickets.set(incidentId, incident);
      }
    }

    res.status(201).json({ success: true, data: problem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/problems/:id
 * Update a problem.
 */
app.patch('/api/problems/:id', async (req, res) => {
  try {
    const problem = problems.get(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const updates = req.body;

    if (updates.status === 'resolved') {
      problem.resolvedAt = new Date().toISOString();

      // Close linked incidents
      for (const incidentId of problem.incidentIds) {
        const incident = tickets.get(incidentId);
        if (incident) {
          incident.status = 'resolved';
          incident.linkedProblemId = problem.id;
          incident.resolvedAt = new Date().toISOString();
          tickets.set(incidentId, incident);
        }
      }
    }

    Object.assign(problem, updates);
    problem.updatedAt = new Date().toISOString();
    problems.set(problem.id, problem);

    res.json({ success: true, data: problem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CHANGE MANAGEMENT
// ============================================================================

/**
 * GET /api/changes
 * List all changes.
 */
app.get('/api/changes', (req, res) => {
  const { status, type } = req.query;

  let result = Array.from(changes.values());
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);

  res.json({ success: true, data: { changes: result, total: result.length } });
});

/**
 * POST /api/changes
 * Create a new change.
 */
app.post('/api/changes', async (req, res) => {
  try {
    const { title, description, type, risk, impact, implementationPlan, rollbackPlan, approvers, createdBy } = req.body;

    if (!title || !createdBy) {
      return res.status(400).json({ success: false, error: 'title and createdBy are required' });
    }

    const id = `CHG-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const change: Change = {
      id,
      title,
      description: description || '',
      type: type as Change['type'] || 'normal',
      status: 'draft',
      risk: risk as Change['risk'] || 'medium',
      impact: impact as Change['impact'] || 'medium',
      implementationPlan,
      rollbackPlan,
      approvers: approvers || [],
      approvals: [],
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    changes.set(id, change);

    res.status(201).json({ success: true, data: change });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/changes/:id
 * Update a change.
 */
app.patch('/api/changes/:id', async (req, res) => {
  try {
    const change = changes.get(req.params.id);
    if (!change) {
      return res.status(404).json({ success: false, error: 'Change not found' });
    }

    const updates = req.body;
    Object.assign(change, updates);
    change.updatedAt = new Date().toISOString();
    changes.set(change.id, change);

    res.json({ success: true, data: change });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/changes/:id/approve
 * Approve or reject a change.
 */
app.post('/api/changes/:id/approve', async (req, res) => {
  try {
    const change = changes.get(req.params.id);
    if (!change) {
      return res.status(404).json({ success: false, error: 'Change not found' });
    }

    const { approver, approved, comment } = req.body;

    change.approvals.push({
      approver,
      approved: approved ?? true,
      comment,
      at: new Date().toISOString(),
    });

    // Check if all approvers have approved
    if (change.approvals.length >= change.approvers.length) {
      const allApproved = change.approvals.filter(a => a.approver).length >= change.approvers.length;
      change.status = allApproved ? 'approved' : 'rejected';
    }

    change.updatedAt = new Date().toISOString();
    changes.set(change.id, change);

    res.json({ success: true, data: change });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// STATS
// ============================================================================

/**
 * GET /api/stats
 * Get ITSM statistics.
 */
app.get('/api/stats', (_req, res) => {
  const allTickets = Array.from(tickets.values());
  const allProblems = Array.from(problems.values());
  const allChanges = Array.from(changes.values());

  res.json({
    success: true,
    data: {
      tickets: {
        total: allTickets.length,
        new: allTickets.filter(t => t.status === 'new').length,
        open: allTickets.filter(t => t.status === 'open').length,
        pending: allTickets.filter(t => t.status === 'pending').length,
        resolved: allTickets.filter(t => t.status === 'resolved').length,
        closed: allTickets.filter(t => t.status === 'closed').length,
        slaBreached: allTickets.filter(t => t.sla.breached).length,
      },
      problems: {
        total: allProblems.length,
        open: allProblems.filter(p => p.status === 'open').length,
        investigating: allProblems.filter(p => p.status === 'investigating').length,
        identified: allProblems.filter(p => p.status === 'identified').length,
        resolved: allProblems.filter(p => p.status === 'resolved').length,
      },
      changes: {
        total: allChanges.length,
        draft: allChanges.filter(c => c.status === 'draft').length,
        submitted: allChanges.filter(c => c.status === 'submitted').length,
        approved: allChanges.filter(c => c.status === 'approved').length,
        rejected: allChanges.filter(c => c.status === 'rejected').length,
        implemented: allChanges.filter(c => c.status === 'implemented').length,
      },
      catalog: {
        total: catalog.size,
        active: Array.from(catalog.values()).filter(c => c.active).length,
      },
    },
  });
});

// ============================================================================
// START
// ============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT}`);
    console.log(`[${SERVICE_NAME}] Tickets: ${tickets.size}, Problems: ${problems.size}, Changes: ${changes.size}`);
  });
}

module.exports = { app, SERVICE_NAME, VERSION, PORT };
