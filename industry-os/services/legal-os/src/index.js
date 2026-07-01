/**
 * RTMN Legal OS - AI-Powered Legal Department
 *
 * Port: 5035
 *
 * Modules:
 * - Contract Management
 * - Compliance Management
 * - Document Management
 * - Matter Management
 * - Billing & Invoicing
 * - AI Legal Assistant
 * - Digital Twin
 */

const express = require('express');
const cors = require('cors');

// RTMN Industry Integration
const industryIntegration = require('./industry-integration');

const app = express();
app.use(cors());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

const PORT = process.env.PORT || 5035;

// ============================================================
// DATABASE
// ============================================================

const db = {
  contracts: new Map(),
  clauses: new Map(),
  templates: new Map(),
  regulations: new Map(),
  documents: new Map(),
  matters: new Map(),
  clients: new Map(),
  invoices: new Map(),
  activities: new Map(),
};

// ============================================================
// SAMPLE DATA
// ============================================================

function initData() {
  // Contracts
  [
    { id: 'CTR001', title: 'Master Service Agreement - Acme Corp', type: 'MSA', status: 'active', value: 5000000, startDate: '2026-01-01', endDate: '2027-12-31', client: 'Acme Corp', parties: ['RTMN', 'Acme Corp'], clauses: 15 },
    { id: 'CTR002', title: 'NDA - TechStart Inc', type: 'NDA', status: 'active', value: 0, startDate: '2026-03-01', endDate: '2028-03-01', client: 'TechStart', parties: ['RTMN', 'TechStart'], clauses: 8 },
    { id: 'CTR003', title: 'Software License - Enterprise', type: 'License', status: 'pending', value: 2500000, startDate: '2026-07-01', endDate: '2027-06-30', client: 'Global Solutions', parties: ['RTMN', 'Global Solutions'], clauses: 20 },
    { id: 'CTR004', title: 'Consulting Agreement - Q3', type: 'Consulting', status: 'draft', value: 800000, startDate: '2026-07-15', endDate: '2026-09-30', client: 'Innovate Labs', parties: ['RTMN', 'Innovate Labs'], clauses: 12 },
    { id: 'CTR005', title: 'Employment Contract - Sr Developer', type: 'Employment', status: 'active', value: 1800000, startDate: '2026-04-01', endDate: '2028-03-31', client: 'Employee', parties: ['RTMN', 'John Doe'], clauses: 25 },
    { id: 'CTR006', title: 'Vendor Agreement - Cloud Services', type: 'Vendor', status: 'active', value: 1200000, startDate: '2026-01-01', endDate: '2026-12-31', client: 'CloudHost', parties: ['RTMN', 'CloudHost'], clauses: 18 },
    { id: 'CTR007', title: 'Partnership Agreement - Distributor', type: 'Partnership', status: 'under_review', value: 5000000, startDate: '2026-08-01', endDate: '2029-07-31', client: 'Distro Partners', parties: ['RTMN', 'Distro Partners'], clauses: 30 },
    { id: 'CTR008', title: 'SLA Agreement - Support', type: 'SLA', status: 'active', value: 600000, startDate: '2026-02-01', endDate: '2027-01-31', client: 'Enterprise Inc', parties: ['RTMN', 'Enterprise Inc'], clauses: 15 },
  ].forEach(c => db.contracts.set(c.id, c));

  // Clauses
  [
    { id: 'CL001', name: 'Confidentiality', category: 'standard', risk: 'low', description: 'Protection of confidential information' },
    { id: 'CL002', name: 'Indemnification', category: 'liability', risk: 'high', description: 'Mutual indemnification provisions' },
    { id: 'CL003', name: 'Limitation of Liability', category: 'liability', risk: 'high', description: 'Cap on damages and liability' },
    { id: 'CL004', name: 'Termination', category: 'standard', risk: 'medium', description: 'Termination conditions and notice periods' },
    { id: 'CL005', name: 'Force Majeure', category: 'standard', risk: 'low', description: 'Extraordinary events clause' },
    { id: 'CL006', name: 'Governing Law', category: 'jurisdiction', risk: 'low', description: 'Applicable law and jurisdiction' },
    { id: 'CL007', name: 'Payment Terms', category: 'financial', risk: 'medium', description: 'Payment schedule and terms' },
    { id: 'CL008', name: 'IP Assignment', category: 'ip', risk: 'high', description: 'Intellectual property ownership' },
    { id: 'CL009', name: 'Non-Compete', category: 'restrictive', risk: 'high', description: 'Non-competition restrictions' },
    { id: 'CL010', name: 'Data Protection', category: 'compliance', risk: 'high', description: 'GDPR and data handling' },
  ].forEach(c => db.clauses.set(c.id, c));

  // Templates
  [
    { id: 'TPL001', name: 'Master Service Agreement', category: 'Commercial', type: 'MSA', downloads: 45, lastUsed: '2026-06-15' },
    { id: 'TPL002', name: 'Non-Disclosure Agreement', category: 'Confidentiality', type: 'NDA', downloads: 120, lastUsed: '2026-06-18' },
    { id: 'TPL003', name: 'Employment Contract', category: 'HR', type: 'Employment', downloads: 85, lastUsed: '2026-06-10' },
    { id: 'TPL004', name: 'Software License Agreement', category: 'Commercial', type: 'License', downloads: 32, lastUsed: '2026-06-12' },
    { id: 'TPL005', name: 'Vendor Agreement', category: 'Procurement', type: 'Vendor', downloads: 28, lastUsed: '2026-06-08' },
    { id: 'TPL006', name: 'Consulting Agreement', category: 'Professional', type: 'Consulting', downloads: 56, lastUsed: '2026-06-14' },
  ].forEach(t => db.templates.set(t.id, t));

  // Compliance
  [
    { id: 'REG001', name: 'GDPR Compliance', category: 'Privacy', status: 'compliant', lastAudit: '2026-05-15', nextAudit: '2026-11-15' },
    { id: 'REG002', name: 'SOC 2 Type II', category: 'Security', status: 'compliant', lastAudit: '2026-04-20', nextAudit: '2027-04-20' },
    { id: 'REG003', name: 'ISO 27001', category: 'Security', status: 'in_progress', lastAudit: '2026-03-10', nextAudit: '2026-09-10' },
    { id: 'REG004', name: 'HIPAA Compliance', category: 'Healthcare', status: 'not_applicable', lastAudit: null, nextAudit: null },
    { id: 'REG005', name: 'PCI DSS', category: 'Payment', status: 'compliant', lastAudit: '2026-06-01', nextAudit: '2026-12-01' },
  ].forEach(r => db.regulations.set(r.id, r));

  // Documents
  [
    { id: 'DOC001', name: 'Company Charter', type: 'Corporate', category: 'Governance', version: 3, size: '2.5 MB', uploadedBy: 'Legal Team', uploadedAt: '2026-01-15' },
    { id: 'DOC002', name: 'Board Resolution - Series A', type: 'Corporate', category: 'Governance', version: 1, size: '1.2 MB', uploadedBy: 'Legal Team', uploadedAt: '2026-03-20' },
    { id: 'DOC003', name: 'Privacy Policy', type: 'Compliance', category: 'Privacy', version: 5, size: '890 KB', uploadedBy: 'Compliance', uploadedAt: '2026-06-01' },
    { id: 'DOC004', name: 'Terms of Service', type: 'Compliance', category: 'Commercial', version: 8, size: '1.1 MB', uploadedBy: 'Legal Team', uploadedAt: '2026-05-15' },
    { id: 'DOC005', name: 'Employee Handbook', type: 'HR', category: 'Policies', version: 12, size: '4.5 MB', uploadedBy: 'HR', uploadedAt: '2026-04-01' },
  ].forEach(d => db.documents.set(d.id, d));

  // Matters
  [
    { id: 'MAT001', title: 'Acme Corp Dispute', type: 'Litigation', status: 'active', priority: 'high', assignedTo: 'Adv. Sharma', client: 'Acme Corp', createdAt: '2026-05-01' },
    { id: 'MAT002', title: 'IP Registration - Logo', type: 'IP', status: 'in_progress', priority: 'medium', assignedTo: 'Adv. Patel', client: 'RTMN', createdAt: '2026-04-15' },
    { id: 'MAT003', title: 'Vendor Breach - CloudHost', type: 'Dispute', status: 'closed', priority: 'high', assignedTo: 'Adv. Sharma', client: 'RTMN', createdAt: '2026-02-10', closedAt: '2026-05-20' },
    { id: 'MAT004', title: 'Employment Issue - WFH Policy', type: 'Employment', status: 'active', priority: 'low', assignedTo: 'Adv. Kumar', client: 'Employee', createdAt: '2026-06-01' },
  ].forEach(m => db.matters.set(m.id, m));

  // Clients
  [
    { id: 'CLI001', name: 'Acme Corp', type: 'Corporate', contacts: 3, activeContracts: 5, matters: 2 },
    { id: 'CLI002', name: 'TechStart', type: 'Startup', contacts: 2, activeContracts: 3, matters: 0 },
    { id: 'CLI003', name: 'Global Solutions', type: 'Enterprise', contacts: 5, activeContracts: 8, matters: 1 },
    { id: 'CLI004', name: 'Innovate Labs', type: 'Startup', contacts: 1, activeContracts: 2, matters: 0 },
  ].forEach(c => db.clients.set(c.id, c));

  // Invoices
  [
    { id: 'INV001', contractId: 'CTR001', client: 'Acme Corp', amount: 500000, status: 'sent', dueDate: '2026-07-15' },
    { id: 'INV002', contractId: 'CTR001', client: 'Acme Corp', amount: 500000, status: 'paid', dueDate: '2026-04-15', paidAt: '2026-04-12' },
    { id: 'INV003', contractId: 'CTR005', client: 'Employee', amount: 150000, status: 'pending', dueDate: '2026-07-31' },
    { id: 'INV004', contractId: 'CTR006', client: 'CloudHost', amount: 100000, status: 'overdue', dueDate: '2026-06-01' },
  ].forEach(i => db.invoices.set(i.id, i));

  console.log(`Legal OS: ${db.contracts.size} contracts, ${db.matters.size} matters, ${db.regulations.size} regulations`);
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'legal-os',
    version: '1.0.0',
    port: PORT,
    tagline: 'AI-Powered Legal Department',
  });
});

app.get('/status', (req, res) => {
  const contracts = Array.from(db.contracts.values());
  res.json({
    service: 'Legal OS',
    tagline: 'AI-Powered Legal Department',
    modules: {
      contracts: { count: db.contracts.size, active: contracts.filter(c => c.status === 'active').length },
      compliance: { count: db.regulations.size },
      documents: { count: db.documents.size },
      matters: { count: db.matters.size },
      templates: { count: db.templates.size },
      clients: { count: db.clients.size },
      invoices: { count: db.invoices.size },
      aiAssistant: true,
      digitalTwin: true,
    },
    stats: {
      totalContracts: db.contracts.size,
      activeContracts: contracts.filter(c => c.status === 'active').length,
      totalValue: contracts.reduce((s, c) => s + (c.value || 0), 0),
      complianceScore: Math.round((Array.from(db.regulations.values()).filter(r => r.status === 'compliant').length / db.regulations.size) * 100),
    },
  });
});

// ============================================================
// CONTRACTS
// ============================================================

app.get('/api/contracts', (req, res) => {
  const { status, type, client } = req.query;
  let contracts = Array.from(db.contracts.values());
  if (status) contracts = contracts.filter(c => c.status === status);
  if (type) contracts = contracts.filter(c => c.type === type);
  if (client) contracts = contracts.filter(c => c.client.toLowerCase().includes(client.toLowerCase()));
  res.json({ contracts, total: contracts.length });
});

// Dashboard BEFORE :id to avoid route conflict
app.get('/api/contracts/dashboard', (req, res) => {
  const contracts = Array.from(db.contracts.values());
  const byStatus = {};
  contracts.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const renewals = contracts.filter(c => c.status === 'active' && c.endDate && new Date(c.endDate) <= thirtyDays);

  res.json({
    total: contracts.length,
    byStatus,
    totalValue: contracts.reduce((s, c) => s + (c.value || 0), 0),
    activeValue: contracts.filter(c => c.status === 'active').reduce((s, c) => s + (c.value || 0), 0),
    renewals: renewals.length,
    upcomingRenewals: renewals.slice(0, 5),
  });
});

app.get('/api/contracts/:id', (req, res) => {
  const contract = db.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

app.post('/api/contracts', (req, res) => {
  const { title, type, client, value, startDate, endDate, parties } = req.body;
  const id = `CTR${String(db.contracts.size + 1).padStart(3, '0')}`;
  const contract = { id, title, type: type || 'Other', status: 'draft', value: value || 0, startDate, endDate, client, parties: parties || [], clauses: 0, createdAt: new Date().toISOString() };
  db.contracts.set(id, contract);
  res.status(201).json(contract);
});

app.patch('/api/contracts/:id', (req, res) => {
  const contract = db.contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const updated = { ...contract, ...req.body, updatedAt: new Date().toISOString() };
  db.contracts.set(req.params.id, updated);
  res.json(updated);
});

// ============================================================
// CLAUSES
// ============================================================

app.get('/api/clauses', (req, res) => {
  const clauses = Array.from(db.clauses.values());
  res.json({ clauses, total: clauses.length });
});

app.post('/api/clauses', (req, res) => {
  const { name, category, risk, description } = req.body;
  const id = `CL${String(db.clauses.size + 1).padStart(3, '0')}`;
  const clause = { id, name, category, risk: risk || 'medium', description };
  db.clauses.set(id, clause);
  res.status(201).json(clause);
});

// ============================================================
// TEMPLATES
// ============================================================

app.get('/api/templates', (req, res) => {
  const templates = Array.from(db.templates.values());
  res.json({ templates, total: templates.length });
});

app.get('/api/templates/:id', (req, res) => {
  const template = db.templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

app.post('/api/templates/:id/generate', (req, res) => {
  const template = db.templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const { variables } = req.body;
  const id = `CTR${Date.now()}`;
  const contract = { id, title: `Contract from ${template.name}`, type: template.type, status: 'draft', value: variables?.value || 0, client: variables?.client || 'New Client', createdFrom: template.id, createdAt: new Date().toISOString() };
  db.contracts.set(id, contract);
  res.json({ contract, template });
});

// ============================================================
// COMPLIANCE
// ============================================================

app.get('/api/compliance', (req, res) => {
  const regulations = Array.from(db.regulations.values());
  const compliant = regulations.filter(r => r.status === 'compliant').length;
  res.json({
    regulations,
    summary: { total: regulations.length, compliant, score: Math.round((compliant / regulations.length) * 100) },
  });
});

app.get('/api/compliance/risks', (req, res) => {
  const risks = [];
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  Array.from(db.contracts.values()).forEach(c => {
    if (c.status === 'active' && c.endDate && new Date(c.endDate) <= thirtyDays) {
      risks.push({ type: 'contract_expiry', severity: 'high', title: `Contract ${c.id} expiring`, description: `${c.title} expires ${c.endDate}` });
    }
  });

  Array.from(db.invoices.values()).filter(i => i.status === 'overdue').forEach(i => {
    risks.push({ type: 'payment_overdue', severity: 'medium', title: `Overdue invoice ${i.id}`, description: `Rs.${i.amount.toLocaleString()} overdue` });
  });

  res.json({ risks, total: risks.length });
});

// ============================================================
// DOCUMENTS
// ============================================================

app.get('/api/documents', (req, res) => {
  const { type, category } = req.query;
  let docs = Array.from(db.documents.values());
  if (type) docs = docs.filter(d => d.type === type);
  if (category) docs = docs.filter(d => d.category === category);
  res.json({ documents: docs, total: docs.length });
});

app.get('/api/documents/:id', (req, res) => {
  const doc = db.documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

app.post('/api/documents', (req, res) => {
  const { name, type, category, uploadedBy } = req.body;
  const id = `DOC${String(db.documents.size + 1).padStart(3, '0')}`;
  const doc = { id, name, type, category, version: 1, size: '0 KB', uploadedBy, uploadedAt: new Date().toISOString() };
  db.documents.set(id, doc);
  res.status(201).json(doc);
});

// ============================================================
// MATTERS
// ============================================================

app.get('/api/matters', (req, res) => {
  const { status, type } = req.query;
  let matters = Array.from(db.matters.values());
  if (status) matters = matters.filter(m => m.status === status);
  if (type) matters = matters.filter(m => m.type === type);
  res.json({ matters, total: matters.length });
});

app.get('/api/matters/:id', (req, res) => {
  const matter = db.matters.get(req.params.id);
  if (!matter) return res.status(404).json({ error: 'Matter not found' });
  const activities = Array.from(db.activities.values()).filter(a => a.matterId === req.params.id);
  res.json({ matter, activities });
});

app.post('/api/matters', (req, res) => {
  const { title, type, priority, client, assignedTo } = req.body;
  const id = `MAT${String(db.matters.size + 1).padStart(3, '0')}`;
  const matter = { id, title, type: type || 'General', status: 'active', priority: priority || 'medium', client, assignedTo, createdAt: new Date().toISOString() };
  db.matters.set(id, matter);
  res.status(201).json(matter);
});

// ============================================================
// CLIENTS
// ============================================================

app.get('/api/clients', (req, res) => {
  const clients = Array.from(db.clients.values());
  res.json({ clients, total: clients.length });
});

app.get('/api/clients/:id', (req, res) => {
  const client = db.clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const contracts = Array.from(db.contracts.values()).filter(c => c.client === client.name);
  const matters = Array.from(db.matters.values()).filter(m => m.client === client.name);
  res.json({ client, contracts, matters, totalContractValue: contracts.reduce((s, c) => s + (c.value || 0), 0) });
});

// ============================================================
// BILLING
// ============================================================

app.get('/api/billing/invoices', (req, res) => {
  const { status } = req.query;
  let invoices = Array.from(db.invoices.values());
  if (status) invoices = invoices.filter(i => i.status === status);
  const summary = { total: invoices.length, pending: invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0), overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0) };
  res.json({ invoices, summary });
});

// ============================================================
// AI LEGAL ASSISTANT
// ============================================================

app.post('/api/ai/analyze', (req, res) => {
  const { query } = req.body;
  const lower = (query || '').toLowerCase();
  let response = 'Legal AI Assistant\n\n';

  const contracts = Array.from(db.contracts.values());
  const regulations = Array.from(db.regulations.values());
  const matters = Array.from(db.matters.values());
  const invoices = Array.from(db.invoices.values());

  if (lower.includes('contract')) {
    response += `Contract Analysis:\n`;
    response += `• Total: ${contracts.length}\n`;
    response += `• Active: ${contracts.filter(c => c.status === 'active').length}\n`;
    response += `• Pending: ${contracts.filter(c => c.status === 'pending').length}\n`;
    response += `• Total Value: Rs.${(contracts.reduce((s, c) => s + (c.value || 0), 0) / 100000).toFixed(0)}L\n`;
  } else if (lower.includes('compliance')) {
    const compliant = regulations.filter(r => r.status === 'compliant').length;
    response += `Compliance Status:\n`;
    response += `• Compliant: ${compliant}/${regulations.length}\n`;
    response += `• Score: ${Math.round((compliant / regulations.length) * 100)}%\n`;
  } else if (lower.includes('matter') || lower.includes('case')) {
    response += `Matter Status:\n`;
    response += `• Total: ${matters.length}\n`;
    response += `• Active: ${matters.filter(m => m.status === 'active').length}\n`;
  } else if (lower.includes('invoice') || lower.includes('billing')) {
    response += `Billing Status:\n`;
    response += `• Pending: Rs.${(invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0) / 100000).toFixed(1)}L\n`;
    response += `• Overdue: Rs.${(invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0) / 100000).toFixed(1)}L\n`;
  } else {
    response += `I can analyze:\n• Contract status\n• Compliance score\n• Matter updates\n• Billing overview\n• Risk assessment`;
  }

  res.json({ response, query, timestamp: new Date().toISOString() });
});

// ============================================================
// DIGITAL TWIN
// ============================================================

app.get('/api/twin', (req, res) => {
  const contracts = Array.from(db.contracts.values());
  const regulations = Array.from(db.regulations.values());
  const matters = Array.from(db.matters.values());
  const invoices = Array.from(db.invoices.values());

  res.json({
    id: 'TWIN-LEGAL',
    name: 'Legal Department Twin',
    type: 'legal',
    lastUpdated: new Date().toISOString(),
    health: { score: 85, status: 'healthy' },
    data: {
      contracts: { total: contracts.length, active: contracts.filter(c => c.status === 'active').length, totalValue: contracts.reduce((s, c) => s + (c.value || 0), 0) },
      compliance: { total: regulations.length, compliant: regulations.filter(r => r.status === 'compliant').length, score: Math.round((regulations.filter(r => r.status === 'compliant').length / regulations.length) * 100) },
      matters: { total: matters.length, active: matters.filter(m => m.status === 'active').length },
      billing: { outstanding: invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0) },
    },
    recommendations: ['Review expiring contracts', 'Complete ISO audit', 'Follow up on overdue invoices'],
  });
});

// ============================================================
// ANALYTICS
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const contracts = Array.from(db.contracts.values());
  const matters = Array.from(db.matters.values());
  const invoices = Array.from(db.invoices.values());
  const regulations = Array.from(db.regulations.values());

  res.json({
    timestamp: new Date().toISOString(),
    contracts: { total: contracts.length, byStatus: contracts.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {}), totalValue: contracts.reduce((s, c) => s + (c.value || 0), 0) },
    matters: { total: matters.length, active: matters.filter(m => m.status === 'active').length },
    billing: { totalInvoices: invoices.length, pending: invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0), overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0) },
    complianceScore: Math.round((regulations.filter(r => r.status === 'compliant').length / regulations.length) * 100),
  });
});

// ============================================================
// INTEGRATIONS
// ============================================================

app.get('/api/integrations', (req, res) => {
  res.json({ integrations: [
    { id: 'finance', name: 'Finance OS', port: 4801, status: 'connected' },
    { id: 'operations', name: 'Operations OS', port: 5250, status: 'connected' },
    { id: 'workforce', name: 'Workforce OS', port: 5077, status: 'connected' },
  ]});
});

// ============================================================
// RTMN INDUSTRY INTEGRATION
// ============================================================

// Register Industry Integration Routes
industryIntegration.registerRoutes(app, 'legal', PORT);
console.log('✅ Legal OS connected to RTMN Ecosystem');

// ============================================================
// START
// ============================================================

initData();
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║           LEGAL OS - AI-POWERED LEGAL DEPARTMENT              ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                                   ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  MODULES:                                                  ║`);
  console.log(`║  ✅ Contract Management                                      ║`);
  console.log(`║  ✅ Compliance Management                                    ║`);
  console.log(`║  ✅ Document Management                                      ║`);
  console.log(`║  ✅ Matter Management                                        ║`);
  console.log(`║  ✅ Billing & Invoicing                                     ║`);
  console.log(`║  ✅ AI Legal Assistant                                      ║`);
  console.log(`║  ✅ Digital Twin                                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n  Try: curl http://localhost:${PORT}/api/contracts`);
  console.log(`       curl http://localhost:${PORT}/api/compliance`);
  console.log(`       curl http://localhost:${PORT}/api/twin`);
});
