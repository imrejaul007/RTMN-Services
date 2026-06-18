const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4710;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const organizations = new Map();
const departments = new Map();
const locations = new Map();
const relationships = new Map();
const syncEvents = new Map();

// Initialize with sample organizations
const sampleOrgs = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    legalName: 'Acme Corporation Inc.',
    type: 'enterprise',
    industry: 'Technology',
    size: 'enterprise',
    website: 'https://acme.example.com',
    founded: '2010-01-15',
    headquarters: { city: 'San Francisco', state: 'CA', country: 'USA' },
    taxId: 'XX-XXXXXXX',
    status: 'active',
    branding: { primaryColor: '#0066CC', logo: 'acme-logo.png' },
    social: { linkedin: 'acme-corp', twitter: '@acmecorp' },
    health: {
      overall: 85,
      financial: 90,
      operational: 80,
      customer: 85,
      employee: 88
    },
    kpis: {
      revenue: 50000000,
      employees: 500,
      customers: 1000,
      growth: 25
    },
    metadata: {},
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-06-15').toISOString()
  },
  {
    id: 'org-2',
    name: 'Global Tech Solutions',
    legalName: 'Global Tech Solutions LLC',
    type: 'enterprise',
    industry: 'IT Services',
    size: 'large',
    website: 'https://globaltech.example.com',
    founded: '2015-03-20',
    headquarters: { city: 'New York', state: 'NY', country: 'USA' },
    taxId: 'XX-YYYYYYY',
    status: 'active',
    branding: { primaryColor: '#FF6600', logo: 'gt-logo.png' },
    social: { linkedin: 'globaltech', twitter: '@globaltech' },
    health: {
      overall: 78,
      financial: 82,
      operational: 75,
      customer: 80,
      employee: 76
    },
    kpis: {
      revenue: 25000000,
      employees: 250,
      customers: 500,
      growth: 18
    },
    metadata: {},
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString()
  }
];

sampleOrgs.forEach(o => organizations.set(o.id, o));

// Initialize with sample departments
const sampleDepts = [
  { id: 'dept-1', orgId: 'org-1', name: 'Engineering', headcount: 150, budget: 5000000, status: 'active' },
  { id: 'dept-2', orgId: 'org-1', name: 'Sales', headcount: 80, budget: 3000000, status: 'active' },
  { id: 'dept-3', orgId: 'org-1', name: 'Marketing', headcount: 40, budget: 2000000, status: 'active' },
  { id: 'dept-4', orgId: 'org-1', name: 'HR', headcount: 15, budget: 500000, status: 'active' }
];

sampleDepts.forEach(d => departments.set(d.id, d));

// ==================== ORGANIZATIONS API ====================

// Get all organizations
app.get('/api/organizations', (req, res) => {
  const { industry, size, status, search } = req.query;

  let result = Array.from(organizations.values());

  if (industry) result = result.filter(o => o.industry === industry);
  if (size) result = result.filter(o => o.size === size);
  if (status) result = result.filter(o => o.status === status);
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(o => o.name.toLowerCase().includes(searchLower));
  }

  res.json({ organizations: result, total: result.length });
});

// Get single organization
app.get('/api/organizations/:id', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  res.json(org);
});

// Create organization
app.post('/api/organizations', (req, res) => {
  const { name, legalName, type, industry, size, website, headquarters } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Organization name is required' });
  }

  const org = {
    id: `org-${uuidv4().slice(0, 8)}`,
    name,
    legalName: legalName || name,
    type: type || 'business',
    industry: industry || 'General',
    size: size || 'medium',
    website: website || '',
    founded: null,
    headquarters: headquarters || {},
    taxId: '',
    status: 'active',
    branding: { primaryColor: '#333333', logo: '' },
    social: {},
    health: { overall: 100, financial: 100, operational: 100, customer: 100, employee: 100 },
    kpis: { revenue: 0, employees: 0, customers: 0, growth: 0 },
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  organizations.set(org.id, org);

  res.status(201).json(org);
});

// Update organization
app.put('/api/organizations/:id', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const updates = ['name', 'legalName', 'type', 'industry', 'size', 'website', 'headquarters', 'branding', 'social'];
  updates.forEach(field => {
    if (req.body[field]) org[field] = req.body[field];
  });

  org.updatedAt = new Date().toISOString();

  res.json(org);
});

// Delete organization
app.delete('/api/organizations/:id', (req, res) => {
  if (!organizations.has(req.params.id)) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  organizations.delete(req.params.id);

  res.json({ message: 'Organization deleted successfully' });
});

// ==================== DEPARTMENTS API ====================

// Get organization departments
app.get('/api/organizations/:id/departments', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const orgDepts = Array.from(departments.values()).filter(d => d.orgId === req.params.id);

  res.json({ departments: orgDepts, total: orgDepts.length });
});

// Create department
app.post('/api/organizations/:id/departments', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const { name, headcount, budget } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const dept = {
    id: `dept-${uuidv4().slice(0, 8)}`,
    orgId: req.params.id,
    name,
    headcount: headcount || 0,
    budget: budget || 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  departments.set(dept.id, dept);

  res.status(201).json(dept);
});

// ==================== HEALTH API ====================

// Get organization health
app.get('/api/organizations/:id/health', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  res.json({
    organizationId: org.id,
    overall: org.health.overall,
    dimensions: {
      financial: org.health.financial,
      operational: org.health.operational,
      customer: org.health.customer,
      employee: org.health.employee
    },
    updatedAt: org.updatedAt
  });
});

// Update health metrics
app.put('/api/organizations/:id/health', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const { overall, financial, operational, customer, employee } = req.body;

  if (overall !== undefined) org.health.overall = overall;
  if (financial !== undefined) org.health.financial = financial;
  if (operational !== undefined) org.health.operational = operational;
  if (customer !== undefined) org.health.customer = customer;
  if (employee !== undefined) org.health.employee = employee;

  org.updatedAt = new Date().toISOString();

  res.json(org.health);
});

// ==================== KPIs API ====================

// Get organization KPIs
app.get('/api/organizations/:id/kpis', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  res.json({
    organizationId: org.id,
    kpis: org.kpis,
    updatedAt: org.updatedAt
  });
});

// Update KPIs
app.put('/api/organizations/:id/kpis', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const { revenue, employees, customers, growth } = req.body;

  if (revenue !== undefined) org.kpis.revenue = revenue;
  if (employees !== undefined) org.kpis.employees = employees;
  if (customers !== undefined) org.kpis.customers = customers;
  if (growth !== undefined) org.kpis.growth = growth;

  org.updatedAt = new Date().toISOString();

  res.json(org.kpis);
});

// ==================== RELATIONSHIPS API ====================

// Get relationships
app.get('/api/organizations/:id/relationships', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const orgRelationships = Array.from(relationships.values())
    .filter(r => r.fromOrgId === req.params.id || r.toOrgId === req.params.id);

  res.json({ relationships: orgRelationships });
});

// Create relationship
app.post('/api/organizations/:id/relationships', (req, res) => {
  const { toOrgId, type, description } = req.body;

  if (!toOrgId || !type) {
    return res.status(400).json({ error: 'Target organization and relationship type required' });
  }

  const relationship = {
    id: `rel-${uuidv4().slice(0, 8)}`,
    fromOrgId: req.params.id,
    toOrgId,
    type,
    description: description || '',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  relationships.set(relationship.id, relationship);

  res.status(201).json(relationship);
});

// ==================== SYNC EVENTS API ====================

// Get sync history
app.get('/api/organizations/:id/sync', (req, res) => {
  const { limit = 50 } = req.query;

  const events = Array.from(syncEvents.values())
    .filter(e => e.entityType === 'organization' && e.entityId === req.params.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, Number(limit));

  res.json({ events });
});

// Trigger sync
app.post('/api/organizations/:id/sync', (req, res) => {
  const org = organizations.get(req.params.id);

  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  const event = {
    id: `sync-${uuidv4().slice(0, 8)}`,
    entityType: 'organization',
    entityId: org.id,
    action: 'sync',
    status: 'completed',
    changes: {},
    timestamp: new Date().toISOString()
  };

  syncEvents.set(event.id, event);

  // Simulate sync updating timestamp
  org.updatedAt = new Date().toISOString();

  res.json({ message: 'Sync completed', event });
});

// ==================== COMPARISON API ====================

// Compare organizations
app.post('/api/compare', (req, res) => {
  const { organizationIds } = req.body;

  if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length < 2) {
    return res.status(400).json({ error: 'At least 2 organization IDs required' });
  }

  const orgs = organizationIds.map(id => organizations.get(id)).filter(Boolean);

  if (orgs.length < 2) {
    return res.status(404).json({ error: 'Not enough valid organizations found' });
  }

  const comparison = {
    organizations: orgs.map(o => ({
      id: o.id,
      name: o.name,
      industry: o.industry,
      size: o.size
    })),
    health: orgs.map(o => o.health),
    kpis: orgs.map(o => o.kpis)
  };

  res.json(comparison);
});

// ==================== STATISTICS API ====================

app.get('/api/statistics', (req, res) => {
  const allOrgs = Array.from(organizations.values());

  const stats = {
    total: allOrgs.length,
    byIndustry: {},
    bySize: {},
    byStatus: {},
    avgHealth: {
      overall: 0,
      financial: 0,
      operational: 0,
      customer: 0,
      employee: 0
    }
  };

  allOrgs.forEach(org => {
    stats.byIndustry[org.industry] = (stats.byIndustry[org.industry] || 0) + 1;
    stats.bySize[org.size] = (stats.bySize[org.size] || 0) + 1;
    stats.byStatus[org.status] = (stats.byStatus[org.status] || 0) + 1;

    stats.avgHealth.overall += org.health.overall;
    stats.avgHealth.financial += org.health.financial;
    stats.avgHealth.operational += org.health.operational;
    stats.avgHealth.customer += org.health.customer;
    stats.avgHealth.employee += org.health.employee;
  });

  const count = allOrgs.length;
  stats.avgHealth.overall = Math.round(stats.avgHealth.overall / count);
  stats.avgHealth.financial = Math.round(stats.avgHealth.financial / count);
  stats.avgHealth.operational = Math.round(stats.avgHealth.operational / count);
  stats.avgHealth.customer = Math.round(stats.avgHealth.customer / count);
  stats.avgHealth.employee = Math.round(stats.avgHealth.employee / count);

  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'organization-twin',
    port: PORT,
    organizations: organizations.size,
    departments: departments.size,
    relationships: relationships.size
  });
});

app.listen(PORT, () => {
  console.log('🏢 Organization Twin Service running on port ' + PORT);
  console.log('   Organizations: ' + organizations.size);
  console.log('   Departments: ' + departments.size);
});
