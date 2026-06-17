/**
 * Professional OS - AI Company Platform
 *
 * Complete Consulting/Professional Services Management
 *
 * Port: 5170
 * Industry: Professional Services
 *
 * Features:
 * - Client Management
 * - Project/Engagement Management
 * - Consultant/Staff Management
 * - Service Offerings
 * - Timesheet/Billing
 * - Resource Management
 * - Proposal/Contract Management
 * - Analytics
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5170;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage with sample data
const authUsers = new Map();
const authSessions = new Map();

// Clients data
const clients = new Map([
  ['CL001', {
    id: 'CL001',
    name: 'TechCorp Solutions',
    industry: 'Technology',
    contact: { name: 'John Smith', email: 'john@techcorp.com', phone: '+1-555-0101' },
    address: '123 Tech Street, San Francisco, CA 94102',
    status: 'active',
    contracts: ['CON001'],
    revenue: 125000,
    createdAt: '2025-01-15T09:00:00Z'
  }],
  ['CL002', {
    id: 'CL002',
    name: 'Global Finance Inc',
    industry: 'Financial Services',
    contact: { name: 'Sarah Johnson', email: 'sarah@globalfinance.com', phone: '+1-555-0102' },
    address: '456 Wall Street, New York, NY 10005',
    status: 'active',
    contracts: ['CON002'],
    revenue: 250000,
    createdAt: '2025-02-20T10:30:00Z'
  }],
  ['CL003', {
    id: 'CL003',
    name: 'MedHealth Systems',
    industry: 'Healthcare',
    contact: { name: 'Dr. Michael Chen', email: 'mchen@medhealth.com', phone: '+1-555-0103' },
    address: '789 Medical Drive, Boston, MA 02101',
    status: 'active',
    contracts: ['CON003'],
    revenue: 180000,
    createdAt: '2025-03-10T14:00:00Z'
  }],
  ['CL004', {
    id: 'CL004',
    name: 'RetailMax Group',
    industry: 'Retail',
    contact: { name: 'Emily Davis', email: 'emily@retailmax.com', phone: '+1-555-0104' },
    address: '321 Commerce Ave, Chicago, IL 60601',
    status: 'inactive',
    contracts: [],
    revenue: 95000,
    createdAt: '2024-11-05T08:00:00Z'
  }]
]);

// Consultants/Staff data
const consultants = new Map([
  ['CO001', {
    id: 'CO001',
    name: 'Alice Williams',
    title: 'Senior Consultant',
    skills: ['Strategy', 'Digital Transformation', 'Change Management'],
    hourlyRate: 250,
    availability: 40,
    utilized: 32,
    email: 'alice@proficos.com',
    status: 'active',
    assignments: ['PRJ001', 'PRJ002'],
    createdAt: '2024-06-01T00:00:00Z'
  }],
  ['CO002', {
    id: 'CO002',
    name: 'Bob Martinez',
    title: 'Technical Architect',
    skills: ['Cloud Architecture', 'AWS', 'DevOps', 'Security'],
    hourlyRate: 275,
    availability: 40,
    utilized: 36,
    email: 'bob@proficos.com',
    status: 'active',
    assignments: ['PRJ002', 'PRJ003'],
    createdAt: '2024-07-15T00:00:00Z'
  }],
  ['CO003', {
    id: 'CO003',
    name: 'Carol Thompson',
    title: 'Project Manager',
    skills: ['Project Management', 'Agile', 'Scrum', 'Stakeholder Management'],
    hourlyRate: 225,
    availability: 40,
    utilized: 28,
    email: 'carol@proficos.com',
    status: 'active',
    assignments: ['PRJ001', 'PRJ003', 'PRJ004'],
    createdAt: '2024-08-20T00:00:00Z'
  }]
]);

// Projects/Engagements data
const projects = new Map([
  ['PRJ001', {
    id: 'PRJ001',
    name: 'Digital Transformation Strategy',
    clientId: 'CL001',
    status: 'in-progress',
    type: 'strategy',
    startDate: '2025-04-01',
    endDate: '2025-09-30',
    budget: 75000,
    spent: 42000,
    team: ['CO001', 'CO003'],
    milestones: [
      { id: 'M1', name: 'Discovery Phase', status: 'completed', dueDate: '2025-05-15' },
      { id: 'M2', name: 'Strategy Development', status: 'in-progress', dueDate: '2025-07-01' },
      { id: 'M3', name: 'Implementation Plan', status: 'pending', dueDate: '2025-09-30' }
    ],
    createdAt: '2025-03-20T00:00:00Z'
  }],
  ['PRJ002', {
    id: 'PRJ002',
    name: 'Cloud Infrastructure Migration',
    clientId: 'CL001',
    status: 'in-progress',
    type: 'technical',
    startDate: '2025-05-01',
    endDate: '2025-12-31',
    budget: 150000,
    spent: 65000,
    team: ['CO001', 'CO002'],
    milestones: [
      { id: 'M1', name: 'Assessment', status: 'completed', dueDate: '2025-06-01' },
      { id: 'M2', name: 'Migration Planning', status: 'in-progress', dueDate: '2025-08-01' },
      { id: 'M3', name: 'Phase 1 Migration', status: 'pending', dueDate: '2025-10-01' },
      { id: 'M4', name: 'Phase 2 Migration', status: 'pending', dueDate: '2025-12-31' }
    ],
    createdAt: '2025-04-15T00:00:00Z'
  }],
  ['PRJ003', {
    id: 'PRJ003',
    name: 'Financial Systems Upgrade',
    clientId: 'CL002',
    status: 'in-progress',
    type: 'technical',
    startDate: '2025-03-01',
    endDate: '2025-08-31',
    budget: 200000,
    spent: 145000,
    team: ['CO002', 'CO003'],
    milestones: [
      { id: 'M1', name: 'Requirements Gathering', status: 'completed', dueDate: '2025-04-01' },
      { id: 'M2', name: 'System Design', status: 'completed', dueDate: '2025-05-15' },
      { id: 'M3', name: 'Development', status: 'in-progress', dueDate: '2025-07-31' },
      { id: 'M4', name: 'Testing & Deployment', status: 'pending', dueDate: '2025-08-31' }
    ],
    createdAt: '2025-02-15T00:00:00Z'
  }],
  ['PRJ004', {
    id: 'PRJ004',
    name: 'Healthcare Compliance Assessment',
    clientId: 'CL003',
    status: 'completed',
    type: 'audit',
    startDate: '2025-01-15',
    endDate: '2025-04-30',
    budget: 45000,
    spent: 43000,
    team: ['CO003'],
    milestones: [
      { id: 'M1', name: 'Gap Analysis', status: 'completed', dueDate: '2025-02-28' },
      { id: 'M2', name: 'Compliance Plan', status: 'completed', dueDate: '2025-03-31' },
      { id: 'M3', name: 'Implementation Support', status: 'completed', dueDate: '2025-04-30' }
    ],
    createdAt: '2025-01-10T00:00:00Z'
  }],
  ['PRJ005', {
    id: 'PRJ005',
    name: 'E-commerce Platform Development',
    clientId: 'CL003',
    status: 'proposal',
    type: 'technical',
    startDate: '2025-09-01',
    endDate: '2026-03-31',
    budget: 180000,
    spent: 0,
    team: [],
    milestones: [],
    createdAt: '2025-06-01T00:00:00Z'
  }]
]);

// Service Offerings data
const serviceOfferings = new Map([
  ['SVC001', { id: 'SVC001', name: 'Strategy Consulting', category: 'advisory', hourlyRate: 300, description: 'Business strategy and digital transformation advisory' }],
  ['SVC002', { id: 'SVC002', name: 'Technical Architecture', category: 'technical', hourlyRate: 275, description: 'Cloud, security, and enterprise architecture' }],
  ['SVC003', { id: 'SVC003', name: 'Project Management', category: 'management', hourlyRate: 225, description: 'Agile, Scrum, and PMO services' }],
  ['SVC004', { id: 'SVC004', name: 'Compliance Audit', category: 'audit', hourlyRate: 350, description: 'Regulatory compliance and security assessments' }],
  ['SVC005', { id: 'SVC005', name: 'Training & Enablement', category: 'training', hourlyRate: 200, description: 'Staff training and knowledge transfer' }]
]);

// Timesheets data
const timesheets = new Map([
  ['TS001', {
    id: 'TS001',
    consultantId: 'CO001',
    projectId: 'PRJ001',
    weekEnding: '2025-06-14',
    entries: [
      { date: '2025-06-09', hours: 8, description: 'Strategy workshop with client stakeholders' },
      { date: '2025-06-10', hours: 8, description: 'Current state analysis' },
      { date: '2025-06-11', hours: 8, description: 'Competitive landscape research' },
      { date: '2025-06-12', hours: 8, description: 'Strategy framework development' },
      { date: '2025-06-13', hours: 0, description: '' }
    ],
    totalHours: 32,
    status: 'pending',
    submittedAt: '2025-06-14T17:00:00Z'
  }],
  ['TS002', {
    id: 'TS002',
    consultantId: 'CO002',
    projectId: 'PRJ002',
    weekEnding: '2025-06-14',
    entries: [
      { date: '2025-06-09', hours: 8, description: 'AWS infrastructure assessment' },
      { date: '2025-06-10', hours: 8, description: 'Migration strategy documentation' },
      { date: '2025-06-11', hours: 8, description: 'Security review' },
      { date: '2025-06-12', hours: 8, description: 'Cost estimation' },
      { date: '2025-06-13', hours: 4, description: 'Client presentation prep' }
    ],
    totalHours: 36,
    status: 'approved',
    approvedBy: 'CO003',
    submittedAt: '2025-06-14T16:00:00Z',
    approvedAt: '2025-06-14T18:00:00Z'
  }],
  ['TS003', {
    id: 'TS003',
    consultantId: 'CO003',
    projectId: 'PRJ003',
    weekEnding: '2025-06-14',
    entries: [
      { date: '2025-06-09', hours: 8, description: 'Sprint planning' },
      { date: '2025-06-10', hours: 6, description: 'Daily standups and coordination' },
      { date: '2025-06-11', hours: 7, description: 'Stakeholder meeting' },
      { date: '2025-06-12', hours: 8, description: 'Sprint review preparation' },
      { date: '2025-06-13', hours: 7, description: 'Budget tracking and reporting' }
    ],
    totalHours: 36,
    status: 'pending',
    submittedAt: '2025-06-14T16:30:00Z'
  }],
  ['TS004', {
    id: 'TS004',
    consultantId: 'CO001',
    projectId: 'PRJ002',
    weekEnding: '2025-06-07',
    entries: [
      { date: '2025-06-02', hours: 8, description: 'Requirements gathering' },
      { date: '2025-06-03', hours: 8, description: 'Architecture design session' },
      { date: '2025-06-04', hours: 8, description: 'Documentation' },
      { date: '2025-06-05', hours: 8, description: 'Team workshop' },
      { date: '2025-06-06', hours: 4, description: 'Client demo' }
    ],
    totalHours: 36,
    status: 'approved',
    approvedBy: 'CO003',
    submittedAt: '2025-06-07T17:00:00Z',
    approvedAt: '2025-06-07T18:00:00Z'
  }]
]);

// Contracts/Proposals
const contracts = new Map([
  ['CON001', {
    id: 'CON001',
    clientId: 'CL001',
    title: 'Annual Consulting Agreement',
    type: 'retainer',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    value: 125000,
    status: 'active',
    terms: 'Monthly retainer with 40 hours included',
    signedAt: '2024-12-15T00:00:00Z'
  }],
  ['CON002', {
    id: 'CON002',
    clientId: 'CL002',
    title: 'Financial Systems Upgrade Project',
    type: 'fixed-price',
    startDate: '2025-03-01',
    endDate: '2025-08-31',
    value: 200000,
    status: 'active',
    terms: 'Fixed price with milestone payments',
    signedAt: '2025-02-20T00:00:00Z'
  }],
  ['CON003', {
    id: 'CON003',
    clientId: 'CL003',
    title: 'Healthcare Compliance Services',
    type: 'time-and-materials',
    startDate: '2025-01-15',
    endDate: '2025-06-30',
    value: 180000,
    status: 'active',
    terms: 'Time and materials with cap',
    signedAt: '2025-01-10T00:00:00Z'
  }]
]);

// Invoices
const invoices = new Map([
  ['INV001', {
    id: 'INV001',
    clientId: 'CL001',
    projectId: 'PRJ001',
    invoiceNumber: 'INV-2025-001',
    amount: 21000,
    status: 'paid',
    issuedDate: '2025-05-01',
    dueDate: '2025-05-31',
    paidDate: '2025-05-28',
    items: [
      { description: 'April 2025 - Strategy Consulting', hours: 84, rate: 250 }
    ]
  }],
  ['INV002', {
    id: 'INV002',
    clientId: 'CL001',
    projectId: 'PRJ002',
    invoiceNumber: 'INV-2025-002',
    amount: 32500,
    status: 'pending',
    issuedDate: '2025-06-01',
    dueDate: '2025-06-30',
    items: [
      { description: 'May 2025 - Cloud Architecture', hours: 118, rate: 275 }
    ]
  }],
  ['INV003', {
    id: 'INV003',
    clientId: 'CL002',
    projectId: 'PRJ003',
    invoiceNumber: 'INV-2025-003',
    amount: 36250,
    status: 'pending',
    issuedDate: '2025-06-01',
    dueDate: '2025-06-30',
    items: [
      { description: 'May 2025 - Financial Systems', hours: 145, rate: 250 }
    ]
  }]
]);

// Initialize default admin user
authUsers.set('admin@proficos.com', {
  id: 'USR001',
  email: 'admin@proficos.com',
  passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
  name: 'Admin User',
  role: 'admin'
});

// Generate unique ID
const generateId = (prefix) => `${prefix}${String(Date.now()).slice(-6)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

// Auth middleware
const requireAuth = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !authSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required' });
  }
  req.session = authSessions.get(sessionId);
  next();
};

// ============ AUTH ENDPOINTS ============

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials', message: 'Email and password required' });
  }

  const user = authUsers.get(email);
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  if (!user || user.passwordHash !== passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials', message: 'Email or password incorrect' });
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  authSessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: new Date().toISOString()
  });

  res.json({
    sessionId,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) authSessions.delete(sessionId);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session });
});

// ============ CLIENTS ENDPOINTS ============

app.get('/api/clients', (req, res) => {
  const clientList = Array.from(clients.values());
  res.json({ clients: clientList, count: clientList.length });
});

app.get('/api/clients/:id', (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  res.json(client);
});

app.post('/api/clients', requireAuth, (req, res) => {
  const id = generateId('CL');
  const client = {
    id,
    ...req.body,
    status: 'active',
    contracts: [],
    revenue: 0,
    createdAt: new Date().toISOString()
  };
  clients.set(id, client);
  res.status(201).json(client);
});

app.put('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  const updated = { ...client, ...req.body, id: client.id };
  clients.set(req.params.id, updated);
  res.json(updated);
});

app.get('/api/clients/:id/projects', (req, res) => {
  const clientProjects = Array.from(projects.values()).filter(p => p.clientId === req.params.id);
  res.json({ projects: clientProjects, count: clientProjects.length });
});

// ============ CONSULTANTS ENDPOINTS ============

app.get('/api/consultants', (req, res) => {
  const consultantList = Array.from(consultants.values());
  res.json({ consultants: consultantList, count: consultantList.length });
});

app.get('/api/consultants/:id', (req, res) => {
  const consultant = consultants.get(req.params.id);
  if (!consultant) {
    return res.status(404).json({ error: 'Consultant not found' });
  }
  res.json(consultant);
});

app.post('/api/consultants', requireAuth, (req, res) => {
  const id = generateId('CO');
  const consultant = {
    id,
    ...req.body,
    availability: 40,
    utilized: 0,
    status: 'active',
    assignments: [],
    createdAt: new Date().toISOString()
  };
  consultants.set(id, consultant);
  res.status(201).json(consultant);
});

app.put('/api/consultants/:id', requireAuth, (req, res) => {
  const consultant = consultants.get(req.params.id);
  if (!consultant) {
    return res.status(404).json({ error: 'Consultant not found' });
  }
  const updated = { ...consultant, ...req.body, id: consultant.id };
  consultants.set(req.params.id, updated);
  res.json(updated);
});

app.get('/api/consultants/:id/timesheets', (req, res) => {
  const consultantTimesheets = Array.from(timesheets.values()).filter(t => t.consultantId === req.params.id);
  res.json({ timesheets: consultantTimesheets, count: consultantTimesheets.length });
});

app.get('/api/consultants/availability', (req, res) => {
  const availability = Array.from(consultants.values()).map(c => ({
    id: c.id,
    name: c.name,
    title: c.title,
    utilizationRate: Math.round((c.utilized / c.availability) * 100),
    availableHours: c.availability - c.utilized
  }));
  res.json({ availability });
});

// ============ PROJECTS ENDPOINTS ============

app.get('/api/projects', (req, res) => {
  const projectList = Array.from(projects.values());
  const { status, clientId } = req.query;

  let filtered = projectList;
  if (status) filtered = filtered.filter(p => p.status === status);
  if (clientId) filtered = filtered.filter(p => p.clientId === clientId);

  res.json({ projects: filtered, count: filtered.length });
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const client = clients.get(project.clientId);
  const team = project.team.map(id => consultants.get(id)).filter(Boolean);
  res.json({ ...project, client, team });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const id = generateId('PRJ');
  const project = {
    id,
    ...req.body,
    status: 'proposal',
    spent: 0,
    milestones: [],
    createdAt: new Date().toISOString()
  };
  projects.set(id, project);
  res.status(201).json(project);
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const updated = { ...project, ...req.body, id: project.id };
  projects.set(req.params.id, updated);
  res.json(updated);
});

app.patch('/api/projects/:id/status', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  project.status = req.body.status;
  projects.set(req.params.id, project);
  res.json(project);
});

// ============ TIMESHEETS ENDPOINTS ============

app.get('/api/timesheets', (req, res) => {
  const timesheetList = Array.from(timesheets.values());
  const { consultantId, projectId, status } = req.query;

  let filtered = timesheetList;
  if (consultantId) filtered = filtered.filter(t => t.consultantId === consultantId);
  if (projectId) filtered = filtered.filter(t => t.projectId === projectId);
  if (status) filtered = filtered.filter(t => t.status === status);

  res.json({ timesheets: filtered, count: filtered.length });
});

app.get('/api/timesheets/:id', (req, res) => {
  const timesheet = timesheets.get(req.params.id);
  if (!timesheet) {
    return res.status(404).json({ error: 'Timesheet not found' });
  }
  const consultant = consultants.get(timesheet.consultantId);
  const project = projects.get(timesheet.projectId);
  res.json({ ...timesheet, consultant, project });
});

app.post('/api/timesheets', requireAuth, (req, res) => {
  const id = generateId('TS');
  const totalHours = req.body.entries.reduce((sum, e) => sum + e.hours, 0);
  const timesheet = {
    id,
    consultantId: req.session.userId === 'USR001' ? req.body.consultantId : req.session.userId,
    projectId: req.body.projectId,
    weekEnding: req.body.weekEnding,
    entries: req.body.entries,
    totalHours,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };
  timesheets.set(id, timesheet);
  res.status(201).json(timesheet);
});

app.patch('/api/timesheets/:id/approve', requireAuth, (req, res) => {
  const timesheet = timesheets.get(req.params.id);
  if (!timesheet) {
    return res.status(404).json({ error: 'Timesheet not found' });
  }
  timesheet.status = 'approved';
  timesheet.approvedBy = req.session.userId;
  timesheet.approvedAt = new Date().toISOString();
  timesheets.set(req.params.id, timesheet);
  res.json(timesheet);
});

// ============ SERVICES ENDPOINTS ============

app.get('/api/services', (req, res) => {
  const services = Array.from(serviceOfferings.values());
  res.json({ services, count: services.length });
});

app.get('/api/services/:id', (req, res) => {
  const service = serviceOfferings.get(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  res.json(service);
});

// ============ CONTRACTS ENDPOINTS ============

app.get('/api/contracts', (req, res) => {
  const contractList = Array.from(contracts.values());
  res.json({ contracts: contractList, count: contractList.length });
});

app.get('/api/contracts/:id', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }
  const client = clients.get(contract.clientId);
  res.json({ ...contract, client });
});

app.post('/api/contracts', requireAuth, (req, res) => {
  const id = generateId('CON');
  const contract = {
    id,
    ...req.body,
    status: 'draft',
    signedAt: null,
    createdAt: new Date().toISOString()
  };
  contracts.set(id, contract);
  res.status(201).json(contract);
});

app.patch('/api/contracts/:id/sign', requireAuth, (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }
  contract.status = 'active';
  contract.signedAt = new Date().toISOString();
  contracts.set(req.params.id, contract);
  res.json(contract);
});

// ============ INVOICES ENDPOINTS ============

app.get('/api/invoices', (req, res) => {
  const invoiceList = Array.from(invoices.values());
  const { clientId, status } = req.query;

  let filtered = invoiceList;
  if (clientId) filtered = filtered.filter(i => i.clientId === clientId);
  if (status) filtered = filtered.filter(i => i.status === status);

  res.json({ invoices: filtered, count: filtered.length });
});

app.get('/api/invoices/:id', (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  const client = clients.get(invoice.clientId);
  const project = projects.get(invoice.projectId);
  res.json({ ...invoice, client, project });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const id = generateId('INV');
  const invoiceNumber = `INV-2025-${String(invoices.size + 1).padStart(3, '0')}`;
  const invoice = {
    id,
    ...req.body,
    invoiceNumber,
    status: 'pending',
    issuedDate: new Date().toISOString().split('T')[0]
  };
  invoices.set(id, invoice);
  res.status(201).json(invoice);
});

// ============ ANALYTICS ENDPOINTS ============

app.get('/api/analytics/overview', (req, res) => {
  const activeProjects = Array.from(projects.values()).filter(p => p.status === 'in-progress');
  const totalRevenue = Array.from(invoices.values()).reduce((sum, i) => sum + i.amount, 0);
  const pendingRevenue = Array.from(invoices.values()).filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const avgUtilization = Array.from(consultants.values()).reduce((sum, c) => sum + (c.utilized / c.availability * 100), 0) / consultants.size;

  res.json({
    overview: {
      activeClients: Array.from(clients.values()).filter(c => c.status === 'active').length,
      activeProjects: activeProjects.length,
      totalConsultants: consultants.size,
      pendingTimesheets: Array.from(timesheets.values()).filter(t => t.status === 'pending').length,
      totalRevenue,
      pendingRevenue,
      avgUtilization: Math.round(avgUtilization)
    }
  });
});

app.get('/api/analytics/projects', (req, res) => {
  const projectStats = Array.from(projects.values()).map(p => {
    const client = clients.get(p.clientId);
    const progress = p.milestones.length > 0
      ? Math.round((p.milestones.filter(m => m.status === 'completed').length / p.milestones.length) * 100)
      : 0;
    return {
      id: p.id,
      name: p.name,
      client: client?.name,
      status: p.status,
      budget: p.budget,
      spent: p.spent,
      progress
    };
  });
  res.json({ projects: projectStats });
});

app.get('/api/analytics/revenue', (req, res) => {
  const revenueByClient = Array.from(clients.values()).map(c => ({
    client: c.name,
    revenue: c.revenue,
    invoices: Array.from(invoices.values()).filter(i => i.clientId === c.id).length
  }));

  const revenueByMonth = [
    { month: 'Jan', revenue: 45000 },
    { month: 'Feb', revenue: 62000 },
    { month: 'Mar', revenue: 58000 },
    { month: 'Apr', revenue: 73000 },
    { month: 'May', revenue: 85000 },
    { month: 'Jun', revenue: 92000 }
  ];

  res.json({ revenueByClient, revenueByMonth });
});

// ============ RTMN LAYER INTEGRATION ============

app.get('/api/layer/intelligence', (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    poweredBy: 'HOJAI AI',
    capabilities: [
      'AI Consulting Copilot',
      'Project Risk Prediction',
      'Resource Optimization',
      'Client Sentiment Analysis'
    ],
    endpoints: ['/api/analytics/*']
  });
});

app.get('/api/layer/customer-growth', (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    poweredBy: 'AdBazaar',
    capabilities: [
      'Client CRM',
      'Growth Analytics',
      'Referral Programs'
    ]
  });
});

app.get('/api/layer/commerce', (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    poweredBy: 'REZ-Merchant',
    capabilities: [
      'Service Billing',
      'Invoice Management',
      'Payment Processing'
    ],
    endpoints: ['/api/invoices/*', '/api/contracts/*']
  });
});

app.get('/api/layers', (req, res) => {
  res.json({
    totalLayers: 15,
    currentIndustry: 'Professional Services',
    layers: [
      { layer: 1, name: 'Intelligence', status: 'active' },
      { layer: 2, name: 'Customer Growth', status: 'active' },
      { layer: 3, name: 'Commerce', status: 'active' },
      { layer: 4, name: 'Financial', status: 'available' },
      { layer: 5, name: 'Workforce', status: 'available' },
      { layer: 6, name: 'Legal & Trust', status: 'available' },
      { layer: 7, name: 'Property', status: 'available' },
      { layer: 8, name: 'Health', status: 'available' },
      { layer: 9, name: 'Mobility', status: 'available' },
      { layer: 10, name: 'Identity', status: 'available' },
      { layer: 11, name: 'Memory', status: 'available' },
      { layer: 12, name: 'Twins', status: 'available' },
      { layer: 13, name: 'Automation', status: 'available' },
      { layer: 14, name: 'Autonomous', status: 'available' },
      { layer: 15, name: 'Network', status: 'available' }
    ]
  });
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'professional-os',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    industry: 'Professional Services'
  });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`Professional OS running on port ${PORT}`);
  console.log(`Industry: Professional Services`);
  console.log(`Sample Data: 4 clients, 5 projects, 3 consultants, 4 timesheets`);
  console.log(`Login: admin@proficos.com / admin123`);
});
