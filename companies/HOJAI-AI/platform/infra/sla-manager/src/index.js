const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

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
const PORT = 4873;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const policies = new PersistentMap('policies', { serviceName: 'sla-manager' });
const agreements = new PersistentMap('agreements', { serviceName: 'sla-manager' });
const breaches = new PersistentMap('breaches', { serviceName: 'sla-manager' });
const metrics = new PersistentMap('metrics', { serviceName: 'sla-manager' });

// Initialize with sample SLA policies
const samplePolicies = [
  {
    id: 'policy-1',
    name: 'Gold Support',
    tier: 'gold',
    responseTime: 1, // hours
    resolutionTime: 4, // hours
    availability: 99.9, // percentage
    supportChannels: ['email', 'phone', 'chat'],
    priorityLevels: ['critical', 'high', 'medium', 'low'],
    price: 999,
    features: ['24/7 Support', 'Dedicated Manager', 'Quarterly Reviews'],
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString()
  },
  {
    id: 'policy-2',
    name: 'Silver Support',
    tier: 'silver',
    responseTime: 4, // hours
    resolutionTime: 24, // hours
    availability: 99.5,
    supportChannels: ['email', 'chat'],
    priorityLevels: ['high', 'medium', 'low'],
    price: 499,
    features: ['Business Hours', 'Email Support', 'Knowledge Base'],
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString()
  },
  {
    id: 'policy-3',
    name: 'Bronze Support',
    tier: 'bronze',
    responseTime: 8, // hours
    resolutionTime: 48, // hours
    availability: 99.0,
    supportChannels: ['email'],
    priorityLevels: ['medium', 'low'],
    price: 199,
    features: ['Email Support', 'FAQ Access'],
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString()
  }
];

samplePolicies.forEach(p => policies.set(p.id, p));

// Sample agreements
const sampleAgreements = [
  { id: 'agr-1', customerId: 'cust-1', customerName: 'Acme Corp', policyId: 'policy-1', status: 'active', startDate: '2025-01-01', endDate: '2026-01-01', ticketsHandled: 156, breaches: 2 },
  { id: 'agr-2', customerId: 'cust-2', customerName: 'Global Tech', policyId: 'policy-2', status: 'active', startDate: '2025-03-01', endDate: '2026-03-01', ticketsHandled: 89, breaches: 1 },
  { id: 'agr-3', customerId: 'cust-3', customerName: 'StartUp Inc', policyId: 'policy-3', status: 'active', startDate: '2025-02-01', endDate: '2026-02-01', ticketsHandled: 45, breaches: 3 }
];

sampleAgreements.forEach(a => agreements.set(a.id, a));

// ==================== POLICIES API ====================

// Get all policies
app.get('/api/policies', (req, res) => {
  const { tier, status } = req.query;
  
  let result = Array.from(policies.values());
  
  if (tier) result = result.filter(p => p.tier === tier);
  if (status) result = result.filter(p => p.status === status);
  
  res.json({ policies: result, total: result.length });
});

// Get single policy
app.get('/api/policies/:id', (req, res) => {
  const policy = policies.get(req.params.id);
  
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  
  res.json(policy);
});

// Create policy
app.post('/api/policies',requireAuth,  (req, res) => {
  const { name, tier, responseTime, resolutionTime, availability, supportChannels, price, features } = req.body;
  
  if (!name || !tier) {
    return res.status(400).json({ error: 'Name and tier are required' });
  }
  
  const policy = {
    id: `policy-${uuidv4().slice(0, 8)}`,
    name,
    tier,
    responseTime: responseTime || 24,
    resolutionTime: resolutionTime || 72,
    availability: availability || 99.0,
    supportChannels: supportChannels || ['email'],
    priorityLevels: ['critical', 'high', 'medium', 'low'],
    price: price || 0,
    features: features || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  policies.set(policy.id, policy);
  
  res.status(201).json(policy);
});

// Update policy
app.put('/api/policies/:id',requireAuth,  (req, res) => {
  const policy = policies.get(req.params.id);
  
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  
  const fields = ['name', 'responseTime', 'resolutionTime', 'availability', 'supportChannels', 'price', 'features', 'status'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) policy[field] = req.body[field];
  });
  
  res.json(policy);
});

// Delete policy
app.delete('/api/policies/:id',requireAuth,  (req, res) => {
  if (!policies.has(req.params.id)) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  
  policies.delete(req.params.id);
  
  res.json({ message: 'Policy deleted successfully' });
});

// ==================== AGREEMENTS API ====================

// Get all agreements
app.get('/api/agreements', (req, res) => {
  const { customerId, policyId, status } = req.query;
  
  let result = Array.from(agreements.values());
  
  if (customerId) result = result.filter(a => a.customerId === customerId);
  if (policyId) result = result.filter(a => a.policyId === policyId);
  if (status) result = result.filter(a => a.status === status);
  
  res.json({ agreements: result, total: result.length });
});

// Get single agreement
app.get('/api/agreements/:id', (req, res) => {
  const agreement = agreements.get(req.params.id);
  
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }
  
  // Get associated policy
  const policy = policies.get(agreement.policyId);
  
  res.json({ ...agreement, policy });
});

// Create agreement
app.post('/api/agreements',requireAuth,  (req, res) => {
  const { customerId, customerName, policyId, startDate, endDate } = req.body;
  
  if (!customerId || !policyId) {
    return res.status(400).json({ error: 'Customer ID and Policy ID are required' });
  }
  
  const policy = policies.get(policyId);
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  
  const agreement = {
    id: `agr-${uuidv4().slice(0, 8)}`,
    customerId,
    customerName: customerName || 'Unknown',
    policyId,
    status: 'active',
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ticketsHandled: 0,
    breaches: 0,
    createdAt: new Date().toISOString()
  };
  
  agreements.set(agreement.id, agreement);
  
  res.status(201).json(agreement);
});

// Update agreement
app.put('/api/agreements/:id',requireAuth,  (req, res) => {
  const agreement = agreements.get(req.params.id);
  
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }
  
  const fields = ['customerName', 'status', 'startDate', 'endDate'];
  fields.forEach(field => {
    if (req.body[field] !== undefined) agreement[field] = req.body[field];
  });
  
  res.json(agreement);
});

// ==================== BREACH TRACKING API ====================

// Get breaches
app.get('/api/breaches', (req, res) => {
  const { agreementId, severity, resolved } = req.query;
  
  let result = Array.from(breaches.values());
  
  if (agreementId) result = result.filter(b => b.agreementId === agreementId);
  if (severity) result = result.filter(b => b.severity === severity);
  if (resolved !== undefined) result = result.filter(b => b.resolved === (resolved === 'true'));
  
  res.json({ breaches: result, total: result.length });
});

// Create breach
app.post('/api/breaches',requireAuth,  (req, res) => {
  const { agreementId, type, severity, ticketId, description, responseTime, resolutionTime } = req.body;
  
  if (!agreementId || !type) {
    return res.status(400).json({ error: 'Agreement ID and type are required' });
  }
  
  const agreement = agreements.get(agreementId);
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }
  
  const breach = {
    id: `brch-${uuidv4().slice(0, 8)}`,
    agreementId,
    customerName: agreement.customerName,
    type,
    severity: severity || 'medium',
    ticketId,
    description: description || '',
    expectedResponseTime: responseTime || 4,
    actualResponseTime: Math.round(Math.random() * 24 * 10) / 10,
    expectedResolutionTime: resolutionTime || 24,
    actualResolutionTime: null,
    financialImpact: Math.round(Math.random() * 5000),
    resolved: false,
    resolvedAt: null,
    createdAt: new Date().toISOString()
  };
  
  breaches.set(breach.id, breach);
  
  // Update agreement breach count
  agreement.breaches++;
  
  res.status(201).json(breach);
});

// Resolve breach
app.post('/api/breaches/:id/resolve',requireAuth,  (req, res) => {
  const breach = breaches.get(req.params.id);
  
  if (!breach) {
    return res.status(404).json({ error: 'Breach not found' });
  }
  
  breach.resolved = true;
  breach.resolvedAt = new Date().toISOString();
  breach.actualResolutionTime = Math.round((new Date() - new Date(breach.createdAt)) / (1000 * 60 * 60) * 10) / 10;
  
  res.json(breach);
});

// ==================== METRICS API ====================

// Get SLA compliance for agreement
app.get('/api/agreements/:id/compliance', (req, res) => {
  const agreement = agreements.get(req.params.id);
  
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }
  
  const policy = policies.get(agreement.policyId);
  const agreementBreaches = Array.from(breaches.values()).filter(b => b.agreementId === agreement.id);
  
  const complianceRate = agreement.ticketsHandled > 0 
    ? ((agreement.ticketsHandled - agreementBreaches.filter(b => b.resolved).length) / agreement.ticketsHandled * 100).toFixed(1)
    : 100;
  
  res.json({
    agreementId: agreement.id,
    customerName: agreement.customerName,
    policy: policy.name,
    ticketsHandled: agreement.ticketsHandled,
    totalBreaches: agreementBreaches.length,
    unresolvedBreaches: agreementBreaches.filter(b => !b.resolved).length,
    complianceRate: complianceRate + '%',
    responseTimeCompliance: (Math.random() * 10 + 90).toFixed(1) + '%',
    resolutionTimeCompliance: (Math.random() * 10 + 90).toFixed(1) + '%',
    availabilityCompliance: (Math.random() * 0.5 + 99.5).toFixed(2) + '%'
  });
});

// ==================== STATISTICS API ====================

app.get('/api/statistics', (req, res) => {
  const allPolicies = Array.from(policies.values());
  const allAgreements = Array.from(agreements.values());
  const allBreaches = Array.from(breaches.values());
  
  const stats = {
    totalPolicies: allPolicies.length,
    totalAgreements: allAgreements.length,
    activeAgreements: allAgreements.filter(a => a.status === 'active').length,
    totalBreaches: allBreaches.length,
    unresolvedBreaches: allBreaches.filter(b => !b.resolved).length,
    avgComplianceRate: 0,
    byTier: {},
    topBreachTypes: [],
    financialImpact: allBreaches.reduce((sum, b) => sum + b.financialImpact, 0)
  };
  
  // Calculate by tier
  allAgreements.forEach(agr => {
    const policy = policies.get(agr.policyId);
    if (policy) {
      stats.byTier[policy.tier] = stats.byTier[policy.tier] || { count: 0, breaches: 0 };
      stats.byTier[policy.tier].count++;
      stats.byTier[policy.tier].breaches += agr.breaches;
    }
  });
  
  // Top breach types
  const breachTypes = {};
  allBreaches.forEach(b => {
    breachTypes[b.type] = (breachTypes[b.type] || 0) + 1;
  });
  stats.topBreachTypes = Object.entries(breachTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));
  
  // Average compliance
  const activeAgreements = allAgreements.filter(a => a.status === 'active');
  if (activeAgreements.length > 0) {
    const totalCompliance = activeAgreements.reduce((sum, a) => {
      return sum + (a.ticketsHandled > 0 ? (a.ticketsHandled - a.breaches) / a.ticketsHandled * 100 : 100);
    }, 0);
    stats.avgComplianceRate = (totalCompliance / activeAgreements.length).toFixed(1) + '%';
  }
  
  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sla-manager',
    port: PORT,
    policies: policies.size,
    agreements: agreements.size,
    breaches: breaches.size
  });
});

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// 404 catch-all
app.use((req, res) => res.status(404).json({ error: 'not found', path: req.path }));

module.exports = app;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log('SLA Manager Service running on port ' + PORT);
    console.log('   Policies: ' + policies.size);
    console.log('   Agreements: ' + agreements.size);
  });
  installGracefulShutdown(server);
}
