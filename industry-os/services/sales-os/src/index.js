/**
 * Sales OS - Unified Sales Intelligence Platform
 *
 * Combines: REZ SalesMind, CRM Engine, Lead Twin, Sales Copilot,
 * Executive Copilot, Finance Copilot, Marketing Copilot, SUTAR OS
 *
 * Port: 5055
 * Part of: RTMN Industry OS Ecosystem
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.SALES_OS_PORT || 5055;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// In-memory data stores
const dataStores = {
  // Leads
  leads: new Map(),
  leadActivities: new Map(),

  // Contacts/Accounts
  contacts: new Map(),
  accounts: new Map(),

  // Opportunities/Deals
  opportunities: new Map(),
  dealActivities: new Map(),

  // Pipeline stages
  pipelineStages: new Map([
    ['lead', { id: 'lead', name: 'Lead', order: 1 }],
    ['qualified', { id: 'qualified', name: 'Qualified', order: 2 }],
    ['proposal', { id: 'proposal', name: 'Proposal', order: 3 }],
    ['negotiation', { id: 'negotiation', name: 'Negotiation', order: 4 }],
    ['closed_won', { id: 'closed_won', name: 'Closed Won', order: 5 }],
    ['closed_lost', { id: 'closed_lost', name: 'Closed Lost', order: 6 }],
  ]),

  // Sales Activities
  activities: new Map(),
  tasks: new Map(),
  meetings: new Map(),
  calls: new Map(),

  // Products/Services
  products: new Map(),
  quotes: new Map(),
  invoices: new Map(),

  // Team members
  salesReps: new Map(),
  teams: new Map(),

  // Campaigns
  campaigns: new Map(),
  leadsources: new Map(),

  // Analytics
  forecasts: new Map(),
  reports: new Map(),

  // Integrations status
  integrations: new Map(),
};

// Initialize sample data
function initSampleData() {
  // Sample Sales Reps
  const salesReps = [
    { id: 'SR001', name: 'Rahul Sharma', email: 'rahul@rtmn.com', territory: 'North', quota: 500000, achieved: 325000 },
    { id: 'SR002', name: 'Priya Patel', email: 'priya@rtmn.com', territory: 'South', quota: 500000, achieved: 475000 },
    { id: 'SR003', name: 'Amit Kumar', email: 'amit@rtmn.com', territory: 'East', quota: 500000, achieved: 210000 },
    { id: 'SR004', name: 'Sneha Gupta', email: 'sneha@rtmn.com', territory: 'West', quota: 500000, achieved: 380000 },
  ];
  salesReps.forEach(rep => dataStores.salesReps.set(rep.id, rep));

  // Sample Accounts
  const accounts = [
    { id: 'ACC001', name: 'TechCorp India', industry: 'Technology', size: 'Enterprise', revenue: 50000000, status: 'active' },
    { id: 'ACC002', name: 'Global Retail Solutions', industry: 'Retail', size: 'Enterprise', revenue: 120000000, status: 'active' },
    { id: 'ACC003', name: 'HealthFirst Hospitals', industry: 'Healthcare', size: 'Enterprise', revenue: 80000000, status: 'active' },
    { id: 'ACC004', name: 'EduTech Innovations', industry: 'Education', size: 'SMB', revenue: 15000000, status: 'active' },
    { id: 'ACC005', name: 'FinServe Financial', industry: 'Finance', size: 'Enterprise', revenue: 200000000, status: 'active' },
  ];
  accounts.forEach(acc => dataStores.accounts.set(acc.id, acc));

  // Sample Leads
  const leads = [
    { id: 'LD001', firstName: 'Vikram', lastName: 'Singh', email: 'vikram@company.com', company: 'StartupX', source: 'website', status: 'new', score: 85, value: 150000 },
    { id: 'LD002', firstName: 'Ananya', lastName: 'Reddy', email: 'ananya@firm.com', company: 'LegalFirm LLP', source: 'referral', status: 'contacted', score: 72, value: 200000 },
    { id: 'LD003', firstName: 'Rajesh', lastName: 'Mehta', email: 'rajesh@corp.com', company: 'Manufacturing Co', source: 'linkedin', status: 'qualified', score: 90, value: 350000 },
    { id: 'LD004', firstName: 'Kavitha', lastName: ' Nair', email: 'kavitha@biz.com', company: 'Trading House', source: '展会', status: 'new', score: 45, value: 100000 },
  ];
  leads.forEach(lead => dataStores.leads.set(lead.id, lead));

  // Sample Opportunities/Deals
  const opportunities = [
    {
      id: 'OPP001', title: 'TechCorp CRM Implementation',
      accountId: 'ACC001', value: 2500000, stage: 'proposal',
      probability: 60, closeDate: '2026-07-15', ownerId: 'SR001',
      products: ['CRM Engine', 'Sales Copilot'], competitors: ['Salesforce', 'HubSpot']
    },
    {
      id: 'OPP002', title: 'Global Retail POS Rollout',
      accountId: 'ACC002', value: 5000000, stage: 'negotiation',
      probability: 80, closeDate: '2026-06-30', ownerId: 'SR002',
      products: ['POS Service', 'Inventory'], competitors: ['Zoho', 'Lightspeed']
    },
    {
      id: 'OPP003', title: 'HealthFirst Patient Portal',
      accountId: 'ACC003', value: 1800000, stage: 'qualified',
      probability: 50, closeDate: '2026-08-01', ownerId: 'SR003',
      products: ['Healthcare OS', 'Patient Twin'], competitors: ['Epic', 'Cerner']
    },
    {
      id: 'OPP004', title: 'EduTech LMS Platform',
      accountId: 'ACC004', value: 800000, stage: 'closed_won',
      probability: 100, closeDate: '2026-05-15', ownerId: 'SR001',
      products: ['Education OS'], competitors: ['Moodle', 'Canvas']
    },
    {
      id: 'OPP005', title: 'FinServe Compliance Suite',
      accountId: 'ACC005', value: 3500000, stage: 'lead',
      probability: 20, closeDate: '2026-09-01', ownerId: 'SR004',
      products: ['Legal OS', 'Compliance'], competitors: ['SAP', 'Oracle']
    },
  ];
  opportunities.forEach(opp => dataStores.opportunities.set(opp.id, opp));

  // Sample Products
  const products = [
    { id: 'PRD001', name: 'CRM Engine', category: 'Sales', price: 50000, unit: 'month', description: 'Full CRM capabilities' },
    { id: 'PRD002', name: 'Sales Copilot', category: 'AI', price: 25000, unit: 'month', description: 'AI-powered sales assistant' },
    { id: 'PRD003', name: 'Lead Twin', category: 'Intelligence', price: 15000, unit: 'month', description: 'Lead intelligence & scoring' },
    { id: 'PRD004', name: 'POS Service', category: 'Commerce', price: 30000, unit: 'month', description: 'Point of Sale system' },
    { id: 'PRD005', name: 'Healthcare OS', category: 'Industry', price: 75000, unit: 'month', description: 'Healthcare management' },
    { id: 'PRD006', name: 'Education OS', category: 'Industry', price: 60000, unit: 'month', description: 'Education platform' },
  ];
  products.forEach(prod => dataStores.products.set(prod.id, prod));

  // Sample Campaigns
  const campaigns = [
    { id: 'CMP001', name: 'Q2 Enterprise Push', type: 'email', status: 'active', budget: 500000, leadsGenerated: 150 },
    { id: 'CMP002', name: 'Healthcare Summit 2026', type: 'event', status: 'active', budget: 200000, leadsGenerated: 45 },
    { id: 'CMP003', name: 'SMB Winter Sale', type: 'discount', status: 'completed', budget: 100000, leadsGenerated: 89 },
  ];
  campaigns.forEach(cmp => dataStores.campaigns.set(cmp.id, cmp));

  // Initialize integrations
  const integrations = [
    { id: 'INT001', name: 'REZ CRM Hub', type: 'crm', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT002', name: 'Sales Copilot', type: 'ai', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT003', name: 'Lead Twin', type: 'intelligence', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT004', name: 'Executive Dashboard', type: 'analytics', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT005', name: 'Finance Copilot', type: 'finance', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT006', name: 'Marketing Copilot', type: 'marketing', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT007', name: 'SUTAR OS', type: 'autonomous', status: 'connected', lastSync: new Date().toISOString() },
    { id: 'INT008', name: 'Memory OS', type: 'memory', status: 'connected', lastSync: new Date().toISOString() },
  ];
  integrations.forEach(int => dataStores.integrations.set(int.id, int));

  console.log(`[Sales OS] Initialized with ${leads.length} leads, ${opportunities.length} deals, ${products.length} products`);
}

// ==================== HEALTH & STATUS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sales OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    integrations: Array.from(dataStores.integrations.values()),
  });
});

app.get('/status', (req, res) => {
  res.json({
    leads: dataStores.leads.size,
    contacts: dataStores.contacts.size,
    accounts: dataStores.accounts.size,
    opportunities: dataStores.opportunities.size,
    activities: dataStores.activities.size,
    products: dataStores.products.size,
    campaigns: dataStores.campaigns.size,
    salesReps: dataStores.salesReps.size,
  });
});

// ==================== LEADS ====================

// Get all leads
app.get('/api/leads', (req, res) => {
  const { status, source, minScore, assignedTo } = req.query;
  let leads = Array.from(dataStores.leads.values());

  if (status) leads = leads.filter(l => l.status === status);
  if (source) leads = leads.filter(l => l.source === source);
  if (minScore) leads = leads.filter(l => l.score >= parseInt(minScore));
  if (assignedTo) leads = leads.filter(l => l.ownerId === assignedTo);

  res.json({ success: true, count: leads.length, leads });
});

// Get single lead
app.get('/api/leads/:id', (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  const activities = Array.from(dataStores.leadActivities.values())
    .filter(a => a.leadId === req.params.id);

  res.json({ success: true, lead, activities });
});

// Create lead
app.post('/api/leads', (req, res) => {
  const { firstName, lastName, email, company, phone, source, value } = req.body;

  if (!email || !company) {
    return res.status(400).json({ success: false, error: 'Email and company are required' });
  }

  const lead = {
    id: `LD${String(dataStores.leads.size + 1).padStart(3, '0')}`,
    firstName: firstName || '',
    lastName: lastName || '',
    email,
    phone: phone || '',
    company,
    source: source || 'direct',
    status: 'new',
    score: 50,
    value: value || 0,
    ownerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.leads.set(lead.id, lead);
  res.status(201).json({ success: true, lead });
});

// Update lead
app.patch('/api/leads/:id', (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  const updated = { ...lead, ...req.body, updatedAt: new Date().toISOString() };
  dataStores.leads.set(req.params.id, updated);
  res.json({ success: true, lead: updated });
});

// Convert lead to opportunity
app.post('/api/leads/:id/convert', (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  const { title, value, closeDate, accountId } = req.body;

  const opportunity = {
    id: `OPP${String(dataStores.opportunities.size + 1).padStart(3, '0')}`,
    title: title || `${lead.company} - New Deal`,
    accountId: accountId || null,
    value: value || lead.value,
    stage: 'lead',
    probability: 10,
    closeDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: lead.ownerId,
    leadId: lead.id,
    products: [],
    competitors: [],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.opportunities.set(opportunity.id, opportunity);

  // Update lead status
  lead.status = 'converted';
  lead.convertedTo = opportunity.id;
  dataStores.leads.set(lead.id, lead);

  res.status(201).json({ success: true, opportunity, lead });
});

// Score lead
app.post('/api/leads/:id/score', (req, res) => {
  const lead = dataStores.leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

  // Simple scoring based on data completeness and engagement signals
  let score = 50;

  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.company) score += 15;
  if (lead.source === 'referral') score += 15;
  if (lead.source === '展会') score += 10;

  lead.score = Math.min(100, score);
  lead.updatedAt = new Date().toISOString();
  dataStores.leads.set(lead.id, lead);

  res.json({ success: true, score: lead.score });
});

// ==================== ACCOUNTS ====================

app.get('/api/accounts', (req, res) => {
  const { industry, size, status } = req.query;
  let accounts = Array.from(dataStores.accounts.values());

  if (industry) accounts = accounts.filter(a => a.industry === industry);
  if (size) accounts = accounts.filter(a => a.size === size);
  if (status) accounts = accounts.filter(a => a.status === status);

  res.json({ success: true, count: accounts.length, accounts });
});

app.get('/api/accounts/:id', (req, res) => {
  const account = dataStores.accounts.get(req.params.id);
  if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

  // Get related opportunities
  const opportunities = Array.from(dataStores.opportunities.values())
    .filter(o => o.accountId === req.params.id);

  // Calculate total revenue
  const totalRevenue = opportunities
    .filter(o => o.stage === 'closed_won')
    .reduce((sum, o) => sum + o.value, 0);

  res.json({ success: true, account, opportunities, totalRevenue });
});

app.post('/api/accounts', (req, res) => {
  const { name, industry, size, revenue, website, phone, address } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

  const account = {
    id: `ACC${String(dataStores.accounts.size + 1).padStart(3, '0')}`,
    name,
    industry: industry || 'Other',
    size: size || 'SMB',
    revenue: revenue || 0,
    website: website || '',
    phone: phone || '',
    address: address || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.accounts.set(account.id, account);
  res.status(201).json({ success: true, account });
});

// ==================== OPPORTUNITIES / DEALS ====================

app.get('/api/opportunities', (req, res) => {
  const { stage, ownerId, accountId, minValue, maxValue } = req.query;
  let opportunities = Array.from(dataStores.opportunities.values());

  if (stage) opportunities = opportunities.filter(o => o.stage === stage);
  if (ownerId) opportunities = opportunities.filter(o => o.ownerId === ownerId);
  if (accountId) opportunities = opportunities.filter(o => o.accountId === accountId);
  if (minValue) opportunities = opportunities.filter(o => o.value >= parseInt(minValue));
  if (maxValue) opportunities = opportunities.filter(o => o.value <= parseInt(maxValue));

  res.json({ success: true, count: opportunities.length, opportunities });
});

app.get('/api/opportunities/:id', (req, res) => {
  const opportunity = dataStores.opportunities.get(req.params.id);
  if (!opportunity) return res.status(404).json({ success: false, error: 'Opportunity not found' });

  const activities = Array.from(dataStores.dealActivities.values())
    .filter(a => a.opportunityId === req.params.id);

  const account = dataStores.accounts.get(opportunity.accountId);
  const owner = dataStores.salesReps.get(opportunity.ownerId);

  res.json({ success: true, opportunity, activities, account, owner });
});

app.post('/api/opportunities', (req, res) => {
  const { title, accountId, value, stage, closeDate, ownerId, products } = req.body;

  if (!title || !value) {
    return res.status(400).json({ success: false, error: 'Title and value are required' });
  }

  const probabilities = {
    lead: 10,
    qualified: 25,
    proposal: 50,
    negotiation: 75,
    closed_won: 100,
    closed_lost: 0,
  };

  const opportunity = {
    id: `OPP${String(dataStores.opportunities.size + 1).padStart(3, '0')}`,
    title,
    accountId: accountId || null,
    value: parseInt(value),
    stage: stage || 'lead',
    probability: probabilities[stage] || 10,
    closeDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ownerId: ownerId || null,
    products: products || [],
    competitors: [],
    notes: '',
    activities: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dataStores.opportunities.set(opportunity.id, opportunity);
  res.status(201).json({ success: true, opportunity });
});

app.patch('/api/opportunities/:id', (req, res) => {
  const opportunity = dataStores.opportunities.get(req.params.id);
  if (!opportunity) return res.status(404).json({ success: false, error: 'Opportunity not found' });

  const probabilities = {
    lead: 10,
    qualified: 25,
    proposal: 50,
    negotiation: 75,
    closed_won: 100,
    closed_lost: 0,
  };

  const updated = { ...opportunity, ...req.body, updatedAt: new Date().toISOString() };

  // Update probability if stage changed
  if (req.body.stage && req.body.stage !== opportunity.stage) {
    updated.probability = probabilities[req.body.stage] || updated.probability;
  }

  dataStores.opportunities.set(req.params.id, updated);
  res.json({ success: true, opportunity: updated });
});

// Move opportunity in pipeline
app.post('/api/opportunities/:id/move', (req, res) => {
  const opportunity = dataStores.opportunities.get(req.params.id);
  if (!opportunity) return res.status(404).json({ success: false, error: 'Opportunity not found' });

  const { stage } = req.body;
  const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

  if (!stageOrder.includes(stage)) {
    return res.status(400).json({ success: false, error: 'Invalid stage' });
  }

  opportunity.stage = stage;
  opportunity.probability = stage === 'closed_won' ? 100 : stage === 'closed_lost' ? 0 :
    (stageOrder.indexOf(stage) * 20);
  opportunity.updatedAt = new Date().toISOString();

  // Log activity
  const activity = {
    id: `ACT${dataStores.activities.size + 1}`,
    type: 'stage_change',
    opportunityId: opportunity.id,
    from: req.body.fromStage || 'unknown',
    to: stage,
    timestamp: new Date().toISOString(),
  };
  dataStores.activities.set(activity.id, activity);
  dataStores.dealActivities.set(activity.id, activity);

  dataStores.opportunities.set(opportunity.id, opportunity);
  res.json({ success: true, opportunity });
});

// ==================== PIPELINE ====================

app.get('/api/pipeline', (req, res) => {
  const pipeline = {};
  const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation'];

  stageOrder.forEach(stage => {
    const opps = Array.from(dataStores.opportunities.values())
      .filter(o => o.stage === stage);

    pipeline[stage] = {
      count: opps.length,
      value: opps.reduce((sum, o) => sum + o.value, 0),
      weightedValue: opps.reduce((sum, o) => sum + (o.value * o.probability / 100), 0),
      opportunities: opps,
    };
  });

  res.json({ success: true, pipeline });
});

app.get('/api/pipeline/stages', (req, res) => {
  const stages = Array.from(dataStores.pipelineStages.values());
  res.json({ success: true, stages });
});

// ==================== SALES REP / TEAM ====================

app.get('/api/sales-reps', (req, res) => {
  const reps = Array.from(dataStores.salesReps.values());

  // Add performance metrics
  const repsWithMetrics = reps.map(rep => {
    const opps = Array.from(dataStores.opportunities.values())
      .filter(o => o.ownerId === rep.id);

    const closedWon = opps.filter(o => o.stage === 'closed_won');
    const active = opps.filter(o => !['closed_won', 'closed_lost'].includes(o.stage));

    return {
      ...rep,
      metrics: {
        totalDeals: opps.length,
        closedWon: closedWon.length,
        activeDeals: active.length,
        totalValue: opps.reduce((sum, o) => sum + o.value, 0),
        closedValue: closedWon.reduce((sum, o) => sum + o.value, 0),
        quotaAttainment: (rep.achieved / rep.quota) * 100,
      },
    };
  });

  res.json({ success: true, salesReps: repsWithMetrics });
});

app.get('/api/sales-reps/:id', (req, res) => {
  const rep = dataStores.salesReps.get(req.params.id);
  if (!rep) return res.status(404).json({ success: false, error: 'Sales rep not found' });

  const opportunities = Array.from(dataStores.opportunities.values())
    .filter(o => o.ownerId === req.params.id);

  res.json({ success: true, rep, opportunities });
});

// ==================== ACTIVITIES ====================

app.get('/api/activities', (req, res) => {
  const { type, ownerId, date } = req.query;
  let activities = Array.from(dataStores.activities.values());

  if (type) activities = activities.filter(a => a.type === type);
  if (ownerId) activities = activities.filter(a => a.ownerId === ownerId);
  if (date) activities = activities.filter(a => a.timestamp.startsWith(date));

  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ success: true, count: activities.length, activities });
});

app.post('/api/activities', (req, res) => {
  const { type, subject, description, ownerId, opportunityId, leadId, date } = req.body;

  const activity = {
    id: `ACT${dataStores.activities.size + 1}`,
    type: type || 'note',
    subject: subject || '',
    description: description || '',
    ownerId: ownerId || null,
    opportunityId: opportunityId || null,
    leadId: leadId || null,
    timestamp: date || new Date().toISOString(),
  };

  dataStores.activities.set(activity.id, activity);

  if (opportunityId) {
    dataStores.dealActivities.set(activity.id, activity);
  }
  if (leadId) {
    dataStores.leadActivities.set(activity.id, activity);
  }

  res.status(201).json({ success: true, activity });
});

// ==================== TASKS ====================

app.get('/api/tasks', (req, res) => {
  const { ownerId, status } = req.query;
  let tasks = Array.from(dataStores.tasks.values());

  if (ownerId) tasks = tasks.filter(t => t.ownerId === ownerId);
  if (status) tasks = tasks.filter(t => t.status === status);

  res.json({ success: true, count: tasks.length, tasks });
});

app.post('/api/tasks', (req, res) => {
  const { title, description, ownerId, dueDate, priority, relatedTo } = req.body;

  const task = {
    id: `TSK${dataStores.tasks.size + 1}`,
    title,
    description: description || '',
    ownerId: ownerId || null,
    dueDate: dueDate || null,
    priority: priority || 'medium',
    status: 'pending',
    relatedTo: relatedTo || null,
    createdAt: new Date().toISOString(),
  };

  dataStores.tasks.set(task.id, task);
  res.status(201).json({ success: true, task });
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = dataStores.tasks.get(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

  const updated = { ...task, ...req.body };
  dataStores.tasks.set(req.params.id, updated);
  res.json({ success: true, task: updated });
});

// ==================== PRODUCTS & QUOTES ====================

app.get('/api/products', (req, res) => {
  const products = Array.from(dataStores.products.values());
  res.json({ success: true, count: products.length, products });
});

app.get('/api/quotes', (req, res) => {
  const quotes = Array.from(dataStores.quotes.values());
  res.json({ success: true, count: quotes.length, quotes });
});

app.post('/api/quotes', (req, res) => {
  const { opportunityId, items, notes } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, error: 'Quote items required' });
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const quote = {
    id: `QTE${dataStores.quotes.size + 1}`,
    opportunityId,
    items,
    subtotal,
    tax,
    total,
    notes: notes || '',
    status: 'draft',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  dataStores.quotes.set(quote.id, quote);
  res.status(201).json({ success: true, quote });
});

// ==================== CAMPAIGNS ====================

app.get('/api/campaigns', (req, res) => {
  const campaigns = Array.from(dataStores.campaigns.values());
  res.json({ success: true, count: campaigns.length, campaigns });
});

app.get('/api/campaigns/:id', (req, res) => {
  const campaign = dataStores.campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

  // Get leads from this campaign
  const leads = Array.from(dataStores.leads.values())
    .filter(l => l.campaignId === req.params.id);

  res.json({ success: true, campaign, leads });
});

// ==================== ANALYTICS & REPORTS ====================

app.get('/api/analytics/overview', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const leads = Array.from(dataStores.leads.values());

  const totalPipeline = opportunities
    .filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
    .reduce((sum, o) => sum + o.value, 0);

  const closedWon = opportunities
    .filter(o => o.stage === 'closed_won')
    .reduce((sum, o) => sum + o.value, 0);

  const closedLost = opportunities
    .filter(o => o.stage === 'closed_lost')
    .reduce((sum, o) => sum + o.value, 0);

  const avgDealSize = opportunities.length > 0
    ? opportunities.reduce((sum, o) => sum + o.value, 0) / opportunities.length
    : 0;

  const winRate = opportunities.length > 0
    ? (opportunities.filter(o => o.stage === 'closed_won').length /
       opportunities.filter(o => ['closed_won', 'closed_lost'].includes(o.stage)).length) * 100
    : 0;

  res.json({
    success: true,
    overview: {
      totalLeads: leads.length,
      activeLeads: leads.filter(l => l.status !== 'converted').length,
      totalOpportunities: opportunities.length,
      activeOpportunities: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length,
      totalPipeline,
      closedWon,
      closedLost,
      avgDealSize,
      winRate: winRate.toFixed(2),
      conversionRate: ((leads.filter(l => l.status === 'converted').length / leads.length) * 100 || 0).toFixed(2),
    },
  });
});

app.get('/api/analytics/forecast', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values())
    .filter(o => !['closed_won', 'closed_lost'].includes(o.stage));

  const thisMonth = new Date().getMonth();
  const nextMonth = (thisMonth + 1) % 12;

  const forecast = {
    committed: opportunities
      .filter(o => o.probability >= 75)
      .reduce((sum, o) => sum + (o.value * o.probability / 100), 0),
    bestCase: opportunities
      .filter(o => o.probability >= 50)
      .reduce((sum, o) => sum + (o.value * o.probability / 100), 0),
    pipeline: opportunities.reduce((sum, o) => sum + o.value, 0),
    byMonth: {},
  };

  res.json({ success: true, forecast });
});

app.get('/api/analytics/rep-performance', (req, res) => {
  const reps = Array.from(dataStores.salesReps.values());
  const opportunities = Array.from(dataStores.opportunities.values());

  const performance = reps.map(rep => {
    const repOpps = opportunities.filter(o => o.ownerId === rep.id);
    const won = repOpps.filter(o => o.stage === 'closed_won');
    const lost = repOpps.filter(o => o.stage === 'closed_lost');

    return {
      repId: rep.id,
      name: rep.name,
      territory: rep.territory,
      quota: rep.quota,
      achieved: rep.achieved,
      attainment: ((rep.achieved / rep.quota) * 100).toFixed(1),
      dealsWon: won.length,
      dealsLost: lost.length,
      winRate: (won.length / (won.length + lost.length) * 100 || 0).toFixed(1),
      avgDealSize: won.length > 0
        ? (won.reduce((sum, o) => sum + o.value, 0) / won.length).toFixed(0)
        : 0,
    };
  });

  res.json({ success: true, performance });
});

app.get('/api/analytics/conversion-funnel', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const leads = Array.from(dataStores.leads.values());

  const funnel = [
    { stage: 'Leads', count: leads.length },
    { stage: 'Qualified', count: opportunities.filter(o => o.stage !== 'lead').length },
    { stage: 'Proposal', count: opportunities.filter(o => ['proposal', 'negotiation'].includes(o.stage)).length },
    { stage: 'Negotiation', count: opportunities.filter(o => o.stage === 'negotiation').length },
    { stage: 'Closed Won', count: opportunities.filter(o => o.stage === 'closed_won').length },
  ];

  res.json({ success: true, funnel });
});

// ==================== AI COPILOT ENDPOINTS ====================

// Sales Copilot - AI suggestions
app.post('/api/copilot/suggest', (req, res) => {
  const { action, context } = req.body;

  const suggestions = {
    next_best_action: [
      'Follow up with TechCorp India - proposal pending for 5 days',
      'Schedule demo for Global Retail Solutions - high intent signal',
      'Send case study to FinServe Financial - building trust',
    ],
    lead_scoring: [
      'LD003 (Rajesh Mehta) - High priority, schedule call today',
      'LD001 (Vikram Singh) - Score increased to 85, ready for proposal',
    ],
    pricing: [
      'Consider 10% discount for Enterprise deals > 10L',
      'Bundle products for 15% discount to close faster',
    ],
  };

  res.json({ success: true, suggestions: suggestions[action] || [] });
});

// ==================== SUTAR OS INTEGRATION ====================

// Goal tracking via SUTAR
app.get('/api/goals', (req, res) => {
  const reps = Array.from(dataStores.salesReps.values());

  const goals = reps.map(rep => ({
    entityId: rep.id,
    entityType: 'sales_rep',
    goals: [
      { type: 'revenue', target: rep.quota, current: rep.achieved, period: 'Q2 2026' },
      { type: 'deals', target: 10, current: rep.achieved / 50000, period: 'Q2 2026' },
    ],
    progress: ((rep.achieved / rep.quota) * 100).toFixed(1),
  }));

  res.json({ success: true, goals });
});

// ==================== MEMORY OS INTEGRATION ====================

app.get('/api/memory/:entityType/:entityId', (req, res) => {
  const { entityType, entityId } = req.params;

  // Simulated memory data
  const memory = {
    lastInteraction: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    interactions: [
      { date: '2026-06-10', type: 'call', summary: 'Discussed pricing options' },
      { date: '2026-06-05', type: 'email', summary: 'Sent product brochure' },
    ],
    preferences: { preferredContact: 'email', bestTime: 'morning' },
    notes: 'Interested in bundling multiple products',
  };

  res.json({ success: true, memory });
});

// ==================== TWIN OS INTEGRATION ====================

app.get('/api/twin/:type/:id', (req, res) => {
  const { type, id } = req.params;

  // Lead Twin
  if (type === 'lead') {
    const lead = dataStores.leads.get(id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const twin = {
      id: `lead-twin-${id}`,
      type: 'lead',
      syncedAt: new Date().toISOString(),
      data: {
        ...lead,
        behavioralScore: lead.score,
        engagementLevel: lead.score > 70 ? 'high' : lead.score > 40 ? 'medium' : 'low',
        riskFactors: lead.score < 30 ? ['Low engagement', 'Missing data'] : [],
      },
    };

    return res.json({ success: true, twin });
  }

  // Account Twin
  if (type === 'account') {
    const account = dataStores.accounts.get(id);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const opportunities = Array.from(dataStores.opportunities.values())
      .filter(o => o.accountId === id);

    const twin = {
      id: `account-twin-${id}`,
      type: 'account',
      syncedAt: new Date().toISOString(),
      data: {
        ...account,
        lifetimeValue: opportunities
          .filter(o => o.stage === 'closed_won')
          .reduce((sum, o) => sum + o.value, 0),
        relationshipScore: 85,
        healthScore: 'good',
      },
    };

    return res.json({ success: true, twin });
  }

  res.status(400).json({ success: false, error: 'Invalid twin type' });
});

// ==================== INTEGRATIONS STATUS ====================

app.get('/api/integrations', (req, res) => {
  const integrations = Array.from(dataStores.integrations.values());
  res.json({ success: true, integrations });
});

app.post('/api/integrations/:id/sync', (req, res) => {
  const integration = dataStores.integrations.get(req.params.id);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });

  integration.lastSync = new Date().toISOString();
  integration.status = 'syncing';
  dataStores.integrations.set(integration.id, integration);

  // Simulate sync
  setTimeout(() => {
    integration.status = 'connected';
    dataStores.integrations.set(integration.id, integration);
  }, 1000);

  res.json({ success: true, integration });
});

// ==================== DASHBOARD ====================

app.get('/api/dashboard', (req, res) => {
  const opportunities = Array.from(dataStores.opportunities.values());
  const leads = Array.from(dataStores.leads.values());
  const tasks = Array.from(dataStores.tasks.values());

  // Recent activities
  const recentActivities = Array.from(dataStores.activities.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  // Upcoming tasks
  const upcomingTasks = tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Hot deals
  const hotDeals = opportunities
    .filter(o => o.probability >= 50 && !['closed_won', 'closed_lost'].includes(o.stage))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  res.json({
    success: true,
    dashboard: {
      pipeline: {
        total: opportunities
          .filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
          .reduce((sum, o) => sum + o.value, 0),
        count: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length,
      },
      newLeads: leads.filter(l => l.status === 'new').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      closedWonThisMonth: opportunities
        .filter(o => o.stage === 'closed_won')
        .reduce((sum, o) => sum + o.value, 0),
      recentActivities,
      upcomingTasks,
      hotDeals,
    },
  });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('[Sales OS Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ==================== START ====================

// Initialize data
initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  SALES OS v1.0.0                        ║
║           Unified Sales Intelligence Platform           ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Status: Running                                         ║
║                                                          ║
║  Integrated Services:                                    ║
║  • REZ SalesMind - CRM & Pipeline                        ║
║  • Sales Copilot - AI Sales Assistant                   ║
║  • Lead Twin - Lead Intelligence                        ║
║  • CRM Engine - Core CRM                                 ║
║  • Executive Copilot - Analytics                         ║
║  • Finance Copilot - Financial Insights                  ║
║  • Marketing Copilot - Campaign Management               ║
║  • SUTAR OS - Autonomous Goals                          ║
║  • Memory OS - Customer Memory                           ║
║  • TwinOS Hub - Digital Twins                           ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
