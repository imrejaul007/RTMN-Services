/**
 * Construction OS - AI Company Platform
 *
 * Complete Construction/Project Management Platform
 * Industry: Construction / Project Management
 * Port: 5210
 *
 * Features:
 * - Project Management (residential, commercial, infrastructure)
 * - Site/Location Management
 * - Contractor/Worker Management
 * - Task/RFI/Submittal Management
 * - Material Inventory & Procurement
 * - Equipment Management
 * - Progress Tracking
 * - Safety & Compliance
 * - Invoicing & Payments
 * - Analytics
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5210;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================================
// AUTHENTICATION (Standard RTMN Pattern)
// ============================================================

const authUsers = new Map([
  ['admin@construction.com', { id: 'usr_001', email: 'admin@construction.com', name: 'Admin User', role: 'admin', password: 'admin123' }],
  ['manager@construction.com', { id: 'usr_002', email: 'manager@construction.com', name: 'Project Manager', role: 'manager', password: 'manager123' }],
  ['worker@construction.com', { id: 'usr_003', email: 'worker@construction.com', name: 'Site Worker', role: 'worker', password: 'worker123' }]
]);

const authSessions = new Map();

// Middleware: Require Authentication
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - Invalid or expired token' });
  }
  req.user = session.user;
  next();
};

// ============================================================
// SAMPLE DATA
// ============================================================

// Projects
const projects = new Map([
  ['proj_001', {
    id: 'proj_001',
    name: 'Skyline Tower Complex',
    type: 'commercial',
    status: 'active',
    description: 'A 25-story commercial tower with retail space and underground parking',
    client: 'Skyline Developers Ltd',
    clientContact: 'raj.sharma@skylinedev.com',
    budget: 250000000,
    spent: 87500000,
    startDate: '2026-01-15',
    endDate: '2027-06-30',
    progress: 35,
    siteId: 'site_001',
    managerId: 'usr_002',
    phases: ['Foundation', 'Structure', 'MEP', 'Finishing'],
    currentPhase: 'Structure',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-15T14:30:00Z'
  }],
  ['proj_002', {
    id: 'proj_002',
    name: 'Green Valley Residency',
    type: 'residential',
    status: 'active',
    description: 'Gated community with 50 independent villas and common amenities',
    client: 'Green Valley Homes Pvt Ltd',
    clientContact: 'priya.patel@greenvalley.in',
    budget: 180000000,
    spent: 72000000,
    startDate: '2026-03-01',
    endDate: '2027-12-31',
    progress: 40,
    siteId: 'site_002',
    managerId: 'usr_002',
    phases: ['Site Preparation', 'Villa Construction', 'Infrastructure', 'Landscaping'],
    currentPhase: 'Villa Construction',
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-06-14T11:20:00Z'
  }],
  ['proj_003', {
    id: 'proj_003',
    name: 'Highway NH-48 Extension',
    type: 'infrastructure',
    status: 'planning',
    description: '15km highway expansion with 4 flyovers and 2 toll plazas',
    client: 'National Highways Authority',
    clientContact: 'eng.nhai@gov.in',
    budget: 950000000,
    spent: 15000000,
    startDate: '2026-08-01',
    endDate: '2029-03-31',
    progress: 2,
    siteId: 'site_003',
    managerId: 'usr_002',
    phases: ['Survey', 'Land Acquisition', 'Earthwork', 'Pavement', 'Structures'],
    currentPhase: 'Survey',
    createdAt: '2026-05-15T08:00:00Z',
    updatedAt: '2026-06-10T16:45:00Z'
  }],
  ['proj_004', {
    id: 'proj_004',
    name: 'Metro Station Refurbishment',
    type: 'infrastructure',
    status: 'completed',
    description: 'Complete renovation of Central Metro Station including accessibility upgrades',
    client: 'Metro Rail Corporation',
    clientContact: 'ops@metrorail.com',
    budget: 45000000,
    spent: 44800000,
    startDate: '2025-06-01',
    endDate: '2026-05-31',
    progress: 100,
    siteId: 'site_004',
    managerId: 'usr_002',
    phases: ['Demolition', 'Structural Repair', 'Electrical', 'Finishing', 'Testing'],
    currentPhase: 'Completed',
    createdAt: '2025-05-20T09:00:00Z',
    updatedAt: '2026-05-31T18:00:00Z'
  }]
]);

// Sites/Locations
const sites = new Map([
  ['site_001', { id: 'site_001', projectId: 'proj_001', name: 'Skyline Tower Site', address: 'Plot 45, MG Road, Sector 14', city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, area: 5000, status: 'active', manager: 'Ramesh Kumar' }],
  ['site_002', { id: 'site_002', projectId: 'proj_002', name: 'Green Valley Site', address: 'Village Bhilgaon, NH-7', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, area: 25000, status: 'active', manager: 'Suresh Patil' }],
  ['site_003', { id: 'site_003', projectId: 'proj_003', name: 'NH-48 Section 4', address: 'KM 145-160, NH-48', city: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898, area: 150000, status: 'planning', manager: 'Vijay Singh' }],
  ['site_004', { id: 'site_004', projectId: 'proj_004', name: 'Central Metro Station', address: 'Station Road, Civil Lines', city: 'Nagpur', state: 'Maharashtra', lat: 21.1467, lng: 79.0849, area: 2000, status: 'completed', manager: 'Anil Sharma' }]
]);

// Contractors
const contractors = new Map([
  ['cont_001', { id: 'cont_001', name: 'Alpha Structural Solutions', type: 'structural', contact: '9820012345', email: 'contracts@alpha-struct.com', address: 'Andheri West, Mumbai', gstin: '27AABCU9603R1ZM', rating: 4.5, projects: ['proj_001'], status: 'active', createdAt: '2025-06-15T10:00:00Z' }],
  ['cont_002', { id: 'cont_002', name: 'ElectroTech Contractors', type: 'electrical', contact: '9820098765', email: 'projects@electrotech.in', address: 'Koramangala, Bangalore', gstin: '29AADCE1234F1ZE', rating: 4.2, projects: ['proj_001', 'proj_004'], status: 'active', createdAt: '2024-11-20T14:30:00Z' }],
  ['cont_003', { id: 'cont_003', name: 'BuildFast Infrastructure', type: 'general', contact: '9876504321', email: 'info@buildfast.co.in', address: 'Viman Nagar, Pune', gstin: '27AABCB1234C1ZD', rating: 4.8, projects: ['proj_002', 'proj_003'], status: 'active', createdAt: '2024-03-10T09:00:00Z' }]
]);

// Workers
const workers = new Map([
  ['wrk_001', { id: 'wrk_001', name: 'Mohan Singh', role: 'Site Supervisor', siteId: 'site_001', contractorId: 'cont_001', phone: '9876512345', aadhaar: 'XXXX-XXXX-4532', skills: [' RCC Work', ' Bar Bending', ' Quality Check'], dailyWage: 2500, status: 'active' }],
  ['wrk_002', { id: 'wrk_002', name: 'Ramesh Yadav', role: 'Mason', siteId: 'site_001', contractorId: 'cont_001', phone: '9876523456', aadhaar: 'XXXX-XXXX-7821', skills: [' Brick Work', ' Plastering'], dailyWage: 1200, status: 'active' }],
  ['wrk_003', { id: 'wrk_003', name: 'Sunita Devi', role: 'Electrician', siteId: 'site_002', contractorId: 'cont_002', phone: '9876534567', aadhaar: 'XXXX-XXXX-3456', skills: [' Wiring', ' Panel Installation', ' Safety'], dailyWage: 1500, status: 'active' }],
  ['wrk_004', { id: 'wrk_004', name: 'Vikram Patel', role: 'Crane Operator', siteId: 'site_001', contractorId: 'cont_003', phone: '9876545678', aadhaar: 'XXXX-XXXX-9012', skills: [' Tower Crane', ' Mobile Crane', ' Forklift'], dailyWage: 1800, status: 'active' }],
  ['wrk_005', { id: 'wrk_005', name: 'Lakshmi Iyer', role: 'Safety Officer', siteId: 'site_002', contractorId: 'cont_003', phone: '9876556789', aadhaar: 'XXXX-XXXX-6789', skills: [' Safety Audit', ' First Aid', ' PPE'], dailyWage: 2000, status: 'active' }]
]);

// Tasks/RFIs
const tasks = new Map([
  ['task_001', { id: 'task_001', projectId: 'proj_001', siteId: 'site_001', title: 'Foundation Reinforcement Inspection', type: 'inspection', status: 'pending', priority: 'high', assignedTo: ['wrk_001'], contractorId: 'cont_001', dueDate: '2026-06-20', description: 'Inspect rebar placement for column foundations in Section A', createdBy: 'usr_002', createdAt: '2026-06-10T09:00:00Z' }],
  ['task_002', { id: 'task_002', projectId: 'proj_002', siteId: 'site_002', title: 'Electrical Rough-in - Villa Block C', type: 'work', status: 'in_progress', priority: 'medium', assignedTo: ['wrk_003'], contractorId: 'cont_002', dueDate: '2026-06-25', description: 'Complete electrical wiring for 8 villas in Block C', createdBy: 'usr_002', createdAt: '2026-06-05T11:00:00Z' }],
  ['task_003', { id: 'task_003', projectId: 'proj_001', siteId: 'site_001', title: 'RFI: Concrete Grade Confirmation', type: 'rfi', status: 'open', priority: 'urgent', assignedTo: ['usr_002'], contractorId: 'cont_001', dueDate: '2026-06-18', description: 'Confirm concrete grade M40 availability for floor 15-20 columns', createdBy: 'cont_001', createdAt: '2026-06-12T14:00:00Z' }],
  ['task_004', { id: 'task_004', projectId: 'proj_004', siteId: 'site_004', title: 'Accessibility Ramp Installation', type: 'work', status: 'completed', priority: 'high', assignedTo: ['wrk_002'], contractorId: 'cont_003', dueDate: '2026-05-28', description: 'Install ADA-compliant ramps at all 4 entrances', createdBy: 'usr_002', createdAt: '2026-05-15T10:00:00Z' }]
]);

// Materials Inventory
const materials = new Map([
  ['mat_001', { id: 'mat_001', projectId: 'proj_001', name: 'Cement (OPC 53 Grade)', unit: 'bags', quantity: 15000, minQuantity: 2000, rate: 380, supplier: 'UltraTech Cement', lastOrder: '2026-06-01' }],
  ['mat_002', { id: 'mat_002', projectId: 'proj_001', name: 'Steel TMT 12mm', unit: 'MT', quantity: 450, minQuantity: 50, rate: 72000, supplier: 'Tata Steel', lastOrder: '2026-05-25' }],
  ['mat_003', { id: 'mat_003', projectId: 'proj_002', name: 'Red Bricks', unit: 'pcs', quantity: 500000, minQuantity: 50000, rate: 8, supplier: 'Local Brick kiln', lastOrder: '2026-06-05' }],
  ['mat_004', { id: 'mat_004', projectId: 'proj_001', name: 'Ready Mix Concrete M30', unit: 'cu.m', quantity: 2000, minQuantity: 300, rate: 5500, supplier: 'ACC Concrete', lastOrder: '2026-06-10' }]
]);

// Equipment
const equipment = new Map([
  ['eq_001', { id: 'eq_001', projectId: 'proj_001', name: 'Tower Crane TC-501', type: 'crane', status: 'operational', condition: 'good', lastMaintenance: '2026-05-15', nextMaintenance: '2026-07-15', operator: 'wrk_004', rentalCost: 150000 }],
  ['eq_002', { id: 'eq_002', projectId: 'proj_001', name: 'Concrete Mixer 500L', type: 'mixer', status: 'operational', condition: 'fair', lastMaintenance: '2026-04-20', nextMaintenance: '2026-06-20', operator: null, rentalCost: 25000 }],
  ['eq_003', { id: 'eq_003', projectId: 'proj_002', name: 'Excavator CAT 320', type: 'excavator', status: 'operational', condition: 'good', lastMaintenance: '2026-06-01', nextMaintenance: '2026-08-01', operator: 'wrk_004', rentalCost: 80000 }]
]);

// Safety Incidents
const safetyIncidents = new Map([
  ['safe_001', { id: 'safe_001', projectId: 'proj_001', siteId: 'site_001', type: 'near_miss', severity: 'low', description: 'Unsecured scaffolding at Floor 8', reportedBy: 'wrk_005', reportedAt: '2026-06-10T15:30:00Z', status: 'resolved', action: 'Scaffolding reinforced and secured' }],
  ['safe_002', { id: 'safe_002', projectId: 'proj_002', siteId: 'site_002', type: 'first_aid', severity: 'minor', description: 'Minor cut on worker hand during brick cutting', reportedBy: 'wrk_005', reportedAt: '2026-06-12T10:15:00Z', status: 'resolved', action: 'First aid administered, worker returned to work' }]
]);

// Invoices
const invoices = new Map([
  ['inv_001', { id: 'inv_001', projectId: 'proj_001', contractorId: 'cont_001', invoiceNumber: 'INV-ALP-2026-001', amount: 15000000, status: 'paid', dueDate: '2026-06-30', issuedDate: '2026-06-01', items: [{ description: 'Foundation Work - Phase 1', amount: 10000000 }, { description: 'Steel Supply - 200MT', amount: 5000000 }] }],
  ['inv_002', { id: 'inv_002', projectId: 'proj_002', contractorId: 'cont_003', invoiceNumber: 'INV-BF-2026-003', amount: 8500000, status: 'pending', dueDate: '2026-07-15', issuedDate: '2026-06-10', items: [{ description: 'Site Preparation Work', amount: 6000000 }, { description: 'Material Transport', amount: 2500000 }] }],
  ['inv_003', { id: 'inv_003', projectId: 'proj_001', contractorId: 'cont_002', invoiceNumber: 'INV-ET-2026-002', amount: 5200000, status: 'overdue', dueDate: '2026-06-01', issuedDate: '2026-05-15', items: [{ description: 'Electrical Rough-in Floors 1-5', amount: 5200000 }] }]
]);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Construction OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      projects: projects.size,
      sites: sites.size,
      contractors: contractors.size,
      workers: workers.size,
      tasks: tasks.size,
      materials: materials.size,
      equipment: equipment.size
    }
  });
});

// ============================================================
// AUTH ROUTES
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = uuidv4();
  const session = { user: { id: user.id, email: user.email, name: user.name, role: user.role }, createdAt: new Date() };
  authSessions.set(token, session);

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) authSessions.delete(token);
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================
// PROJECTS API
// ============================================================

app.get('/api/projects', requireAuth, (req, res) => {
  const projectList = Array.from(projects.values());
  res.json({ projects: projectList, total: projectList.length });
});

app.get('/api/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
});

app.post('/api/projects', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden - Only admins and managers can create projects' });
  }
  const id = `proj_${uuidv4().slice(0, 8)}`;
  const project = { id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  projects.set(id, project);
  res.status(201).json({ project });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const updated = { ...project, ...req.body, id: project.id, updatedAt: new Date().toISOString() };
  projects.set(req.params.id, updated);
  res.json({ project: updated });
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  projects.delete(req.params.id);
  res.json({ message: 'Project deleted' });
});

// ============================================================
// SITES API
// ============================================================

app.get('/api/sites', requireAuth, (req, res) => {
  const siteList = Array.from(sites.values());
  const { projectId } = req.query;
  if (projectId) {
    return res.json({ sites: siteList.filter(s => s.projectId === projectId), total: siteList.filter(s => s.projectId === projectId).length });
  }
  res.json({ sites: siteList, total: siteList.length });
});

app.get('/api/sites/:id', requireAuth, (req, res) => {
  const site = sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json({ site });
});

app.post('/api/sites', requireAuth, (req, res) => {
  const id = `site_${uuidv4().slice(0, 8)}`;
  const site = { id, ...req.body };
  sites.set(id, site);
  res.status(201).json({ site });
});

app.put('/api/sites/:id', requireAuth, (req, res) => {
  const site = sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const updated = { ...site, ...req.body, id: site.id };
  sites.set(req.params.id, updated);
  res.json({ site: updated });
});

// ============================================================
// CONTRACTORS API
// ============================================================

app.get('/api/contractors', requireAuth, (req, res) => {
  const contractorList = Array.from(contractors.values());
  const { type, status } = req.query;
  let filtered = contractorList;
  if (type) filtered = filtered.filter(c => c.type === type);
  if (status) filtered = filtered.filter(c => c.status === status);
  res.json({ contractors: filtered, total: filtered.length });
});

app.get('/api/contractors/:id', requireAuth, (req, res) => {
  const contractor = contractors.get(req.params.id);
  if (!contractor) return res.status(404).json({ error: 'Contractor not found' });
  res.json({ contractor });
});

app.post('/api/contractors', requireAuth, (req, res) => {
  const id = `cont_${uuidv4().slice(0, 8)}`;
  const contractor = { id, ...req.body, createdAt: new Date().toISOString() };
  contractors.set(id, contractor);
  res.status(201).json({ contractor });
});

app.put('/api/contractors/:id', requireAuth, (req, res) => {
  const contractor = contractors.get(req.params.id);
  if (!contractor) return res.status(404).json({ error: 'Contractor not found' });
  const updated = { ...contractor, ...req.body, id: contractor.id };
  contractors.set(req.params.id, updated);
  res.json({ contractor: updated });
});

// ============================================================
// WORKERS API
// ============================================================

app.get('/api/workers', requireAuth, (req, res) => {
  const workerList = Array.from(workers.values());
  const { siteId, contractorId, status } = req.query;
  let filtered = workerList;
  if (siteId) filtered = filtered.filter(w => w.siteId === siteId);
  if (contractorId) filtered = filtered.filter(w => w.contractorId === contractorId);
  if (status) filtered = filtered.filter(w => w.status === status);
  res.json({ workers: filtered, total: filtered.length });
});

app.get('/api/workers/:id', requireAuth, (req, res) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json({ worker });
});

app.post('/api/workers', requireAuth, (req, res) => {
  const id = `wrk_${uuidv4().slice(0, 8)}`;
  const worker = { id, ...req.body };
  workers.set(id, worker);
  res.status(201).json({ worker });
});

app.put('/api/workers/:id', requireAuth, (req, res) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  const updated = { ...worker, ...req.body, id: worker.id };
  workers.set(req.params.id, updated);
  res.json({ worker: updated });
});

// ============================================================
// TASKS/RFI API
// ============================================================

app.get('/api/tasks', requireAuth, (req, res) => {
  const taskList = Array.from(tasks.values());
  const { projectId, siteId, status, type, priority } = req.query;
  let filtered = taskList;
  if (projectId) filtered = filtered.filter(t => t.projectId === projectId);
  if (siteId) filtered = filtered.filter(t => t.siteId === siteId);
  if (status) filtered = filtered.filter(t => t.status === status);
  if (type) filtered = filtered.filter(t => t.type === type);
  if (priority) filtered = filtered.filter(t => t.priority === priority);
  res.json({ tasks: filtered, total: filtered.length });
});

app.get('/api/tasks/:id', requireAuth, (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const id = `task_${uuidv4().slice(0, 8)}`;
  const task = { id, ...req.body, createdBy: req.user.id, createdAt: new Date().toISOString() };
  tasks.set(id, task);
  res.status(201).json({ task });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const updated = { ...task, ...req.body, id: task.id };
  tasks.set(req.params.id, updated);
  res.json({ task: updated });
});

app.patch('/api/tasks/:id/status', requireAuth, (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { status } = req.body;
  const updated = { ...task, status, updatedAt: new Date().toISOString() };
  tasks.set(req.params.id, updated);
  res.json({ task: updated });
});

// ============================================================
// MATERIALS API
// ============================================================

app.get('/api/materials', requireAuth, (req, res) => {
  const materialList = Array.from(materials.values());
  const { projectId, lowStock } = req.query;
  let filtered = materialList;
  if (projectId) filtered = filtered.filter(m => m.projectId === projectId);
  if (lowStock === 'true') filtered = filtered.filter(m => m.quantity <= m.minQuantity);
  res.json({ materials: filtered, total: filtered.length });
});

app.get('/api/materials/:id', requireAuth, (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material not found' });
  res.json({ material });
});

app.post('/api/materials', requireAuth, (req, res) => {
  const id = `mat_${uuidv4().slice(0, 8)}`;
  const material = { id, ...req.body };
  materials.set(id, material);
  res.status(201).json({ material });
});

app.put('/api/materials/:id', requireAuth, (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material not found' });
  const updated = { ...material, ...req.body, id: material.id };
  materials.set(req.params.id, updated);
  res.json({ material: updated });
});

app.post('/api/materials/:id/adjust', requireAuth, (req, res) => {
  const material = materials.get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material not found' });
  const { adjustment, reason } = req.body;
  const updated = { ...material, quantity: material.quantity + adjustment, lastAdjustment: new Date().toISOString(), adjustmentReason: reason };
  materials.set(req.params.id, updated);
  res.json({ material: updated });
});

// ============================================================
// EQUIPMENT API
// ============================================================

app.get('/api/equipment', requireAuth, (req, res) => {
  const equipmentList = Array.from(equipment.values());
  const { projectId, status, type } = req.query;
  let filtered = equipmentList;
  if (projectId) filtered = filtered.filter(e => e.projectId === projectId);
  if (status) filtered = filtered.filter(e => e.status === status);
  if (type) filtered = filtered.filter(e => e.type === type);
  res.json({ equipment: filtered, total: filtered.length });
});

app.get('/api/equipment/:id', requireAuth, (req, res) => {
  const item = equipment.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Equipment not found' });
  res.json({ equipment: item });
});

app.post('/api/equipment', requireAuth, (req, res) => {
  const id = `eq_${uuidv4().slice(0, 8)}`;
  const item = { id, ...req.body };
  equipment.set(id, item);
  res.status(201).json({ equipment: item });
});

app.put('/api/equipment/:id', requireAuth, (req, res) => {
  const item = equipment.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Equipment not found' });
  const updated = { ...item, ...req.body, id: item.id };
  equipment.set(req.params.id, updated);
  res.json({ equipment: updated });
});

// ============================================================
// SAFETY API
// ============================================================

app.get('/api/safety', requireAuth, (req, res) => {
  const incidentList = Array.from(safetyIncidents.values());
  const { projectId, status, severity } = req.query;
  let filtered = incidentList;
  if (projectId) filtered = filtered.filter(s => s.projectId === projectId);
  if (status) filtered = filtered.filter(s => s.status === status);
  if (severity) filtered = filtered.filter(s => s.severity === severity);
  res.json({ incidents: filtered, total: filtered.length });
});

app.post('/api/safety', requireAuth, (req, res) => {
  const id = `safe_${uuidv4().slice(0, 8)}`;
  const incident = { id, ...req.body, reportedAt: new Date().toISOString() };
  safetyIncidents.set(id, incident);
  res.status(201).json({ incident });
});

app.put('/api/safety/:id', requireAuth, (req, res) => {
  const incident = safetyIncidents.get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  const updated = { ...incident, ...req.body, id: incident.id };
  safetyIncidents.set(req.params.id, updated);
  res.json({ incident: updated });
});

// ============================================================
// INVOICING API
// ============================================================

app.get('/api/invoices', requireAuth, (req, res) => {
  const invoiceList = Array.from(invoices.values());
  const { projectId, contractorId, status } = req.query;
  let filtered = invoiceList;
  if (projectId) filtered = filtered.filter(i => i.projectId === projectId);
  if (contractorId) filtered = filtered.filter(i => i.contractorId === contractorId);
  if (status) filtered = filtered.filter(i => i.status === status);
  res.json({ invoices: filtered, total: filtered.length });
});

app.get('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const id = `inv_${uuidv4().slice(0, 8)}`;
  const invoice = { id, ...req.body, issuedDate: new Date().toISOString() };
  invoices.set(id, invoice);
  res.status(201).json({ invoice });
});

app.patch('/api/invoices/:id/status', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const { status } = req.body;
  const updated = { ...invoice, status, updatedAt: new Date().toISOString() };
  invoices.set(req.params.id, updated);
  res.json({ invoice: updated });
});

// ============================================================
// ANALYTICS API
// ============================================================

app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const projectList = Array.from(projects.values());
  const activeProjects = projectList.filter(p => p.status === 'active').length;
  const totalBudget = projectList.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projectList.reduce((sum, p) => sum + p.spent, 0);
  const avgProgress = projectList.filter(p => p.progress > 0).reduce((sum, p) => sum + p.progress, 0) / (projectList.filter(p => p.progress > 0).length || 1);

  res.json({
    overview: {
      totalProjects: projectList.length,
      activeProjects,
      completedProjects: projectList.filter(p => p.status === 'completed').length,
      totalBudget,
      totalSpent,
      budgetUtilization: ((totalSpent / totalBudget) * 100).toFixed(2) + '%',
      averageProgress: avgProgress.toFixed(1) + '%',
      totalContractors: contractors.size,
      totalWorkers: workers.size,
      pendingTasks: Array.from(tasks.values()).filter(t => t.status !== 'completed').length,
      openRFIs: Array.from(tasks.values()).filter(t => t.type === 'rfi' && t.status === 'open').length,
      pendingInvoices: Array.from(invoices.values()).filter(i => i.status === 'pending' || i.status === 'overdue').length,
      safetyIncidents: safetyIncidents.size
    }
  });
});

app.get('/api/analytics/project/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectTasks = Array.from(tasks.values()).filter(t => t.projectId === project.id);
  const projectMaterials = Array.from(materials.values()).filter(m => m.projectId === project.id);
  const projectEquipment = Array.from(equipment.values()).filter(e => e.projectId === project.id);
  const projectInvoices = Array.from(invoices.values()).filter(i => i.projectId === project.id);

  res.json({
    project: {
      ...project,
      stats: {
        totalTasks: projectTasks.length,
        completedTasks: projectTasks.filter(t => t.status === 'completed').length,
        pendingTasks: projectTasks.filter(t => t.status === 'pending').length,
        inProgressTasks: projectTasks.filter(t => t.status === 'in_progress').length,
        totalMaterials: projectMaterials.reduce((sum, m) => sum + (m.quantity * m.rate), 0),
        lowStockItems: projectMaterials.filter(m => m.quantity <= m.minQuantity).length,
        equipmentCount: projectEquipment.length,
        operationalEquipment: projectEquipment.filter(e => e.status === 'operational').length,
        totalInvoiced: projectInvoices.reduce((sum, i) => sum + i.amount, 0),
        totalPaid: projectInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
        totalPending: projectInvoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)
      }
    }
  });
});

app.get('/api/analytics/contractor/:id', requireAuth, (req, res) => {
  const contractor = contractors.get(req.params.id);
  if (!contractor) return res.status(404).json({ error: 'Contractor not found' });

  const contractorWorkers = Array.from(workers.values()).filter(w => w.contractorId === contractor.id);
  const contractorTasks = Array.from(tasks.values()).filter(t => t.contractorId === contractor.id);
  const contractorInvoices = Array.from(invoices.values()).filter(i => i.contractorId === contractor.id);

  res.json({
    contractor: {
      ...contractor,
      stats: {
        totalWorkers: contractorWorkers.length,
        activeWorkers: contractorWorkers.filter(w => w.status === 'active').length,
        totalTasks: contractorTasks.length,
        completedTasks: contractorTasks.filter(t => t.status === 'completed').length,
        totalInvoiced: contractorInvoices.reduce((sum, i) => sum + i.amount, 0),
        pendingPayments: contractorInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0)
      }
    }
  });
});

// ============================================================
// RTMN LAYER INTEGRATION ENDPOINTS
// ============================================================

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({
    layers: [
      { id: 1, name: 'Intelligence', description: 'AI-powered insights and predictions', available: true },
      { id: 2, name: 'Customer Growth', description: 'Client management and relationship tracking', available: true },
      { id: 3, name: 'Commerce', description: 'Procurement and supply chain', available: true },
      { id: 4, name: 'Finance', description: 'Budget, payments, and accounting', available: true },
      { id: 5, name: 'Workforce', description: 'Labor management and payroll', available: true },
      { id: 6, name: 'Legal & Trust', description: 'Compliance and contractor verification', available: true },
      { id: 7, name: 'Property', description: 'Site and asset management', available: true },
      { id: 8, name: 'Health & Safety', description: 'Worker safety and compliance', available: true },
      { id: 9, name: 'Mobility', description: 'Equipment and logistics tracking', available: true },
      { id: 10, name: 'Identity', description: 'Worker verification and authentication', available: true }
    ]
  });
});

app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  const projectList = Array.from(projects.values());
  const recommendations = [];

  projectList.filter(p => p.status === 'active').forEach(project => {
    const projectTasks = Array.from(tasks.values()).filter(t => t.projectId === project.id);
    const urgentTasks = projectTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');

    if (urgentTasks.length > 0) {
      recommendations.push({
        projectId: project.id,
        projectName: project.name,
        type: 'urgent_tasks',
        message: `${urgentTasks.length} urgent task(s) require attention`,
        priority: 'high'
      });
    }

    if (project.spent > project.budget * 0.8) {
      recommendations.push({
        projectId: project.id,
        projectName: project.name,
        type: 'budget_warning',
        message: 'Project spending exceeds 80% of budget',
        priority: 'medium'
      });
    }

    const lowStockMaterials = Array.from(materials.values()).filter(m => m.projectId === project.id && m.quantity <= m.minQuantity);
    if (lowStockMaterials.length > 0) {
      recommendations.push({
        projectId: project.id,
        projectName: project.name,
        type: 'low_stock',
        message: `${lowStockMaterials.length} material(s) below minimum stock`,
        priority: 'medium'
      });
    }
  });

  res.json({ recommendations });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  const invoiceList = Array.from(invoices.values());
  const totalInvoiced = invoiceList.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoiceList.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = invoiceList.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = invoiceList.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);

  res.json({
    financialSummary: {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      paymentRate: ((totalPaid / totalInvoiced) * 100).toFixed(1) + '%',
      overdueRate: ((totalOverdue / totalInvoiced) * 100).toFixed(1) + '%'
    }
  });
});

app.get('/api/layer/workforce', requireAuth, (req, res) => {
  const workerList = Array.from(workers.values());
  const activeWorkers = workerList.filter(w => w.status === 'active');
  const dailyWageBill = activeWorkers.reduce((sum, w) => sum + (w.dailyWage || 0), 0);

  const skillsCount = {};
  workerList.forEach(w => {
    (w.skills || []).forEach(skill => {
      skillsCount[skill.trim()] = (skillsCount[skill.trim()] || 0) + 1;
    });
  });

  res.json({
    workforceSummary: {
      totalWorkers: workerList.length,
      activeWorkers: activeWorkers.length,
      dailyWageBill,
      skillsDistribution: skillsCount,
      workersByRole: workerList.reduce((acc, w) => {
        acc[w.role] = (acc[w.role] || 0) + 1;
        return acc;
      }, {})
    }
  });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`Construction OS running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/api`);
  console.log(`Projects: ${projects.size} | Sites: ${sites.size} | Contractors: ${contractors.size} | Workers: ${workers.size} | Tasks: ${tasks.size}`);
});

module.exports = app;
